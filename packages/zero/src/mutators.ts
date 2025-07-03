import type { CustomMutatorDefs, Transaction } from "@rocicorp/zero";
import { nanoid } from "nanoid";
import type { AuthData, Chat, Message, Permission, schema } from "./schema";

type SendInput = {
	chatId: string;
	content: string;
};

export function createClientMutators(authData: AuthData | undefined) {
	// Helper functions
	const requireAuth = () => {
		if (!authData) {
			throw new Error("Must be logged in");
		}
	};

	const getChatWithOwnershipCheck = async (
		tx: Transaction<typeof schema, unknown>,
		chatId: string,
	) => {
		const chat = await tx.query.chatsTable.where("id", chatId).one();
		if (!chat) {
			throw new Error("Chat not found");
		}
		if (chat.creatorId !== authData!.sub) {
			throw new Error("Only the creator can perform this action");
		}
		return chat;
	};

	const checkWritePermission = async (
		tx: Transaction<typeof schema, unknown>,
		chatId: string,
	) => {
		const canWrite = await tx.query.chatUsersTable
			.where(({ and, cmp }) =>
				and(
					cmp("chatId", "=", chatId),
					cmp("userId", "=", authData!.sub),
					cmp("permission", "=", "write"),
				),
			)
			.one();

		if (!canWrite) {
			throw new Error("User does not have write permission");
		}
	};

	const getUserInChat = async (
		tx: Transaction<typeof schema, unknown>,
		chatId: string,
		userId: string,
	) => {
		const userInChat = await tx.query.chatUsersTable
			.where(({ and, cmp }) =>
				and(cmp("chatId", "=", chatId), cmp("userId", "=", userId)),
			)
			.one();

		if (!userInChat) {
			throw new Error("User is not in this chat");
		}
		return userInChat;
	};

	const createStreamingAiMessage = async (
		tx: Transaction<typeof schema, unknown>,
		chatId: string,
		parentMessageId: string | null,
	) => {
		const aiMessageId = nanoid();
		await tx.mutate.messagesTable.insert({
			id: aiMessageId,
			chatId,
			status: "streaming",
			parentMessageId,
			createdAt: new Date().getTime() + 1,
		});

		await tx.mutate.chatsTable.update({
			id: chatId,
			activeMessageId: aiMessageId,
			updatedAt: new Date().getTime(),
		});

		return aiMessageId;
	};
	const send = async (
		tx: Transaction<typeof schema, unknown>,
		{ chatId, content }: SendInput,
	) => {
		requireAuth();

		if (!content) {
			throw new Error("Message must have content");
		}

		// Check if chat exists
		const existingChat = await tx.query.chatsTable.where("id", chatId).one();

		if (!existingChat) {
			// Create new chat with AI-generated title placeholder
			await tx.mutate.chatsTable.insert({
				id: chatId,
				title: "New Chat",
				creatorId: authData!.sub,
				createdAt: new Date().getTime(),
				updatedAt: new Date().getTime(),
			});

			// Add user to chat with write permission
			await tx.mutate.chatUsersTable.insert({
				chatId,
				userId: authData!.sub,
				permission: "write",
			});
		} else {
			// Check write permission for existing chat
			//await checkWritePermission(tx, chatId);
		}

		// Check for streaming messages
		const lastMessage = await tx.query.messagesTable
			.where(({ and, cmp }) => and(cmp("chatId", "=", chatId)))
			.orderBy("createdAt", "desc")
			.one();

		if (lastMessage?.status === "streaming") {
			throw new Error(
				"Cannot create message while another message is streaming",
			);
		}

		// Create user message
		const userMessageId = nanoid();
		const parentMessageId = lastMessage?.id ?? null;

		await tx.mutate.messagesTable.insert({
			id: userMessageId,
			chatId,
			content,
			parentMessageId,
			status: "completed",
			authorId: authData!.sub,
			createdAt: new Date().getTime(),
		});

		// Create streaming AI message
		await createStreamingAiMessage(tx, chatId, userMessageId);
	};

	const editMessage = async (
		tx: Transaction<typeof schema, unknown>,
		{ messageId, content }: { messageId: string; content: Message["content"] },
	) => {
		requireAuth();

		if (!content) {
			throw new Error("Message must have content");
		}

		const existingMessage = await tx.query.messagesTable
			.where("id", messageId)
			.one();

		if (!existingMessage) {
			throw new Error("Message not found");
		}

		if (existingMessage.authorId !== authData!.sub) {
			throw new Error("Can only edit your own messages");
		}

		if (existingMessage.status === "streaming") {
			throw new Error("Cannot edit streaming messages");
		}

		await checkWritePermission(tx, existingMessage.chatId);

		await send(tx, {
			chatId: existingMessage.chatId,
			content,
		});
	};

	const inviteUserToChat = async (
		tx: Transaction<typeof schema, unknown>,
		{
			chatId,
			userId,
			permission,
		}: { chatId: string; userId: string; permission: Permission },
	) => {
		requireAuth();
		await getChatWithOwnershipCheck(tx, chatId);

		await tx.mutate.chatUsersTable.insert({
			chatId,
			userId,
			permission: permission,
		});
	};

	const removeUserFromChat = async (
		tx: Transaction<typeof schema, unknown>,
		{ chatId, userId }: { chatId: string; userId: string },
	) => {
		requireAuth();
		const chat = await getChatWithOwnershipCheck(tx, chatId);

		if (chat.creatorId === userId) {
			throw new Error("Cannot remove the chat creator");
		}

		await getUserInChat(tx, chatId, userId);

		await tx.mutate.chatUsersTable.delete({
			chatId,
			userId,
		});
	};

	const regenerateResponse = async (
		tx: Transaction<typeof schema, unknown>,
		{ messageId }: { messageId: string },
	) => {
		requireAuth();

		const aiMessage = await tx.query.messagesTable.where("id", messageId).one();

		if (!aiMessage) {
			throw new Error("Message not found");
		}

		if (aiMessage.authorId) {
			throw new Error("Can only regenerate AI messages");
		}

		await checkWritePermission(tx, aiMessage.chatId);
		await createStreamingAiMessage(
			tx,
			aiMessage.chatId,
			aiMessage.parentMessageId,
		);
	};

	const deleteChat = async (
		tx: Transaction<typeof schema, unknown>,
		{ chatId }: { chatId: string },
	) => {
		requireAuth();
		await getChatWithOwnershipCheck(tx, chatId);
		await tx.mutate.chatsTable.delete({ id: chatId });
	};

	const updateChatTitle = async (
		tx: Transaction<typeof schema, unknown>,
		{ chatId, title }: { chatId: string; title: string },
	) => {
		requireAuth();

		if (!title || title.trim().length === 0) {
			throw new Error("Title cannot be empty");
		}

		await checkWritePermission(tx, chatId);

		await tx.mutate.chatsTable.update({
			id: chatId,
			title: title.trim(),
		});
	};

	const updateUserPermission = async (
		tx: Transaction<typeof schema, unknown>,
		{
			chatId,
			userId,
			permission,
		}: { chatId: string; userId: string; permission: Permission },
	) => {
		requireAuth();
		const chat = await getChatWithOwnershipCheck(tx, chatId);

		if (chat.creatorId === userId) {
			throw new Error("Cannot change creator's permissions");
		}

		await getUserInChat(tx, chatId, userId);

		await tx.mutate.chatUsersTable.update({
			chatId,
			userId,
			permission,
		});
	};

	return {
		message: {
			send,
			edit: editMessage,
			regenerateResponse: regenerateResponse,
		},
		chat: {
			inviteUser: inviteUserToChat,
			removeUser: removeUserFromChat,
			delete: deleteChat,
			updateTitle: updateChatTitle,
			updateUserPermission: updateUserPermission,
		},
	} as const satisfies CustomMutatorDefs<typeof schema>;
}
export type Mutators = ReturnType<typeof createClientMutators>;
