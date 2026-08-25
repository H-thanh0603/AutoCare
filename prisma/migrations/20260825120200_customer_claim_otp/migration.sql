-- OTP-based verification for claiming existing garage customer records.
CREATE TABLE "customer_claim_otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_claim_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_claim_otps_userId_phone_consumedAt_idx"
  ON "customer_claim_otps"("userId", "phone", "consumedAt");

ALTER TABLE "customer_claim_otps"
  ADD CONSTRAINT "customer_claim_otps_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
