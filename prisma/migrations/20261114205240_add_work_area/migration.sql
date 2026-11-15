-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "area" VARCHAR(100);

-- CreateIndex
CREATE INDEX "idx_work_items_area_ref_created" ON "work_items"("area", "reference_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_work_items_area_status_ref_created" ON "work_items"("area", "status", "reference_date" DESC, "created_at" DESC);
