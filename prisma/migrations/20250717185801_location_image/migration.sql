-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LocationImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "locationId" TEXT NOT NULL,
    CONSTRAINT "LocationImage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ScheduleLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LocationImage" ("altText", "createdAt", "id", "locationId", "objectKey", "updatedAt") SELECT "altText", "createdAt", "id", "locationId", "objectKey", "updatedAt" FROM "LocationImage";
DROP TABLE "LocationImage";
ALTER TABLE "new_LocationImage" RENAME TO "LocationImage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
