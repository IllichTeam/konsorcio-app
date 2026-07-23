CREATE TABLE "consortium_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consortium_id" uuid NOT NULL,
	"actor_user_id" text,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consortium_activities" ADD CONSTRAINT "consortium_activities_consortium_id_consortiums_id_fk" FOREIGN KEY ("consortium_id") REFERENCES "public"."consortiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consortium_activities" ADD CONSTRAINT "consortium_activities_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consortium_activities_consortium_id_created_at_idx" ON "consortium_activities" USING btree ("consortium_id","created_at");