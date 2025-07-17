-- getLocations.sql
WITH UniqueLocations AS (
  SELECT 
    sl.id,
    sl.name,
    sl.address,
    sl.city,
    sl.state,
    sl.zip,
    sl.country,
    sl.latitude,
    sl.longitude,
    COUNT(DISTINCT s.doctorId) AS doctor_count,
    ROW_NUMBER() OVER (
      PARTITION BY sl.name, sl.address, sl.city, sl.zip, sl.latitude, sl.longitude 
      ORDER BY COUNT(DISTINCT s.doctorId) DESC
    ) as location_rank
  FROM ScheduleLocation sl
  LEFT JOIN Schedule s ON sl.id = s.locationId
  GROUP BY sl.id
),

LocationFirstImages AS (
  SELECT 
    li.locationId,
    li.objectKey,
    li.altText,
    ROW_NUMBER() OVER (PARTITION BY li.locationId ORDER BY li.createdAt) as image_rank
  FROM LocationImage li
)

SELECT 
  ul.id,
  ul.name,
  ul.address,
  ul.city,
  ul.state,
  ul.zip,
  ul.country,
  ul.latitude,
  ul.longitude,
  lfi.objectKey as imageObjectKey,
  lfi.altText as imageAltText,
  ul.doctor_count as "totalDoctors"
FROM UniqueLocations ul
LEFT JOIN LocationFirstImages lfi ON ul.id = lfi.locationId AND lfi.image_rank = 1
WHERE ul.location_rank = 1
ORDER BY ul.doctor_count DESC
LIMIT 20;