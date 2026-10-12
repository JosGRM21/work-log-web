-- Habilitar extensión para generación de identificadores UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de Usuarios Administradores
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_users_email" UNIQUE ("email")
);

-- Tabla de Trabajos (Work Items)
CREATE TABLE "work_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reference_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT "fk_work_items_user" FOREIGN KEY ("user_id") 
        REFERENCES "users"("id") ON DELETE RESTRICT,
        
    CONSTRAINT "chk_work_items_status" CHECK (
        "status" IN ('pending', 'in_progress', 'completed')
    ),
    
    CONSTRAINT "chk_work_items_dates" CHECK (
        "end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date"
    )
);

-- Tabla de Recursos Multimedia (Media Assets)
CREATE TABLE "media_assets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "work_item_id" UUID NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "media_type" VARCHAR(10) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT "fk_media_assets_work_item" FOREIGN KEY ("work_item_id") 
        REFERENCES "work_items"("id") ON DELETE CASCADE,
        
    CONSTRAINT "chk_media_assets_type" CHECK (
        "media_type" IN ('image', 'video')
    )
);

-- Índices de Rendimiento para Consultas del Feed y Galerías
CREATE INDEX "idx_work_items_ref_date" ON "work_items"("reference_date" DESC);
CREATE INDEX "idx_work_items_status" ON "work_items"("status");
CREATE INDEX "idx_work_items_status_date" ON "work_items"("status", "reference_date" DESC);
CREATE INDEX "idx_media_assets_work_order" ON "media_assets"("work_item_id", "sort_order" ASC);