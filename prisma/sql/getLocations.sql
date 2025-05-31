WITH LocationData AS (
  SELECT 
    sl.*,
    COUNT(DISTINCT s."doctorId") AS doctor_count,
    ROW_NUMBER() OVER (PARTITION BY sl.name ORDER BY COUNT(DISTINCT s."doctorId") DESC) as rn
  FROM "ScheduleLocation" sl
  LEFT JOIN "Schedule" s ON sl.id = s."locationId"
  GROUP BY sl.id
)

SELECT 
  ld.id,
  ld.name,
  ld.doctor_count,
  ld.address,
  ld.city,
  ld.state,
  ld.zip,
  ld.country,
  ld.latitude,
  ld.longitude,
  ld.type,
  (
    SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
      'id', li.id,
      'objectKey', li.objectKey,
      'createdAt', li."createdAt",
      'updatedAt', li."updatedAt"
    ))
    FROM "LocationImage" li
    WHERE li."locationId" = ld.id
    ORDER BY li."createdAt" DESC
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
    WHERE s."locationId" = ld.id
    GROUP BY s."locationId"
    LIMIT 10
  ) AS top_doctors
FROM LocationData ld
WHERE ld.rn = 1  -- Only take the first occurrence of each location name
ORDER BY ld.doctor_count DESC
LIMIT 20