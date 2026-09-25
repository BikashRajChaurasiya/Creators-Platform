-- CreateEnum
CREATE TYPE "PayoutChannel" AS ENUM ('ESEWA', 'KHALTI', 'IME_PAY', 'BANK');

-- AlterTable (creator payout profile)
ALTER TABLE "CreatorProfile"
ADD COLUMN "payoutChannel" "PayoutChannel",
ADD COLUMN "payoutChannelDetail" TEXT,
ADD COLUMN "fallbackChannel" "PayoutChannel",
ADD COLUMN "fallbackChannelDetail" TEXT;

-- AlterTable (payment maker-check + channel/ref)
ALTER TABLE "Payment"
ADD COLUMN "preparedById" TEXT,
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "channel" "PayoutChannel",
ADD COLUMN "providerRef" TEXT;

-- AlterTable (task typing + dispute link)
ALTER TABLE "Task"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "disputeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_disputeId_key" ON "Task"("disputeId");

-- AddForeignKey
ALTER TABLE "Task"
ADD CONSTRAINT "Task_disputeId_fkey"
FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable (dispute SLA)
ALTER TABLE "Dispute"
ADD COLUMN "slaDueAt" TIMESTAMP(3);