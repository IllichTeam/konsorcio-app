ALTER TABLE "expense_email_sends" ADD COLUMN "send_number" integer;--> statement-breakpoint
UPDATE "expense_email_sends" AS sends
SET "send_number" = numbered.send_number
FROM (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "consortium_id"
			ORDER BY "created_at" ASC, "id" ASC
		) AS send_number
	FROM "expense_email_sends"
) AS numbered
WHERE sends."id" = numbered."id";--> statement-breakpoint
ALTER TABLE "expense_email_sends" ALTER COLUMN "send_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_email_sends_consortium_id_send_number_unique" ON "expense_email_sends" USING btree ("consortium_id","send_number");
