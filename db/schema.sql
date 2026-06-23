-- StatManager Basketball Database Schema
-- Compatible with MariaDB / MySQL

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS team_game_stats;
DROP TABLE IF EXISTS boxscores;
DROP TABLE IF EXISTS periods;
DROP TABLE IF EXISTS team_schedules;
DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS player_seasons;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS team_seasons;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tournament_seasons;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS leagues;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS comptypes;

SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE comptypes (
    comptype_id TINYINT UNSIGNED    NOT NULL,
    comptype    VARCHAR(30)         NOT NULL,
    PRIMARY KEY (comptype_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO comptypes (comptype_id, comptype) VALUES
    (1, 'Pre-Season'),
    (2, 'Non-Conference'),
    (3, 'Conference'),
    (4, 'Post-Season');


CREATE TABLE organizations (
    org_id          SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)        NOT NULL,
    short_name      VARCHAR(50)         NULL,
    acronym         VARCHAR(10)         NULL,
    level           ENUM('international','national','provincial','regional') NOT NULL,
    parent_org_id   SMALLINT UNSIGNED   NULL,
    jurisdiction    VARCHAR(100)        NULL,
    website         VARCHAR(255)        NULL,
    contact_email   VARCHAR(100)        NULL,
    logo_url        VARCHAR(255)        NULL,
    founded_date    DATE                NULL,
    PRIMARY KEY (org_id),
    UNIQUE KEY uq_organizations_name (name),
    CONSTRAINT fk_organizations_parent
        FOREIGN KEY (parent_org_id) REFERENCES organizations (org_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE addresses (
    address_id      SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    street          VARCHAR(100)        NULL,
    city            VARCHAR(60)         NOT NULL,
    province        VARCHAR(60)         NULL,
    country         VARCHAR(60)         NOT NULL DEFAULT 'Canada',
    postal_code     VARCHAR(10)         NULL,
    PRIMARY KEY (address_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE members (
    member_id           SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name                VARCHAR(100)        NOT NULL,
    short_name          VARCHAR(50)         NULL,
    type                ENUM('club','school','academy','rep_program') NOT NULL,
    address_id          SMALLINT UNSIGNED   NULL,
    sanctioning_org_id  SMALLINT UNSIGNED   NULL,
    contact_email       VARCHAR(100)        NULL,
    phone               VARCHAR(25)         NULL,
    website             VARCHAR(255)        NULL,
    logo_url            VARCHAR(255)        NULL,
    founded_date        DATE                NULL,
    status              ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    PRIMARY KEY (member_id),
    UNIQUE KEY uq_members_name (name),
    CONSTRAINT fk_members_address
        FOREIGN KEY (address_id)          REFERENCES addresses (address_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_members_sanctioning_org
        FOREIGN KEY (sanctioning_org_id)  REFERENCES organizations (org_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE tournaments (
    tournament_id   SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name            VARCHAR(40)         NOT NULL,
    PRIMARY KEY (tournament_id),
    UNIQUE KEY uq_tournaments_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE leagues (
    league_id           SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name                VARCHAR(100)        NOT NULL,
    governing_org_id    SMALLINT UNSIGNED   NULL,
    contact_person      VARCHAR(100)        NULL,
    contact_phone       VARCHAR(25)         NULL,
    contact_email       VARCHAR(100)        NULL,
    website_url         VARCHAR(255)        NULL,
    founded_date        DATE                NULL,
    facebook            VARCHAR(100)        NULL,
    x_handle            VARCHAR(50)         NULL,
    instagram           VARCHAR(50)         NULL,
    logo_path           VARCHAR(255)        NULL,
    PRIMARY KEY (league_id),
    UNIQUE KEY uq_leagues_name (name),
    CONSTRAINT fk_leagues_governing_org
        FOREIGN KEY (governing_org_id) REFERENCES organizations (org_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE seasons (
    season_id   SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    league_id   SMALLINT UNSIGNED   NOT NULL,
    name        VARCHAR(10)         NOT NULL,           -- e.g. '2025-26'
    start_date  DATE                NOT NULL,
    end_date    DATE                NOT NULL,
    PRIMARY KEY (season_id),
    UNIQUE KEY uq_seasons_league_name (league_id, name),
    CONSTRAINT fk_seasons_league
        FOREIGN KEY (league_id) REFERENCES leagues (league_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE tournament_seasons (
    tournament_id   SMALLINT UNSIGNED   NOT NULL,
    season_id       SMALLINT UNSIGNED   NOT NULL,
    startdate       DATE                NULL,
    enddate         DATE                NULL,
    PRIMARY KEY (tournament_id, season_id),
    CONSTRAINT fk_tournament_seasons_tournament
        FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_tournament_seasons_season
        FOREIGN KEY (season_id)     REFERENCES seasons (season_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE teams (
    team_id     SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)        NOT NULL,
    abbrev      VARCHAR(5)          DEFAULT NULL,
    nickname    VARCHAR(25)         DEFAULT NULL,
    gender      BIT(1)              DEFAULT NULL,    -- 0 = male, 1 = female
    member_id   SMALLINT UNSIGNED   NULL,
    PRIMARY KEY (team_id),
    UNIQUE KEY uq_teams_name_gender (name, gender),
    CONSTRAINT fk_teams_member
        FOREIGN KEY (member_id) REFERENCES members (member_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE team_seasons (
    team_id     SMALLINT UNSIGNED   NOT NULL,
    season_id   SMALLINT UNSIGNED   NOT NULL,
    coach       VARCHAR(25)         DEFAULT NULL,
    conference  VARCHAR(25)         DEFAULT NULL,
    active      BIT(1)              DEFAULT NULL,
    PRIMARY KEY (team_id, season_id),
    CONSTRAINT fk_ts_team
        FOREIGN KEY (team_id)   REFERENCES teams (team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ts_season
        FOREIGN KEY (season_id) REFERENCES seasons (season_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE players (
    player_id   INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    first_name  VARCHAR(50)         NOT NULL,
    last_name   VARCHAR(50)         NOT NULL,
    notes       VARCHAR(255)        NULL,
    position    VARCHAR(10)         NULL,
    misc1       VARCHAR(30)         NULL,
    PRIMARY KEY (player_id),
    KEY idx_players_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tracks which number a player wore in a given season.
-- A player may wear #4 one year and #14 the next.
CREATE TABLE player_seasons (
    player_id       INT UNSIGNED        NOT NULL,
    season_id       SMALLINT UNSIGNED   NOT NULL,
    team_id         SMALLINT UNSIGNED   NOT NULL,
    jersey_number   TINYINT UNSIGNED    NOT NULL,
    height          VARCHAR(8)          NULL,
    `year`          VARCHAR(10)         NULL,
    PRIMARY KEY (player_id, season_id, team_id),
    KEY idx_player_seasons_season (season_id),
    KEY idx_player_seasons_team   (team_id),
    CONSTRAINT fk_ps_player
        FOREIGN KEY (player_id) REFERENCES players (player_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ps_season
        FOREIGN KEY (season_id) REFERENCES seasons (season_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ps_team
        FOREIGN KEY (team_id) REFERENCES teams (team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE competitions (
    competition_id  INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    season_id       SMALLINT UNSIGNED   NOT NULL,
    team_id         SMALLINT UNSIGNED   NOT NULL,
    start_time      DATETIME            NOT NULL,
    end_time        DATETIME            NULL,
    opponent_id     SMALLINT UNSIGNED   NOT NULL,
    comptype_id     TINYINT UNSIGNED    NULL,
    location        VARCHAR(25)         NULL,
    PRIMARY KEY (competition_id),
    KEY idx_competitions_season (season_id),
    KEY idx_competitions_team   (team_id),
    KEY idx_competitions_starttime (start_time),
    CONSTRAINT fk_competitions_season
        FOREIGN KEY (season_id)   REFERENCES seasons (season_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_competitions_team
        FOREIGN KEY (team_id)     REFERENCES teams (team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_competitions_opponent
        FOREIGN KEY (opponent_id) REFERENCES teams (team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    tournament_id   SMALLINT UNSIGNED   NULL,
    CONSTRAINT fk_competitions_comptype
        FOREIGN KEY (comptype_id)   REFERENCES comptypes (comptype_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_competitions_tournament
        FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE team_schedules (
    team_schedule_id    INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    team_id             SMALLINT UNSIGNED   NOT NULL,
    season_id           SMALLINT UNSIGNED   NOT NULL,
    competition_id      INT UNSIGNED        NOT NULL,
    PRIMARY KEY (team_schedule_id),
    UNIQUE KEY uq_team_schedules (team_id, season_id, competition_id),
    KEY idx_team_schedules_season      (season_id),
    KEY idx_team_schedules_competition (competition_id),
    CONSTRAINT fk_tsch_team
        FOREIGN KEY (team_id)        REFERENCES teams (team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tsch_season
        FOREIGN KEY (season_id)      REFERENCES seasons (season_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tsch_competition
        FOREIGN KEY (competition_id) REFERENCES competitions (competition_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE periods (
    period_id       INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    competition_id  INT UNSIGNED        NOT NULL,
    team_id         SMALLINT UNSIGNED   NOT NULL,
    period_num      SMALLINT UNSIGNED   NOT NULL,
    score           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    PRIMARY KEY (period_id),
    UNIQUE KEY uq_periods_comp_team_period (competition_id, team_id, period_num),
    KEY idx_periods_competition (competition_id),
    CONSTRAINT fk_periods_competition
        FOREIGN KEY (competition_id) REFERENCES competitions (competition_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_periods_team
        FOREIGN KEY (team_id) REFERENCES teams (team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE team_game_stats (
    stat_id        INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    competition_id INT UNSIGNED        NOT NULL,
    team_id        SMALLINT UNSIGNED   NOT NULL,
    period         TINYINT UNSIGNED    NOT NULL DEFAULT 1,
    oreb           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    dreb           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    reb            TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    `to`           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    PRIMARY KEY (stat_id),
    UNIQUE KEY uq_tgs (competition_id, team_id, period),
    CONSTRAINT fk_tgs_comp FOREIGN KEY (competition_id) REFERENCES competitions (competition_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tgs_team FOREIGN KEY (team_id) REFERENCES teams (team_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE boxscores (
    boxscore_id     INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    competition_id  INT UNSIGNED        NOT NULL,
    player_id       INT UNSIGNED        NOT NULL,
    period          TINYINT UNSIGNED    NOT NULL DEFAULT 0,  -- 1 = full game (dakstats PERIODNUM=1); 2+ = period number
    started         TINYINT UNSIGNED    NOT NULL DEFAULT 0,  -- 1 if player was on floor to start this period
    jersey_number   TINYINT UNSIGNED    NOT NULL,       -- number actually worn in this game
    min             SMALLINT UNSIGNED   NOT NULL DEFAULT 0,  -- stored as total seconds
    fgm             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    fga             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    tpm             TINYINT UNSIGNED    NOT NULL DEFAULT 0,   -- 3-pointers made
    tpa             TINYINT UNSIGNED    NOT NULL DEFAULT 0,   -- 3-pointers attempted
    ftm             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    fta             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    oreb            TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    dreb            TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    reb             TINYINT UNSIGNED    NOT NULL DEFAULT 0,   -- oreb + dreb
    ast             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    stl             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    blk             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    `to`            TINYINT UNSIGNED    NOT NULL DEFAULT 0,   -- backtick: TO is reserved
    pf              TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    pts             TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    PRIMARY KEY (boxscore_id),
    UNIQUE KEY uq_boxscores_game_player (competition_id, player_id, period),
    KEY idx_boxscores_player      (player_id),
    CONSTRAINT fk_boxscores_competition
        FOREIGN KEY (competition_id) REFERENCES competitions (competition_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_boxscores_player
        FOREIGN KEY (player_id) REFERENCES players (player_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
