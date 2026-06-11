-- ============================================================
-- Import dakstats_history → statmanager
--   • dakstats_history.teams        → leagues, seasons, teams, team_seasons
--   • dakstats_history.competitions → competitions
--   • dakstats_history.periods      → periods
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
--   • dakstats_history.teams has a TMID column that is referenced
--     by V_TMID and H_TMID in dakstats_history.competitions.
--   • Team names are taken from TEAMSHORT, not LOCATION.
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
-- One row per unique (TEAMSHORT, GENDER) — matches the statmanager
-- unique key uq_teams_name_gender.
-- Where the same team appears across multiple seasons, take
-- abbrev and nickname from the most recent season.
INSERT IGNORE INTO teams (name, abbrev, nickname, gender)
SELECT
    TRIM(src.TEAMSHORT),
    NULLIF(TRIM(src.ABBREV),   ''),
    NULLIF(TRIM(src.NICKNAME), ''),
    src.GENDER + 0
FROM       dakstats_history.teams src
INNER JOIN (
    SELECT
        TRIM(TEAMSHORT) AS loc,
        GENDER + 0      AS gen,
        MAX(SEASON)     AS latest_season
    FROM   dakstats_history.teams
    WHERE  TEAMSHORT IS NOT NULL AND TRIM(TEAMSHORT) <> ''
    GROUP  BY TRIM(TEAMSHORT), GENDER + 0
) lv ON  TRIM(src.TEAMSHORT) = lv.loc
     AND src.GENDER + 0      = lv.gen
     AND src.SEASON          = lv.latest_season
WHERE  src.TEAMSHORT IS NOT NULL AND TRIM(src.TEAMSHORT) <> '';

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
INNER JOIN teams   t  ON  t.name      = TRIM(src.TEAMSHORT)
                      AND t.gender   <=> src.GENDER + 0
WHERE  src.TEAMSHORT IS NOT NULL AND TRIM(src.TEAMSHORT) <> ''
  AND  src.LEAGUE    IS NOT NULL AND TRIM(src.LEAGUE)    <> ''
  AND  src.SEASON    IS NOT NULL;

-- ── Step 5: Competitions ─────────────────────────────────────
-- H_TMID (home team) and V_TMID (visiting team) are resolved to
-- team names by joining to dakstats_history.teams, which already
-- maps TMID → TEAMSHORT (team name), LEAGUE, and GENDER.
-- Those names then resolve to statmanager IDs the same way
-- Steps 1–4 do — no source ID columns flow into statmanager.
--
-- Notes:
--   • team_id  = home team (H_TMID);  opponent_id = visiting team (V_TMID).
--   • location is populated from comp.ARENA.
--   • team_score and opponent_score are left NULL — score data is not
--     present in dakstats_history.competitions.
--   • Competitions where either team, the season, or the league cannot
--     be resolved in statmanager are silently skipped (INNER JOIN).
--   • competitions has no formal unique key, so INSERT IGNORE cannot
--     suppress duplicates.  A WHERE NOT EXISTS guard on
--     (season_id, team_id, game_date, opponent_id) makes the step
--     safe to re-run.
INSERT INTO competitions (season_id, team_id, game_date, opponent_id, location)
SELECT
    s.id                                                                  AS season_id,
    ht.id                                                                 AS team_id,
    DATE(comp.DATE)                                                       AS game_date,
    vt.id                                                                 AS opponent_id,
    comp.ARENA                                                                AS location
FROM       dakstats_history.competitions  comp
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID            = comp.H_TMID
       AND TRIM(h_src.SEASON)    = TRIM(comp.SEASON)
INNER JOIN dakstats_history.teams         v_src
        ON v_src.TMID            = comp.V_TMID
       AND TRIM(v_src.SEASON)    = TRIM(comp.SEASON)
INNER JOIN leagues                        l
        ON l.name                = TRIM(h_src.LEAGUE)
INNER JOIN seasons                        s
        ON s.league_id           = l.id
       AND s.name                = TRIM(comp.SEASON)
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
WHERE  comp.DATE    IS NOT NULL
  AND  comp.SEASON  IS NOT NULL
  AND  comp.H_TMID  IS NOT NULL
  AND  comp.V_TMID  IS NOT NULL
  AND  NOT EXISTS (
           SELECT 1
           FROM   competitions ex
           WHERE  ex.season_id   = s.id
             AND  ex.team_id     = ht.id
             AND  ex.game_date   = DATE(comp.DATE)
             AND  ex.opponent_id = vt.id
       );

-- ── Step 6: Periods ─────────────────────────────────────────
-- Each row records points scored by one team in one period of a
-- game. Two sets of rows per game: one for the home team, one for
-- the visiting team. The sum per (competition_id, team_id) gives
-- the final score, replacing the removed team_score / opponent_score
-- columns on competitions.
--
-- Resolve path:
--   periods.COMPID + SEASON → dakstats competitions
--   → home/visit team names → statmanager competition id
--   periods.TMID + SEASON   → team name → statmanager team id
INSERT INTO periods (competition_id, team_id, period_num, score)
SELECT
    sm_comp.id  AS competition_id,
    t.id        AS team_id,
    p.PERIODNUM AS period_num,
    p.SCORE     AS score
FROM       dakstats_history.periods       p
INNER JOIN dakstats_history.competitions  dcomp
        ON dcomp.COMPID              = p.COMPID
       AND TRIM(dcomp.SEASON)        = TRIM(p.SEASON)
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID                = dcomp.H_TMID
       AND TRIM(h_src.SEASON)        = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams         v_src
        ON v_src.TMID                = dcomp.V_TMID
       AND TRIM(v_src.SEASON)        = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams         tm_src
        ON tm_src.TMID               = p.TMID
       AND TRIM(tm_src.SEASON)       = TRIM(p.SEASON)
INNER JOIN leagues  l
        ON l.name                    = TRIM(h_src.LEAGUE)
INNER JOIN seasons  s
        ON s.league_id               = l.id
       AND s.name                    = TRIM(dcomp.SEASON)
INNER JOIN teams    ht
        ON ht.name                   = TRIM(h_src.TEAMSHORT)
       AND ht.gender                <=> h_src.GENDER + 0
INNER JOIN teams    vt
        ON vt.name                   = TRIM(v_src.TEAMSHORT)
       AND vt.gender                <=> v_src.GENDER + 0
INNER JOIN competitions sm_comp
        ON sm_comp.season_id         = s.id
       AND sm_comp.team_id           = ht.id
       AND sm_comp.game_date         = DATE(dcomp.DATE)
       AND sm_comp.opponent_id       = vt.id
INNER JOIN teams    t
        ON t.name                    = TRIM(tm_src.TEAMSHORT)
       AND t.gender                 <=> tm_src.GENDER + 0
WHERE  p.COMPID    IS NOT NULL
  AND  p.SEASON    IS NOT NULL
  AND  p.TMID      IS NOT NULL
  AND  p.PERIODNUM IS NOT NULL
  AND  p.SCORE     IS NOT NULL
  AND  NOT EXISTS (
           SELECT 1
           FROM   periods ex
           WHERE  ex.competition_id = sm_comp.id
             AND  ex.team_id        = t.id
             AND  ex.period_num     = p.PERIODNUM
       );

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
SELECT 'team_seasons',        COUNT(*)        FROM team_seasons
UNION ALL
SELECT 'competitions',        COUNT(*)        FROM competitions
UNION ALL
SELECT 'periods',             COUNT(*)        FROM periods;

SELECT 'source team rows'        AS tbl, COUNT(*) AS n FROM dakstats_history.teams
UNION ALL
SELECT 'source competition rows',        COUNT(*)        FROM dakstats_history.competitions
UNION ALL
SELECT 'source period rows',             COUNT(*)        FROM dakstats_history.periods;

-- Source rows that produced no team_seasons entry
-- (unmatched TEAMSHORT, LEAGUE, or SEASON)
SELECT src.TEAMSHORT, src.LEAGUE, src.SEASON, src.GENDER + 0 AS gender
FROM       dakstats_history.teams src
LEFT JOIN  leagues l  ON  l.name      = TRIM(src.LEAGUE)
LEFT JOIN  seasons s  ON  s.league_id = l.id AND s.name = TRIM(src.SEASON)
LEFT JOIN  teams   t  ON  t.name      = TRIM(src.TEAMSHORT)
                      AND t.gender   <=> src.GENDER + 0
LEFT JOIN  team_seasons ts ON ts.team_id = t.id AND ts.season_id = s.id
WHERE  ts.team_id IS NULL
  AND  src.TEAMSHORT IS NOT NULL AND TRIM(src.TEAMSHORT) <> '';

-- Source competitions that were skipped (unresolved team or season)
SELECT comp.SEASON, comp.H_TMID, comp.V_TMID, DATE(comp.DATE) AS game_date
FROM       dakstats_history.competitions  comp
LEFT JOIN  dakstats_history.teams         h_src ON h_src.TMID = comp.H_TMID AND TRIM(h_src.SEASON) = TRIM(comp.SEASON)
LEFT JOIN  dakstats_history.teams         v_src ON v_src.TMID = comp.V_TMID AND TRIM(v_src.SEASON) = TRIM(comp.SEASON)
LEFT JOIN  leagues                        l     ON l.name     = TRIM(h_src.LEAGUE)
LEFT JOIN  seasons                        s     ON s.league_id = l.id AND s.name = TRIM(comp.SEASON)
LEFT JOIN  teams                          ht    ON ht.name    = TRIM(h_src.TEAMSHORT) AND ht.gender <=> h_src.GENDER + 0
LEFT JOIN  teams                          vt    ON vt.name    = TRIM(v_src.TEAMSHORT) AND vt.gender <=> v_src.GENDER + 0
WHERE  comp.DATE   IS NOT NULL
  AND  comp.SEASON IS NOT NULL
  AND  (s.id IS NULL OR ht.id IS NULL OR vt.id IS NULL);

-- Source period rows that were skipped (unresolved competition or team)
SELECT p.SEASON, p.COMPID, p.TMID, p.PERIODNUM
FROM       dakstats_history.periods       p
LEFT JOIN  dakstats_history.competitions  dcomp  ON dcomp.COMPID  = p.COMPID AND TRIM(dcomp.SEASON) = TRIM(p.SEASON)
LEFT JOIN  dakstats_history.teams         h_src  ON h_src.TMID    = dcomp.H_TMID AND TRIM(h_src.SEASON) = TRIM(dcomp.SEASON)
LEFT JOIN  dakstats_history.teams         v_src  ON v_src.TMID    = dcomp.V_TMID AND TRIM(v_src.SEASON) = TRIM(dcomp.SEASON)
LEFT JOIN  dakstats_history.teams         tm_src ON tm_src.TMID   = p.TMID  AND TRIM(tm_src.SEASON) = TRIM(p.SEASON)
LEFT JOIN  leagues    l       ON l.name        = TRIM(h_src.LEAGUE)
LEFT JOIN  seasons    s       ON s.league_id   = l.id AND s.name = TRIM(dcomp.SEASON)
LEFT JOIN  teams      ht      ON ht.name       = TRIM(h_src.TEAMSHORT) AND ht.gender <=> h_src.GENDER + 0
LEFT JOIN  teams      vt      ON vt.name       = TRIM(v_src.TEAMSHORT) AND vt.gender <=> v_src.GENDER + 0
LEFT JOIN  competitions sm_c  ON sm_c.season_id = s.id AND sm_c.team_id = ht.id
                              AND sm_c.game_date = DATE(dcomp.DATE) AND sm_c.opponent_id = vt.id
LEFT JOIN  teams      t       ON t.name        = TRIM(tm_src.TEAMSHORT) AND t.gender <=> tm_src.GENDER + 0
WHERE  p.COMPID IS NOT NULL AND p.SEASON IS NOT NULL
  AND  (sm_c.id IS NULL OR t.id IS NULL);
*/
