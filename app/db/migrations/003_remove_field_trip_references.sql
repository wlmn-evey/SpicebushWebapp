UPDATE content
SET
  data = jsonb_set(
    data,
    '{bullets}',
    (
      SELECT COALESCE(
        jsonb_agg(
          to_jsonb(
            CASE
              WHEN lower(bullet.value) LIKE '%field trip%' AND content.slug = 'faq-tuition-and-financial-aid-03'
                THEN 'On-campus enrichment experiences and special visitors'
              WHEN lower(bullet.value) LIKE '%field trip%' AND content.slug = 'faq-parent-and-family-involvement-01'
                THEN 'Volunteering for special events and classroom support'
              ELSE bullet.value
            END
          )
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(content.data->'bullets') = 'array' THEN content.data->'bullets'
          ELSE '[]'::jsonb
        END
      ) AS bullet(value)
    ),
    true
  ),
  updated_at = NOW()
WHERE type = 'faq'
  AND slug IN ('faq-tuition-and-financial-aid-03', 'faq-parent-and-family-involvement-01')
  AND jsonb_typeof(data->'bullets') = 'array';
