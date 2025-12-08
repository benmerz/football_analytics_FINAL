-- hall of fame
SELECT
    *,
    CASE
        -- Last character is NOT a letter and NOT '*'
        WHEN player GLOB '*[^A-Za-z*]' THEN 1
        ELSE 0
    END AS hall_of_fame
FROM bills_first_round_picks;
--college
SELECT
    college,
    COUNT(*) AS total_players_from_college
FROM bills_first_round_picks
GROUP BY college
ORDER BY total_players_from_college DESC, college;

-- position
SELECT
    position,
    COUNT(*) AS position_player_count
FROM bills_first_round_picks
GROUP BY position
ORDER BY position_player_count DESC, position;

--all together
SELECT
    *,
    CASE
        -- Last character is NOT a letter and NOT '*'
        WHEN player GLOB '*[^A-Za-z*]' THEN 1
        ELSE 0
    END AS hall_of_fame,
    COUNT(*) OVER (PARTITION BY college)  AS college_player_count,
    COUNT(*) OVER (PARTITION BY position) AS position_player_count
FROM bills_first_round_picks;
