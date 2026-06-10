'use strict';

// ── Menu definition ──────────────────────────────────────────────────────────
const MENU_ITEMS = [
  {
    label: 'Leagues',
    route: 'leagues',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>`
  },
  {
    label: 'Seasons',
    route: 'seasons',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>`
  },
  {
    label: 'Teams',
    route: 'teams',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`
  },
  {
    label: 'Games',
    route: 'games',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M4.93 4.93 19.07 19.07"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/>
    </svg>`
  },
  {
    label: 'Settings',
    route: 'settings',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`
  }
];

// ── Pages ─────────────────────────────────────────────────────────────────────
const pages = {
  leagues: {
    render() {
      return `
        <h2 class="page-title">Leagues</h2>
        <div class="card">
          <div class="section-header">
            <h3 class="section-title">League Manager</h3>
            <div class="header-controls">
              <select id="lg-bulk-action" class="filter-select">
                <option value=""></option>
                <option value="delete">Delete</option>
                <option value="merge">Merge</option>
              </select>
              <button class="btn btn-secondary btn-sm" id="lg-bulk-execute" disabled>Execute</button>
              <button class="btn btn-primary btn-sm" id="new-league-btn">+ New League</button>
            </div>
          </div>
          <div id="league-count" class="list-count"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-check"><input type="checkbox" id="lg-check-all" title="Select all"></th>
                  <th>Name</th>
                  <th class="col-num">Seasons</th>
                  <th class="col-num">Teams</th>
                  <th class="col-num">Games</th>
                  <th class="col-num">Players</th>
                  <th class="col-num">Boxscores</th>
                  <th>Contact Person</th>
                  <th>Links</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="league-list">
                <tr><td colspan="10" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    async init() {
      let leaguesCache = [];
      const listEl      = document.getElementById('league-list');
      const countEl     = document.getElementById('league-count');
      const checkAll    = document.getElementById('lg-check-all');
      const bulkAction  = document.getElementById('lg-bulk-action');
      const bulkExecute = document.getElementById('lg-bulk-execute');

      bulkAction.addEventListener('change', () => {
        bulkExecute.disabled = !bulkAction.value;
      });

      const GLOBE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>`;
      const MAIL_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,12 2,6"/>
      </svg>`;
      const FB_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>`;
      const X_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>`;
      const IG_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>`;
      const NAV_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

      function buildLinks(lg) {
        const strip = h => h ? h.replace(/^@/, '') : '';
        const items = [
          lg.website_url    ? [lg.website_url,                                    GLOBE_ICON, 'Website']        : null,
          lg.contact_email  ? [`mailto:${lg.contact_email}`,                      MAIL_ICON,  lg.contact_email] : null,
          lg.facebook       ? [`https://www.facebook.com/${strip(lg.facebook)}`,  FB_ICON,    'Facebook']       : null,
          lg.x_handle       ? [`https://x.com/${strip(lg.x_handle)}`,             X_ICON,     'X (Twitter)']    : null,
          lg.instagram      ? [`https://www.instagram.com/${strip(lg.instagram)}`, IG_ICON,   'Instagram']      : null,
        ].filter(Boolean);
        if (!items.length) return '<span style="color:var(--text-muted)">—</span>';
        return items.map(([url, icon, title]) =>
          `<a class="link-icon" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)}">${icon}</a>`
        ).join('');
      }

      function syncMasterCheck() {
        const boxes   = [...listEl.querySelectorAll('.row-check')];
        const checked = boxes.filter(cb => cb.checked).length;
        checkAll.checked       = boxes.length > 0 && checked === boxes.length;
        checkAll.indeterminate = checked > 0 && checked < boxes.length;
      }

      function renderRows() {
        countEl.textContent = `${leaguesCache.length} league${leaguesCache.length !== 1 ? 's' : ''}`;
        if (!leaguesCache.length) {
          listEl.innerHTML = '<tr><td colspan="10" class="list-empty">No leagues yet. Click + New League to add one.</td></tr>';
          return;
        }
        listEl.innerHTML = leaguesCache.map(lg => {
          const seasons = Number(lg.season_count);
          const teams   = Number(lg.team_count);
          const games   = Number(lg.competition_count);
          const seasonNav = seasons > 0
            ? `<a class="link-icon" href="#/seasons?league=${lg.id}" title="View seasons">${NAV_ICON}</a>`
            : '';
          const teamNav = teams > 0
            ? `<a class="link-icon" href="#/teams?league=${lg.id}" title="View teams">${NAV_ICON}</a>`
            : '';
          return `
          <tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-id="${lg.id}"></td>
            <td><button class="tbl-link name-btn" data-id="${lg.id}">${escapeHtml(lg.name)}</button></td>
            <td class="col-num" style="white-space:nowrap">${seasons}${seasonNav}</td>
            <td class="col-num" style="white-space:nowrap">${teams}${teamNav}</td>
            <td class="col-num">${games > 0 ? `<a class="tbl-link" href="#/seasons?league=${lg.id}">${games}</a>` : games}</td>
            <td class="col-num">${Number(lg.player_count)}</td>
            <td class="col-num">${Number(lg.boxscore_count)}</td>
            <td>${escapeHtml(lg.contact_person || '—')}</td>
            <td class="col-links">${buildLinks(lg)}</td>
            <td class="col-actions">
              <button class="btn-icon add-season-btn" data-id="${lg.id}" title="Add Season">${ADD_SEASON_ICON}</button>
              <button class="btn-icon edit-btn" data-id="${lg.id}" title="Edit">${EDIT_ICON}</button>
              <button class="btn-icon delete-btn" data-id="${lg.id}" title="Delete">${DELETE_ICON}</button>
            </td>
          </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadLeagues() {
        listEl.innerHTML = '<tr><td colspan="10" class="list-empty">Loading…</td></tr>';
        try {
          const res  = await fetch('api/leagues');
          const data = await res.json();
          if (data.error) {
            listEl.innerHTML = `<tr><td colspan="10" class="list-empty">${escapeHtml(data.error)}</td></tr>`;
            return;
          }
          leaguesCache = data.leagues;
          renderRows();
        } catch {
          listEl.innerHTML = '<tr><td colspan="10" class="list-empty">Could not load leagues.</td></tr>';
        }
      }

      checkAll.addEventListener('change', () => {
        listEl.querySelectorAll('.row-check').forEach(cb => cb.checked = checkAll.checked);
        checkAll.indeterminate = false;
      });

      listEl.addEventListener('change', e => {
        if (e.target.matches('.row-check')) syncMasterCheck();
      });

      bulkExecute.addEventListener('click', async () => {
        const action = bulkAction.value;
        if (!action) { alert('Select a bulk action first.'); return; }

        const checked = [...listEl.querySelectorAll('.row-check:checked')];
        if (!checked.length) { alert('No leagues selected.'); return; }

        if (action === 'delete') {
          const ids   = checked.map(cb => parseInt(cb.dataset.id));
          const names = ids.map(id => leaguesCache.find(l => l.id === id)?.name ?? `#${id}`);
          const preview = names.length <= 5
            ? names.join('\n')
            : names.slice(0, 5).join('\n') + `\n…and ${names.length - 5} more`;
          if (!confirm(
            `Delete ${ids.length} league(s)? This cannot be undone.\n\n${preview}\n\nLeagues with seasons cannot be deleted.`
          )) return;

          bulkExecute.disabled = true;
          bulkExecute.textContent = 'Deleting…';
          let deleted = 0;
          const errors = [];
          for (const [i, id] of ids.entries()) {
            try {
              const d = await fetch(`api/leagues/${id}`, { method: 'DELETE' }).then(r => r.json());
              if (d.success) deleted++;
              else errors.push(`${names[i]}: ${d.error}`);
            } catch { errors.push(`${names[i]}: request failed`); }
          }
          await loadLeagues();
          bulkAction.value = '';
          bulkExecute.disabled = true;
          bulkExecute.textContent = 'Execute';
          alert(errors.length
            ? `${deleted} deleted.\n\nSkipped:\n${errors.join('\n')}`
            : `${deleted} league(s) deleted.`);
        }

        if (action === 'merge') {
          const ids = [...new Set(checked.map(cb => parseInt(cb.dataset.id)))];
          if (ids.length < 2) { alert('Select at least 2 leagues to merge.'); return; }
          const mergeLeagues = ids.map(id => {
            const lg = leaguesCache.find(l => l.id === id);
            return { id, name: lg?.name ?? `#${id}`, label: lg?.name ?? `#${id}` };
          });
          LeagueMergeModal.open(mergeLeagues, async () => {
            await loadLeagues();
            bulkAction.value = '';
            bulkExecute.disabled = true;
          });
        }
      });

      document.getElementById('new-league-btn').addEventListener('click', () => {
        window.location.hash = '#/league-form?back=leagues';
      });

      listEl.addEventListener('click', async e => {
        const nameBtn      = e.target.closest('.name-btn');
        const addSeasonBtn = e.target.closest('.add-season-btn');
        const editBtn      = e.target.closest('.edit-btn');
        const deleteBtn    = e.target.closest('.delete-btn');

        if (nameBtn) {
          const league = leaguesCache.find(l => l.id === parseInt(nameBtn.dataset.id));
          if (league) window.location.hash = `#/league-form?id=${league.id}&back=leagues`;
          return;
        }

        if (addSeasonBtn) {
          const league = leaguesCache.find(l => l.id === parseInt(addSeasonBtn.dataset.id));
          if (league) window.location.hash = `#/season-form?league=${league.id}&back=leagues`;
          return;
        }

        if (editBtn) {
          const league = leaguesCache.find(l => l.id === parseInt(editBtn.dataset.id));
          if (league) window.location.hash = `#/league-form?id=${league.id}&back=leagues`;
        }

        if (deleteBtn) {
          const id   = parseInt(deleteBtn.dataset.id);
          const name = leaguesCache.find(l => l.id === id)?.name ?? 'this league';
          if (!confirm(`Delete "${name}"?\n\nThis will fail if the league has seasons.`)) return;
          deleteBtn.disabled = true;
          try {
            const res  = await fetch(`api/leagues/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              await loadLeagues();
            } else {
              alert(data.error || 'Delete failed');
              deleteBtn.disabled = false;
            }
          } catch {
            alert('Request failed');
            deleteBtn.disabled = false;
          }
        }
      });

      await loadLeagues();
    }
  },

  'league-form': {
    menuRoute: 'leagues',
    render() {
      return `
        <h2 class="page-title" id="lf-page-title">New League</h2>
        <div class="card">
          <form id="lf-form" novalidate style="padding:4px 0">
            <div class="form-group">
              <label for="lf-name">League Name <span style="color:var(--accent)">*</span></label>
              <input type="text" id="lf-name" placeholder="e.g. City Basketball Association" autocomplete="off" spellcheck="false">
            </div>
            <div class="form-group">
              <label for="lf-founded">Founded Date</label>
              <input type="date" id="lf-founded">
            </div>
            <p class="form-section-label">Contact</p>
            <div class="form-group">
              <label for="lf-contact-person">Contact Person</label>
              <input type="text" id="lf-contact-person" autocomplete="off" spellcheck="false">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="lf-contact-phone">Phone</label>
                <input type="tel" id="lf-contact-phone" autocomplete="off">
              </div>
              <div class="form-group">
                <label for="lf-contact-email">Email</label>
                <input type="email" id="lf-contact-email" spellcheck="false">
              </div>
            </div>
            <p class="form-section-label">Online Presence</p>
            <div class="form-group">
              <label for="lf-website">Website URL</label>
              <input type="url" id="lf-website" placeholder="https://" spellcheck="false">
            </div>
            <div class="three-col">
              <div class="form-group">
                <label for="lf-facebook">Facebook</label>
                <input type="text" id="lf-facebook" placeholder="@handle" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="lf-x-handle">X (Twitter)</label>
                <input type="text" id="lf-x-handle" placeholder="@handle" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="lf-instagram">Instagram</label>
                <input type="text" id="lf-instagram" placeholder="@handle" spellcheck="false">
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="lf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="lf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="lf-status"></div>
          </form>
        </div>`;
    },

    async init(params = {}) {
      const backHash = `#/${params.back || 'leagues'}`;
      let league = null;
      if (params.id) {
        document.getElementById('lf-page-title').textContent = 'Edit League';
        try {
          const data = await fetch('api/leagues').then(r => r.json());
          league = (data.leagues || []).find(l => String(l.id) === String(params.id)) ?? null;
          if (league) {
            setValue('lf-name',           league.name);
            setValue('lf-founded',        league.founded_date ? String(league.founded_date).substring(0, 10) : '');
            setValue('lf-contact-person', league.contact_person);
            setValue('lf-contact-phone',  league.contact_phone);
            setValue('lf-contact-email',  league.contact_email);
            setValue('lf-website',        league.website_url);
            setValue('lf-facebook',       league.facebook);
            setValue('lf-x-handle',       league.x_handle);
            setValue('lf-instagram',      league.instagram);
          }
        } catch {}
      }

      document.getElementById('lf-cancel').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      document.getElementById('lf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('lf-save');
        const body = {
          name:           document.getElementById('lf-name').value.trim(),
          founded_date:   document.getElementById('lf-founded').value || null,
          contact_person: document.getElementById('lf-contact-person').value.trim() || null,
          contact_phone:  document.getElementById('lf-contact-phone').value.trim() || null,
          contact_email:  document.getElementById('lf-contact-email').value.trim() || null,
          website_url:    document.getElementById('lf-website').value.trim() || null,
          facebook:       document.getElementById('lf-facebook').value.trim() || null,
          x_handle:       document.getElementById('lf-x-handle').value.trim() || null,
          instagram:      document.getElementById('lf-instagram').value.trim() || null,
        };
        if (!body.name) { showStatus('lf-status', 'error', 'League name is required.'); return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(league ? `api/leagues/${league.id}` : 'api/leagues', {
            method:  league ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          });
          const data = await res.json();
          if (data.success || data.id) {
            window.location.hash = backHash;
          } else {
            showStatus('lf-status', 'error', data.error || 'Save failed');
          }
        } catch {
          showStatus('lf-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });

      if (window.matchMedia('(hover: hover)').matches)
        document.getElementById('lf-name').focus();
    }
  },

  'team-form': {
    menuRoute: 'teams',
    render() {
      return `
        <h2 class="page-title" id="tf-page-title">New Team</h2>
        <div class="card">
          <form id="tf-form" novalidate style="padding:4px 0">
            <div class="form-group">
              <label for="tf-name">Team Name <span style="color:var(--accent)">*</span></label>
              <input type="text" id="tf-name" autocomplete="off" spellcheck="false">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="tf-abbrev">Abbreviation</label>
                <input type="text" id="tf-abbrev" maxlength="5" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="tf-nickname">Nickname</label>
                <input type="text" id="tf-nickname" maxlength="25" autocomplete="off" spellcheck="false">
              </div>
            </div>
            <div class="form-group">
              <label for="tf-gender">Gender</label>
              <select id="tf-gender">
                <option value="">Not specified</option>
                <option value="0">Male</option>
                <option value="1">Female</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="tf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="tf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="tf-status"></div>
          </form>
        </div>
      `;
    },

    async init(params = {}) {
      const backQ = new URLSearchParams();
      if (params.league) backQ.set('league', params.league);
      if (params.season) backQ.set('season', params.season);
      const backHash = `#/${params.back || 'teams'}${backQ.toString() ? '?' + backQ : ''}`;

      let team = null;
      if (params.id) {
        document.getElementById('tf-page-title').textContent = 'Edit Team';
        try {
          const data = await fetch('api/teams').then(r => r.json());
          team = (data.teams || []).find(t => String(t.id) === String(params.id)) ?? null;
          if (team) {
            setValue('tf-name',     team.name);
            setValue('tf-abbrev',   team.abbrev);
            setValue('tf-nickname', team.nickname);
            document.getElementById('tf-gender').value =
              team.gender != null ? String(Number(team.gender)) : '';
          }
        } catch {}
      }

      document.getElementById('tf-cancel').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      document.getElementById('tf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('tf-save');
        const body = {
          name:     document.getElementById('tf-name').value.trim(),
          abbrev:   document.getElementById('tf-abbrev').value.trim(),
          nickname: document.getElementById('tf-nickname').value.trim(),
          gender:   document.getElementById('tf-gender').value,
        };
        if (!body.name) { showStatus('tf-status', 'error', 'Team name is required.'); return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(team ? `api/teams/${team.id}` : 'api/teams', {
            method:  team ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          });
          const data = await res.json();
          if (data.success || data.id) {
            window.location.hash = backHash;
          } else {
            showStatus('tf-status', 'error', data.error || 'Save failed');
          }
        } catch {
          showStatus('tf-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });

      if (window.matchMedia('(hover: hover)').matches)
        document.getElementById('tf-name').focus();
    }
  },

  seasons: {
    render() {
      return `
        <h2 class="page-title">Seasons</h2>
        <div class="card">
          <div class="section-header">
            <h3 class="section-title">Season Manager</h3>
            <div class="header-controls">
              <select id="league-filter" class="filter-select">
                <option value="">All Leagues</option>
              </select>
              <select id="sm-bulk-action" class="filter-select">
                <option value=""></option>
                <option value="delete">Delete</option>
                <option value="merge">Merge</option>
              </select>
              <button class="btn btn-secondary btn-sm" id="sm-bulk-execute" disabled>Execute</button>
              <button class="btn btn-primary btn-sm" id="new-season-btn">+ New Season</button>
            </div>
          </div>
          <div id="sm-count" class="list-count"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-check"><input type="checkbox" id="sm-check-all" title="Select all"></th>
                  <th>Season</th>
                  <th class="col-num">Teams</th>
                  <th class="col-num">Games</th>
                  <th class="col-num">Players</th>
                  <th class="col-num">Boxscores</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="season-list">
                <tr><td colspan="7" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    async init(params = {}) {
      let seasonsCache = [];

      const listEl      = document.getElementById('season-list');
      const countEl     = document.getElementById('sm-count');
      const filterSel   = document.getElementById('league-filter');
      const checkAll    = document.getElementById('sm-check-all');
      const bulkAction  = document.getElementById('sm-bulk-action');
      const bulkExecute = document.getElementById('sm-bulk-execute');

      bulkAction.addEventListener('change', () => {
        bulkExecute.disabled = !bulkAction.value;
      });

      try {
        const res  = await fetch('api/leagues');
        const data = await res.json();
        filterSel.innerHTML = '<option value="">All Leagues</option>' +
          (data.leagues || []).map(l =>
            `<option value="${l.id}"${String(l.id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
          ).join('');
      } catch {}

      const NAV_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

      function syncMasterCheck() {
        const boxes   = [...listEl.querySelectorAll('.row-check')];
        const checked = boxes.filter(cb => cb.checked).length;
        checkAll.checked       = boxes.length > 0 && checked === boxes.length;
        checkAll.indeterminate = checked > 0 && checked < boxes.length;
      }

      function renderRows() {
        const leagueId = filterSel.value;
        const visible  = leagueId
          ? seasonsCache.filter(s => String(s.league_id) === leagueId)
          : seasonsCache;
        countEl.textContent = `${visible.length} season${visible.length !== 1 ? 's' : ''}`;
        if (!visible.length) {
          listEl.innerHTML = '<tr><td colspan="7" class="list-empty">No seasons found.</td></tr>';
          return;
        }
        listEl.innerHTML = visible.map(s => {
          const teams = Number(s.team_count);
          const teamsCell = teams > 0
            ? `${teams} <a class="link-icon" href="#/teams?league=${s.league_id}&season=${s.id}" title="View teams">${NAV_ICON}</a>`
            : teams;
          return `
          <tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-id="${s.id}"></td>
            <td><button class="tbl-link name-btn" data-id="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.league_name)})</button></td>
            <td class="col-num">${teamsCell}</td>
            <td class="col-num">${Number(s.game_count)}</td>
            <td class="col-num">${Number(s.player_count)}</td>
            <td class="col-num">${Number(s.boxscore_count)}</td>
            <td class="col-actions">
              <button class="btn-icon add-team-btn" data-id="${s.id}" data-league-id="${s.league_id}" title="Add Team">${ADD_TEAM_ICON}</button>
              <button class="btn-icon edit-btn" data-id="${s.id}" title="Edit">${EDIT_ICON}</button>
              <button class="btn-icon delete-btn" data-id="${s.id}" title="Delete">${DELETE_ICON}</button>
            </td>
          </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadSeasons() {
        listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Loading…</td></tr>';
        try {
          const res  = await fetch('api/seasons');
          const data = await res.json();
          if (data.error) {
            listEl.innerHTML = `<tr><td colspan="7" class="list-empty">${escapeHtml(data.error)}</td></tr>`;
            return;
          }
          seasonsCache = data.seasons;
          renderRows();
        } catch {
          listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Could not load seasons.</td></tr>';
        }
      }

      checkAll.addEventListener('change', () => {
        listEl.querySelectorAll('.row-check').forEach(cb => cb.checked = checkAll.checked);
        checkAll.indeterminate = false;
      });

      listEl.addEventListener('change', e => {
        if (e.target.matches('.row-check')) syncMasterCheck();
      });

      bulkExecute.addEventListener('click', async () => {
        const action = bulkAction.value;
        if (!action) { alert('Select a bulk action first.'); return; }

        const checked = [...listEl.querySelectorAll('.row-check:checked')];
        if (!checked.length) { alert('No seasons selected.'); return; }

        if (action === 'delete') {
          const ids   = checked.map(cb => parseInt(cb.dataset.id));
          const names = ids.map(id => {
            const s = seasonsCache.find(x => x.id === id);
            return s ? `${s.league_name} — ${s.name}` : `#${id}`;
          });
          const preview = names.length <= 5
            ? names.join('\n')
            : names.slice(0, 5).join('\n') + `\n…and ${names.length - 5} more`;
          if (!confirm(
            `Delete ${ids.length} season(s)? This cannot be undone.\n\n${preview}\n\nSeasons with teams or games cannot be deleted.`
          )) return;

          bulkExecute.disabled = true;
          bulkExecute.textContent = 'Deleting…';
          let deleted = 0;
          const errors = [];
          for (const [i, id] of ids.entries()) {
            try {
              const d = await fetch(`api/seasons/${id}`, { method: 'DELETE' }).then(r => r.json());
              if (d.success) deleted++;
              else errors.push(`${names[i]}: ${d.error}`);
            } catch { errors.push(`${names[i]}: request failed`); }
          }
          await loadSeasons();
          bulkAction.value = '';
          bulkExecute.disabled = true;
          bulkExecute.textContent = 'Execute';
          alert(errors.length
            ? `${deleted} deleted.\n\nSkipped:\n${errors.join('\n')}`
            : `${deleted} season(s) deleted.`);
        }

        if (action === 'merge') {
          const ids = [...new Set(checked.map(cb => parseInt(cb.dataset.id)))];
          if (ids.length < 2) { alert('Select at least 2 seasons to merge.'); return; }
          const mergeSeasons = ids.map(id => {
            const s = seasonsCache.find(x => x.id === id);
            const label = s ? `${s.name} (${s.league_name})` : `#${id}`;
            return { id, label };
          });
          SeasonMergeModal.open(mergeSeasons, async () => {
            await loadSeasons();
            bulkAction.value = '';
            bulkExecute.disabled = true;
          });
        }
      });

      filterSel.addEventListener('change', renderRows);

      document.getElementById('new-season-btn').addEventListener('click', () => {
        const q = new URLSearchParams({ back: 'seasons' });
        if (filterSel.value) q.set('league', filterSel.value);
        window.location.hash = `#/season-form?${q}`;
      });

      listEl.addEventListener('click', async e => {
        const nameBtn    = e.target.closest('.name-btn');
        const addTeamBtn = e.target.closest('.add-team-btn');
        const editBtn    = e.target.closest('.edit-btn');
        const deleteBtn  = e.target.closest('.delete-btn');

        if (nameBtn) {
          const season = seasonsCache.find(s => s.id === parseInt(nameBtn.dataset.id));
          if (season) {
            const q = new URLSearchParams({ id: season.id, back: 'seasons' });
            if (filterSel.value) q.set('league', filterSel.value);
            window.location.hash = `#/season-form?${q}`;
          }
        }

        if (addTeamBtn) {
          TeamModal.open(null, loadSeasons);
        }

        if (editBtn) {
          const season = seasonsCache.find(s => s.id === parseInt(editBtn.dataset.id));
          if (season) {
            const q = new URLSearchParams({ id: season.id, back: 'seasons' });
            if (filterSel.value) q.set('league', filterSel.value);
            window.location.hash = `#/season-form?${q}`;
          }
        }

        if (deleteBtn) {
          const id     = parseInt(deleteBtn.dataset.id);
          const season = seasonsCache.find(s => s.id === id);
          const label  = season ? `${season.league_name} — ${season.name}` : 'this season';
          if (!confirm(`Delete "${label}"?\n\nThis will fail if the season has teams or games.`)) return;
          deleteBtn.disabled = true;
          try {
            const res  = await fetch(`api/seasons/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              await loadSeasons();
            } else {
              alert(data.error || 'Delete failed');
              deleteBtn.disabled = false;
            }
          } catch {
            alert('Request failed');
            deleteBtn.disabled = false;
          }
        }
      });

      await loadSeasons();
    }
  },

  'season-form': {
    menuRoute: 'seasons',
    render() {
      return `
        <h2 class="page-title" id="sf-page-title">New Season</h2>
        <div class="card">
          <form id="sf-form" novalidate style="padding:4px 0">
            <div class="form-group">
              <label for="sf-league">League <span style="color:var(--accent)">*</span></label>
              <select id="sf-league">
                <option value="">— Select League —</option>
              </select>
            </div>
            <div class="form-group">
              <label for="sf-name">Season Name <span style="color:var(--accent)">*</span></label>
              <input type="text" id="sf-name" placeholder="e.g. 2025-26" autocomplete="off" spellcheck="false">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="sf-start-year">Start Year <span style="color:var(--accent)">*</span></label>
                <input type="number" id="sf-start-year" placeholder="2025" min="1900" max="2100">
              </div>
              <div class="form-group">
                <label for="sf-end-year">End Year <span style="color:var(--accent)">*</span></label>
                <input type="number" id="sf-end-year" placeholder="2026" min="1900" max="2100">
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="sf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="sf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="sf-status"></div>
          </form>
        </div>`;
    },

    async init(params = {}) {
      const backQ = new URLSearchParams();
      if (params.league) backQ.set('league', params.league);
      const backHash = `#/${params.back || 'seasons'}${backQ.toString() ? '?' + backQ : ''}`;

      let leagues = [];
      try {
        const res  = await fetch('api/leagues');
        const data = await res.json();
        leagues = data.leagues || [];
      } catch {}

      let season = null;
      if (params.id) {
        document.getElementById('sf-page-title').textContent = 'Edit Season';
        try {
          const data = await fetch('api/seasons').then(r => r.json());
          season = (data.seasons || []).find(s => String(s.id) === String(params.id)) ?? null;
        } catch {}
      }

      const leagueId  = season?.league_id ?? params.league ?? '';
      const leagueSel = document.getElementById('sf-league');
      leagueSel.innerHTML = '<option value="">— Select League —</option>' +
        leagues.map(l =>
          `<option value="${l.id}"${String(l.id) === String(leagueId) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      if (params.league && !params.id) leagueSel.disabled = true;

      if (season) {
        setValue('sf-name',       season.name);
        setValue('sf-start-year', season.start_year);
        setValue('sf-end-year',   season.end_year);
      }

      document.getElementById('sf-cancel').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      document.getElementById('sf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('sf-save');
        const body = {
          league_id:  leagueSel.value,
          name:       document.getElementById('sf-name').value.trim(),
          start_year: document.getElementById('sf-start-year').value,
          end_year:   document.getElementById('sf-end-year').value,
        };
        if (!body.league_id || !body.name || !body.start_year || !body.end_year) {
          showStatus('sf-status', 'error', 'All fields are required.');
          return;
        }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(season ? `api/seasons/${season.id}` : 'api/seasons', {
            method:  season ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          });
          const data = await res.json();
          if (data.success || data.id) {
            window.location.hash = backHash;
          } else {
            showStatus('sf-status', 'error', data.error || 'Save failed');
          }
        } catch {
          showStatus('sf-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });

      if (window.matchMedia('(hover: hover)').matches)
        document.getElementById('sf-name').focus();
    }
  },

  teams: {
    render() {
      return `
        <h2 class="page-title">Teams</h2>
        <div class="card">
          <div class="section-header">
            <h3 class="section-title">Team Manager</h3>
            <div class="header-controls">
              <select id="tm-league-filter" class="filter-select"><option value="">All Teams</option></select>
              <select id="tm-season-filter" class="filter-select" disabled><option value="">All Seasons</option></select>
              <select id="tm-bulk-action" class="filter-select">
                <option value=""></option>
                <option value="delete">Delete</option>
                <option value="merge">Merge</option>
              </select>
              <button class="btn btn-secondary btn-sm" id="tm-bulk-execute" disabled>Execute</button>
              <button class="btn btn-primary btn-sm" id="new-team-btn">+ New Team</button>
            </div>
          </div>
          <div id="tm-count" class="list-count"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-check"><input type="checkbox" id="tm-check-all" title="Select all"></th>
                  <th>Name</th><th>Gender</th>
                  <th>Current Coach</th>
                  <th class="col-num">Seasons</th><th class="col-num">Games</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="team-list">
                <tr><td colspan="7" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    async init(params = {}) {
      let teamsCache      = [];
      let leaguesCache    = [];
      let allSeasonsCache = [];

      const listEl      = document.getElementById('team-list');
      const leagueFilt  = document.getElementById('tm-league-filter');
      const seasonFilt  = document.getElementById('tm-season-filter');
      const checkAll    = document.getElementById('tm-check-all');
      const bulkAction  = document.getElementById('tm-bulk-action');
      const bulkExecute = document.getElementById('tm-bulk-execute');

      bulkAction.addEventListener('change', () => {
        bulkExecute.disabled = !bulkAction.value;
      });

      function teamFormHash(id = null) {
        const q = new URLSearchParams({ back: 'teams' });
        if (id)                  q.set('id',     id);
        if (leagueFilt.value)    q.set('league', leagueFilt.value);
        if (seasonFilt.value)    q.set('season', seasonFilt.value);
        return `#/team-form?${q}`;
      }

      function syncMasterCheck() {
        const boxes   = [...listEl.querySelectorAll('.row-check')];
        const checked = boxes.filter(cb => cb.checked).length;
        checkAll.checked       = boxes.length > 0 && checked === boxes.length;
        checkAll.indeterminate = checked > 0 && checked < boxes.length;
      }

      try {
        const [lr, sr] = await Promise.all([fetch('api/leagues'), fetch('api/seasons')]);
        const [ld, sd] = await Promise.all([lr.json(), sr.json()]);
        leaguesCache    = ld.leagues || [];
        allSeasonsCache = sd.seasons || [];
      } catch {}

      leagueFilt.innerHTML = '<option value="">All Teams</option>' +
        '<option value="unassigned">Unassigned</option>' +
        leaguesCache.map(l =>
          `<option value="${l.id}"${String(l.id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshSeasonFilter(selectedId = '') {
        const lid = leagueFilt.value;
        const leagueSeasons = (lid && lid !== 'unassigned')
          ? allSeasonsCache.filter(s => String(s.league_id) === lid)
          : [];
        if (leagueSeasons.length > 0) {
          seasonFilt.disabled = false;
          seasonFilt.innerHTML = '<option value="">All Seasons</option>' +
            leagueSeasons.map(s =>
              `<option value="${s.id}"${String(s.id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`
            ).join('');
        } else {
          seasonFilt.disabled = true;
          seasonFilt.innerHTML = '<option value="">All Seasons</option>';
        }
      }

      refreshSeasonFilter(params.season);

      const countEl = document.getElementById('tm-count');

      function renderRows() {
        const lid = leagueFilt.value, sid = seasonFilt.value;
        const visible = teamsCache.filter(t => {
          if (lid === 'unassigned') return !t.league_id;
          if (lid && String(t.league_id) !== lid) return false;
          if (sid && !String(t.season_ids || '').split(',').includes(sid)) return false;
          return true;
        });
        const teamCount = lid ? visible.length : new Set(visible.map(t => t.id)).size;
        countEl.textContent = `${teamCount} team${teamCount !== 1 ? 's' : ''}`;
        if (!visible.length) {
          listEl.innerHTML = '<tr><td colspan="7" class="list-empty">No teams found.</td></tr>';
          return;
        }
        const gl = g => g == null ? '—' : Number(g) === 0 ? 'Male' : 'Female';
        listEl.innerHTML = visible.map(t => {
          const lid = t.league_id || '';
          const nameLabel = `${escapeHtml(t.name)} (${t.league_name ? escapeHtml(t.league_name) : 'Unassigned'})`;
          return `
          <tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-id="${t.id}" data-league-id="${lid}"></td>
            <td><button class="tbl-link name-btn" data-id="${t.id}" data-league-id="${lid}">${nameLabel}</button></td>
            <td>${gl(t.gender)}</td>
            <td>${escapeHtml(t.coach || '—')}</td>
            <td class="col-num">${Number(t.season_count)}</td>
            <td class="col-num">${Number(t.game_count)}</td>
            <td class="col-actions">
              <button class="btn-icon add-season-btn" data-id="${t.id}" data-league-id="${lid}" title="Add to Season">${ADD_SEASON_ICON}</button>
              <button class="btn-icon edit-btn" data-id="${t.id}" data-league-id="${lid}" title="Edit">${EDIT_ICON}</button>
              <button class="btn-icon delete-btn" data-id="${t.id}" data-league-id="${lid}" title="Delete">${DELETE_ICON}</button>
            </td>
          </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadTeams() {
        listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Loading…</td></tr>';
        try {
          const res  = await fetch('api/teams');
          const data = await res.json();
          if (data.error) { listEl.innerHTML = `<tr><td colspan="7" class="list-empty">${escapeHtml(data.error)}</td></tr>`; return; }
          teamsCache = data.teams;
          renderRows();
        } catch { listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Could not load teams.</td></tr>'; }
      }

      leagueFilt.addEventListener('change', () => { refreshSeasonFilter(); renderRows(); });
      seasonFilt.addEventListener('change', renderRows);

      checkAll.addEventListener('change', () => {
        listEl.querySelectorAll('.row-check').forEach(cb => cb.checked = checkAll.checked);
        checkAll.indeterminate = false;
      });

      listEl.addEventListener('change', e => {
        if (e.target.matches('.row-check')) syncMasterCheck();
      });

      bulkExecute.addEventListener('click', async () => {
        const action = bulkAction.value;
        if (!action) { alert('Select a bulk action first.'); return; }

        const checked = [...listEl.querySelectorAll('.row-check:checked')];
        if (!checked.length) { alert('No teams selected.'); return; }

        if (action === 'delete') {
          const teamIds = [...new Set(checked.map(cb => parseInt(cb.dataset.id)))];
          const names   = teamIds.map(id => teamsCache.find(x => x.id === id)?.name ?? `#${id}`);
          const preview = names.length <= 5
            ? names.join('\n')
            : names.slice(0, 5).join('\n') + `\n…and ${names.length - 5} more`;
          if (!confirm(
            `Delete ${teamIds.length} team(s)? This cannot be undone.\n\n${preview}\n\nTeams with games on record cannot be deleted.`
          )) return;

          bulkExecute.disabled = true;
          bulkExecute.textContent = 'Deleting…';
          let deleted = 0;
          const errors = [];
          for (const [i, id] of teamIds.entries()) {
            try {
              const d = await fetch(`api/teams/${id}`, { method: 'DELETE' }).then(r => r.json());
              if (d.success) deleted++;
              else errors.push(`${names[i]}: ${d.error}`);
            } catch { errors.push(`${names[i]}: request failed`); }
          }
          await loadTeams();
          bulkAction.value = '';
          bulkExecute.disabled = true;
          bulkExecute.textContent = 'Execute';
          alert(errors.length
            ? `${deleted} deleted.\n\nSkipped:\n${errors.join('\n')}`
            : `${deleted} team(s) deleted.`);
        }

        if (action === 'merge') {
          const teamIds = [...new Set(checked.map(cb => parseInt(cb.dataset.id)))];

          if (teamIds.length < 2) {
            if (checked.length >= 2) {
              // Same team ID — check if it spans multiple leagues
              const leagueIds = [...new Set(checked.map(cb => cb.dataset.leagueId).filter(Boolean))];
              if (leagueIds.length >= 2) {
                alert('Teams from different leagues cannot be merged.\n\nTo remove an incorrect league assignment, use the Delete button on that row.');
                return;
              }
            }
            alert('Select at least 2 teams to merge.');
            return;
          }

          const mergeTeams = teamIds.map(id => {
            const rows    = teamsCache.filter(x => x.id === id);
            const leagues = [...new Set(rows.map(x => x.league_name).filter(Boolean))];
            const name    = rows[0]?.name ?? `#${id}`;
            const label   = leagues.length
              ? `${name} (${leagues.join(', ')})`
              : `${name} (Unassigned)`;
            return { id, name, label };
          });
          TeamMergeModal.open(mergeTeams, async () => {
            await loadTeams();
            bulkAction.value = '';
            bulkExecute.disabled = true;
          });
        }
      });

      document.getElementById('new-team-btn').addEventListener('click', () => {
        window.location.hash = teamFormHash();
      });

      listEl.addEventListener('click', async e => {
        const nameBtn      = e.target.closest('.name-btn');
        const addSeasonBtn = e.target.closest('.add-season-btn');
        const editBtn      = e.target.closest('.edit-btn');
        const delBtn       = e.target.closest('.delete-btn');
        if (addSeasonBtn) {
          const t = teamsCache.find(x => x.id === parseInt(addSeasonBtn.dataset.id));
          if (t) TeamSeasonModal.open(t, loadTeams);
        }
        if (nameBtn || editBtn) {
          const id = parseInt((nameBtn || editBtn).dataset.id);
          const t  = teamsCache.find(x => x.id === id);
          if (t) window.location.hash = teamFormHash(t.id);
        }
        if (delBtn) {
          const teamId   = parseInt(delBtn.dataset.id);
          const leagueId = delBtn.dataset.leagueId;
          const t = teamsCache.find(x => x.id === teamId &&
            (leagueId ? String(x.league_id) === leagueId : !x.league_id));
          const label = t?.league_name ? `${t.name} (${t.league_name})` : (t?.name ?? 'this team');
          const msg = leagueId
            ? `Remove "${label}" from this league?\n\nThis will fail if the team has games in this league.`
            : `Delete "${label}"?\n\nThis team has no league assignments and will be permanently deleted.`;
          if (!confirm(msg)) return;
          delBtn.disabled = true;
          try {
            const url = leagueId
              ? `api/teams/${teamId}/leagues/${leagueId}`
              : `api/teams/${teamId}`;
            const res = await fetch(url, { method: 'DELETE' });
            const d   = await res.json();
            if (d.success) { await loadTeams(); } else { alert(d.error || 'Delete failed'); delBtn.disabled = false; }
          } catch { alert('Request failed'); delBtn.disabled = false; }
        }
      });

      await loadTeams();
    }
  },

  games: {
    render() {
      return `
        <h2 class="page-title">Games</h2>
        <div class="card">
          <div class="section-header">
            <h3 class="section-title">Game Manager</h3>
            <div class="header-controls">
              <select id="gm-league-filter" class="filter-select"><option value="">All Leagues</option></select>
              <select id="gm-season-filter" class="filter-select"><option value="">All Seasons</option></select>
              <select id="gm-team-filter" class="filter-select"><option value="">All Teams</option></select>
              <button class="btn btn-primary btn-sm" id="new-game-btn">+ New Game</button>
            </div>
          </div>
          <div id="gm-count" class="list-count"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Season</th><th>Team</th>
                  <th>Score</th><th>Opponent</th><th>Location</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="game-list">
                <tr><td colspan="7" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    async init(params = {}) {
      let gamesCache = [];
      let leaguesCache = [];
      let allSeasonsCache = [];
      let allTeamsCache = [];

      const listEl      = document.getElementById('game-list');
      const leagueFilt  = document.getElementById('gm-league-filter');
      const seasonFilt  = document.getElementById('gm-season-filter');
      const teamFilt    = document.getElementById('gm-team-filter');

      try {
        const [lr, sr, tr] = await Promise.all([fetch('api/leagues'), fetch('api/seasons'), fetch('api/teams')]);
        const [ld, sd, td] = await Promise.all([lr.json(), sr.json(), tr.json()]);
        leaguesCache    = ld.leagues || [];
        allSeasonsCache = sd.seasons || [];
        allTeamsCache   = td.teams   || [];
      } catch {}

      leagueFilt.innerHTML = '<option value="">All Leagues</option>' +
        leaguesCache.map(l =>
          `<option value="${l.id}"${String(l.id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshSeasonFilter(selectedId = '') {
        const lid = leagueFilt.value;
        seasonFilt.innerHTML = '<option value="">All Seasons</option>' +
          allSeasonsCache.filter(s => !lid || String(s.league_id) === lid)
            .map(s => `<option value="${s.id}"${String(s.id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`)
            .join('');
      }

      function refreshTeamFilter(selectedId = '') {
        const sid = seasonFilt.value;
        const seen = new Map();
        for (const t of allTeamsCache) { if (!seen.has(t.id)) seen.set(t.id, t); }
        const unique = [...seen.values()].filter(t =>
          !sid || allTeamsCache.some(r => r.id === t.id && String(r.season_ids || '').split(',').includes(sid))
        );
        teamFilt.innerHTML = '<option value="">All Teams</option>' +
          unique.map(t => `<option value="${t.id}"${String(t.id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(t.name)}${t.abbrev ? ` (${t.abbrev})` : ''}</option>`)
            .join('');
      }

      refreshSeasonFilter(params.season);
      refreshTeamFilter(params.team);

      const countEl = document.getElementById('gm-count');

      function renderRows() {
        const lid = leagueFilt.value, sid = seasonFilt.value, tid = teamFilt.value;
        const visible = gamesCache.filter(g =>
          (!lid || String(g.league_id) === lid || String(g.opponent_league_id) === lid) &&
          (!sid || String(g.season_id) === sid || String(g.opponent_season_id) === sid) &&
          (!tid || String(g.team_id) === tid || String(g.opponent_id) === tid)
        );
        countEl.textContent = `${visible.length} game${visible.length !== 1 ? 's' : ''}`;
        if (!visible.length) {
          listEl.innerHTML = '<tr><td colspan="7" class="list-empty">No games found.</td></tr>';
          return;
        }
        listEl.innerHTML = visible.map(g => {
          const score = g.team_score != null && g.opponent_score != null
            ? `${g.team_score}–${g.opponent_score}` : '—';
          const date = String(g.game_date).substring(0, 10);
          const team = g.team_abbrev ? `${escapeHtml(g.team_name)} (${escapeHtml(g.team_abbrev)})` : escapeHtml(g.team_name);
          const opp  = g.opponent_abbrev ? `${escapeHtml(g.opponent_name)} (${escapeHtml(g.opponent_abbrev)})` : escapeHtml(g.opponent_name);
          return `
            <tr>
              <td>${date}</td>
              <td>${escapeHtml(g.season_name)}</td>
              <td>${team}</td>
              <td class="col-num">${score}</td>
              <td>${opp}</td>
              <td>${escapeHtml(g.location)}</td>
              <td class="col-actions">
                <button class="btn-icon edit-btn" data-id="${g.id}" title="Edit">${EDIT_ICON}</button>
                <button class="btn-icon delete-btn" data-id="${g.id}" title="Delete">${DELETE_ICON}</button>
              </td>
            </tr>`;
        }).join('');
      }

      async function loadGames() {
        listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Loading…</td></tr>';
        try {
          const res = await fetch('api/games');
          const data = await res.json();
          if (data.error) { listEl.innerHTML = `<tr><td colspan="7" class="list-empty">${escapeHtml(data.error)}</td></tr>`; return; }
          gamesCache = data.games;
          renderRows();
        } catch { listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Could not load games.</td></tr>'; }
      }

      leagueFilt.addEventListener('change', () => { refreshSeasonFilter(); refreshTeamFilter(); renderRows(); });
      seasonFilt.addEventListener('change', () => { refreshTeamFilter(); renderRows(); });
      teamFilt.addEventListener('change', renderRows);

      function gameFormHash(id = null) {
        const q = new URLSearchParams({ back: 'games' });
        if (id)               q.set('id',     id);
        if (leagueFilt.value) q.set('league', leagueFilt.value);
        if (seasonFilt.value) q.set('season', seasonFilt.value);
        if (teamFilt.value)   q.set('team',   teamFilt.value);
        return `#/game-form?${q}`;
      }

      document.getElementById('new-game-btn').addEventListener('click', () => {
        window.location.hash = gameFormHash();
      });

      listEl.addEventListener('click', async e => {
        const editBtn = e.target.closest('.edit-btn'), delBtn = e.target.closest('.delete-btn');
        if (editBtn) { window.location.hash = gameFormHash(editBtn.dataset.id); }
        if (delBtn) {
          const id = parseInt(delBtn.dataset.id);
          const g  = gamesCache.find(x => x.id === id);
          const label = g ? `${g.season_name} — ${g.team_name} vs ${g.opponent_name}` : 'this game';
          if (!confirm(`Delete "${label}"?\n\nThis will also delete all boxscores for this game.`)) return;
          delBtn.disabled = true;
          try {
            const res = await fetch(`api/games/${id}`, { method: 'DELETE' });
            const d   = await res.json();
            if (d.success) { await loadGames(); } else { alert(d.error || 'Delete failed'); delBtn.disabled = false; }
          } catch { alert('Request failed'); delBtn.disabled = false; }
        }
      });

      await loadGames();
    }
  },

  'game-form': {
    menuRoute: 'games',
    render() {
      return `
        <h2 class="page-title" id="gf-page-title">New Game</h2>
        <div class="card">
          <form id="gf-form" novalidate style="padding:4px 0">
            <div class="two-col">
              <div class="form-group">
                <label for="gf-league">League <span style="color:var(--accent)">*</span></label>
                <select id="gf-league"><option value="">— Select League —</option></select>
              </div>
              <div class="form-group">
                <label for="gf-season">Season <span style="color:var(--accent)">*</span></label>
                <select id="gf-season"><option value="">— Select Season —</option></select>
              </div>
            </div>
            <div class="form-group">
              <label for="gf-date">Date <span style="color:var(--accent)">*</span></label>
              <input type="date" id="gf-date">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="gf-team">Team <span style="color:var(--accent)">*</span></label>
                <select id="gf-team"><option value="">— Select Team —</option></select>
              </div>
              <div class="form-group">
                <label for="gf-opponent">Opponent <span style="color:var(--accent)">*</span></label>
                <select id="gf-opponent"><option value="">— Select Opponent —</option></select>
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="gf-location">Location</label>
                <select id="gf-location">
                  <option value="Home">Home</option>
                  <option value="Away">Away</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>
            </div>
            <div id="gf-score-display" style="display:none">
              <p class="form-section-label">Score (calculated from period data)</p>
              <div class="two-col">
                <div class="form-group">
                  <label>Team Score</label>
                  <div class="read-only-field" id="gf-team-score-val">—</div>
                </div>
                <div class="form-group">
                  <label>Opponent Score</label>
                  <div class="read-only-field" id="gf-opp-score-val">—</div>
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="gf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="gf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="gf-status"></div>
          </form>
        </div>`;
    },

    async init(params = {}) {
      const backQ = new URLSearchParams();
      if (params.league) backQ.set('league', params.league);
      if (params.season) backQ.set('season', params.season);
      if (params.team)   backQ.set('team',   params.team);
      const backHash = `#/${params.back || 'games'}${backQ.toString() ? '?' + backQ : ''}`;

      let leaguesCache = [], allSeasonsCache = [], allTeamsCache = [];
      try {
        const [lr, sr, tr] = await Promise.all([fetch('api/leagues'), fetch('api/seasons'), fetch('api/teams')]);
        const [ld, sd, td] = await Promise.all([lr.json(), sr.json(), tr.json()]);
        leaguesCache    = ld.leagues || [];
        allSeasonsCache = sd.seasons || [];
        allTeamsCache   = td.teams   || [];
      } catch {}

      let game = null;
      if (params.id) {
        document.getElementById('gf-page-title').textContent = 'Edit Game';
        try {
          const data = await fetch('api/games').then(r => r.json());
          game = (data.games || []).find(g => String(g.id) === String(params.id)) ?? null;
        } catch {}
      }

      const leagueId = game?.league_id ?? params.league ?? '';
      const seasonId = game?.season_id ?? params.season ?? '';
      const teamId   = game?.team_id   ?? params.team   ?? '';
      const oppId    = game?.opponent_id ?? '';

      document.getElementById('gf-league').innerHTML = '<option value="">— Select League —</option>' +
        leaguesCache.map(l =>
          `<option value="${l.id}"${String(l.id) === String(leagueId) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshFormSeasons(lid, selectedId = '') {
        document.getElementById('gf-season').innerHTML = '<option value="">— Select Season —</option>' +
          allSeasonsCache.filter(s => !lid || String(s.league_id) === lid)
            .map(s => `<option value="${s.id}"${String(s.id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`)
            .join('');
      }

      function refreshFormTeams(sid, selectedTeamId = '', selectedOppId = '') {
        const seen = new Map();
        for (const t of allTeamsCache) { if (!seen.has(t.id)) seen.set(t.id, t); }
        const unique = [...seen.values()].filter(t =>
          !sid || allTeamsCache.some(r => r.id === t.id && String(r.season_ids || '').split(',').includes(String(sid)))
        );
        const opts = '<option value="">— Select —</option>' +
          unique.map(t => `<option value="${t.id}">${escapeHtml(t.name)}${t.abbrev ? ` (${t.abbrev})` : ''}</option>`)
            .join('');
        const teamSel = document.getElementById('gf-team');
        const oppSel  = document.getElementById('gf-opponent');
        teamSel.innerHTML = opts.replace('— Select —', '— Select Team —');
        oppSel.innerHTML  = opts.replace('— Select —', '— Select Opponent —');
        if (selectedTeamId) teamSel.value = String(selectedTeamId);
        if (selectedOppId)  oppSel.value  = String(selectedOppId);
      }

      refreshFormSeasons(leagueId, seasonId);
      refreshFormTeams(seasonId, teamId, oppId);

      if (game) {
        setValue('gf-date', String(game.game_date).substring(0, 10));
        document.getElementById('gf-location').value = game.location || 'Home';
        const scoreDisplay = document.getElementById('gf-score-display');
        scoreDisplay.style.display = '';
        document.getElementById('gf-team-score-val').textContent = game.team_score != null ? game.team_score : '—';
        document.getElementById('gf-opp-score-val').textContent  = game.opponent_score != null ? game.opponent_score : '—';
      }

      document.getElementById('gf-league').addEventListener('change', function () {
        refreshFormSeasons(this.value);
        refreshFormTeams('');
      });
      document.getElementById('gf-season').addEventListener('change', function () {
        refreshFormTeams(this.value);
      });

      document.getElementById('gf-cancel').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      document.getElementById('gf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('gf-save');
        const body = {
          season_id:   document.getElementById('gf-season').value,
          team_id:     document.getElementById('gf-team').value,
          opponent_id: document.getElementById('gf-opponent').value,
          game_date:   document.getElementById('gf-date').value,
          location:    document.getElementById('gf-location').value,
        };
        if (!body.season_id || !body.team_id || !body.opponent_id || !body.game_date) {
          showStatus('gf-status', 'error', 'Season, team, opponent and date are required.');
          return;
        }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(game ? `api/games/${game.id}` : 'api/games', {
            method: game ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          if (data.success || data.id) {
            window.location.hash = backHash;
          } else {
            showStatus('gf-status', 'error', data.error || 'Save failed');
          }
        } catch {
          showStatus('gf-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });

      if (window.matchMedia('(hover: hover)').matches)
        document.getElementById('gf-date').focus();
    }
  },

  home: {
    render() {
      return `
        <h2 class="page-title">Dashboard</h2>
        <div class="card">
          <h3 class="section-title">Quick Summary</h3>
          <div class="summary-grid">
            <a class="summary-tile is-link" href="#/leagues">
              <span class="summary-count" id="s-leagues">—</span>
              <span class="summary-label">Leagues</span>
            </a>
            <a class="summary-tile is-link" href="#/seasons">
              <span class="summary-count" id="s-seasons">—</span>
              <span class="summary-label">Seasons</span>
            </a>
            <a class="summary-tile is-link" href="#/teams">
              <span class="summary-count" id="s-teams">—</span>
              <span class="summary-label">Teams</span>
            </a>
            <div class="summary-tile">
              <span class="summary-count" id="s-competitions">—</span>
              <span class="summary-label">Competitions</span>
            </div>
            <div class="summary-tile">
              <span class="summary-count" id="s-boxscores">—</span>
              <span class="summary-label">Boxscores</span>
            </div>
            <div class="summary-tile">
              <span class="summary-count" id="s-players">—</span>
              <span class="summary-label">Players</span>
            </div>
          </div>
          <p class="summary-msg" id="summary-msg"></p>
        </div>
      `;
    },

    async init() {
      try {
        const res = await fetch('api/summary');
        const data = await res.json();
        if (!data.configured) {
          document.getElementById('summary-msg').textContent =
            'Configure your database connection in Settings to see stats.';
          return;
        }
        if (data.error) {
          document.getElementById('summary-msg').textContent =
            `Database unavailable: ${data.error}`;
          return;
        }
        document.getElementById('s-leagues').textContent      = data.leagues;
        document.getElementById('s-seasons').textContent      = data.seasons;
        document.getElementById('s-teams').textContent        = data.teams;
        document.getElementById('s-competitions').textContent = data.competitions;
        document.getElementById('s-boxscores').textContent    = data.boxscores;
        document.getElementById('s-players').textContent      = data.players;
      } catch {
        document.getElementById('summary-msg').textContent = 'Could not load summary.';
      }
    }
  },

  settings: {
    render() {
      return `
        <h2 class="page-title">Settings</h2>
        <div class="card">
          <h3 class="section-title">Appearance</h3>
          <div class="theme-picker">
            <button class="theme-option" data-theme="dark">
              <div class="theme-swatch swatch-dark"></div>
              Dark
            </button>
            <button class="theme-option" data-theme="light">
              <div class="theme-swatch swatch-light"></div>
              Light
            </button>
          </div>
        </div>
        <div class="card">
          <h3 class="section-title">Database Connection</h3>
          <form id="db-form" novalidate>
            <div class="host-port-row">
              <div class="form-group">
                <label for="db-host">Host</label>
                <input type="text" id="db-host" name="host"
                       placeholder="localhost" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="db-port">Port</label>
                <input type="number" id="db-port" name="port"
                       placeholder="3306" min="1" max="65535">
              </div>
            </div>
            <div class="form-group">
              <label for="db-name">Database Name</label>
              <input type="text" id="db-name" name="name"
                     placeholder="statmanager" autocomplete="off" spellcheck="false">
            </div>
            <div class="form-group">
              <label for="db-user">Username</label>
              <input type="text" id="db-user" name="user"
                     placeholder="root" autocomplete="username" spellcheck="false">
            </div>
            <div class="form-group">
              <label for="db-password">Password</label>
              <input type="password" id="db-password" name="password"
                     autocomplete="current-password">
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="test-btn">Test Connection</button>
              <button type="submit" class="btn btn-primary">Save Settings</button>
              <button type="button" class="btn btn-secondary" id="cancel-btn">Restore</button>
            </div>
            <div class="status-msg" id="db-status"></div>
          </form>
        </div>
        <div class="card">
          <h3 class="section-title">Database Setup</h3>
          <p class="setup-warning">
            Creates the database if it does not exist, then runs the schema.
            <strong>All existing tables will be dropped and recreated — all data will be lost.</strong>
          </p>
          <div class="form-actions">
            <button type="button" class="btn btn-danger" id="init-db-btn">Initialize Database</button>
          </div>
          <div class="status-msg" id="init-db-status"></div>
        </div>
      `;
    },

    async init() {
      // Theme picker
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
        btn.addEventListener('click', () => {
          applyTheme(btn.dataset.theme);
          document.querySelectorAll('.theme-option').forEach(b =>
            b.classList.toggle('active', b === btn)
          );
        });
      });

      let original = null;

      try {
        const res = await fetch('api/settings');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const db = data.database || {};
        setValue('db-host', db.host);
        setValue('db-port', db.port);
        setValue('db-name', db.name);
        setValue('db-user', db.user);
        if (db.passwordSet) {
          document.getElementById('db-password').placeholder = 'Saved — leave blank to keep';
        }
        original = db;
      } catch {
        showStatus('db-status', 'error', 'Could not load saved settings.');
      }

      document.getElementById('cancel-btn').addEventListener('click', () => {
        if (original) {
          setValue('db-host', original.host);
          setValue('db-port', original.port);
          setValue('db-name', original.name);
          setValue('db-user', original.user);
          const pwd = document.getElementById('db-password');
          pwd.value = '';
          pwd.placeholder = original.passwordSet ? 'Saved — leave blank to keep' : '';
        }
        window.location.hash = '/';
      });

      document.getElementById('test-btn').addEventListener('click', async () => {
        const btn = document.getElementById('test-btn');
        btn.disabled = true;
        btn.textContent = 'Testing…';
        try {
          const res = await fetch('api/settings/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database: readForm() })
          });
          const data = await res.json();
          if (data.success) {
            showStatus('db-status', 'success', `Connected — MySQL ${data.version}`);
          } else {
            showStatus('db-status', 'error', data.error || 'Connection failed');
          }
        } catch {
          showStatus('db-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Test Connection';
        }
      });

      document.getElementById('init-db-btn').addEventListener('click', async () => {
        if (!confirm('This will drop and recreate all tables. All existing data will be lost.\n\nContinue?')) return;
        const btn = document.getElementById('init-db-btn');
        btn.disabled = true;
        btn.textContent = 'Initializing…';
        try {
          const res = await fetch('api/db/create', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showStatus('init-db-status', 'success', 'Database initialized successfully.');
          } else {
            showStatus('init-db-status', 'error', data.error || 'Initialization failed');
          }
        } catch {
          showStatus('init-db-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Initialize Database';
        }
      });

      document.getElementById('db-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          const res = await fetch('api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database: readForm() })
          });
          const data = await res.json();
          if (data.success) {
            showStatus('db-status', 'success', 'Settings saved.');
            // Reload to refresh passwordSet state
            await pages.settings.init();
          } else {
            showStatus('db-status', 'error', data.error || 'Save failed');
          }
        } catch {
          showStatus('db-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Save Settings';
        }
      });
    }
  }
};

// ── Shared icons ─────────────────────────────────────────────────────────────
const EDIT_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;
const DELETE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6"/><path d="M14 11v6"/>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`;
const ADD_SEASON_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
  <line x1="12" y1="15" x2="12" y2="19"/>
  <line x1="10" y1="17" x2="14" y2="17"/>
</svg>`;

const ADD_TEAM_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <line x1="19" y1="8" x2="19" y2="14"/>
  <line x1="22" y1="11" x2="16" y2="11"/>
</svg>`;

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sm-theme', theme);
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.content = theme === 'light' ? '#0969da' : '#e5a00d';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

function readForm() {
  return {
    host: document.getElementById('db-host').value.trim(),
    port: parseInt(document.getElementById('db-port').value) || 3306,
    name: document.getElementById('db-name').value.trim(),
    user: document.getElementById('db-user').value.trim(),
    password: document.getElementById('db-password').value
  };
}

function showStatus(id, type, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `status-msg ${type}`;
  el.textContent = message;
  if (type === 'success') {
    setTimeout(() => { el.className = 'status-msg'; }, 5000);
  }
}

// ── League Modal ──────────────────────────────────────────────────────────────
const LeagueModal = (() => {
  let _overlay = null;
  let _league  = null;
  let _onSaved = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _league = null;
  }

  function open(league = null, onSaved = null) {
    _close();
    _league  = league;
    _onSaved = onSaved;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="league-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">${league ? 'Edit League' : 'New League'}</span>
            <button class="modal-close" id="lm-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <form id="league-modal-form" novalidate>
            <div class="form-group">
              <label for="lm-name">League Name <span style="color:var(--accent)">*</span></label>
              <input type="text" id="lm-name" placeholder="e.g. City Basketball Association" autocomplete="off" spellcheck="false">
            </div>
            <div class="form-group">
              <label for="lm-founded">Founded Date</label>
              <input type="date" id="lm-founded">
            </div>
            <p class="form-section-label">Contact</p>
            <div class="form-group">
              <label for="lm-contact-person">Contact Person</label>
              <input type="text" id="lm-contact-person" autocomplete="off" spellcheck="false">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="lm-contact-phone">Phone</label>
                <input type="tel" id="lm-contact-phone" autocomplete="off">
              </div>
              <div class="form-group">
                <label for="lm-contact-email">Email</label>
                <input type="email" id="lm-contact-email" spellcheck="false">
              </div>
            </div>
            <p class="form-section-label">Online Presence</p>
            <div class="form-group">
              <label for="lm-website">Website URL</label>
              <input type="url" id="lm-website" placeholder="https://" spellcheck="false">
            </div>
            <div class="three-col">
              <div class="form-group">
                <label for="lm-facebook">Facebook</label>
                <input type="text" id="lm-facebook" placeholder="@handle" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="lm-x-handle">X (Twitter)</label>
                <input type="text" id="lm-x-handle" placeholder="@handle" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="lm-instagram">Instagram</label>
                <input type="text" id="lm-instagram" placeholder="@handle" spellcheck="false">
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="lm-save-btn">Save</button>
              <button type="button" class="btn btn-secondary" id="lm-cancel-btn">Cancel</button>
            </div>
            <div class="status-msg" id="lm-status"></div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('league-modal');

    if (league) {
      setValue('lm-name',           league.name);
      setValue('lm-founded',        league.founded_date ? String(league.founded_date).substring(0, 10) : '');
      setValue('lm-contact-person', league.contact_person);
      setValue('lm-contact-phone',  league.contact_phone);
      setValue('lm-contact-email',  league.contact_email);
      setValue('lm-website',        league.website_url);
      setValue('lm-facebook',       league.facebook);
      setValue('lm-x-handle',       league.x_handle);
      setValue('lm-instagram',      league.instagram);
    }

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return; // ignore ghost clicks on mobile
      if (e.target === _overlay) _close();
    });
    document.getElementById('lm-x').addEventListener('click', _close);
    document.getElementById('lm-cancel-btn').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('league-modal-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn  = document.getElementById('lm-save-btn');
      const body = {
        name:           document.getElementById('lm-name').value.trim(),
        founded_date:   document.getElementById('lm-founded').value || null,
        contact_person: document.getElementById('lm-contact-person').value.trim() || null,
        contact_phone:  document.getElementById('lm-contact-phone').value.trim() || null,
        contact_email:  document.getElementById('lm-contact-email').value.trim() || null,
        website_url:    document.getElementById('lm-website').value.trim() || null,
        facebook:       document.getElementById('lm-facebook').value.trim() || null,
        x_handle:       document.getElementById('lm-x-handle').value.trim() || null,
        instagram:      document.getElementById('lm-instagram').value.trim() || null,
      };
      if (!body.name) { showStatus('lm-status', 'error', 'League name is required.'); return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const res  = await fetch(_league ? `api/leagues/${_league.id}` : 'api/leagues', {
          method:  _league ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success || data.id) { _close(); _onSaved?.(); }
        else showStatus('lm-status', 'error', data.error || 'Save failed');
      } catch {
        showStatus('lm-status', 'error', 'Request failed — is the server running?');
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    });

    // Don't auto-focus on touch devices — keyboard appearance reshuffles the
    // viewport on iOS and can push the fixed-position modal off-screen.
    if (window.matchMedia('(hover: hover)').matches) {
      document.getElementById('lm-name').focus();
    }
  }

  return { open, close: _close };
})();

// ── Season Modal ──────────────────────────────────────────────────────────────
const SeasonModal = (() => {
  let _overlay = null;
  let _season  = null;
  let _onSaved = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _season = null;
  }

  async function open(season = null, onSaved = null, prefillLeagueId = null) {
    _close();
    _season  = season;
    _onSaved = onSaved;

    let leagues = [];
    try {
      const res  = await fetch('api/leagues');
      const data = await res.json();
      leagues = data.leagues || [];
    } catch {}

    const leagueId = season?.league_id ?? prefillLeagueId ?? '';
    const leagueOpts = leagues.map(l =>
      `<option value="${l.id}"${String(l.id) === String(leagueId) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="season-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">${season ? 'Edit Season' : 'New Season'}</span>
            <button class="modal-close" id="sm-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <form id="season-modal-form" novalidate>
            <div class="form-group">
              <label for="sm-league">League <span style="color:var(--accent)">*</span></label>
              <select id="sm-league"${prefillLeagueId && !season ? ' disabled' : ''}>
                <option value="">— Select League —</option>
                ${leagueOpts}
              </select>
            </div>
            <div class="form-group">
              <label for="sm-name">Season Name <span style="color:var(--accent)">*</span></label>
              <input type="text" id="sm-name" placeholder="e.g. 2025-26" autocomplete="off" spellcheck="false">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="sm-start-year">Start Year <span style="color:var(--accent)">*</span></label>
                <input type="number" id="sm-start-year" placeholder="2025" min="1900" max="2100">
              </div>
              <div class="form-group">
                <label for="sm-end-year">End Year <span style="color:var(--accent)">*</span></label>
                <input type="number" id="sm-end-year" placeholder="2026" min="1900" max="2100">
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="sm-save-btn">Save</button>
              <button type="button" class="btn btn-secondary" id="sm-cancel-btn">Cancel</button>
            </div>
            <div class="status-msg" id="sm-status"></div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('season-modal');

    if (season) {
      setValue('sm-name',       season.name);
      setValue('sm-start-year', season.start_year);
      setValue('sm-end-year',   season.end_year);
    }

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('sm-x').addEventListener('click', _close);
    document.getElementById('sm-cancel-btn').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('season-modal-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn  = document.getElementById('sm-save-btn');
      const body = {
        league_id:  document.getElementById('sm-league').value,
        name:       document.getElementById('sm-name').value.trim(),
        start_year: document.getElementById('sm-start-year').value,
        end_year:   document.getElementById('sm-end-year').value,
      };
      if (!body.league_id || !body.name || !body.start_year || !body.end_year) {
        showStatus('sm-status', 'error', 'All fields are required.');
        return;
      }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const res  = await fetch(_season ? `api/seasons/${_season.id}` : 'api/seasons', {
          method:  _season ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success || data.id) { _close(); _onSaved?.(); }
        else showStatus('sm-status', 'error', data.error || 'Save failed');
      } catch {
        showStatus('sm-status', 'error', 'Request failed — is the server running?');
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    });

    if (window.matchMedia('(hover: hover)').matches) {
      document.getElementById('sm-name').focus();
    }
  }

  return { open, close: _close };
})();

// ── Team Modal ────────────────────────────────────────────────────────────────
const TeamModal = (() => {
  let _overlay = null;
  let _team    = null;
  let _onSaved = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _team = null;
  }

  function open(team = null, onSaved = null) {
    _close();
    _team    = team;
    _onSaved = onSaved;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="team-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">${team ? 'Edit Team' : 'New Team'}</span>
            <button class="modal-close" id="tm2-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <form id="team-modal-form" novalidate>
            <div class="form-group">
              <label for="tm2-name">Team Name <span style="color:var(--accent)">*</span></label>
              <input type="text" id="tm2-name" autocomplete="off" spellcheck="false">
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="tm2-abbrev">Abbreviation</label>
                <input type="text" id="tm2-abbrev" maxlength="5" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="tm2-nickname">Nickname</label>
                <input type="text" id="tm2-nickname" maxlength="25" autocomplete="off" spellcheck="false">
              </div>
            </div>
            <div class="form-group">
              <label for="tm2-gender">Gender</label>
              <select id="tm2-gender">
                <option value="">Not specified</option>
                <option value="0">Male</option>
                <option value="1">Female</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="tm2-save-btn">Save</button>
              <button type="button" class="btn btn-secondary" id="tm2-cancel-btn">Cancel</button>
            </div>
            <div class="status-msg" id="tm2-status"></div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('team-modal');

    if (team) {
      setValue('tm2-name',     team.name);
      setValue('tm2-abbrev',   team.abbrev);
      setValue('tm2-nickname', team.nickname);
      document.getElementById('tm2-gender').value = team.gender != null ? String(Number(team.gender)) : '';
    }

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('tm2-x').addEventListener('click', _close);
    document.getElementById('tm2-cancel-btn').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('team-modal-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn  = document.getElementById('tm2-save-btn');
      const body = {
        name:     document.getElementById('tm2-name').value.trim(),
        abbrev:   document.getElementById('tm2-abbrev').value.trim(),
        nickname: document.getElementById('tm2-nickname').value.trim(),
        gender:   document.getElementById('tm2-gender').value,
      };
      if (!body.name) { showStatus('tm2-status', 'error', 'Team name is required.'); return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const res  = await fetch(_team ? `api/teams/${_team.id}` : 'api/teams', {
          method:  _team ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success || data.id) { _close(); _onSaved?.(); }
        else showStatus('tm2-status', 'error', data.error || 'Save failed');
      } catch {
        showStatus('tm2-status', 'error', 'Request failed — is the server running?');
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    });

    if (window.matchMedia('(hover: hover)').matches) {
      document.getElementById('tm2-name').focus();
    }
  }

  return { open, close: _close };
})();

// ── Team Season Modal ─────────────────────────────────────────────────────────
const TeamSeasonModal = (() => {
  let _overlay = null;
  let _team    = null;
  let _onSaved = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _team = null;
  }

  async function open(team, onSaved = null) {
    _close();
    _team    = team;
    _onSaved = onSaved;

    let leagues = [], seasons = [];
    try {
      const [lr, sr] = await Promise.all([fetch('api/leagues'), fetch('api/seasons')]);
      const [ld, sd] = await Promise.all([lr.json(), sr.json()]);
      leagues = ld.leagues || [];
      seasons = sd.seasons || [];
    } catch {}

    const leagueOpts = leagues.map(l =>
      `<option value="${l.id}">${escapeHtml(l.name)}</option>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="tsm-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">Add to Season — ${escapeHtml(team.name)}</span>
            <button class="modal-close" id="tsm-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <form id="tsm-form" novalidate>
            <div class="two-col">
              <div class="form-group">
                <label for="tsm-league">League</label>
                <select id="tsm-league">
                  <option value="">— All Leagues —</option>
                  ${leagueOpts}
                </select>
              </div>
              <div class="form-group">
                <label for="tsm-season">Season <span style="color:var(--accent)">*</span></label>
                <select id="tsm-season">
                  <option value="">— Select Season —</option>
                  ${seasons.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.league_name)})</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="tsm-coach">Coach</label>
                <input type="text" id="tsm-coach" maxlength="25" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="tsm-active">Status</label>
                <select id="tsm-active">
                  <option value="">Unknown</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="tsm-save-btn">Save</button>
              <button type="button" class="btn btn-secondary" id="tsm-cancel-btn">Cancel</button>
            </div>
            <div class="status-msg" id="tsm-status"></div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('tsm-modal');

    // League filter cascades the season list
    document.getElementById('tsm-league').addEventListener('change', function () {
      const lid = this.value;
      document.getElementById('tsm-season').innerHTML =
        '<option value="">— Select Season —</option>' +
        seasons.filter(s => !lid || String(s.league_id) === lid)
          .map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.league_name)})</option>`)
          .join('');
    });

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('tsm-x').addEventListener('click', _close);
    document.getElementById('tsm-cancel-btn').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('tsm-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn  = document.getElementById('tsm-save-btn');
      const body = {
        season_id: document.getElementById('tsm-season').value,
        coach:     document.getElementById('tsm-coach').value.trim(),
        active:    document.getElementById('tsm-active').value,
      };
      if (!body.season_id) { showStatus('tsm-status', 'error', 'Season is required.'); return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const res  = await fetch(`api/teams/${_team.id}/seasons`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) { _close(); _onSaved?.(); }
        else showStatus('tsm-status', 'error', data.error || 'Save failed');
      } catch {
        showStatus('tsm-status', 'error', 'Request failed — is the server running?');
      } finally {
        btn.disabled = false; btn.textContent = 'Save';
      }
    });

    if (window.matchMedia('(hover: hover)').matches) {
      document.getElementById('tsm-season').focus();
    }
  }

  return { open, close: _close };
})();

// ── Team Merge Modal ──────────────────────────────────────────────────────────
const SeasonMergeModal = (() => {
  let _overlay = null;
  let _onDone  = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _onDone = null;
  }

  function open(seasons, onDone = null) {
    _close();
    _onDone = onDone;

    const opts = seasons.map(s =>
      `<option value="${s.id}">${escapeHtml(s.label)}</option>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="smrg-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">Merge ${seasons.length} Seasons</span>
            <button class="modal-close" id="smrg-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <p class="merge-desc">Select the master season. All teams, games, and players from the other season(s) will be moved into it, then the source seasons will be deleted. This cannot be undone.</p>
          <div class="form-group">
            <label for="smrg-master">Master Season</label>
            <select id="smrg-master">${opts}</select>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="smrg-confirm">Merge</button>
            <button class="btn btn-secondary" id="smrg-cancel">Cancel</button>
          </div>
          <div class="status-msg" id="smrg-status"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('smrg-modal');

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('smrg-x').addEventListener('click', _close);
    document.getElementById('smrg-cancel').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('smrg-confirm').addEventListener('click', async () => {
      const masterId = parseInt(document.getElementById('smrg-master').value);
      const master   = seasons.find(s => s.id === masterId);
      const sources  = seasons.filter(s => s.id !== masterId);
      if (!masterId || !sources.length) {
        showStatus('smrg-status', 'error', 'Select a master season.'); return;
      }
      const btn = document.getElementById('smrg-confirm');
      btn.disabled = true; btn.textContent = 'Merging…';
      try {
        const res  = await fetch('api/seasons/merge', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ masterId, sourceIds: sources.map(s => s.id) })
        });
        const data = await res.json();
        if (data.success) {
          const cb = _onDone;
          _close();
          await cb?.();
          alert(
            `Merge complete.\n\n` +
            `Master: ${master.label}\n` +
            `Merged in: ${sources.map(s => s.label).join(', ')}`
          );
        } else {
          showStatus('smrg-status', 'error', data.error || 'Merge failed');
          btn.disabled = false; btn.textContent = 'Merge';
        }
      } catch {
        showStatus('smrg-status', 'error', 'Request failed — is the server running?');
        btn.disabled = false; btn.textContent = 'Merge';
      }
    });

    if (window.matchMedia('(hover: hover)').matches)
      document.getElementById('smrg-master').focus();
  }

  return { open, close: _close };
})();

const LeagueMergeModal = (() => {
  let _overlay = null;
  let _onDone  = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _onDone = null;
  }

  function open(leagues, onDone = null) {
    _close();
    _onDone = onDone;

    const opts = leagues.map(l =>
      `<option value="${l.id}">${escapeHtml(l.label)}</option>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="lgmrg-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">Merge ${leagues.length} Leagues</span>
            <button class="modal-close" id="lgmrg-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <p class="merge-desc">Select the master league. All seasons from the other league(s) will be moved into it, then the source leagues will be deleted. This cannot be undone.</p>
          <div class="form-group">
            <label for="lgmrg-master">Master League</label>
            <select id="lgmrg-master">${opts}</select>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="lgmrg-confirm">Merge</button>
            <button class="btn btn-secondary" id="lgmrg-cancel">Cancel</button>
          </div>
          <div class="status-msg" id="lgmrg-status"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('lgmrg-modal');

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('lgmrg-x').addEventListener('click', _close);
    document.getElementById('lgmrg-cancel').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('lgmrg-confirm').addEventListener('click', async () => {
      const masterId = parseInt(document.getElementById('lgmrg-master').value);
      const master   = leagues.find(l => l.id === masterId);
      const sources  = leagues.filter(l => l.id !== masterId);
      if (!masterId || !sources.length) {
        showStatus('lgmrg-status', 'error', 'Select a master league.'); return;
      }
      const btn = document.getElementById('lgmrg-confirm');
      btn.disabled = true; btn.textContent = 'Merging…';
      try {
        const res  = await fetch('api/leagues/merge', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ masterId, sourceIds: sources.map(l => l.id) })
        });
        const data = await res.json();
        if (data.success) {
          const cb = _onDone;
          _close();
          await cb?.();
          alert(
            `Merge complete.\n\n` +
            `Master: ${master.label}\n` +
            `Merged in: ${sources.map(l => l.label).join(', ')}`
          );
        } else {
          showStatus('lgmrg-status', 'error', data.error || 'Merge failed');
          btn.disabled = false; btn.textContent = 'Merge';
        }
      } catch {
        showStatus('lgmrg-status', 'error', 'Request failed — is the server running?');
        btn.disabled = false; btn.textContent = 'Merge';
      }
    });

    if (window.matchMedia('(hover: hover)').matches)
      document.getElementById('lgmrg-master').focus();
  }

  return { open, close: _close };
})();

const TeamMergeModal = (() => {
  let _overlay = null;
  let _onDone  = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _onDone = null;
  }

  function open(teams, onDone = null, opts = {}) {
    _close();
    _onDone = onDone;

    const keyOf      = opts.keyOf || (t => t.id);
    const title      = opts.title || `Merge ${teams.length} Teams`;
    const desc       = opts.description || 'Select the master team. All seasons and games from the other team(s) will be transferred into it, then the source teams will be deleted. This cannot be undone.';
    const selectOpts = teams.map(t =>
      `<option value="${keyOf(t)}">${escapeHtml(t.label)}</option>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="mrg-modal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">${escapeHtml(title)}</span>
            <button class="modal-close" id="mrg-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <p class="merge-desc">${escapeHtml(desc)}</p>
          <div class="form-group">
            <label for="mrg-master">Master Team</label>
            <select id="mrg-master">${selectOpts}</select>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="mrg-confirm">Merge</button>
            <button class="btn btn-secondary" id="mrg-cancel">Cancel</button>
          </div>
          <div class="status-msg" id="mrg-status"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('mrg-modal');

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('mrg-x').addEventListener('click', _close);
    document.getElementById('mrg-cancel').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('mrg-confirm').addEventListener('click', async () => {
      const masterKey = String(document.getElementById('mrg-master').value);
      const master    = teams.find(t => String(keyOf(t)) === masterKey);
      const sources   = teams.filter(t => String(keyOf(t)) !== masterKey);
      if (!masterKey || !master || (!opts.confirmFn && !sources.length)) {
        showStatus('mrg-status', 'error', 'Select a master team.'); return;
      }
      const btn = document.getElementById('mrg-confirm');
      btn.disabled = true; btn.textContent = 'Merging…';
      try {
        let data;
        if (opts.confirmFn) {
          data = await opts.confirmFn(masterKey, master, sources);
        } else {
          const res = await fetch('api/teams/merge', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ masterId: parseInt(masterKey), sourceIds: sources.map(t => t.id) })
          });
          data = await res.json();
        }
        if (data.success) {
          const cb = _onDone;
          _close();
          await cb?.();
          alert(opts.successMsg
            ? opts.successMsg(master, sources)
            : `Merge complete.\n\nMaster: ${master.label}\nMerged in: ${sources.map(t => t.label).join(', ')}`
          );
        } else {
          showStatus('mrg-status', 'error', data.error || 'Merge failed');
          btn.disabled = false; btn.textContent = 'Merge';
        }
      } catch {
        showStatus('mrg-status', 'error', 'Request failed — is the server running?');
        btn.disabled = false; btn.textContent = 'Merge';
      }
    });

    if (window.matchMedia('(hover: hover)').matches)
      document.getElementById('mrg-master').focus();
  }

  return { open, close: _close };
})();

// ── Router ────────────────────────────────────────────────────────────────────
function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '') || 'home';
  const [route, qs] = hash.split('?');
  const params = {};
  if (qs) qs.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  });
  return { route, params };
}

function renderPage() {
  const { route, params } = getRoute();
  const page = pages[route] || pages.home;
  const main = document.getElementById('main');
  main.innerHTML = page.render();
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  page.init?.(params);
  buildMenu(page.menuRoute || route);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function buildMenu(activeRoute) {
  const renderItem = item => `
    <li class="menu-item ${activeRoute === item.route ? 'active' : ''}">
      <a href="#/${item.route}">
        <span class="menu-icon">${item.icon}</span>
        ${item.label}
      </a>
    </li>`;
  const main     = MENU_ITEMS.filter(i => i.route !== 'settings');
  const settings = MENU_ITEMS.find(i => i.route === 'settings');
  document.getElementById('menu').innerHTML =
    main.map(renderItem).join('') +
    (settings ? `<li class="menu-divider"></li>${renderItem(settings)}` : '');
}

function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('overlay');

  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  };

  hamburger.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', open);
  });

  overlay.addEventListener('click', close);

  document.getElementById('menu').addEventListener('click', e => {
    if (e.target.closest('a')) close();
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', renderPage);

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  renderPage();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
