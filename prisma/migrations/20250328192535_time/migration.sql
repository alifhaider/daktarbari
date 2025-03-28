/*
  Warnings:

  - You are about to alter the column `endTime` on the `Schedule` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `startTime` on the `Schedule` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctorId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serialFee" INTEGER,
    "discountFee" INTEGER,
    "visitFee" INTEGER,
    "depositAmount" INTEGER,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "maxAppointments" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Schedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ScheduleLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("createdAt", "depositAmount", "discountFee", "doctorId", "endTime", "id", "locationId", "maxAppointments", "serialFee", "startTime", "updatedAt", "visitFee") SELECT "createdAt", "depositAmount", "discountFee", "doctorId", "endTime", "id", "locationId", "maxAppointments", "serialFee", "startTime", "updatedAt", "visitFee" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
