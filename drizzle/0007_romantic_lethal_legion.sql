DROP INDEX "consortiums_owner_id_idx";--> statement-breakpoint
CREATE INDEX "consortiums_owner_id_active_idx" ON "consortiums" USING btree ("owner_id") WHERE "consortiums"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "email_log_created_at_idx" ON "email_log" USING btree ("created_at");