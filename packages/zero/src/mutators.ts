import type { CustomMutatorDefs, Transaction } from "@rocicorp/zero";
import { nanoid } from "nanoid";
import type { AuthData, Chat, Message, Permission, schema } from "./schema";

type CreateMessage = Omit<
  Message,
  "status" | "createdAt" | "updatedAt" | "authorId"
>;

type CreateChat = Omit<Chat, "createdAt" | "updatedAt" | "creatorId">;

export function createClientMutators(authData: AuthData | undefined) {
  const sendMessage = async (
    tx: Transaction<typeof schema, unknown>,
    message: CreateMessage,
  ) => {
    if (!authData) {
      throw new Error("Must be logged in to send messages");
    }

    if (!message.parts || message.parts.length === 0) {
      throw new Error("Message must have content");
    }

    const canWrite = await tx.query.chatUsersTable
      .where(({ and, cmp }) =>
        and(
          cmp("chatId", "=", message.chatId),
          cmp("userId", "=", authData.sub),
          cmp("permission", "=", "write"),
        ),
      )
      .one();

    if (!canWrite) {
      throw new Error("User does not have write permission");
    }

    const lastMessage = await tx.query.messagesTable
      .where(({ and, cmp }) => and(cmp("chatId", "=", message.chatId)))
      .orderBy("createdAt", "desc")
      .one();

    if (lastMessage?.status === "streaming" || lastMessage?.authorId) {
      throw new Error(
        "Cannot create message while another message is streaming",
      );
    }

    await tx.mutate.messagesTable.insert({
      ...message,
      status: "completed",
      authorId: authData.sub,
    });
    await tx.mutate.messagesTable.insert({
      chatId: message.chatId,
      id: nanoid(),
      status: "streaming",
    });
  };

  const sendFirstMessage = async (
    tx: Transaction<typeof schema, unknown>,
    { chat, message }: { chat: CreateChat; message: CreateMessage },
  ) => {
    if (!authData) {
      throw new Error("Must be logged in to create policy");
    }

    const exists = await tx.query.chatsTable.where("id", chat.id).one();
    if (exists) {
      throw new Error("Chat already exists");
    }

    if (chat.id !== message.chatId) {
      throw new Error("Chat ID mismatch");
    }

    await tx.mutate.chatsTable.insert({
      ...chat,
      creatorId: authData.sub,
    });
    await tx.mutate.chatUsersTable.insert({
      chatId: chat.id,
      userId: authData.sub,
      permission: "write",
      id: nanoid(),
    });

    await sendMessage(tx, {
      ...message,
      chatId: chat.id,
    });
  };

  const editMessage = async (
    tx: Transaction<typeof schema, unknown>,
    { chat, message }: { chat: CreateChat; message: CreateMessage },
  ) => {};

  const inviteUserToChat = async (
    tx: Transaction<typeof schema, unknown>,
    {
      chatId,
      userId,
      permission,
    }: { chatId: string; userId: string; permission: Permission },
  ) => {
    if (!authData) {
      throw new Error("Must be logged in to invite user");
    }

    const chat = await tx.query.chatsTable.where("id", chatId).one();
    if (!chat) {
      throw new Error("Chat not found");
    }

    if (chat.creatorId !== authData.sub) {
      throw new Error("Only the creator can invite users");
    }

    await tx.mutate.chatUsersTable.insert({
      chatId,
      userId,
      permission: permission,
    });
  };

  return {
    message: {
      send: sendMessage,
      sendFirst: sendFirstMessage,
    },
    chat: {
      inviteUser: inviteUserToChat,
      create: async (tx, chat: Chat) => {
        if (!authData) {
          throw new Error("Users must be logged in to create policy");
        }

        if (authData.sub !== chat.creatorId) {
          throw new Error("Logged in user and policy owner must match");
        }

        await tx.mutate.chatsTable.insert(chat);
        await tx.mutate.chatUsersTable.insert({
          chatId: chat.id,
          userId: authData.sub,
          permission: "write",
          id: nanoid(),
          joinedAt: new Date().getTime(),
        });
      },
    },
  } as const satisfies CustomMutatorDefs<typeof schema>;
}
export type Mutators = ReturnType<typeof createClientMutators>;
