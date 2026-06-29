const express = require('express');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH    = path.join(__dirname, 'statmanager.ini');
const XML_ARCHIVE_DIR = path.join(__dirname, 'xml-archives');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Session ───────────────────────────────────────────────────────────────────
function getOrCreateSessionSecret() {
  const cfg = readConfig();
  if (cfg.server?.session_secret) return cfg.server.session_secret;
  const secret = crypto.randomBytes(32).toString('hex');
  cfg.server = Object.assign({}, cfg.server, { session_secret: secret });
  try { writeConfig(cfg); } catch {}
  return secret;
}

app.use(session({
  secret: getOrCreateSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── Auth guard ────────────────────────────────────────────────────────────────
app.use('/api', (req, res, next) => {
  const p = req.path;
  if (p === '/version' || p.startsWith('/auth/') ||
      p.startsWith('/settings') || p === '/db/create' ||
      p.startsWith('/public/')) return next();
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── Startup migration ─────────────────────────────────────────────────────────
(async () => {
  const iconsDir  = path.join(__dirname, 'public', 'leagues', 'icons');
  const photosDir = path.join(__dirname, 'public', 'teams', 'photos');
  if (!fs.existsSync(iconsDir))  fs.mkdirSync(iconsDir,  { recursive: true });
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  if (!fs.existsSync(XML_ARCHIVE_DIR)) fs.mkdirSync(XML_ARCHIVE_DIR, { recursive: true });
  let conn;
  try {
    conn = await dbConnect();
  } catch {
    return; // DB not configured yet — migrations will run on next restart
  }
  const migrate = async (sql) => { try { await conn.execute(sql); } catch { /* already applied or unsupported */ } };
  try {
    await migrate(`ALTER TABLE leagues ADD COLUMN IF NOT EXISTS logo_path VARCHAR(255) NULL`);
    await migrate(`
      CREATE TABLE IF NOT EXISTS comptypes (
        comptype_id TINYINT UNSIGNED NOT NULL,
        comptype    VARCHAR(30)      NOT NULL,
        PRIMARY KEY (comptype_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`
      INSERT IGNORE INTO comptypes (comptype_id, comptype) VALUES
        (1, 'Pre-Season'), (2, 'Non-Conference'), (3, 'Conference'), (4, 'Post-Season')`);
    await migrate(`ALTER TABLE competitions ADD COLUMN IF NOT EXISTS comptype_id TINYINT UNSIGNED NULL`);
    await migrate(`
      ALTER TABLE competitions
        ADD CONSTRAINT IF NOT EXISTS fk_competitions_comptype
        FOREIGN KEY (comptype_id) REFERENCES comptypes (comptype_id)
        ON UPDATE CASCADE ON DELETE SET NULL`);
    await migrate(`
      CREATE TABLE IF NOT EXISTS tournaments (
        tournament_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name          VARCHAR(40)       NOT NULL,
        startdate     DATE              NULL,
        enddate       DATE              NULL,
        PRIMARY KEY (tournament_id),
        UNIQUE KEY uq_tournaments_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`
      CREATE TABLE IF NOT EXISTS tournament_seasons (
        tournament_id SMALLINT UNSIGNED NOT NULL,
        season_id     SMALLINT UNSIGNED NOT NULL,
        PRIMARY KEY (tournament_id, season_id),
        CONSTRAINT fk_tournament_seasons_tournament
          FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_tournament_seasons_season
          FOREIGN KEY (season_id)     REFERENCES seasons (season_id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`ALTER TABLE competitions ADD COLUMN IF NOT EXISTS tournament_id SMALLINT UNSIGNED NULL`);
    await migrate(`
      ALTER TABLE competitions
        ADD CONSTRAINT IF NOT EXISTS fk_competitions_tournament
        FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id)
        ON UPDATE CASCADE ON DELETE SET NULL`);
    await migrate(`ALTER TABLE leagues ADD COLUMN IF NOT EXISTS governing_org_id SMALLINT UNSIGNED NULL`);
    await migrate(`
      ALTER TABLE leagues
        ADD CONSTRAINT IF NOT EXISTS fk_leagues_governing_org
        FOREIGN KEY (governing_org_id) REFERENCES organizations (org_id)
        ON UPDATE CASCADE ON DELETE SET NULL`);
    await migrate(`
      CREATE TABLE IF NOT EXISTS team_game_stats (
        stat_id        INT UNSIGNED        NOT NULL AUTO_INCREMENT,
        competition_id INT UNSIGNED        NOT NULL,
        team_id        SMALLINT UNSIGNED   NOT NULL,
        period         TINYINT UNSIGNED    NOT NULL DEFAULT 1,
        oreb           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
        dreb           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
        reb            TINYINT UNSIGNED    NOT NULL DEFAULT 0,
        \`to\`           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
        PRIMARY KEY (stat_id),
        UNIQUE KEY uq_tgs (competition_id, team_id, period),
        CONSTRAINT fk_tgs_comp FOREIGN KEY (competition_id) REFERENCES competitions (competition_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_tgs_team FOREIGN KEY (team_id) REFERENCES teams (team_id)
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`
      CREATE TABLE IF NOT EXISTS app_users (
        user_id       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
        username      VARCHAR(64)   NOT NULL,
        password_hash VARCHAR(255)  NOT NULL,
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id),
        UNIQUE KEY uq_app_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`ALTER TABLE app_users
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(64)  NULL,
      ADD COLUMN IF NOT EXISTS last_name  VARCHAR(64)  NULL,
      ADD COLUMN IF NOT EXISTS email      VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS phone      VARCHAR(30)  NULL`);
    await migrate(`ALTER TABLE boxscores CHANGE COLUMN IF EXISTS pts tp  TINYINT UNSIGNED NOT NULL DEFAULT 0`);
    await migrate(`ALTER TABLE boxscores CHANGE COLUMN IF EXISTS tpm fgm3 TINYINT UNSIGNED NOT NULL DEFAULT 0`);
    await migrate(`ALTER TABLE boxscores CHANGE COLUMN IF EXISTS tpa fga3 TINYINT UNSIGNED NOT NULL DEFAULT 0`);
    await migrate(`ALTER TABLE boxscores ADD COLUMN IF NOT EXISTS tf TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER pf`);
    await migrate(`ALTER TABLE boxscores ADD COLUMN IF NOT EXISTS dq TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER tf`);
    await migrate(`RENAME TABLE plays TO playbyplay`);
    await migrate(`CREATE TABLE IF NOT EXISTS playbyplay (
      play_id        INT UNSIGNED      NOT NULL AUTO_INCREMENT,
      competition_id INT UNSIGNED      NOT NULL,
      period         TINYINT UNSIGNED  NOT NULL,
      clock          VARCHAR(8)        NOT NULL,
      team_id        SMALLINT UNSIGNED NULL,
      player_id      INT UNSIGNED      NULL,
      action         VARCHAR(12)       NOT NULL,
      play_type      VARCHAR(10)       NULL,
      is_paint       TINYINT(1)        NOT NULL DEFAULT 0,
      home_score     SMALLINT UNSIGNED NULL,
      visitor_score  SMALLINT UNSIGNED NULL,
      wall_clock     DATETIME          NULL,
      x              SMALLINT          NULL,
      y              SMALLINT          NULL,
      seq            SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (play_id),
      KEY idx_playbyplay_comp_seq (competition_id, period, seq),
      KEY idx_playbyplay_player   (player_id),
      CONSTRAINT fk_playbyplay_comp   FOREIGN KEY (competition_id) REFERENCES competitions (competition_id) ON DELETE CASCADE,
      CONSTRAINT fk_playbyplay_team   FOREIGN KEY (team_id)   REFERENCES teams (team_id),
      CONSTRAINT fk_playbyplay_player FOREIGN KEY (player_id) REFERENCES players (player_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS external_code VARCHAR(20) NULL`);
    await migrate(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS photo_path    VARCHAR(255) NULL`);
    await migrate(`ALTER TABLE team_seasons ADD COLUMN IF NOT EXISTS photo_path VARCHAR(255) NULL`);
    await migrate(`ALTER TABLE xml_uploads
      ADD COLUMN IF NOT EXISTS uploaded_by_username VARCHAR(64)  NULL,
      ADD COLUMN IF NOT EXISTS uploaded_by_name     VARCHAR(130) NULL`);
    await migrate(`CREATE TABLE IF NOT EXISTS xml_uploads (
      upload_id         INT UNSIGNED         NOT NULL AUTO_INCREMENT,
      competition_id    INT UNSIGNED         NULL,
      uploaded_at       DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source            VARCHAR(20)          NOT NULL,
      original_filename VARCHAR(255)         NOT NULL,
      archive_path      VARCHAR(500)         NOT NULL,
      home_name         VARCHAR(100)         NOT NULL,
      visitor_name      VARCHAR(100)         NOT NULL,
      game_date         DATE                 NOT NULL,
      vh                ENUM('H','V','both') NOT NULL DEFAULT 'both',
      status            ENUM('pending','partial','complete','discrepancy') NOT NULL DEFAULT 'pending',
      discrepancies     TEXT                 NULL,
      PRIMARY KEY (upload_id),
      KEY idx_uploads_competition (competition_id),
      KEY idx_uploads_date (game_date),
      CONSTRAINT fk_uploads_competition
        FOREIGN KEY (competition_id) REFERENCES competitions (competition_id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await migrate(`CREATE TABLE IF NOT EXISTS api_tokens (
      token_id     INT UNSIGNED         NOT NULL AUTO_INCREMENT,
      token_hash   VARCHAR(64)          NOT NULL,
      label        VARCHAR(100)         NOT NULL,
      scope        ENUM('read','admin') NOT NULL DEFAULT 'read',
      created_at   DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME             NULL,
      PRIMARY KEY (token_id),
      UNIQUE KEY ux_token_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } finally {
    await conn.end().catch(() => {});
  }
})();

const { version } = require('./package.json');
app.get('/api/version', (_req, res) => res.json({ version }));

// ── Auth routes ───────────────────────────────────────────────────────────────
app.get('/api/auth/me', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [[{ cnt }]] = await conn.execute('SELECT COUNT(*) AS cnt FROM app_users');
    if (!cnt) return res.json({ status: 'setup' });
    if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user_id: req.session.userId, username: req.session.username });
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') return res.json({ status: 'no_db' });
    res.json({ status: 'no_db' });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/auth/setup', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) return res.status(400).json({ error: 'Username and password required' });
  let conn;
  try {
    conn = await dbConnect();
    const [[{ cnt }]] = await conn.execute('SELECT COUNT(*) AS cnt FROM app_users');
    if (cnt > 0) return res.status(400).json({ error: 'Setup already complete' });
    const hash = await bcrypt.hash(password, 12);
    const user = username.trim().toLowerCase();
    const [result] = await conn.execute(
      'INSERT INTO app_users (username, password_hash) VALUES (?, ?)', [user, hash]
    );
    req.session.userId   = result.insertId;
    req.session.username = user;
    res.json({ success: true, user_id: result.insertId, username: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  let conn;
  try {
    conn = await dbConnect();
    const [[user]] = await conn.execute(
      'SELECT user_id, username, password_hash, first_name, last_name FROM app_users WHERE username = ?',
      [username.trim().toLowerCase()]
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid username or password' });
    req.session.userId      = user.user_id;
    req.session.username    = user.username;
    req.session.displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
    res.json({ user_id: user.user_id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ── Users CRUD ────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(
      'SELECT user_id, username, first_name, last_name, email, phone, created_at FROM app_users ORDER BY username'
    );
    res.json({ users: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) return res.status(400).json({ error: 'Username and password required' });
  let conn;
  try {
    conn = await dbConnect();
    const hash = await bcrypt.hash(password, 12);
    const [result] = await conn.execute(
      'INSERT INTO app_users (username, password_hash) VALUES (?, ?)',
      [username.trim().toLowerCase(), hash]
    );
    res.json({ success: true, user_id: result.insertId });
  } catch (err) {
    if (err.errno === 1062) return res.json({ error: 'Username already taken' });
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.session.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { current_password, new_password } = req.body;
  if (!new_password) return res.status(400).json({ error: 'New password required' });
  let conn;
  try {
    conn = await dbConnect();
    const [[user]] = await conn.execute(
      'SELECT password_hash FROM app_users WHERE user_id = ?', [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(current_password || '', user.password_hash)))
      return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await conn.execute('UPDATE app_users SET password_hash = ? WHERE user_id = ?', [hash, userId]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/users/:id/profile', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.session.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { first_name, last_name, email, phone } = req.body;
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute(
      'UPDATE app_users SET first_name=?, last_name=?, email=?, phone=? WHERE user_id=?',
      [first_name?.trim() || null, last_name?.trim() || null,
       email?.trim() || null, phone?.trim() || null, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.session.userId === userId) return res.status(400).json({ error: 'Cannot delete your own account' });
  let conn;
  try {
    conn = await dbConnect();
    const [[{ cnt }]] = await conn.execute('SELECT COUNT(*) AS cnt FROM app_users');
    if (cnt <= 1) return res.status(400).json({ error: 'Cannot delete the last user account' });
    await conn.execute('DELETE FROM app_users WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return ini.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, ini.stringify(config), 'utf-8');
}

// Returns DB config from env vars (container) or ini file (local dev).
function getServerConfig() {
  const config = readConfig();
  return config.server || {};
}

function getDbConfig() {
  if (process.env.DB_HOST) {
    return {
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT     || '3306',
      name:     process.env.DB_NAME     || '',
      user:     process.env.DB_USER     || '',
      password: process.env.DB_PASSWORD || '',
      ssl:      process.env.DB_SSL === 'true'
    };
  }
  const config = readConfig();
  return config.database || {};
}

app.get('/api/settings', (req, res) => {
  const db = getDbConfig();
  const srv = getServerConfig();
  res.json({
    database: {
      host:        db.host     || 'localhost',
      port:        parseInt(db.port) || 3306,
      name:        db.name     || '',
      user:        db.user     || '',
      passwordSet: !!db.password
    },
    server: {
      base_url: srv.base_url || ''
    },
    envConfigured: !!process.env.DB_HOST
  });
});

app.post('/api/settings', (req, res) => {
  const { database, server } = req.body;
  if (!database) return res.status(400).json({ error: 'Invalid request' });

  const config = readConfig();
  const existing = config.database || {};

  config.database = {
    host: database.host || 'localhost',
    port: parseInt(database.port) || 3306,
    name: database.name || '',
    user: database.user || '',
    password: database.password !== '' ? database.password : (existing.password || '')
  };

  if (server !== undefined) {
    config.server = { base_url: (server.base_url || '').trim() };
  }

  try {
    writeConfig(config);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write settings file' });
  }
});

app.post('/api/settings/test', async (req, res) => {
  const { database } = req.body;
  const stored = getDbConfig();

  const connConfig = {
    host:     database?.host     || stored.host     || 'localhost',
    port:     parseInt(database?.port || stored.port) || 3306,
    database: database?.name     || stored.name     || undefined,
    user:     database?.user     || stored.user     || '',
    password: database?.password || stored.password || '',
    connectTimeout: 5000,
    ...(stored.ssl ? { ssl: {} } : {})
  };

  if (!connConfig.user) {
    return res.json({ success: false, error: 'Username is required' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(connConfig);
    const [[row]] = await conn.execute('SELECT VERSION() AS version');
    res.json({ success: true, version: row.version });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/summary', async (req, res) => {
  const db = getDbConfig();

  if (!db.host || !db.user) {
    return res.json({ configured: false });
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: db.host,
      port: parseInt(db.port) || 3306,
      database: db.name || undefined,
      user: db.user,
      password: db.password || '',
      connectTimeout: 5000,
      ...(db.ssl ? { ssl: {} } : {})
    });
    const [[row]] = await conn.execute(`
      SELECT
        (SELECT COUNT(*) FROM leagues)      AS leagues,
        (SELECT COUNT(*) FROM seasons)      AS seasons,
        (SELECT COUNT(*) FROM teams)        AS teams,
        (SELECT COUNT(*) FROM competitions) AS competitions,
        (SELECT COUNT(DISTINCT competition_id) FROM boxscores) AS boxscores,
        (SELECT COUNT(*) FROM members WHERE type = 'school') AS schools,
        (SELECT COUNT(*) FROM players)      AS players
    `);
    res.json({ configured: true, ...row });
  } catch (err) {
    res.json({ configured: true, error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/db/create', async (req, res) => {
  const db = getDbConfig();

  if (!db.host || !db.user || !db.name) {
    return res.json({ success: false, error: 'Database connection is not fully configured' });
  }

  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    return res.json({ success: false, error: 'Schema file not found' });
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: db.host,
      port: parseInt(db.port) || 3306,
      user: db.user,
      password: db.password || '',
      connectTimeout: 5000,
      multipleStatements: true,
      ...(db.ssl ? { ssl: {} } : {})
    });
    const safeName = db.name.replace(/`/g, '');
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${safeName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${safeName}\``);
    await conn.query(schema);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── DB helper ─────────────────────────────────────────────────────────────────
async function dbConnect() {
  const db = getDbConfig();
  if (!db.host || !db.user || !db.name) {
    throw Object.assign(new Error('Database not configured'), { code: 'NOT_CONFIGURED' });
  }
  const connConfig = {
    host: db.host,
    port: parseInt(db.port) || 3306,
    database: db.name,
    user: db.user,
    password: db.password || '',
    connectTimeout: 5000,
    dateStrings: true
  };
  if (db.ssl) connConfig.ssl = {};
  return mysql.createConnection(connConfig);
}

// ── API token middleware ───────────────────────────────────────────────────────
async function requireReadToken(req, res, next) {
  const raw = req.headers['x-api-key'];
  if (!raw) return res.status(401).json({ error: 'missing token' });
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(
      'SELECT token_id, scope FROM api_tokens WHERE token_hash = ?', [hash]
    );
    if (!rows.length) return res.status(401).json({ error: 'invalid token' });
    if (rows[0].scope !== 'read' && rows[0].scope !== 'admin')
      return res.status(403).json({ error: 'insufficient scope' });
    // fire-and-forget last_used_at update
    conn.execute('UPDATE api_tokens SET last_used_at = NOW() WHERE token_id = ?', [rows[0].token_id])
      .catch(() => {});
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
}

// ── Token management routes ────────────────────────────────────────────────────
app.get('/api/tokens', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(
      'SELECT token_id, label, scope, created_at, last_used_at FROM api_tokens ORDER BY created_at DESC'
    );
    res.json({ tokens: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/tokens', async (req, res) => {
  const { label, scope } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'Label is required' });
  const validScopes = ['read', 'admin'];
  if (!validScopes.includes(scope)) return res.status(400).json({ error: 'Invalid scope' });
  const raw  = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO api_tokens (token_hash, label, scope) VALUES (?, ?, ?)',
      [hash, label.trim(), scope]
    );
    res.json({ token_id: result.insertId, token: raw });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/tokens/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('DELETE FROM api_tokens WHERE token_id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── Leagues CRUD ──────────────────────────────────────────────────────────────
app.get('/api/leagues', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT
        l.*,
        o.name     AS org_name,
        o.acronym  AS org_acronym,
        (SELECT COUNT(*)
           FROM seasons s
          WHERE s.league_id = l.league_id)                                                   AS season_count,
        (SELECT COUNT(DISTINCT ts.team_id)
           FROM team_seasons ts JOIN seasons s ON ts.season_id = s.season_id
          WHERE s.league_id = l.league_id)                                                   AS team_count,
        (SELECT COUNT(*)
           FROM competitions c JOIN seasons s ON c.season_id = s.season_id
          WHERE s.league_id = l.league_id)                                                   AS competition_count,
        (SELECT COUNT(DISTINCT ps.player_id)
           FROM player_seasons ps JOIN seasons s ON ps.season_id = s.season_id
          WHERE s.league_id = l.league_id)                                                   AS player_count,
        (SELECT COUNT(DISTINCT b.competition_id)
           FROM boxscores b
           JOIN competitions c ON b.competition_id = c.competition_id
           JOIN seasons s      ON c.season_id = s.season_id
          WHERE s.league_id = l.league_id)                                                   AS boxscore_count
      FROM leagues l
      LEFT JOIN organizations o ON o.org_id = l.governing_org_id
      ORDER BY o.name, l.name
    `);
    res.json({ leagues: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

const ICON_EXTS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

app.post('/api/leagues/:id/icon', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'No image data provided' });

  const match = data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s);
  if (!match) return res.status(400).json({ error: 'Invalid image data format' });
  const [, mime, b64] = match;
  const ext = ICON_EXTS[mime];
  if (!ext) return res.status(400).json({ error: 'Unsupported type. Use PNG, JPG, GIF, WebP, or SVG.' });
  if (b64.length > 1_400_000) return res.status(400).json({ error: 'Image too large (max ~1 MB)' });

  const iconsDir = path.join(__dirname, 'public', 'leagues', 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  for (const f of fs.readdirSync(iconsDir)) {
    if (f.startsWith(`${id}.`)) fs.unlinkSync(path.join(iconsDir, f));
  }

  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(iconsDir, filename), Buffer.from(b64, 'base64'));
  const logoPath = `leagues/icons/${filename}`;

  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('UPDATE leagues SET logo_path = ? WHERE league_id = ?', [logoPath, id]);
    res.json({ success: true, logo_path: logoPath });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/leagues/:id/icon', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    const [[row]] = await conn.execute('SELECT logo_path FROM leagues WHERE league_id = ?', [id]);
    if (row?.logo_path) {
      const fp = path.join(__dirname, 'public', row.logo_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await conn.execute('UPDATE leagues SET logo_path = NULL WHERE league_id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/leagues/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    const [[league]] = await conn.execute(`
      SELECT l.*,
        o.acronym AS org_acronym,
        o.name    AS org_name,
        (SELECT COUNT(*) FROM seasons s WHERE s.league_id = l.league_id)                                                                AS season_count,
        (SELECT COUNT(DISTINCT ts.team_id) FROM team_seasons ts JOIN seasons s ON ts.season_id = s.season_id WHERE s.league_id = l.league_id)  AS team_count,
        (SELECT COUNT(DISTINCT tsch.competition_id) FROM team_schedules tsch JOIN seasons s ON tsch.season_id = s.season_id WHERE s.league_id = l.league_id) AS competition_count,
        (SELECT COUNT(DISTINCT ps.player_id) FROM player_seasons ps JOIN seasons s ON ps.season_id = s.season_id WHERE s.league_id = l.league_id) AS player_count,
        (SELECT COUNT(DISTINCT b.competition_id)
           FROM boxscores b JOIN team_schedules tsch ON tsch.competition_id = b.competition_id JOIN seasons s ON tsch.season_id = s.season_id
          WHERE s.league_id = l.league_id)                                                                                              AS boxscore_count
      FROM leagues l
      LEFT JOIN organizations o ON o.org_id = l.governing_org_id
      WHERE l.league_id = ?
    `, [id]);
    if (!league) return res.status(404).json({ error: 'League not found' });

    const [seasons] = await conn.execute(`
      SELECT s.season_id, s.name,
        CONCAT(YEAR(s.start_date), '-', YEAR(s.end_date)) AS label,
        (SELECT COUNT(DISTINCT ts.team_id) FROM team_seasons ts WHERE ts.season_id = s.season_id)                             AS team_count,
        (SELECT COUNT(DISTINCT tsch.competition_id) FROM team_schedules tsch WHERE tsch.season_id = s.season_id)              AS game_count,
        (SELECT COUNT(DISTINCT ps.player_id) FROM player_seasons ps WHERE ps.season_id = s.season_id)                        AS player_count,
        (SELECT COUNT(DISTINCT b.competition_id) FROM boxscores b JOIN team_schedules tsch ON tsch.competition_id = b.competition_id WHERE tsch.season_id = s.season_id) AS boxscore_count
      FROM seasons s
      WHERE s.league_id = ?
      ORDER BY s.start_date DESC, s.name
    `, [id]);

    const [[prevRow]] = await conn.execute(
      `SELECT league_id FROM leagues WHERE name < ? ORDER BY name DESC LIMIT 1`,
      [league.name]
    );
    const [[nextRow]] = await conn.execute(
      `SELECT league_id FROM leagues WHERE name > ? ORDER BY name ASC LIMIT 1`,
      [league.name]
    );

    res.json({ league, seasons, prevLeagueId: prevRow?.league_id ?? null, nextLeagueId: nextRow?.league_id ?? null });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/leagues', async (req, res) => {
  const { name, contact_person, contact_phone, contact_email, website_url, founded_date, facebook, x_handle, instagram } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      `INSERT INTO leagues (name, contact_person, contact_phone, contact_email, website_url, founded_date, facebook, x_handle, instagram)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), contact_person || null, contact_phone || null, contact_email || null,
       website_url || null, founded_date || null, facebook || null, x_handle || null, instagram || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/leagues/:id', async (req, res) => {
  const { name, contact_person, contact_phone, contact_email, website_url, founded_date, facebook, x_handle, instagram } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      `UPDATE leagues
       SET name=?, contact_person=?, contact_phone=?, contact_email=?,
           website_url=?, founded_date=?, facebook=?, x_handle=?, instagram=?
       WHERE league_id=?`,
      [name.trim(), contact_person || null, contact_phone || null, contact_email || null,
       website_url || null, founded_date || null, facebook || null, x_handle || null, instagram || null,
       parseInt(req.params.id)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'League not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/leagues/:id', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute('DELETE FROM leagues WHERE league_id=?', [parseInt(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'League not found' });
    res.json({ success: true });
  } catch (err) {
    if (err.errno === 1451)
      return res.json({ error: 'This league has seasons. Remove all seasons before deleting the league.' });
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/leagues/merge', async (req, res) => {
  const { masterId, sourceIds } = req.body;
  if (!masterId || !Array.isArray(sourceIds) || !sourceIds.length)
    return res.status(400).json({ error: 'masterId and sourceIds are required' });
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('START TRANSACTION');

    for (const srcId of sourceIds) {
      const id = parseInt(srcId);

      await conn.execute('UPDATE seasons SET league_id = ? WHERE league_id = ?', [masterId, id]);

      // Safety check — all seasons must be migrated before deleting
      const [[{ remaining }]] = await conn.execute(
        'SELECT COUNT(*) AS remaining FROM seasons WHERE league_id = ?', [id]
      );
      if (remaining)
        throw new Error(`League #${id} still has ${remaining} season(s) that could not be migrated`);

      const [[src]] = await conn.execute(
        'SELECT contact_person, contact_phone, contact_email, website_url, founded_date, facebook, x_handle, instagram FROM leagues WHERE league_id = ?',
        [id]
      );
      if (src) {
        await conn.execute(
          `UPDATE leagues SET
             contact_person = COALESCE(contact_person, ?),
             contact_phone  = COALESCE(contact_phone,  ?),
             contact_email  = COALESCE(contact_email,  ?),
             website_url    = COALESCE(website_url,    ?),
             founded_date   = COALESCE(founded_date,   ?),
             facebook       = COALESCE(facebook,       ?),
             x_handle       = COALESCE(x_handle,       ?),
             instagram      = COALESCE(instagram,      ?)
           WHERE league_id = ?`,
          [src.contact_person, src.contact_phone, src.contact_email, src.website_url,
           src.founded_date, src.facebook, src.x_handle, src.instagram, masterId]
        );
      }

      const [delResult] = await conn.execute('DELETE FROM leagues WHERE league_id = ?', [id]);
      if (delResult.affectedRows === 0)
        throw new Error(`League #${id} could not be deleted — it may no longer exist`);
    }

    await conn.execute('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await conn?.execute('ROLLBACK').catch(() => {});
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── Seasons CRUD ─────────────────────────────────────────────────────────────
app.get('/api/seasons', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT s.*, l.name AS league_name,
        CONCAT(YEAR(s.start_date), '-', YEAR(s.end_date)) AS label,
        (SELECT COUNT(*)
           FROM team_seasons ts WHERE ts.season_id = s.season_id)                       AS team_count,
        (SELECT COUNT(*)
           FROM competitions c WHERE c.season_id = s.season_id)                          AS game_count,
        (SELECT COUNT(DISTINCT ps.player_id)
           FROM player_seasons ps WHERE ps.season_id = s.season_id)                      AS player_count,
        (SELECT COUNT(DISTINCT b.competition_id)
           FROM boxscores b JOIN competitions c ON b.competition_id = c.competition_id
          WHERE c.season_id = s.season_id)                                               AS boxscore_count
      FROM seasons s JOIN leagues l ON s.league_id = l.league_id
      ORDER BY l.name, s.start_date DESC, s.name
    `);
    res.json({ seasons: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/seasons/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    const [[season]] = await conn.execute(`
      SELECT s.*, l.name AS league_name,
        CONCAT(YEAR(s.start_date), '-', YEAR(s.end_date)) AS label,
        (SELECT COUNT(DISTINCT tsch.competition_id) FROM team_schedules tsch WHERE tsch.season_id = s.season_id)              AS game_count,
        (SELECT COUNT(DISTINCT b.competition_id)
           FROM boxscores b JOIN team_schedules tsch ON tsch.competition_id = b.competition_id WHERE tsch.season_id = s.season_id)  AS boxscore_count,
        (SELECT COUNT(DISTINCT ts.team_id) FROM team_seasons ts WHERE ts.season_id = s.season_id)                              AS team_count,
        (SELECT COUNT(DISTINCT ps.player_id) FROM player_seasons ps WHERE ps.season_id = s.season_id)                         AS player_count
      FROM seasons s JOIN leagues l ON l.league_id = s.league_id
      WHERE s.season_id = ?
    `, [id]);
    if (!season) return res.status(404).json({ error: 'Season not found' });

    const [leagueTeams] = await conn.execute(`
      SELECT t.team_id, t.name, l.name AS league_name, ts.coach, ts.conference, 0 AS is_guest,
        (SELECT COUNT(DISTINCT tsch2.competition_id) FROM team_schedules tsch2
         WHERE tsch2.season_id = ? AND tsch2.team_id = t.team_id) AS game_count
      FROM team_seasons ts
      JOIN teams   t  ON t.team_id  = ts.team_id
      JOIN seasons sn ON sn.season_id = ts.season_id
      JOIN leagues l  ON l.league_id  = sn.league_id
      WHERE ts.season_id = ?
      ORDER BY t.name
    `, [id, id]);

    const [guestTeams] = await conn.execute(`
      SELECT t.team_id, t.name,
        (SELECT l2.name
         FROM team_schedules tg
         JOIN seasons sg ON sg.season_id = tg.season_id
         JOIN leagues l2 ON l2.league_id = sg.league_id
         WHERE tg.team_id = t.team_id
           AND tg.competition_id IN (SELECT competition_id FROM team_schedules WHERE season_id = ?)
         LIMIT 1) AS league_name,
        NULL AS coach, NULL AS conference, 1 AS is_guest,
        (SELECT COUNT(DISTINCT c.competition_id)
         FROM competitions c
         JOIN team_schedules tsch ON tsch.competition_id = c.competition_id AND tsch.season_id = ?
         WHERE c.team_id = t.team_id OR c.opponent_id = t.team_id) AS game_count
      FROM teams t
      WHERE NOT EXISTS (SELECT 1 FROM team_seasons WHERE team_id = t.team_id AND season_id = ?)
        AND EXISTS (
          SELECT 1 FROM competitions c
          JOIN team_schedules tsch ON tsch.competition_id = c.competition_id AND tsch.season_id = ?
          WHERE c.team_id = t.team_id OR c.opponent_id = t.team_id
        )
      ORDER BY t.name
    `, [id, id, id, id]);

    const teams = [...leagueTeams, ...guestTeams]
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const [tournaments] = await conn.execute(`
      SELECT trn.tournament_id, trn.name, ts.startdate, ts.enddate
      FROM tournament_seasons ts
      JOIN tournaments trn ON trn.tournament_id = ts.tournament_id
      WHERE ts.season_id = ?
      ORDER BY ts.startdate, trn.name
    `, [id]);

    const [games] = await conn.execute(`
      SELECT DISTINCT c.competition_id, c.start_time, c.location, c.team_id, c.opponent_id,
             ct.comptype, trn.name AS tournament_name,
             ts.score AS team_score, os.score AS opponent_score,
             tm.name  AS team_name,     tm.abbrev AS team_abbrev,
             opp.name AS opponent_name, opp.abbrev AS opponent_abbrev,
             EXISTS (SELECT 1 FROM boxscores b WHERE b.competition_id = c.competition_id) AS has_boxscore
      FROM competitions c
      JOIN team_schedules tsch ON tsch.competition_id = c.competition_id AND tsch.season_id = ?
      JOIN teams tm    ON c.team_id     = tm.team_id
      JOIN teams opp   ON c.opponent_id = opp.team_id
      LEFT JOIN comptypes  ct  ON ct.comptype_id = c.comptype_id
      LEFT JOIN tournaments trn ON trn.tournament_id = c.tournament_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) ts
             ON ts.competition_id = c.competition_id AND ts.team_id = c.team_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) os
             ON os.competition_id = c.competition_id AND os.team_id = c.opponent_id
      ORDER BY c.start_time ASC
    `, [id]);

    const [[prevRow]] = await conn.execute(
      `SELECT season_id FROM seasons WHERE league_id = ? AND start_date < ? ORDER BY start_date DESC LIMIT 1`,
      [season.league_id, season.start_date]
    );
    const [[nextRow]] = await conn.execute(
      `SELECT season_id FROM seasons WHERE league_id = ? AND start_date > ? ORDER BY start_date ASC LIMIT 1`,
      [season.league_id, season.start_date]
    );

    res.json({ season, games, teams, tournaments, prevSeasonId: prevRow?.season_id ?? null, nextSeasonId: nextRow?.season_id ?? null });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/seasons', async (req, res) => {
  const { league_id, name, start_date, end_date } = req.body;
  if (!league_id || !name?.trim() || !start_date || !end_date)
    return res.status(400).json({ error: 'League, name, start date and end date are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO seasons (league_id, name, start_date, end_date) VALUES (?, ?, ?, ?)',
      [parseInt(league_id), name.trim(), start_date, end_date]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/seasons/:id', async (req, res) => {
  const { league_id, name, start_date, end_date } = req.body;
  if (!league_id || !name?.trim() || !start_date || !end_date)
    return res.status(400).json({ error: 'League, name, start date and end date are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'UPDATE seasons SET league_id=?, name=?, start_date=?, end_date=? WHERE season_id=?',
      [parseInt(league_id), name.trim(), start_date, end_date, parseInt(req.params.id)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Season not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/seasons/:id', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute('DELETE FROM seasons WHERE season_id=?', [parseInt(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Season not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/seasons/merge', async (req, res) => {
  const { masterId, sourceIds } = req.body;
  if (!masterId || !Array.isArray(sourceIds) || !sourceIds.length)
    return res.status(400).json({ error: 'masterId and sourceIds are required' });
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('START TRANSACTION');

    for (const srcId of sourceIds) {
      // team_seasons: drop duplicates (JOIN avoids the self-reference limitation) then move the rest
      await conn.execute(
        `DELETE ts FROM team_seasons ts
         INNER JOIN team_seasons ts2 ON ts2.season_id = ? AND ts2.team_id = ts.team_id
         WHERE ts.season_id = ?`,
        [masterId, srcId]
      );
      await conn.execute('UPDATE team_seasons SET season_id = ? WHERE season_id = ?', [masterId, srcId]);

      // competitions: move all
      await conn.execute('UPDATE competitions SET season_id = ? WHERE season_id = ?', [masterId, srcId]);

      // player_seasons: drop duplicates then move the rest
      await conn.execute(
        `DELETE ps FROM player_seasons ps
         INNER JOIN player_seasons ps2 ON ps2.season_id = ? AND ps2.player_id = ps.player_id
         WHERE ps.season_id = ?`,
        [masterId, srcId]
      );
      await conn.execute('UPDATE player_seasons SET season_id = ? WHERE season_id = ?', [masterId, srcId]);

      await conn.execute('DELETE FROM seasons WHERE season_id = ?', [srcId]);
    }

    await conn.execute('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await conn?.execute('ROLLBACK').catch(() => {});
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── Teams CRUD ────────────────────────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT t.team_id, t.name, t.abbrev, t.nickname,
             t.gender + 0 AS gender, t.external_code, t.photo_path,
             l.league_id  AS league_id,
             l.name AS league_name,
             (SELECT ts_r.coach
                FROM team_seasons ts_r
                JOIN seasons s_r ON ts_r.season_id = s_r.season_id
               WHERE ts_r.team_id = t.team_id AND s_r.league_id = l.league_id
               ORDER BY s_r.start_date DESC LIMIT 1) AS coach,
             COUNT(DISTINCT ts.season_id) AS season_count,
             (SELECT COUNT(DISTINCT tsch.competition_id)
                FROM team_schedules tsch
                JOIN seasons sc ON sc.season_id = tsch.season_id
               WHERE tsch.team_id = t.team_id
                 AND sc.league_id = l.league_id) AS game_count,
             GROUP_CONCAT(DISTINCT ts.season_id ORDER BY ts.season_id) AS season_ids
      FROM teams t
      JOIN team_seasons ts ON ts.team_id  = t.team_id
      JOIN seasons      s  ON ts.season_id = s.season_id
      JOIN leagues      l  ON s.league_id  = l.league_id
      GROUP BY t.team_id, l.league_id
      UNION ALL
      SELECT t.team_id, t.name, t.abbrev, t.nickname,
             t.gender + 0 AS gender, t.external_code, t.photo_path,
             NULL, NULL, NULL, 0, 0, NULL
      FROM teams t
      WHERE NOT EXISTS (SELECT 1 FROM team_seasons ts WHERE ts.team_id = t.team_id)
      ORDER BY name, league_name
    `);
    res.json({ teams: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/teams', async (req, res) => {
  const { name, abbrev, nickname, gender } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const toBit = v => (v === '' || v == null) ? null : parseInt(v);
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO teams (name, abbrev, nickname, gender) VALUES (?, ?, ?, ?)',
      [name.trim(), abbrev || null, nickname || null, toBit(gender)]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/teams/merge', async (req, res) => {
  const { masterId, sourceIds } = req.body;
  if (!masterId || !Array.isArray(sourceIds) || !sourceIds.length)
    return res.status(400).json({ error: 'masterId and sourceIds are required' });
  if (sourceIds.includes(masterId))
    return res.status(400).json({ error: 'Cannot merge a team with itself' });

  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('START TRANSACTION');

    for (const srcId of sourceIds) {
      const id = parseInt(srcId);

      // ── Season-aware home-game migration ──────────────────────────────
      // For each season the source appears in as home team, check whether
      // the master already has a season with the same name.  If so, move
      // the competitions to that master season (keeps league grouping
      // correct).  If not, create a team_seasons entry for the master in
      // the source's season so the games are still reachable.
      const [srcHomeSeasons] = await conn.execute(`
        SELECT DISTINCT c.season_id, s.name
        FROM   competitions c
        JOIN   seasons s ON c.season_id = s.season_id
        WHERE  c.team_id = ?
      `, [id]);

      for (const { season_id: srcSeasonId, name: seasonName } of srcHomeSeasons) {
        const [[masterSeason]] = await conn.execute(`
          SELECT s.season_id
          FROM   team_seasons ts
          JOIN   seasons s ON ts.season_id = s.season_id
          WHERE  ts.team_id = ? AND s.name = ?
          LIMIT  1
        `, [masterId, seasonName]);

        if (masterSeason) {
          await conn.execute(
            'UPDATE competitions SET season_id = ? WHERE team_id = ? AND season_id = ?',
            [masterSeason.season_id, id, srcSeasonId]
          );
        } else {
          const [[{ has }]] = await conn.execute(
            'SELECT COUNT(*) AS has FROM team_seasons WHERE team_id = ? AND season_id = ?',
            [masterId, srcSeasonId]
          );
          if (!has) {
            const [[srcTs]] = await conn.execute(
              'SELECT coach, active FROM team_seasons WHERE team_id = ? AND season_id = ?',
              [id, srcSeasonId]
            );
            await conn.execute(
              'INSERT INTO team_seasons (team_id, season_id, coach, active) VALUES (?, ?, ?, ?)',
              [masterId, srcSeasonId, srcTs?.coach ?? null, srcTs?.active ?? null]
            );
          }
        }
      }

      // ── Migrate competitions ───────────────────────────────────────────
      await conn.execute('UPDATE competitions SET team_id     = ? WHERE team_id     = ?', [masterId, id]);
      await conn.execute('UPDATE competitions SET opponent_id = ? WHERE opponent_id = ?', [masterId, id]);

      // ── Migrate periods ────────────────────────────────────────────────
      await conn.execute('UPDATE periods SET team_id = ? WHERE team_id = ?', [masterId, id]);

      // ── Migrate play-by-play ───────────────────────────────────────────
      await conn.execute('UPDATE playbyplay SET team_id = ? WHERE team_id = ?', [masterId, id]);

      // ── Migrate team_game_stats ────────────────────────────────────────
      await conn.execute(
        `DELETE tgs FROM team_game_stats tgs
         INNER JOIN team_game_stats tgs2
                 ON tgs2.team_id        = ?
                AND tgs2.competition_id = tgs.competition_id
                AND tgs2.period         = tgs.period
         WHERE tgs.team_id = ?`,
        [masterId, id]
      );
      await conn.execute('UPDATE team_game_stats SET team_id = ? WHERE team_id = ?', [masterId, id]);

      // ── Migrate team_schedules ─────────────────────────────────────────
      await conn.execute(
        `DELETE tsch FROM team_schedules tsch
         INNER JOIN team_schedules tsch2
                 ON tsch2.team_id        = ?
                AND tsch2.season_id      = tsch.season_id
                AND tsch2.competition_id = tsch.competition_id
         WHERE tsch.team_id = ?`,
        [masterId, id]
      );
      await conn.execute('UPDATE team_schedules SET team_id = ? WHERE team_id = ?', [masterId, id]);

      // ── Migrate any remaining team_seasons not yet handled ────────────
      const [srcSeasons] = await conn.execute(
        'SELECT season_id, coach, active FROM team_seasons WHERE team_id = ?', [id]
      );
      for (const { season_id, coach, active } of srcSeasons) {
        const [[{ has }]] = await conn.execute(
          'SELECT COUNT(*) AS has FROM team_seasons WHERE team_id = ? AND season_id = ?',
          [masterId, season_id]
        );
        if (!has) {
          await conn.execute(
            'INSERT INTO team_seasons (team_id, season_id, coach, active) VALUES (?, ?, ?, ?)',
            [masterId, season_id, coach, active]
          );
        }
      }

      // ── Copy null fields from source to master ────────────────────────
      const [[src]] = await conn.execute(
        'SELECT abbrev, nickname, gender + 0 AS gender FROM teams WHERE team_id = ?', [id]
      );
      if (src) {
        await conn.execute(
          `UPDATE teams SET
             abbrev   = COALESCE(abbrev,   ?),
             nickname = COALESCE(nickname, ?),
             gender   = COALESCE(gender,   ?)
           WHERE team_id = ?`,
          [src.abbrev, src.nickname, src.gender, masterId]
        );
      }

      // ── Migrate player_seasons ────────────────────────────────────────
      await conn.execute(
        `DELETE ps FROM player_seasons ps
         INNER JOIN player_seasons ps2
                 ON ps2.team_id    = ?
                AND ps2.player_id  = ps.player_id
                AND ps2.season_id  = ps.season_id
         WHERE ps.team_id = ?`,
        [masterId, id]
      );
      await conn.execute('UPDATE player_seasons SET team_id = ? WHERE team_id = ?', [masterId, id]);

      // ── Safety check ──────────────────────────────────────────────────
      const [[{ remaining }]] = await conn.execute(
        'SELECT COUNT(*) AS remaining FROM competitions WHERE team_id = ? OR opponent_id = ?',
        [id, id]
      );
      if (remaining)
        throw new Error(`Team #${id} still has ${remaining} game(s) that could not be migrated`);

      await conn.execute('DELETE FROM team_seasons WHERE team_id = ?', [id]);
      await conn.execute('DELETE FROM teams WHERE team_id = ?', [id]);
    }

    await conn.execute('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await conn.execute('ROLLBACK'); } catch {}
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/teams/:id', async (req, res) => {
  const { name, abbrev, nickname, gender, external_code } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const teamId = parseInt(req.params.id);
  const toBit  = v => (v === '' || v == null) ? null : parseInt(v);
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute(
      'UPDATE teams SET name=?, abbrev=?, nickname=?, gender=?, external_code=? WHERE team_id=?',
      [name.trim(), abbrev || null, nickname || null, toBit(gender), external_code?.trim() || null, teamId]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/teams/:id/seasons', async (req, res) => {
  const teamId = parseInt(req.params.id);
  if (!teamId) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT ts.season_id, ts.coach, ts.active, ts.photo_path,
             s.name AS season_name,
             CONCAT(YEAR(s.start_date), '-', YEAR(s.end_date)) AS label,
             l.name AS league_name
      FROM team_seasons ts
      JOIN seasons s ON s.season_id = ts.season_id
      JOIN leagues  l ON l.league_id = s.league_id
      WHERE ts.team_id = ?
      ORDER BY s.start_date DESC
    `, [teamId]);
    res.json({ seasons: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  const teamId = parseInt(req.params.id);
  let conn;
  try {
    conn = await dbConnect();
    const [[{ anyGames }]] = await conn.execute(
      'SELECT COUNT(*) AS anyGames FROM competitions WHERE team_id=? OR opponent_id=?',
      [teamId, teamId]
    );
    if (anyGames > 0)
      return res.json({ error: `Cannot delete — this team has ${anyGames} game(s) on record.` });
    await conn.execute('DELETE FROM team_seasons WHERE team_id=?', [teamId]);
    await conn.execute('DELETE FROM teams WHERE team_id=?', [teamId]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/teams/:teamId/leagues/:leagueId', async (req, res) => {
  const teamId   = parseInt(req.params.teamId);
  const leagueId = parseInt(req.params.leagueId);
  let conn;
  try {
    conn = await dbConnect();
    const [[{ cnt }]] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM team_schedules tsch
       JOIN seasons s ON s.season_id = tsch.season_id
       WHERE s.league_id = ? AND tsch.team_id = ?`,
      [leagueId, teamId]
    );
    if (cnt > 0)
      return res.json({ error: `Cannot remove — this team has ${cnt} game(s) in this league.` });
    await conn.execute(
      `DELETE ts FROM team_seasons ts
       JOIN seasons s ON ts.season_id = s.season_id
       WHERE ts.team_id = ? AND s.league_id = ?`,
      [teamId, leagueId]
    );
    const [[{ remaining }]] = await conn.execute(
      'SELECT COUNT(*) AS remaining FROM team_seasons WHERE team_id=?', [teamId]
    );
    if (!remaining)
      await conn.execute('DELETE FROM teams WHERE team_id=?', [teamId]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/teams/:teamId/seasons', async (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const { season_id, coach, active } = req.body;
  if (!season_id) return res.status(400).json({ error: 'Season is required' });
  const toBit = v => (v === '' || v == null) ? null : parseInt(v);
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute(
      'INSERT INTO team_seasons (team_id, season_id, coach, active) VALUES (?, ?, ?, ?)',
      [teamId, parseInt(season_id), coach || null, toBit(active)]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// Remove a team from a specific season.  If that was its last season and it
// has no games, the team record itself is also deleted.
app.delete('/api/teams/:teamId/seasons/:seasonId', async (req, res) => {
  const teamId   = parseInt(req.params.teamId);
  const seasonId = parseInt(req.params.seasonId);
  let conn;
  try {
    conn = await dbConnect();
    const [[{ cnt }]] = await conn.execute(
      'SELECT COUNT(*) AS cnt FROM competitions WHERE season_id=? AND (team_id=? OR opponent_id=?)',
      [seasonId, teamId, teamId]
    );
    if (cnt > 0)
      return res.json({ error: `Cannot remove — this team has ${cnt} game(s) in this season.` });
    await conn.execute(
      'DELETE FROM team_seasons WHERE team_id=? AND season_id=?',
      [teamId, seasonId]
    );
    const [[{ remaining }]] = await conn.execute(
      'SELECT COUNT(*) AS remaining FROM team_seasons WHERE team_id=?', [teamId]
    );
    if (!remaining) {
      const [[{ anyGames }]] = await conn.execute(
        'SELECT COUNT(*) AS anyGames FROM competitions WHERE team_id=? OR opponent_id=?',
        [teamId, teamId]
      );
      if (!anyGames) await conn.execute('DELETE FROM teams WHERE team_id=?', [teamId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/teams/:teamId/seasons/:seasonId/photo', async (req, res) => {
  const teamId   = parseInt(req.params.teamId);
  const seasonId = parseInt(req.params.seasonId);
  if (!teamId || !seasonId) return res.status(400).json({ error: 'Invalid id' });
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'No image data provided' });

  const match = data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s);
  if (!match) return res.status(400).json({ error: 'Invalid image data format' });
  const [, mime, b64] = match;
  const ext = ICON_EXTS[mime];
  if (!ext) return res.status(400).json({ error: 'Unsupported type. Use PNG, JPG, GIF, WebP, or SVG.' });
  if (b64.length > 1_400_000) return res.status(400).json({ error: 'Image too large (max ~1 MB)' });

  const photosDir = path.join(__dirname, 'public', 'teams', 'photos');
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  const prefix = `team-${teamId}-season-${seasonId}.`;
  for (const f of fs.readdirSync(photosDir)) {
    if (f.startsWith(prefix)) fs.unlinkSync(path.join(photosDir, f));
  }

  const filename  = `team-${teamId}-season-${seasonId}.${ext}`;
  fs.writeFileSync(path.join(photosDir, filename), Buffer.from(b64, 'base64'));
  const photoPath = `teams/photos/${filename}`;

  let conn;
  try {
    conn = await dbConnect();
    await conn.execute(
      'UPDATE team_seasons SET photo_path = ? WHERE team_id = ? AND season_id = ?',
      [photoPath, teamId, seasonId]
    );
    res.json({ success: true, photo_path: photoPath });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/teams/:teamId/seasons/:seasonId/photo', async (req, res) => {
  const teamId   = parseInt(req.params.teamId);
  const seasonId = parseInt(req.params.seasonId);
  if (!teamId || !seasonId) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    const [[row]] = await conn.execute(
      'SELECT photo_path FROM team_seasons WHERE team_id = ? AND season_id = ?',
      [teamId, seasonId]
    );
    if (row?.photo_path) {
      const fp = path.join(__dirname, 'public', row.photo_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await conn.execute(
      'UPDATE team_seasons SET photo_path = NULL WHERE team_id = ? AND season_id = ?',
      [teamId, seasonId]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/teams/:id/photo', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'No image data provided' });

  const match = data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s);
  if (!match) return res.status(400).json({ error: 'Invalid image data format' });
  const [, mime, b64] = match;
  const ext = ICON_EXTS[mime];
  if (!ext) return res.status(400).json({ error: 'Unsupported type. Use PNG, JPG, GIF, WebP, or SVG.' });
  if (b64.length > 1_400_000) return res.status(400).json({ error: 'Image too large (max ~1 MB)' });

  const photosDir = path.join(__dirname, 'public', 'teams', 'photos');
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  for (const f of fs.readdirSync(photosDir)) {
    if (f.startsWith(`team-${id}.`)) fs.unlinkSync(path.join(photosDir, f));
  }

  const filename  = `team-${id}.${ext}`;
  fs.writeFileSync(path.join(photosDir, filename), Buffer.from(b64, 'base64'));
  const photoPath = `teams/photos/${filename}`;

  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('UPDATE teams SET photo_path = ? WHERE team_id = ?', [photoPath, id]);
    res.json({ success: true, photo_path: photoPath });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/teams/:id/photo', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  let conn;
  try {
    conn = await dbConnect();
    const [[row]] = await conn.execute('SELECT photo_path FROM teams WHERE team_id = ?', [id]);
    if (row?.photo_path) {
      const fp = path.join(__dirname, 'public', row.photo_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await conn.execute('UPDATE teams SET photo_path = NULL WHERE team_id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── Games CRUD ────────────────────────────────────────────────────────────────
app.get('/api/games/missing-boxscores', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT c.competition_id, c.start_time,
             t.name AS team_name, o.name AS opponent_name,
             s.name AS season_name, l.name AS league_name
      FROM   competitions c
      JOIN   teams   t ON t.team_id = c.team_id
      JOIN   teams   o ON o.team_id = c.opponent_id
      JOIN   seasons s ON s.season_id = c.season_id
      JOIN   leagues l ON l.league_id = s.league_id
      WHERE  NOT EXISTS (SELECT 1 FROM boxscores b WHERE b.competition_id = c.competition_id)
      ORDER  BY c.start_time DESC
    `);
    res.json(rows);
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/teams/no-games', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT t.team_id, t.name AS team_name,
             s.season_id AS season_id, s.name AS season_name,
             l.name AS league_name
      FROM   team_seasons ts
      JOIN   teams   t ON t.team_id  = ts.team_id
      JOIN   seasons s ON s.season_id = ts.season_id
      JOIN   leagues l ON l.league_id = s.league_id
      WHERE  NOT EXISTS (
               SELECT 1 FROM team_schedules tsch
               WHERE  tsch.team_id   = ts.team_id
                 AND  tsch.season_id = ts.season_id
             )
      ORDER  BY l.name, s.start_date DESC, s.name, t.name
    `);
    res.json(rows);
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/games', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT c.competition_id, c.season_id, c.team_id, c.opponent_id,
             c.start_time, c.location, ct.comptype, trn.name AS tournament_name,
             ts.score AS team_score,
             os.score AS opponent_score,
             s.name AS season_name, s.league_id,
             l.name AS league_name,
             tm.name  AS team_name,     tm.abbrev AS team_abbrev,
             opp.name AS opponent_name, opp.abbrev AS opponent_abbrev,
             (SELECT tsch2.season_id FROM team_schedules tsch2
               WHERE tsch2.team_id = c.opponent_id AND tsch2.competition_id = c.competition_id
               LIMIT 1) AS opponent_season_id,
             (SELECT sc2.league_id FROM team_schedules tsch2 JOIN seasons sc2 ON sc2.season_id = tsch2.season_id
               WHERE tsch2.team_id = c.opponent_id AND tsch2.competition_id = c.competition_id
               LIMIT 1) AS opponent_league_id
      FROM competitions c
      JOIN seasons s   ON c.season_id   = s.season_id
      JOIN leagues l   ON s.league_id   = l.league_id
      JOIN teams tm    ON c.team_id     = tm.team_id
      JOIN teams opp   ON c.opponent_id = opp.team_id
      LEFT JOIN comptypes ct   ON ct.comptype_id  = c.comptype_id
      LEFT JOIN tournaments trn ON trn.tournament_id = c.tournament_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) ts
             ON ts.competition_id = c.competition_id AND ts.team_id = c.team_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) os
             ON os.competition_id = c.competition_id AND os.team_id = c.opponent_id
      ORDER BY s.start_date DESC, c.start_time DESC
    `);
    res.json({ games: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/games', async (req, res) => {
  const { season_id, team_id, opponent_id, start_time, location } = req.body;
  if (!season_id || !team_id || !opponent_id || !start_time)
    return res.status(400).json({ error: 'Season, team, opponent and date are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO competitions (season_id, team_id, start_time, opponent_id, location) VALUES (?, ?, ?, ?, ?)',
      [parseInt(season_id), parseInt(team_id), start_time, parseInt(opponent_id), location || 'Home']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/games/:id', async (req, res) => {
  const { season_id, team_id, opponent_id, start_time, location } = req.body;
  if (!season_id || !team_id || !opponent_id || !start_time)
    return res.status(400).json({ error: 'Season, team, opponent and date are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'UPDATE competitions SET season_id=?, team_id=?, start_time=?, opponent_id=?, location=? WHERE competition_id=?',
      [parseInt(season_id), parseInt(team_id), start_time, parseInt(opponent_id), location || 'Home', parseInt(req.params.id)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Game not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/games/:id', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute('DELETE FROM competitions WHERE competition_id=?', [parseInt(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Game not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── Players CRUD ─────────────────────────────────────────────────────────────
app.get('/api/players', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT
        p.player_id, p.first_name, p.last_name, p.notes,
        COUNT(DISTINCT ps.team_id)          AS team_count,
        COUNT(DISTINCT ps.season_id)        AS season_count,
        COUNT(DISTINCT b.competition_id)    AS game_count,
        GROUP_CONCAT(DISTINCT ps.team_id   ORDER BY ps.team_id   SEPARATOR ',') AS team_ids,
        GROUP_CONCAT(DISTINCT ps.season_id ORDER BY ps.season_id SEPARATOR ',') AS season_ids,
        GROUP_CONCAT(DISTINCT s.league_id  ORDER BY s.league_id  SEPARATOR ',') AS league_ids
      FROM players p
      LEFT JOIN player_seasons ps ON ps.player_id = p.player_id
      LEFT JOIN seasons         s  ON  s.season_id = ps.season_id
      LEFT JOIN boxscores       b  ON  b.player_id = p.player_id
      GROUP BY p.player_id
      ORDER BY p.last_name, p.first_name
    `);
    res.json({ players: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/players/:id', async (req, res) => {
  const playerId = parseInt(req.params.id);
  let conn;
  try {
    conn = await dbConnect();
    const [[player]] = await conn.execute(
      'SELECT player_id, first_name, last_name, notes, position, misc1 FROM players WHERE player_id = ?',
      [playerId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const [seasons] = await conn.execute(`
      SELECT
          ps.season_id,
          ps.team_id,
          l.name                                                              AS league_name,
          s.name                                                              AS season_name,
          t.name                                                              AS team_name,
          ps.jersey_number,
          ps.height,
          ps.\`year\`,
          COUNT(DISTINCT b.competition_id)                                                        AS game_count,
          COALESCE(SUM(CASE WHEN b.period = 1 AND b.started = 1 THEN 1 ELSE 0 END), 0)         AS gs,
          ROUND(SUM(b.tp) / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1) AS ppg,
          COALESCE(SUM(b.tp),    0)                                           AS total_pts,
          COALESCE(SUM(b.reb),    0)                                           AS total_reb,
          COALESCE(SUM(b.ast),    0)                                           AS total_ast,
          COALESCE(SUM(b.stl),    0)                                           AS total_stl,
          COALESCE(SUM(b.\`to\`), 0)                                           AS total_to
      FROM player_seasons ps
      JOIN seasons       s  ON  s.season_id    = ps.season_id
      JOIN leagues       l  ON  l.league_id    = s.league_id
      JOIN teams         t  ON  t.team_id      = ps.team_id
      LEFT JOIN team_schedules tsch ON tsch.team_id   = ps.team_id
                                    AND tsch.season_id = ps.season_id
      LEFT JOIN competitions c  ON  c.competition_id = tsch.competition_id
      LEFT JOIN boxscores    b  ON  b.competition_id = c.competition_id
                                AND b.player_id      = ps.player_id
      WHERE ps.player_id = ?
      GROUP BY ps.season_id, ps.team_id
      ORDER BY l.name, s.start_date, s.name, t.name
    `, [playerId]);

    res.json({ player, seasons });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/players/:id/games', async (req, res) => {
  const playerId = parseInt(req.params.id);
  const seasonId = req.query.season_id ? parseInt(req.query.season_id) : null;
  const teamId   = req.query.team_id   ? parseInt(req.query.team_id)   : null;
  let conn;
  try {
    conn = await dbConnect();
    let rows;
    if (seasonId && teamId) {
      [rows] = await conn.execute(`
        SELECT
            c.competition_id                                        AS competition_id,
            c.start_time,
            CASE WHEN c.team_id = ? THEN 'H' ELSE 'A' END                   AS home_away,
            CASE WHEN c.team_id = ? THEN vt.name   ELSE ht.name   END       AS opponent_name,
            CASE WHEN c.team_id = ? THEN vt.abbrev ELSE ht.abbrev END       AS opponent_abbrev,
            SUM(b.min)  AS min,  SUM(b.tp)  AS tp,
            SUM(b.oreb) AS oreb, SUM(b.dreb) AS dreb, SUM(b.reb)  AS reb,
            SUM(b.ast)  AS ast,  SUM(b.stl)  AS stl,  SUM(b.blk)  AS blk,
            SUM(b.\`to\`) AS \`to\`, SUM(b.pf) AS pf,
            SUM(b.fgm)  AS fgm,  SUM(b.fga)  AS fga,
            SUM(b.fgm3)  AS fgm3,  SUM(b.fga3)  AS fga3,
            SUM(b.ftm)  AS ftm,  SUM(b.fta)  AS fta
        FROM   boxscores    b
        JOIN   competitions c    ON  c.competition_id  = b.competition_id
        JOIN   team_schedules tsch ON tsch.competition_id = b.competition_id
                                  AND tsch.team_id     = ?
                                  AND tsch.season_id   = ?
        JOIN   teams        ht ON  ht.team_id = c.team_id
        JOIN   teams        vt ON  vt.team_id = c.opponent_id
        WHERE  b.player_id = ?
        GROUP  BY c.competition_id
        ORDER  BY c.start_time
      `, [teamId, teamId, teamId, teamId, seasonId, playerId]);
    } else {
      // All seasons — join player_seasons to determine H/A per game
      [rows] = await conn.execute(`
        SELECT
            c.competition_id                                            AS competition_id,
            c.start_time,
            CASE WHEN c.team_id = ps.team_id THEN 'H' ELSE 'A' END              AS home_away,
            CASE WHEN c.team_id = ps.team_id THEN vt.name   ELSE ht.name   END  AS opponent_name,
            CASE WHEN c.team_id = ps.team_id THEN vt.abbrev ELSE ht.abbrev END  AS opponent_abbrev,
            SUM(b.min)  AS min,  SUM(b.tp)  AS tp,
            SUM(b.oreb) AS oreb, SUM(b.dreb) AS dreb, SUM(b.reb)  AS reb,
            SUM(b.ast)  AS ast,  SUM(b.stl)  AS stl,  SUM(b.blk)  AS blk,
            SUM(b.\`to\`) AS \`to\`, SUM(b.pf) AS pf,
            SUM(b.fgm)  AS fgm,  SUM(b.fga)  AS fga,
            SUM(b.fgm3)  AS fgm3,  SUM(b.fga3)  AS fga3,
            SUM(b.ftm)  AS ftm,  SUM(b.fta)  AS fta
        FROM   boxscores    b
        JOIN   competitions c    ON  c.competition_id   = b.competition_id
        JOIN   team_schedules tsch ON tsch.competition_id = c.competition_id
        JOIN   player_seasons ps ON  ps.player_id      = b.player_id
                                 AND ps.team_id        = tsch.team_id
                                 AND ps.season_id      = tsch.season_id
        JOIN   teams        ht ON  ht.team_id = c.team_id
        JOIN   teams        vt ON  vt.team_id = c.opponent_id
        WHERE  b.player_id = ?
        GROUP  BY c.competition_id, ps.team_id
        ORDER  BY c.start_time
      `, [playerId]);
    }
    res.json({ games: rows });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.post('/api/players', async (req, res) => {
  const { first_name, last_name, position, misc1, notes } = req.body;
  if (!first_name?.trim() || !last_name?.trim())
    return res.status(400).json({ error: 'First name and last name are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO players (first_name, last_name, position, misc1, notes) VALUES (?, ?, ?, ?, ?)',
      [first_name.trim(), last_name.trim(),
       position?.trim() || null, misc1?.trim() || null,
       notes?.trim() || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/players/:id', async (req, res) => {
  const { first_name, last_name, position, misc1, notes } = req.body;
  if (!first_name?.trim() || !last_name?.trim())
    return res.status(400).json({ error: 'First name and last name are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'UPDATE players SET first_name=?, last_name=?, position=?, misc1=?, notes=? WHERE player_id=?',
      [first_name.trim(), last_name.trim(),
       position?.trim() || null, misc1?.trim() || null,
       notes?.trim() || null, parseInt(req.params.id)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.delete('/api/players/:id', async (req, res) => {
  const playerId = parseInt(req.params.id);
  let conn;
  try {
    conn = await dbConnect();
    const [[{ anyStats }]] = await conn.execute(
      'SELECT COUNT(*) AS anyStats FROM boxscores WHERE player_id=?', [playerId]
    );
    if (anyStats > 0)
      return res.json({ error: `Cannot delete — this player has ${anyStats} game stat record(s).` });
    await conn.execute('DELETE FROM player_seasons WHERE player_id=?', [playerId]);
    const [result] = await conn.execute('DELETE FROM players WHERE player_id=?', [playerId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Player not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

async function handleBoxscore(req, res) {
  const compId = parseInt(req.params.id);
  let conn;
  try {
    conn = await dbConnect();

    const [[comp]] = await conn.execute(`
      SELECT
        c.competition_id, c.start_time, c.location,
        c.team_id, ht.name AS team_name,
        c.opponent_id, vt.name AS opponent_name,
        s.name AS season_name, l.name AS league_name,
        COALESCE(ts.score, 0) AS team_score,
        COALESCE(os.score, 0) AS opponent_score
      FROM competitions c
      JOIN seasons  s   ON s.season_id  = c.season_id
      JOIN leagues  l   ON l.league_id  = s.league_id
      JOIN teams    ht  ON ht.team_id = c.team_id
      JOIN teams    vt  ON vt.team_id = c.opponent_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) ts
             ON ts.competition_id = c.competition_id AND ts.team_id = c.team_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) os
             ON os.competition_id = c.competition_id AND os.team_id = c.opponent_id
      WHERE c.competition_id = ?
    `, [compId]);
    if (!comp) return res.status(404).json({ error: 'Game not found' });

    const [rows] = await conn.execute(`
      SELECT
        b.player_id,
        p.first_name, p.last_name,
        MAX(b.jersey_number)                                                    AS jersey_number,
        SUM(b.min)  AS min,  SUM(b.tp)  AS tp,
        SUM(b.fgm)  AS fgm,  SUM(b.fga)  AS fga,
        SUM(b.fgm3)  AS fgm3,  SUM(b.fga3)  AS fga3,
        SUM(b.ftm)  AS ftm,  SUM(b.fta)  AS fta,
        SUM(b.oreb) AS oreb, SUM(b.dreb) AS dreb, SUM(b.reb)  AS reb,
        SUM(b.ast)  AS ast,  SUM(b.stl)  AS stl,  SUM(b.blk)  AS blk,
        SUM(b.\`to\`) AS \`to\`, SUM(b.pf) AS pf,
        MAX(CASE WHEN b.period = 1 AND b.started = 1 THEN 1 ELSE 0 END)        AS gs,
        MAX(CASE WHEN ps.team_id = c.team_id THEN 'team' ELSE 'opponent' END)  AS side
      FROM boxscores    b
      JOIN competitions c  ON c.competition_id = b.competition_id
      JOIN players      p  ON p.player_id = b.player_id
      LEFT JOIN player_seasons ps ON ps.player_id = b.player_id
                                 AND ps.season_id  = c.season_id
                                 AND (ps.team_id = c.team_id OR ps.team_id = c.opponent_id)
      WHERE b.competition_id = ?
      GROUP BY b.player_id, p.first_name, p.last_name
      ORDER BY side, jersey_number
    `, [compId]);

    const team     = rows.filter(r => r.side === 'team');
    const opponent = rows.filter(r => r.side === 'opponent');

    const [periodRows] = await conn.execute(`
      SELECT
        b.player_id,
        p.first_name, p.last_name,
        b.jersey_number, b.period, b.started,
        b.min, b.tp,
        b.fgm, b.fga, b.fgm3, b.fga3, b.ftm, b.fta,
        b.oreb, b.dreb, b.reb,
        b.ast, b.stl, b.blk, b.\`to\`, b.pf,
        CASE WHEN EXISTS (
          SELECT 1 FROM player_seasons ps
          WHERE ps.player_id = b.player_id
            AND ps.season_id = c.season_id
            AND ps.team_id   = c.team_id
        ) THEN 'team' ELSE 'opponent' END AS side
      FROM boxscores    b
      JOIN competitions c ON c.competition_id = b.competition_id
      JOIN players      p ON p.player_id = b.player_id
      WHERE b.competition_id = ?
        AND b.period > 0
      ORDER BY side, b.jersey_number, b.period
    `, [compId]);

    res.json({ competition: comp, team, opponent, periodRows });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
}

app.get('/api/games/:id/boxscore', handleBoxscore);

app.get('/api/games/:id/playbyplay', async (req, res) => {
  const compId = parseInt(req.params.id);
  let conn;
  try {
    conn = await dbConnect();
    const [plays] = await conn.execute(`
      SELECT
        pb.period, pb.clock, pb.action, pb.play_type,
        pb.home_score, pb.visitor_score, pb.team_id,
        pl.first_name, pl.last_name
      FROM playbyplay pb
      LEFT JOIN players pl ON pl.player_id = pb.player_id
      WHERE pb.competition_id = ?
        AND pb.action != 'PERIOD'
      ORDER BY pb.period, pb.seq
    `, [compId]);
    res.json(plays);
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

// ── Public API (token-authenticated, no session required) ─────────────────────

app.get('/api/public/teams/:id/roster', requireReadToken, async (req, res) => {
  const teamId   = parseInt(req.params.id);
  const seasonId = parseInt(req.query.season_id);
  if (!teamId || !seasonId) return res.status(400).json({ error: 'team_id and season_id are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT p.player_id, p.first_name, p.last_name,
             CAST(ps.jersey_number AS CHAR) AS jersey_number,
             p.position, ps.height, ps.year AS grad_year
      FROM players p
      JOIN player_seasons ps ON ps.player_id = p.player_id
      WHERE ps.team_id = ? AND ps.season_id = ?
      ORDER BY ps.jersey_number, p.last_name
    `, [teamId, seasonId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/public/teams/:id/schedule', requireReadToken, async (req, res) => {
  const teamId   = parseInt(req.params.id);
  const seasonId = parseInt(req.query.season_id);
  if (!teamId || !seasonId) return res.status(400).json({ error: 'team_id and season_id are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT c.competition_id,
             DATE(c.start_time)                                                    AS game_date,
             TIME_FORMAT(TIME(c.start_time), '%H:%i')                             AS game_time,
             CASE WHEN c.team_id = ? THEN 'Home' ELSE 'Away' END                  AS vh,
             c.location                                                             AS location,
             CASE WHEN c.team_id = ? THEN opp.name ELSE ht.name END               AS opponent,
             team_pts.score                                                        AS pts_for,
             opp_pts.score                                                         AS pts_against,
             trn.name                                                               AS tournament_name
      FROM competitions c
      JOIN team_schedules tsch ON tsch.competition_id = c.competition_id
                               AND tsch.season_id = ? AND tsch.team_id = ?
      JOIN teams ht  ON ht.team_id  = c.team_id
      JOIN teams opp ON opp.team_id = c.opponent_id
      LEFT JOIN tournaments trn ON trn.tournament_id = c.tournament_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) team_pts
             ON team_pts.competition_id = c.competition_id AND team_pts.team_id = ?
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) opp_pts
             ON opp_pts.competition_id = c.competition_id
            AND opp_pts.team_id = CASE WHEN c.team_id = ? THEN c.opponent_id ELSE c.team_id END
      ORDER BY c.start_time
    `, [teamId, teamId, seasonId, teamId, teamId, teamId]);

    let wins = 0, losses = 0;
    const games = rows.map(g => {
      let result = null, record = null;
      if (g.pts_for != null && g.pts_against != null) {
        if (Number(g.pts_for) > Number(g.pts_against)) { result = 'W'; wins++; }
        else { result = 'L'; losses++; }
        record = `${wins}-${losses}`;
      }
      return { ...g, result, record };
    });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/public/games/:id/boxscore', requireReadToken, handleBoxscore);

app.get('/api/public/teams', requireReadToken, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code is required' });
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(
      'SELECT team_id, name, abbrev, nickname, external_code FROM teams WHERE external_code = ?',
      [code]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/public/seasons', requireReadToken, async (req, res) => {
  const teamId = parseInt(req.query.team_id);
  const { label } = req.query;
  if (!teamId) return res.status(400).json({ error: 'team_id is required' });
  let conn;
  try {
    conn = await dbConnect();
    const baseQuery = `
      SELECT ts.season_id, ts.coach, ts.active, ts.photo_path,
             CONCAT(YEAR(s.start_date), '-', YEAR(s.end_date)) AS label
      FROM team_seasons ts
      JOIN seasons s ON s.season_id = ts.season_id
      WHERE ts.team_id = ?`;

    const [rows] = label
      ? await conn.execute(baseQuery + ` AND CONCAT(YEAR(s.start_date), '-', YEAR(s.end_date)) = ?`, [teamId, label])
      : await conn.execute(baseQuery + ` ORDER BY s.start_date DESC`, [teamId]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

const STAT_ALLOWLIST = new Set([
  'pts','rebs','assists','steals','blocks','Played','ppg','eff','FGP','3PP','fouls','rpg','bpg','seasons','m3p'
]);

// Wrap names starting with a digit so they're safe in ORDER BY / HAVING
function statRef(name) {
  return /^\d/.test(name) ? `\`${name}\`` : name;
}

app.get('/api/public/stats/season', requireReadToken, async (req, res) => {
  const teamId   = parseInt(req.query.team_id);
  const seasonId = parseInt(req.query.season_id);
  const keystat  = req.query.keystat  || 'pts';
  const mintotal = parseFloat(req.query.mintotal) || 0;
  const mingames = parseInt(req.query.mingames)   || 0;
  const maxrows  = parseInt(req.query.maxrows)    || 0;

  if (!teamId || !seasonId) return res.status(400).json({ error: 'team_id and season_id are required' });
  if (!STAT_ALLOWLIST.has(keystat)) return res.status(400).json({ error: 'invalid keystat' });

  const having = [];
  const havingParams = [];
  if (mingames > 0) { having.push('Played >= ?');              havingParams.push(mingames); }
  if (mintotal > 0) { having.push(`${statRef(keystat)} >= ?`); havingParams.push(mintotal); }
  const havingClause = having.length ? `HAVING ${having.join(' AND ')}` : '';
  const limitClause  = maxrows > 0 ? `LIMIT ${maxrows}` : '';

  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT
        p.player_id, p.first_name, p.last_name,
        CAST(ps.jersey_number AS CHAR)                                              AS jersey_number,
        ps.year                                                                     AS class,
        COUNT(DISTINCT b.competition_id)                                            AS Played,
        COALESCE(SUM(b.tp),   0)                                                    AS pts,
        COALESCE(SUM(b.reb),  0)                                                    AS rebs,
        COALESCE(SUM(b.ast),  0)                                                    AS assists,
        COALESCE(SUM(b.stl),  0)                                                    AS steals,
        COALESCE(SUM(b.blk),  0)                                                    AS blocks,
        COALESCE(SUM(b.pf),   0)                                                    AS fouls,
        COALESCE(SUM(b.fgm3), 0)                                                    AS m3p,
        ROUND(SUM(b.tp)   / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1)         AS ppg,
        ROUND(SUM(b.reb)  / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1)         AS rpg,
        ROUND(SUM(b.blk)  / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1)         AS bpg,
        ROUND(SUM(b.fgm)  / NULLIF(SUM(b.fga),  0) * 100, 1)                       AS FGP,
        ROUND(SUM(b.fgm3) / NULLIF(SUM(b.fga3), 0) * 100, 1)                       AS \`3PP\`,
        (COALESCE(SUM(b.tp),  0) + COALESCE(SUM(b.reb), 0) + COALESCE(SUM(b.ast), 0)
          + COALESCE(SUM(b.stl), 0) + COALESCE(SUM(b.blk), 0)
          - (COALESCE(SUM(b.fga), 0) - COALESCE(SUM(b.fgm), 0))
          - (COALESCE(SUM(b.fta), 0) - COALESCE(SUM(b.ftm), 0))
          - COALESCE(SUM(b.\`to\`), 0))                                              AS eff
      FROM player_seasons ps
      JOIN players p ON p.player_id = ps.player_id
      LEFT JOIN team_schedules tsch ON tsch.team_id = ps.team_id AND tsch.season_id = ps.season_id
      LEFT JOIN boxscores b ON b.competition_id = tsch.competition_id AND b.player_id = ps.player_id
      WHERE ps.team_id = ? AND ps.season_id = ?
      GROUP BY p.player_id, p.first_name, p.last_name, ps.jersey_number, ps.year
      ${havingClause}
      ORDER BY ${statRef(keystat)} DESC
      ${limitClause}
    `, [teamId, seasonId, ...havingParams]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('/api/public/stats/career', requireReadToken, async (req, res) => {
  const keystat       = req.query.keystat       || 'pts';
  const mintotal      = parseFloat(req.query.mintotal)      || 0;
  const mingames      = parseInt(req.query.mingames)         || 0;
  const minseasons    = parseInt(req.query.minseasons)       || 0;
  const maxrows       = parseInt(req.query.maxrows)          || 0;
  const constraint    = req.query.constraint    || '';
  const constraintmin = parseFloat(req.query.constraintmin)  || 0;

  if (!STAT_ALLOWLIST.has(keystat)) return res.status(400).json({ error: 'invalid keystat' });
  if (constraint && !STAT_ALLOWLIST.has(constraint)) return res.status(400).json({ error: 'invalid constraint' });

  const having = [];
  const havingParams = [];
  if (mingames   > 0) { having.push('Played >= ?');              havingParams.push(mingames);   }
  if (mintotal   > 0) { having.push(`${statRef(keystat)} >= ?`); havingParams.push(mintotal);   }
  if (minseasons > 0) { having.push('seasons >= ?');             havingParams.push(minseasons); }
  if (constraint && constraintmin > 0) {
    having.push(`${statRef(constraint)} >= ?`);
    havingParams.push(constraintmin);
  }
  const havingClause = having.length ? `HAVING ${having.join(' AND ')}` : '';
  const limitClause  = maxrows > 0 ? `LIMIT ${maxrows}` : '';

  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT
        p.player_id, p.first_name, p.last_name,
        MAX(ps.year)                                                                AS class,
        COUNT(DISTINCT ps.season_id)                                                AS seasons,
        COUNT(DISTINCT b.competition_id)                                            AS Played,
        COALESCE(SUM(b.tp),   0)                                                    AS pts,
        COALESCE(SUM(b.reb),  0)                                                    AS rebs,
        COALESCE(SUM(b.ast),  0)                                                    AS assists,
        COALESCE(SUM(b.stl),  0)                                                    AS steals,
        COALESCE(SUM(b.blk),  0)                                                    AS blocks,
        COALESCE(SUM(b.pf),   0)                                                    AS fouls,
        COALESCE(SUM(b.fgm3), 0)                                                    AS m3p,
        ROUND(SUM(b.tp)   / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1)         AS ppg,
        ROUND(SUM(b.reb)  / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1)         AS rpg,
        ROUND(SUM(b.blk)  / NULLIF(COUNT(DISTINCT b.competition_id), 0), 1)         AS bpg,
        ROUND(SUM(b.fgm)  / NULLIF(SUM(b.fga),  0) * 100, 1)                       AS FGP,
        ROUND(SUM(b.fgm3) / NULLIF(SUM(b.fga3), 0) * 100, 1)                       AS \`3PP\`,
        (COALESCE(SUM(b.tp),  0) + COALESCE(SUM(b.reb), 0) + COALESCE(SUM(b.ast), 0)
          + COALESCE(SUM(b.stl), 0) + COALESCE(SUM(b.blk), 0)
          - (COALESCE(SUM(b.fga), 0) - COALESCE(SUM(b.fgm), 0))
          - (COALESCE(SUM(b.fta), 0) - COALESCE(SUM(b.ftm), 0))
          - COALESCE(SUM(b.\`to\`), 0))                                              AS eff
      FROM players p
      JOIN player_seasons ps ON ps.player_id = p.player_id
      LEFT JOIN team_schedules tsch ON tsch.team_id = ps.team_id AND tsch.season_id = ps.season_id
      LEFT JOIN boxscores b ON b.competition_id = tsch.competition_id AND b.player_id = p.player_id
      GROUP BY p.player_id, p.first_name, p.last_name
      ${havingClause}
      ORDER BY ${statRef(keystat)} DESC
      ${limitClause}
    `, havingParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── XML Import ────────────────────────────────────────────────────────────────

app.get('/api/import/teams', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute('SELECT team_id, name, abbrev FROM teams ORDER BY name');
    res.json({ teams: rows });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/import/seasons', async (req, res) => {
  const { date, home_team_id, visitor_team_id } = req.query;
  const teamIds = [parseInt(home_team_id), parseInt(visitor_team_id)].filter(Boolean);
  let conn;
  try {
    conn = await dbConnect();
    let rows;
    if (teamIds.length && date) {
      [rows] = await conn.execute(`
        SELECT DISTINCT s.season_id, s.name, s.start_date, s.end_date, l.name AS league_name
        FROM seasons s
        JOIN leagues l ON l.league_id = s.league_id
        JOIN team_seasons ts ON ts.season_id = s.season_id
        WHERE ts.team_id IN (${teamIds.map(() => '?').join(',')})
          AND s.start_date <= ? AND s.end_date >= ?
        ORDER BY l.name, s.start_date DESC`,
        [...teamIds, date, date]);
    } else if (teamIds.length) {
      [rows] = await conn.execute(`
        SELECT DISTINCT s.season_id, s.name, s.start_date, s.end_date, l.name AS league_name
        FROM seasons s
        JOIN leagues l ON l.league_id = s.league_id
        JOIN team_seasons ts ON ts.season_id = s.season_id
        WHERE ts.team_id IN (${teamIds.map(() => '?').join(',')})
        ORDER BY s.start_date DESC LIMIT 20`,
        teamIds);
    } else if (date) {
      [rows] = await conn.execute(`
        SELECT s.season_id, s.name, s.start_date, s.end_date, l.name AS league_name
        FROM seasons s JOIN leagues l ON l.league_id = s.league_id
        WHERE s.start_date <= ? AND s.end_date >= ?
        ORDER BY l.name, s.start_date DESC`, [date, date]);
    }
    if (!rows?.length) {
      [rows] = await conn.execute(`
        SELECT s.season_id, s.name, s.start_date, s.end_date, l.name AS league_name
        FROM seasons s JOIN leagues l ON l.league_id = s.league_id
        ORDER BY s.start_date DESC LIMIT 20`);
    }
    res.json({ seasons: rows });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/import/players', async (req, res) => {
  const teamId   = parseInt(req.query.team_id);
  const seasonId = parseInt(req.query.season_id) || 0;
  if (!teamId) return res.status(400).json({ error: 'team_id required' });
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT DISTINCT p.player_id, p.first_name, p.last_name,
             COALESCE(ps2.jersey_number, ps.jersey_number) AS jersey_number
      FROM players p
      JOIN player_seasons ps ON ps.player_id = p.player_id AND ps.team_id = ?
      LEFT JOIN player_seasons ps2 ON ps2.player_id = p.player_id AND ps2.team_id = ? AND ps2.season_id = ?
      ORDER BY p.last_name, p.first_name`, [teamId, teamId, seasonId]);
    res.json({ players: rows });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/import/check', async (req, res) => {
  const { team_id, opponent_id, date } = req.query;
  let conn;
  try {
    conn = await dbConnect();
    const [[row]] = await conn.execute(`
      SELECT c.competition_id,
             EXISTS (SELECT 1 FROM boxscores b WHERE b.competition_id = c.competition_id) AS has_boxscores
      FROM competitions c
      WHERE ((c.team_id = ? AND c.opponent_id = ?) OR (c.team_id = ? AND c.opponent_id = ?))
        AND DATE(c.start_time) = ?
      LIMIT 1`, [team_id, opponent_id, opponent_id, team_id, date]);
    res.json({ existing: row || null });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.post('/api/import/archive', async (req, res) => {
  const { filename, xml, homeName, visitorName, gameDate, source, vh } = req.body;
  if (!xml || !filename) return res.status(400).json({ error: 'xml and filename required' });
  const safe = s => (s || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().substring(0, 40);
  const archiveName = `${gameDate || 'unknown'}_${safe(homeName)}_vs_${safe(visitorName)}_${Date.now()}.xml`;
  if (!fs.existsSync(XML_ARCHIVE_DIR)) fs.mkdirSync(XML_ARCHIVE_DIR, { recursive: true });
  fs.writeFileSync(path.join(XML_ARCHIVE_DIR, archiveName), xml, 'utf-8');
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      `INSERT INTO xml_uploads (source, original_filename, archive_path, home_name, visitor_name, game_date, vh, status, uploaded_by_username, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [source || 'Unknown', filename, `xml-archives/${archiveName}`,
       homeName || '', visitorName || '', gameDate || '1970-01-01', vh || 'both',
       req.session.username || null,
       req.session.displayName || req.session.username || null]
    );
    res.json({ success: true, upload_id: result.insertId });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.get('/api/import/uploads', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT upload_id, source, original_filename, home_name, visitor_name,
             game_date, vh, status, uploaded_at, competition_id, discrepancies
      FROM xml_uploads
      ORDER BY uploaded_at DESC LIMIT 50`);
    res.json({ uploads: rows });
  } catch (err) { res.json({ error: err.message }); }
  finally { await conn?.end().catch(() => {}); }
});

app.post('/api/import/commit', async (req, res) => {
  const { uploadIds, existingCompetitionId, game, periods, boxscores, plays, discrepancies } = req.body;
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute('START TRANSACTION');

    let competitionId = existingCompetitionId || null;

    if (!competitionId) {
      const [r] = await conn.execute(
        `INSERT INTO competitions (season_id, team_id, opponent_id, start_time, location, comptype_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [game.seasonId, game.homeTeamId, game.visitorTeamId,
         game.startTime, game.location || null, game.comptypeId || null]
      );
      competitionId = r.insertId;

      await conn.execute(
        'INSERT IGNORE INTO team_schedules (team_id, season_id, competition_id) VALUES (?, ?, ?)',
        [game.homeTeamId, game.seasonId, competitionId]
      );
      await conn.execute(
        'INSERT IGNORE INTO team_schedules (team_id, season_id, competition_id) VALUES (?, ?, ?)',
        [game.visitorTeamId, game.seasonId, competitionId]
      );

      if (periods?.home) {
        for (let i = 0; i < periods.home.length; i++) {
          await conn.execute(
            'INSERT IGNORE INTO periods (competition_id, team_id, period_num, score) VALUES (?, ?, ?, ?)',
            [competitionId, game.homeTeamId, i + 1, periods.home[i]]
          );
        }
      }
      if (periods?.visitor) {
        for (let i = 0; i < periods.visitor.length; i++) {
          await conn.execute(
            'INSERT IGNORE INTO periods (competition_id, team_id, period_num, score) VALUES (?, ?, ?, ?)',
            [competitionId, game.visitorTeamId, i + 1, periods.visitor[i]]
          );
        }
      }
    }

    // Create new players where needed
    for (const bs of (boxscores || [])) {
      if (bs.playerId || !bs.newPlayer?.first_name?.trim() || !bs.newPlayer?.last_name?.trim()) continue;
      const [r] = await conn.execute(
        'INSERT INTO players (first_name, last_name) VALUES (?, ?)',
        [bs.newPlayer.first_name.trim(), bs.newPlayer.last_name.trim()]
      );
      bs.playerId = r.insertId;
    }

    // Ensure player_seasons and insert boxscores
    for (const bs of (boxscores || [])) {
      if (!bs.playerId) continue;
      const teamId = bs.side === 'home' ? game.homeTeamId : game.visitorTeamId;
      await conn.execute(
        'INSERT IGNORE INTO player_seasons (player_id, season_id, team_id, jersey_number) VALUES (?, ?, ?, ?)',
        [bs.playerId, game.seasonId, teamId, bs.jersey_number || 0]
      );
      await conn.execute(`
        INSERT INTO boxscores
          (competition_id, player_id, period, started, jersey_number,
           min, fgm, fga, fgm3, fga3, ftm, fta, oreb, dreb, reb, ast, stl, blk, \`to\`, pf, tf, dq, tp)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          started=VALUES(started), jersey_number=VALUES(jersey_number),
          min=VALUES(min), fgm=VALUES(fgm), fga=VALUES(fga),
          fgm3=VALUES(fgm3), fga3=VALUES(fga3),
          ftm=VALUES(ftm), fta=VALUES(fta),
          oreb=VALUES(oreb), dreb=VALUES(dreb), reb=VALUES(reb),
          ast=VALUES(ast), stl=VALUES(stl), blk=VALUES(blk),
          \`to\`=VALUES(\`to\`), pf=VALUES(pf), tf=VALUES(tf), dq=VALUES(dq), tp=VALUES(tp)`,
        [competitionId, bs.playerId, bs.started || 0, bs.jersey_number || 0,
         bs.min || 0, bs.fgm || 0, bs.fga || 0, bs.fgm3 || 0, bs.fga3 || 0,
         bs.ftm || 0, bs.fta || 0, bs.oreb || 0, bs.dreb || 0, bs.reb || 0,
         bs.ast || 0, bs.stl || 0, bs.blk || 0, bs.to || 0,
         bs.pf || 0, bs.tf || 0, bs.dq || 0, bs.tp || 0]
      );
    }

    // Insert plays only if none exist yet for this game
    if (plays?.length) {
      const [[{ cnt }]] = await conn.execute(
        'SELECT COUNT(*) AS cnt FROM playbyplay WHERE competition_id = ?', [competitionId]);
      if (!cnt) {
        for (const play of plays) {
          await conn.execute(`
            INSERT INTO playbyplay
              (competition_id, period, clock, team_id, player_id, action, play_type,
               is_paint, home_score, visitor_score, wall_clock, seq)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [competitionId, play.period, play.clock || '00:00',
             play.teamId || null, play.playerId || null,
             play.action, play.play_type || null, play.is_paint || 0,
             play.home_score ?? null, play.visitor_score ?? null,
             play.wall_clock || null, play.seq || 0]
          );
        }
      }
    }

    // Update upload records with final status
    const finalStatus = discrepancies?.length ? 'discrepancy' : 'complete';
    for (const uid of (uploadIds || [])) {
      await conn.execute(
        'UPDATE xml_uploads SET competition_id=?, status=?, discrepancies=? WHERE upload_id=?',
        [competitionId, finalStatus,
         discrepancies?.length ? JSON.stringify(discrepancies) : null, uid]
      );
    }

    await conn.execute('COMMIT');
    res.json({ success: true, competition_id: competitionId, discrepancies: discrepancies || [] });
  } catch (err) {
    await conn?.execute('ROLLBACK').catch(() => {});
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.use('/reports', require('./reports')(dbConnect, getServerConfig));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Startup migration: game_date DATE → start_time DATETIME + end_time DATETIME
(async () => {
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute(
      `ALTER TABLE competitions
         ADD COLUMN IF NOT EXISTS start_time DATETIME NULL,
         ADD COLUMN IF NOT EXISTS end_time   DATETIME NULL`
    );
    await conn.execute(
      `UPDATE competitions SET start_time = game_date WHERE start_time IS NULL`
    );
    await conn.execute(`ALTER TABLE competitions DROP COLUMN IF EXISTS game_date`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_competitions_starttime ON competitions (start_time)`);
  } catch (e) {
    // Not configured yet, or already migrated — both are fine
    if (e.code !== 'NOT_CONFIGURED') console.warn('Migration warning:', e.message);
  } finally {
    await conn?.end().catch(() => {});
  }
})();

app.listen(PORT, () => {
  console.log(`Stats Manager running at http://localhost:${PORT}`);
});
