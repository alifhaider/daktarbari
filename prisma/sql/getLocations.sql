WITH LocationDoctorCounts AS (
  SELECT 
    sl.id,
    sl.name,
    COUNT(DISTINCT s."doctorId") AS doctor_count
  FROM "ScheduleLocation" sl
  LEFT JOIN "Schedule" s ON sl.id = s."locationId"
  GROUP BY sl.id, sl.name
)

SELECT 
  ldc.id,
  ldc.name,
  ldc.doctor_count,
  sl.address,
  sl.city,
  sl.state,
  sl.zip,
  sl.country,
  sl.latitude,
  sl.longitude,
  sl.type,
  (
    SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
      'id', li.id,
      'objectKey', li.objectKey,
      'createdAt', li."createdAt",
      'updatedAt', li."updatedAt"
      -- Add any other image fields you need
    ))
    FROM "LocationImage" li
    WHERE li."locationId" = ldc.id
    ORDER BY li."createdAt" DESC  -- Optional: order images by newest first
  ) AS images,
  (
    SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
      'id', d.id,
      'name', u.name,
      'image', (
        SELECT JSON_OBJECT(
          'id', ui.id,
          'objectKey', ui.objectKey
        )
        FROM "UserImage" ui
        WHERE ui."userId" = u.id
        LIMIT 1
      )
    ))
    FROM "Schedule" s
    JOIN "Doctor" d ON s."doctorId" = d."userId"
    JOIN "User" u ON d."userId" = u.id
    WHERE s."locationId" = ldc.id
    GROUP BY s."locationId"
    LIMIT 10  -- Limit to 10 sample doctors
  ) AS top_doctors
FROM LocationDoctorCounts ldc
JOIN "ScheduleLocation" sl ON ldc.id = sl.id
ORDER BY ldc.doctor_count DESC;