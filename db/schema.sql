-- StatManager Basketball Database Schema
-- Compatible with MariaDB / MySQL

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS boxscores;
DROP TABLE IF EXISTS periods;
DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS player_seasons;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS team_seasons;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS leagues;

SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE leagues (
    id              SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100)        NOT NULL,
    contact_person  VARCHAR(100)        NULL,
    contact_phone   VARCHAR(25)         NULL,
    contact_email   VARCHAR(100)        NULL,
    website_url     VARCHAR(255)        NULL,
    founded_date    DATE                NULL,
    facebook        VARCHAR(100)        NULL,
    x_handle        VARCHAR(50)         NULL,
    instagram       VARCHAR(50)         NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_leagues_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE seasons (
    id          SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    league_id   SMALLINT UNSIGNED   NOT NULL,
    name        VARCHAR(10)         NOT NULL,           -- e.g. '2025-26'
    start_year  SMALLINT UNSIGNED   NOT NULL,
    end_year    SMALLINT UNSIGNED   NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_seasons_league_name (league_id, name),
    CONSTRAINT fk_seasons_league
        FOREIGN KEY (league_id) REFERENCES leagues (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE teams (
    id          SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)        NOT NULL,
    abbrev      VARCHAR(5)          DEFAULT NULL,
    nickname    VARCHAR(25)         DEFAULT NULL,
    gender      BIT(1)              DEFAULT NULL,    -- 0 = male, 1 = female
    PRIMARY KEY (id),
    UNIQUE KEY uq_teams_name_gender (name, gender)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE team_seasons (
    team_id     SMALLINT UNSIGNED   NOT NULL,
    season_id   SMALLINT UNSIGNED   NOT NULL,
    coach       VARCHAR(25)         DEFAULT NULL,
    active      BIT(1)              DEFAULT NULL,
    PRIMARY KEY (team_id, season_id),
    CONSTRAINT fk_ts_team
        FOREIGN KEY (team_id)   REFERENCES teams (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ts_season
        FOREIGN KEY (season_id) REFERENCES seasons (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE players (
    id          INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    first_name  VARCHAR(50)         NOT NULL,
    last_name   VARCHAR(50)         NOT NULL,
    notes       VARCHAR(255)        NULL,
    position    VARCHAR(10)         NULL,
    misc1       VARCHAR(30)         NULL,
    PRIMARY KEY (id),
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
        FOREIGN KEY (player_id) REFERENCES players (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ps_season
        FOREIGN KEY (season_id) REFERENCES seasons (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ps_team
        FOREIGN KEY (team_id) REFERENCES teams (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE competitions (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    season_id       SMALLINT UNSIGNED   NOT NULL,
    team_id         SMALLINT UNSIGNED   NOT NULL,
    game_date       DATE                NOT NULL,
    opponent_id     SMALLINT UNSIGNED   NOT NULL,
    location        VARCHAR(25)         NULL,
    PRIMARY KEY (id),
    KEY idx_competitions_season (season_id),
    KEY idx_competitions_team   (team_id),
    KEY idx_competitions_date   (game_date),
    CONSTRAINT fk_competitions_season
        FOREIGN KEY (season_id)   REFERENCES seasons (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_competitions_team
        FOREIGN KEY (team_id)     REFERENCES teams (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_competitions_opponent
        FOREIGN KEY (opponent_id) REFERENCES teams (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE periods (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    competition_id  INT UNSIGNED        NOT NULL,
    team_id         SMALLINT UNSIGNED   NOT NULL,
    period_num      SMALLINT UNSIGNED   NOT NULL,
    score           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_periods_comp_team_period (competition_id, team_id, period_num),
    KEY idx_periods_competition (competition_id),
    CONSTRAINT fk_periods_competition
        FOREIGN KEY (competition_id) REFERENCES competitions (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_periods_team
        FOREIGN KEY (team_id) REFERENCES teams (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE boxscores (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    competition_id  INT UNSIGNED        NOT NULL,
    player_id       INT UNSIGNED        NOT NULL,
    period          TINYINT UNSIGNED    NOT NULL DEFAULT 0,  -- 0 = full game; 1+ = period number
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
    PRIMARY KEY (id),
    UNIQUE KEY uq_boxscores_game_player (competition_id, player_id, period),
    KEY idx_boxscores_player      (player_id),
    CONSTRAINT fk_boxscores_competition
        FOREIGN KEY (competition_id) REFERENCES competitions (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_boxscores_player
        FOREIGN KEY (player_id) REFERENCES players (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
