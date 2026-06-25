-- ============================================================
-- Import dakstats_history → statmanager
--   • dakstats_history.teams        → leagues, seasons, teams, team_seasons
--   • dakstats_history.competitions → competitions, team_schedules
--   • dakstats_history.periods      → periods
--   • dakstats_history.rosters      → players, player_seasons
--   • dakstats_history.season       → boxscores
--   • dakstats_history.playbyplay   → playbyplay
--
-- Prerequisites:
--   • Both databases must be on the same MariaDB/MySQL instance.
--   • The executing user needs SELECT on dakstats_history and
--     INSERT on statmanager.
--   • Run against the statmanager database:
--       mysql -u <user> -p statmanager < importDakstatsHistory.sql
--
-- Assumptions:
--   • SEASON is formatted 'YYYY-YYYY' (e.g. '2021-2022').
--     start_date is set to October 10 of the start year; end_date to February 28 of the end year.
--   • League names are derived from the DIVISION field only.
--     ' SRB' is appended unless the value already contains it.
--     Blank DIVISION defaults to 'D1 SRB'.
--     Edit league contact info in the leagues table afterwards.
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

-- ── Step 0: Base data ────────────────────────────────────────
-- Governing organizations — INSERT IGNORE makes this idempotent on re-runs.
-- Parent FK resolved by SELECT rather than LAST_INSERT_ID() for the same reason.
INSERT IGNORE INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('School Sport Canada',
     'School Sport Canada',
     'SSC',
     'national',
     NULL,
     'Canada',
     'https://www.schoolsport.ca/',
     NULL, NULL, NULL);

INSERT IGNORE INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('School Sport New Brunswick',
     'School Sport NB',
     'NBIAA',
     'provincial',
     (SELECT org_id FROM (SELECT org_id FROM organizations WHERE acronym = 'SSC') AS _ssc),
     'New Brunswick, Canada',
     'https://www.ss-nb.org/en/',
     NULL,
     'https://www.ss-nb.org/Content/images/ssnb-logo.svg',
     NULL);

INSERT IGNORE INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('School Sport Nova Scotia',
     'School Sport NS',
     'NSSAF',
     'provincial',
     (SELECT org_id FROM (SELECT org_id FROM organizations WHERE acronym = 'SSC') AS _ssc),
     'Nova Scotia, Canada',
     'https://sites.google.com/gnspes.ca/nssaf/home',
     NULL, NULL, NULL);

INSERT IGNORE INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('Prince Edward Island School Athletic Association',
     'PEI School Athletic Assoc.',
     'PEISAA',
     'provincial',
     (SELECT org_id FROM (SELECT org_id FROM organizations WHERE acronym = 'SSC') AS _ssc),
     'Prince Edward Island, Canada',
     'http://peisaa.pe.ca/',
     NULL, NULL, NULL);

INSERT IGNORE INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('Reseau du sport etudiant du Quebec',
     'RSEQ', 'RSEQ', 'provincial', NULL,
     'Quebec, Canada',
     'https://rseq.ca/', NULL, NULL, NULL);

INSERT IGNORE INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('Ontario Federation of School Athletic Associations',
     'OFSAA', 'OFSAA', 'provincial', NULL,
     'Ontario, Canada',
     'https://www.ofsaa.on.ca/', NULL, NULL, NULL);

-- ── Step 0b: Members ─────────────────────────────────────────
-- One row per distinct LOCATION value (the member organisation name).
-- LEAGUE is matched to organizations.acronym to resolve sanctioning_org_id.
-- When a LOCATION appears under multiple LEAGUEs the unique constraint on
-- members.name means only the first encountered row is kept (INSERT IGNORE).
-- type defaults to 'school' since all source data is school-sport governed.
INSERT IGNORE INTO members (name, type, sanctioning_org_id)
SELECT DISTINCT
    TRIM(src.LOCATION),
    'school',
    o.org_id
FROM       dakstats_history.teams  src
LEFT JOIN  organizations           o  ON o.acronym = TRIM(src.LEAGUE)
WHERE  TRIM(COALESCE(src.LOCATION, '')) <> ''
ORDER  BY TRIM(src.LOCATION);

-- ── Step 1: Leagues ──────────────────────────────────────────
-- One row per distinct DIVISION value (with ' SRB' suffix).
INSERT IGNORE INTO leagues (name)
SELECT DISTINCT
    CASE WHEN TRIM(COALESCE(DIVISION, '')) = ''  THEN CONCAT(COALESCE(NULLIF(TRIM(LEAGUE), ''), 'NBIAA'), ' D1 SRB')
         WHEN TRIM(DIVISION) LIKE '%SRB%'         THEN TRIM(DIVISION)
         ELSE CONCAT(TRIM(DIVISION), ' SRB')
    END
FROM   dakstats_history.teams
ORDER  BY DIVISION;

-- ── Step 1b: League → governing org ─────────────────────────
-- Build a mapping of constructed league name → source LEAGUE acronym,
-- then join to organizations to set governing_org_id.
UPDATE leagues l
JOIN (
    SELECT DISTINCT
        CASE WHEN TRIM(COALESCE(DIVISION, '')) = ''  THEN CONCAT(COALESCE(NULLIF(TRIM(LEAGUE), ''), 'NBIAA'), ' D1 SRB')
             WHEN TRIM(DIVISION) LIKE '%SRB%'         THEN TRIM(DIVISION)
             ELSE CONCAT(TRIM(DIVISION), ' SRB')
        END                                        AS league_name,
        COALESCE(NULLIF(TRIM(LEAGUE), ''), 'NBIAA') AS league_acronym
    FROM dakstats_history.teams
) src ON src.league_name = l.name
JOIN organizations o ON o.acronym = src.league_acronym
SET l.governing_org_id = o.org_id;

-- ── Step 2: Seasons ──────────────────────────────────────────
-- One row per unique (league, season-name) pair.
-- Resolve the league FK by joining on "LEAGUE DIVISION" name.
INSERT IGNORE INTO seasons (league_id, name, start_date, end_date)
SELECT DISTINCT
    l.league_id,
    TRIM(src.SEASON),
    STR_TO_DATE(CONCAT(LEFT(TRIM(src.SEASON), 4), '-10-10'), '%Y-%m-%d'),
    STR_TO_DATE(CONCAT(RIGHT(TRIM(src.SEASON), 4), '-02-28'), '%Y-%m-%d')
FROM       dakstats_history.teams src
INNER JOIN leagues l ON l.name = CASE WHEN TRIM(COALESCE(src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(src.DIVISION) LIKE '%SRB%' THEN TRIM(src.DIVISION) ELSE CONCAT(TRIM(src.DIVISION), ' SRB') END
WHERE  src.SEASON IS NOT NULL
ORDER  BY l.league_id, TRIM(src.SEASON);

-- ── Step 3: Teams ────────────────────────────────────────────
-- One row per unique (TEAMSHORT, GENDER) — matches the statmanager
-- unique key uq_teams_name_gender.
-- Where the same team appears across multiple seasons, take
-- abbrev and nickname from the most recent season.
INSERT IGNORE INTO teams (name, abbrev, nickname, gender, member_id)
SELECT
    TRIM(src.TEAMSHORT),
    NULLIF(TRIM(src.ABBREV),   ''),
    NULLIF(TRIM(src.NICKNAME), ''),
    src.GENDER + 0,
    m.member_id
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
LEFT JOIN  members m ON m.name = TRIM(src.LOCATION)
WHERE  src.TEAMSHORT IS NOT NULL AND TRIM(src.TEAMSHORT) <> '';

-- ── Step 4: team_seasons ─────────────────────────────────────
-- Join every source row to the statmanager IDs resolved purely
-- by name fields — no source ID columns referenced.
INSERT INTO team_seasons (team_id, season_id, coach, conference, active)
SELECT
    t.team_id,
    s.season_id,
    NULLIF(TRIM(src.COACH), ''),
    NULLIF(TRIM(src.CONFERENCE), ''),
    src.TMACTIVE + 0
FROM       dakstats_history.teams src
INNER JOIN leagues l  ON  l.name      = CASE WHEN TRIM(COALESCE(src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(src.DIVISION) LIKE '%SRB%' THEN TRIM(src.DIVISION) ELSE CONCAT(TRIM(src.DIVISION), ' SRB') END
INNER JOIN seasons s  ON  s.league_id = l.league_id
                      AND s.name      = TRIM(src.SEASON)
INNER JOIN teams   t  ON  t.name      = TRIM(src.TEAMSHORT)
                      AND t.gender   <=> src.GENDER + 0
WHERE  src.TEAMSHORT IS NOT NULL AND TRIM(src.TEAMSHORT) <> ''
  AND  src.SEASON    IS NOT NULL
ON DUPLICATE KEY UPDATE
    coach      = VALUES(coach),
    conference = VALUES(conference),
    active     = VALUES(active);

-- ── Step 4a: Tournaments ─────────────────────────────────────
-- Import distinct tournament names. TOURNID is not carried over —
-- statmanager generates its own IDs.
INSERT IGNORE INTO tournaments (name)
SELECT DISTINCT TRIM(TOURNNAME)
FROM   dakstats_history.tournaments
WHERE  TOURNNAME IS NOT NULL AND TRIM(TOURNNAME) <> ''
ORDER  BY TRIM(TOURNNAME);

-- ── Step 4b: tournament_seasons ──────────────────────────────
-- Link each tournament to the NBIAA season it appeared in.
-- Season is matched by name (e.g. '2021-2022') within any league
-- whose name starts with 'NBIAA ' (covers all NBIAA divisions).
-- startdate/enddate are derived from the first and last game dates
-- for that tournament in the source competitions table.
INSERT INTO tournament_seasons (tournament_id, season_id, startdate, enddate)
SELECT DISTINCT
    t.tournament_id,
    s.season_id,
    (SELECT MIN(DATE(dkc.DATE))
     FROM   dakstats_history.competitions dkc
     WHERE  dkc.TOURNID = dkt.TOURNID
       AND  TRIM(dkc.SEASON) = TRIM(dkt.SEASON)) AS startdate,
    (SELECT MAX(DATE(dkc.DATE))
     FROM   dakstats_history.competitions dkc
     WHERE  dkc.TOURNID = dkt.TOURNID
       AND  TRIM(dkc.SEASON) = TRIM(dkt.SEASON)) AS enddate
FROM       dakstats_history.tournaments dkt
INNER JOIN tournaments t ON  t.name      = TRIM(dkt.TOURNNAME)
INNER JOIN leagues     l ON  l.name = 'NBIAA' OR l.name LIKE 'NBIAA %'
INNER JOIN seasons     s ON  s.league_id = l.league_id
                         AND s.name      = TRIM(dkt.SEASON)
WHERE  dkt.TOURNNAME IS NOT NULL AND TRIM(dkt.TOURNNAME) <> ''
  AND  dkt.SEASON    IS NOT NULL
ON DUPLICATE KEY UPDATE
    startdate = VALUES(startdate),
    enddate   = VALUES(enddate);

-- ── Step 5: Competitions ─────────────────────────────────────
-- H_TMID (home team) and V_TMID (visiting team) are resolved to
-- team names by joining to dakstats_history.teams, which already
-- maps TMID → TEAMSHORT (team name), LEAGUE, and GENDER.
-- Those names then resolve to statmanager IDs the same way
-- Steps 1–4 do — no source ID columns flow into statmanager.
--
-- Notes:
--   • team_id  = home team (H_TMID);  opponent_id = visiting team (V_TMID).
--   • The season is matched by the home team's league + the game date
--     falling within that season's start_date..end_date window, not by
--     season name string.  This allows cross-league exhibition games to
--     be associated with the correct season for each team.
--   • location is populated from comp.ARENA.
--   • Competitions where either team, the season, or the league cannot
--     be resolved in statmanager are silently skipped (INNER JOIN).
--   • competitions has no formal unique key, so INSERT IGNORE cannot
--     suppress duplicates.  A WHERE NOT EXISTS guard on
--     (season_id, team_id, start_time, opponent_id) makes the step
--     safe to re-run.
--   • tournament_id is resolved via dakstats_history.tournaments
--     (matched on TOURNID + SEASON) then to the statmanager tournaments
--     table by name, assuming the 'NBIAA' league. NULL when no tournament.
INSERT INTO competitions (season_id, team_id, start_time, end_time, opponent_id, comptype_id, location, tournament_id)
SELECT
    s.season_id                                                           AS season_id,
    ht.team_id                                                            AS team_id,
    comp.STARTTIME                                                        AS start_time,
    comp.ENDTIME                                                          AS end_time,
    vt.team_id                                                            AS opponent_id,
    CASE WHEN comp.COMPTYPEID IN (1,2,3,4) THEN comp.COMPTYPEID ELSE NULL END AS comptype_id,
    comp.ARENA                                                            AS location,
    trn.tournament_id                                                     AS tournament_id
FROM       dakstats_history.competitions  comp
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID            = comp.H_TMID
       AND TRIM(h_src.SEASON)    = TRIM(comp.SEASON)
INNER JOIN dakstats_history.teams v_src
        ON v_src.TMID         = comp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(comp.SEASON)
INNER JOIN leagues                        l
        ON l.name                = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
INNER JOIN seasons                        s
        ON s.league_id           = l.league_id
       AND DATE(comp.STARTTIME) BETWEEN s.start_date AND s.end_date
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
LEFT  JOIN dakstats_history.tournaments   dkt
        ON dkt.TOURNID           = comp.TOURNID
       AND TRIM(dkt.SEASON)      = TRIM(comp.SEASON)
LEFT  JOIN tournaments                    trn
        ON trn.name              = TRIM(dkt.TOURNNAME)
WHERE  comp.STARTTIME    IS NOT NULL
  AND  comp.SEASON  IS NOT NULL
  AND  comp.H_TMID  IS NOT NULL
  AND  comp.V_TMID  IS NOT NULL
  AND  NOT EXISTS (
           SELECT 1
           FROM   competitions ex
           WHERE  ex.season_id   = s.season_id
             AND  ex.team_id     = ht.team_id
             AND  DATE(ex.start_time) = DATE(comp.STARTTIME)
             AND  ex.opponent_id = vt.team_id
       );

-- ── Step 5b: team_schedules ───────────────────────────────────
-- Two rows per competition: one for the home team (resolved via their
-- own dakstats league + date range) and one for the visiting team
-- (same approach, but using the visitor's league).
-- INSERT IGNORE + the unique key (team_id, season_id, competition_id)
-- make re-runs safe.

-- Home team row — resolve season via home team's league + date range.
INSERT IGNORE INTO team_schedules (team_id, season_id, competition_id)
SELECT
    ht.team_id      AS team_id,
    s.season_id     AS season_id,
    sm_comp.competition_id AS competition_id
FROM       dakstats_history.competitions  comp
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID            = comp.H_TMID
       AND TRIM(h_src.SEASON)    = TRIM(comp.SEASON)
INNER JOIN dakstats_history.teams v_src
        ON v_src.TMID         = comp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(comp.SEASON)
INNER JOIN leagues                        l
        ON l.name                = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
INNER JOIN seasons                        s
        ON s.league_id           = l.league_id
       AND DATE(comp.STARTTIME) BETWEEN s.start_date AND s.end_date
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
INNER JOIN competitions                   sm_comp
        ON sm_comp.season_id     = s.season_id
       AND sm_comp.team_id       = ht.team_id
       AND DATE(sm_comp.start_time) = DATE(comp.STARTTIME)
       AND sm_comp.opponent_id   = vt.team_id
WHERE  comp.STARTTIME   IS NOT NULL
  AND  comp.SEASON IS NOT NULL
  AND  comp.H_TMID IS NOT NULL
  AND  comp.V_TMID IS NOT NULL;

-- Visiting team row — resolve their season via their own league.
INSERT IGNORE INTO team_schedules (team_id, season_id, competition_id)
SELECT
    vt.team_id      AS team_id,
    s_vt.season_id AS season_id,
    sm_comp.competition_id AS competition_id
FROM       dakstats_history.competitions  comp
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID            = comp.H_TMID
       AND TRIM(h_src.SEASON)    = TRIM(comp.SEASON)
INNER JOIN dakstats_history.teams v_src
        ON v_src.TMID         = comp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(comp.SEASON)
INNER JOIN leagues                        l_ht
        ON l_ht.name             = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
INNER JOIN seasons                        s_ht
        ON s_ht.league_id        = l_ht.league_id
       AND DATE(comp.STARTTIME) BETWEEN s_ht.start_date AND s_ht.end_date
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
INNER JOIN competitions                   sm_comp
        ON sm_comp.season_id     = s_ht.season_id
       AND sm_comp.team_id       = ht.team_id
       AND DATE(sm_comp.start_time) = DATE(comp.STARTTIME)
       AND sm_comp.opponent_id   = vt.team_id
INNER JOIN leagues                        l_vt
        ON l_vt.name             = CASE WHEN TRIM(COALESCE(v_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(v_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(v_src.DIVISION) LIKE '%SRB%' THEN TRIM(v_src.DIVISION) ELSE CONCAT(TRIM(v_src.DIVISION), ' SRB') END
INNER JOIN seasons                        s_vt
        ON s_vt.league_id        = l_vt.league_id
       AND DATE(comp.STARTTIME) BETWEEN s_vt.start_date AND s_vt.end_date
WHERE  comp.STARTTIME   IS NOT NULL
  AND  comp.SEASON IS NOT NULL
  AND  comp.H_TMID IS NOT NULL
  AND  comp.V_TMID IS NOT NULL;

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
    sm_comp.competition_id AS competition_id,
    t.team_id              AS team_id,
    p.PERIODNUM AS period_num,
    p.SCORE     AS score
FROM       dakstats_history.periods       p
INNER JOIN dakstats_history.competitions  dcomp
        ON dcomp.COMPID              = p.COMPID
       AND TRIM(dcomp.SEASON)        = TRIM(p.SEASON)
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID                = dcomp.H_TMID
       AND TRIM(h_src.SEASON)        = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams v_src
        ON v_src.TMID         = dcomp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams tm_src
        ON tm_src.TMID         = p.TMID
       AND TRIM(tm_src.SEASON) = TRIM(dcomp.SEASON)
INNER JOIN leagues  l
        ON l.name                    = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
INNER JOIN seasons  s
        ON s.league_id               = l.league_id
       AND DATE(dcomp.STARTTIME) BETWEEN s.start_date AND s.end_date
INNER JOIN teams    ht
        ON ht.name                   = TRIM(h_src.TEAMSHORT)
       AND ht.gender                <=> h_src.GENDER + 0
INNER JOIN teams    vt
        ON vt.name                   = TRIM(v_src.TEAMSHORT)
       AND vt.gender                <=> v_src.GENDER + 0
INNER JOIN competitions sm_comp
        ON sm_comp.season_id         = s.season_id
       AND sm_comp.team_id           = ht.team_id
       AND DATE(sm_comp.start_time)   = DATE(dcomp.STARTTIME)
       AND sm_comp.opponent_id       = vt.team_id
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
           WHERE  ex.competition_id = sm_comp.competition_id
             AND  ex.team_id        = t.team_id
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
    p.player_id                       AS player_id,
    s.season_id                       AS season_id,
    t.team_id                         AS team_id,
    CAST(r.NUMBER AS UNSIGNED)        AS jersey_number,
    NULLIF(REPLACE(TRIM(r.HEIGHT), ' ', ''), '')  AS height,
    NULLIF(TRIM(r.YEAR),   '')        AS `year`
FROM       dakstats_history.rosters r
INNER JOIN dakstats_history.teams   tm ON  tm.TMID         = r.TMID
                                       AND TRIM(tm.SEASON) = TRIM(r.SEASON)
INNER JOIN leagues                  l  ON  l.name          = CASE WHEN TRIM(COALESCE(tm.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(tm.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(tm.DIVISION) LIKE '%SRB%' THEN TRIM(tm.DIVISION) ELSE CONCAT(TRIM(tm.DIVISION), ' SRB') END
INNER JOIN seasons                  s  ON  s.league_id     = l.league_id
                                       AND s.name          = TRIM(r.SEASON)
INNER JOIN teams                    t  ON  t.name          = TRIM(tm.TEAMSHORT)
                                       AND t.gender       <=> tm.GENDER + 0
INNER JOIN players                  p  ON  p.first_name    = TRIM(r.FIRSTNAME)
                                       AND p.last_name     = TRIM(r.LASTNAME)
WHERE  TRIM(r.NUMBER) REGEXP '^[0-9]+$'
  AND  r.FIRSTNAME IS NOT NULL AND TRIM(r.FIRSTNAME) <> ''
  AND  r.LASTNAME  IS NOT NULL AND TRIM(r.LASTNAME)  <> '';

-- ── Step 9: Boxscores ────────────────────────────────────────
-- One row per player per period per game (PERIODNUM from the source).
-- When PERIODNUM is NULL the row is stored with period = 0 (full-game).
-- tp is derived: 2*FGM + M3P + FTM
--   (= 2*(FGM-M3P) + 3*M3P + FTM, algebraically equivalent)
-- Jersey number comes from the roster (same number all season).
-- The UNIQUE KEY uq_boxscores_game_player makes re-runs safe via
-- INSERT IGNORE.
INSERT IGNORE INTO boxscores
    (competition_id, player_id, period, started, jersey_number,
     min,  fgm,  fga,  fgm3, fga3, ftm,  fta,
     oreb, dreb, reb,  ast,  stl,  blk,  `to`, pf, tf, tp)
SELECT
    sm_comp.competition_id                                               AS competition_id,
    p.player_id                                                          AS player_id,
    COALESCE(gs.PERIODNUM, 0)                                            AS period,
    COALESCE(gs.STARTED,   0)                                            AS started,
    CAST(r.NUMBER AS UNSIGNED)                                           AS jersey_number,
    COALESCE(gs.MINUTES, 0)                                              AS min,
    COALESCE(gs.FGM,      0)                                             AS fgm,
    COALESCE(gs.FGA,      0)                                             AS fga,
    COALESCE(gs.M3P,      0)                                             AS fgm3,
    COALESCE(gs.A3P,      0)                                             AS fga3,
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
    COALESCE(gs.TF,       0)                                             AS tf,
    COALESCE(gs.FGM, 0) * 2 + COALESCE(gs.M3P, 0) + COALESCE(gs.FTM, 0) AS tp
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
INNER JOIN dakstats_history.teams v_src
        ON v_src.TMID         = dcomp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(dcomp.SEASON)
INNER JOIN leagues                        l
        ON l.name                = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
INNER JOIN seasons                        s
        ON s.league_id           = l.league_id
       AND DATE(dcomp.STARTTIME) BETWEEN s.start_date AND s.end_date
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
INNER JOIN competitions                   sm_comp
        ON sm_comp.season_id     = s.season_id
       AND sm_comp.team_id       = ht.team_id
       AND DATE(sm_comp.start_time) = DATE(dcomp.STARTTIME)
       AND sm_comp.opponent_id   = vt.team_id
INNER JOIN players                        p
        ON p.first_name          = TRIM(r.FIRSTNAME)
       AND p.last_name           = TRIM(r.LASTNAME)
WHERE  gs.COMPID  IS NOT NULL
  AND  gs.SEASON  IS NOT NULL
  AND  gs.PLRID   IS NOT NULL
  AND  TRIM(r.NUMBER) REGEXP '^[0-9]+$';

-- ── Step 9b: Team game stats ─────────────────────────────────────────────────
-- Team rebounds and turnovers from dakstats's "Team" dummy player
-- (LASTNAME='TEAM', NUMBER='TM'). Stored separately from boxscores because
-- each game has two "Team" entries (one per team), which would conflict on the
-- boxscores unique key (competition_id, player_id, period).
INSERT IGNORE INTO team_game_stats
    (competition_id, team_id, period, oreb, dreb, reb, `to`)
SELECT
    sm_comp.competition_id                                                   AS competition_id,
    tm.team_id                                                               AS team_id,
    COALESCE(gs.PERIODNUM, 0)                                                AS period,
    COALESCE(gs.OREB,  0) + COALESCE(gs.ODEAD, 0)                           AS oreb,
    COALESCE(gs.DREB,  0) + COALESCE(gs.DDEAD, 0)                           AS dreb,
    COALESCE(gs.OREB,  0) + COALESCE(gs.ODEAD, 0)
      + COALESCE(gs.DREB,  0) + COALESCE(gs.DDEAD, 0)                       AS reb,
    COALESCE(gs.`TO`,  0)                                                    AS `to`
FROM       dakstats_history.season        gs
INNER JOIN dakstats_history.rosters       r
        ON r.PLRID               = gs.PLRID
       AND TRIM(r.SEASON)        = TRIM(gs.SEASON)
       AND TRIM(r.NUMBER)        = 'TM'
       AND TRIM(r.LASTNAME)      = 'TEAM'
INNER JOIN dakstats_history.competitions  dcomp
        ON dcomp.COMPID          = gs.COMPID
       AND TRIM(dcomp.SEASON)    = TRIM(gs.SEASON)
       AND r.TMID                IN (dcomp.H_TMID, dcomp.V_TMID)
INNER JOIN dakstats_history.teams         h_src
        ON h_src.TMID            = dcomp.H_TMID
       AND TRIM(h_src.SEASON)    = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams         v_src
        ON v_src.TMID            = dcomp.V_TMID
       AND TRIM(v_src.SEASON)    = TRIM(dcomp.SEASON)
INNER JOIN dakstats_history.teams         tm_src
        ON tm_src.TMID           = r.TMID
       AND TRIM(tm_src.SEASON)   = TRIM(dcomp.SEASON)
INNER JOIN leagues                        l
        ON l.name                = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
INNER JOIN seasons                        s
        ON s.league_id           = l.league_id
       AND DATE(dcomp.STARTTIME) BETWEEN s.start_date AND s.end_date
INNER JOIN teams                          ht
        ON ht.name               = TRIM(h_src.TEAMSHORT)
       AND ht.gender            <=> h_src.GENDER + 0
INNER JOIN teams                          vt
        ON vt.name               = TRIM(v_src.TEAMSHORT)
       AND vt.gender            <=> v_src.GENDER + 0
INNER JOIN competitions                   sm_comp
        ON sm_comp.season_id     = s.season_id
       AND sm_comp.team_id       = ht.team_id
       AND DATE(sm_comp.start_time) = DATE(dcomp.STARTTIME)
       AND sm_comp.opponent_id   = vt.team_id
INNER JOIN teams                          tm
        ON tm.name               = TRIM(tm_src.TEAMSHORT)
       AND tm.gender            <=> tm_src.GENDER + 0
WHERE  gs.COMPID   IS NOT NULL
  AND  gs.SEASON   IS NOT NULL
  AND  gs.PLRID    IS NOT NULL;

-- ── Step 10: Play-by-play ────────────────────────────────────────────────────
-- Decodes ACTION/RESULT numeric codes to string action/play_type:
--   1=ASSIST  2=TURNOVER  3=STEAL  4=GOOD(2pt)  5=FOUL  6=BLOCK
--   14=FT (RESULT: 8=GOOD, 9=MISS)
--   15=REBOUND(OFF)  16=REBOUND(DEF)
--   18=SHOT (RESULT: 1=3pt made, 3=2pt made, 2/4=MISS)
--   19=SUB (RESULT: 7=starter/IN, 5=OUT, 6=IN)
--   23=PERIOD START  24=PERIOD END
--   Codes 21, 25 and any others are excluded (action IS NOT NULL filter).
-- TEAM dummy roster entries → team_id resolved, player_id NULL.
-- NULL PLRID (period events) → team_id NULL, player_id NULL.
-- X=0/Y=0 normalised to NULL (dakstats uses 0 for "no location").
-- seq from ROW_NUMBER() ordered by AUTO_PLAY_ID — stable across re-runs.
-- Deduplication via NOT EXISTS on (competition_id, period, seq).
INSERT INTO playbyplay
    (competition_id, period, clock, team_id, player_id,
     action, play_type, is_paint, home_score, visitor_score,
     wall_clock, x, y, seq)
SELECT
    src.competition_id,
    src.period,
    src.clock,
    src.team_id,
    src.player_id,
    src.action,
    src.play_type,
    0,
    src.home_score,
    src.visitor_score,
    NULL,
    src.x,
    src.y,
    src.seq
FROM (
    SELECT
        sm_comp.competition_id,
        pbp.PERIODNUM                                                              AS period,
        CONCAT(LPAD(FLOOR(pbp.CLOCK / 60), 2, '0'), ':',
               LPAD(MOD(pbp.CLOCK, 60), 2, '0'))                                  AS clock,
        CASE
            WHEN r.TMID = dcomp.H_TMID THEN ht.team_id
            WHEN r.TMID = dcomp.V_TMID THEN vt.team_id
            ELSE NULL
        END                                                                        AS team_id,
        CASE WHEN TRIM(COALESCE(r.LASTNAME, '')) = 'TEAM' THEN NULL
             ELSE p.player_id
        END                                                                        AS player_id,
        CASE pbp.ACTION
            WHEN  1 THEN 'ASSIST'
            WHEN  2 THEN 'TURNOVER'
            WHEN  3 THEN 'STEAL'
            WHEN  4 THEN 'GOOD'
            WHEN  5 THEN 'FOUL'
            WHEN  6 THEN 'BLOCK'
            WHEN 14 THEN CASE WHEN pbp.RESULT = 8 THEN 'GOOD' ELSE 'MISS' END
            WHEN 15 THEN 'REBOUND'
            WHEN 16 THEN 'REBOUND'
            WHEN 18 THEN CASE WHEN pbp.RESULT IN (1, 3) THEN 'GOOD' ELSE 'MISS' END
            WHEN 19 THEN 'SUB'
            WHEN 23 THEN 'PERIOD'
            WHEN 24 THEN 'PERIOD'
            ELSE NULL
        END                                                                        AS action,
        CASE pbp.ACTION
            WHEN  4 THEN '2PTR'
            WHEN 14 THEN 'FT'
            WHEN 15 THEN 'OFF'
            WHEN 16 THEN 'DEF'
            WHEN 18 THEN CASE WHEN pbp.RESULT = 1 THEN '3PTR' ELSE '2PTR' END
            WHEN 19 THEN CASE pbp.RESULT WHEN 5 THEN 'OUT'
                                         WHEN 6 THEN 'IN'
                                         WHEN 7 THEN 'IN'
                                         ELSE NULL END
            WHEN 23 THEN 'START'
            WHEN 24 THEN 'END'
            ELSE NULL
        END                                                                        AS play_type,
        pbp.HSCORE                                                                 AS home_score,
        pbp.VSCORE                                                                 AS visitor_score,
        NULLIF(pbp.X, 0)                                                           AS x,
        NULLIF(pbp.Y, 0)                                                           AS y,
        ROW_NUMBER() OVER (
            PARTITION BY pbp.COMPID, pbp.SEASON, pbp.PERIODNUM
            ORDER BY pbp.AUTO_PLAY_ID
        )                                                                          AS seq
    FROM       dakstats_history.playbyplay     pbp
    INNER JOIN dakstats_history.competitions   dcomp
            ON dcomp.COMPID              = pbp.COMPID
           AND TRIM(dcomp.SEASON)        = TRIM(pbp.SEASON)
    INNER JOIN dakstats_history.teams          h_src
            ON h_src.TMID                = dcomp.H_TMID
           AND TRIM(h_src.SEASON)        = TRIM(dcomp.SEASON)
    INNER JOIN dakstats_history.teams          v_src
            ON v_src.TMID                = dcomp.V_TMID
           AND TRIM(v_src.SEASON)        = TRIM(dcomp.SEASON)
    INNER JOIN leagues                         l
            ON l.name                    = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
    INNER JOIN seasons                         s
            ON s.league_id               = l.league_id
           AND DATE(dcomp.STARTTIME)    BETWEEN s.start_date AND s.end_date
    INNER JOIN teams                           ht
            ON ht.name                   = TRIM(h_src.TEAMSHORT)
           AND ht.gender                <=> h_src.GENDER + 0
    INNER JOIN teams                           vt
            ON vt.name                   = TRIM(v_src.TEAMSHORT)
           AND vt.gender                <=> v_src.GENDER + 0
    INNER JOIN competitions                    sm_comp
            ON sm_comp.season_id         = s.season_id
           AND sm_comp.team_id           = ht.team_id
           AND DATE(sm_comp.start_time)  = DATE(dcomp.STARTTIME)
           AND sm_comp.opponent_id       = vt.team_id
    LEFT  JOIN dakstats_history.rosters        r
            ON r.PLRID                   = pbp.PLRID
           AND TRIM(r.SEASON)            = TRIM(pbp.SEASON)
           AND r.TMID                   IN (dcomp.H_TMID, dcomp.V_TMID)
    LEFT  JOIN players                         p
            ON p.first_name              = TRIM(r.FIRSTNAME)
           AND p.last_name               = TRIM(r.LASTNAME)
           AND TRIM(COALESCE(r.LASTNAME, '')) <> 'TEAM'
    WHERE  pbp.COMPID    IS NOT NULL
      AND  pbp.SEASON    IS NOT NULL
      AND  pbp.PERIODNUM IS NOT NULL
) AS src
WHERE  src.action IS NOT NULL
  AND  NOT EXISTS (
           SELECT 1
           FROM   playbyplay ex
           WHERE  ex.competition_id = src.competition_id
             AND  ex.period         = src.period
             AND  ex.seq            = src.seq
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
SELECT 'periods',             COUNT(*)        FROM periods
UNION ALL
SELECT 'players',             COUNT(*)        FROM players
UNION ALL
SELECT 'player_seasons',      COUNT(*)        FROM player_seasons
UNION ALL
SELECT 'boxscores',           COUNT(*)        FROM boxscores
UNION ALL
SELECT 'playbyplay',          COUNT(*)        FROM playbyplay;

SELECT 'source team rows'        AS tbl, COUNT(*) AS n FROM dakstats_history.teams
UNION ALL
SELECT 'source competition rows',        COUNT(*)        FROM dakstats_history.competitions
UNION ALL
SELECT 'source period rows',             COUNT(*)        FROM dakstats_history.periods
UNION ALL
SELECT 'source roster rows',             COUNT(*)        FROM dakstats_history.rosters
UNION ALL
SELECT 'source season rows',             COUNT(*)        FROM dakstats_history.season
UNION ALL
SELECT 'source playbyplay rows',         COUNT(*)        FROM dakstats_history.playbyplay;

-- Source rows that produced no team_seasons entry
-- (unmatched TEAMSHORT, LEAGUE, or SEASON)
SELECT src.TEAMSHORT, src.LEAGUE, src.SEASON, src.GENDER + 0 AS gender
FROM       dakstats_history.teams src
LEFT JOIN  leagues l  ON  l.name      = CASE WHEN TRIM(COALESCE(src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(src.DIVISION) LIKE '%SRB%' THEN TRIM(src.DIVISION) ELSE CONCAT(TRIM(src.DIVISION), ' SRB') END
LEFT JOIN  seasons s  ON  s.league_id = l.league_id AND s.name = TRIM(src.SEASON)
LEFT JOIN  teams   t  ON  t.name      = TRIM(src.TEAMSHORT)
                      AND t.gender   <=> src.GENDER + 0
LEFT JOIN  team_seasons ts ON ts.team_id = t.team_id AND ts.season_id = s.season_id
WHERE  ts.team_id IS NULL
  AND  src.TEAMSHORT IS NOT NULL AND TRIM(src.TEAMSHORT) <> '';

-- Source competitions that were skipped (unresolved team or season)
SELECT comp.SEASON, comp.H_TMID, comp.V_TMID, DATE(comp.STARTTIME) AS start_time
FROM       dakstats_history.competitions  comp
LEFT JOIN  dakstats_history.teams         h_src ON h_src.TMID = comp.H_TMID AND TRIM(h_src.SEASON) = TRIM(comp.SEASON)
LEFT JOIN  dakstats_history.teams v_src
        ON v_src.TMID         = comp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(comp.SEASON)
LEFT JOIN  leagues                        l     ON l.name     = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
LEFT JOIN  seasons                        s     ON s.league_id = l.league_id AND s.name = TRIM(comp.SEASON)
LEFT JOIN  teams                          ht    ON ht.name    = TRIM(h_src.TEAMSHORT) AND ht.gender <=> h_src.GENDER + 0
LEFT JOIN  teams                          vt    ON vt.name    = TRIM(v_src.TEAMSHORT) AND vt.gender <=> v_src.GENDER + 0
WHERE  comp.STARTTIME   IS NOT NULL
  AND  comp.SEASON IS NOT NULL
  AND  (s.season_id IS NULL OR ht.team_id IS NULL OR vt.team_id IS NULL);

-- Source season rows that were skipped (unresolved player, competition, or non-numeric jersey)
SELECT gs.SEASON, gs.COMPID, gs.PLRID, r.FIRSTNAME, r.LASTNAME, r.NUMBER
FROM       dakstats_history.season        gs
LEFT JOIN  dakstats_history.rosters       r      ON  r.PLRID = gs.PLRID AND TRIM(r.SEASON) = TRIM(gs.SEASON)
LEFT JOIN  players                        p      ON  p.first_name = TRIM(r.FIRSTNAME) AND p.last_name = TRIM(r.LASTNAME)
WHERE  gs.COMPID IS NOT NULL AND gs.SEASON IS NOT NULL AND gs.PLRID IS NOT NULL
  AND  (p.player_id IS NULL OR r.NUMBER IS NULL OR r.NUMBER NOT REGEXP '^[0-9]+$');

-- Source period rows that were skipped (unresolved competition or team)
SELECT p.SEASON, p.COMPID, p.TMID, p.PERIODNUM
FROM       dakstats_history.periods       p
LEFT JOIN  dakstats_history.competitions  dcomp  ON dcomp.COMPID  = p.COMPID AND TRIM(dcomp.SEASON) = TRIM(p.SEASON)
LEFT JOIN  dakstats_history.teams         h_src  ON h_src.TMID    = dcomp.H_TMID AND TRIM(h_src.SEASON) = TRIM(dcomp.SEASON)
LEFT JOIN  dakstats_history.teams v_src
        ON v_src.TMID         = dcomp.V_TMID
       AND TRIM(v_src.SEASON) = TRIM(dcomp.SEASON)
LEFT JOIN  dakstats_history.teams tm_src
        ON tm_src.TMID         = p.TMID
       AND TRIM(tm_src.SEASON) = TRIM(dcomp.SEASON)
LEFT JOIN  leagues    l       ON l.name        = CASE WHEN TRIM(COALESCE(h_src.DIVISION, '')) = '' THEN CONCAT(COALESCE(NULLIF(TRIM(h_src.LEAGUE), ''), 'NBIAA'), ' D1 SRB') WHEN TRIM(h_src.DIVISION) LIKE '%SRB%' THEN TRIM(h_src.DIVISION) ELSE CONCAT(TRIM(h_src.DIVISION), ' SRB') END
LEFT JOIN  seasons    s       ON s.league_id   = l.league_id AND s.name = TRIM(dcomp.SEASON)
LEFT JOIN  teams      ht      ON ht.name       = TRIM(h_src.TEAMSHORT) AND ht.gender <=> h_src.GENDER + 0
LEFT JOIN  teams      vt      ON vt.name       = TRIM(v_src.TEAMSHORT) AND vt.gender <=> v_src.GENDER + 0
LEFT JOIN  competitions sm_c  ON sm_c.season_id = s.season_id AND sm_c.team_id = ht.team_id
                              AND DATE(sm_c.start_time) = DATE(dcomp.STARTTIME) AND sm_c.opponent_id = vt.team_id
LEFT JOIN  teams      t       ON t.name        = TRIM(tm_src.TEAMSHORT) AND t.gender <=> tm_src.GENDER + 0
WHERE  p.COMPID IS NOT NULL AND p.SEASON IS NOT NULL
  AND  (sm_c.competition_id IS NULL OR t.team_id IS NULL);
*/

/*
-- ─────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC: Teams Without Games — source data cross-reference
-- For each team/season that has no entry in team_schedules, shows how many
-- games exist for them in dakstats_history (home and away) in the same season.
--   dk_home_games > 0  → games exist as H_TMID but weren't imported
--   dk_away_games > 0  → games exist as V_TMID but weren't imported
--   both = 0           → team genuinely has no games in dakstats for that season
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    t.name                AS team_name,
    t.gender + 0          AS gender,
    s.name                AS season_name,
    l.name                AS league_name,
    (
        SELECT COUNT(*)
        FROM   dakstats_history.competitions dkc
        WHERE  dkc.H_TMID IN (
                   SELECT DISTINCT dkt.TMID
                   FROM   dakstats_history.teams dkt
                   WHERE  TRIM(dkt.TEAMSHORT) = t.name
                     AND  dkt.GENDER + 0     <=> t.gender
               )
          AND  DATE(dkc.DATE) BETWEEN s.start_date AND s.end_date
    ) AS dk_home_games,
    (
        SELECT COUNT(*)
        FROM   dakstats_history.competitions dkc
        WHERE  dkc.V_TMID IN (
                   SELECT DISTINCT dkt.TMID
                   FROM   dakstats_history.teams dkt
                   WHERE  TRIM(dkt.TEAMSHORT) = t.name
                     AND  dkt.GENDER + 0     <=> t.gender
               )
          AND  DATE(dkc.DATE) BETWEEN s.start_date AND s.end_date
    ) AS dk_away_games
FROM   team_seasons ts
JOIN   teams   t ON t.team_id   = ts.team_id
JOIN   seasons s ON s.season_id = ts.season_id
JOIN   leagues l ON l.league_id = s.league_id
WHERE  NOT EXISTS (
    SELECT 1 FROM team_schedules tsch
    WHERE  tsch.team_id   = ts.team_id
      AND  tsch.season_id = ts.season_id
)
ORDER  BY l.name, s.name, t.name;

-- ─────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC: Teams Without Games — league cross-check
-- For every "no games" team, shows ALL their season/league entries in
-- statmanager with competition counts via team_schedules.
-- A count > 0 in a DIFFERENT league for the same team means the import
-- associated their games with a different league's season.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    t.name              AS team_name,
    l.name              AS league_name,
    s.name              AS season_name,
    COUNT(DISTINCT tsch.competition_id) AS competition_count
FROM   team_seasons ts
JOIN   teams   t ON t.team_id   = ts.team_id
JOIN   seasons s ON s.season_id = ts.season_id
JOIN   leagues l ON l.league_id = s.league_id
LEFT   JOIN team_schedules tsch
        ON  tsch.team_id   = ts.team_id
       AND  tsch.season_id = ts.season_id
WHERE  ts.team_id IN (
    SELECT ts2.team_id FROM team_seasons ts2
    WHERE  NOT EXISTS (
        SELECT 1 FROM team_schedules tsch2
        WHERE  tsch2.team_id   = ts2.team_id
          AND  tsch2.season_id = ts2.season_id
    )
)
GROUP  BY t.team_id, t.name, l.league_id, l.name, s.season_id, s.name
ORDER  BY t.name, l.name, s.name;
*/
