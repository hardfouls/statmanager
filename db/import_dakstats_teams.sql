-- ============================================================
-- Import dakstats_history → statmanager
--   • dakstats_history.teams        → leagues, seasons, teams, team_seasons
--   • dakstats_history.competitions → competitions
--   • dakstats_history.periods      → periods
--   • dakstats_history.rosters      → players, player_seasons
--   • dakstats_history.season       → boxscores
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

-- ── Step 7: Players ─────────────────────────────────────────
-- Import distinct players from the roster table.
-- Source uniqueness is (SEASON, FIRSTNAME, LASTNAME, jersey_number);
-- the inner subquery deduplicates at that level first, then the outer
-- DISTINCT collapses to unique (first_name, last_name) pairs for INSERT.
-- players has no unique constraint on name, so a WHERE NOT EXISTS
-- guard prevents duplicates on re-run.
INSERT INTO players (first_name, last_name)
SELECT DISTINCT
    unique_rows.firstname,
    unique_rows.lastname
FROM (
    SELECT DISTINCT
        TRIM(r.SEASON)             AS season,
        TRIM(r.FIRSTNAME)          AS firstname,
        TRIM(r.LASTNAME)           AS lastname,
        CAST(r.NUMBER AS UNSIGNED) AS jersey_number
    FROM   dakstats_history.rosters r
    WHERE  r.FIRSTNAME IS NOT NULL AND TRIM(r.FIRSTNAME) <> ''
      AND  r.LASTNAME  IS NOT NULL AND TRIM(r.LASTNAME)  <> ''
      AND  UPPER(TRIM(r.LASTNAME)) <> 'TEAM'
) AS unique_rows
WHERE  NOT EXISTS (
           SELECT 1 FROM players p
           WHERE  p.first_name = unique_rows.firstname
             AND  p.last_name  = unique_rows.lastname
       );

-- ── Step 7b: Player profile fields ─────────────────────────
-- Populate position and misc1 from the player's most recent roster season.
-- height and year are per-season and are set in Step 8 instead.
-- MIN() gives a deterministic value when the same player appears on
-- multiple teams within the same season.
UPDATE players p
JOIN (
    SELECT
        TRIM(r.FIRSTNAME)                           AS firstname,
        TRIM(r.LASTNAME)                            AS lastname,
        MIN(NULLIF(TRIM(r.POSITION),  ''))          AS position,
        MIN(NULLIF(TRIM(r.MISCLINE1), ''))          AS misc1
    FROM dakstats_history.rosters r
    WHERE r.FIRSTNAME IS NOT NULL AND TRIM(r.FIRSTNAME) <> ''
      AND r.LASTNAME  IS NOT NULL AND TRIM(r.LASTNAME)  <> ''
      AND UPPER(TRIM(r.LASTNAME)) <> 'TEAM'
      AND TRIM(r.SEASON) = (
          SELECT MAX(TRIM(r2.SEASON))
          FROM   dakstats_history.rosters r2
          WHERE  TRIM(r2.FIRSTNAME) = TRIM(r.FIRSTNAME)
            AND  TRIM(r2.LASTNAME)  = TRIM(r.LASTNAME)
      )
    GROUP BY TRIM(r.FIRSTNAME), TRIM(r.LASTNAME)
) AS latest ON p.first_name = latest.firstname
           AND p.last_name  = latest.lastname
SET
    p.position = latest.position,
    p.misc1    = latest.misc1;

-- ── Step 8: Player Seasons ───────────────────────────────────
-- Record team, jersey number, height, and year per player per season.
-- height and year are per-season because players grow and year reflects
-- grade/eligibility which advances each season.
-- TMID → dakstats teams → league + statmanager team resolves
-- the season FK and team FK.
-- Non-numeric jersey numbers (e.g. blank or codes) are skipped.
INSERT IGNORE INTO player_seasons (player_id, season_id, team_id, jersey_number, height, `year`)
SELECT DISTINCT
    p.id                              AS player_id,
    s.id                              AS season_id,
    t.id                              AS team_id,
    CAST(r.NUMBER AS UNSIGNED)        AS jersey_number,
    NULLIF(REPLACE(TRIM(r.HEIGHT), ' ', ''), '')  AS height,
    NULLIF(TRIM(r.YEAR),   '')        AS `year`
FROM       dakstats_history.rosters r
INNER JOIN dakstats_history.teams   tm ON  tm.TMID         = r.TMID
                                       AND TRIM(tm.SEASON) = TRIM(r.SEASON)
INNER JOIN leagues                  l  ON  l.name          = TRIM(tm.LEAGUE)
INNER JOIN seasons                  s  ON  s.league_id     = l.id
                                       AND s.name          = TRIM(r.SEASON)
INNER JOIN teams                    t  ON  t.name          = TRIM(tm.TEAMSHORT)
                                       AND t.gender       <=> tm.GENDER + 0
INNER JOIN players                  p  ON  p.first_name    = TRIM(r.FIRSTNAME)
                                       AND p.last_name     = TRIM(r.LASTNAME)
WHERE  TRIM(r.NUMBER) REGEXP '^[0-9]+$'
  AND  r.FIRSTNAME IS NOT NULL AND TRIM(r.FIRSTNAME) <> ''
  AND  r.LASTNAME  IS NOT NULL AND TRIM(r.LASTNAME)  <> ''
  AND  UPPER(TRIM(r.LASTNAME)) <> 'TEAM';

-- ── Step 9: Boxscores ────────────────────────────────────────
-- One row per player per period per game (PERIODNUM from the source).
-- When PERIODNUM is NULL the row is stored with period = 0 (full-game).
-- pts is derived: 2*FGM + M3P + FTM
--   (= 2*(FGM-M3P) + 3*M3P + FTM, algebraically equivalent)
-- Jersey number comes from the roster (same number all season).
-- The UNIQUE KEY uq_boxscores_game_player makes re-runs safe via
-- INSERT IGNORE.
INSERT IGNORE INTO boxscores
    (competition_id, player_id, period, started, jersey_number,
     min,  fgm,  fga,  tpm,  tpa,  ftm,  fta,
     oreb, dreb, reb,  ast,  stl,  blk,  `to`, pf, pts)
SELECT
    sm_comp.id                                                           AS competition_id,
    p.id                                                                 AS player_id,
    COALESCE(gs.PERIODNUM, 0)                                            AS period,
    COALESCE(gs.STARTED,   0)                                            AS started,
    CAST(r.NUMBER AS UNSIGNED)                                           AS jersey_number,
    COALESCE(gs.MINUTES, 0)                                              AS min,
    COALESCE(gs.FGM,      0)                                             AS fgm,
    COALESCE(gs.FGA,      0)                                             AS fga,
    COALESCE(gs.M3P,      0)                                             AS tpm,
    COALESCE(gs.A3P,      0)                                             AS tpa,
    COALESCE(gs.FTM,      0)                                             AS ftm,
    COALESCE(gs.FTA,      0)                                             AS fta,
    COALESCE(gs.OREB,     0)                                             AS oreb,
    COALESCE(gs.DREB,     0)                                             AS dreb,
    COALESCE(gs.OREB,     0) + COALESCE(gs.DREB, 0)                     AS reb,
    COALESCE(gs.ASSISTS,  0)                                             AS ast,
    COALESCE(gs.STEALS,   0)                                             AS stl,
    COALESCE(gs.BLOCKS,   0)                                             AS blk,
    COALESCE(gs.`TO`,     0)                                             AS `to`,
    COALESCE(gs.PF,       0)                                             AS pf,
    COALESCE(gs.FGM, 0) * 2 + COALESCE(gs.M3P, 0) + COALESCE(gs.FTM, 0) AS pts
FROM       dakstats_history.season        gs
INNER JOIN dakstats_history.competitions  dcomp
        ON dcomp.COMPID          = gs.COMPID
       AND TRIM(dcomp.SEASON)    = TRIM(gs.SEASON)
INNER JOIN dakstats_history.rosters       r
        ON r.PLRID               = gs.PLRID
       AND TRIM(r.SEASON)        = TRIM(gs.SEASON)
       AND r.TMID                IN (dcomp.H_TMID, dcomp.V_TMID)
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID            = dcomp.H_TMID
       AND TRIM(h_src.SEASON)    = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams         v_src
        ON v_src.TMID            = dcomp.V_TMID
       AND TRIM(v_src.SEASON)    = TRIM(dcomp.SEASON)
INNER JOIN leagues                        l
        ON l.name                = TRIM(h_src.LEAGUE)
INNER JOIN seasons                        s
        ON s.league_id           = l.id
       AND s.name                = TRIM(dcomp.SEASON)
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
INNER JOIN competitions                   sm_comp
        ON sm_comp.season_id     = s.id
       AND sm_comp.team_id       = ht.id
       AND sm_comp.game_date     = DATE(dcomp.DATE)
       AND sm_comp.opponent_id   = vt.id
INNER JOIN players                        p
        ON p.first_name          = TRIM(r.FIRSTNAME)
       AND p.last_name           = TRIM(r.LASTNAME)
WHERE  gs.COMPID  IS NOT NULL
  AND  gs.SEASON  IS NOT NULL
  AND  gs.PLRID   IS NOT NULL
  AND  TRIM(r.NUMBER) REGEXP '^[0-9]+$'
  AND  UPPER(TRIM(r.LASTNAME)) <> 'TEAM';

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
SELECT 'periods',             COUNT(*)        FROM periods
UNION ALL
SELECT 'players',             COUNT(*)        FROM players
UNION ALL
SELECT 'player_seasons',      COUNT(*)        FROM player_seasons
UNION ALL
SELECT 'boxscores',           COUNT(*)        FROM boxscores;

SELECT 'source team rows'        AS tbl, COUNT(*) AS n FROM dakstats_history.teams
UNION ALL
SELECT 'source competition rows',        COUNT(*)        FROM dakstats_history.competitions
UNION ALL
SELECT 'source period rows',             COUNT(*)        FROM dakstats_history.periods
UNION ALL
SELECT 'source roster rows',             COUNT(*)        FROM dakstats_history.rosters
UNION ALL
SELECT 'source season rows',             COUNT(*)        FROM dakstats_history.season;

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

-- Source season rows that were skipped (unresolved player, competition, or non-numeric jersey)
SELECT gs.SEASON, gs.COMPID, gs.PLRID, r.FIRSTNAME, r.LASTNAME, r.NUMBER
FROM       dakstats_history.season        gs
LEFT JOIN  dakstats_history.rosters       r      ON  r.PLRID = gs.PLRID AND TRIM(r.SEASON) = TRIM(gs.SEASON)
LEFT JOIN  players                        p      ON  p.first_name = TRIM(r.FIRSTNAME) AND p.last_name = TRIM(r.LASTNAME)
WHERE  gs.COMPID IS NOT NULL AND gs.SEASON IS NOT NULL AND gs.PLRID IS NOT NULL
  AND  (p.id IS NULL OR r.NUMBER IS NULL OR r.NUMBER NOT REGEXP '^[0-9]+$');

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
