'use strict';
const express = require('express');

module.exports = function makeReportsRouter(dbConnect, getServerConfig) {
  const router = express.Router();

  function base() {
    return ((getServerConfig().base_url) || '').replace(/\/$/, '');
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function page(title, body) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font-family:Verdana,Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:16px 20px;max-width:1200px;margin:0 auto}
h1{font-size:1.1em;text-align:center;margin:0 0 2px}
h2{font-size:0.9em;margin:14px 0 3px;border-bottom:1px solid #bbb;padding-bottom:2px;text-transform:uppercase;letter-spacing:.05em}
table{border-collapse:collapse}
th{text-align:right;padding:3px 5px;background:#444;color:#fff;border:1px solid #fff;white-space:nowrap;font-size:11px}
th.l{text-align:left}
td{padding:2px 5px;white-space:nowrap}
tr.tot td{border-top:1px solid #aaa;font-weight:bold;background:#f0f0f0}
tr:nth-child(even) td{background:#fafafa}
tr.tot:nth-child(even) td{background:#f0f0f0}
.nav{text-align:center;margin:8px 0 14px}
.nav a{margin:0 8px;text-decoration:none;color:#0050a0;font-weight:bold;border:1px solid #ccc;padding:3px 9px;border-radius:3px;font-size:11px}
.nav a:hover{background:#eef}
.small{font-size:11px;color:#666}
.w{color:green;font-weight:bold}
td.l{color:#c00;font-weight:bold}
</style>
</head><body>${body}</body></html>`;
  }

  function reportHeading(info, reportTitle, teamId, seasonId) {
    const leagueLabel = info.org_abbrev ? `${info.org_abbrev} - ${info.league_name}` : info.league_name;
    const b = base();
    const nav = `<div class="nav">
  <a href="${b}/reports/team/${teamId}/season/${seasonId}">Index</a>
  <a href="${b}/reports/team/${teamId}/season/${seasonId}/schedule">Schedule</a>
  <a href="${b}/reports/team/${teamId}/season/${seasonId}/stats">Season Stats</a>
  <a href="${b}/reports/team/${teamId}/season/${seasonId}/game-by-game">Game by Game</a>
  <a href="${b}/reports/team/${teamId}/season/${seasonId}/highs">Player Highs</a>
</div>`;
    const subtitle = reportTitle
      ? `\n<h2 style="text-align:center;border:none;font-size:1em;letter-spacing:0;text-transform:none;margin-bottom:10px">${esc(reportTitle)}</h2>`
      : '';
    return `${nav}
<h1>${esc(info.season_name)}<br>${esc(info.team_name)}</h1>
<p style="text-align:center;margin:0 0 12px;font-size:11px;color:#555">${esc(leagueLabel)}</p>${subtitle}`;
  }

  function fmtDate(d) {
    if (!d) return '';
    const s = String(d).substring(0, 10); // "YYYY-MM-DD"
    const [y, mo, dy] = s.split('-');
    return `${parseInt(mo)}/${parseInt(dy)}/${y}`;
  }

  function fmtTime(d) {
    if (!d) return '';
    const s = String(d);
    if (s.length < 16) return '';
    const [h, m] = s.substring(11, 16).split(':').map(Number);
    if (h === 0 && m === 0) return '';
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function pct(m, a) {
    if (!Number(a)) return '.000';
    return (Number(m) / Number(a)).toFixed(3).replace(/^0\./, '.');
  }

  function fmtMin(secs) {
    return secs ? String(Math.round(Number(secs) / 60)) : '0';
  }

  // ── Shared DB helpers ─────────────────────────────────────────────────────────

  async function getInfo(conn, teamId, seasonId) {
    const [[row]] = await conn.execute(`
      SELECT t.name AS team_name, t.abbrev, t.gender,
             s.name AS season_name,
             l.name AS league_name,
             o.acronym AS org_abbrev
      FROM team_seasons ts
      JOIN teams   t ON t.team_id   = ts.team_id
      JOIN seasons s ON s.season_id = ts.season_id
      JOIN leagues l ON l.league_id = s.league_id
      LEFT JOIN organizations o ON o.org_id = l.governing_org_id
      WHERE ts.team_id = ? AND ts.season_id = ?
    `, [teamId, seasonId]);
    return row || null;
  }

  async function getGames(conn, teamId, seasonId) {
    const [rows] = await conn.execute(`
      SELECT tsch.competition_id,
             c.start_time,
             c.comptype_id,
             c.tournament_id,
             CASE WHEN c.team_id = ? THEN 'h'
                  WHEN c.tournament_id IS NOT NULL THEN 'n'
                  ELSE 'a' END                                         AS ha,
             opp.name    AS opponent_name,
             opp.team_id AS opp_team_id
      FROM team_schedules tsch
      JOIN competitions c   ON c.competition_id = tsch.competition_id
      JOIN teams opp ON opp.team_id =
             CASE WHEN c.team_id = ? THEN c.opponent_id ELSE c.team_id END
      WHERE tsch.team_id = ? AND tsch.season_id = ?
      ORDER BY c.start_time ASC, tsch.competition_id ASC
    `, [teamId, teamId, teamId, seasonId]);
    return rows;
  }

  // Returns Map<competition_id, { our: number, their: number }>
  async function getScores(conn, teamId, seasonId) {
    const [rows] = await conn.execute(`
      SELECT p.competition_id, p.team_id, SUM(p.score) AS total
      FROM periods p
      JOIN team_schedules tsch ON tsch.competition_id = p.competition_id
      WHERE tsch.team_id = ? AND tsch.season_id = ?
      GROUP BY p.competition_id, p.team_id
    `, [teamId, seasonId]);

    const map = new Map();
    for (const r of rows) {
      const id = r.competition_id;
      if (!map.has(id)) map.set(id, { our: 0, their: 0 });
      if (Number(r.team_id) === Number(teamId))
        map.get(id).our   = Number(r.total);
      else
        map.get(id).their = Number(r.total);
    }
    return map;
  }

  // ── INDEX ─────────────────────────────────────────────────────────────────────

  router.get('/team/:teamId/season/:seasonId', async (req, res) => {
    const teamId   = parseInt(req.params.teamId);
    const seasonId = parseInt(req.params.seasonId);
    let conn;
    try {
      conn = await dbConnect();
      const info = await getInfo(conn, teamId, seasonId);
      if (!info) return res.status(404).send('Team/season not found.');

      const games  = await getGames(conn, teamId, seasonId);
      const scores = await getScores(conn, teamId, seasonId);

      let wins = 0, losses = 0;
      let gameRows = '';
      for (const g of games) {
        const sc = scores.get(g.competition_id) || { our: 0, their: 0 };
        const hasScore = sc.our || sc.their;
        const won  = hasScore && sc.our > sc.their;
        const lost = hasScore && sc.our < sc.their;
        if (won)  wins++;
        if (lost) losses++;
        gameRows += `<tr>
          <td>${esc(fmtDate(g.start_time))}</td>
          <td>${esc(fmtTime(g.start_time))}</td>
          <td>${g.comptype_id === 3 ? '*' : ''}</td>
          <td>${esc(g.ha)}</td>
          <td>${esc(g.opponent_name)}</td>
          <td style="text-align:center">${hasScore ? `${sc.our}-${sc.their}` : ''}</td>
          <td class="${won ? 'w' : lost ? 'l' : ''}">${won ? 'W' : lost ? 'L' : ''}</td>
          <td><a href="${base()}/reports/team/${teamId}/season/${seasonId}/box/${g.competition_id}">Box</a></td>
        </tr>`;
      }

      const tbl = `<table style="width:100%">
        <tr>
          <th class="l">Date</th><th class="l">Time</th>
          <th class="l" colspan="3">Opponent</th>
          <th class="l" colspan="2">Score</th><th class="l">Links</th>
        </tr>
        ${gameRows}
      </table>
      <p class="small" style="margin-top:6px">* conference &nbsp; h=home &nbsp; a=away &nbsp; n=neutral</p>
      <p><b>Record: ${wins}-${losses}</b></p>`;

      res.send(page(`${info.team_name} ${info.season_name}`, reportHeading(info, null, teamId, seasonId) + tbl));
    } catch (e) {
      res.status(500).send(esc(e.message));
    } finally {
      await conn?.end().catch(() => {});
    }
  });

  // ── SCHEDULE ─────────────────────────────────────────────────────────────────

  router.get('/team/:teamId/season/:seasonId/schedule', async (req, res) => {
    const teamId   = parseInt(req.params.teamId);
    const seasonId = parseInt(req.params.seasonId);
    let conn;
    try {
      conn = await dbConnect();
      const info   = await getInfo(conn, teamId, seasonId);
      if (!info) return res.status(404).send('Not found.');
      const games  = await getGames(conn, teamId, seasonId);
      const scores = await getScores(conn, teamId, seasonId);

      // Per-game leaders (our team's players only, period=1 = full-game total in dakstats)
      const [leaderRows] = await conn.execute(`
        SELECT b.competition_id, pl.last_name, b.pts, b.reb, b.ast
        FROM team_schedules tsch
        JOIN boxscores b ON b.competition_id = tsch.competition_id AND b.period = 1
        JOIN player_seasons ps ON ps.player_id = b.player_id
          AND ps.team_id = tsch.team_id AND ps.season_id = tsch.season_id
        JOIN players pl ON pl.player_id = b.player_id
        WHERE tsch.team_id = ? AND tsch.season_id = ?
      `, [teamId, seasonId]);

      const leaderMap = new Map();
      for (const r of leaderRows) {
        if (!leaderMap.has(r.competition_id)) leaderMap.set(r.competition_id, []);
        leaderMap.get(r.competition_id).push(r);
      }

      function gameLeader(rows, field) {
        if (!rows || !rows.length) return '';
        const max = Math.max(...rows.map(r => Number(r[field])));
        if (!max) return '';
        const names = rows.filter(r => Number(r[field]) === max).map(r => r.last_name);
        return names.length > 3
          ? `(${max}) ${names.length} players`
          : `(${max}) ${names.join(', ')}`;
      }

      let wins = 0, losses = 0;
      let hw = 0, hl = 0, aw = 0, al = 0, nw = 0, nl = 0;
      let cw = 0, cl = 0;
      let gameRows = '';

      for (const g of games) {
        const sc = scores.get(g.competition_id) || { our: 0, their: 0 };
        const hasScore = sc.our || sc.their;
        const won  = hasScore && sc.our > sc.their;
        const lost = hasScore && sc.our < sc.their;
        if (won)  { wins++;   if (g.ha === 'h') hw++; else if (g.ha === 'a') aw++; else nw++; }
        if (lost) { losses++; if (g.ha === 'h') hl++; else if (g.ha === 'a') al++; else nl++; }
        if (g.comptype_id === 3) { if (won) cw++; else if (lost) cl++; }
        const lr = leaderMap.get(g.competition_id) || [];
        gameRows += `<tr>
          <td>${esc(fmtDate(g.start_time))}</td>
          <td>${esc(fmtTime(g.start_time))}</td>
          <td>${g.comptype_id === 3 ? '*' : ''}</td>
          <td>${esc(g.ha)}</td>
          <td>${esc(g.opponent_name)}</td>
          <td style="text-align:center">${hasScore ? `${sc.our}-${sc.their}` : ''}</td>
          <td class="${won ? 'w' : lost ? 'l' : ''}">${won ? 'W' : lost ? 'L' : ''}</td>
          <td style="text-align:right">${wins}-${losses}</td>
          <td style="padding-left:12px">${esc(gameLeader(lr, 'pts'))}</td>
          <td style="padding-left:8px">${esc(gameLeader(lr, 'reb'))}</td>
          <td style="padding-left:8px">${esc(gameLeader(lr, 'ast'))}</td>
        </tr>`;
      }

      const recTable = `<table style="margin-bottom:12px">
        <tr><th class="l" style="padding-right:16px">Record</th>
            <th style="padding:2px 12px">Overall</th><th style="padding:2px 12px">Home</th>
            <th style="padding:2px 12px">Away</th><th style="padding:2px 12px">Neutral</th></tr>
        <tr><td>All Games</td>
            <td style="text-align:center">${wins}-${losses}</td>
            <td style="text-align:center">${hw}-${hl}</td>
            <td style="text-align:center">${aw}-${al}</td>
            <td style="text-align:center">${nw}-${nl}</td></tr>
        <tr><td>Conference</td>
            <td style="text-align:center">${cw}-${cl}</td>
            <td colspan="3"></td></tr>
      </table>`;

      const tbl = recTable + `<table style="width:100%">
        <tr>
          <th class="l">Date</th><th class="l">Time</th>
          <th class="l" colspan="3">Opponent</th>
          <th class="l" colspan="2">Score</th><th>Record</th>
          <th class="l" style="padding-left:12px">Leading Scorer</th>
          <th class="l" style="padding-left:8px">Leading Rebounder</th>
          <th class="l" style="padding-left:8px">Leading Assists</th>
        </tr>
        ${gameRows}
      </table>
      <p class="small" style="margin-top:6px">* conference game</p>`;

      res.send(page(`Schedule – ${info.team_name} ${info.season_name}`,
        reportHeading(info, 'Season Schedule', teamId, seasonId) + tbl));
    } catch (e) {
      res.status(500).send(esc(e.message));
    } finally {
      await conn?.end().catch(() => {});
    }
  });

  // ── SEASON PLAYER STATS ───────────────────────────────────────────────────────

  router.get('/team/:teamId/season/:seasonId/stats', async (req, res) => {
    const teamId   = parseInt(req.params.teamId);
    const seasonId = parseInt(req.params.seasonId);
    let conn;
    try {
      conn = await dbConnect();
      const info = await getInfo(conn, teamId, seasonId);
      if (!info) return res.status(404).send('Not found.');

      const [players] = await conn.execute(`
        SELECT pl.player_id, pl.first_name, pl.last_name, ps.jersey_number,
               COUNT(DISTINCT b.competition_id)                               AS gp,
               SUM(CASE WHEN b.period = 1 AND b.started = 1 THEN 1 ELSE 0 END) AS gs,
               SUM(CASE WHEN b.period = 1 THEN b.min   ELSE 0 END)           AS min_tot,
               SUM(CASE WHEN b.period = 1 THEN b.fgm   ELSE 0 END)           AS fgm,
               SUM(CASE WHEN b.period = 1 THEN b.fga   ELSE 0 END)           AS fga,
               SUM(CASE WHEN b.period = 1 THEN b.tpm   ELSE 0 END)           AS tpm,
               SUM(CASE WHEN b.period = 1 THEN b.tpa   ELSE 0 END)           AS tpa,
               SUM(CASE WHEN b.period = 1 THEN b.ftm   ELSE 0 END)           AS ftm,
               SUM(CASE WHEN b.period = 1 THEN b.fta   ELSE 0 END)           AS fta,
               SUM(CASE WHEN b.period = 1 THEN b.oreb  ELSE 0 END)           AS oreb,
               SUM(CASE WHEN b.period = 1 THEN b.dreb  ELSE 0 END)           AS dreb,
               SUM(CASE WHEN b.period = 1 THEN b.reb   ELSE 0 END)           AS reb,
               SUM(CASE WHEN b.period = 1 THEN b.ast   ELSE 0 END)           AS ast,
               SUM(CASE WHEN b.period = 1 THEN b.stl   ELSE 0 END)           AS stl,
               SUM(CASE WHEN b.period = 1 THEN b.blk   ELSE 0 END)           AS blk,
               SUM(CASE WHEN b.period = 1 THEN b.\`to\` ELSE 0 END)          AS to_,
               SUM(CASE WHEN b.period = 1 THEN b.pf    ELSE 0 END)           AS pf,
               SUM(CASE WHEN b.period = 1 THEN b.pts   ELSE 0 END)           AS pts
        FROM player_seasons ps
        JOIN players pl ON pl.player_id = ps.player_id
        JOIN team_schedules tsch
          ON tsch.team_id = ps.team_id AND tsch.season_id = ps.season_id
        JOIN boxscores b
          ON b.competition_id = tsch.competition_id AND b.player_id = pl.player_id
        WHERE ps.team_id = ? AND ps.season_id = ?
        GROUP BY pl.player_id, pl.first_name, pl.last_name, ps.jersey_number
        ORDER BY ps.jersey_number + 0, ps.jersey_number
      `, [teamId, seasonId]);

      const [[teamStats]] = await conn.execute(`
        SELECT COALESCE(SUM(tgs.oreb), 0) AS oreb,
               COALESCE(SUM(tgs.dreb), 0) AS dreb,
               COALESCE(SUM(tgs.reb),  0) AS reb,
               COALESCE(SUM(tgs.\`to\`), 0) AS to_
        FROM team_game_stats tgs
        JOIN team_schedules tsch
          ON tsch.competition_id = tgs.competition_id AND tsch.team_id = tgs.team_id
        WHERE tgs.team_id = ? AND tsch.season_id = ? AND tgs.period = 1
      `, [teamId, seasonId]);

      const tot = players.reduce((acc, r) => {
        for (const k of ['gp','fgm','fga','tpm','tpa','ftm','fta','oreb','dreb','reb','ast','stl','blk','to_','pf','pts'])
          acc[k] = (acc[k] || 0) + Number(r[k]);
        acc.ppg_sum = (acc.ppg_sum || 0) + Number(r.pts) / Math.max(Number(r.gp), 1);
        return acc;
      }, {});
      const hasTeamStats = teamStats && (teamStats.oreb || teamStats.dreb || teamStats.reb || teamStats.to_);

      function playerRow(r, isTot) {
        const gp = Math.max(Number(r.gp), 1);
        return `<tr${isTot ? ' class="tot"' : ''}>
          <td>${isTot ? '' : esc(r.jersey_number)}</td>
          <td>${isTot ? 'Totals' : esc(`${r.first_name} ${r.last_name}`)}</td>
          <td style="text-align:right">${r.gp}</td>
          <td style="text-align:right">${isTot ? '' : r.gs}</td>
          <td style="text-align:right">${isTot ? '' : fmtMin(r.min_tot)}</td>
          <td style="text-align:right">${isTot ? '' : (Number(r.min_tot) / 60 / gp).toFixed(1)}</td>
          <td style="text-align:right">${r.fgm}</td><td style="text-align:right">${r.fga}</td>
          <td style="text-align:right">${isTot ? pct(tot.fgm, tot.fga) : pct(r.fgm, r.fga)}</td>
          <td style="text-align:right">${r.tpm}</td><td style="text-align:right">${r.tpa}</td>
          <td style="text-align:right">${isTot ? pct(tot.tpm, tot.tpa) : pct(r.tpm, r.tpa)}</td>
          <td style="text-align:right">${r.ftm}</td><td style="text-align:right">${r.fta}</td>
          <td style="text-align:right">${isTot ? pct(tot.ftm, tot.fta) : pct(r.ftm, r.fta)}</td>
          <td style="text-align:right">${r.oreb}</td><td style="text-align:right">${r.dreb}</td>
          <td style="text-align:right">${r.reb}</td>
          <td style="text-align:right">${(Number(r.reb) / gp).toFixed(1)}</td>
          <td style="text-align:right">${r.pf}</td>
          <td style="text-align:right">${r.ast}</td>
          <td style="text-align:right">${r.to_}</td>
          <td style="text-align:right">${r.blk}</td>
          <td style="text-align:right">${r.stl}</td>
          <td style="text-align:right;font-weight:bold">${r.pts}</td>
          <td style="text-align:right">${isTot ? tot.ppg_sum.toFixed(1) : (Number(r.pts) / gp).toFixed(1)}</td>
        </tr>`;
      }

      const tbl = `<table style="width:100%">
        <tr>
          <th class="l" rowspan="2" style="vertical-align:bottom">#</th>
          <th class="l" rowspan="2" style="vertical-align:bottom">Player</th>
          <th rowspan="2" style="vertical-align:bottom">GP</th>
          <th rowspan="2" style="vertical-align:bottom">GS</th>
          <th rowspan="2" style="vertical-align:bottom">MIN</th>
          <th rowspan="2" style="vertical-align:bottom">AVG</th>
          <th colspan="3">TOTAL FG</th>
          <th colspan="3">3-PT FG</th>
          <th colspan="3">FREE THROWS</th>
          <th colspan="4">REBOUNDS</th>
          <th rowspan="2" style="vertical-align:bottom">PF</th>
          <th rowspan="2" style="vertical-align:bottom">A</th>
          <th rowspan="2" style="vertical-align:bottom">TO</th>
          <th rowspan="2" style="vertical-align:bottom">BLK</th>
          <th rowspan="2" style="vertical-align:bottom">ST</th>
          <th rowspan="2" style="vertical-align:bottom">PTS</th>
          <th rowspan="2" style="vertical-align:bottom">PPG</th>
        </tr>
        <tr>
          <th>FG</th><th>FGA</th><th>PCT</th>
          <th>FG</th><th>FGA</th><th>PCT</th>
          <th>FT</th><th>FTA</th><th>PCT</th>
          <th>OFF</th><th>DEF</th><th>TOT</th><th>R/G</th>
        </tr>
        ${players.map(p => playerRow(p, false)).join('')}
        ${hasTeamStats ? `<tr style="background:#f5f5f5;font-style:italic">
          <td></td><td>Team</td>
          <td colspan="13"></td>
          <td style="text-align:right">${teamStats.oreb}</td>
          <td style="text-align:right">${teamStats.dreb}</td>
          <td style="text-align:right">${teamStats.reb}</td>
          <td></td><td></td><td></td>
          <td style="text-align:right">${teamStats.to_}</td>
          <td colspan="4"></td>
        </tr>` : ''}
        ${playerRow(tot, true)}
      </table>`;

      res.send(page(`Season Stats – ${info.team_name} ${info.season_name}`,
        reportHeading(info, 'Season Stats', teamId, seasonId) + tbl));
    } catch (e) {
      res.status(500).send(esc(e.message));
    } finally {
      await conn?.end().catch(() => {});
    }
  });

  // ── GAME-BY-GAME PLAYER ───────────────────────────────────────────────────────

  router.get('/team/:teamId/season/:seasonId/game-by-game', async (req, res) => {
    const teamId   = parseInt(req.params.teamId);
    const seasonId = parseInt(req.params.seasonId);
    let conn;
    try {
      conn = await dbConnect();
      const info = await getInfo(conn, teamId, seasonId);
      if (!info) return res.status(404).send('Not found.');

      const games = await getGames(conn, teamId, seasonId);

      const [playerList] = await conn.execute(`
        SELECT pl.player_id, pl.first_name, pl.last_name, ps.jersey_number
        FROM player_seasons ps
        JOIN players pl ON pl.player_id = ps.player_id
        WHERE ps.team_id = ? AND ps.season_id = ?
        ORDER BY ps.jersey_number, pl.last_name, pl.first_name
      `, [teamId, seasonId]);

      const [allBs] = await conn.execute(`
        SELECT b.competition_id, b.player_id, MAX(b.started) AS started,
               SUM(b.fgm) AS fgm, SUM(b.fga) AS fga,
               SUM(b.tpm) AS tpm, SUM(b.tpa) AS tpa,
               SUM(b.ftm) AS ftm, SUM(b.fta) AS fta,
               SUM(b.oreb) AS oreb, SUM(b.dreb) AS dreb, SUM(b.reb) AS reb,
               SUM(b.ast) AS ast, SUM(b.\`to\`) AS to_,
               SUM(b.blk) AS blk, SUM(b.stl) AS stl,
               SUM(b.min) AS min, SUM(b.pf) AS pf, SUM(b.pts) AS pts
        FROM team_schedules tsch
        JOIN boxscores b
          ON b.competition_id = tsch.competition_id
        WHERE tsch.team_id = ? AND tsch.season_id = ?
        GROUP BY b.competition_id, b.player_id
      `, [teamId, seasonId]);

      // player_id → competition_id → stats
      const bsMap = new Map();
      for (const b of allBs) {
        if (!bsMap.has(b.player_id)) bsMap.set(b.player_id, new Map());
        bsMap.get(b.player_id).set(b.competition_id, b);
      }

      const colHdrs = `<tr>
        <th class="l" rowspan="2" style="vertical-align:bottom">Opponent</th>
        <th rowspan="2" style="vertical-align:bottom">GP</th>
        <th rowspan="2" style="vertical-align:bottom">GS</th>
        <th colspan="3">TOT-FG</th><th colspan="3">3-PT FG</th><th colspan="3">FREE THROWS</th>
        <th colspan="4">REBOUNDS</th>
        <th rowspan="2" style="vertical-align:bottom">PF</th>
        <th rowspan="2" style="vertical-align:bottom">A</th>
        <th rowspan="2" style="vertical-align:bottom">TO</th>
        <th rowspan="2" style="vertical-align:bottom">BLK</th>
        <th rowspan="2" style="vertical-align:bottom">ST</th>
        <th rowspan="2" style="vertical-align:bottom">MIN</th>
        <th rowspan="2" style="vertical-align:bottom">PTS</th>
      </tr>
      <tr>
        <th>FG</th><th>FGA</th><th>PCT</th>
        <th>FG</th><th>FGA</th><th>PCT</th>
        <th>FT</th><th>FTA</th><th>PCT</th>
        <th>OFF</th><th>DEF</th><th>TOT</th><th>R/G</th>
      </tr>`;

      let sections = '';
      for (const pl of playerList) {
        const pbsMap = bsMap.get(pl.player_id);
        if (!pbsMap || pbsMap.size === 0) continue;

        let gp=0, gs=0, mins=0, fgm=0, fga=0, tpm=0, tpa=0, ftm=0, fta=0,
            oreb=0, dreb=0, reb=0, ast=0, to_=0, blk=0, stl=0, pf=0, pts=0;
        let rows = '';

        for (const g of games) {
          const b = pbsMap.get(g.competition_id);
          if (!b) {
            rows += `<tr><td>${esc(g.opponent_name)}</td>
              <td style="color:#999;text-align:center">DNP</td>
              <td colspan="21"></td></tr>`;
            continue;
          }
          gp++; if (b.started) gs++;
          mins += Number(b.min); fgm += Number(b.fgm); fga += Number(b.fga);
          tpm  += Number(b.tpm); tpa += Number(b.tpa); ftm += Number(b.ftm); fta += Number(b.fta);
          oreb += Number(b.oreb); dreb += Number(b.dreb); reb += Number(b.reb);
          ast  += Number(b.ast); to_  += Number(b.to_); blk += Number(b.blk);
          stl  += Number(b.stl); pf   += Number(b.pf); pts += Number(b.pts);

          rows += `<tr>
            <td>${esc(g.opponent_name)}</td>
            <td style="text-align:center">1</td>
            <td style="text-align:center">${b.started ? '1' : ''}</td>
            <td style="text-align:right">${b.fgm}</td><td style="text-align:right">${b.fga}</td>
            <td style="text-align:right">${pct(b.fgm, b.fga)}</td>
            <td style="text-align:right">${b.tpm}</td><td style="text-align:right">${b.tpa}</td>
            <td style="text-align:right">${pct(b.tpm, b.tpa)}</td>
            <td style="text-align:right">${b.ftm}</td><td style="text-align:right">${b.fta}</td>
            <td style="text-align:right">${pct(b.ftm, b.fta)}</td>
            <td style="text-align:right">${b.oreb}</td><td style="text-align:right">${b.dreb}</td>
            <td style="text-align:right">${b.reb}</td><td></td>
            <td style="text-align:right">${b.pf}</td>
            <td style="text-align:right">${b.ast}</td>
            <td style="text-align:right">${b.to_}</td>
            <td style="text-align:right">${b.blk}</td>
            <td style="text-align:right">${b.stl}</td>
            <td style="text-align:right">${fmtMin(b.min)}</td>
            <td style="text-align:right;font-weight:bold">${b.pts}</td>
          </tr>`;
        }

        rows += `<tr class="tot">
          <td>Totals</td>
          <td style="text-align:center">${gp}</td>
          <td style="text-align:center">${gs}</td>
          <td style="text-align:right">${fgm}</td><td style="text-align:right">${fga}</td>
          <td style="text-align:right">${pct(fgm, fga)}</td>
          <td style="text-align:right">${tpm}</td><td style="text-align:right">${tpa}</td>
          <td style="text-align:right">${pct(tpm, tpa)}</td>
          <td style="text-align:right">${ftm}</td><td style="text-align:right">${fta}</td>
          <td style="text-align:right">${pct(ftm, fta)}</td>
          <td style="text-align:right">${oreb}</td><td style="text-align:right">${dreb}</td>
          <td style="text-align:right">${reb}</td>
          <td style="text-align:right">${gp ? (reb / gp).toFixed(1) : 0}</td>
          <td style="text-align:right">${pf}</td>
          <td style="text-align:right">${ast}</td>
          <td style="text-align:right">${to_}</td>
          <td style="text-align:right">${blk}</td>
          <td style="text-align:right">${stl}</td>
          <td style="text-align:right">${fmtMin(mins)}</td>
          <td style="text-align:right;font-weight:bold">${pts}</td>
        </tr>`;

        sections += `<h2>${esc(pl.jersey_number)} ${esc(pl.first_name)} ${esc(pl.last_name)}</h2>
        <table style="width:100%">${colHdrs}${rows}</table>`;
      }

      res.send(page(`Game by Game – ${info.team_name} ${info.season_name}`,
        reportHeading(info, 'Player Game by Game', teamId, seasonId) + sections));
    } catch (e) {
      res.status(500).send(esc(e.message));
    } finally {
      await conn?.end().catch(() => {});
    }
  });

  // ── PLAYER HIGHS ─────────────────────────────────────────────────────────────

  router.get('/team/:teamId/season/:seasonId/highs', async (req, res) => {
    const teamId   = parseInt(req.params.teamId);
    const seasonId = parseInt(req.params.seasonId);
    let conn;
    try {
      conn = await dbConnect();
      const info = await getInfo(conn, teamId, seasonId);
      if (!info) return res.status(404).send('Not found.');

      const [allStats] = await conn.execute(`
        SELECT b.competition_id, pl.first_name, pl.last_name,
               opp.name AS opponent_name, c.start_time,
               b.pts, b.reb, b.ast, b.stl, b.blk,
               b.fgm, b.fga, b.tpm, b.tpa, b.ftm, b.fta,
               b.oreb, b.dreb, b.pf
        FROM team_schedules tsch
        JOIN competitions c ON c.competition_id = tsch.competition_id
        JOIN teams opp ON opp.team_id =
          CASE WHEN c.team_id = ? THEN c.opponent_id ELSE c.team_id END
        JOIN boxscores b ON b.competition_id = tsch.competition_id AND b.period = 1
        JOIN player_seasons ps
          ON ps.player_id = b.player_id
          AND ps.team_id = tsch.team_id AND ps.season_id = tsch.season_id
        JOIN players pl ON pl.player_id = b.player_id
        WHERE tsch.team_id = ? AND tsch.season_id = ?
      `, [teamId, teamId, seasonId]);

      const cats = [
        { label: 'Total Points',             field: 'pts'  },
        { label: 'Field Goals Made',         field: 'fgm'  },
        { label: 'Field Goals Attempted',    field: 'fga'  },
        { label: '3-Point FG Made',          field: 'tpm'  },
        { label: '3-Point FG Attempted',     field: 'tpa'  },
        { label: 'Free Throws Made',         field: 'ftm'  },
        { label: 'Free Throws Attempted',    field: 'fta'  },
        { label: 'Total Rebounds',           field: 'reb'  },
        { label: 'Offensive Rebounds',       field: 'oreb' },
        { label: 'Defensive Rebounds',       field: 'dreb' },
        { label: 'Assists',                  field: 'ast'  },
        { label: 'Steals',                   field: 'stl'  },
        { label: 'Blocks',                   field: 'blk'  },
        { label: 'Personal Fouls',           field: 'pf'   },
      ];

      let rows = '';
      for (const cat of cats) {
        const max = Math.max(0, ...allStats.map(r => Number(r[cat.field])));
        if (!max) continue;
        const top = allStats.filter(r => Number(r[cat.field]) === max);
        rows += `<tr><td colspan="5"><hr style="border:none;border-top:1px solid #ddd;margin:3px 0"></td></tr>`;
        let first = true;
        for (const r of top) {
          rows += `<tr>
            <td style="width:200px">${first ? esc(cat.label) : ''}</td>
            <td style="text-align:right;padding-right:10px;font-weight:bold">${max}</td>
            <td>${esc(`${r.first_name} ${r.last_name}`)}</td>
            <td style="padding-left:8px">vs ${esc(r.opponent_name)}</td>
            <td style="padding-left:8px">${esc(fmtDate(r.start_time))}</td>
          </tr>`;
          first = false;
        }
      }

      const tbl = `<table>
        <tr>
          <th class="l" style="width:200px"></th>
          <th style="padding-right:10px">High</th>
          <th class="l">Player</th>
          <th class="l" style="padding-left:8px">Opponent</th>
          <th class="l" style="padding-left:8px">Date</th>
        </tr>
        ${rows}
      </table>`;

      res.send(page(`Player Highs – ${info.team_name} ${info.season_name}`,
        reportHeading(info, 'Player Highs', teamId, seasonId) + tbl));
    } catch (e) {
      res.status(500).send(esc(e.message));
    } finally {
      await conn?.end().catch(() => {});
    }
  });

  // ── INDIVIDUAL BOXSCORE ───────────────────────────────────────────────────────

  router.get('/team/:teamId/season/:seasonId/box/:competitionId', async (req, res) => {
    const teamId        = parseInt(req.params.teamId);
    const seasonId      = parseInt(req.params.seasonId);
    const competitionId = parseInt(req.params.competitionId);
    let conn;
    try {
      conn = await dbConnect();
      const info = await getInfo(conn, teamId, seasonId);
      if (!info) return res.status(404).send('Not found.');

      const [[comp]] = await conn.execute(`
        SELECT c.competition_id, c.start_time,
               c.season_id   AS home_season_id,
               c.team_id     AS home_team_id,  ht.name AS home_team,
               c.opponent_id AS away_team_id,  vt.name AS away_team
        FROM competitions c
        JOIN teams ht ON ht.team_id = c.team_id
        JOIN teams vt ON vt.team_id = c.opponent_id
        WHERE c.competition_id = ?
      `, [competitionId]);
      if (!comp) return res.status(404).send('Game not found.');

      // Away team's season_id
      const [[awayRow]] = await conn.execute(
        `SELECT season_id FROM team_schedules WHERE competition_id = ? AND team_id = ? LIMIT 1`,
        [competitionId, comp.away_team_id]
      );
      const awaySeasonId = awayRow?.season_id ?? comp.home_season_id;

      // Period scores
      const [periodRows] = await conn.execute(
        `SELECT team_id, period_num, score FROM periods WHERE competition_id = ? ORDER BY period_num`,
        [competitionId]
      );
      const periodNums = [...new Set(periodRows.map(p => Number(p.period_num)))].sort((a, b) => a - b);
      const spMap = new Map(periodRows.map(p => [`${p.team_id}-${p.period_num}`, Number(p.score)]));
      const teamTotal = tid => periodRows
        .filter(p => Number(p.team_id) === Number(tid))
        .reduce((s, p) => s + Number(p.score), 0);

      // Player stats – join against both teams' player_seasons
      // SUM across all periods: works for full-game-only games (one period=1 row)
      // and for per-quarter games (period=1..4 where period=1 is Q1, not full game)
      const [players] = await conn.execute(`
        SELECT b.player_id, pl.first_name, pl.last_name,
               MAX(b.jersey_number) AS jersey_number,
               MAX(b.started) AS started,
               SUM(b.min) AS min, SUM(b.fgm) AS fgm, SUM(b.fga) AS fga,
               SUM(b.tpm) AS tpm, SUM(b.tpa) AS tpa,
               SUM(b.ftm) AS ftm, SUM(b.fta) AS fta,
               SUM(b.oreb) AS oreb, SUM(b.dreb) AS dreb, SUM(b.reb) AS reb,
               SUM(b.ast) AS ast, SUM(b.\`to\`) AS to_,
               SUM(b.blk) AS blk, SUM(b.stl) AS stl, SUM(b.pf) AS pf,
               SUM(b.pts) AS pts,
               COALESCE(MAX(psh.team_id), MAX(psa.team_id)) AS player_team_id
        FROM boxscores b
        JOIN players pl ON pl.player_id = b.player_id
        LEFT JOIN player_seasons psh
          ON psh.player_id = b.player_id
          AND psh.season_id = ? AND psh.team_id = ?
        LEFT JOIN player_seasons psa
          ON psa.player_id = b.player_id
          AND psa.season_id = ? AND psa.team_id = ?
        WHERE b.competition_id = ?
        GROUP BY b.player_id, pl.first_name, pl.last_name
        ORDER BY COALESCE(MAX(psh.team_id), MAX(psa.team_id)), SUM(b.pts) DESC
      `, [comp.home_season_id, comp.home_team_id, awaySeasonId, comp.away_team_id, competitionId]);

      const boxHdr = `<tr>
        <th class="l">#</th><th class="l">Player</th><th></th>
        <th>FG-A</th><th>3P-A</th><th>FT-A</th>
        <th>OR</th><th>DR</th><th>REB</th>
        <th>PF</th><th>A</th><th>TO</th><th>BLK</th><th>ST</th>
        <th>MIN</th><th>PTS</th>
      </tr>`;

      function teamBox(tid) {
        const tp = players.filter(p => Number(p.player_team_id) === Number(tid));
        if (!tp.length) return `<tr><td colspan="16" style="color:#999">No stats</td></tr>`;
        let fgm=0,fga=0,tpm=0,tpa=0,ftm=0,fta=0,oreb=0,dreb=0,reb=0,
            ast=0,to_=0,blk=0,stl=0,pf=0,pts=0;
        let rows = tp.map(p => {
          fgm+=Number(p.fgm); fga+=Number(p.fga); tpm+=Number(p.tpm); tpa+=Number(p.tpa);
          ftm+=Number(p.ftm); fta+=Number(p.fta); oreb+=Number(p.oreb); dreb+=Number(p.dreb);
          reb+=Number(p.reb); ast+=Number(p.ast); to_+=Number(p.to_); blk+=Number(p.blk);
          stl+=Number(p.stl); pf+=Number(p.pf); pts+=Number(p.pts);
          return `<tr>
            <td>${esc(p.jersey_number)}</td>
            <td>${p.started ? '<b>' : ''}${esc(`${p.first_name} ${p.last_name}`)}${p.started ? '</b>' : ''}</td>
            <td style="text-align:center;color:#666">${p.started ? '*' : ''}</td>
            <td style="text-align:center">${p.fgm}-${p.fga}</td>
            <td style="text-align:center">${p.tpm}-${p.tpa}</td>
            <td style="text-align:center">${p.ftm}-${p.fta}</td>
            <td style="text-align:right">${p.oreb}</td><td style="text-align:right">${p.dreb}</td>
            <td style="text-align:right">${p.reb}</td>
            <td style="text-align:right">${p.pf}</td>
            <td style="text-align:right">${p.ast}</td>
            <td style="text-align:right">${p.to_}</td>
            <td style="text-align:right">${p.blk}</td>
            <td style="text-align:right">${p.stl}</td>
            <td style="text-align:right">${fmtMin(p.min)}</td>
            <td style="text-align:right;font-weight:bold">${p.pts}</td>
          </tr>`;
        }).join('');
        rows += `<tr class="tot">
          <td colspan="2">Totals</td><td></td>
          <td style="text-align:center">${fgm}-${fga}</td>
          <td style="text-align:center">${tpm}-${tpa}</td>
          <td style="text-align:center">${ftm}-${fta}</td>
          <td style="text-align:right">${oreb}</td><td style="text-align:right">${dreb}</td>
          <td style="text-align:right">${reb}</td>
          <td style="text-align:right">${pf}</td>
          <td style="text-align:right">${ast}</td>
          <td style="text-align:right">${to_}</td>
          <td style="text-align:right">${blk}</td>
          <td style="text-align:right">${stl}</td>
          <td></td>
          <td style="text-align:right;font-weight:bold">${pts}</td>
        </tr>`;
        return rows;
      }

      const scoreBoard = periodNums.length ? `
        <table style="margin:0 auto 14px;border:1px solid #ccc">
          <tr style="background:#eee">
            <th class="l" style="padding:3px 12px;min-width:160px">Team</th>
            ${periodNums.map(n => `<th style="padding:3px 10px">${n}</th>`).join('')}
            <th style="padding:3px 12px">Final</th>
          </tr>
          <tr>
            <td style="padding:3px 12px">${esc(comp.home_team)}</td>
            ${periodNums.map(n => `<td style="text-align:center;padding:3px 10px">${spMap.get(`${comp.home_team_id}-${n}`) ?? 0}</td>`).join('')}
            <td style="text-align:center;padding:3px 12px;font-weight:bold">${teamTotal(comp.home_team_id)}</td>
          </tr>
          <tr>
            <td style="padding:3px 12px">${esc(comp.away_team)}</td>
            ${periodNums.map(n => `<td style="text-align:center;padding:3px 10px">${spMap.get(`${comp.away_team_id}-${n}`) ?? 0}</td>`).join('')}
            <td style="text-align:center;padding:3px 12px;font-weight:bold">${teamTotal(comp.away_team_id)}</td>
          </tr>
        </table>` : '';

      const body =
        `<p style="text-align:center;margin:0 0 10px;font-size:11px;color:#555">${esc(fmtDate(comp.start_time))}</p>
        ${scoreBoard}
        <h2>${esc(comp.home_team)}</h2>
        <table style="width:100%">${boxHdr}${teamBox(comp.home_team_id)}</table>
        <h2>${esc(comp.away_team)}</h2>
        <table style="width:100%">${boxHdr}${teamBox(comp.away_team_id)}</table>
        <p class="small" style="margin-top:8px">* starter</p>`;

      const title = `Box Score – ${comp.home_team} vs ${comp.away_team} ${fmtDate(comp.start_time)}`;
      res.send(page(title,
        reportHeading(info, `Box Score: ${comp.home_team} vs ${comp.away_team}`, teamId, seasonId) + body));
    } catch (e) {
      res.status(500).send(esc(e.message));
    } finally {
      await conn?.end().catch(() => {});
    }
  });

  return router;
};
