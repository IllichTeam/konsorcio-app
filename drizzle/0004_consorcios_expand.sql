-- Clear bootstrap stub rows that lack ownership / new required fields.
DELETE FROM "consorcios";
--> statement-breakpoint
ALTER TABLE "consorcios" RENAME COLUMN "nombre" TO "name";
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "location" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "payment_alias" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "billing_email" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "drive_link" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "amount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "owner_id" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "consorcios" ADD CONSTRAINT "consorcios_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "consorcios_owner_id_idx" ON "consorcios" USING btree ("owner_id");
