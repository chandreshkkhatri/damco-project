-- CreateTable
CREATE TABLE "SuggestedAction" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "SuggestedAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuggestedAction_status_createdAt_idx" ON "SuggestedAction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SuggestedAction_actionType_idx" ON "SuggestedAction"("actionType");