-- Link each invoice to the payout it bills.
--
-- Previously Invoice had no link to Payment, so releasing a payment marked
-- every DRAFT invoice on the campaign as paid. `paymentId` is nullable and
-- unique so existing rows survive the migration untouched.
ALTER TABLE "Invoice" ADD COLUMN "paymentId" TEXT;

CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: match the invoice generated alongside each payment by campaign,
-- amount and commission, taking the oldest unpaid invoice for that campaign.
UPDATE "Invoice" i
SET "paymentId" = p."id"
FROM (
  SELECT DISTINCT ON (p2."campaignId", p2."amount", p2."commissionAmount")
         p2."id", p2."campaignId", p2."amount", p2."commissionAmount", p2."createdAt"
  FROM "Payment" p2
  JOIN "Invoice" i2
    ON i2."campaignId" = p2."campaignId"
   AND i2."amount" = p2."amount"
   AND i2."commissionAmount" = p2."commissionAmount"
   AND (i2."paymentId" IS NULL)
  ORDER BY p2."campaignId", p2."amount", p2."commissionAmount", p2."createdAt" ASC
) p
WHERE i."campaignId" = p."campaignId"
  AND i."amount" = p."amount"
  AND i."commissionAmount" = p."commissionAmount"
  AND i."paymentId" IS NULL
  AND i."id" = (
    SELECT i3."id" FROM "Invoice" i3
    WHERE i3."campaignId" = p."campaignId"
      AND i3."amount" = p."amount"
      AND i3."commissionAmount" = p."commissionAmount"
    ORDER BY i3."createdAt" ASC
    LIMIT 1
  );
