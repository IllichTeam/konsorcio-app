CREATE TABLE "expense_email_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resend_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expense_email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consortium_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"link_url" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"attachment_refs" jsonb NOT NULL,
	"sent_by_user_id" text,
	"claim_token" uuid,
	"claim_expires_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "expense_email_recipients" ADD CONSTRAINT "expense_email_recipients_send_id_expense_email_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."expense_email_sends"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_email_sends" ADD CONSTRAINT "expense_email_sends_consortium_id_consortiums_id_fk" FOREIGN KEY ("consortium_id") REFERENCES "public"."consortiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_email_sends" ADD CONSTRAINT "expense_email_sends_sent_by_user_id_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_email_recipients_send_id_idx" ON "expense_email_recipients" USING btree ("send_id");--> statement-breakpoint
CREATE INDEX "expense_email_recipients_send_id_status_idx" ON "expense_email_recipients" USING btree ("send_id","status");--> statement-breakpoint
CREATE INDEX "expense_email_sends_consortium_id_created_at_idx" ON "expense_email_sends" USING btree ("consortium_id","created_at");