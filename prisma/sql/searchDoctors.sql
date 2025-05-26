-- @param {String} $1:name
-- @param {String} $2:specialtyId
-- @param {String} $3:locationId
-- @param {Int} $4:limit 
-- @param {Int} $5:start
SELECT 
  "User".id,
  "User".username,
  "User".name,
  "User".email,
  "UserImage".id AS imageId,
  "UserImage".objectKey AS imageObjectKey,
  "Doctor".id AS doctorId,
  "Doctor".bio,
  "Doctor".currency,
  (
    SELECT JSON_OBJECT(
      'startsFrom', min_price.calculated_price,
      'discount', min_price.discountFee
    )
    FROM (
      SELECT 
        (COALESCE(serialFee, 0) + COALESCE(visitFee, 0) - COALESCE(discountFee, 0)) AS calculated_price,
        discountFee
      FROM "Schedule"
      WHERE "Schedule"."doctorId" = "Doctor"."userId"
      AND (serialFee IS NOT NULL OR visitFee IS NOT NULL)
      ORDER BY calculated_price ASC
      LIMIT 1
    ) AS min_price
  ) AS priceInfo,
  (
      SELECT COUNT(*) FROM "Review"
    WHERE "Review"."doctorId" = "Doctor"."userId"
  ) as reviewCount,
  (
    SELECT ROUND(AVG("Review".rating)) FROM "Review" 
    WHERE "Review"."doctorId" = "Doctor"."userId"
  ) as averageRating,
  (
    SELECT COUNT(*) FROM "User"
    JOIN "Doctor" ON "User".id = "Doctor"."userId"
    WHERE "User".id = "Doctor"."userId"
  ) as doctorCount,
  (
    SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
      'id', "DoctorSpecialty".id, 
      'name', "DoctorSpecialty".name,
      'description', "DoctorSpecialty".description
    ))
    FROM "DoctorSpecialty"
    WHERE "DoctorSpecialty"."doctorId" = "Doctor"."userId"
  ) AS specialties,
  (
    SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
      'id', "Education".id,
      'degree', "Education".degree,
      'institution', "Education".institute
    ))
    FROM "Education"
    WHERE "Education"."doctorId" = "Doctor"."userId"
  ) AS degrees,
  (
    SELECT JSON_GROUP_ARRAY(
      JSON_OBJECT(
        'id', "Schedule".id,
        'startTime', "Schedule"."startTime",
        'endTime', "Schedule"."endTime",
        'location', JSON_OBJECT(
          'id', "Schedule"."locationId",
          'name', "ScheduleLocation".name
        )
      )
    )
    FROM "Schedule"
    JOIN "ScheduleLocation" ON "Schedule"."locationId" = "ScheduleLocation".id
    WHERE "Schedule"."doctorId" = "Doctor"."userId"
    AND "Schedule"."startTime" > CAST((strftime('%s','now') * 1000 ) AS INTEGER)
    ORDER BY "Schedule"."startTime" ASC
  ) AS upcomingSchedules

 FROM "User"
    JOIN "Doctor" ON "User".id = "Doctor"."userId"
    LEFT JOIN "UserImage" ON "User".id = "UserImage"."userId"
    WHERE
      ($1::text IS NULL OR $1::text = '' OR
       LOWER("User".name) LIKE '%' || LOWER($1::text) || '%' OR 
       LOWER("User".username) LIKE '%' || LOWER($1::text) || '%')
      AND ($2::text IS NULL OR $2::text = '' OR
          EXISTS (
            SELECT 1 FROM "DoctorSpecialty"
            WHERE "DoctorSpecialty"."doctorId" = "Doctor"."userId"
            AND "DoctorSpecialty".id = $2::text
          ))
      AND ($3::text IS NULL OR $3::text = '' OR
          EXISTS (
            SELECT 1 FROM "Schedule"
            JOIN "ScheduleLocation" ON "Schedule"."locationId" = "ScheduleLocation".id
            WHERE "Schedule"."doctorId" = "Doctor"."userId"
            AND "ScheduleLocation".id = $3::text
          ))
    ORDER BY 
      "Doctor".rating DESC,
      "User".name ASC
    LIMIT $4 OFFSET $5;