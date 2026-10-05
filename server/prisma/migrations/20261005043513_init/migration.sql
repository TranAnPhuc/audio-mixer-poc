-- CreateTable
CREATE TABLE "MixJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "trackAOriginalName" TEXT NOT NULL,
    "trackAPath" TEXT NOT NULL,
    "trackAMimeType" TEXT NOT NULL,
    "trackASize" INTEGER NOT NULL,
    "trackBOriginalName" TEXT NOT NULL,
    "trackBPath" TEXT NOT NULL,
    "trackBMimeType" TEXT NOT NULL,
    "trackBSize" INTEGER NOT NULL,
    "outputFileName" TEXT,
    "outputPath" TEXT,
    "outputDuration" REAL,
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MixJob_status_idx" ON "MixJob"("status");

-- CreateIndex
CREATE INDEX "MixJob_createdAt_idx" ON "MixJob"("createdAt");
