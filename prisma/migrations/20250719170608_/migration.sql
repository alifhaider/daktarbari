-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduleLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "isTopRated" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScheduleLocation" ("address", "city", "country", "createdAt", "id", "latitude", "longitude", "name", "rating", "state", "type", "updatedAt", "zip") SELECT "address", "city", "country", "createdAt", "id", "latitude", "longitude", "name", "rating", "state", "type", "updatedAt", "zip" FROM "ScheduleLocation";
DROP TABLE "ScheduleLocation";
ALTER TABLE "new_ScheduleLocation" RENAME TO "ScheduleLocation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
