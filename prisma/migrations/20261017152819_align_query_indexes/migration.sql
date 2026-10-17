-- DropIndex
DROP INDEX "idx_work_items_ref_date";

-- DropIndex
DROP INDEX "idx_work_items_status";

-- DropIndex
DROP INDEX "idx_work_items_status_date";

-- CreateIndex
CREATE INDEX "idx_media_assets_work_type" ON "media_assets"("work_item_id", "media_type");

-- CreateIndex
CREATE INDEX "idx_work_items_ref_created" ON "work_items"("reference_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_work_items_status_ref_created" ON "work_items"("status", "reference_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_work_items_user_id" ON "work_items"("user_id");

-- CreateIndex
CREATE INDEX "idx_work_items_next_maint" ON "work_items"("next_maintenance_date");
