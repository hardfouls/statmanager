# TeamManager → StatManager Integration Design

**Goal:** Replace the TeamManager WordPress plugin's direct database connection to
`kvhs_basketball` / `dakstats_history` with HTTP calls to the StatManager API.
The plugin displays read-only public stats; StatManager becomes the single source of truth.

---

## Design Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Boxscore links in schedule | Open a new WordPress page using a JSON-driven `[TM_Boxscore]` shortcode — no iframe modal |
| 2 | Public API access control | Read-only API tokens with scope enforcement; plugin receives a `read`-scoped token, not the admin key |
| 3 | Season label format | StatManager exposes a `label` field (`"YYYY-YYYY"`) on all season responses; plugin never reconstructs it |
| 4 | Pre-2013 historical data | Import into StatManager's existing tables; DakStats XML import runs first (creates KVHS team), kvhs history import runs last |

---

## Current Architecture

```
WordPress (Hardfouls.com)
  └── TeamManager Plugin
        └── StatsManager (class-stats-manager.php)
              └── mysqli → kvhs_basketball + dakstats_history (MariaDB)
```

`StatsManager` opens a raw `mysqli` connection using credentials stored in WordPress
options (`tm_stats_server`, `tm_stats_user`, `tm_stats_pwd`, `tm_stats_schema`).
Three shortcodes consume it:

| Shortcode | Data source |
|---|---|
| `[TM_StatTable]` | `career_totals`, `season_totals_all`, `season_totals_dakstats`, `playergame_view` views |
| `[TM_TeamSchedule]` | `kvhs_basketball.getSchedule(tmid, season)` stored procedure |
| `[TM_TeamRoster]` | `rosters` view (backed by `dakstats_history.rosters`) |

---

## Target Architecture

```
WordPress (Hardfouls.com)
  └── TeamManager Plugin
        └── StatManagerApiClient (new PHP class)
              └── HTTPS + X-Api-Key → StatManager /api/public/* routes
                                              └── MariaDB (statmanager DB)
```

---

## Gap Analysis

### What StatManager already exposes

| Endpoint | Serves |
|---|---|
| `GET /api/teams` | All teams |
| `GET /api/seasons` | All seasons (with team filter) |
| `GET /api/players` | Players (with team/season filter) |
| `GET /api/players/:id/games` | Per-game stats for one player |
| `GET /api/games/:id/boxscore` | Full boxscore for one game |

### What needs to be added to StatManager

| New Endpoint | Replaces |
|---|---|
| `GET /api/public/teams/:id/roster?season_id=` | `rosters` view query |
| `GET /api/public/teams/:id/schedule?season_id=` | `getSchedule()` stored proc |
| `GET /api/public/games/:id/boxscore` | Static HTML boxscore files |
| `GET /api/public/stats/season?season_id=&keystat=&...` | `season_totals_all` view query |
| `GET /api/public/stats/career?keystat=&mintotal=&...` | `career_totals` view query |
| `GET /api/public/stats/games?player_id=&season_id=` | `playergame_view` query |

All new endpoints live under `/api/public/` and require only an `X-Api-Key` header
(no session cookie), so WordPress can call them from server-side PHP.

---

## Historical Data Plan

The `career_totals` view currently aggregates two sources:
- **2013–present:** `dakstats_history.season_totals` (DakStats / StatCrew XML imports)
- **Pre-2013:** `kvhs_basketball.season_totals_other` (manually entered KVHS history)

Both use the same column structure. Both will be imported into StatManager's existing
`players`, `player_seasons`, and `boxscores` tables — no separate historical table needed.

**Migration order:**

1. **DakStats XML import first** (existing XML wizard already handles this).
   This creates the KVHS team record and all 2013+ seasons, players, and game stats.
2. **kvhs_basketball history import last** (new one-time migration script).
   KVHS already exists from step 1 — no team creation needed. The script matches
   players by name to existing `players` rows (creating new rows for any pre-2013
   players not yet in the DB), creates pre-2013 season records, and inserts
   season-aggregate stats into `boxscores` as pseudo-records with a
   `record_type = 'season_total'` flag to distinguish them from game-level rows.

After both imports, the `/api/public/stats/career` endpoint aggregates across the
full program history from a single table. The `kvhs_basketball` and `dakstats_history`
databases are no longer needed by either the plugin or StatManager.

---

## StatManager Changes Required

### 1. Read-only API token system

Replace the single `tm_api_key` concept with a proper token table so that tokens
can be scoped, revoked individually, and audited.

**Schema — new `api_tokens` table:**
```sql
CREATE TABLE api_tokens (
    token_id    INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    token_hash  VARCHAR(64)      NOT NULL,        -- SHA-256 of the raw token
    label       VARCHAR(100)     NOT NULL,
    scope       ENUM('read','admin') NOT NULL DEFAULT 'read',
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME        NULL,
    PRIMARY KEY (token_id),
    UNIQUE KEY ux_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Middleware:**
```js
async function requireReadToken(req, res, next) {
    const raw = req.headers['x-api-key'];
    if (!raw) return res.status(401).json({ error: 'missing token' });
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const [rows] = await pool.query(
        'SELECT token_id, scope FROM api_tokens WHERE token_hash = ?', [hash]
    );
    if (!rows.length) return res.status(401).json({ error: 'invalid token' });
    if (rows[0].scope !== 'read' && rows[0].scope !== 'admin')
        return res.status(403).json({ error: 'insufficient scope' });
    pool.query('UPDATE api_tokens SET last_used_at = NOW() WHERE token_id = ?',
        [rows[0].token_id]);
    next();
}
```

Apply `requireReadToken` to all `/api/public/*` routes.

**StatManager UI — Tokens tab in Settings:**
- List all tokens with label, scope, created date, last-used date.
- "New Token" button: enter label + scope, receive the raw token once (never stored — only the hash is kept).
- Revoke button per token.

**Plugin configuration:**
- Issue the TeamManager plugin a `read`-scoped token.
- Store as `tm_statmanager_api_key` WordPress option.
- Pass as `X-Api-Key: <token>` header on every `wp_remote_get()` call.

### 2. Season `label` field

All season responses (existing `GET /api/seasons` and new `/api/public/` routes)
must include a `label` field built server-side:

```js
label: `${row.start_year}-${row.end_year}`
```

The plugin always passes and receives season labels as strings; it never constructs
them from year integers.

### 3. Team `external_code` column

StatManager identifies teams by integer `team_id`. The plugin uses `TEAMCODE = 'KVHS02'`.

Add `external_code VARCHAR(20) NULL` to the `teams` table. Set `external_code = 'KVHS02'`
for the KVHS team via the StatManager UI after the DakStats import. Expose it in
`GET /api/teams` and `GET /api/public/teams?code=KVHS02` so the plugin can resolve
a code to an integer ID (cached as a WordPress transient for 24 hours).

### 4. New endpoint: roster

```
GET /api/public/teams/:id/roster?season_id=<id>
X-Api-Key: <read-token>
```

Response:
```json
[
  {
    "player_id": 42,
    "first_name": "John",
    "last_name": "Smith",
    "jersey_number": "23",
    "position": "G",
    "height": "6-2",
    "grad_year": "2026"
  }
]
```

Query: JOIN `players` + `player_seasons` filtered by `team_id` and `season_id`.

### 5. New endpoint: schedule

```
GET /api/public/teams/:id/schedule?season_id=<id>
X-Api-Key: <read-token>
```

Response:
```json
[
  {
    "competition_id": 101,
    "game_date": "2026-01-15",
    "game_time": "19:00",
    "location": "Away",
    "opponent": "Riverview",
    "pts_for": 68,
    "pts_against": 55,
    "result": "W",
    "record": "3-1"
  }
]
```

Running W/L record computed in Node.js by iterating games in date order after the
query returns. Games with no score yet (`pts_for` is null) have `result: null` and
`record: null`. `location` is `"Home"` or `"Away"` derived from the `team_schedules`
`vh` column.

### 6. New endpoint: public boxscore

```
GET /api/public/games/:id/boxscore
X-Api-Key: <read-token>
```

Mirrors the existing authenticated `GET /api/games/:id/boxscore` response shape.
Used by the WordPress `[TM_Boxscore]` shortcode (see Plugin Changes §5).

### 7. New endpoint: season stats

```
GET /api/public/stats/season?team_id=<id>&season_id=<id>&keystat=pts&mintotal=0&mingames=0&maxrows=0
X-Api-Key: <read-token>
```

Response: array sorted descending by `keystat`. Fields use the same names as the
existing `TM_StatTable` shortcode (`pts`, `rebs`, `assists`, `steals`, `blocks`,
`Played`, `ppg`, `eff`, `FGP`, `3PP`, `fouls`, `rpg`, `bpg`).

`keystat` is validated against an allowlist before being interpolated into SQL
(mirrors `StatsManager::isAllowedIdentifier()`).

### 8. New endpoint: career stats leaderboard

```
GET /api/public/stats/career?keystat=pts&mintotal=0&mingames=0&minseasons=0&maxrows=0&constraint=&constraintmin=0
X-Api-Key: <read-token>
```

Same response shape as season stats but aggregated per player via GROUP BY across
all seasons (including pre-2013 rows once the historical import is complete). Maps
to what the `career_totals` view provides today.

### 9. New endpoint: player game log

```
GET /api/public/stats/games?player_id=<id>&season_id=<id>
X-Api-Key: <read-token>
```

Backs the `extracols=gamedate, opponent` case in `TM_StatTable`. Can alias the
existing `/api/players/:id/games` logic.

---

## TeamManager Plugin Changes Required

### 1. New `StatManagerApiClient` class

Replace `class-stats-manager.php` with a new file. Keep the filename to avoid
touching `team-manager.php`'s `require` statement, or update the require.

```php
class StatManagerApiClient {
    private string $baseUrl;
    private string $apiKey;

    public function __construct() {
        $this->baseUrl = rtrim(get_option('tm_statmanager_url', ''), '/');
        $this->apiKey  = get_option('tm_statmanager_api_key', '');
    }

    private function get(string $path, array $params = []): array|false {
        $url  = $this->baseUrl . $path;
        if ($params) $url .= '?' . http_build_query($params);
        $resp = wp_remote_get($url, [
            'timeout' => 10,
            'headers' => ['X-Api-Key' => $this->apiKey],
        ]);
        if (is_wp_error($resp) || wp_remote_retrieve_response_code($resp) !== 200)
            return false;
        return json_decode(wp_remote_retrieve_body($resp), true) ?? false;
    }

    public function resolveTeamId(string $code): int|false {
        $cached = get_transient("tm_team_id_$code");
        if ($cached !== false) return (int) $cached;
        $rows = $this->get('/api/public/teams', ['code' => $code]);
        if (!$rows || empty($rows[0]['team_id'])) return false;
        set_transient("tm_team_id_$code", $rows[0]['team_id'], DAY_IN_SECONDS);
        return (int) $rows[0]['team_id'];
    }

    public function resolveSeasonId(int $teamId, string $label): int|false {
        $key    = "tm_season_id_{$teamId}_$label";
        $cached = get_transient($key);
        if ($cached !== false) return (int) $cached;
        $rows = $this->get('/api/public/seasons', ['team_id' => $teamId, 'label' => $label]);
        if (!$rows || empty($rows[0]['season_id'])) return false;
        set_transient($key, $rows[0]['season_id'], DAY_IN_SECONDS);
        return (int) $rows[0]['season_id'];
    }

    public function getRoster(int $teamId, int $seasonId): array|false {
        return $this->get("/api/public/teams/$teamId/roster", ['season_id' => $seasonId]);
    }

    public function getSchedule(int $teamId, int $seasonId): array|false {
        return $this->get("/api/public/teams/$teamId/schedule", ['season_id' => $seasonId]);
    }

    public function getBoxscore(int $competitionId): array|false {
        return $this->get("/api/public/games/$competitionId/boxscore");
    }

    public function getCareerStats(array $params): array|false {
        return $this->get('/api/public/stats/career', $params);
    }

    public function getSeasonStats(array $params): array|false {
        return $this->get('/api/public/stats/season', $params);
    }

    public function getCurrentSeason(): string {
        $year  = (int) date('Y');
        $month = (int) date('m');
        return $month > 6 ? $year . '-' . ($year + 1) : ($year - 1) . '-' . $year;
    }
}
```

`wp_remote_get` is the correct WordPress HTTP abstraction — never use `curl` or
`file_get_contents` directly.

### 2. Updated WordPress options

| Old option | New option | Purpose |
|---|---|---|
| `tm_stats_server` | `tm_statmanager_url` | Base URL, e.g. `http://192.168.86.38:3000` |
| `tm_stats_user` | *(remove)* | No longer needed |
| `tm_stats_pwd` | `tm_statmanager_api_key` | Read-scoped API token |
| `tm_stats_schema` | *(remove)* | No longer needed |

Keep the old `register_setting` calls until old options are confirmed unused, then
remove them along with the `mysqli` connection.

### 3. Updated `createTeamRoster()`

```php
$client   = new StatManagerApiClient();
$teamId   = $client->resolveTeamId($tm_atts['teamcode']);
$seasonId = $client->resolveSeasonId($teamId, $tm_atts['season'] ?: $client->getCurrentSeason());
$players  = $client->getRoster($teamId, $seasonId);

foreach ($players as $p) {
    $output .= "<tr>";
    $output .= "<td>" . esc_html($p['jersey_number']) . "</td>";
    $output .= "<td>" . esc_html($p['first_name']) . " " . esc_html($p['last_name']) . "</td>";
    $output .= "<td>" . esc_html($p['height'])         . "</td>";
    $output .= "<td>" . esc_html($p['grad_year'])      . "</td>";
    $output .= "<td>" . esc_html($p['position'])       . "</td>";
    $output .= "</tr>";
}
```

### 4. Updated `createTeamSchedule()`

```php
$client   = new StatManagerApiClient();
$teamId   = $client->resolveTeamId($tm_atts['teamcode']);
$seasonId = $client->resolveSeasonId($teamId, $tm_atts['season'] ?: $client->getCurrentSeason());
$games    = $client->getSchedule($teamId, $seasonId);

foreach ($games as $g) {
    // ... date, time, opponent, location columns ...
    if ($g['result']) {
        $score = $g['result'] === 'W'
            ? $g['pts_for']  . '-' . $g['pts_against']
            : $g['pts_against'] . '-' . $g['pts_for'];
        $output .= "<td>" . $g['result'] . ", " . esc_html($score) . "</td>";
        $output .= "<td>" . esc_html($g['record']) . "</td>";
        $boxUrl = get_permalink(get_page_by_path('boxscore'))
                . '?game=' . intval($g['competition_id']);
        $output .= "<td><a href='" . esc_url($boxUrl) . "'>Box Score</a></td>";
    } else {
        $output .= "<td></td><td></td><td></td>";
    }
}
```

The existing iframe modal and `#videoModal` wiring can be removed once all schedule
pages are updated.

### 5. New `createBoxscore()` shortcode / `[TM_Boxscore]`

A new WordPress page (slug: `boxscore`) is created with `[TM_Boxscore]` on it.
The shortcode reads `?game=<competition_id>` from `$_GET` and renders the boxscore
server-side from the StatManager API — no client-side JS required.

```php
function createBoxscore($atts = [], ?string $_content = null, string $tag = ''): string {
    $gameId = isset($_GET['game']) ? intval($_GET['game']) : 0;
    if (!$gameId) return '<p>No game specified.</p>';

    $client = new StatManagerApiClient();
    $data   = $client->getBoxscore($gameId);
    if (!$data)  return '<p>Boxscore not available.</p>';

    // render scoreline, period scores, and per-team player stat tables
    // using $data['home'], $data['visitor'], $data['periods']
    $output = "<div class='tm-boxscore'>";
    // ... HTML build ...
    $output .= "</div>";
    return $output;
}
add_shortcode('TM_Boxscore', 'createBoxscore');
```

Register the shortcode in `team-manager.php` alongside the existing three.

### 6. Updated `createStatsTable()`

```php
$client = new StatManagerApiClient();
$params = [
    'keystat'       => $tm_atts['keystat'],
    'mintotal'      => $tm_atts['mintotal'],
    'mingames'      => $tm_atts['mingames'],
    'maxrows'       => $tm_atts['maxrows'],
    'constraint'    => $tm_atts['constraint'],
    'constraintmin' => $tm_atts['constraintmin'],
];

if ($tm_atts['recordtype'] === 'career_totals') {
    $params['minseasons'] = $tm_atts['minseasons'];
    $rows = $client->getCareerStats($params);
} else {
    $teamId   = $client->resolveTeamId('KVHS02');
    $seasonId = $client->resolveSeasonId($teamId, $client->getCurrentSeason());
    $params  += ['team_id' => $teamId, 'season_id' => $seasonId];
    $rows     = $client->getSeasonStats($params);
}
```

`drawTableRows()` is updated to accept `array $rows` instead of `mysqli_result`.

---

## Security Considerations

- Raw tokens are never stored — only their SHA-256 hash. If the token table is
  dumped, no token can be recovered.
- `read`-scoped tokens cannot reach any mutating route (`POST`, `PUT`, `DELETE`).
- The plugin never exposes the token in frontend HTML or JavaScript. All API calls
  go server-side from WordPress PHP.
- StatManager's `statmanager.ini` is outside `public/` and never served over HTTP,
  so the token table's admin tools are not reachable by the plugin's token.
- If StatManager is ever internet-facing, add rate limiting on `/api/public/*`.

---

## Suggested Implementation Order

1. **StatManager:** Add `external_code` to `teams` table; expose in `GET /api/teams`.
2. **StatManager:** Add `label` field to all season responses.
3. **StatManager:** Implement `api_tokens` table, `requireReadToken` middleware,
   and Tokens tab in Settings UI.
4. **StatManager:** Implement `/api/public/teams/:id/roster`,
   `/api/public/teams/:id/schedule`, and `/api/public/games/:id/boxscore`.
5. **TeamManager:** Implement `StatManagerApiClient`, update `createTeamRoster()`
   and `createTeamSchedule()`, add `[TM_Boxscore]` shortcode, update Settings UI.
6. **StatManager:** Implement `/api/public/stats/season` and
   `/api/public/stats/career`.
7. **TeamManager:** Update `createStatsTable()` to use new stats endpoints.
   Remove `mysqli` dependency and old WordPress options.
8. **Data:** Run DakStats XML imports for all seasons via the StatManager Import
   wizard (creates KVHS team and 2013+ data).
9. **Data:** Run one-time kvhs history migration script to import pre-2013
   `kvhs_basketball.season_totals_other` into StatManager. KVHS team already
   exists from step 8; script only creates players and season records as needed.
10. **Cleanup:** Decommission direct DB access from the plugin. Confirm
    `kvhs_basketball` / `dakstats_history` are no longer needed by TeamManager.
