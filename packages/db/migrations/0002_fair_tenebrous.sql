ALTER TABLE "chat_users" DROP COLUMN "id";
ALTER TABLE "chat_users" ADD CONSTRAINT "chat_users_user_id_chat_id_pk" PRIMARY KEY("user_id","chat_id");
