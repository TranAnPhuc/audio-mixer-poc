-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MixJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "trackAOriginalName" TEXT NOT NULL,
    "trackAPath" TEXT NOT NULL,
    "trackAMimeType" TEXT NOT NULL,
    "trackASize" INTEGER NOT NULL,
    "trackABpm" REAL,
    "trackAKey" TEXT,
    "trackACamelot" TEXT,
    "trackBOriginalName" TEXT NOT NULL,
    "trackBPath" TEXT NOT NULL,
    "trackBMimeType" TEXT NOT NULL,
    "trackBSize" INTEGER NOT NULL,
    "trackBBpm" REAL,
    "trackBKey" TEXT,
    "trackBCamelot" TEXT,
    "appliedTempoRatio" REAL,
    "vocalOffsetMs" INTEGER NOT NULL DEFAULT 0,
    "appliedPitchShiftSemitones" INTEGER NOT NULL DEFAULT 0,
    "enableStemSeparation" BOOLEAN NOT NULL DEFAULT false,
    "trackAStemPath" TEXT,
    "trackBStemPath" TEXT,
    "stemSeparationTimeMs" INTEGER,
    "outputFileName" TEXT,
    "outputPath" TEXT,
    "outputDuration" REAL,
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MixJob" ("appliedPitchShiftSemitones", "appliedTempoRatio", "createdAt", "errorMessage", "executionTimeMs", "id", "outputDuration", "outputFileName", "outputPath", "progress", "status", "trackABpm", "trackACamelot", "trackAKey", "trackAMimeType", "trackAOriginalName", "trackAPath", "trackASize", "trackBBpm", "trackBCamelot", "trackBKey", "trackBMimeType", "trackBOriginalName", "trackBPath", "trackBSize", "updatedAt", "vocalOffsetMs") SELECT "appliedPitchShiftSemitones", "appliedTempoRatio", "createdAt", "errorMessage", "executionTimeMs", "id", "outputDuration", "outputFileName", "outputPath", "progress", "status", "trackABpm", "trackACamelot", "trackAKey", "trackAMimeType", "trackAOriginalName", "trackAPath", "trackASize", "trackBBpm", "trackBCamelot", "trackBKey", "trackBMimeType", "trackBOriginalName", "trackBPath", "trackBSize", "updatedAt", "vocalOffsetMs" FROM "MixJob";
DROP TABLE "MixJob";
ALTER TABLE "new_MixJob" RENAME TO "MixJob";
CREATE INDEX "MixJob_status_idx" ON "MixJob"("status");
CREATE INDEX "MixJob_createdAt_idx" ON "MixJob"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
