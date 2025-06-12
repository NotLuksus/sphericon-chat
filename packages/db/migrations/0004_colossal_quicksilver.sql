ALTER TABLE "messages" DROP CONSTRAINT "fk_messages_parent_message_id";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_chat_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "active_message_id" text;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_active_message_id_messages_id_fk" FOREIGN KEY ("active_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;