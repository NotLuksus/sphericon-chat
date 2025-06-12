import {
  type ExpressionBuilder,
  type PermissionsConfig,
  type Row,
  definePermissions,
} from "@rocicorp/zero";
import { type Schema, schema } from "@sphericon/db/zero";

export { schema, type Schema };

export type AuthData = {
  sub: string;
};

export type Chat = Row<typeof schema.tables.chatsTable>;
export type Message = Row<typeof schema.tables.messagesTable>;
export type Permission = Row<typeof schema.tables.chatUsersTable>["permission"];

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const allowIfParticipant = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "chatUsersTable">,
  ) => cmp("userId", authData.sub);

  const allowIfChatParticipant = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "chatsTable">,
  ) => exists("users", (eb) => eb.where("userId", authData.sub));

  const allowMessageIfChatParticipant = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "messagesTable">,
  ) =>
    exists("chat", (eb) =>
      eb.where((eb) => allowIfChatParticipant(authData, eb)),
    );

  return {
    chatUsersTable: {
      row: {
        select: [allowIfParticipant],
      },
    },
    chatsTable: {
      row: {
        select: [allowIfChatParticipant],
      },
    },
    messagesTable: {
      row: {
        select: [allowMessageIfChatParticipant],
      },
    },
  } satisfies PermissionsConfig<AuthData, Schema>;
});
