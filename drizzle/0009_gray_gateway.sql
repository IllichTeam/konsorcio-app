CREATE TABLE "tenant_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consortium_id" uuid NOT NULL,
	"floor" text,
	"department_number" text,
	"letter" text,
	"email" text NOT NULL,
	"contact_type" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_emails" ADD CONSTRAINT "tenant_emails_consortium_id_consortiums_id_fk" FOREIGN KEY ("consortium_id") REFERENCES "public"."consortiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_emails_consortium_id_active_idx" ON "tenant_emails" USING btree ("consortium_id") WHERE "tenant_emails"."is_deleted" = false;