-- Add unique username to User (nullable; backfill for existing rows)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User" u
SET "username" = CONCAT(
  LEFT(LOWER(REGEXP_REPLACE(SPLIT_PART(u."email", '@', 1), '[^a-z0-9]', '', 'g')), 30),
  '-',
  SUBSTRING(REPLACE(u."id"::text, '-', '') FROM 1 FOR 8)
)
WHERE u."username" IS NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Add creator previous-collaborations list
ALTER TABLE "CreatorProfile" ADD COLUMN "collaborations" TEXT[];