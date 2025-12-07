SELECT
    *,
    CASE
        -- Last character is NOT a letter and NOT '*'
        WHEN player GLOB '*[^A-Za-z*]' THEN 1
        ELSE 0
    END AS hall_of_fame
FROM bills_first_round_picks;