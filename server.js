const express = require('express');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'statmanager.ini');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return ini.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, ini.stringify(config), 'utf-8');
}

app.get('/api/settings', (req, res) => {
  const config = readConfig();
  const db = config.database || {};
  res.json({
    database: {
      host: db.host || 'localhost',
      port: parseInt(db.port) || 3306,
      name: db.name || '',
      user: db.user || '',
      passwordSet: !!db.password
    }
  });
});

app.post('/api/settings', (req, res) => {
  const { database } = req.body;
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

  try {
    writeConfig(config);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write settings file' });
  }
});

app.post('/api/settings/test', async (req, res) => {
  const { database } = req.body;
  const config = readConfig();
  const stored = config.database || {};

  const connConfig = {
    host: database?.host || stored.host || 'localhost',
    port: parseInt(database?.port || stored.port) || 3306,
    database: database?.name || stored.name || undefined,
    user: database?.user || stored.user || '',
    password: database?.password || stored.password || '',
    connectTimeout: 5000
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
  const config = readConfig();
  const db = config.database || {};

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
      connectTimeout: 5000
    });
    const [[row]] = await conn.execute(`
      SELECT
        (SELECT COUNT(*) FROM leagues)      AS leagues,
        (SELECT COUNT(*) FROM seasons)      AS seasons,
        (SELECT COUNT(*) FROM teams)        AS teams,
        (SELECT COUNT(*) FROM competitions) AS competitions,
        (SELECT COUNT(*) FROM boxscores)    AS boxscores,
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
  const config = readConfig();
  const db = config.database || {};

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
      multipleStatements: true
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
  const config = readConfig();
  const db = config.database || {};
  if (!db.host || !db.user || !db.name) {
    throw Object.assign(new Error('Database not configured'), { code: 'NOT_CONFIGURED' });
  }
  return mysql.createConnection({
    host: db.host,
    port: parseInt(db.port) || 3306,
    database: db.name,
    user: db.user,
    password: db.password || '',
    connectTimeout: 5000
  });
}

// ── Leagues CRUD ──────────────────────────────────────────────────────────────
app.get('/api/leagues', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT
        l.*,
        (SELECT COUNT(*)
           FROM seasons s
          WHERE s.league_id = l.id)                                                          AS season_count,
        (SELECT COUNT(DISTINCT ts.team_id)
           FROM team_seasons ts JOIN seasons s ON ts.season_id = s.id
          WHERE s.league_id = l.id)                                                          AS team_count,
        (SELECT COUNT(*)
           FROM competitions c JOIN seasons s ON c.season_id = s.id
          WHERE s.league_id = l.id)                                                          AS competition_count,
        (SELECT COUNT(DISTINCT ps.player_id)
           FROM player_seasons ps JOIN seasons s ON ps.season_id = s.id
          WHERE s.league_id = l.id)                                                          AS player_count,
        (SELECT COUNT(*)
           FROM boxscores b
           JOIN competitions c ON b.competition_id = c.id
           JOIN seasons s      ON c.season_id = s.id
          WHERE s.league_id = l.id)                                                          AS boxscore_count
      FROM leagues l
      ORDER BY l.name
    `);
    res.json({ leagues: rows });
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
       WHERE id=?`,
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
    const [result] = await conn.execute('DELETE FROM leagues WHERE id=?', [parseInt(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'League not found' });
    res.json({ success: true });
  } catch (err) {
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
        'SELECT contact_person, contact_phone, contact_email, website_url, founded_date, facebook, x_handle, instagram FROM leagues WHERE id = ?',
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
           WHERE id = ?`,
          [src.contact_person, src.contact_phone, src.contact_email, src.website_url,
           src.founded_date, src.facebook, src.x_handle, src.instagram, masterId]
        );
      }

      const [delResult] = await conn.execute('DELETE FROM leagues WHERE id = ?', [id]);
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
        (SELECT COUNT(*)
           FROM team_seasons ts WHERE ts.season_id = s.id)                              AS team_count,
        (SELECT COUNT(*)
           FROM competitions c WHERE c.season_id = s.id)                                 AS game_count,
        (SELECT COUNT(DISTINCT ps.player_id)
           FROM player_seasons ps WHERE ps.season_id = s.id)                             AS player_count,
        (SELECT COUNT(*)
           FROM boxscores b JOIN competitions c ON b.competition_id = c.id
          WHERE c.season_id = s.id)                                                      AS boxscore_count
      FROM seasons s JOIN leagues l ON s.league_id = l.id
      ORDER BY l.name, s.start_year DESC, s.name
    `);
    res.json({ seasons: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/seasons', async (req, res) => {
  const { league_id, name, start_year, end_year } = req.body;
  if (!league_id || !name?.trim() || !start_year || !end_year)
    return res.status(400).json({ error: 'League, name, start year and end year are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO seasons (league_id, name, start_year, end_year) VALUES (?, ?, ?, ?)',
      [parseInt(league_id), name.trim(), parseInt(start_year), parseInt(end_year)]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/seasons/:id', async (req, res) => {
  const { league_id, name, start_year, end_year } = req.body;
  if (!league_id || !name?.trim() || !start_year || !end_year)
    return res.status(400).json({ error: 'League, name, start year and end year are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'UPDATE seasons SET league_id=?, name=?, start_year=?, end_year=? WHERE id=?',
      [parseInt(league_id), name.trim(), parseInt(start_year), parseInt(end_year), parseInt(req.params.id)]
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
    const [result] = await conn.execute('DELETE FROM seasons WHERE id=?', [parseInt(req.params.id)]);
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

      await conn.execute('DELETE FROM seasons WHERE id = ?', [srcId]);
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
      SELECT t.id, t.name, t.abbrev, t.nickname,
             t.gender + 0 AS gender,
             l.id   AS league_id,
             l.name AS league_name,
             (SELECT ts_r.coach
                FROM team_seasons ts_r
                JOIN seasons s_r ON ts_r.season_id = s_r.id
               WHERE ts_r.team_id = t.id AND s_r.league_id = l.id
               ORDER BY s_r.start_year DESC LIMIT 1) AS coach,
             COUNT(DISTINCT ts.season_id) AS season_count,
             (SELECT COUNT(*)
                FROM competitions c
                JOIN seasons sc ON c.season_id = sc.id
               WHERE (c.team_id = t.id OR c.opponent_id = t.id)
                 AND sc.league_id = l.id) AS game_count,
             GROUP_CONCAT(DISTINCT ts.season_id ORDER BY ts.season_id) AS season_ids
      FROM teams t
      JOIN team_seasons ts ON ts.team_id  = t.id
      JOIN seasons      s  ON ts.season_id = s.id
      JOIN leagues      l  ON s.league_id  = l.id
      GROUP BY t.id, l.id
      UNION ALL
      SELECT t.id, t.name, t.abbrev, t.nickname,
             t.gender + 0 AS gender,
             NULL, NULL, NULL, 0, 0, NULL
      FROM teams t
      WHERE NOT EXISTS (SELECT 1 FROM team_seasons ts WHERE ts.team_id = t.id)
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
      // Migrate all games globally first — catches any game regardless of
      // whether a matching team_seasons row exists for the source team.
      await conn.execute(
        'UPDATE competitions SET team_id = ? WHERE team_id = ?',
        [masterId, srcId]
      );
      await conn.execute(
        'UPDATE competitions SET opponent_id = ? WHERE opponent_id = ?',
        [masterId, srcId]
      );

      // Migrate season assignments, skipping any already held by the master.
      const [srcSeasons] = await conn.execute(
        'SELECT season_id, coach, active FROM team_seasons WHERE team_id = ?',
        [srcId]
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

      // Copy null fields from source to master.
      const [[src]] = await conn.execute(
        'SELECT abbrev, nickname, gender + 0 AS gender FROM teams WHERE id = ?', [srcId]
      );
      if (src) {
        await conn.execute(
          `UPDATE teams SET
             abbrev   = COALESCE(abbrev,   ?),
             nickname = COALESCE(nickname, ?),
             gender   = COALESCE(gender,   ?)
           WHERE id = ?`,
          [src.abbrev, src.nickname, src.gender, masterId]
        );
      }

      // Safety check — all games must be gone from source before deleting it.
      const [[{ remaining }]] = await conn.execute(
        'SELECT COUNT(*) AS remaining FROM competitions WHERE team_id = ? OR opponent_id = ?',
        [srcId, srcId]
      );
      if (remaining)
        throw new Error(`Team #${srcId} still has ${remaining} game(s) that could not be migrated`);

      await conn.execute('DELETE FROM team_seasons WHERE team_id = ?', [srcId]);
      await conn.execute('DELETE FROM teams WHERE id = ?', [srcId]);
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
  const { name, abbrev, nickname, gender } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const teamId = parseInt(req.params.id);
  const toBit  = v => (v === '' || v == null) ? null : parseInt(v);
  let conn;
  try {
    conn = await dbConnect();
    await conn.execute(
      'UPDATE teams SET name=?, abbrev=?, nickname=?, gender=? WHERE id=?',
      [name.trim(), abbrev || null, nickname || null, toBit(gender), teamId]
    );
    res.json({ success: true });
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
    await conn.execute('DELETE FROM teams WHERE id=?', [teamId]);
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
      `SELECT COUNT(*) AS cnt FROM competitions c
       JOIN seasons s ON c.season_id = s.id
       WHERE s.league_id = ? AND (c.team_id = ? OR c.opponent_id = ?)`,
      [leagueId, teamId, teamId]
    );
    if (cnt > 0)
      return res.json({ error: `Cannot remove — this team has ${cnt} game(s) in this league.` });
    await conn.execute(
      `DELETE ts FROM team_seasons ts
       JOIN seasons s ON ts.season_id = s.id
       WHERE ts.team_id = ? AND s.league_id = ?`,
      [teamId, leagueId]
    );
    const [[{ remaining }]] = await conn.execute(
      'SELECT COUNT(*) AS remaining FROM team_seasons WHERE team_id=?', [teamId]
    );
    if (!remaining)
      await conn.execute('DELETE FROM teams WHERE id=?', [teamId]);
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
      if (!anyGames) await conn.execute('DELETE FROM teams WHERE id=?', [teamId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

// ── Games CRUD ────────────────────────────────────────────────────────────────
app.get('/api/games', async (req, res) => {
  let conn;
  try {
    conn = await dbConnect();
    const [rows] = await conn.execute(`
      SELECT c.id, c.season_id, c.team_id, c.opponent_id,
             c.game_date, c.location,
             ts.score AS team_score,
             os.score AS opponent_score,
             s.name AS season_name, s.league_id,
             l.name AS league_name,
             tm.name  AS team_name,     tm.abbrev AS team_abbrev,
             opp.name AS opponent_name, opp.abbrev AS opponent_abbrev,
             (SELECT s2.id FROM team_seasons ts2 JOIN seasons s2 ON ts2.season_id = s2.id
               WHERE ts2.team_id = c.opponent_id
                 AND s2.start_year = s.start_year AND s2.end_year = s.end_year
               LIMIT 1) AS opponent_season_id,
             (SELECT s2.league_id FROM team_seasons ts2 JOIN seasons s2 ON ts2.season_id = s2.id
               WHERE ts2.team_id = c.opponent_id
                 AND s2.start_year = s.start_year AND s2.end_year = s.end_year
               LIMIT 1) AS opponent_league_id
      FROM competitions c
      JOIN seasons s   ON c.season_id   = s.id
      JOIN leagues l   ON s.league_id   = l.id
      JOIN teams tm    ON c.team_id     = tm.id
      JOIN teams opp   ON c.opponent_id = opp.id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) ts
             ON ts.competition_id = c.id AND ts.team_id = c.team_id
      LEFT JOIN (SELECT competition_id, team_id, SUM(score) AS score
                 FROM periods GROUP BY competition_id, team_id) os
             ON os.competition_id = c.id AND os.team_id = c.opponent_id
      ORDER BY s.start_year DESC, c.game_date DESC
    `);
    res.json({ games: rows });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.post('/api/games', async (req, res) => {
  const { season_id, team_id, opponent_id, game_date, location } = req.body;
  if (!season_id || !team_id || !opponent_id || !game_date)
    return res.status(400).json({ error: 'Season, team, opponent and date are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'INSERT INTO competitions (season_id, team_id, game_date, opponent_id, location) VALUES (?, ?, ?, ?, ?)',
      [parseInt(season_id), parseInt(team_id), game_date, parseInt(opponent_id), location || 'Home']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.put('/api/games/:id', async (req, res) => {
  const { season_id, team_id, opponent_id, game_date, location } = req.body;
  if (!season_id || !team_id || !opponent_id || !game_date)
    return res.status(400).json({ error: 'Season, team, opponent and date are required' });
  let conn;
  try {
    conn = await dbConnect();
    const [result] = await conn.execute(
      'UPDATE competitions SET season_id=?, team_id=?, game_date=?, opponent_id=?, location=? WHERE id=?',
      [parseInt(season_id), parseInt(team_id), game_date, parseInt(opponent_id), location || 'Home', parseInt(req.params.id)]
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
    const [result] = await conn.execute('DELETE FROM competitions WHERE id=?', [parseInt(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Game not found' });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    await conn?.end().catch(() => {});
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Stats Manager running at http://localhost:${PORT}`);
});
