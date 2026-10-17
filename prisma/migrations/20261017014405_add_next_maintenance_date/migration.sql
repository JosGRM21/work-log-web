-- DropForeignKey
ALTER TABLE "media_assets" DROP CONSTRAINT "fk_media_assets_work_item";

-- DropForeignKey
ALTER TABLE "work_items" DROP CONSTRAINT "fk_work_items_user";

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "next_maintenance_date" DATE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_users_email" RENAME TO "users_email_key";
