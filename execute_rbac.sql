-- Drop the foreign key constraint that references Role
ALTER TABLE "AdminUser" DROP CONSTRAINT IF EXISTS "AdminUser_roleId_fkey";

-- We can drop the Role table (ignore if it's already dropped)
DROP TABLE IF EXISTS "Role";

-- Create the new Enum
DO $$ BEGIN
    CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update AdminUser
ALTER TABLE "AdminUser"
  DROP COLUMN IF EXISTS "roleId",
  ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Admin',
  ADD COLUMN IF NOT EXISTS "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS "permissions" TEXT[],
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add self-referencing foreign key for createdById
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminUser_createdById_fkey') THEN
        ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create AdminAuditLog
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
