-- @param {String} $1:name
-- @param {String} $2:specialty
-- @param {String} $3:location
SELECT 
  "User".id,
  "User".username,
  "User".name,
  "User".email,
  "UserImage".id AS imageId,
  "UserImage".objectKey AS imageObjectKey,
  "Doctor".id AS doctorId,
  "Doctor".bio,
  "Doctor".rating,
  "Doctor".balance,
  "Doctor".currency,
  (
    SELECT GROUP_CONCAT(DISTINCT "DoctorSpecialty".name)
    FROM "DoctorSpecialty"
    WHERE "DoctorSpecialty"."doctorId" = "Doctor"."userId"
  ) AS specialties,
  (
    SELECT GROUP_CONCAT(DISTINCT "Education".degree)
    FROM "Education"
    WHERE "Education"."doctorId" = "Doctor"."userId"
  ) AS degrees,
  (
    SELECT GROUP_CONCAT(DISTINCT "ScheduleLocation".name)
    FROM "Schedule"
    JOIN "ScheduleLocation" ON "Schedule"."locationId" = "ScheduleLocation".id
    WHERE "Schedule"."doctorId" = "Doctor"."userId"
  ) AS locations
FROM "User"
JOIN "Doctor" ON "User".id = "Doctor"."userId"
LEFT JOIN "UserImage" ON "User".id = "UserImage"."userId"
WHERE 
  (
    :name IS NULL OR 
    LOWER("User".name) LIKE '%' || LOWER(:name) || '%' OR 
    LOWER("User".username) LIKE '%' || LOWER(:name) || '%'
  )
  AND (
    :specialty IS NULL OR 
    EXISTS (
      SELECT 1 FROM "DoctorSpecialty"
      WHERE "DoctorSpecialty"."doctorId" = "Doctor"."userId"
      AND LOWER("DoctorSpecialty".name) LIKE '%' || LOWER(:specialty) || '%'
    )
  )
  AND (
    :location IS NULL OR 
    EXISTS (
      SELECT 1 FROM "Schedule"
      JOIN "ScheduleLocation" ON "Schedule"."locationId" = "ScheduleLocation".id
      WHERE "Schedule"."doctorId" = "Doctor"."userId"
      AND (
        LOWER("ScheduleLocation".name) LIKE '%' || LOWER(:location) || '%' OR
        LOWER("ScheduleLocation".city) LIKE '%' || LOWER(:location) || '%' OR
        LOWER("ScheduleLocation".address) LIKE '%' || LOWER(:location) || '%'
      )
    )
  )
GROUP BY 
  "User".id,
  "UserImage".id,
  "UserImage".objectKey,
  "Doctor".id
ORDER BY 
  "Doctor".rating DESC,
  "User".name ASC
LIMIT 50;