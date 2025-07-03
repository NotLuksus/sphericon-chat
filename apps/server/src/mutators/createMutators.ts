import { Chats } from "@/services/Chats";
import type { EnvVars } from "@/services/EnvVars";
import { ChatId, MessageId } from "@sphericon/api/domains";
import { type Mutators, createClientMutators } from "@sphericon/zero/mutators";
import type { AuthData, Chat } from "@sphericon/zero/schema";
import { Data, Effect, Runtime } from "effect";
import { nanoid } from "nanoid";

// Custom tagged errors
export class TransactionError extends Data.TaggedError("TransactionError")<{
	message: string;
	operation: string;
}> {}

export class AuthenticationError extends Data.TaggedError(
	"AuthenticationError",
)<{
	message: string;
}> {}

export class PermissionError extends Data.TaggedError("PermissionError")<{
	message: string;
	chatId: string;
	userId: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
	message: string;
	field: string;
}> {}

export class BusinessLogicError extends Data.TaggedError("BusinessLogicError")<{
	message: string;
	reason: string;
}> {}

// Helper function to wrap transaction operations with proper error handling
function createEffectTx<T>(
	operation: string,
	txFunction: () => Promise<T>,
): Effect.Effect<T, TransactionError> {
	return Effect.tryPromise({
		try: txFunction,
		catch: (unknown) =>
			new TransactionError({
				message: `Transaction failed: ${String(unknown)}`,
				operation,
			}),
	}).pipe(Effect.withSpan(`zeroTransaction:${operation}`));
}

export const createZeroMutators = Effect.fn("createZeroMutators")(function* (
	authData: AuthData,
) {
	const client = createClientMutators(authData);
	const chats = yield* Chats;
	const runtime = yield* Effect.runtime();
	return {
		...client,
		message: {
			...client.message,
			send: async (tx, { content, chatId }) =>
				Runtime.runPromise(runtime)(
					Effect.gen(function* () {
						if (!authData) {
							yield* new AuthenticationError({ message: "Must be logged in" });
						}

						if (!content) {
							yield* new ValidationError({
								message: "Message must have content",
								field: "content",
							});
						}

						const existingChat = yield* createEffectTx(
							"query-existing-chat",
							async () => tx.query.chatsTable.where("id", chatId).one(),
						);

						if (!existingChat) {
							yield* createEffectTx("create-chat", async () =>
								tx.mutate.chatsTable.insert({
									id: chatId,
									title: "New Chat",
									creatorId: authData!.sub,
									createdAt: new Date().getTime(),
									updatedAt: new Date().getTime(),
								}),
							);

							// Add user to chat with write permission
							yield* createEffectTx("add-user-to-chat", async () =>
								tx.mutate.chatUsersTable.insert({
									chatId,
									userId: authData!.sub,
									permission: "write",
								}),
							);

							yield* Effect.forkDaemon(
								chats.generateChatTitle(ChatId.make(chatId), content),
							);
						} else {
							const canWrite = yield* createEffectTx(
								"check-write-permission",
								async () =>
									tx.query.chatUsersTable
										.where(({ and, cmp }) =>
											and(
												cmp("chatId", "=", chatId),
												cmp("userId", "=", authData!.sub),
												cmp("permission", "=", "write"),
											),
										)
										.one(),
							);

							if (!canWrite) {
								yield* new PermissionError({
									message: "User does not have write permission",
									chatId,
									userId: authData!.sub,
								});
							}
						}

						// Check for streaming messages
						const lastMessage = yield* createEffectTx(
							"query-last-message",
							async () =>
								tx.query.messagesTable
									.where(({ and, cmp }) => and(cmp("chatId", "=", chatId)))
									.orderBy("createdAt", "desc")
									.one(),
						);

						if (lastMessage?.status === "streaming") {
							yield* new BusinessLogicError({
								message:
									"Cannot create message while another message is streaming",
								reason: "streaming-in-progress",
							});
						}
						const aiMessageId = nanoid();
						yield* Effect.forkDaemon(
							chats.generateAiMessage(
								ChatId.make(chatId),
								MessageId.make(aiMessageId),
								content,
							),
						);

						// Create user message
						const userMessageId = nanoid();
						const parentMessageId = lastMessage?.id ?? null;

						yield* createEffectTx("create-user-message", async () =>
							tx.mutate.messagesTable.insert({
								id: userMessageId,
								chatId,
								content,
								parentMessageId,
								status: "completed",
								authorId: authData!.sub,
								createdAt: new Date().getTime(),
							}),
						);

						// Create streaming AI message

						yield* createEffectTx("create-ai-message", async () =>
							tx.mutate.messagesTable.insert({
								id: aiMessageId,
								chatId,
								status: "streaming",
								parentMessageId: userMessageId,
								createdAt: new Date().getTime() + 1,
							}),
						);

						yield* createEffectTx("update-chat-active-message", async () =>
							tx.mutate.chatsTable.update({
								id: chatId,
								activeMessageId: aiMessageId,
								updatedAt: new Date().getTime(),
							}),
						);
					}),
				),
		},
	} satisfies Mutators;
});
