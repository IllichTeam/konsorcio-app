ALTER TABLE "consortiums" ALTER COLUMN "payment_alias" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consortiums" ALTER COLUMN "billing_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consortiums" ALTER COLUMN "drive_link" DROP NOT NULL;