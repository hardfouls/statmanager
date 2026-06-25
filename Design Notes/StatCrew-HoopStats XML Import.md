# StatCrew / HoopStats XML Import

Analysis of the StatCrew-compatible XML format as exported by HoopStats and PrestoSports.

---

## Source Files Analyzed

| File | Source | Game | Date | Complete |
|------|--------|------|------|---------|
| `db/xml-imports/StatCrew_STM Saints_v_KVHS Blue Knights.xml` | HoopStats v1.13.8 | STM Saints (V, 107) @ KVHS Blue Knights (H, 83) — Leo Hayes HS (postseason) | 02/07/2026 | No (`complete="N"`) |
| `db/xml-imports/Prestosports-sample-game.xml` | PrestoSports v7.13.0 | UNBSJ (V, 91) @ Holland (H, 45) — MCCE (league regular season) | 2/21/2026 | Yes (`complete="Y"`) |

---

## Common XML Structure (both sources)

```
<bbgame source="..." version="...">
  <venue gameid="" visid="..." visname="..." homeid="..." homename="..."
         date="..." location="..." time="..." postseason="..." leaguegame="...">
    <rules prds="4" minutes="10" qh="Q">
    <officials>, <notes>
  <status complete="Y/N" period="4" clock="00:00">
  <team vh="V"> ... linescore, totals, players ...
  <team vh="H"> ... linescore, totals, players ...
  <plays format="tokens">
    <period number="1" time="10:00">
      <summary vh="V|H" ...>   ← period totals
      <play vh="..." uni="..." checkname="..." action="..." type="..." time="...">
      <clock time="00:00">
    </period>
    ...
  </plays>
</bbgame>
```

---

## Critical Observations

### 1. Player data coverage — the most important difference between sources

| Source | Visitor players | Home players |
|--------|----------------|--------------|
| HoopStats | **None** — team totals only | Full player stats |
| PrestoSports | Full player stats | Full player stats |

HoopStats appears to only export individual stats for the team that was operating the software. To get both sides from HoopStats you'd need two export files (one per team). PrestoSports exports both sides in a single file.

**Import implication:** HoopStats imports will always be one-sided unless two files are submitted. PrestoSports imports can be fully two-sided.

---

### 2. Explicit starter flag

- **HoopStats**: No `gs` attribute. To find starters, walk the play-by-play: players present before the first `SUB` action in period 1 were starters. Or leave `started = NULL`.
- **PrestoSports**: `gs="1"` on `<player>` elements that started. Clean and explicit.

---

### 3. Team IDs are source-internal, not useful for DB matching

- HoopStats: `homeid="KVHS "` — note trailing space; short code set at HoopStats setup time
- PrestoSports: `homeid="HOLLAND"` — cleaner but still arbitrary

Neither maps to the DB's `team_id`. The display name (`homename`, `visname`) is the only viable matching anchor.

---

### 4. Minutes are integer minutes, not seconds

Both sources store `min="31"` as whole minutes. The DB stores time in seconds. Import must multiply by 60.

In HoopStats, non-playing players (`gp="0"`) have `sec="+"` — treat as 0 minutes.  
In PrestoSports, non-playing players (`gp="0"`) have no `<stats>` child at all — treat as 0 for all fields.

---

### 5. Stat field name mapping (same for both sources)

| XML attribute | DB column | Note |
|---------------|-----------|------|
| `tp` | `tp` | Renamed from `pts` ✅ |
| `fgm3` / `fga3` | `fgm3` / `fga3` | Renamed from `tpm` / `tpa` ✅ |
| `treb` | `reb` | Different name; no rename needed |
| `to` | `to` | Already matched; no change |
| `tf` | `tf` | Added column ✅ |
| `dq` | `dq` | Added column ✅ |

---

### 6. Date format inconsistency between sources

- HoopStats: `date="02/07/2026"` — always zero-padded (MM/DD/YYYY)
- PrestoSports: `date="2/21/2026"` — no leading zeros

The parser must handle both. Use `new Date(dateString)` or a flexible parse, not a fixed-format split.

---

### 7. Period summary placement differs

- **HoopStats**: `<summary>` appears **after** all plays (bottom of `<period>`)
- **PrestoSports**: `<summary>` and `<special>` appear **before** all plays (top of `<period>`)

The parser should collect summaries regardless of position, not assume ordering.

---

### 8. Play-by-play `type` vocabulary differs

| HoopStats | PrestoSports | Notes |
|-----------|-------------|-------|
| `2PTR` | `JUMPER` or `LAYUP` | PrestoSports distinguishes shot type |
| `3PTR` | `3PTR` | Same |
| `FT` | `FT` | Same |
| `DEF` / `OFF` | `DEF` / `OFF` | Same (rebound types) |
| `FULL` | `FULL` | Timeout type |
| — | `DEADB` | Dead-ball rebound; not in HoopStats |
| — | `paint="Y"` attr | PrestoSports marks paint shots |

HoopStats plays also include a wall-clock `timeStamp="MM/DD/YYYY HH:MM:SS"` on every event. PrestoSports only has game clock `time`. Not relevant for boxscore import but matters if play-by-play is ever imported.

---

### 9. `comptype_id` mapping

PrestoSports provides both `leaguegame` and `postseason` flags; HoopStats only provides `postseason`.

| `leaguegame` | `postseason` | Suggested `comptype_id` |
|---|---|---|
| `Y` | `N` | Regular season league game |
| `N` | `N` | Exhibition / non-conference |
| `Y` or `N` | `Y` | Post-season |
| HoopStats (no `leaguegame`) | `Y` | Post-season |
| HoopStats (no `leaguegame`) | `N` | Unknown — prompt user |

---

### 10. PrestoSports-only fields with no DB column

| Field | Notes |
|-------|-------|
| `<special>` (per team, per period) | Advanced stats: `pts_bench`, `pts_paint`, `pts_fastb`, `pts_to`, `pts_ch2`, `large_lead` — potentially valuable for future schema extension |
| `deadball="0,3"` on totals | Dead-ball rebound counts |
| `dq="0"` per quarter | Disqualifications |
| `record="13-4, 13-4"` on team | Season W-L record at time of game |
| `playerId="..."` on player | PrestoSports internal ID — could be stored in a future `import_source` column for traceability |
| `neutralgame="N"` | Not in schema |
| `attend="0"` | Attendance |

---

## Full Field Mapping: XML → DB

| XML | DB |
|-----|----|
| `venue.date` + `venue.time` | `competitions.start_time` — parse both date formats |
| `venue.location` | `competitions.location` |
| `venue.homename` → team match | `competitions.team_id` |
| `venue.visname` → team match | `competitions.opponent_id` |
| `postseason` + `leaguegame` | `competitions.comptype_id` |
| `lineprd.score` | `periods.score` |
| `player.uni` | `boxscores.jersey_number` |
| `player.gs="1"` (PrestoSports) | `boxscores.started = 1` |
| `player.stats.min` × 60 | `boxscores.min` |
| `player.stats.fgm / fga` | `boxscores.fgm / fga` |
| `player.stats.fgm3 / fga3` | `boxscores.fgm3 / fga3` |
| `player.stats.ftm / fta` | `boxscores.ftm / fta` |
| `player.stats.oreb / dreb` | `boxscores.oreb / dreb` |
| `player.stats.treb` | `boxscores.reb` |
| `player.stats.ast` | `boxscores.ast` |
| `player.stats.stl` | `boxscores.stl` |
| `player.stats.blk` | `boxscores.blk` |
| `player.stats.to` | `boxscores.to` |
| `player.stats.pf` | `boxscores.pf` |
| `player.stats.tf` | `boxscores.tf` |
| `player.stats.dq` (PrestoSports only) | `boxscores.dq` |
| `player.stats.tp` | `boxscores.tp` |

---

## Design Decisions

### A. Team matching strategy
The XML gives a display name and a short code. The DB has `name` and `abbrev`. Options:

- **Exact name match** — simple but fragile ("KVHS Blue Knights" vs. "Kings Valley High School")
- **Auto-suggest + confirm** — score by token overlap or string similarity; surface top candidates; user picks
- **Manual-only** — always show a picker; never auto-apply

**Recommendation:** Auto-suggest by similarity, require explicit user confirmation.

---

### B. Season assignment
The XML has a game date but no concept of a season. Options:

- **User picks a season** during import — clearest
- **Infer from date** — find seasons where `start_date ≤ game_date ≤ end_date` for the matched team; offer as candidates
- **Both** — auto-suggest the likeliest, let user override

---

### C. Player matching
Players appear as `name="Lastname, Firstname"` and `checkname="LASTNAME,FIRSTNAME"`. Options:

- **Exact name match** (case-insensitive) — fails on typos or abbreviations
- **Jersey number + name** — use `uni` + name together to narrow candidates
- **Fuzzy + confirm UI** — for each XML player, show closest match from `player_seasons` for the matched team/season; user confirms or remaps
- **Create-if-not-found** — auto-create unknown players; risky if names differ slightly

**Recommendation:** Fuzzy match with a side-by-side confirmation step. Any unmatched player should block the import until resolved.

---

### D. Handling one-sided HoopStats files

Since HoopStats exports only the operating team's player data, options are:

- **Import one side only** — create the competition record and one team's boxscores; the other team appears in the linescore only *(simplest)*
- **Accept two files** — require both teams' exports before committing; merge them to get a complete game
- **Import partial, flag it** — mark the competition as having partial boxscore data

If two HoopStats files are accepted, the import wizard should detect that both refer to the same game (matching date + opponent names) and merge automatically.

---

### E. Per-quarter vs. full-game rows

Both sources provide full-game totals **and** per-quarter `<statsbyprd>` breakdowns. Options:

- **Full-game only** — one boxscore row per player (period = full-game convention)
- **Per-quarter** — four rows per player (periods 1–4); supports quarter-by-quarter reports
- **Both** — one full-game row + four quarter rows; risk of double-counting if not handled carefully

Match whatever convention is already in use for existing games.

---

### F. Duplicate detection
Before inserting, check `competitions` for matching `team_id`, `opponent_id`, and `start_time` date. Options: block, warn and let user proceed, or offer to replace existing data.

---

### G. Import UI — multi-step wizard
A wizard is appropriate given the team/player mapping confirmation requirements:

1. **Upload + parse** — file picker; parse XML in browser via `DOMParser`; detect source (`HoopStats` vs `PrestoSports`) from `<bbgame source="...">` attribute
2. **Map teams** — show XML team names; auto-suggest DB team matches; require user confirmation
3. **Assign season** — suggest from date; let user override
4. **Map players** — side-by-side: XML name ↔ DB player; flag unmatched; allow creating new player
5. **Preview + confirm** — show full boxscore before writing to DB

---

### H. Parsing location
- **Client-side (DOMParser)** — no new npm packages; browser-native XML parsing; send structured JSON to server for DB writes
- **Server-side (fast-xml-parser or xml2js)** — cleaner for validation; adds a dependency

Client-side keeps things lean with no build step.

---

## Summary: What Imports Cleanly vs. What Needs Work

| Data | HoopStats | PrestoSports |
|------|-----------|-------------|
| Game date, time, location | Clean (zero-padded date) | Clean (non-padded date — parse flexibly) |
| Home/visitor team names | Needs matching | Needs matching |
| Per-period scores → `periods` table | Clean | Clean |
| Home team player stats | Clean once players matched | Clean once players matched |
| Visitor team player stats | **Not in file** | Clean once players matched |
| Jersey numbers (`uni`) | Clean | Clean |
| Starters | Derivable from play-by-play | Clean (`gs="1"`) |
| `comptype_id` | Postseason only | Postseason + league flag |
| Minutes | Needs ×60 | Needs ×60 |
| Technical fouls (`tf`) | No DB column | No DB column |
| Advanced stats (`pts_bench` etc.) | Not present | No DB column — future work |
| Game completion flag | `complete="N"` — warn user | `complete="Y"` |

---

## Proposed Play-by-Play Table

If play-by-play data is imported, this table would store one row per `<play>` element per game.

### Key observations from the XML

Both sources use the same core structure: `action` (what happened) + `type` (context). They differ in vocabulary:

| Concept | HoopStats | PrestoSports |
|---------|-----------|-------------|
| 2-point attempt | `type="2PTR"` | `type="JUMPER"` or `type="LAYUP"` |
| Paint shot | _(not marked)_ | `paint="Y"` attr |
| Dead-ball rebound | _(not present)_ | `type="DEADB"` |
| Wall-clock time | `timeStamp="MM/DD/YYYY HH:MM:SS"` | _(not present)_ |
| Score update | `hscore` / `vscore` on scoring plays | `hscore` / `vscore` on scoring plays |
| Team event | `uni="TM" checkname="TEAM"` | `uni="TM" checkname="TEAM"` |

Related plays (e.g. GOOD + ASSIST, FOUL + FOULTAKEN) share the same `time` and are sequential in the file. The `seq` column preserves import order for linking them.

`player_id` is NULL for team-level events (`uni="TM"`).  
`home_score` / `visitor_score` are NULL on non-scoring plays (rebounds, fouls, etc.).  
HoopStats includes a `FOULTAKEN` action (the fouled player's side of a foul pair) — PrestoSports does not.

### Table definition

```sql
CREATE TABLE plays (
  play_id        INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  competition_id INT UNSIGNED     NOT NULL,
  period         TINYINT UNSIGNED NOT NULL,              -- 1–4; 5+ for OT
  clock          VARCHAR(8)       NOT NULL,              -- "MM:SS" game-clock countdown
  team_id        INT UNSIGNED     NULL,                  -- resolved FK; NULL = unknown/team event
  player_id      INT UNSIGNED     NULL,                  -- resolved FK; NULL = TM/TEAM plays
  action         VARCHAR(12)      NOT NULL,              -- GOOD | MISS | REBOUND | STEAL |
                                                         -- TURNOVER | FOUL | FOULTAKEN |
                                                         -- ASSIST | BLOCK | SUB | TIMEOUT
  play_type      VARCHAR(10)      NULL,                  -- shot:    JUMPER | LAYUP | 2PTR |
                                                         --          3PTR | FT
                                                         -- rebound: DEF | OFF | DEADB
                                                         -- sub:     IN | OUT
                                                         -- timeout: FULL | 30SEC
  is_paint       TINYINT(1)       NOT NULL DEFAULT 0,    -- 1 = paint shot (PrestoSports only)
  home_score     SMALLINT UNSIGNED NULL,                 -- running score after play; scoring plays only
  visitor_score  SMALLINT UNSIGNED NULL,
  wall_clock     DATETIME         NULL,                  -- HoopStats timeStamp; NULL for PrestoSports/dakstats
  x              SMALLINT         NULL,                  -- shot X coordinate (dakstats X; XML sources TBD)
  y              SMALLINT         NULL,                  -- shot Y coordinate (dakstats Y; XML sources TBD)
  seq            SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- import order within the period
  PRIMARY KEY (play_id),
  KEY idx_plays_comp_seq (competition_id, period, seq),
  KEY idx_plays_player   (player_id),
  CONSTRAINT fk_plays_comp   FOREIGN KEY (competition_id) REFERENCES competitions (competition_id) ON DELETE CASCADE,
  CONSTRAINT fk_plays_team   FOREIGN KEY (team_id)   REFERENCES teams (team_id),
  CONSTRAINT fk_plays_player FOREIGN KEY (player_id) REFERENCES players (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### dakstats_history field mapping → plays

`dakstats_history.playbyplay` uses numeric codes; import must decode them.

| dakstats column | plays column | Notes |
|----------------|--------------|-------|
| `COMPID` | `competition_id` | Join via `dakstats_history.season.COMPID` → `competitions` match on team + date |
| `PERIODNUM` | `period` | Direct |
| `CLOCK` | `clock` | int (seconds remaining) → format as `"MM:SS"` |
| `PLRID` | `player_id` | Resolve via dakstats player → statmanager `players` match |
| `ID` | `team_id` | Team identifier within the game; resolve to statmanager `teams` FK |
| `ACTION` | `action` | 1=ASSIST, 2=TURNOVER, 3=STEAL, 4=GOOD(2pt), 5=FOUL, 6=BLOCK, 14=FT, 15=REBOUND(OFF), 16=REBOUND(DEF), 18=SHOT, 19=SUB, 23=PERIOD(START), 24=PERIOD(END) |
| `RESULT` | `play_type` | On ACTION=18: 1=3PTR made, 3=2PTR made, 2/4=MISS. On ACTION=14: 8=GOOD, 9=MISS. On ACTION=19: 7=starter/IN, 5=OUT, 6=IN |
| `TYPE` | _(context)_ | On ACTION=14: 2=first FT attempt, 4=second FT attempt. Otherwise unused |
| `SITUATION` | _(skip)_ | Game situation code — no equivalent column |
| `X` | `x` | Direct |
| `Y` | `y` | Direct |
| `HSCORE` | `home_score` | Direct |
| `VSCORE` | `visitor_score` | Direct |
| `PLAYTIME` | `wall_clock` | int timestamp → DATETIME |
| `AUTO_PLAY_ID` | _(skip)_ | dakstats internal ID; not stored |

> **Action/Type codebook**: dakstats stores all codes as smallint. The mapping table (e.g. 1=GOOD, 2=MISS, 3=REBOUND…) needs to be sourced from dakstats documentation or reverse-engineered from the data before import can be implemented.

---

### Useful queries this table enables

- **Shot chart data**: `WHERE player_id = ? AND action IN ('GOOD','MISS') AND play_type IN ('JUMPER','LAYUP','2PTR','3PTR')`
- **Game flow / score timeline**: `WHERE competition_id = ? AND home_score IS NOT NULL ORDER BY period, seq`
- **Turnover analysis**: `WHERE team_id = ? AND action = 'TURNOVER'`
- **Assist chains**: Link ASSIST row to the GOOD row it follows (same `period`, adjacent `seq`, same `clock`)
- **Substitution log**: `WHERE competition_id = ? AND action = 'SUB' ORDER BY period, seq`

---

## Naming Conventions for Easy Import

The import wizard's team and player matching steps become trivial when names are entered consistently across all three tools. The following conventions give you exact or near-exact matches without manual remapping.

---

### General principle

All three tools — HoopStats, PrestoSports, and statmanager — let you freely enter team and player names. The import compares names from the XML against names stored in statmanager. **The fewer characters that differ, the more confident the auto-match.** Agree on a naming standard at the start of each season and enter it the same way everywhere.

---

### Teams

#### In statmanager
- Use the full, proper team name as it appears in game programs: **"KVHS Blue Knights"** not "Blue Knights" or "KVHS BK"
- Set the `abbrev` field to the exact short code used in the stats software: `"KVHS"` if HoopStats uses `homeid="KVHS "` (the trailing space is stripped automatically)
- Avoid special characters, punctuation, or all-caps names in statmanager unless the stats software also uses them

#### In HoopStats
- Under **Team Setup**, set the team **Name** to match statmanager exactly
- The short **ID** field (e.g. `"KVHS "`) is not used for DB matching but keeping it consistent with the statmanager `abbrev` sets up a possible future lookup-by-code shortcut
- The opponent team name entered for each game must also match statmanager — this is what appears in `visname` / `homename` and is the only anchor for the other side

#### In PrestoSports
- Under team settings, ensure the **Display Name** matches statmanager exactly
- PrestoSports exports `name="Holland"` (short) and `id="HOLLAND"` — if your statmanager team is called "Holland College Hurricanes", the auto-match will be weak; either shorten statmanager's name or use the full name in PrestoSports

---

### Players

#### Name format
Both sources store a normalized `checkname="LASTNAME,FIRSTNAME"` automatically — this is what the importer uses for matching. statmanager stores `first_name` and `last_name` separately.

The import reconstructs `checkname` from statmanager as `UPPER(last_name) + ',' + UPPER(first_name)` for comparison.

**Rules:**
- Enter **full legal first and last names** — no nicknames, no initials, no middle names
  - ✅ `first_name="Ethan"  last_name="Szemerda"` → matches `checkname="SZEMERDA,ETHAN"`
  - ❌ `first_name="E."     last_name="Szemerda"` → won't match
  - ❌ `first_name="Ethan J." last_name="Szemerda"` → won't match
- Hyphenated last names: enter with the hyphen in all three tools: `"St. Pierre"` or `"Smith-Jones"` consistently
- Prefixes/suffixes (Jr., Sr., III): omit them in all tools unless you enter them the same way everywhere

#### In HoopStats
- Player names are entered as **Lastname, Firstname** in the roster — HoopStats generates `checkname` from this automatically
- The `uni` (jersey number) field should match what's stored in statmanager's `boxscores.jersey_number` — this serves as a secondary matching signal when names are ambiguous

#### In PrestoSports
- Player names are entered as **Firstname Lastname** — PrestoSports auto-generates `checkname="LASTNAME,FIRSTNAME"` from this
- Ensure the jersey number matches statmanager for the same secondary-key benefit

#### In statmanager
- When adding players, enter names exactly as they are in your stats software roster
- If a player appears in an import file with a name that doesn't match (e.g. they changed their preferred name), update statmanager first, then re-import — or use the manual-remap step in the import wizard

---

### Season and game dates

statmanager seasons have `start_date` and `end_date`. The import wizard uses the game date from the XML to suggest a season. Make sure season date ranges don't overlap, and that each game date falls cleanly within one season's window. If a game is from a tournament that runs over two seasons' date ranges, extend the season end date to cover it before importing.
