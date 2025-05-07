-- @param {String} $1:name
-- @param {String} $2:specialtyId
-- @param {String} $3:locationId
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
  ) AS locations,
  (
    SELECT JSON_GROUP_ARRAY(
      JSON_OBJECT(
        'id', "Schedule".id,
        'startTime', "Schedule"."startTime",
        'endTime', "Schedule"."endTime",
        'locationId', "Schedule"."locationId",
        'locationName', "ScheduleLocation".name
      )
    )
    FROM "Schedule"
    JOIN "ScheduleLocation" ON "Schedule"."locationId" = "ScheduleLocation".id
    WHERE "Schedule"."doctorId" = "Doctor"."userId"
    AND "Schedule"."startTime" > CURRENT_TIMESTAMP
    ORDER BY "Schedule"."startTime" ASC
  ) AS upcomingSchedules
FROM "User"
JOIN "Doctor" ON "User".id = "Doctor"."userId"
LEFT JOIN "UserImage" ON "User".id = "UserImage"."userId"
WHERE 
  (
    $1::text IS NULL OR 
    $1::text = '' OR
    LOWER("User".name) LIKE '%' || LOWER($1::text) || '%' OR 
    LOWER("User".username) LIKE '%' || LOWER($1::text) || '%'
  )
  AND (
    $2::text IS NULL OR 
    $2::text = '' OR
    EXISTS (
      SELECT 1 FROM "DoctorSpecialty"
      WHERE "DoctorSpecialty"."doctorId" = "Doctor"."userId"
      AND "DoctorSpecialty".id = $2::text
    )
  )
  AND (
    $3::text IS NULL OR 
    $3::text = '' OR
    EXISTS (
      SELECT 1 FROM "Schedule"
      JOIN "ScheduleLocation" ON "Schedule"."locationId" = "ScheduleLocation".id
      WHERE "Schedule"."doctorId" = "Doctor"."userId"
      AND "ScheduleLocation".id = $3::text
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