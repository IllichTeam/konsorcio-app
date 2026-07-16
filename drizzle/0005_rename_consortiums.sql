ALTER TABLE "consorcios" RENAME TO "consortiums";
--> statement-breakpoint
ALTER TABLE "consortiums" RENAME CONSTRAINT "consorcios_owner_id_user_id_fk" TO "consortiums_owner_id_user_id_fk";
--> statement-breakpoint
ALTER INDEX "consorcios_owner_id_idx" RENAME TO "consortiums_owner_id_idx";
