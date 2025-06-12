ALTER TABLE "chats" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "author_id" DROP NOT NULL;