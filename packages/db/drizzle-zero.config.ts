import { drizzleZeroConfig } from "drizzle-zero";
import * as schema from "./src/schema";

export default drizzleZeroConfig(schema, {
  tables: {
    accountsTable: false,
    chatUsersTable: {
      chatId: true,
      joinedAt: true,
      permission: true,
      userId: true,
    },
    chatsTable: {
      createdAt: true,
      creatorId: true,
      id: true,
      title: true,
      updatedAt: true,
      activeMessageId: true,
    },
    messagesTable: {
      authorId: true,
      chatId: true,
      createdAt: true,
      id: true,
      parentMessageId: true,
      content: true,
      status: true,
      updatedAt: true,
    },
    usersTable: {
      createdAt: true,
      email: true,
      emailVerified: true,
      id: true,
      image: true,
      name: true,
      updatedAt: true,
    },
    jwksTable: false,
    sessionsTable: false,
    verificationsTable: false,
  },
  casing: "snake_case",
});
