-- ============================================================
-- Import dakstats_history.teams → statmanager
--
-- Prerequisites:
--   • Both databases must be on the same MariaDB/MySQL instance.
--   • The executing user needs SELECT on dakstats_history and
--     INSERT on statmanager.
--   • Run against the statmanager database:
--       mysql -u <user> -p statmanager < import_dakstats_teams.sql
--
-- Assumptions:
--   • SEASON is formatted 'YYYY-YYYY' (e.g. '2021-2022').
--     Single-year values produce start_year = end_year.
--   • LEAGUE contains the short abbreviation (e.g. 'ACAA').
--     Edit league names/contact info in the leagues table afterwards.
--   • GENDER encoding: 0 = male, 1 = female — same as statmanager.
--     If the source uses the opposite convention, change every
--     occurrence of  src.GENDER + 0  to  1 - (src.GENDER + 0).
--   • No source ID fields are used.  All statmanager IDs are
--     auto-generated and resolved by joining on name values only.
-- ============================================================

USE statmanager;

START TRANSACTION;

-- ── Step 1: Leagues ──────────────────────────────────────────
-- One row per distinct LEAGUE abbreviation.
INSERT IGNORE INTO leagues (name)
SELECT DISTINCT TRIM(LEAGUE)
FROM   dakstats_history.teams
WHERE  LEAGUE IS NOT NULL
  AND  TRIM(LEAGUE) <> ''
ORDER  BY LEAGUE;

-- ── Step 2: Seasons ──────────────────────────────────────────
-- One row per unique (league, season-name) pair.
-- Resolve the league FK by joining on name.
INSERT IGNORE INTO seasons (league_id, name, start_year, end_year)
SELECT DISTINCT
    l.id,
    TRIM(src.SEASON),
    CAST(LEFT(TRIM(src.SEASON), 4)  AS UNSIGNED),
    CAST(RIGHT(TRIM(src.SEASON), 4) AS UNSIGNED)
FROM       dakstats_history.teams src
INNER JOIN leagues l ON l.name = TRIM(src.LEAGUE)
WHERE  src.SEASON IS NOT NULL
  AND  src.LEAGUE IS NOT NULL AND TRIM(src.LEAGUE) <> ''
ORDER  BY l.id, TRIM(src.SEASON);

-- ── Step 3: Teams ────────────────────────────────────────────
-- One row per unique (LOCATION, GENDER) — matches the statmanager
-- unique key uq_teams_name_gender.
-- Where the same team appears across multiple seasons, take
-- abbrev and nickname from the most recent season.
INSERT IGNORE INTO teams (name, abbrev, nickname, gender)
SELECT
    TRIM(src.LOCATION),
    NULLIF(TRIM(src.ABBREV),   ''),
    NULLIF(TRIM(src.NICKNAME), ''),
    src.GENDER + 0
FROM       dakstats_history.teams src
INNER JOIN (
    SELECT
        TRIM(LOCATION)  AS loc,
        GENDER + 0      AS gen,
        MAX(SEASON)     AS latest_season
    FROM   dakstats_history.teams
    WHERE  LOCATION IS NOT NULL AND TRIM(LOCATION) <> ''
    GROUP  BY TRIM(LOCATION), GENDER + 0
) lv ON  TRIM(src.LOCATION) = lv.loc
     AND src.GENDER + 0     = lv.gen
     AND src.SEASON         = lv.latest_season
WHERE  src.LOCATION IS NOT NULL AND TRIM(src.LOCATION) <> '';

-- ── Step 4: team_seasons ─────────────────────────────────────
-- Join every source row to the statmanager IDs resolved purely
-- by name fields — no source ID columns referenced.
INSERT IGNORE INTO team_seasons (team_id, season_id, coach, active)
SELECT
    t.id,
    s.id,
    NULLIF(TRIM(src.COACH), ''),
    src.TMACTIVE + 0
FROM       dakstats_history.teams src
INNER JOIN leagues l  ON  l.name      = TRIM(src.LEAGUE)
INNER JOIN seasons s  ON  s.league_id = l.id
                      AND s.name      = TRIM(src.SEASON)
INNER JOIN teams   t  ON  t.name      = TRIM(src.LOCATION)
                      AND t.gender   <=> src.GENDER + 0
WHERE  src.LOCATION IS NOT NULL AND TRIM(src.LOCATION) <> ''
  AND  src.LEAGUE   IS NOT NULL AND TRIM(src.LEAGUE)   <> ''
  AND  src.SEASON   IS NOT NULL;

COMMIT;

-- ── Verification queries (run manually after import) ─────────
/*
-- Row counts vs source
SELECT 'leagues'      AS tbl, COUNT(*) AS n FROM leagues
UNION ALL
SELECT 'seasons',             COUNT(*)        FROM seasons
UNION ALL
SELECT 'teams',               COUNT(*)        FROM teams
UNION ALL
SELECT 'team_seasons',        COUNT(*)        FROM team_seasons;

SELECT 'source rows' AS tbl, COUNT(*) AS n FROM dakstats_history.teams;

-- Source rows that produced no team_seasons entry
-- (unmatched LOCATION, LEAGUE, or SEASON)
SELECT src.LOCATION, src.LEAGUE, src.SEASON, src.GENDER + 0 AS gender
FROM       dakstats_history.teams src
LEFT JOIN  leagues l  ON  l.name      = TRIM(src.LEAGUE)
LEFT JOIN  seasons s  ON  s.league_id = l.id AND s.name = TRIM(src.SEASON)
LEFT JOIN  teams   t  ON  t.name      = TRIM(src.LOCATION)
                      AND t.gender   <=> src.GENDER + 0
LEFT JOIN  team_seasons ts ON ts.team_id = t.id AND ts.season_id = s.id
WHERE  ts.team_id IS NULL
  AND  src.LOCATION IS NOT NULL AND TRIM(src.LOCATION) <> '';
*/
