'use strict';

let currentUser = null;

// ── Navigation helpers ────────────────────────────────────────────────────────
function navigateTo(route, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  window.location.hash = `#/${route}${qs ? '?' + qs : ''}`;
}

function updateUrlSilent(route, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const next = `#/${route}${qs ? '?' + qs : ''}`;
  if (window.location.hash !== next) history.replaceState(null, '', next);
}

function backUrl(encoded, fallback = '#/') {
  if (!encoded) return fallback;
  const decoded = decodeURIComponent(encoded);
  return decoded.startsWith('#') ? decoded : `#/${decoded}`;
}

// ── Menu definition ──────────────────────────────────────────────────────────
const MENU_ITEMS = [
  {
    label: 'Dashboard',
    route: 'home',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>`
  },
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
    label: 'Players',
    route: 'players',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`
  },
  {
    label: 'Import',
    route: 'import',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>`
  },
  {
    label: 'Settings',
    route: 'settings',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`
  },
  {
    label: 'Members',
    route: 'membership',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`
  },
  {
    label: 'Users',
    route: 'users',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
  }
];

// ── Confirm dialog ────────────────────────────────────────────────────────────
function confirmDialog(title, message, { confirmLabel = 'Confirm', confirmClass = 'btn-danger' } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="max-width:400px">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
        </div>
        <p style="margin:16px 0;color:var(--text);white-space:pre-line">${escapeHtml(message)}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
          <button class="btn btn-secondary btn-sm" data-cd="cancel">Cancel</button>
          <button class="btn ${confirmClass} btn-sm" data-cd="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    function close(result) {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    }

    function onKey(e) {
      if (e.key === 'Escape') close(false);
    }

    overlay.querySelector('[data-cd="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-cd="confirm"]').addEventListener('click', () => close(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('[data-cd="confirm"]').focus();
  });
}

function alertDialog(title, message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="max-width:400px">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
        </div>
        <p style="margin:16px 0;color:var(--text);white-space:pre-line">${escapeHtml(message)}</p>
        <div style="display:flex;justify-content:flex-end;margin-top:4px">
          <button class="btn btn-primary btn-sm" data-ad="ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve();
    }

    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') close(); }

    overlay.querySelector('[data-ad="ok"]').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('[data-ad="ok"]').focus();
  });
}

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
                  <th class="col-num">Games</th>
                  <th class="col-num">Boxscores</th>
                  <th class="col-num">Teams</th>
                  <th class="col-num">Players</th>
                  <th>Contact Person</th>
                  <th>Links</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="league-list">
                <tr><td colspan="12" class="list-empty">Loading…</td></tr>
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

      function syncMasterCheck() {
        const boxes   = [...listEl.querySelectorAll('.row-check')];
        const checked = boxes.filter(cb => cb.checked).length;
        checkAll.checked       = boxes.length > 0 && checked === boxes.length;
        checkAll.indeterminate = checked > 0 && checked < boxes.length;
      }

      function renderRows() {
        countEl.textContent = `${leaguesCache.length} league${leaguesCache.length !== 1 ? 's' : ''}`;
        if (!leaguesCache.length) {
          listEl.innerHTML = '<tr><td colspan="12" class="list-empty">No leagues yet. Click + New League to add one.</td></tr>';
          return;
        }
        listEl.innerHTML = leaguesCache.map(lg => {
          const seasons = Number(lg.season_count);
          const teams   = Number(lg.team_count);
          const games   = Number(lg.competition_count);
          const seasonNav = seasons > 0
            ? `<a class="link-icon" href="#/seasons?league=${lg.league_id}" title="View seasons">${NAV_ICON}</a>`
            : '';
          const teamNav = teams > 0
            ? `<a class="link-icon" href="#/teams?league=${lg.league_id}" title="View teams">${NAV_ICON}</a>`
            : '';
          return `
          <tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-id="${lg.league_id}"></td>
            <td><a href="#/league-profile?id=${lg.league_id}&from=${encodeURIComponent(window.location.hash)}" class="tbl-link" style="color:var(--accent);display:inline-flex;align-items:center;gap:3px">${escapeHtml(lg.name)}${CHEVRON_ICON}</a></td>
            <td class="col-num" style="white-space:nowrap">${seasons}${seasonNav}</td>
            <td class="col-num">${games > 0 ? `<a class="tbl-link" href="#/seasons?league=${lg.league_id}">${games}</a>` : games}</td>
            <td class="col-num">${Number(lg.boxscore_count)}</td>
            <td class="col-num" style="white-space:nowrap">${teams}${teamNav}</td>
            <td class="col-num">${Number(lg.player_count)}</td>
            <td>${escapeHtml(lg.contact_person || '—')}</td>
            <td class="col-links">${buildLinks(lg)}</td>
            <td class="col-actions">
              <button class="btn-icon add-season-btn" data-id="${lg.league_id}" title="Add Season">${ADD_SEASON_ICON}</button>
            </td>
          </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadLeagues() {
        listEl.innerHTML = '<tr><td colspan="12" class="list-empty">Loading…</td></tr>';
        try {
          const res  = await fetch('api/leagues');
          const data = await res.json();
          if (data.error) {
            listEl.innerHTML = `<tr><td colspan="12" class="list-empty">${escapeHtml(data.error)}</td></tr>`;
            return;
          }
          leaguesCache = data.leagues;
          renderRows();
        } catch {
          listEl.innerHTML = '<tr><td colspan="12" class="list-empty">Could not load leagues.</td></tr>';
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
          const names = ids.map(id => leaguesCache.find(l => l.league_id === id)?.name ?? `#${id}`);
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
            const lg = leaguesCache.find(l => l.league_id === id);
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

      listEl.addEventListener('click', e => {
        const addSeasonBtn = e.target.closest('.add-season-btn');
        if (addSeasonBtn) {
          const league = leaguesCache.find(l => l.league_id === parseInt(addSeasonBtn.dataset.id));
          if (league) window.location.hash = `#/season-form?league=${league.league_id}&back=leagues`;
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
        <div id="lf-icon-section" class="card" style="margin-bottom:12px;display:none">
          <p class="form-section-label" style="margin-top:0">League Icon</p>
          <div style="display:flex;align-items:center;gap:16px">
            <div id="lf-icon-preview" style="width:72px;height:72px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
              <svg id="lf-icon-placeholder" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <img id="lf-icon-img" style="display:none;width:100%;height:100%;object-fit:contain" alt="League icon">
            </div>
            <div>
              <input type="file" id="lf-icon-file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" style="display:none">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn btn-secondary btn-sm" id="lf-icon-pick-btn">Upload Icon</button>
                <button type="button" class="btn btn-secondary btn-sm" id="lf-icon-remove-btn" style="display:none">Remove</button>
              </div>
              <div class="status-msg" id="lf-icon-status" style="margin-top:6px"></div>
            </div>
          </div>
        </div>
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
      const backHash = backUrl(params.back, '#/leagues');
      let league = null;
      if (params.id) {
        document.getElementById('lf-page-title').textContent = 'Edit League';
        try {
          const data = await fetch(`api/leagues/${params.id}`).then(r => r.json());
          league = data.league ?? null;
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

        // ── Icon section (edit only) ──────────────────────────────────────────
        const iconSection  = document.getElementById('lf-icon-section');
        const iconImg      = document.getElementById('lf-icon-img');
        const iconPH       = document.getElementById('lf-icon-placeholder');
        const iconFile     = document.getElementById('lf-icon-file');
        const iconPickBtn  = document.getElementById('lf-icon-pick-btn');
        const iconRemove   = document.getElementById('lf-icon-remove-btn');
        const iconStatus   = document.getElementById('lf-icon-status');
        iconSection.style.display = '';

        function setIconPreview(src) {
          if (src) {
            iconImg.src = src; iconImg.style.display = ''; iconPH.style.display = 'none';
            iconRemove.style.display = '';
          } else {
            iconImg.src = ''; iconImg.style.display = 'none'; iconPH.style.display = '';
            iconRemove.style.display = 'none';
          }
        }

        setIconPreview(league?.logo_path ? league.logo_path + '?t=' + Date.now() : null);

        iconPickBtn.addEventListener('click', () => iconFile.click());

        iconFile.addEventListener('change', async () => {
          const file = iconFile.files[0];
          if (!file) return;
          if (file.size > 1_048_576) {
            showStatus('lf-icon-status', 'error', 'File too large (max 1 MB)');
            iconFile.value = '';
            return;
          }
          iconPickBtn.disabled = true; iconPickBtn.textContent = 'Uploading…';
          iconStatus.textContent = '';
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = e => resolve(e.target.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const res  = await fetch(`api/leagues/${params.id}/icon`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: dataUrl }),
            });
            const result = await res.json();
            if (result.success) {
              setIconPreview(result.logo_path + '?t=' + Date.now());
              showStatus('lf-icon-status', 'success', 'Icon saved.');
            } else {
              showStatus('lf-icon-status', 'error', result.error || 'Upload failed');
            }
          } catch {
            showStatus('lf-icon-status', 'error', 'Upload failed — is the server running?');
          } finally {
            iconPickBtn.disabled = false; iconPickBtn.textContent = 'Upload Icon';
            iconFile.value = '';
          }
        });

        iconRemove.addEventListener('click', async () => {
          if (!confirm('Remove the league icon?')) return;
          iconRemove.disabled = true;
          try {
            const res    = await fetch(`api/leagues/${params.id}/icon`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
              setIconPreview(null);
              showStatus('lf-icon-status', 'success', 'Icon removed.');
            } else {
              showStatus('lf-icon-status', 'error', result.error || 'Remove failed');
            }
          } catch {
            showStatus('lf-icon-status', 'error', 'Request failed');
          } finally {
            iconRemove.disabled = false;
          }
        });
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
          const res  = await fetch(league ? `api/leagues/${league.league_id}` : 'api/leagues', {
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
        <div class="card" style="margin-bottom:12px">
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
            <div class="form-group">
              <label for="tf-external-code">External Code</label>
              <input type="text" id="tf-external-code" maxlength="20" autocomplete="off" spellcheck="false" placeholder="e.g. KVHS02">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="tf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="tf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="tf-status"></div>
          </form>
        </div>
        <div id="tf-photo-section" class="card" style="margin-top:12px;display:none">
          <h3 class="section-title">Team Logo</h3>
          <div style="display:flex;align-items:center;gap:14px">
            <div id="tf-photo-preview" style="width:80px;height:80px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
              <svg id="tf-photo-placeholder" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <img id="tf-photo-img" style="display:none;width:100%;height:100%;object-fit:cover" alt="Team logo">
            </div>
            <div>
              <input type="file" id="tf-photo-file" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn btn-secondary btn-sm" id="tf-photo-pick-btn">Upload Logo</button>
                <button type="button" class="btn btn-secondary btn-sm" id="tf-photo-remove-btn" style="display:none">Remove</button>
              </div>
              <div class="status-msg" id="tf-photo-status" style="margin-top:6px"></div>
            </div>
          </div>
        </div>
        <div id="tf-season-photos-section" class="card" style="margin-top:12px;display:none">
          <h3 class="section-title">Season Info</h3>
          <div id="tf-season-photos-list"></div>
        </div>
      `;
    },

    async init(params = {}) {
      const backHash = backUrl(params.back, '#/teams');

      let team = null;
      if (params.id) {
        document.getElementById('tf-page-title').textContent = 'Edit Team';
        try {
          const data = await fetch('api/teams').then(r => r.json());
          team = (data.teams || []).find(t => String(t.team_id) === String(params.id)) ?? null;
          if (team) {
            setValue('tf-name',          team.name);
            setValue('tf-abbrev',        team.abbrev);
            setValue('tf-nickname',      team.nickname);
            setValue('tf-external-code', team.external_code);
            document.getElementById('tf-gender').value =
              team.gender != null ? String(Number(team.gender)) : '';

            // Photo section (only available when editing)
            document.getElementById('tf-photo-section').style.display = '';
            const photoImg    = document.getElementById('tf-photo-img');
            const photoPH     = document.getElementById('tf-photo-placeholder');
            const photoFile   = document.getElementById('tf-photo-file');
            const photoPickBtn  = document.getElementById('tf-photo-pick-btn');
            const photoRemoveBtn = document.getElementById('tf-photo-remove-btn');

            function setPhotoPreview(src) {
              if (src) {
                photoImg.src = src; photoImg.style.display = ''; photoPH.style.display = 'none';
                photoRemoveBtn.style.display = '';
              } else {
                photoImg.src = ''; photoImg.style.display = 'none'; photoPH.style.display = '';
                photoRemoveBtn.style.display = 'none';
              }
            }

            setPhotoPreview(team.logo_path ? team.logo_path + '?t=' + Date.now() : null);

            document.getElementById('tf-photo-pick-btn').addEventListener('click', () => photoFile.click());

            photoFile.addEventListener('change', async () => {
              const file = photoFile.files[0];
              if (!file) return;
              if (file.size > 1_048_576) {
                showStatus('tf-photo-status', 'error', 'File too large (max 1 MB)');
                photoFile.value = '';
                return;
              }
              photoPickBtn.disabled = true; photoPickBtn.textContent = 'Uploading…';
              try {
                const dataUrl = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload  = e => resolve(e.target.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                const res    = await fetch(`api/teams/${team.team_id}/photo`, {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ data: dataUrl }),
                });
                const result = await res.json();
                if (result.success) {
                  setPhotoPreview(result.logo_path + '?t=' + Date.now());
                  showStatus('tf-photo-status', 'success', 'Photo saved.');
                } else {
                  showStatus('tf-photo-status', 'error', result.error || 'Upload failed');
                }
              } catch {
                showStatus('tf-photo-status', 'error', 'Upload failed — is the server running?');
              } finally {
                photoPickBtn.disabled = false; photoPickBtn.textContent = 'Upload Photo';
                photoFile.value = '';
              }
            });

            photoRemoveBtn.addEventListener('click', async () => {
              if (!confirm('Remove the team logo?')) return;
              photoRemoveBtn.disabled = true;
              try {
                const res    = await fetch(`api/teams/${team.team_id}/photo`, { method: 'DELETE' });
                const result = await res.json();
                if (result.success) {
                  setPhotoPreview(null);
                  showStatus('tf-photo-status', 'success', 'Photo removed.');
                } else {
                  showStatus('tf-photo-status', 'error', result.error || 'Remove failed');
                }
              } catch {
                showStatus('tf-photo-status', 'error', 'Request failed');
              } finally {
                photoRemoveBtn.disabled = false;
              }
            });

            // Season info list
            const spSection = document.getElementById('tf-season-photos-section');
            const spList    = document.getElementById('tf-season-photos-list');
            try {
              const spRes  = await fetch(`api/teams/${team.team_id}/seasons`);
              const spData = await spRes.json();
              if (!spData.error && spData.seasons?.length) {
                spSection.style.display = '';

                function renderSeasonList(seasons) {
                  spList.innerHTML = `<table class="data-table">
                    <thead><tr><th>Season</th><th>League</th><th>Display Name</th><th>Sponsor</th><th>Logo</th><th class="col-actions"></th></tr></thead>
                    <tbody>${seasons.map(s => `
                      <tr>
                        <td>${escapeHtml(s.season_name)} <span style="color:var(--text-muted);font-size:.8em">${escapeHtml(s.label)}</span></td>
                        <td style="color:var(--text-muted)">${escapeHtml(s.league_name || '—')}</td>
                        <td style="color:var(--text-muted)">${escapeHtml(s.display_name || '—')}</td>
                        <td style="color:var(--text-muted)">${escapeHtml(s.sponsor || '—')}</td>
                        <td>${s.logo_path ? `<img src="${s.logo_path}?t=${Date.now()}" style="width:32px;height:32px;object-fit:contain;border-radius:4px;vertical-align:middle" alt="">` : '<span style="color:var(--text-muted)">—</span>'}</td>
                        <td class="col-actions"><button class="btn-icon sp-edit-btn" data-season-id="${s.season_id}" title="Edit">${EDIT_ICON}</button></td>
                      </tr>`).join('')}
                    </tbody></table>`;

                  spList.querySelectorAll('.sp-edit-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                      const s = spData.seasons.find(x => String(x.season_id) === btn.dataset.seasonId);
                      if (s) TeamSeasonInfoModal.open(team, s, updated => {
                        Object.assign(s, updated);
                        renderSeasonList(spData.seasons);
                      });
                    });
                  });
                }
                renderSeasonList(spData.seasons);
              }
            } catch {}
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
          name:          document.getElementById('tf-name').value.trim(),
          abbrev:        document.getElementById('tf-abbrev').value.trim(),
          nickname:      document.getElementById('tf-nickname').value.trim(),
          gender:        document.getElementById('tf-gender').value,
          external_code: document.getElementById('tf-external-code').value.trim(),
        };
        if (!body.name) { showStatus('tf-status', 'error', 'Team name is required.'); return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(team ? `api/teams/${team.team_id}` : 'api/teams', {
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
                  <th class="col-num">Games</th>
                  <th class="col-num">Boxscores</th>
                  <th class="col-num">Teams</th>
                  <th class="col-num">Players</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="season-list">
                <tr><td colspan="12" class="list-empty">Loading…</td></tr>
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
            `<option value="${l.league_id}"${String(l.league_id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
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
            ? `${teams} <a class="link-icon" href="#/teams?league=${s.league_id}&season=${s.season_id}" title="View teams">${NAV_ICON}</a>`
            : teams;
          return `
          <tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-id="${s.season_id}"></td>
            <td><button class="tbl-link name-btn" data-id="${s.season_id}">${escapeHtml(s.name)} (${escapeHtml(s.league_name)})</button></td>
            <td class="col-num">${Number(s.game_count)}</td>
            <td class="col-num">${Number(s.boxscore_count)}</td>
            <td class="col-num">${teamsCell}</td>
            <td class="col-num">${Number(s.player_count)}</td>
            <td class="col-actions">
              <button class="btn-icon add-team-btn" data-id="${s.season_id}" data-league-id="${s.league_id}" title="Add Team">${ADD_TEAM_ICON}</button>
              <button class="btn-icon edit-btn" data-id="${s.season_id}" title="Edit">${EDIT_ICON}</button>
              <button class="btn-icon delete-btn" data-id="${s.season_id}" title="Delete">${DELETE_ICON}</button>
            </td>
          </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadSeasons() {
        listEl.innerHTML = '<tr><td colspan="12" class="list-empty">Loading…</td></tr>';
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
            const s = seasonsCache.find(x => x.season_id === id);
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
            const s = seasonsCache.find(x => x.season_id === id);
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

      filterSel.addEventListener('change', () => { updateUrlSilent('seasons', { league: filterSel.value }); renderRows(); });

      document.getElementById('new-season-btn').addEventListener('click', () => {
        const q = new URLSearchParams({ back: encodeURIComponent(window.location.hash || '#/seasons') });
        if (filterSel.value) q.set('league', filterSel.value);
        window.location.hash = `#/season-form?${q}`;
      });

      listEl.addEventListener('click', async e => {
        const nameBtn    = e.target.closest('.name-btn');
        const addTeamBtn = e.target.closest('.add-team-btn');
        const editBtn    = e.target.closest('.edit-btn');
        const deleteBtn  = e.target.closest('.delete-btn');

        if (nameBtn) {
          const season = seasonsCache.find(s => s.season_id === parseInt(nameBtn.dataset.id));
          if (season) {
            const q = new URLSearchParams({ id: season.season_id, back: encodeURIComponent(window.location.hash || '#/seasons') });
            if (filterSel.value) q.set('league', filterSel.value);
            window.location.hash = `#/season-form?${q}`;
          }
        }

        if (addTeamBtn) {
          TeamModal.open(null, loadSeasons);
        }

        if (editBtn) {
          const season = seasonsCache.find(s => s.season_id === parseInt(editBtn.dataset.id));
          if (season) {
            const q = new URLSearchParams({ id: season.season_id, back: encodeURIComponent(window.location.hash || '#/seasons') });
            if (filterSel.value) q.set('league', filterSel.value);
            window.location.hash = `#/season-form?${q}`;
          }
        }

        if (deleteBtn) {
          const id     = parseInt(deleteBtn.dataset.id);
          const season = seasonsCache.find(s => s.season_id === id);
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
                <label for="sf-start-date">Start Date <span style="color:var(--accent)">*</span></label>
                <input type="date" id="sf-start-date">
              </div>
              <div class="form-group">
                <label for="sf-end-date">End Date <span style="color:var(--accent)">*</span></label>
                <input type="date" id="sf-end-date">
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
      const backHash = backUrl(params.back, '#/seasons');

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
          season = (data.seasons || []).find(s => String(s.season_id) === String(params.id)) ?? null;
        } catch {}
      }

      const leagueId  = season?.league_id ?? params.league ?? '';
      const leagueSel = document.getElementById('sf-league');
      leagueSel.innerHTML = '<option value="">— Select League —</option>' +
        leagues.map(l =>
          `<option value="${l.league_id}"${String(l.league_id) === String(leagueId) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      if (params.league && !params.id) leagueSel.disabled = true;

      if (season) {
        setValue('sf-name',       season.name);
        setValue('sf-start-date', season.start_date ? String(season.start_date).slice(0, 10) : '');
        setValue('sf-end-date',   season.end_date   ? String(season.end_date).slice(0, 10)   : '');
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
          start_date: document.getElementById('sf-start-date').value,
          end_date:   document.getElementById('sf-end-date').value,
        };
        if (!body.league_id || !body.name || !body.start_date || !body.end_date) {
          showStatus('sf-status', 'error', 'All fields are required.');
          return;
        }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(season ? `api/seasons/${season.season_id}` : 'api/seasons', {
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
              <select id="tm-league-filter" class="filter-select"><option value="">All Leagues</option></select>
              <select id="tm-team-filter"   class="filter-select" disabled><option value="">All Teams</option></select>
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
                <tr><td colspan="12" class="list-empty">Loading…</td></tr>
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
      const teamFilt    = document.getElementById('tm-team-filter');
      const seasonFilt  = document.getElementById('tm-season-filter');
      const checkAll    = document.getElementById('tm-check-all');
      const bulkAction  = document.getElementById('tm-bulk-action');
      const bulkExecute = document.getElementById('tm-bulk-execute');

      bulkAction.addEventListener('change', () => {
        bulkExecute.disabled = !bulkAction.value;
      });

      function teamFormHash(id = null) {
        const q = new URLSearchParams({ back: encodeURIComponent(window.location.hash || '#/teams') });
        if (id)                  q.set('id',     id);
        if (leagueFilt.value)    q.set('league', leagueFilt.value);
        if (teamFilt.value)      q.set('team',   teamFilt.value);
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

      leagueFilt.innerHTML = '<option value="">All Leagues</option>' +
        leaguesCache.map(l =>
          `<option value="${l.league_id}"${String(l.league_id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshTeamFilter(selectedId = '') {
        const lid = leagueFilt.value;
        if (!lid) {
          teamFilt.disabled = true;
          teamFilt.innerHTML = '<option value="">All Teams</option>';
          return;
        }
        teamFilt.disabled = false;
        teamFilt.innerHTML = '<option value="">All Teams</option>' +
          teamsCache
            .filter(t => String(t.league_id) === lid)
            .map(t =>
              `<option value="${t.team_id}"${String(t.team_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(t.name)}</option>`
            ).join('');
      }

      function refreshSeasonFilter(selectedId = '') {
        const lid = leagueFilt.value, tid = teamFilt.value;
        if (!lid) {
          seasonFilt.disabled = true;
          seasonFilt.innerHTML = '<option value="">All Seasons</option>';
          return;
        }
        seasonFilt.disabled = false;
        let leagueSeasons = allSeasonsCache.filter(s => String(s.league_id) === lid);
        if (tid) {
          const teamRow = teamsCache.find(t => t.team_id === parseInt(tid) && String(t.league_id) === lid);
          const teamSeasonIds = String(teamRow?.season_ids || '').split(',').filter(Boolean);
          leagueSeasons = leagueSeasons.filter(s => teamSeasonIds.includes(String(s.season_id)));
        }
        seasonFilt.innerHTML = '<option value="">All Seasons</option>' +
          leagueSeasons.map(s =>
            `<option value="${s.season_id}"${String(s.season_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`
          ).join('');
      }

      const countEl = document.getElementById('tm-count');

      function renderRows() {
        const lid = leagueFilt.value, tid = teamFilt.value, sid = seasonFilt.value;
        const visible = teamsCache.filter(t => {
          if (lid && String(t.league_id) !== lid) return false;
          if (tid && String(t.team_id) !== String(tid)) return false;
          if (sid && !String(t.season_ids || '').split(',').includes(sid)) return false;
          return true;
        });
        const teamCount = lid ? visible.length : new Set(visible.map(t => t.team_id)).size;
        countEl.textContent = `${teamCount} team${teamCount !== 1 ? 's' : ''}`;
        if (!visible.length) {
          listEl.innerHTML = '<tr><td colspan="7" class="list-empty">No teams found.</td></tr>';
          return;
        }
        const gl = g => g == null ? '—' : Number(g) === 0 ? 'Male' : 'Female';
        listEl.innerHTML = visible.map(t => {
          const rowLid = t.league_id || '';
          const nameLabel = `${escapeHtml(t.name)} (${t.league_name ? escapeHtml(t.league_name) : 'Unassigned'})`;
          return `
          <tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-id="${t.team_id}" data-league-id="${rowLid}"></td>
            <td><button class="tbl-link name-btn" data-id="${t.team_id}" data-league-id="${rowLid}">${nameLabel}</button></td>
            <td>${gl(t.gender)}</td>
            <td>${escapeHtml(t.coach || '—')}</td>
            <td class="col-num">${Number(t.season_count)}</td>
            <td class="col-num">${Number(t.game_count)}</td>
            <td class="col-actions">
              <button class="btn-icon add-season-btn" data-id="${t.team_id}" data-league-id="${rowLid}" title="Add to Season">${ADD_SEASON_ICON}</button>
              <button class="btn-icon edit-btn" data-id="${t.team_id}" data-league-id="${rowLid}" title="Edit">${EDIT_ICON}</button>
              <button class="btn-icon delete-btn" data-id="${t.team_id}" data-league-id="${rowLid}" title="Delete">${DELETE_ICON}</button>
            </td>
          </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadTeams() {
        listEl.innerHTML = '<tr><td colspan="12" class="list-empty">Loading…</td></tr>';
        try {
          const res  = await fetch('api/teams');
          const data = await res.json();
          if (data.error) { listEl.innerHTML = `<tr><td colspan="7" class="list-empty">${escapeHtml(data.error)}</td></tr>`; return; }
          teamsCache = data.teams;
          refreshTeamFilter(teamFilt.value);
          renderRows();
        } catch { listEl.innerHTML = '<tr><td colspan="7" class="list-empty">Could not load teams.</td></tr>'; }
      }

      leagueFilt.addEventListener('change', () => { updateUrlSilent('teams', { league: leagueFilt.value }); refreshTeamFilter(); refreshSeasonFilter(); renderRows(); });
      teamFilt.addEventListener('change',   () => { updateUrlSilent('teams', { league: leagueFilt.value, team: teamFilt.value }); refreshSeasonFilter(); renderRows(); });
      seasonFilt.addEventListener('change', () => { updateUrlSilent('teams', { league: leagueFilt.value, team: teamFilt.value, season: seasonFilt.value }); renderRows(); });

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
          const names   = teamIds.map(id => teamsCache.find(x => x.team_id === id)?.name ?? `#${id}`);
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
            const rows    = teamsCache.filter(x => x.team_id === id);
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
          const t = teamsCache.find(x => x.team_id === parseInt(addSeasonBtn.dataset.id));
          if (t) TeamSeasonModal.open(t, loadTeams);
        }
        if (nameBtn || editBtn) {
          const id = parseInt((nameBtn || editBtn).dataset.id);
          const t  = teamsCache.find(x => x.team_id === id);
          if (t) window.location.hash = teamFormHash(t.team_id);
        }
        if (delBtn) {
          const teamId   = parseInt(delBtn.dataset.id);
          const leagueId = delBtn.dataset.leagueId;
          const t = teamsCache.find(x => x.team_id === teamId &&
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
      if (params.team || params.season) {
        refreshTeamFilter(params.team);
        refreshSeasonFilter(params.season);
        renderRows();
      }
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
                  <th id="gm-date-sort" style="cursor:pointer;user-select:none;white-space:nowrap">Date <span id="gm-sort-icon" style="opacity:.6;font-size:.75em">▲</span></th>
                  <th>Home</th>
                  <th style="white-space:nowrap">Score</th>
                  <th>Visitor</th><th>Location</th><th>Type</th><th>Tournament</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="game-list">
                <tr><td colspan="8" class="list-empty">Loading…</td></tr>
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
          `<option value="${l.league_id}"${String(l.league_id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshSeasonFilter(selectedId = '') {
        const lid = leagueFilt.value;
        seasonFilt.innerHTML = '<option value="">All Seasons</option>' +
          allSeasonsCache.filter(s => !lid || String(s.league_id) === lid)
            .map(s => `<option value="${s.season_id}"${String(s.season_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`)
            .join('');
      }

      function refreshTeamFilter(selectedId = '') {
        const sid = seasonFilt.value;
        const seen = new Map();
        for (const t of allTeamsCache) { if (!seen.has(t.team_id)) seen.set(t.team_id, t); }
        const unique = [...seen.values()].filter(t =>
          !sid || allTeamsCache.some(r => r.team_id === t.team_id && String(r.season_ids || '').split(',').includes(sid))
        );
        teamFilt.innerHTML = '<option value="">All Teams</option>' +
          unique.map(t => `<option value="${t.team_id}"${String(t.team_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(t.name)}${t.abbrev ? ` (${t.abbrev})` : ''}</option>`)
            .join('');
      }

      refreshSeasonFilter(params.season);
      refreshTeamFilter(params.team);

      const countEl  = document.getElementById('gm-count');
      const dateSort = document.getElementById('gm-date-sort');
      const sortIcon = document.getElementById('gm-sort-icon');
      let sortAsc = true;

      function renderRows() {
        const lid = leagueFilt.value, sid = seasonFilt.value, tid = teamFilt.value;
        const visible = gamesCache
          .filter(g =>
            (!lid || String(g.league_id) === lid || String(g.opponent_league_id) === lid) &&
            (!sid || String(g.season_id) === sid || String(g.opponent_season_id) === sid) &&
            (!tid || String(g.team_id) === tid || String(g.opponent_id) === tid)
          )
          .sort((a, b) => {
            const cmp = String(a.start_time).localeCompare(String(b.start_time));
            return sortAsc ? cmp : -cmp;
          });
        countEl.textContent = `${visible.length} game${visible.length !== 1 ? 's' : ''}`;
        if (!visible.length) {
          listEl.innerHTML = '<tr><td colspan="8" class="list-empty">No games found.</td></tr>';
          return;
        }
        listEl.innerHTML = visible.map(g => {
          const score = g.team_score != null && g.opponent_score != null
            ? `${g.team_score}–${g.opponent_score}` : '—';
          const date = String(g.start_time).substring(0, 10);
          const chevron = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
          const bsUrl = `#/boxscore?id=${g.competition_id}&from=${encodeURIComponent(window.location.hash)}`;
          return `
            <tr>
              <td style="white-space:nowrap"><a href="${bsUrl}" class="tbl-link" style="color:var(--accent);display:inline-flex;align-items:center;gap:3px">${date}${chevron}</a></td>
              <td>${escapeHtml(g.team_name)}</td>
              <td class="col-num" style="white-space:nowrap">${score}</td>
              <td>${escapeHtml(g.opponent_name)}</td>
              <td>${escapeHtml(g.location)}</td>
              <td style="white-space:nowrap;color:var(--text-muted)">${escapeHtml(g.comptype || '')}</td>
              <td style="color:var(--text-muted)">${escapeHtml(g.tournament_name || '')}</td>
              <td class="col-actions">
                <button class="btn-icon edit-btn" data-id="${g.competition_id}" title="Edit">${EDIT_ICON}</button>
                <button class="btn-icon delete-btn" data-id="${g.competition_id}" title="Delete">${DELETE_ICON}</button>
              </td>
            </tr>`;
        }).join('');
      }

      dateSort.addEventListener('click', () => {
        sortAsc = !sortAsc;
        sortIcon.textContent = sortAsc ? '▲' : '▼';
        renderRows();
      });

      async function loadGames() {
        listEl.innerHTML = '<tr><td colspan="8" class="list-empty">Loading…</td></tr>';
        try {
          const res = await fetch('api/games');
          const data = await res.json();
          if (data.error) { listEl.innerHTML = `<tr><td colspan="6" class="list-empty">${escapeHtml(data.error)}</td></tr>`; return; }
          gamesCache = data.games;
          renderRows();
        } catch { listEl.innerHTML = '<tr><td colspan="6" class="list-empty">Could not load games.</td></tr>'; }
      }

      leagueFilt.addEventListener('change', () => { updateUrlSilent('games', { league: leagueFilt.value, season: seasonFilt.value, team: teamFilt.value }); refreshSeasonFilter(); refreshTeamFilter(); renderRows(); });
      seasonFilt.addEventListener('change', () => { updateUrlSilent('games', { league: leagueFilt.value, season: seasonFilt.value, team: teamFilt.value }); refreshTeamFilter(); renderRows(); });
      teamFilt.addEventListener('change', () => { updateUrlSilent('games', { league: leagueFilt.value, season: seasonFilt.value, team: teamFilt.value }); renderRows(); });

      function gameFormHash(id = null) {
        const q = new URLSearchParams({ back: encodeURIComponent(window.location.hash || '#/games') });
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
          const g  = gamesCache.find(x => x.competition_id === id);
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
      const backHash = backUrl(params.back, '#/games');

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
          game = (data.games || []).find(g => String(g.competition_id) === String(params.id)) ?? null;
        } catch {}
      }

      const leagueId = game?.league_id ?? params.league ?? '';
      const seasonId = game?.season_id ?? params.season ?? '';
      const teamId   = game?.team_id   ?? params.team   ?? '';
      const oppId    = game?.opponent_id ?? '';

      document.getElementById('gf-league').innerHTML = '<option value="">— Select League —</option>' +
        leaguesCache.map(l =>
          `<option value="${l.league_id}"${String(l.league_id) === String(leagueId) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshFormSeasons(lid, selectedId = '') {
        document.getElementById('gf-season').innerHTML = '<option value="">— Select Season —</option>' +
          allSeasonsCache.filter(s => !lid || String(s.league_id) === lid)
            .map(s => `<option value="${s.season_id}"${String(s.season_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`)
            .join('');
      }

      function refreshFormTeams(sid, selectedTeamId = '', selectedOppId = '') {
        const seen = new Map();
        for (const t of allTeamsCache) { if (!seen.has(t.team_id)) seen.set(t.team_id, t); }
        const unique = [...seen.values()].filter(t =>
          !sid || allTeamsCache.some(r => r.team_id === t.team_id && String(r.season_ids || '').split(',').includes(String(sid)))
        );
        const opts = '<option value="">— Select —</option>' +
          unique.map(t => `<option value="${t.team_id}">${escapeHtml(t.name)}${t.abbrev ? ` (${t.abbrev})` : ''}</option>`)
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
        setValue('gf-date', String(game.start_time).substring(0, 10));
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
          start_time:   document.getElementById('gf-date').value,
          location:    document.getElementById('gf-location').value,
        };
        if (!body.season_id || !body.team_id || !body.opponent_id || !body.start_time) {
          showStatus('gf-status', 'error', 'Season, team, opponent and date are required.');
          return;
        }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(game ? `api/games/${game.competition_id}` : 'api/games', {
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

  players: {
    render() {
      return `
        <h2 class="page-title">Players</h2>
        <div class="card">
          <div class="section-header">
            <h3 class="section-title">Player Manager</h3>
            <div class="header-controls">
              <select id="pl-league-filter" class="filter-select"><option value="">All Leagues</option></select>
              <select id="pl-team-filter"   class="filter-select" disabled><option value="">All Teams</option></select>
              <select id="pl-season-filter" class="filter-select" disabled><option value="">All Seasons</option></select>
              <button class="btn btn-primary btn-sm" id="new-player-btn">+ New Player</button>
            </div>
          </div>
          <div id="pl-count" class="list-count"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th class="col-num">Teams</th>
                  <th class="col-num">Seasons</th>
                  <th class="col-num">Games</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="player-list">
                <tr><td colspan="5" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    async init(params = {}) {
      let playersCache    = [];
      let leaguesCache    = [];
      let allSeasonsCache = [];
      let allTeamsCache   = [];

      const listEl     = document.getElementById('player-list');
      const leagueFilt = document.getElementById('pl-league-filter');
      const seasonFilt = document.getElementById('pl-season-filter');
      const teamFilt   = document.getElementById('pl-team-filter');
      const countEl    = document.getElementById('pl-count');

      try {
        const [lr, sr, tr] = await Promise.all([fetch('api/leagues'), fetch('api/seasons'), fetch('api/teams')]);
        const [ld, sd, td] = await Promise.all([lr.json(), sr.json(), tr.json()]);
        leaguesCache    = ld.leagues || [];
        allSeasonsCache = sd.seasons || [];
        allTeamsCache   = td.teams   || [];
      } catch {}

      leagueFilt.innerHTML = '<option value="">All Leagues</option>' +
        leaguesCache.map(l =>
          `<option value="${l.league_id}"${String(l.league_id) === String(params.league) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
        ).join('');

      function refreshSeasonFilter(selectedId = '') {
        const lid = leagueFilt.value;
        const filtered = lid ? allSeasonsCache.filter(s => String(s.league_id) === lid) : [];
        if (filtered.length) {
          seasonFilt.disabled = false;
          seasonFilt.innerHTML = '<option value="">All Seasons</option>' +
            filtered.map(s =>
              `<option value="${s.season_id}"${String(s.season_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(s.name)}</option>`
            ).join('');
        } else {
          seasonFilt.disabled = true;
          seasonFilt.innerHTML = '<option value="">All Seasons</option>';
        }
      }

      function refreshTeamFilter(selectedId = '') {
        const lid = leagueFilt.value, sid = seasonFilt.value;
        const leagueSeasonIds = lid
          ? allSeasonsCache.filter(s => String(s.league_id) === lid).map(s => String(s.season_id))
          : [];
        const seen = new Map();
        for (const t of allTeamsCache) { if (!seen.has(t.team_id)) seen.set(t.team_id, t); }
        const unique = [...seen.values()].filter(t => {
          if (!lid && !sid) return false;
          const rowSeasonIds = allTeamsCache
            .filter(r => r.team_id === t.team_id)
            .flatMap(r => String(r.season_ids || '').split(',').filter(Boolean));
          if (sid) return rowSeasonIds.includes(String(sid));
          return rowSeasonIds.some(s => leagueSeasonIds.includes(s));
        });
        if (lid || sid) {
          teamFilt.disabled = false;
          teamFilt.innerHTML = '<option value="">All Teams</option>' +
            unique.map(t =>
              `<option value="${t.team_id}"${String(t.team_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(t.name)}</option>`
            ).join('');
        } else {
          teamFilt.disabled = true;
          teamFilt.innerHTML = '<option value="">All Teams</option>';
        }
      }

      refreshSeasonFilter(params.season);
      refreshTeamFilter(params.team);

      function renderRows() {
        const lid = leagueFilt.value, sid = seasonFilt.value, tid = teamFilt.value;
        const visible = playersCache.filter(p => {
          if (lid && !String(p.league_ids || '').split(',').includes(lid)) return false;
          if (sid && !String(p.season_ids || '').split(',').includes(sid)) return false;
          if (tid && !String(p.team_ids   || '').split(',').includes(tid)) return false;
          return true;
        });
        countEl.textContent = `${visible.length} player${visible.length !== 1 ? 's' : ''}`;
        if (!visible.length) {
          listEl.innerHTML = '<tr><td colspan="5" class="list-empty">No players found.</td></tr>';
          return;
        }
        listEl.innerHTML = visible.map(p => `
          <tr>
            <td><button class="tbl-link prof-btn" data-id="${p.player_id}">${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</button></td>
            <td class="col-num">${Number(p.team_count)}</td>
            <td class="col-num">${Number(p.season_count)}</td>
            <td class="col-num">${Number(p.game_count)}</td>
            <td class="col-actions">
              <button class="btn-icon edit-btn" data-id="${p.player_id}" title="Edit">${EDIT_ICON}</button>
              <button class="btn-icon delete-btn" data-id="${p.player_id}" title="Delete">${DELETE_ICON}</button>
            </td>
          </tr>`).join('');
      }

      async function loadPlayers() {
        listEl.innerHTML = '<tr><td colspan="5" class="list-empty">Loading…</td></tr>';
        try {
          const res  = await fetch('api/players');
          const data = await res.json();
          if (data.error) { listEl.innerHTML = `<tr><td colspan="5" class="list-empty">${escapeHtml(data.error)}</td></tr>`; return; }
          playersCache = data.players;
          renderRows();
        } catch { listEl.innerHTML = '<tr><td colspan="5" class="list-empty">Could not load players.</td></tr>'; }
      }

      function playerFormHash(id = null) {
        const q = new URLSearchParams({ back: encodeURIComponent(window.location.hash || '#/players') });
        if (id)               q.set('id',     id);
        if (leagueFilt.value) q.set('league', leagueFilt.value);
        if (seasonFilt.value) q.set('season', seasonFilt.value);
        if (teamFilt.value)   q.set('team',   teamFilt.value);
        return `#/player-form?${q}`;
      }

      function playerProfileHash(id) {
        return `#/player-profile?id=${id}&from=${encodeURIComponent(window.location.hash || '#/players')}`;
      }

      leagueFilt.addEventListener('change', () => { updateUrlSilent('players', { league: leagueFilt.value, season: seasonFilt.value, team: teamFilt.value }); refreshSeasonFilter(); refreshTeamFilter(); renderRows(); });
      seasonFilt.addEventListener('change', () => { updateUrlSilent('players', { league: leagueFilt.value, season: seasonFilt.value, team: teamFilt.value }); refreshTeamFilter(teamFilt.value); renderRows(); });
      teamFilt.addEventListener('change', () => { updateUrlSilent('players', { league: leagueFilt.value, season: seasonFilt.value, team: teamFilt.value }); renderRows(); });

      document.getElementById('new-player-btn').addEventListener('click', () => {
        window.location.hash = playerFormHash();
      });

      listEl.addEventListener('click', async e => {
        const profBtn = e.target.closest('.prof-btn');
        const editBtn = e.target.closest('.edit-btn');
        const delBtn  = e.target.closest('.delete-btn');
        if (profBtn) {
          window.location.hash = playerProfileHash(profBtn.dataset.id);
        }
        if (editBtn) {
          window.location.hash = playerFormHash(editBtn.dataset.id);
        }
        if (delBtn) {
          const id = parseInt(delBtn.dataset.id);
          const p  = playersCache.find(x => x.player_id === id);
          const label = p ? `${p.last_name}, ${p.first_name}` : 'this player';
          if (!confirm(`Delete "${label}"?\n\nPlayers with game stats cannot be deleted.`)) return;
          delBtn.disabled = true;
          try {
            const res = await fetch(`api/players/${id}`, { method: 'DELETE' });
            const d   = await res.json();
            if (d.success) { await loadPlayers(); } else { alert(d.error || 'Delete failed'); delBtn.disabled = false; }
          } catch { alert('Request failed'); delBtn.disabled = false; }
        }
      });

      await loadPlayers();
    }
  },

  'player-form': {
    menuRoute: 'players',
    render() {
      return `
        <h2 class="page-title" id="pf-page-title">New Player</h2>
        <div class="card">
          <form id="pf-form" novalidate style="padding:4px 0">
            <div class="two-col">
              <div class="form-group">
                <label for="pf-first-name">First Name <span style="color:var(--accent)">*</span></label>
                <input type="text" id="pf-first-name" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="pf-last-name">Last Name <span style="color:var(--accent)">*</span></label>
                <input type="text" id="pf-last-name" autocomplete="off" spellcheck="false">
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="pf-position">Position</label>
                <input type="text" id="pf-position" autocomplete="off" spellcheck="false" maxlength="10">
              </div>
              <div class="form-group">
                <label for="pf-misc1">Misc</label>
                <input type="text" id="pf-misc1" autocomplete="off" maxlength="30">
              </div>
            </div>
            <div class="form-group">
              <label for="pf-notes">Notes</label>
              <input type="text" id="pf-notes" autocomplete="off">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="pf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="pf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="pf-status"></div>
          </form>
        </div>`;
    },

    async init(params = {}) {
      const backHash = backUrl(params.back, '#/players');

      let player = null;
      if (params.id) {
        document.getElementById('pf-page-title').textContent = 'Edit Player';
        try {
          const data = await fetch(`api/players/${params.id}`).then(r => r.json());
          player = data.player ?? null;
        } catch {}
      }

      if (player) {
        setValue('pf-first-name', player.first_name);
        setValue('pf-last-name',  player.last_name);
        setValue('pf-position',   player.position);
        setValue('pf-misc1',      player.misc1);
        setValue('pf-notes',      player.notes);
      }

      document.getElementById('pf-cancel').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      document.getElementById('pf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('pf-save');
        const body = {
          first_name: document.getElementById('pf-first-name').value.trim(),
          last_name:  document.getElementById('pf-last-name').value.trim(),
          position:   document.getElementById('pf-position').value.trim() || null,
          misc1:      document.getElementById('pf-misc1').value.trim()    || null,
          notes:      document.getElementById('pf-notes').value.trim()    || null,
        };
        if (!body.first_name || !body.last_name) {
          showStatus('pf-status', 'error', 'First name and last name are required.');
          return;
        }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(player ? `api/players/${player.player_id}` : 'api/players', {
            method:  player ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
          });
          const data = await res.json();
          if (data.success || data.id) {
            window.location.hash = backHash;
          } else {
            showStatus('pf-status', 'error', data.error || 'Save failed');
          }
        } catch {
          showStatus('pf-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });

      if (window.matchMedia('(hover: hover)').matches)
        document.getElementById('pf-first-name').focus();
    }
  },

  'league-profile': {
    menuRoute: 'leagues',
    render() {
      return `
        <style>
          .lp-stats-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
          .lp-stats-grid .summary-count { font-size:1.3rem; }
          @media (max-width:860px) { .lp-stats-grid { grid-template-columns:repeat(3,1fr); } }
          @media (max-width:500px) {
            .lp-stats-grid { grid-template-columns:repeat(2,1fr); }
            .lp-stats-grid .lp-tile-solo { grid-column:1/-1; }
          }
        </style>
        <div class="header-controls" style="margin-bottom:12px">
          <h2 class="page-title" style="margin:0">League Profile</h2>
          <button class="btn btn-secondary btn-sm" id="lp-back">← Back</button>
        </div>
        <div class="card" style="margin-bottom:12px">
          <div class="section-header">
            <h3 class="section-title">League Profile</h3>
            <div style="display:flex;gap:4px">
              <button class="btn btn-secondary btn-sm" id="lp-prev-btn">← Prev</button>
              <button class="btn btn-secondary btn-sm" id="lp-next-btn">Next →</button>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:16px">
            <div id="lp-icon-wrap" style="flex-shrink:0;width:72px;height:72px;background:var(--surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden">
              <svg id="lp-icon-placeholder" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <img id="lp-icon-img" style="display:none;width:100%;height:100%;object-fit:contain" alt="League icon">
            </div>
            <div style="flex:1;min-width:0">
              <div id="lp-name" style="font-size:1.1em;font-weight:600;color:var(--accent)">Loading…</div>
              <div id="lp-org" style="color:var(--text-muted);font-size:0.85em;margin-top:3px;display:none"></div>
              <div id="lp-attrs" style="color:var(--text-muted);font-size:0.85em;margin-top:3px;display:none"></div>
              <div id="lp-links" style="margin-top:6px;display:none"></div>
              <div style="display:flex;gap:8px;margin-top:10px">
                <button class="btn btn-secondary btn-sm" id="lp-edit-btn">Edit League</button>
                <button class="btn btn-danger btn-sm" id="lp-delete-btn">Delete</button>
              </div>
            </div>
          </div>
        </div>
        <div id="lp-stats-card" style="display:none;margin-bottom:12px">
          <div class="lp-stats-grid" id="lp-stats"></div>
        </div>
        <div class="card">
          <h3 class="section-title">Seasons</h3>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th id="lp-sort-hdr" style="cursor:pointer;user-select:none;white-space:nowrap">Season <span id="lp-sort-icon"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="vertical-align:middle"><path d="M5 2l4 6H1z"/></svg></span></th>
                  <th class="col-num">Games</th>
                  <th class="col-num">Boxscores</th>
                  <th class="col-num">Teams</th>
                  <th class="col-num">Players</th>
                </tr>
              </thead>
              <tbody id="lp-seasons-tbody">
                <tr><td colspan="5" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    },

    async init(params = {}) {
      const backHash = backUrl(params.from || params.back, '#/leagues');
      document.getElementById('lp-back').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      if (!params.id) {
        document.getElementById('lp-name').textContent = 'No league specified.';
        return;
      }

      document.getElementById('lp-edit-btn').addEventListener('click', () => {
        window.location.hash = `#/league-form?id=${params.id}&back=${encodeURIComponent(window.location.hash)}`;
      });

      document.getElementById('lp-delete-btn').addEventListener('click', async () => {
        const nameEl = document.getElementById('lp-name');
        const name   = nameEl.textContent || 'this league';
        const ok = await confirmDialog('Delete League', `Delete "${name}"?\n\nThis cannot be undone. The league must have no seasons.`, { confirmLabel: 'Delete' });
        if (!ok) return;
        const btn = document.getElementById('lp-delete-btn');
        btn.disabled = true; btn.textContent = 'Deleting…';
        try {
          const data = await fetch(`api/leagues/${params.id}`, { method: 'DELETE' }).then(r => r.json());
          if (data.success) {
            window.location.hash = '#/leagues';
          } else {
            await alertDialog('Cannot Delete League', data.error || 'Delete failed.');
            btn.disabled = false; btn.textContent = 'Delete';
          }
        } catch {
          await alertDialog('Error', 'Could not reach the server. Please try again.');
          btn.disabled = false; btn.textContent = 'Delete';
        }
      });

      try {
        const data = await fetch(`api/leagues/${params.id}`).then(r => r.json());
        if (data.error || !data.league) {
          document.getElementById('lp-name').textContent = data.error || 'League not found.';
          return;
        }

        const { league: lg, seasons, prevLeagueId, nextLeagueId } = data;

        document.getElementById('lp-name').textContent = lg.name;

        if (lg.logo_path) {
          document.getElementById('lp-icon-img').src = lg.logo_path + '?t=' + Date.now();
          document.getElementById('lp-icon-img').style.display = '';
          document.getElementById('lp-icon-placeholder').style.display = 'none';
        }

        const orgEl = document.getElementById('lp-org');
        const orgDisplay = lg.org_name
          ? escapeHtml(lg.org_name) + (lg.org_acronym ? ` (${escapeHtml(lg.org_acronym)})` : '')
          : '<em style="color:var(--text-muted)">unassigned</em>';
        orgEl.innerHTML = `<span style="color:var(--text-muted);font-weight:500">Governing Body:</span> ${orgDisplay}`;
        orgEl.style.display = '';

        const attrParts = [
          lg.contact_person || null,
          lg.contact_phone  || null,
          lg.founded_date   ? `Est. ${String(lg.founded_date).slice(0, 4)}` : null,
        ].filter(Boolean);
        if (attrParts.length) {
          const el = document.getElementById('lp-attrs');
          el.innerHTML = `<span style="color:var(--text-muted);font-weight:500">Contact Info:</span> ${escapeHtml(attrParts.join(' · '))}`;
          el.style.display = '';
        }

        const links = buildLinks(lg);
        if (!links.includes('—')) {
          const el = document.getElementById('lp-links');
          el.innerHTML = links;
          el.style.display = '';
        }

        const prevBtn = document.getElementById('lp-prev-btn');
        const nextBtn = document.getElementById('lp-next-btn');
        prevBtn.disabled = !prevLeagueId;
        nextBtn.disabled = !nextLeagueId;
        prevBtn.addEventListener('click', () => { window.location.hash = `#/league-profile?id=${prevLeagueId}`; });
        nextBtn.addEventListener('click', () => { window.location.hash = `#/league-profile?id=${nextLeagueId}`; });

        const statsEl = document.getElementById('lp-stats');
        const tiles = [
          { label: 'Seasons',   val: lg.season_count,     solo: true  },
          { label: 'Games',     val: lg.competition_count, solo: false },
          { label: 'Boxscores', val: lg.boxscore_count,    solo: false },
          { label: 'Teams',     val: lg.team_count,        solo: false },
          { label: 'Players',   val: lg.player_count,      solo: false },
        ];
        statsEl.innerHTML = tiles.map(({ label, val, solo }) =>
          `<div class="summary-tile${solo ? ' lp-tile-solo' : ''}">
            <span class="summary-count">${Number(val)}</span>
            <span class="summary-label">${label}</span>
          </div>`
        ).join('');
        document.getElementById('lp-stats-card').style.display = '';

        const tbody  = document.getElementById('lp-seasons-tbody');
        const iconEl = document.getElementById('lp-sort-icon');
        const ASC_ICON  = '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="vertical-align:middle"><path d="M5 2l4 6H1z"/></svg>';
        const DESC_ICON = '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="vertical-align:middle"><path d="M5 8L1 2h8z"/></svg>';
        let lpSortAsc = true;

        const lpFrom = encodeURIComponent(window.location.hash);
        const renderSeasons = () => {
          if (!seasons.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="list-empty">No seasons yet.</td></tr>';
            return;
          }
          const sorted = [...seasons].sort((a, b) =>
            lpSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
          );
          iconEl.innerHTML = lpSortAsc ? ASC_ICON : DESC_ICON;
          tbody.innerHTML = sorted.map(s => `
            <tr>
              <td><a href="#/season-profile?id=${s.season_id}&from=${lpFrom}" class="tbl-link" style="color:var(--accent);display:inline-flex;align-items:center;gap:3px">${escapeHtml(s.name)}${CHEVRON_ICON}</a></td>
              <td class="col-num">${Number(s.game_count)}</td>
              <td class="col-num">${Number(s.boxscore_count)}</td>
              <td class="col-num">${Number(s.team_count)}</td>
              <td class="col-num">${Number(s.player_count)}</td>
            </tr>`).join('');
        };

        document.getElementById('lp-sort-hdr').addEventListener('click', () => {
          lpSortAsc = !lpSortAsc;
          renderSeasons();
        });

        renderSeasons();
      } catch {
        document.getElementById('lp-name').textContent = 'Could not load league.';
      }
    },
  },

  'season-profile': {
    menuRoute: 'seasons',
    render() {
      return `
        <style>
          #sp-team-tbody tr { cursor:pointer; }
          #sp-team-tbody tr:hover { background:var(--surface2); }
          #sp-team-tbody tr.sp-selected { background:var(--surface2); }
          #sp-stats .summary-tile { padding:6px 8px; width:72px; flex-shrink:0; }
          #sp-stats .summary-count { font-size:0.95rem; }
          #sp-stats .summary-label { font-size:0.7rem; }
          .sp-col1 { position:sticky; left:0; z-index:1; background:var(--surface); }
          #sp-teams-wrap .data-table th, #sp-teams-wrap .data-table td,
          #sp-games-wrap .data-table th, #sp-games-wrap .data-table td,
          #sp-standings .data-table th, #sp-standings .data-table td { white-space:nowrap; }
          #sp-team-tbody tr:hover .sp-col1 { background:var(--surface2); }
          #sp-team-tbody tr.sp-selected .sp-col1 { background:var(--surface2); box-shadow:inset 3px 0 0 var(--accent); }
        </style>
        <div style="margin-bottom:12px">
          <button class="btn btn-secondary btn-sm" id="sp-back">← Back</button>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="flex:2;min-width:0;display:flex;flex-direction:column;gap:12px">
            <div class="card">
              <div class="section-header">
                <h3 class="section-title">Season Profile</h3>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-secondary btn-sm" id="sp-prev">← Prev</button>
                  <button class="btn btn-secondary btn-sm" id="sp-next">Next →</button>
                </div>
              </div>
              <div style="display:flex;gap:12px;align-items:flex-start">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);flex-shrink:0;margin-top:2px" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div>
                  <div id="sp-name" style="font-size:1.1em;font-weight:600;color:var(--accent)">Loading…</div>
                  <div id="sp-dates" style="color:var(--text-muted);font-size:0.85em;margin-top:4px"></div>
                  <button class="btn btn-secondary btn-sm" id="sp-edit" style="margin-top:10px">Edit</button>
                </div>
              </div>
            </div>
            <div class="card">
              <h3 class="section-title">Teams</h3>
              <div id="sp-teams-wrap" style="overflow-x:auto">
                <table class="data-table">
                  <thead>
                    <tr><th class="sp-col1">Team</th><th>League</th><th class="col-num">Games</th><th>Conf</th><th>Coach</th></tr>
                  </thead>
                  <tbody id="sp-team-tbody">
                    <tr><td colspan="5" class="list-empty">Loading…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="card">
              <div class="section-header">
                <h3 class="section-title" id="sp-games-title">Games</h3>
                <select id="sp-comptype-filter" class="filter-select"><option value="">All Types</option></select>
              </div>
              <div id="sp-count" class="list-count"></div>
              <div id="sp-games-wrap" style="overflow-x:auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th id="sp-date-th" class="sp-col1" style="cursor:pointer;user-select:none">Date <span id="sp-sort-icon">↑</span></th>
                      <th>Home</th><th>Score</th>
                      <th>Visitor</th><th>Location</th><th>Type</th><th>Tournament</th>
                    </tr>
                  </thead>
                  <tbody id="sp-games-tbody">
                    <tr><td colspan="7" class="list-empty">Loading…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:12px">
            <div class="card">
              <h3 class="section-title">Integrity Report</h3>
              <div id="sp-stats" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
              <p style="font-size:0.75em;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin:0 0 6px">Metrics</p>
              <div id="sp-integrity" style="font-size:0.85em"></div>
            </div>
            <div class="card">
              <h3 class="section-title">Standings</h3>
              <div id="sp-standings"><p style="color:var(--text-muted);font-size:0.85em;margin:0">Loading…</p></div>
            </div>
            <div class="card">
              <h3 class="section-title">Tournaments</h3>
              <table class="data-table">
                <thead>
                  <tr><th>Tournament</th><th>Start</th><th>End</th></tr>
                </thead>
                <tbody id="sp-tourn-tbody">
                  <tr><td colspan="3" class="list-empty">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
    },

    async init(params = {}) {
      const backHash = backUrl(params.from || params.back, '#/leagues');
      document.getElementById('sp-back').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      if (!params.id) {
        document.getElementById('sp-name').textContent = 'No season specified.';
        return;
      }

      try {
        const data = await fetch(`api/seasons/${params.id}`).then(r => r.json());
        if (data.error || !data.season) {
          document.getElementById('sp-name').textContent = data.error || 'Season not found.';
          return;
        }

        const { season: s, games: allGames, teams, tournaments, prevSeasonId, nextSeasonId } = data;

        document.getElementById('sp-name').textContent = `${escapeHtml(s.league_name)} — ${escapeHtml(s.name)}`;
        const fmtDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
        document.getElementById('sp-dates').innerHTML =
          `Start: ${fmtDate(s.start_date)}<br>End: ${fmtDate(s.end_date)}`;
        document.getElementById('sp-edit').addEventListener('click', () => {
          SeasonModal.open(s, () => { window.location.reload(); });
        });

        const navFromQ = params.from ? `&from=${params.from}` : (params.back ? `&from=${encodeURIComponent('#/' + params.back)}` : '');
        const prevBtn = document.getElementById('sp-prev');
        const nextBtn = document.getElementById('sp-next');
        prevBtn.disabled = !prevSeasonId;
        nextBtn.disabled = !nextSeasonId;
        if (prevSeasonId) prevBtn.addEventListener('click', () => { window.location.hash = `#/season-profile?id=${prevSeasonId}${navFromQ}`; });
        if (nextSeasonId) nextBtn.addEventListener('click', () => { window.location.hash = `#/season-profile?id=${nextSeasonId}${navFromQ}`; });

        const statsEl = document.getElementById('sp-stats');
        [
          { label: 'Games',     val: s.game_count     },
          { label: 'Boxscores', val: s.boxscore_count },
          { label: 'Teams',     val: s.team_count     },
          { label: 'Players',   val: s.player_count   },
        ].forEach(({ label, val }) => {
          const mismatch = label === 'Boxscores' && Number(val) !== Number(s.game_count);
          const tile = document.createElement('div');
          tile.className = 'summary-tile';
          tile.innerHTML = `<span class="summary-count"${mismatch ? ' style="color:#e53935"' : ''}>${Number(val)}</span><span class="summary-label"${mismatch ? ' style="color:#e53935"' : ''}>${label}</span>`;
          statsEl.appendChild(tile);
        });

        // ── Teams list ────────────────────────────────────────────
        const teamTbody      = document.getElementById('sp-team-tbody');
        const gamesTitle     = document.getElementById('sp-games-title');
        const leagueSet      = new Set(teams.filter(t => !t.is_guest).map(t => String(t.team_id)));
        const leagueTeamList = teams.filter(t => !t.is_guest);
        const guestTeamList  = teams.filter(t =>  t.is_guest);

        const GROUP_HDR = `background:var(--surface2);color:var(--text-muted);font-size:0.75em;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:5px 8px`;

        function teamRow(t) {
          const zero    = Number(t.game_count) === 0;
          const fg      = zero ? '#e53935' : null;
          const fgMuted = zero ? '#e53935' : 'var(--text-muted)';
          return `<tr data-team-id="${t.team_id}" data-team-name="${escapeHtml(t.name)}">
            <td class="sp-col1"${fg ? ` style="color:${fg}"` : ''}>${escapeHtml(t.name)}</td>
            <td style="color:${fgMuted}">${escapeHtml(t.league_name || '')}</td>
            <td class="col-num"${fg ? ` style="color:${fg}"` : ''}>${Number(t.game_count)}</td>
            <td style="color:${fgMuted}">${escapeHtml(t.conference || '')}</td>
            <td style="color:${fgMuted}">${escapeHtml(t.coach || '')}</td>
          </tr>`;
        }

        const GH5 = `<td style="${GROUP_HDR}"></td>`.repeat(4);
        teamTbody.innerHTML =
          `<tr data-group="league" style="cursor:pointer">
             <td class="sp-col1" style="${GROUP_HDR}">League</td>${GH5}
           </tr>` +
          leagueTeamList.map(teamRow).join('') +
          (guestTeamList.length
            ? `<tr data-group="nonleague" style="cursor:pointer">
                 <td class="sp-col1" style="${GROUP_HDR}">Non-League</td>${GH5}
               </tr>` + guestTeamList.map(teamRow).join('')
            : '') +
          `<tr data-team-id="all" style="font-weight:600;border-top:1px solid var(--border)">
             <td class="sp-col1">All Teams</td><td></td><td class="col-num">${allGames.length}</td><td></td><td></td>
           </tr>`;

        // ── Tournaments list ──────────────────────────────────────
        const tournTbody = document.getElementById('sp-tourn-tbody');
        const fmtTournDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
        tournTbody.innerHTML = tournaments.length
          ? tournaments.map(t => `<tr>
              <td>${escapeHtml(t.name)}</td>
              <td style="color:var(--text-muted);white-space:nowrap">${fmtTournDate(t.startdate)}</td>
              <td style="color:var(--text-muted);white-space:nowrap">${fmtTournDate(t.enddate)}</td>
            </tr>`).join('')
          : '<tr><td colspan="3" class="list-empty">None</td></tr>';

        // ── Integrity report ──────────────────────────────────────
        const teamsNoGames = leagueTeamList.filter(t => Number(t.game_count) === 0).length;
        document.getElementById('sp-integrity').innerHTML =
          `<span style="color:${teamsNoGames === 0 ? '#43a047' : '#e53935'}">Teams with no games: ${teamsNoGames}</span>`;

        // ── Standings ─────────────────────────────────────────────
        function wl(tid, filter) {
          let w = 0, l = 0;
          for (const g of allGames) {
            const home = String(g.team_id) === tid;
            const away = String(g.opponent_id) === tid;
            if (!home && !away) continue;
            if (!filter(g, home ? String(g.opponent_id) : String(g.team_id))) continue;
            const my  = home ? g.team_score     : g.opponent_score;
            const opp = home ? g.opponent_score : g.team_score;
            if (my == null || opp == null) continue;
            if (Number(my) > Number(opp)) w++; else if (Number(my) < Number(opp)) l++;
          }
          return `${w}–${l}`;
        }

        const standingRows = teams
          .filter(t => !t.is_guest)
          .map(t => {
            const tid = String(t.team_id);
            return {
              ...t,
              overall: wl(tid, ()    => true),
              league:  wl(tid, (g, oppId) => leagueSet.has(oppId)),
              conf:    wl(tid, (g)   => g.comptype === 'Conference'),
              _w: allGames.filter(g => {
                const home = String(g.team_id) === tid, away = String(g.opponent_id) === tid;
                if (!home && !away) return false;
                const my = home ? g.team_score : g.opponent_score;
                const op = home ? g.opponent_score : g.team_score;
                return my != null && op != null && my > op;
              }).length,
            };
          });

        const confMap = {};
        for (const t of standingRows) {
          const key = t.conference || '';
          (confMap[key] ??= []).push(t);
        }
        const sortedConfs = Object.keys(confMap).sort((a, b) =>
          !a ? 1 : !b ? -1 : a.localeCompare(b)
        );
        for (const key of sortedConfs) {
          confMap[key].sort((a, b) => b._w - a._w || a.name.localeCompare(b.name));
        }

        const standingsEl = document.getElementById('sp-standings');
        if (!standingRows.length) {
          standingsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85em;margin:0">No league teams.</p>';
        } else {
          standingsEl.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr><th class="sp-col1">Team</th><th class="col-num">Conf</th><th class="col-num">LG</th><th class="col-num">Ovrl</th></tr>
              </thead>
              <tbody>
                ${sortedConfs.map(key => `
                  <tr>
                    <td class="sp-col1" style="color:var(--accent);font-size:0.75em;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:var(--surface);padding:5px 8px">${key ? escapeHtml(key) : 'No Conference'}</td>
                    <td style="background:var(--surface);padding:5px 0"></td>
                    <td style="background:var(--surface);padding:5px 0"></td>
                    <td style="background:var(--surface);padding:5px 0"></td>
                  </tr>
                  ${confMap[key].map(t => {
                    const fg = Number(t.game_count) === 0 ? 'color:#e53935' : '';
                    return `
                    <tr>
                      <td class="sp-col1"${fg ? ` style="${fg}"` : ''}>${escapeHtml(t.name)}</td>
                      <td class="col-num"${fg ? ` style="${fg}"` : ''}>${t.conf}</td>
                      <td class="col-num"${fg ? ` style="${fg}"` : ''}>${t.league}</td>
                      <td class="col-num"${fg ? ` style="${fg}"` : ''}>${t.overall}</td>
                    </tr>`;
                  }).join('')}
                `).join('')}
              </tbody>
            </table>
            </div>`;
        }

        // ── Games renderer ────────────────────────────────────────
        const tbody   = document.getElementById('sp-games-tbody');
        const countEl = document.getElementById('sp-count');
        const spFrom  = encodeURIComponent(window.location.hash);
        const chevron = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

        let sortAsc     = true;
        let currentList = allGames;

        function renderGames(list) {
          currentList = list;
          const ctFilter = document.getElementById('sp-comptype-filter')?.value || '';
          const filtered = ctFilter ? list.filter(g => g.comptype === ctFilter) : list;
          const sorted = [...filtered].sort((a, b) => {
            const cmp = String(a.start_time).localeCompare(String(b.start_time));
            return sortAsc ? cmp : -cmp;
          });
          countEl.textContent = `${sorted.length} game${sorted.length !== 1 ? 's' : ''}`;
          if (!sorted.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="list-empty">No games found.</td></tr>';
            return;
          }
          tbody.innerHTML = sorted.map(g => {
            const date  = String(g.start_time).substring(0, 10);
            const score = g.team_score != null && g.opponent_score != null
              ? `${g.team_score}–${g.opponent_score}` : '—';
            const homeWon = g.team_score != null && g.opponent_score != null && Number(g.team_score) > Number(g.opponent_score);
            const awayWon = g.team_score != null && g.opponent_score != null && Number(g.opponent_score) > Number(g.team_score);
            const noBs = !g.has_boxscore;
            const fg   = noBs ? ' style="color:#e53935"' : '';
            return `<tr${noBs ? ' style="color:#e53935"' : ''}>
              <td class="sp-col1"><a href="#/boxscore?id=${g.competition_id}&from=${spFrom}" class="tbl-link" style="color:var(--accent);display:inline-flex;align-items:center;gap:3px">${date}${chevron}</a></td>
              <td${fg}>${homeWon ? `<strong>${escapeHtml(g.team_name)}</strong>` : escapeHtml(g.team_name)}</td>
              <td class="col-num"${fg}>${score}</td>
              <td${fg}>${awayWon ? `<strong>${escapeHtml(g.opponent_name)}</strong>` : escapeHtml(g.opponent_name)}</td>
              <td${fg}>${escapeHtml(g.location || '')}</td>
              <td${fg}>${escapeHtml(g.comptype || '')}</td>
              <td${fg}>${escapeHtml(g.tournament_name || '')}</td>
            </tr>`;
          }).join('');
        }

        document.getElementById('sp-date-th').addEventListener('click', () => {
          sortAsc = !sortAsc;
          document.getElementById('sp-sort-icon').textContent = sortAsc ? '↑' : '↓';
          renderGames(currentList);
        });

        const comptypeSel = document.getElementById('sp-comptype-filter');
        [...new Set(allGames.map(g => g.comptype).filter(Boolean))].sort().forEach(ct => {
          const opt = document.createElement('option');
          opt.value = ct;
          opt.textContent = ct;
          comptypeSel.appendChild(opt);
        });
        comptypeSel.addEventListener('change', () => renderGames(currentList));

        renderGames(allGames);

        teamTbody.addEventListener('click', e => {
          const row = e.target.closest('tr[data-team-id], tr[data-group]');
          if (!row) return;
          teamTbody.querySelectorAll('tr').forEach(r => r.classList.remove('sp-selected'));
          row.classList.add('sp-selected');
          if (row.dataset.teamId === 'all') {
            gamesTitle.textContent = 'Games';
            renderGames(allGames);
          } else if (row.dataset.group === 'league') {
            gamesTitle.textContent = 'Games — League';
            renderGames(allGames.filter(g =>
              leagueSet.has(String(g.team_id)) && leagueSet.has(String(g.opponent_id))
            ));
          } else if (row.dataset.group === 'nonleague') {
            gamesTitle.textContent = 'Games — Non-League';
            renderGames(allGames.filter(g =>
              !leagueSet.has(String(g.team_id)) || !leagueSet.has(String(g.opponent_id))
            ));
          } else {
            const tid = row.dataset.teamId;
            gamesTitle.textContent = `Games — ${row.dataset.teamName}`;
            renderGames(allGames.filter(g =>
              String(g.team_id) === tid || String(g.opponent_id) === tid
            ));
          }
        });

      } catch {
        document.getElementById('sp-name').textContent = 'Could not load season.';
      }
    },
  },

  'player-profile': {
    menuRoute: 'players',
    render() {
      return `
        <style>
          #pp-season-tbody tr { cursor: pointer; }
          #pp-season-tbody tr:hover { background: var(--surface2); }
          #pp-season-tbody tr.pp-selected { background: var(--surface2); box-shadow: inset 3px 0 0 var(--accent); }
          .icon-link { display:inline-flex;align-items:center;color:var(--text-muted);text-decoration:none; }
          .icon-link:hover { color:var(--accent); }
        </style>
        <div class="header-controls" style="margin-bottom:12px">
          <h2 class="page-title" style="margin:0">Player Profile</h2>
          <button class="btn btn-secondary btn-sm" id="pp-back">← Back</button>
        </div>
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:16px">
            <div style="flex-shrink:0;width:56px;height:56px;background:var(--surface2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0">
              <div id="pp-player-name" style="font-size:1.1em;font-weight:600;color:var(--accent)">Loading…</div>
              <div id="pp-player-attrs" style="color:var(--text-muted);font-size:0.85em;margin-top:4px;display:none"></div>
              <div id="pp-player-notes" style="color:var(--text-muted);margin-top:4px;display:none"></div>
            </div>
            <button class="btn btn-secondary btn-sm" id="pp-edit-btn" style="align-self:flex-start">Edit Player</button>
          </div>
        </div>
        <div class="card" style="margin-bottom:12px">
          <h3 class="section-title">Seasons</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Team</th>
                <th class="col-num">#</th>
                <th>Gr/Yr</th>
                <th>Ht</th>
                <th class="col-num">GP</th>
                <th class="col-num">GS</th>
                <th class="col-num">PPG</th>
                <th class="col-num">RBG</th>
                <th class="col-num">APG</th>
                <th class="col-num">SPG</th>
                <th class="col-num">TO</th>
              </tr>
            </thead>
            <tbody id="pp-season-tbody">
              <tr><td colspan="12" class="list-empty">Loading…</td></tr>
            </tbody>
          </table>
        </div>
        <div id="pp-games-card" class="card" style="display:none">
          <h3 class="section-title" id="pp-games-title">Games</h3>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th class="col-num">MIN</th>
                  <th class="col-num">PTS</th>
                  <th class="col-num">REB</th>
                  <th class="col-num">AST</th>
                  <th class="col-num">STL</th>
                  <th class="col-num">BLK</th>
                  <th class="col-num">TO</th>
                  <th class="col-num">PF</th>
                  <th>FG</th>
                  <th>3P</th>
                  <th>FT</th>
                </tr>
              </thead>
              <tbody id="pp-games-tbody">
                <tr><td colspan="13" class="list-empty">Select a season to view games.</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    },

    async init(params = {}) {
      const backHash = backUrl(params.from, '#/players');

      document.getElementById('pp-back').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      if (!params.id) {
        document.getElementById('pp-player-name').textContent = 'No player specified.';
        document.getElementById('pp-season-tbody').innerHTML =
          '<tr><td colspan="5" class="list-empty">No player specified.</td></tr>';
        return;
      }

      try {
        const data = await fetch(`api/players/${params.id}`).then(r => r.json());
        if (data.error || !data.player) {
          document.getElementById('pp-player-name').textContent = data.error || 'Player not found.';
          document.getElementById('pp-season-tbody').innerHTML =
            `<tr><td colspan="12" class="list-empty">${escapeHtml(data.error || 'Player not found.')}</td></tr>`;
          return;
        }

        const { player, seasons } = data;

        document.getElementById('pp-player-name').textContent =
          `${player.first_name} ${player.last_name}`;

        if (player.notes) {
          const notesEl = document.getElementById('pp-player-notes');
          notesEl.textContent = player.notes;
          notesEl.style.display = '';
        }

        document.getElementById('pp-edit-btn').addEventListener('click', () => {
          window.location.hash = `#/player-form?id=${params.id}&back=${encodeURIComponent(window.location.hash)}`;
        });

        const seasonsEl = document.getElementById('pp-season-tbody');
        const gamesCard = document.getElementById('pp-games-card');
        const gamesTbody = document.getElementById('pp-games-tbody');
        const gamesTitle = document.getElementById('pp-games-title');

        if (!seasons.length) {
          const baseAttrs = [player.position, player.misc1].filter(Boolean);
          if (baseAttrs.length) {
            const attrsEl = document.getElementById('pp-player-attrs');
            attrsEl.textContent = baseAttrs.join('  ·  ');
            attrsEl.style.display = '';
          }
          seasonsEl.innerHTML = '<tr><td colspan="12" class="list-empty">No seasons on record.</td></tr>';
        } else {
          const totalGames = seasons.reduce((sum, s) => sum + Number(s.game_count), 0);
          const totalGs    = seasons.reduce((sum, s) => sum + Number(s.gs       || 0), 0);
          const totalPts   = seasons.reduce((sum, s) => sum + Number(s.total_pts || 0), 0);
          const totalReb   = seasons.reduce((sum, s) => sum + Number(s.total_reb || 0), 0);
          const totalAst   = seasons.reduce((sum, s) => sum + Number(s.total_ast || 0), 0);
          const totalStl   = seasons.reduce((sum, s) => sum + Number(s.total_stl || 0), 0);
          const totalTo    = seasons.reduce((sum, s) => sum + Number(s.total_to  || 0), 0);
          const cavg = (n) => totalGames > 0 ? (n / totalGames).toFixed(1) : '—';
          seasonsEl.innerHTML = seasons.map(s => {
            const gp   = Number(s.game_count) || 0;
            const avg  = n => gp > 0 ? (Number(n || 0) / gp).toFixed(1) : '—';
            return `
            <tr data-season-id="${s.season_id}" data-team-id="${s.team_id}"
                data-label="${escapeHtml(s.season_name)} — ${escapeHtml(s.team_name)}">
              <td>${escapeHtml(s.season_name)}</td>
              <td>${escapeHtml(s.team_name)}</td>
              <td class="col-num">${s.jersey_number}</td>
              <td>${escapeHtml(s.year   || '')}</td>
              <td>${escapeHtml(s.height || '')}</td>
              <td class="col-num">${gp}</td>
              <td class="col-num">${Number(s.gs || 0)}</td>
              <td class="col-num">${s.ppg !== null ? Number(s.ppg).toFixed(1) : '—'}</td>
              <td class="col-num">${avg(s.total_reb)}</td>
              <td class="col-num">${avg(s.total_ast)}</td>
              <td class="col-num">${avg(s.total_stl)}</td>
              <td class="col-num">${avg(s.total_to)}</td>
            </tr>`;
          }).join('') + `
            <tr data-season-id="all" style="border-top:1px solid var(--border);font-weight:600;color:var(--text-muted);cursor:pointer">
              <td>Career</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td class="col-num">${totalGames}</td>
              <td class="col-num">${totalGs}</td>
              <td class="col-num">${cavg(totalPts)}</td>
              <td class="col-num">${cavg(totalReb)}</td>
              <td class="col-num">${cavg(totalAst)}</td>
              <td class="col-num">${cavg(totalStl)}</td>
              <td class="col-num">${cavg(totalTo)}</td>
            </tr>`;

          seasonsEl.addEventListener('click', async e => {
            const row = e.target.closest('tr[data-season-id]');
            if (!row) return;

            seasonsEl.querySelectorAll('tr').forEach(r => r.classList.remove('pp-selected'));
            row.classList.add('pp-selected');

            const sid   = row.dataset.seasonId;
            const tid   = row.dataset.teamId;
            const label = row.dataset.label || 'All Seasons';

            // Update height/year attrs from selected season
            const attrsEl = document.getElementById('pp-player-attrs');
            let sHeight = null, sYear = null;
            if (sid === 'all') {
              const last = seasons[seasons.length - 1];
              sHeight = last?.height || null;
              sYear   = last?.year   || null;
            } else {
              const sd = seasons.find(s => String(s.season_id) === sid && String(s.team_id) === tid);
              sHeight = sd?.height || null;
              sYear   = sd?.year   || null;
            }
            const newAttrs = [player.position, sHeight, sYear, player.misc1].filter(Boolean);
            if (newAttrs.length) {
              attrsEl.textContent = newAttrs.join('  ·  ');
              attrsEl.style.display = '';
            } else {
              attrsEl.style.display = 'none';
            }

            gamesTitle.textContent = `Games — ${label}`;
            gamesCard.style.display = '';
            gamesTbody.innerHTML = '<tr><td colspan="14" class="list-empty">Loading…</td></tr>';

            try {
              const url = sid === 'all'
                ? `api/players/${params.id}/games`
                : `api/players/${params.id}/games?season_id=${sid}&team_id=${tid}`;
              const gd = await fetch(url).then(r => r.json());
              if (gd.error || !gd.games.length) {
                gamesTbody.innerHTML = `<tr><td colspan="14" class="list-empty">${escapeHtml(gd.error || 'No games found.')}</td></tr>`;
                return;
              }
              const totals = { min:0, tp:0, reb:0, ast:0, stl:0, blk:0, to:0, pf:0 };
              const rows = gd.games.map(g => {
                totals.min += Number(g.min) || 0;
                totals.tp  += Number(g.tp)  || 0;
                totals.reb += Number(g.reb) || 0;
                totals.ast += Number(g.ast) || 0;
                totals.stl += Number(g.stl) || 0;
                totals.blk += Number(g.blk) || 0;
                totals.to  += Number(g.to)  || 0;
                totals.pf  += Number(g.pf)  || 0;
                const date = g.start_time ? String(g.start_time).slice(0, 10) : '—';
                const oppLabel = escapeHtml(g.opponent_abbrev || g.opponent_name);
                const opp  = (g.home_away === 'H' ? 'vs. ' : '@ ') + oppLabel;
                const bsQ  = new URLSearchParams({ id: g.competition_id, back: 'player-profile', player_id: params.id });
                if (params.league) bsQ.set('league', params.league);
                if (params.season) bsQ.set('season', params.season);
                if (params.team)   bsQ.set('team',   params.team);
                const chevron = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
                return `<tr>
                  <td style="white-space:nowrap"><a href="#/boxscore?${bsQ}" class="tbl-link" style="color:var(--accent);display:inline-flex;align-items:center;gap:3px">${date}${chevron}</a></td>
                  <td>${opp}</td>
                  <td class="col-num">${fmtMin(g.min)}</td>
                  <td class="col-num">${g.tp}</td>
                  <td class="col-num">${g.reb}</td>
                  <td class="col-num">${g.ast}</td>
                  <td class="col-num">${g.stl}</td>
                  <td class="col-num">${g.blk}</td>
                  <td class="col-num">${g.to}</td>
                  <td class="col-num">${g.pf}</td>
                  <td>${g.fgm}/${g.fga}</td>
                  <td>${g.fgm3}/${g.fga3}</td>
                  <td>${g.ftm}/${g.fta}</td>
                </tr>`;
              });
              const summaryRow = `
                <tr style="border-top:1px solid var(--border);font-weight:600;color:var(--text-muted)">
                  <td>Total</td>
                  <td></td>
                  <td class="col-num">${fmtMin(totals.min)}</td>
                  <td class="col-num">${totals.tp}</td>
                  <td class="col-num">${totals.reb}</td>
                  <td class="col-num">${totals.ast}</td>
                  <td class="col-num">${totals.stl}</td>
                  <td class="col-num">${totals.blk}</td>
                  <td class="col-num">${totals.to}</td>
                  <td class="col-num">${totals.pf}</td>
                  <td></td><td></td><td></td>
                </tr>`;
              gamesTbody.innerHTML = rows.join('') + summaryRow;
            } catch {
              gamesTbody.innerHTML = '<tr><td colspan="13" class="list-empty">Could not load games.</td></tr>';
            }
          });

          seasonsEl.querySelector('tr[data-season-id="all"]').click();
        }
      } catch {
        document.getElementById('pp-player-name').textContent = 'Could not load player profile.';
        document.getElementById('pp-season-tbody').innerHTML =
          '<tr><td colspan="12" class="list-empty">Could not load player profile.</td></tr>';
      }
    }
  },

  boxscore: {
    menuRoute: 'games',
    render() {
      return `
        <style>
          .bs-team-section { margin-bottom: 16px; }
          .bs-score { font-size: 2em; font-weight: 700; color: var(--accent); }
          .bs-meta { color: var(--text-muted); font-size: 0.85em; margin-top: 4px; }
          .bs-tab-bar { display:flex; border-bottom:1px solid var(--border); margin-bottom:12px; overflow-x:auto; overflow-y:hidden; }
          .bs-tab { background:none; border:none; border-bottom:2px solid transparent; color:var(--text-muted); cursor:pointer; font-family:inherit; font-size:0.875em; padding:10px 16px; white-space:nowrap; margin-bottom:-1px; }
          .bs-tab:hover { color:var(--text); }
          .bs-tab.bs-active { border-bottom-color:var(--accent); color:var(--accent); font-weight:600; }
          .bs-p1 { position:sticky; left:0; z-index:1; background:var(--surface); }
          #bs-tabs .data-table th, #bs-tabs .data-table td { white-space:nowrap; }
          #bs-tabs .data-table thead th { position:sticky; top:0; z-index:2; background:var(--surface); }
          #bs-tabs .data-table thead th.bs-p1 { z-index:4; }
        </style>
        <div class="header-controls" style="margin-bottom:12px">
          <h2 class="page-title" style="margin:0">Boxscore</h2>
          <button class="btn btn-secondary btn-sm" id="bs-back">← Back</button>
        </div>
        <div id="bs-loading" style="color:var(--text-muted);margin-bottom:12px">Loading…</div>
        <div id="bs-header" style="display:none;margin-bottom:12px">
          <div id="bs-meta" class="bs-meta" style="margin-bottom:8px"></div>
          <div style="display:flex;gap:12px">
            <div class="card" style="flex:1;text-align:center" id="bs-card-team"></div>
            <div class="card" style="flex:1;text-align:center" id="bs-card-opp"></div>
          </div>
        </div>
        <div id="bs-tabs" style="display:none">
          <div class="bs-tab-bar">
            <button class="bs-tab bs-active" data-tab="boxscore">Box Score</button>
            <button class="bs-tab" data-tab="pbp">Play by Play</button>
            <button class="bs-tab" data-tab="team-stats">Team Stats</button>
            <button class="bs-tab" data-tab="q1">1st Qtr</button>
            <button class="bs-tab" data-tab="q2">2nd Qtr</button>
            <button class="bs-tab" data-tab="q3">3rd Qtr</button>
            <button class="bs-tab" data-tab="q4">4th Qtr</button>
          </div>
          <div id="bs-tab-boxscore"></div>
          <div id="bs-tab-pbp"        style="display:none"></div>
          <div id="bs-tab-team-stats" style="display:none"></div>
          <div id="bs-tab-q1"         style="display:none"></div>
          <div id="bs-tab-q2"         style="display:none"></div>
          <div id="bs-tab-q3"         style="display:none"></div>
          <div id="bs-tab-q4"         style="display:none"></div>
        </div>`;
    },

    async init(params = {}) {
      const backHash = backUrl(params.from || params.back, '#/games');
      document.getElementById('bs-back').addEventListener('click', () => {
        window.location.hash = backHash;
      });

      if (!params.id) {
        document.getElementById('bs-loading').textContent = 'No game specified.';
        return;
      }

      try {
        const data = await fetch(`api/games/${params.id}/boxscore`).then(r => r.json());
        if (data.error || !data.competition) {
          document.getElementById('bs-loading').textContent = data.error || 'Game not found.';
          return;
        }
        const { competition: c, team, opponent, periodRows = [] } = data;
        const date = c.start_time ? String(c.start_time).slice(0, 10) : '—';
        const loc  = c.location  ? ` · ${escapeHtml(c.location)}`   : '';

        document.getElementById('bs-loading').style.display = 'none';
        document.getElementById('bs-meta').textContent =
          `${c.league_name} · ${c.season_name} · ${date}${c.location ? ' · ' + c.location : ''}`;

        const logoBlock = (logoPath) => {
          return logoPath
            ? `<img src="${logoPath}?t=${Date.now()}" style="width:80px;height:80px;object-fit:contain;flex-shrink:0" alt="">`
            : `<div style="width:80px;height:80px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--border)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L3 7v5c0 5.25 3.75 10.2 9 11.4C17.25 22.2 21 17.25 21 12V7L12 3z"/></svg></div>`;
        };
        const textBlock = (name, score) => `
          <div style="flex:1;text-align:center;display:flex;flex-direction:column;justify-content:center">
            <div style="font-weight:600;color:var(--text);margin-bottom:6px">${escapeHtml(name)}</div>
            <div class="bs-score">${score}</div>
          </div>`;
        const scoreCard = (name, score, logoPath, logoSide) => `
          <div style="display:flex;align-items:center;gap:12px">
            ${logoSide === 'left' ? logoBlock(logoPath) + textBlock(name, score) : textBlock(name, score) + logoBlock(logoPath)}
          </div>`;
        document.getElementById('bs-card-team').innerHTML = scoreCard(c.team_name,     c.team_score,     c.team_logo,     'left');
        document.getElementById('bs-card-opp').innerHTML  = scoreCard(c.opponent_name, c.opponent_score, c.opponent_logo, 'right');
        document.getElementById('bs-header').style.display = '';

        function bsTable(title, players) {
          const tot = { min:0, fgm:0, fga:0, fgm3:0, fga3:0, ftm:0, fta:0,
                        oreb:0, dreb:0, reb:0, ast:0, stl:0, blk:0, to:0, pf:0, tp:0 };
          const playerRow = p => {
            tot.min  += Number(p.min)  || 0;
            tot.fgm  += Number(p.fgm)  || 0; tot.fga  += Number(p.fga)  || 0;
            tot.fgm3 += Number(p.fgm3) || 0; tot.fga3 += Number(p.fga3) || 0;
            tot.ftm  += Number(p.ftm)  || 0; tot.fta  += Number(p.fta)  || 0;
            tot.oreb += Number(p.oreb) || 0; tot.dreb += Number(p.dreb) || 0;
            tot.reb  += Number(p.reb)  || 0; tot.ast  += Number(p.ast)  || 0;
            tot.stl  += Number(p.stl)  || 0; tot.blk  += Number(p.blk)  || 0;
            tot.to   += Number(p.to)   || 0; tot.pf   += Number(p.pf)   || 0;
            tot.tp   += Number(p.tp)   || 0;
            return `<tr>
              <td class="bs-p1">${p.jersey_number} - ${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</td>
              <td class="col-num">${fmtMin(p.min)}</td>
              <td class="col-num">${p.fgm}-${p.fga}</td>
              <td class="col-num">${p.fgm3}-${p.fga3}</td>
              <td class="col-num">${p.ftm}-${p.fta}</td>
              <td class="col-num">${p.oreb}</td>
              <td class="col-num">${p.dreb}</td>
              <td class="col-num">${p.reb}</td>
              <td class="col-num">${p.ast}</td>
              <td class="col-num">${p.stl}</td>
              <td class="col-num">${p.blk}</td>
              <td class="col-num">${p.to}</td>
              <td class="col-num">${p.pf}</td>
              <td class="col-num">${p.tp}</td>
            </tr>`;
          };
          const groupHead = label =>
            `<tr style="background:var(--surface2);color:var(--text-muted);font-size:0.8em;font-weight:600">
              <td class="bs-p1 bs-group-head" style="background:var(--surface2);padding:5px 8px">${label}</td>
              <td colspan="13" class="bs-group-head" style="background:var(--surface2)"></td>
            </tr>`;
          const starters = players.filter(p => Number(p.gs) === 1);
          const reserves = players.filter(p => Number(p.gs) !== 1);
          let bodyRows = '';
          if (players.length === 0) {
            bodyRows = '<tr><td colspan="14" class="list-empty">No stats recorded.</td></tr>';
          } else {
            if (starters.length > 0) bodyRows += groupHead('STARTERS') + starters.map(playerRow).join('');
            if (reserves.length > 0) bodyRows += groupHead('RESERVES') + reserves.map(playerRow).join('');
          }
          const fgPct = tot.fga  > 0 ? (tot.fgm  / tot.fga  * 100).toFixed(1) + '%' : '—';
          const tpPct = tot.fga3 > 0 ? (tot.fgm3 / tot.fga3 * 100).toFixed(1) + '%' : '—';
          const ftPct = tot.fta > 0 ? (tot.ftm / tot.fta * 100).toFixed(1) + '%' : '—';
          return `
            <div class="bs-team-section">
              <h3 class="section-title">${escapeHtml(title)}</h3>
              <div style="overflow-x:auto">
                <table class="data-table">
                  <thead><tr>
                    <th class="bs-p1">Player</th>
                    <th class="col-num">MIN</th>
                    <th class="col-num">FGM-A</th>
                    <th class="col-num">3PM-A</th>
                    <th class="col-num">FTM-A</th>
                    <th class="col-num">OREB</th>
                    <th class="col-num">DREB</th>
                    <th class="col-num">REB</th>
                    <th class="col-num">AST</th>
                    <th class="col-num">STL</th>
                    <th class="col-num">BLK</th>
                    <th class="col-num">TO</th>
                    <th class="col-num">PF</th>
                    <th class="col-num">PTS</th>
                  </tr></thead>
                  <tbody>${bodyRows}</tbody>
                  <tbody>
                    <tr style="border-top:1px solid var(--border);font-weight:600;color:var(--text-muted)">
                      <td class="bs-p1">Totals</td>
                      <td class="col-num">${fmtMin(tot.min)}</td>
                      <td class="col-num">${tot.fgm}-${tot.fga}</td>
                      <td class="col-num">${tot.fgm3}-${tot.fga3}</td>
                      <td class="col-num">${tot.ftm}-${tot.fta}</td>
                      <td class="col-num">${tot.oreb}</td>
                      <td class="col-num">${tot.dreb}</td>
                      <td class="col-num">${tot.reb}</td>
                      <td class="col-num">${tot.ast}</td>
                      <td class="col-num">${tot.stl}</td>
                      <td class="col-num">${tot.blk}</td>
                      <td class="col-num">${tot.to}</td>
                      <td class="col-num">${tot.pf}</td>
                      <td class="col-num">${tot.tp}</td>
                    </tr>
                    <tr style="color:var(--text-muted);font-size:0.85em">
                      <td class="bs-p1"></td><td></td>
                      <td class="col-num">${fgPct}</td>
                      <td class="col-num">${tpPct}</td>
                      <td class="col-num">${ftPct}</td>
                      <td colspan="9"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>`;
        }

        document.getElementById('bs-tab-boxscore').innerHTML =
          `<div class="card">${bsTable(c.team_name, team) + bsTable(c.opponent_name, opponent)}</div>`;

        const p1Starters = new Set(
          periodRows.filter(r => r.period === 1 && Number(r.started) === 1).map(r => r.player_id)
        );
        [['q1', 1], ['q2', 2], ['q3', 3], ['q4', 4]].forEach(([key, period]) => {
          const pr    = periodRows.filter(r => r.period === period);
          const tRows = pr.filter(r => r.side === 'team').map(r => ({ ...r, gs: p1Starters.has(r.player_id) ? 1 : 0 }));
          const oRows = pr.filter(r => r.side === 'opponent').map(r => ({ ...r, gs: p1Starters.has(r.player_id) ? 1 : 0 }));
          document.getElementById(`bs-tab-${key}`).innerHTML =
            `<div class="card">${bsTable(c.team_name, tRows) + bsTable(c.opponent_name, oRows)}</div>`;
        });

        requestAnimationFrame(() => {
          const visibleTables = [...document.querySelectorAll('#bs-tab-boxscore .data-table')];
          const refTable = visibleTables[0];
          if (refTable) {
            const colCount = refTable.querySelectorAll('thead th').length;
            const widths = Array.from({ length: colCount }, (_, i) =>
              Math.max(...visibleTables.map(tbl => tbl.querySelectorAll('thead th')[i]?.offsetWidth || 0))
            );
            document.querySelectorAll('#bs-tabs .data-table').forEach(tbl => {
              const cg = document.createElement('colgroup');
              widths.forEach(w => {
                const col = document.createElement('col');
                col.style.width = w + 'px';
                cg.appendChild(col);
              });
              tbl.prepend(cg);
              tbl.style.tableLayout = 'fixed';
            });
            const theadH = refTable.querySelector('thead')?.offsetHeight || 0;
            document.querySelectorAll('#bs-tabs .bs-group-head').forEach(el => {
              el.style.top = theadH + 'px';
              el.style.zIndex = el.classList.contains('bs-p1') ? '3' : '2';
            });
          }
          const h = document.getElementById('bs-tab-boxscore').offsetHeight;
          document.getElementById('bs-tab-team-stats').innerHTML =
            `<div class="card" style="min-height:${h}px"></div>`;
          document.getElementById('bs-tab-pbp').innerHTML =
            `<div class="card" style="min-height:${h}px"></div>`;
        });

        function pbpActionLabel(play) {
          const name = play.first_name ? `${play.first_name[0]}. ${escapeHtml(play.last_name)}` : '';
          let desc;
          switch (play.action) {
            case 'GOOD':
              desc = play.play_type === '3PTR' ? 'Made 3-pointer'
                   : play.play_type === 'FT'   ? 'Free throw made'
                                               : 'Made 2-pointer'; break;
            case 'MISS':
              desc = play.play_type === '3PTR' ? 'Missed 3-pointer'
                   : play.play_type === 'FT'   ? 'Missed free throw'
                                               : 'Missed 2-pointer'; break;
            case 'REBOUND':  desc = play.play_type === 'OFF' ? 'Off. rebound' : 'Def. rebound'; break;
            case 'TURNOVER': desc = 'Turnover'; break;
            case 'STEAL':    desc = 'Steal'; break;
            case 'FOUL':     desc = 'Foul'; break;
            case 'ASSIST':   desc = 'Assist'; break;
            case 'BLOCK':    desc = 'Block'; break;
            case 'SUB':      desc = play.play_type === 'OUT' ? 'Exits' : 'Enters'; break;
            default:         desc = play.action;
          }
          return name ? `${name} — ${desc}` : desc;
        }

        function renderPbp(plays) {
          const periods = [...new Set(plays.map(p => p.period))].sort((a, b) => a - b);
          const pLabel  = n => n === 1 ? '1st Quarter' : n === 2 ? '2nd Quarter'
                           : n === 3 ? '3rd Quarter'  : n === 4 ? '4th Quarter' : `OT ${n - 4}`;
          const navLinks = periods.map(n =>
            `<button onclick="document.getElementById('pbp-p${n}').scrollIntoView({behavior:'smooth'})"
              style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;
                     color:var(--text-muted);cursor:pointer;font-family:inherit;font-size:0.8em;
                     padding:4px 12px;white-space:nowrap"
              onmouseover="this.style.color='var(--accent)'"
              onmouseout="this.style.color='var(--text-muted)'">${pLabel(n)}</button>`
          ).join('');
          let html = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${navLinks}</div>`;
          html += `<div style="overflow-x:auto">
            <table class="data-table" style="width:100%;table-layout:fixed">
              <colgroup>
                <col style="width:44%">
                <col style="width:12%;min-width:80px">
                <col style="width:44%">
              </colgroup>
              <thead><tr>
                <th style="text-align:right">${escapeHtml(c.team_name)}</th>
                <th style="text-align:center">Clock</th>
                <th style="text-align:left">${escapeHtml(c.opponent_name)}</th>
              </tr></thead>
              <tbody>`;
          for (const period of periods) {
            html += `<tr id="pbp-p${period}" style="background:var(--surface2)">
              <td colspan="3" style="font-size:0.8em;font-weight:600;color:var(--text-muted);
                  text-align:center;padding:5px 8px;letter-spacing:0.05em">${pLabel(period).toUpperCase()}</td>
            </tr>`;
            for (const play of plays.filter(p => p.period === period)) {
              const isHome    = Number(play.team_id) === Number(c.team_id);
              const isVisitor = play.team_id != null && !isHome;
              const label     = pbpActionLabel(play);
              const isMade    = play.action === 'GOOD';
              const scoreHtml = (play.home_score != null && play.visitor_score != null)
                ? `<span style="color:var(--text-muted);font-size:0.8em">${play.home_score}–${play.visitor_score}</span>`
                : '';
              const madeStyle = isMade ? 'font-weight:600;color:var(--accent)' : 'color:var(--text)';
              html += `<tr>
                <td style="text-align:right;${isHome ? madeStyle : 'color:var(--text-muted)'}">
                  ${isHome ? label : ''}
                </td>
                <td style="text-align:center;white-space:nowrap;font-size:0.85em">
                  ${play.clock}${scoreHtml ? '<br>' + scoreHtml : ''}
                </td>
                <td style="text-align:left;${isVisitor ? madeStyle : 'color:var(--text-muted)'}">
                  ${isVisitor ? label : ''}
                </td>
              </tr>`;
            }
          }
          html += `</tbody></table></div>`;
          return html;
        }

        let pbpLoaded = false;
        const tabsEl = document.getElementById('bs-tabs');
        tabsEl.style.display = '';
        tabsEl.querySelector('.bs-tab-bar').addEventListener('click', e => {
          const btn = e.target.closest('.bs-tab');
          if (!btn) return;
          tabsEl.querySelectorAll('.bs-tab').forEach(t => t.classList.remove('bs-active'));
          btn.classList.add('bs-active');
          const key = btn.dataset.tab;
          tabsEl.querySelectorAll('[id^="bs-tab-"]').forEach(p => {
            p.style.display = p.id === `bs-tab-${key}` ? '' : 'none';
          });
          if (key === 'pbp' && !pbpLoaded) {
            pbpLoaded = true;
            const pbpEl = document.getElementById('bs-tab-pbp');
            pbpEl.innerHTML = `<div class="card"><p style="color:var(--text-muted);padding:16px 0">Loading…</p></div>`;
            fetch(`api/games/${params.id}/playbyplay`)
              .then(r => r.json())
              .then(plays => {
                if (!Array.isArray(plays) || !plays.length) {
                  pbpEl.innerHTML = `<div class="card"><p class="list-empty">No play-by-play data for this game.</p></div>`;
                  return;
                }
                pbpEl.innerHTML = `<div class="card">${renderPbp(plays)}</div>`;
              })
              .catch(() => {
                pbpEl.innerHTML = `<div class="card"><p style="color:var(--text-muted)">Could not load play-by-play.</p></div>`;
              });
          }
        });
      } catch {
        document.getElementById('bs-loading').textContent = 'Could not load boxscore.';
      }
    }
  },

  home: {
    render() {
      return `
        <h2 class="page-title">Dashboard</h2>
        <div class="card" style="margin-bottom:16px">
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
            <a class="summary-tile is-link" href="#/games">
              <span class="summary-count" id="s-competitions">—</span>
              <span class="summary-label">Games</span>
            </a>
            <div class="summary-tile">
              <span class="summary-count" id="s-boxscores">—</span>
              <span class="summary-label">Boxscores</span>
            </div>
            <div class="summary-tile">
              <span class="summary-count" id="s-schools">—</span>
              <span class="summary-label">Schools</span>
            </div>
            <a class="summary-tile is-link" href="#/teams">
              <span class="summary-count" id="s-teams">—</span>
              <span class="summary-label">Teams</span>
            </a>
            <a class="summary-tile is-link" href="#/players">
              <span class="summary-count" id="s-players">—</span>
              <span class="summary-label">Players</span>
            </a>
          </div>
          <p class="summary-msg" id="summary-msg"></p>
        </div>
        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex:0 0 220px;min-width:0">
            <div class="card">
              <div class="section-header">
                <h3 class="section-title">Leagues</h3>
                <select id="home-org-filter" class="form-control" style="font-size:0.8em;padding:2px 6px;height:auto">
                  <option value="">All</option>
                </select>
              </div>
              <div id="home-leagues-list" style="color:var(--text-muted)">Loading…</div>
            </div>
          </div>
          <div style="flex:1;min-width:0">
            <div class="card">
              <h3 class="section-title">Missing Box Scores</h3>
              <div id="missing-bs-list" style="color:var(--text-muted)">Loading…</div>
            </div>
            <div class="card" style="margin-top:16px">
              <h3 class="section-title">Teams Without Games</h3>
              <div id="no-games-list" style="color:var(--text-muted)">Loading…</div>
            </div>
          </div>
        </div>
      `;
    },

    async init() {
      const [summaryRes, missingRes, noGamesRes, leaguesRes] = await Promise.allSettled([
        fetch('api/summary').then(r => r.json()),
        fetch('api/games/missing-boxscores').then(r => r.json()),
        fetch('api/teams/no-games').then(r => r.json()),
        fetch('api/leagues').then(r => r.json())
      ]);

      // Summary card
      if (summaryRes.status === 'fulfilled') {
        const data = summaryRes.value;
        if (!data.configured) {
          document.getElementById('summary-msg').textContent =
            'Configure your database connection in Settings to see stats.';
        } else if (data.error) {
          document.getElementById('summary-msg').textContent =
            `Database unavailable: ${data.error}`;
        } else {
          document.getElementById('s-leagues').textContent      = data.leagues;
          document.getElementById('s-seasons').textContent      = data.seasons;
          document.getElementById('s-teams').textContent        = data.teams;
          document.getElementById('s-competitions').textContent = data.competitions;
          document.getElementById('s-boxscores').textContent    = data.boxscores;
          document.getElementById('s-schools').textContent      = data.schools;
          document.getElementById('s-players').textContent      = data.players;
        }
      } else {
        document.getElementById('summary-msg').textContent = 'Could not load summary.';
      }

      // Missing box scores card
      const listEl = document.getElementById('missing-bs-list');
      if (missingRes.status === 'fulfilled' && Array.isArray(missingRes.value)) {
        const games = missingRes.value;
        if (games.length === 0) {
          listEl.innerHTML = '<p class="list-empty">All games have box scores.</p>';
        } else {
          listEl.innerHTML = `
            <table class="data-table">
              <thead><tr>
                <th>Date</th>
                <th>League · Season</th>
                <th>Game</th>
              </tr></thead>
              <tbody>${games.map(g => `<tr>
                <td>${g.start_time ? String(g.start_time).slice(0, 10) : '—'}</td>
                <td>${escapeHtml(g.league_name)} · ${escapeHtml(g.season_name)}</td>
                <td>${escapeHtml(g.team_name)} vs ${escapeHtml(g.opponent_name)}</td>
              </tr>`).join('')}</tbody>
            </table>`;
        }
      } else {
        listEl.textContent = 'Could not load missing box scores.';
      }

      // Teams without games card
      const noGamesEl = document.getElementById('no-games-list');
      if (noGamesRes.status === 'fulfilled' && Array.isArray(noGamesRes.value)) {
        const teams = noGamesRes.value;
        if (teams.length === 0) {
          noGamesEl.innerHTML = '<p class="list-empty">All teams have at least one game.</p>';
        } else {
          noGamesEl.innerHTML = `
            <table class="data-table">
              <thead><tr>
                <th>League · Season</th>
                <th>Team</th>
              </tr></thead>
              <tbody>${teams.map(t => `<tr>
                <td>${escapeHtml(t.league_name)} · ${escapeHtml(t.season_name)}</td>
                <td>${escapeHtml(t.team_name)}</td>
              </tr>`).join('')}</tbody>
            </table>`;
        }
      } else {
        noGamesEl.textContent = 'Could not load teams without games.';
      }

      // Leagues list
      const leaguesEl  = document.getElementById('home-leagues-list');
      const orgFilter  = document.getElementById('home-org-filter');
      if (leaguesRes.status === 'fulfilled' && Array.isArray(leaguesRes.value?.leagues)) {
        const leagues = leaguesRes.value.leagues;
        if (leagues.length === 0) {
          leaguesEl.innerHTML = '<p class="list-empty">No leagues yet.</p>';
        } else {
          const mkLabel = lg => lg.org_acronym ? `${lg.org_acronym}-${lg.name}` : lg.name;
          const sorted  = [...leagues].sort((a, b) => mkLabel(a).localeCompare(mkLabel(b)));

          // Populate org filter with unique acronyms present in the data
          const orgs = [...new Map(
            leagues.filter(lg => lg.org_acronym)
                   .map(lg => [lg.org_acronym, lg.org_acronym])
          ).values()].sort();
          orgFilter.innerHTML = '<option value="">All</option>' +
            orgs.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');

          const renderLeagues = () => {
            const sel = orgFilter.value;
            const visible = sel ? sorted.filter(lg => lg.org_acronym === sel) : sorted;
            if (visible.length === 0) {
              leaguesEl.innerHTML = '<p class="list-empty">No leagues for this organization.</p>';
              return;
            }
            leaguesEl.innerHTML = visible.map(lg => {
              const label = mkLabel(lg);
              return `<a href="#/league-profile?id=${lg.league_id}&from=${encodeURIComponent(window.location.hash)}" class="tbl-link" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);color:var(--text);text-decoration:none">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.85em">${escapeHtml(label)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--text-muted)"><polyline points="9 18 15 12 9 6"/></svg>
              </a>`;
            }).join('');
          };

          orgFilter.addEventListener('change', renderLeagues);
          renderLeagues();
        }
      } else {
        leaguesEl.textContent = 'Could not load leagues.';
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
          <h3 class="section-title">Server</h3>
          <form id="server-form" novalidate>
            <div class="form-group">
              <label for="srv-base-url">Report Base URL</label>
              <input type="text" id="srv-base-url" name="base_url"
                     placeholder="e.g. http://nas/statmanager (leave blank for root)"
                     autocomplete="off" spellcheck="false">
            </div>
            <p style="font-size:0.8em;color:var(--text-muted);margin:0 0 10px">
              Prefix for all report links. Set to your public URL if served under a path (e.g. nginx subdirectory). Leave blank if served at root.
            </p>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
            <div class="status-msg" id="srv-status"></div>
          </form>
        </div>
        <div class="card">
          <h3 class="section-title">Email (SMTP)</h3>
          <form id="email-form" novalidate>
            <div class="host-port-row">
              <div class="form-group">
                <label for="em-host">SMTP Host</label>
                <input type="text" id="em-host" placeholder="smtp.example.com" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="em-port">Port</label>
                <input type="number" id="em-port" placeholder="587" min="1" max="65535">
              </div>
            </div>
            <div style="margin-bottom:12px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9em;color:var(--text)">
                <input type="checkbox" id="em-secure" style="width:auto;padding:0;border:none;background:none;cursor:pointer"> Use TLS (port 465)
              </label>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="em-user">Username</label>
                <input type="text" id="em-user" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="em-password">Password</label>
                <input type="password" id="em-password" autocomplete="new-password">
              </div>
            </div>
            <div class="form-group">
              <label for="em-from">From Address</label>
              <input type="email" id="em-from" placeholder="StatManager <noreply@example.com>" autocomplete="off">
            </div>
            <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
            <p style="font-size:0.85em;color:var(--text-muted);margin:0 0 12px">Welcome email sent when a new user account is created. Use <code style="background:var(--surface2);padding:2px 5px;border-radius:3px">{username}</code> and <code style="background:var(--surface2);padding:2px 5px;border-radius:3px">{password}</code> as placeholders.</p>
            <div class="form-group">
              <label for="em-welcome-subject">Welcome Email Subject</label>
              <input type="text" id="em-welcome-subject" autocomplete="off" spellcheck="false">
            </div>
            <div class="form-group">
              <label for="em-welcome-body">Welcome Email Body</label>
              <textarea id="em-welcome-body" rows="6" style="width:100%;resize:vertical;font-family:inherit;font-size:0.9em;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);box-sizing:border-box"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="em-test-btn">Send Test Email</button>
              <button type="submit" class="btn btn-primary">Save Email Settings</button>
            </div>
            <div class="status-msg" id="em-status"></div>
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
        <div class="card">
          <h3 class="section-title">API Tokens</h3>
          <p style="font-size:0.85em;color:var(--text-muted);margin:0 0 12px">
            Read-scoped tokens allow external services (e.g. TeamManager) to access public endpoints via <code>X-Api-Key</code>.
          </p>
          <div id="tok-list"></div>
          <div class="form-actions" style="margin-top:10px">
            <button type="button" class="btn btn-secondary" id="tok-new-btn">New Token</button>
          </div>
          <div id="tok-form" style="display:none;margin-top:14px">
            <div class="two-col">
              <div class="form-group">
                <label for="tok-label">Label</label>
                <input type="text" id="tok-label" maxlength="100" autocomplete="off" placeholder="e.g. TeamManager plugin">
              </div>
              <div class="form-group">
                <label for="tok-scope">Scope</label>
                <select id="tok-scope">
                  <option value="read">read</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-primary" id="tok-create-btn">Generate Token</button>
              <button type="button" class="btn btn-secondary" id="tok-cancel-btn">Cancel</button>
            </div>
          </div>
          <div id="tok-reveal" style="display:none;margin-top:14px">
            <p style="font-size:0.85em;color:var(--text-muted);margin:0 0 6px">
              Copy this token now — it will not be shown again.
            </p>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" id="tok-value" readonly
                     style="font-family:monospace;font-size:0.8em;flex:1;background:var(--surface2);color:var(--text)">
              <button type="button" class="btn btn-secondary" id="tok-copy-btn">Copy</button>
            </div>
            <div class="status-msg" id="tok-copy-status"></div>
          </div>
          <div class="status-msg" id="tok-status"></div>
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
        setValue('srv-base-url', (data.server || {}).base_url);
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

      document.getElementById('server-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res = await fetch('api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              database: readForm(),
              server: { base_url: document.getElementById('srv-base-url').value.trim() }
            })
          });
          const data = await res.json();
          if (data.success) showStatus('srv-status', 'success', 'Saved.');
          else showStatus('srv-status', 'error', data.error || 'Save failed');
        } catch {
          showStatus('srv-status', 'error', 'Request failed.');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
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

      // ── Email settings ────────────────────────────────────────────────────────
      try {
        const emData = await fetch('api/settings/email').then(r => r.json());
        document.getElementById('em-host').value = emData.host || '';
        document.getElementById('em-port').value = emData.port || '587';
        document.getElementById('em-secure').checked = !!emData.secure;
        document.getElementById('em-user').value = emData.user || '';
        document.getElementById('em-from').value = emData.from || '';
        if (emData.passwordSet) document.getElementById('em-password').placeholder = 'Saved — leave blank to keep';
        document.getElementById('em-welcome-subject').value = emData.welcome_subject || '';
        document.getElementById('em-welcome-body').value = emData.welcome_body || '';
      } catch { /* ignore */ }

      document.getElementById('email-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res = await fetch('api/settings/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              host:            document.getElementById('em-host').value,
              port:            document.getElementById('em-port').value,
              secure:          document.getElementById('em-secure').checked,
              user:            document.getElementById('em-user').value,
              password:        document.getElementById('em-password').value,
              from:            document.getElementById('em-from').value,
              welcome_subject: document.getElementById('em-welcome-subject').value,
              welcome_body:    document.getElementById('em-welcome-body').value,
            })
          });
          const data = await res.json();
          if (data.success) {
            showStatus('em-status', 'success', 'Email settings saved.');
            document.getElementById('em-password').value = '';
            document.getElementById('em-password').placeholder = 'Saved — leave blank to keep';
          } else showStatus('em-status', 'error', data.error || 'Save failed');
        } catch { showStatus('em-status', 'error', 'Request failed.'); }
        finally { btn.disabled = false; btn.textContent = 'Save Email Settings'; }
      });

      document.getElementById('em-test-btn').addEventListener('click', async () => {
        const to = prompt('Send test email to:');
        if (!to) return;
        const btn = document.getElementById('em-test-btn');
        btn.disabled = true; btn.textContent = 'Sending…';
        try {
          const res = await fetch('api/settings/email/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              host:     document.getElementById('em-host').value,
              port:     document.getElementById('em-port').value,
              secure:   document.getElementById('em-secure').checked,
              user:     document.getElementById('em-user').value,
              password: document.getElementById('em-password').value,
              from:     document.getElementById('em-from').value,
              to,
            })
          });
          const data = await res.json();
          if (data.success) showStatus('em-status', 'success', `Test email sent to ${to}.`);
          else showStatus('em-status', 'error', data.error || 'Send failed');
        } catch { showStatus('em-status', 'error', 'Request failed.'); }
        finally { btn.disabled = false; btn.textContent = 'Send Test Email'; }
      });

      // ── API Tokens ────────────────────────────────────────────────────────────
      const tokList    = document.getElementById('tok-list');
      const tokForm    = document.getElementById('tok-form');
      const tokReveal  = document.getElementById('tok-reveal');

      async function loadTokens() {
        try {
          const data = await fetch('api/tokens').then(r => r.json());
          const tokens = data.tokens || [];
          if (!tokens.length) {
            tokList.innerHTML = '<p style="font-size:0.85em;color:var(--text-muted);margin:0">No tokens yet.</p>';
            return;
          }
          tokList.innerHTML = `
            <table class="data-table" style="font-size:0.85em">
              <thead><tr>
                <th>Label</th><th>Scope</th><th>Created</th><th>Last Used</th><th></th>
              </tr></thead>
              <tbody>
                ${tokens.map(t => `
                  <tr>
                    <td>${escapeHtml(t.label)}</td>
                    <td><code>${escapeHtml(t.scope)}</code></td>
                    <td>${t.created_at ? t.created_at.slice(0, 10) : ''}</td>
                    <td>${t.last_used_at ? t.last_used_at.slice(0, 10) : '<span style="color:var(--text-muted)">never</span>'}</td>
                    <td><button class="btn btn-danger btn-sm tok-revoke" data-id="${t.token_id}" style="padding:2px 8px;font-size:0.8em">Revoke</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>`;
        } catch {
          tokList.innerHTML = '<p style="font-size:0.85em;color:var(--text-muted);margin:0">Could not load tokens.</p>';
        }
      }
      await loadTokens();

      document.getElementById('tok-new-btn').addEventListener('click', () => {
        tokForm.style.display = 'block';
        tokReveal.style.display = 'none';
        document.getElementById('tok-label').value = '';
        document.getElementById('tok-scope').value = 'read';
        document.getElementById('tok-new-btn').style.display = 'none';
      });

      document.getElementById('tok-cancel-btn').addEventListener('click', () => {
        tokForm.style.display = 'none';
        document.getElementById('tok-new-btn').style.display = '';
      });

      document.getElementById('tok-create-btn').addEventListener('click', async () => {
        const label = document.getElementById('tok-label').value.trim();
        const scope = document.getElementById('tok-scope').value;
        if (!label) { showStatus('tok-status', 'error', 'Label is required.'); return; }
        const btn = document.getElementById('tok-create-btn');
        btn.disabled = true; btn.textContent = 'Generating…';
        try {
          const res  = await fetch('api/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, scope }),
          });
          const data = await res.json();
          if (data.token) {
            tokForm.style.display = 'none';
            tokReveal.style.display = 'block';
            document.getElementById('tok-value').value = data.token;
            document.getElementById('tok-new-btn').style.display = '';
            await loadTokens();
          } else {
            showStatus('tok-status', 'error', data.error || 'Failed to create token.');
          }
        } catch {
          showStatus('tok-status', 'error', 'Request failed.');
        } finally {
          btn.disabled = false; btn.textContent = 'Generate Token';
        }
      });

      document.getElementById('tok-copy-btn').addEventListener('click', () => {
        const val = document.getElementById('tok-value').value;
        navigator.clipboard.writeText(val).then(() => {
          showStatus('tok-copy-status', 'success', 'Copied!');
        }).catch(() => {
          showStatus('tok-copy-status', 'error', 'Copy failed — select and copy manually.');
        });
      });

      tokList.addEventListener('click', async e => {
        const btn = e.target.closest('.tok-revoke');
        if (!btn) return;
        if (!confirm('Revoke this token? Any service using it will lose access immediately.')) return;
        const id = parseInt(btn.dataset.id);
        btn.disabled = true;
        try {
          await fetch(`api/tokens/${id}`, { method: 'DELETE' });
          await loadTokens();
        } catch {
          showStatus('tok-status', 'error', 'Revoke failed.');
          btn.disabled = false;
        }
      });
    }
  },

  users: {
    render() {
      return `
        <div style="display:flex;flex-direction:column;height:calc(100vh - var(--header-h) - 56px)">
          <h2 class="page-title" style="flex-shrink:0">Users</h2>
          <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
            <div class="section-header" style="flex-shrink:0">
              <h3 class="section-title">User Accounts</h3>
              <button class="btn btn-primary btn-sm" id="new-user-btn">+ Add User</button>
            </div>
            <div class="table-wrap" style="flex:1;overflow-y:auto">
              <table class="data-table">
                <thead><tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Created</th>
                  <th class="col-actions"></th>
                </tr></thead>
                <tbody id="user-list">
                  <tr><td colspan="7" class="list-empty">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
    },

    async init() {
      async function loadUsers() {
        const res  = await fetch('api/users');
        const data = await res.json();
        const list = document.getElementById('user-list');
        if (data.error) {
          list.innerHTML = `<tr><td colspan="7" class="list-empty">${escapeHtml(data.error)}</td></tr>`;
          return;
        }
        const typeLabel = { administrator: 'Administrator', team_manager: 'Team Manager' };
        list.innerHTML = data.users.map(u => {
          const isMe = u.user_id === currentUser?.user_id;
          const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
          return `
          <tr>
            <td>${escapeHtml(u.username)}${isMe ? ' <span style="font-size:.75rem;color:var(--text-muted)">(you)</span>' : ''}</td>
            <td>${escapeHtml(name || '—')}</td>
            <td style="color:var(--text-muted)">${typeLabel[u.user_type] || escapeHtml(u.user_type || '—')}</td>
            <td>${u.email ? `<a href="mailto:${escapeHtml(u.email)}" class="row-link">${escapeHtml(u.email)}</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${escapeHtml(u.phone || '—')}</td>
            <td style="color:var(--text-muted)">${u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</td>
            <td class="col-actions">
              ${isMe ? `<a href="#/user-profile" class="btn-icon" title="My Profile"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>` : `<button class="btn-icon delete-btn" data-id="${u.user_id}" title="Delete">${DELETE_ICON}</button>`}
            </td>
          </tr>`;
        }).join('');

        list.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const u = data.users.find(x => x.user_id === parseInt(btn.dataset.id));
            if (!await confirmDialog('Delete User', `Delete "${u.username}"? This cannot be undone.`)) return;
            const r  = await fetch(`api/users/${btn.dataset.id}`, { method: 'DELETE' });
            const d2 = await r.json();
            if (d2.error) { await alertDialog('Error', d2.error); return; }
            await loadUsers();
          });
        });
      }

      await loadUsers();

      document.getElementById('new-user-btn').addEventListener('click', () => {
        showAddUserModal(loadUsers);
      });
    }
  },

  'user-profile': {
    menuRoute: 'users',
    render() {
      return `
        <h2 class="page-title">My Profile</h2>
        <div class="card">
          <h3 class="section-title">Profile</h3>
          <div class="two-col">
            <div class="form-group">
              <label for="prof-first">First Name</label>
              <input id="prof-first" type="text" autocomplete="given-name" name="given-name">
            </div>
            <div class="form-group">
              <label for="prof-last">Last Name</label>
              <input id="prof-last" type="text" autocomplete="family-name" name="family-name">
            </div>
          </div>
          <div class="two-col">
            <div class="form-group">
              <label for="prof-email">Email</label>
              <input id="prof-email" type="email" autocomplete="email" name="email">
            </div>
            <div class="form-group">
              <label for="prof-phone">Phone</label>
              <input id="prof-phone" type="tel" autocomplete="tel" name="tel">
            </div>
          </div>
          <div class="two-col">
            <div class="form-group">
              <label for="prof-team">Default Team</label>
              <select id="prof-team"><option value="">Loading…</option></select>
            </div>
            <div class="form-group">
              <label for="prof-season">Default Season</label>
              <select id="prof-season"><option value="">— None —</option></select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="prof-save">Save Profile</button>
          </div>
          <div class="status-msg" id="prof-status"></div>
        </div>
        <div class="card">
          <h3 class="section-title">Change Password</h3>
          <div class="form-group">
            <label for="cp-current">Current Password</label>
            <input id="cp-current" type="password" autocomplete="current-password">
          </div>
          <div class="form-group">
            <label for="cp-new">New Password</label>
            <input id="cp-new" type="password" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label for="cp-confirm">Confirm New Password</label>
            <input id="cp-confirm" type="password" autocomplete="new-password">
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="cp-save">Change Password</button>
          </div>
          <div class="status-msg" id="cp-status"></div>
        </div>`;
    },

    async init() {

      const teamSel   = document.getElementById('prof-team');
      const seasonSel = document.getElementById('prof-season');
      seasonSel.disabled = true;

      async function loadTeamSeasons(teamId, selectSeasonId) {
        seasonSel.innerHTML = '<option value="">— None —</option>';
        seasonSel.disabled = true;
        if (!teamId) return;
        try {
          const data = await fetch(`api/teams/${teamId}/seasons`).then(r => r.json());
          seasonSel.innerHTML = '<option value="">— None —</option>' +
            (data.seasons || []).map(s =>
              `<option value="${s.season_id}"${s.season_id === selectSeasonId ? ' selected' : ''}>${escapeHtml(s.season_name)} (${escapeHtml(s.label)})</option>`
            ).join('');
          seasonSel.disabled = false;
        } catch { /* leave disabled */ }
      }

      teamSel.addEventListener('change', () => {
        loadTeamSeasons(parseInt(teamSel.value) || null, null);
      });

      let me = null;
      try {
        const [usersRes, teamsRes] = await Promise.all([
          fetch('api/users'),
          fetch('api/teams'),
        ]);
        const [usersData, teamsData] = await Promise.all([
          usersRes.json(), teamsRes.json()
        ]);

        me = (usersData.users || []).find(u => u.user_id === currentUser?.user_id);
        if (me) {
          document.getElementById('prof-first').value = me.first_name || '';
          document.getElementById('prof-last').value  = me.last_name  || '';
          document.getElementById('prof-email').value = me.email      || '';
          document.getElementById('prof-phone').value = me.phone      || '';
        }

        teamSel.innerHTML = '<option value="">— None —</option>' +
          (teamsData.teams || []).map(t =>
            `<option value="${t.team_id}"${me?.default_team_id === t.team_id ? ' selected' : ''}>${escapeHtml(t.name)}</option>`
          ).join('');

        if (me?.default_team_id) {
          await loadTeamSeasons(me.default_team_id, me.default_season_id);
        }
      } catch { /* leave fields empty */ }

      document.getElementById('prof-save').addEventListener('click', async () => {
        const btn = document.getElementById('prof-save');
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(`api/users/${currentUser.user_id}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name:        document.getElementById('prof-first').value,
              last_name:         document.getElementById('prof-last').value,
              email:             document.getElementById('prof-email').value,
              phone:             document.getElementById('prof-phone').value,
              default_team_id:   document.getElementById('prof-team').value   || null,
              default_season_id: document.getElementById('prof-season').value || null,
            })
          });
          const data = await res.json();
          if (data.success) showStatus('prof-status', 'success', 'Profile saved.');
          else showStatus('prof-status', 'error', data.error || 'Save failed');
        } catch {
          showStatus('prof-status', 'error', 'Request failed');
        } finally {
          btn.disabled = false; btn.textContent = 'Save Profile';
        }
      });

      document.getElementById('cp-save').addEventListener('click', async () => {
        const current = document.getElementById('cp-current').value;
        const newPw   = document.getElementById('cp-new').value;
        const confirm = document.getElementById('cp-confirm').value;
        if (!newPw) { showStatus('cp-status', 'error', 'New password is required'); return; }
        if (newPw !== confirm) { showStatus('cp-status', 'error', 'Passwords do not match'); return; }
        const btn = document.getElementById('cp-save');
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const res  = await fetch(`api/users/${currentUser.user_id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_password: newPw })
          });
          const data = await res.json();
          if (data.success) {
            showStatus('cp-status', 'success', 'Password changed.');
            document.getElementById('cp-current').value = '';
            document.getElementById('cp-new').value = '';
            document.getElementById('cp-confirm').value = '';
          } else {
            showStatus('cp-status', 'error', data.error || 'Failed to change password');
          }
        } catch {
          showStatus('cp-status', 'error', 'Request failed');
        } finally {
          btn.disabled = false; btn.textContent = 'Change Password';
        }
      });
    }
  },

  'team-profile': {
    render() {
      return `
        <h2 class="page-title" id="tp-title">Team Profile</h2>
        <div class="card">
          <div class="section-header" style="flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:flex-start;gap:16px">
              <div id="tp-logo" style="width:72px;height:72px;flex-shrink:0;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--border)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div>
                <h3 class="section-title" id="tp-team-name" style="margin:0"></h3>
                <div id="tp-meta" style="font-size:.85em;color:var(--text-muted);margin-top:4px"></div>
                <div id="tp-coach" style="font-size:.85em;color:var(--text-muted);margin-top:2px"></div>
                <div id="tp-record" style="font-size:.85em;color:var(--text-muted);margin-top:2px"></div>
                <a id="tp-edit-btn" href="#" class="btn btn-secondary btn-sm" style="margin-top:10px;display:inline-block">Edit</a>
              </div>
            </div>
          </div>
        </div>
        <div class="card" style="padding-bottom:0">
          <div style="display:flex;align-items:center;gap:0;border-bottom:1px solid var(--border);margin:-16px -16px 0">
            <button class="tp-tab" data-tab="schedule" style="padding:11px 20px;background:none;border:none;border-bottom:2px solid var(--accent);cursor:pointer;font-size:.9em;font-weight:600;color:var(--accent)">Schedule</button>
            <button class="tp-tab" data-tab="roster" style="padding:11px 20px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:.9em;color:var(--text-muted)">Roster</button>
            <button class="tp-tab" data-tab="player-stats" style="padding:11px 20px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:.9em;color:var(--text-muted)">Player Stats</button>
            <button class="tp-tab" data-tab="leaders" style="padding:11px 20px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:.9em;color:var(--text-muted)">Leaders</button>
            <button class="tp-tab" data-tab="team-stats" style="padding:11px 20px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:.9em;color:var(--text-muted)">Team Stats</button>
            <button class="tp-tab" data-tab="photo" style="padding:11px 20px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:.9em;color:var(--text-muted)">Photo</button>
            <div style="display:flex;align-items:center;gap:8px;margin-left:auto;padding:0 12px">
              <label for="tp-season" style="font-size:.8em;color:var(--text-muted);white-space:nowrap">Season</label>
              <select id="tp-season" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:4px 8px;font-size:.82em"><option>Loading…</option></select>
            </div>
          </div>
          <div id="tp-pane-schedule" style="padding-top:16px">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>Date</th><th>Opponent</th><th>Score</th><th style="width:32px"></th><th>Location</th><th>Tournament</th><th style="width:40px"></th>
                </tr></thead>
                <tbody id="tp-games"><tr><td colspan="7" class="list-empty">Loading…</td></tr></tbody>
              </table>
            </div>
          </div>
          <div id="tp-pane-roster" style="display:none;padding-top:16px">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th style="width:48px">#</th><th>Name</th><th>Position</th><th>Height</th><th>Year</th>
                </tr></thead>
                <tbody id="tp-roster"><tr><td colspan="5" class="list-empty">Loading…</td></tr></tbody>
              </table>
            </div>
          </div>
          <div id="tp-pane-player-stats" style="display:none;padding-top:16px">
            <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:14px">
              <button class="tp-ps-tab" data-ps-tab="averages" style="padding:7px 18px;background:none;border:none;border-bottom:2px solid var(--accent);cursor:pointer;font-size:0.82em;color:var(--accent);font-weight:600">Averages</button>
              <button class="tp-ps-tab" data-ps-tab="totals"   style="padding:7px 18px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:0.82em;color:var(--text-muted);font-weight:400">Totals</button>
            </div>
            <div id="tp-ps-pane-averages" class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th style="width:40px">#</th>
                  <th>Name</th>
                  <th style="text-align:center" title="Games Played">GP</th>
                  <th style="text-align:center" title="Games Started">GS</th>
                  <th style="text-align:right" title="Minutes Per Game">MINS</th>
                  <th style="text-align:right" title="Points Per Game">PPG</th>
                  <th style="text-align:right" title="Rebounds Per Game">RPG</th>
                  <th style="text-align:right" title="Assists Per Game">APG</th>
                  <th style="text-align:right" title="Steals Per Game">SPG</th>
                  <th style="text-align:right" title="Blocks Per Game">BPG</th>
                  <th style="text-align:right" title="Field Goal Percentage">FG%</th>
                  <th style="text-align:right" title="Three-Point Percentage">3P%</th>
                  <th style="text-align:right" title="Free Throw Percentage">FT%</th>
                  <th style="text-align:right" title="Points Per Possession">PPP</th>
                </tr></thead>
                <tbody id="tp-player-stats"><tr><td colspan="14" class="list-empty">Loading…</td></tr></tbody>
              </table>
            </div>
            <div id="tp-ps-pane-totals" class="table-wrap" style="display:none">
              <table class="data-table">
                <thead><tr>
                  <th style="width:40px">#</th>
                  <th>Name</th>
                  <th style="text-align:center" title="Games Played">GP</th>
                  <th style="text-align:center" title="Games Started">GS</th>
                  <th style="text-align:right" title="Total Minutes">MIN</th>
                  <th style="text-align:right" title="Total Points">PTS</th>
                  <th style="text-align:right" title="Total Rebounds">REB</th>
                  <th style="text-align:right" title="Total Assists">AST</th>
                  <th style="text-align:right" title="Total Steals">STL</th>
                  <th style="text-align:right" title="Total Blocks">BLK</th>
                  <th style="text-align:right" title="Field Goals Made-Attempted">FGM-FGA</th>
                  <th style="text-align:right" title="Three-Pointers Made-Attempted">3PM-3PA</th>
                  <th style="text-align:right" title="Free Throws Made-Attempted">FTM-FTA</th>
                </tr></thead>
                <tbody id="tp-player-stats-totals"><tr><td colspan="13" class="list-empty">Loading…</td></tr></tbody>
              </table>
            </div>
          </div>
          <div id="tp-pane-leaders" style="display:none;padding-top:16px">
            <div id="tp-leaders-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;align-items:start"></div>
          </div>
          <div id="tp-pane-team-stats" style="display:none;padding-top:16px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
              <div class="card" style="margin:0">
                <h3 class="section-title" style="margin-top:0">Point Differential</h3>
                <canvas id="tp-chart-diff"></canvas>
              </div>
              <div style="display:flex;flex-direction:column;gap:12px">
                <div class="card" style="margin:0">
                  <h3 class="section-title" style="margin-top:0">Scoring Trends</h3>
                  <canvas id="tp-chart-scoring"></canvas>
                </div>
                <div class="card" style="margin:0">
                  <h3 class="section-title" style="margin-top:0">Avg Points Per Game</h3>
                  <div id="tp-gauges" style="display:flex;justify-content:space-around;align-items:flex-end;padding:8px 0 4px"></div>
                </div>
              </div>
            </div>
          </div>
          <div id="tp-pane-photo" style="display:none;padding-top:16px;text-align:center">
            <div id="tp-photo-wrap"></div>
          </div>
        </div>`;
    },

    async init(params) {
      const teamId = parseInt(params?.team) || currentUser?.default_team_id;
      if (!teamId) {
        document.getElementById('tp-team-name').textContent = 'No team selected';
        return;
      }
      document.getElementById('tp-edit-btn').addEventListener('click', e => {
        e.preventDefault();
        window.location.hash = `#/team-form?id=${teamId}&back=${encodeURIComponent(window.location.hash || '#/team-profile')}`;
      });

      const [teamRes, seasonsRes] = await Promise.all([
        fetch(`api/teams/${teamId}`).then(r => r.json()).catch(() => ({})),
        fetch(`api/teams/${teamId}/seasons`).then(r => r.json()).catch(() => ({})),
      ]);

      const team = teamRes.team;
      if (!team) {
        document.getElementById('tp-team-name').textContent = 'Team not found';
        return;
      }

      document.getElementById('tp-title').textContent = team.name;
      document.getElementById('tp-team-name').textContent = team.abbrev ? `${team.name} (${team.abbrev})` : team.name;

      if (params.from) {
        const titleEl = document.getElementById('tp-title');
        const backBtn = document.createElement('a');
        backBtn.href = decodeURIComponent(params.from);
        backBtn.className = 'btn btn-secondary btn-sm';
        backBtn.style.cssText = 'margin-bottom:8px;display:inline-flex;align-items:center;gap:6px;font-size:.85em';
        backBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Back`;
        titleEl.parentNode.insertBefore(backBtn, titleEl);
      }

      const metaParts = [];
      if (team.nickname) metaParts.push(escapeHtml(team.nickname));
      if (team.gender != null && team.gender !== '') metaParts.push(team.gender == 0 ? 'Male' : 'Female');
      document.getElementById('tp-meta').innerHTML = metaParts.join(' &middot; ');

      const seasons = seasonsRes.seasons || [];
      const seasonSel = document.getElementById('tp-season');

      function updateCoach(seasonId) {
        const s = seasons.find(s => s.season_id === seasonId);
        const coachEl = document.getElementById('tp-coach');
        coachEl.textContent = s?.coach ? `Coach: ${s.coach}` : '';
      }

      function updateLogo(seasonId) {
        const s = seasons.find(s => s.season_id === seasonId);
        const src = (s?.logo_path || team.logo_path) ? `${s?.logo_path || team.logo_path}?t=${Date.now()}` : null;
        const logoEl = document.getElementById('tp-logo');
        if (src) {
          logoEl.innerHTML = `<img src="${src}" style="width:72px;height:72px;object-fit:contain" alt="">`;
        } else {
          logoEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--border)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        }
      }

      if (seasons.length === 0) {
        seasonSel.innerHTML = '<option value="">No seasons</option>';
        document.getElementById('tp-games').innerHTML = '<tr><td colspan="7" class="list-empty">No seasons found</td></tr>';
        document.getElementById('tp-roster').innerHTML = '<tr><td colspan="5" class="list-empty">No seasons found</td></tr>';
        return;
      }

      const preferredId = parseInt(params?.season) || currentUser?.default_season_id;
      const hasPreferred = preferredId && seasons.some(s => s.season_id === preferredId);
      const defaultSeasonId = hasPreferred ? preferredId : seasons[0].season_id;
      seasonSel.innerHTML = seasons.map(s =>
        `<option value="${s.season_id}"${s.season_id === defaultSeasonId ? ' selected' : ''}>${escapeHtml(s.season_name)}</option>`
      ).join('');

      // ── Tab switching ────────────────────────────────────────────────────────
      let rosterLoaded = false;
      let playerStatsLoaded = false;
      let leadersLoaded = false;
      let playerStatsData = [];
      let psActiveTab = 'averages';
      let seasonGames = [];
      let diffChart = null;
      let scoringChart = null;
      let activeTab = 'schedule';

      function activateTab(name) {
        activeTab = name;
        document.querySelectorAll('.tp-tab').forEach(btn => {
          const active = btn.dataset.tab === name;
          btn.style.color        = active ? 'var(--accent)' : 'var(--text-muted)';
          btn.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
          btn.style.fontWeight   = active ? '600' : '400';
        });
        document.getElementById('tp-pane-schedule').style.display    = name === 'schedule'    ? '' : 'none';
        document.getElementById('tp-pane-roster').style.display      = name === 'roster'      ? '' : 'none';
        document.getElementById('tp-pane-player-stats').style.display= name === 'player-stats'? '' : 'none';
        document.getElementById('tp-pane-leaders').style.display     = name === 'leaders'     ? '' : 'none';
        document.getElementById('tp-pane-team-stats').style.display  = name === 'team-stats'  ? '' : 'none';
        document.getElementById('tp-pane-photo').style.display       = name === 'photo'       ? '' : 'none';
        if (name === 'roster'       && !rosterLoaded)      loadRoster(parseInt(seasonSel.value));
        if (name === 'player-stats' && !playerStatsLoaded) loadPlayerStats(parseInt(seasonSel.value));
        if (name === 'leaders'      && !leadersLoaded)     loadLeaders(parseInt(seasonSel.value));
        if (name === 'team-stats')                         { renderDiffChart(); renderScoringChart(); renderScoringGauges(); }
        if (name === 'photo')                              showPhoto(parseInt(seasonSel.value));
      }

      document.querySelectorAll('.tp-tab').forEach(btn =>
        btn.addEventListener('click', () => {
          activateTab(btn.dataset.tab);
          updateUrlSilent('team-profile', { team: teamId, season: seasonSel.value, tab: btn.dataset.tab, ...(params.from ? { from: params.from } : {}) });
        })
      );

      function switchPsTab(tab) {
        psActiveTab = tab;
        document.querySelectorAll('.tp-ps-tab').forEach(btn => {
          const active = btn.dataset.psTab === tab;
          btn.style.color       = active ? 'var(--accent)'    : 'var(--text-muted)';
          btn.style.fontWeight  = active ? '600'              : '400';
          btn.style.borderBottom= active ? '2px solid var(--accent)' : '2px solid transparent';
        });
        document.getElementById('tp-ps-pane-averages').style.display = tab === 'averages' ? '' : 'none';
        document.getElementById('tp-ps-pane-totals').style.display   = tab === 'totals'   ? '' : 'none';
        if (tab === 'totals') renderPlayerStatsTotals();
      }

      document.querySelectorAll('.tp-ps-tab').forEach(btn =>
        btn.addEventListener('click', () => switchPsTab(btn.dataset.psTab))
      );

      // ── Schedule ─────────────────────────────────────────────────────────────
      async function loadGames(seasonId) {
        const fromHash = encodeURIComponent(window.location.hash);
        const tbody = document.getElementById('tp-games');
        tbody.innerHTML = `<tr><td colspan="7" class="list-empty">Loading…</td></tr>`;
        document.getElementById('tp-record').textContent = '';
        try {
          const data  = await fetch(`api/teams/${teamId}/games?season_id=${seasonId}`).then(r => r.json());
          const games = data.games || [];
          seasonGames = games;

          let wins = 0, losses = 0, upcoming = 0;
          games.forEach(g => {
            const ts = parseInt(g.team_score), os = parseInt(g.opponent_score);
            if (!isNaN(ts) && !isNaN(os)) {
              ts > os ? wins++ : losses++;
            } else {
              upcoming++;
            }
          });

          document.getElementById('tp-record').textContent = `Overall Record: ${wins} - ${losses}`;

          const bsIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="5" width="4" height="16"/><rect x="17" y="2" width="4" height="19"/></svg>`;
          tbody.innerHTML = games.length === 0
            ? '<tr><td colspan="7" class="list-empty">No games scheduled</td></tr>'
            : games.map(g => {
                const d = g.start_time ? new Date(g.start_time) : null;
                const dateStr  = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                const ts = parseInt(g.team_score), os = parseInt(g.opponent_score);
                const hasScore = !isNaN(ts) && !isNaN(os);
                const score    = hasScore ? `${ts}–${os}` : '—';
                const result   = hasScore
                  ? (ts > os
                      ? `<span style="color:#4caf50;font-weight:700">W</span>`
                      : `<span style="color:#f44336;font-weight:700">L</span>`)
                  : '';
                const videoIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
                const bsCell   = g.has_boxscore
                  ? `<a href="#/boxscore?id=${g.competition_id}&from=${fromHash}" title="View Boxscore" style="color:var(--accent);display:inline-flex;align-items:center">${bsIcon}</a>`
                  : `<span title="No boxscore available" style="color:var(--text-muted);opacity:0.3;display:inline-flex;align-items:center">${bsIcon}</span>`;
                const videoCell = g.video_url
                  ? `<a href="${escapeHtml(g.video_url)}" target="_blank" rel="noopener noreferrer" title="Watch Game" style="color:var(--accent);display:inline-flex;align-items:center">${videoIcon}</a>`
                  : `<span title="No video available" style="color:var(--text-muted);opacity:0.3;display:inline-flex;align-items:center">${videoIcon}</span>`;
                return `<tr>
                  <td style="white-space:nowrap;color:var(--text-muted)">${escapeHtml(dateStr)}</td>
                  <td>${escapeHtml(g.opponent_name || '')}</td>
                  <td style="font-variant-numeric:tabular-nums">${score}</td>
                  <td style="text-align:center">${result}</td>
                  <td style="color:var(--text-muted)">${escapeHtml(g.location || '')}</td>
                  <td style="color:var(--text-muted)">${escapeHtml(g.tournament_name || '')}</td>
                  <td style="text-align:center;display:flex;gap:8px;justify-content:center;align-items:center">${bsCell}${videoCell}</td>
                </tr>`;
              }).join('');
          if (activeTab === 'team-stats') { renderDiffChart(); renderScoringChart(); renderScoringGauges(); }
        } catch {
          tbody.innerHTML = '<tr><td colspan="7" class="list-empty">Failed to load games</td></tr>';
        }
      }

      // ── Leaders ──────────────────────────────────────────────────────────────
      async function loadLeaders(seasonId) {
        leadersLoaded = true;
        const wrap = document.getElementById('tp-leaders-grid');
        if (!wrap) return;
        wrap.innerHTML = '<p style="color:var(--text-muted)">Loading…</p>';
        try {
          const data    = await fetch(`api/teams/${teamId}/player-stats?season_id=${seasonId}`).then(r => r.json());
          const players = (data.players || []).filter(p => parseInt(p.gp) > 0);

          if (!players.length) {
            wrap.innerHTML = '<p style="color:var(--text-muted)">No player stats found</p>';
            return;
          }

          const avg = (total, gp) => {
            const t = parseInt(total), g = parseInt(gp);
            return g > 0 ? t / g : 0;
          };
          const pct = (made, att) => {
            const m = parseInt(made), a = parseInt(att);
            return a > 0 ? m / a * 100 : null;
          };
          const pppVal = p => {
            const fga = parseInt(p.fga), fta = parseInt(p.fta), oreb = parseInt(p.oreb),
                  to  = parseInt(p.turnovers), pts = parseInt(p.pts);
            const poss = fga + 0.44 * fta - oreb + to;
            return poss > 0 ? pts / poss : null;
          };

          const categories = [
            { label: 'Points Per Game',   entries: players.map(p => ({ p, v: avg(p.pts,  p.gp) })),                                                                  fmt: v => v.toFixed(1) },
            { label: 'Rebounds Per Game', entries: players.map(p => ({ p, v: avg(p.reb,  p.gp) })),                                                                  fmt: v => v.toFixed(1) },
            { label: 'Assists Per Game',  entries: players.map(p => ({ p, v: avg(p.ast,  p.gp) })),                                                                  fmt: v => v.toFixed(1) },
            { label: 'Steals Per Game',   entries: players.map(p => ({ p, v: avg(p.stl,  p.gp) })),                                                                  fmt: v => v.toFixed(1) },
            { label: 'Blocks Per Game',   entries: players.map(p => ({ p, v: avg(p.blk,  p.gp) })),                                                                  fmt: v => v.toFixed(1) },
            { label: 'Minutes Per Game',  entries: players.map(p => ({ p, v: parseFloat(p.mpg) || 0 })),                                                             fmt: v => v.toFixed(1) },
            { label: 'Field Goal %',      entries: players.filter(p => parseInt(p.fga)  >= 3).map(p => ({ p, v: pct(p.fgm,  p.fga)  })).filter(x => x.v !== null), fmt: v => v.toFixed(1) + '%' },
            { label: 'Three-Point %',     entries: players.filter(p => parseInt(p.fga3) >= 3).map(p => ({ p, v: pct(p.fgm3, p.fga3) })).filter(x => x.v !== null), fmt: v => v.toFixed(1) + '%' },
            { label: 'Free Throw %',      entries: players.filter(p => parseInt(p.fta)  >= 3).map(p => ({ p, v: pct(p.ftm,  p.fta)  })).filter(x => x.v !== null), fmt: v => v.toFixed(1) + '%' },
            { label: 'Pts Per Possession',entries: players.filter(p => parseInt(p.fga)  >  0).map(p => ({ p, v: pppVal(p) })).filter(x => x.v !== null),            fmt: v => v.toFixed(2) },
          ];

          const rankColors = ['#e5a00d', '#9e9e9e', '#cd7f32'];
          const name = p => `${p.first_name || ''} ${p.last_name || ''}`.trim();

          wrap.innerHTML = categories.map(cat => {
            const top3 = [...cat.entries].sort((a, b) => b.v - a.v).slice(0, 3);
            if (!top3.length) return '';
            const rows = top3.map((item, i) => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0${i < top3.length - 1 ? ';border-bottom:1px solid var(--border)' : ''}">
                <span style="font-size:0.75em;font-weight:700;color:${rankColors[i]};width:14px;text-align:center;flex-shrink:0">${i + 1}</span>
                <span style="flex:1;font-size:0.85em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${i === 0 ? 'var(--text)' : 'var(--text-muted)'};font-weight:${i === 0 ? '600' : '400'}">${escapeHtml(name(item.p))}</span>
                <span style="font-size:0.85em;font-variant-numeric:tabular-nums;font-weight:${i === 0 ? '700' : '400'};color:${i === 0 ? 'var(--text)' : 'var(--text-muted)'}">${cat.fmt(item.v)}</span>
              </div>`).join('');
            return `
              <div class="card" style="margin:0">
                <div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:6px">${escapeHtml(cat.label)}</div>
                ${rows}
              </div>`;
          }).filter(Boolean).join('');
        } catch {
          wrap.innerHTML = '<p style="color:var(--text-muted)">Failed to load leaders</p>';
        }
      }

      // ── Team Stats chart ──────────────────────────────────────────────────────
      function renderDiffChart() {
        const played = seasonGames.filter(g => {
          const ts = parseInt(g.team_score), os = parseInt(g.opponent_score);
          return !isNaN(ts) && !isNaN(os);
        });

        const labels = played.map(g => {
          const d = g.start_time ? new Date(g.start_time) : null;
          return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?';
        });
        const diffs  = played.map(g => parseInt(g.team_score) - parseInt(g.opponent_score));
        const colors = diffs.map(d => d >= 0 ? '#4caf50' : '#f44336');

        if (diffChart) { diffChart.destroy(); diffChart = null; }
        const ctx = document.getElementById('tp-chart-diff');
        if (!ctx) return;

        diffChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              data: diffs,
              backgroundColor: colors,
              borderColor: colors,
              borderWidth: 1,
              borderRadius: 3,
            }]
          },
          options: {
            responsive: true,
            aspectRatio: 2.5,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (items) => {
                    const g = played[items[0].dataIndex];
                    return `${labels[items[0].dataIndex]} vs ${g.opponent_name || ''}`;
                  },
                  label: (item) => {
                    const v = item.raw;
                    return v >= 0 ? `+${v} (W)` : `${v} (L)`;
                  }
                }
              }
            },
            scales: {
              x: {
                ticks: { color: '#888', font: { size: 11 } },
                grid:  { display: false }
              },
              y: {
                ticks: { color: '#888' },
                grid:  {
                  color: (ctx) => ctx.tick.value === 0 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)',
                  drawBorder: false
                },
                border: { display: false },
                title: { display: true, text: 'Point Differential', color: '#888', font: { size: 12 } }
              }
            }
          }
        });
      }

      // ── Scoring trends chart ─────────────────────────────────────────────────
      function renderScoringChart() {
        const played = seasonGames.filter(g => {
          const ts = parseInt(g.team_score), os = parseInt(g.opponent_score);
          return !isNaN(ts) && !isNaN(os);
        });

        const labels   = played.map(g => {
          const d = g.start_time ? new Date(g.start_time) : null;
          return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?';
        });
        const teamPts  = played.map(g => parseInt(g.team_score));
        const oppPts   = played.map(g => parseInt(g.opponent_score));

        if (scoringChart) { scoringChart.destroy(); scoringChart = null; }
        const ctx = document.getElementById('tp-chart-scoring');
        if (!ctx) return;

        const gridColor = (c) => c.tick.value === 0 ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)';

        scoringChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Team',
                data: teamPts,
                borderColor: '#e5a00d',
                backgroundColor: 'rgba(229,160,13,0.08)',
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: false,
              },
              {
                label: 'Opponent',
                data: oppPts,
                borderColor: '#888',
                backgroundColor: 'rgba(136,136,136,0.08)',
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: false,
              }
            ]
          },
          options: {
            responsive: true,
            aspectRatio: 2.5,
            plugins: {
              legend: { display: true, labels: { color: '#888', boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  title: (items) => {
                    const g = played[items[0].dataIndex];
                    return `${labels[items[0].dataIndex]} vs ${g.opponent_name || ''}`;
                  }
                }
              }
            },
            scales: {
              x: {
                ticks: { color: '#888', font: { size: 11 } },
                grid:  { display: false }
              },
              y: {
                ticks: { color: '#888' },
                grid:  { color: gridColor, drawBorder: false },
                border: { display: false },
                title: { display: true, text: 'Points', color: '#888', font: { size: 12 } }
              }
            }
          }
        });
      }

      // ── PPG gauges ───────────────────────────────────────────────────────────
      function renderScoringGauges() {
        const wrap = document.getElementById('tp-gauges');
        if (!wrap) return;
        const played = seasonGames.filter(g => {
          const ts = parseInt(g.team_score), os = parseInt(g.opponent_score);
          return !isNaN(ts) && !isNaN(os);
        });
        if (!played.length) {
          wrap.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:12px 0;width:100%">No games played</p>';
          return;
        }
        const teamAvg = played.reduce((s, g) => s + parseInt(g.team_score), 0)  / played.length;
        const oppAvg  = played.reduce((s, g) => s + parseInt(g.opponent_score), 0) / played.length;
        const maxPts  = 120;
        const r = 80, arcLen = Math.PI * r;

        function gauge(value, color, label) {
          const filled = (arcLen * Math.min(value / maxPts, 1)).toFixed(1);
          return `
            <div style="text-align:center;flex:1">
              <svg viewBox="0 0 200 115" style="width:100%;max-width:160px;display:block;margin:0 auto">
                <path d="M 20 100 A 80 80 0 0 1 180 100"
                      stroke="rgba(0,0,0,0.12)" stroke-width="16" fill="none" stroke-linecap="round"/>
                <path d="M 20 100 A 80 80 0 0 1 180 100"
                      stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"
                      stroke-dasharray="${filled} ${arcLen.toFixed(1)}" stroke-dashoffset="0"/>
                <text x="100" y="94" text-anchor="middle" font-size="30" font-weight="700"
                      fill="#e8e8e8" font-family="inherit">${value.toFixed(1)}</text>
                <text x="100" y="112" text-anchor="middle" font-size="11"
                      fill="#888" font-family="inherit">${label}</text>
              </svg>
            </div>`;
        }

        wrap.innerHTML = gauge(teamAvg, '#e5a00d', 'Team') + gauge(oppAvg, '#888', 'Opponent');
      }

      // ── Roster ───────────────────────────────────────────────────────────────
      async function loadRoster(seasonId) {
        rosterLoaded = true;
        const tbody = document.getElementById('tp-roster');
        tbody.innerHTML = `<tr><td colspan="5" class="list-empty">Loading…</td></tr>`;
        try {
          const data   = await fetch(`api/teams/${teamId}/roster?season_id=${seasonId}`).then(r => r.json());
          const roster = data.roster || [];
          tbody.innerHTML = roster.length === 0
            ? '<tr><td colspan="5" class="list-empty">No players on roster</td></tr>'
            : roster.map(p => `<tr>
                <td style="color:var(--text-muted);font-variant-numeric:tabular-nums">${escapeHtml(p.jersey_number || '—')}</td>
                <td>${escapeHtml(`${p.first_name || ''} ${p.last_name || ''}`.trim())}</td>
                <td style="color:var(--text-muted)">${escapeHtml(p.position || '—')}</td>
                <td style="color:var(--text-muted)">${escapeHtml(p.height || '—')}</td>
                <td style="color:var(--text-muted)">${escapeHtml(p.grad_year ? String(p.grad_year) : '—')}</td>
              </tr>`).join('');
        } catch {
          tbody.innerHTML = '<tr><td colspan="5" class="list-empty">Failed to load roster</td></tr>';
        }
      }

      // ── Player Stats ─────────────────────────────────────────────────────────
      async function loadPlayerStats(seasonId) {
        playerStatsLoaded = true;
        const tbody = document.getElementById('tp-player-stats');
        tbody.innerHTML = `<tr><td colspan="14" class="list-empty">Loading…</td></tr>`;
        try {
          const data    = await fetch(`api/teams/${teamId}/player-stats?season_id=${seasonId}`).then(r => r.json());
          const players = data.players || [];
          playerStatsData = players;
          if (psActiveTab === 'totals') renderPlayerStatsTotals();
          const pct = (made, att) => {
            const m = parseInt(made), a = parseInt(att);
            return a > 0 ? (m / a * 100).toFixed(1) + '%' : '—';
          };
          const avg = (total, gp) => {
            const t = parseInt(total), g = parseInt(gp);
            return g > 0 ? (t / g).toFixed(1) : '—';
          };
          const ppp = (pts, fga, fta, oreb, to) => {
            const poss = parseInt(fga) + (0.44 * parseInt(fta)) - parseInt(oreb) + parseInt(to);
            return poss > 0 ? (parseInt(pts) / poss).toFixed(2) : '—';
          };
          tbody.innerHTML = players.length === 0
            ? '<tr><td colspan="14" class="list-empty">No player stats found</td></tr>'
            : players.map(p => `<tr>
                <td style="color:var(--text-muted);font-variant-numeric:tabular-nums">${escapeHtml(p.jersey_number || '—')}</td>
                <td>${escapeHtml(`${p.first_name || ''} ${p.last_name || ''}`.trim())}</td>
                <td style="text-align:center">${p.gp || 0}</td>
                <td style="text-align:center">${p.gs || 0}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${p.mpg ?? '—'}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${avg(p.pts,  p.gp)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${avg(p.reb,  p.gp)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${avg(p.ast,  p.gp)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${avg(p.stl,  p.gp)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${avg(p.blk,  p.gp)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${pct(p.fgm,  p.fga)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${pct(p.fgm3, p.fga3)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${pct(p.ftm,  p.fta)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${ppp(p.pts, p.fga, p.fta, p.oreb, p.turnovers)}</td>
              </tr>`).join('');
        } catch {
          tbody.innerHTML = '<tr><td colspan="14" class="list-empty">Failed to load player stats</td></tr>';
        }
      }

      // ── Player Stats totals render ───────────────────────────────────────────
      function renderPlayerStatsTotals() {
        const tbody = document.getElementById('tp-player-stats-totals');
        if (!tbody) return;
        if (!playerStatsData.length) {
          tbody.innerHTML = '<tr><td colspan="13" class="list-empty">No player stats found</td></tr>';
          return;
        }
        const n = (val, fallback = '—') => { const v = parseInt(val); return isNaN(v) ? fallback : v; };
        tbody.innerHTML = playerStatsData.map(p => {
          const totalMin = parseFloat(p.total_min);
          const minStr   = isNaN(totalMin) || totalMin === 0 ? '—' : Math.round(totalMin);
          return `<tr>
            <td style="color:var(--text-muted);font-variant-numeric:tabular-nums">${escapeHtml(p.jersey_number || '—')}</td>
            <td>${escapeHtml(`${p.first_name || ''} ${p.last_name || ''}`.trim())}</td>
            <td style="text-align:center">${p.gp || 0}</td>
            <td style="text-align:center">${p.gs || 0}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${minStr}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.pts,  0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.reb,  0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.ast,  0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.stl,  0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.blk,  0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.fgm,  0)}-${n(p.fga,  0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.fgm3, 0)}-${n(p.fga3, 0)}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${n(p.ftm,  0)}-${n(p.fta,  0)}</td>
          </tr>`;
        }).join('');
      }

      // ── Photo ────────────────────────────────────────────────────────────────
      function showPhoto(seasonId) {
        const wrap = document.getElementById('tp-photo-wrap');
        if (!wrap) return;
        const season = seasons.find(s => s.season_id === seasonId);
        if (season?.logo_path) {
          wrap.innerHTML = `<img src="${season.logo_path}" alt="Team logo"
            style="max-width:100%;max-height:600px;border-radius:6px;object-fit:contain">`;
        } else {
          wrap.innerHTML = `<p style="color:var(--text-muted);padding:32px 0">No logo available for this season.</p>`;
        }
      }

      // ── Init ─────────────────────────────────────────────────────────────────
      updateUrlSilent('team-profile', { team: teamId, season: defaultSeasonId, ...(params.tab ? { tab: params.tab } : {}), ...(params.from ? { from: params.from } : {}) });
      updateCoach(parseInt(seasonSel.value));
      await loadGames(parseInt(seasonSel.value));
      updateLogo(parseInt(seasonSel.value));
      activateTab(params.tab || 'schedule');

      seasonSel.addEventListener('change', () => {
        updateUrlSilent('team-profile', { team: teamId, season: seasonSel.value, tab: activeTab, ...(params.from ? { from: params.from } : {}) });
        rosterLoaded = false;
        playerStatsLoaded = false;
        leadersLoaded = false;
        playerStatsData = [];
        psActiveTab = 'averages';
        switchPsTab('averages');
        if (diffChart)    { diffChart.destroy();    diffChart    = null; }
        if (scoringChart) { scoringChart.destroy(); scoringChart = null; }
        updateCoach(parseInt(seasonSel.value));
        updateLogo(parseInt(seasonSel.value));
        loadGames(parseInt(seasonSel.value));
        if (activeTab === 'roster')       loadRoster(parseInt(seasonSel.value));
        if (activeTab === 'player-stats') loadPlayerStats(parseInt(seasonSel.value));
        if (activeTab === 'leaders')      loadLeaders(parseInt(seasonSel.value));
        if (activeTab === 'photo')        showPhoto(parseInt(seasonSel.value));
      });
    }
  },

  'org-form': {
    menuRoute: 'membership',
    render() {
      return `
        <h2 class="page-title" id="of-page-title">Edit Organization</h2>
        <div class="card">
          <form id="of-form" novalidate style="padding:4px 0">
            <div class="two-col">
              <div class="form-group">
                <label for="of-name">Name <span style="color:var(--accent)">*</span></label>
                <input type="text" id="of-name" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="of-short-name">Short Name</label>
                <input type="text" id="of-short-name" autocomplete="off" spellcheck="false">
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="of-acronym">Acronym</label>
                <input type="text" id="of-acronym" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="of-level">Level</label>
                <select id="of-level">
                  <option value="">— Select —</option>
                  <option value="international">International</option>
                  <option value="national">National</option>
                  <option value="provincial">Provincial</option>
                  <option value="regional">Regional</option>
                </select>
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="of-parent">Parent Organization</label>
                <select id="of-parent"><option value="">— None —</option></select>
              </div>
              <div class="form-group">
                <label for="of-jurisdiction">Jurisdiction</label>
                <input type="text" id="of-jurisdiction" autocomplete="off" spellcheck="false">
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="of-website">Website</label>
                <input type="url" id="of-website" placeholder="https://" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="of-email">Contact Email</label>
                <input type="email" id="of-email" spellcheck="false">
              </div>
            </div>
            <div class="form-group" style="max-width:200px">
              <label for="of-founded">Founded Date</label>
              <input type="date" id="of-founded">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="of-save">Save</button>
              <button type="button" class="btn btn-secondary" id="of-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="of-status"></div>
          </form>
        </div>`;
    },
    async init(params = {}) {
      const backHash = backUrl(params.back, '#/membership');
      const res  = await fetch(`api/membership/orgs/${params.id}`).then(r => r.json()).catch(() => ({}));
      const org  = res.org || null;

      const allOrgs = await fetch('api/membership').then(r => r.json()).then(d => d.organizations || []).catch(() => []);
      const parentSel = document.getElementById('of-parent');
      allOrgs.filter(o => o.org_id !== parseInt(params.id)).forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.org_id;
        opt.textContent = o.acronym ? `${o.name} (${o.acronym})` : o.name;
        parentSel.appendChild(opt);
      });

      if (org) {
        setValue('of-name',       org.name);
        setValue('of-short-name', org.short_name);
        setValue('of-acronym',    org.acronym);
        setValue('of-level',      org.level);
        setValue('of-parent',     org.parent_org_id);
        setValue('of-jurisdiction', org.jurisdiction);
        setValue('of-website',    org.website);
        setValue('of-email',      org.contact_email);
        setValue('of-founded',    org.founded_date ? String(org.founded_date).substring(0, 10) : '');
      }

      document.getElementById('of-cancel').addEventListener('click', () => { window.location.hash = backHash; });

      document.getElementById('of-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('of-save');
        const body = {
          name:             document.getElementById('of-name').value.trim(),
          short_name:       document.getElementById('of-short-name').value.trim() || null,
          acronym:          document.getElementById('of-acronym').value.trim() || null,
          level:            document.getElementById('of-level').value || null,
          parent_org_id:    document.getElementById('of-parent').value || null,
          jurisdiction:     document.getElementById('of-jurisdiction').value.trim() || null,
          website:          document.getElementById('of-website').value.trim() || null,
          contact_email:    document.getElementById('of-email').value.trim() || null,
          founded_date:     document.getElementById('of-founded').value || null,
        };
        if (!body.name) { showStatus('of-status', 'error', 'Name is required.'); return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const data = await fetch(`api/membership/orgs/${params.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          }).then(r => r.json());
          if (data.success) { window.location.hash = backHash; }
          else { showStatus('of-status', 'error', data.error || 'Save failed'); }
        } catch {
          showStatus('of-status', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });
    }
  },

  'member-form': {
    menuRoute: 'membership',
    render() {
      return `
        <h2 class="page-title" id="mf-page-title">Edit Member</h2>
        <div class="card">
          <form id="mf-form" novalidate style="padding:4px 0">
            <div class="two-col">
              <div class="form-group">
                <label for="mf-name">Name <span style="color:var(--accent)">*</span></label>
                <input type="text" id="mf-name" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="mf-short-name">Short Name</label>
                <input type="text" id="mf-short-name" autocomplete="off" spellcheck="false">
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="mf-type">Type</label>
                <select id="mf-type">
                  <option value="">— Select —</option>
                  <option value="club">Club</option>
                  <option value="school">School</option>
                  <option value="academy">Academy</option>
                  <option value="rep_program">Rep Program</option>
                </select>
              </div>
              <div class="form-group">
                <label for="mf-status">Status</label>
                <select id="mf-status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="mf-sanctioning">Sanctioning Organization</label>
                <select id="mf-sanctioning"><option value="">— None —</option></select>
              </div>
              <div class="form-group">
                <label for="mf-founded">Founded Date</label>
                <input type="date" id="mf-founded">
              </div>
            </div>
            <div class="two-col">
              <div class="form-group">
                <label for="mf-email">Contact Email</label>
                <input type="email" id="mf-email" spellcheck="false">
              </div>
              <div class="form-group">
                <label for="mf-phone">Phone</label>
                <input type="tel" id="mf-phone" autocomplete="off">
              </div>
            </div>
            <div class="form-group">
              <label for="mf-website">Website</label>
              <input type="url" id="mf-website" placeholder="https://" spellcheck="false">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="mf-save">Save</button>
              <button type="button" class="btn btn-secondary" id="mf-cancel">Cancel</button>
            </div>
            <div class="status-msg" id="mf-msg"></div>
          </form>
        </div>
        <div class="card" style="margin-top:12px">
          <h3 class="section-title">Teams</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>
                <th>Name</th>
                <th>Abbrev</th>
                <th>Gender</th>
                <th>Leagues</th>
                <th class="col-num">Seasons</th>
              </tr></thead>
              <tbody id="mf-team-list">
                <tr><td colspan="5" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    },
    async init(params = {}) {
      const backHash = backUrl(params.back, '#/membership');
      const [res, memberRes, orgsRes] = await Promise.all([
        fetch(`api/membership/members/${params.id}`).then(r => r.json()).catch(() => ({})),
        fetch(`api/membership/members/${params.id}/teams`).then(r => r.json()).catch(() => ({})),
        fetch('api/membership').then(r => r.json()).then(d => d.organizations || []).catch(() => []),
      ]);
      const member  = res.member || null;
      const allOrgs = orgsRes;

      const sanctSel = document.getElementById('mf-sanctioning');
      allOrgs.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.org_id;
        opt.textContent = o.acronym ? `${o.name} (${o.acronym})` : o.name;
        sanctSel.appendChild(opt);
      });

      if (member) {
        setValue('mf-name',        member.name);
        setValue('mf-short-name',  member.short_name);
        setValue('mf-type',        member.type);
        setValue('mf-status',      member.status);
        setValue('mf-sanctioning', member.sanctioning_org_id);
        setValue('mf-founded',     member.founded_date ? String(member.founded_date).substring(0, 10) : '');
        setValue('mf-email',       member.contact_email);
        setValue('mf-phone',       member.phone);
        setValue('mf-website',     member.website);
      }

      const teamList = document.getElementById('mf-team-list');
      const teams = memberRes.teams || [];
      if (memberRes.error) {
        teamList.innerHTML = `<tr><td colspan="5" class="list-empty">${escapeHtml(memberRes.error)}</td></tr>`;
      } else if (!teams.length) {
        teamList.innerHTML = `<tr><td colspan="5" class="list-empty">No teams associated with this member.</td></tr>`;
      } else {
        const gl = g => g == null ? '—' : Number(g) === 0 ? 'Male' : 'Female';
        teamList.innerHTML = teams.map(t => `
          <tr>
            <td><a href="#/team-profile?team=${t.team_id}&back=${encodeURIComponent(window.location.hash || '#/membership')}" class="row-link">${escapeHtml(t.name)}</a></td>
            <td style="color:var(--text-muted)">${escapeHtml(t.abbrev || '—')}</td>
            <td style="color:var(--text-muted)">${gl(t.gender)}</td>
            <td style="color:var(--text-muted)">${escapeHtml(t.leagues || '—')}</td>
            <td class="col-num">${Number(t.season_count)}</td>
          </tr>`).join('');
      }

      document.getElementById('mf-cancel').addEventListener('click', () => { window.location.hash = backHash; });

      document.getElementById('mf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn  = document.getElementById('mf-save');
        const body = {
          name:              document.getElementById('mf-name').value.trim(),
          short_name:        document.getElementById('mf-short-name').value.trim() || null,
          type:              document.getElementById('mf-type').value || null,
          status:            document.getElementById('mf-status').value.trim() || null,
          sanctioning_org_id: document.getElementById('mf-sanctioning').value || null,
          founded_date:      document.getElementById('mf-founded').value || null,
          contact_email:     document.getElementById('mf-email').value.trim() || null,
          phone:             document.getElementById('mf-phone').value.trim() || null,
          website:           document.getElementById('mf-website').value.trim() || null,
        };
        if (!body.name) { showStatus('mf-msg', 'error', 'Name is required.'); return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
          const data = await fetch(`api/membership/members/${params.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          }).then(r => r.json());
          if (data.success) { window.location.hash = backHash; }
          else { showStatus('mf-msg', 'error', data.error || 'Save failed'); }
        } catch {
          showStatus('mf-msg', 'error', 'Request failed — is the server running?');
        } finally {
          btn.disabled = false; btn.textContent = 'Save';
        }
      });
    }
  },

  import: {
    menuRoute: 'import',
    render: () => `
      <div class="card">
        <div class="card-header"><span class="card-title">Import XML Stats</span></div>
        <div id="wiz-body" style="padding:20px"><p style="color:var(--text-muted)">Loading…</p></div>
      </div>`,
    async init() {
      wizReset();
      const data = await fetch('api/import/teams').then(r => r.json()).catch(() => ({}));
      wiz.allTeams = data.teams || [];
      wizRender();
    }
  },

  membership: {
    render() {
      return `
        <h2 class="page-title">Members</h2>
        <div class="card">
          <div class="section-header">
            <h3 class="section-title">Membership Manager</h3>
            <div class="header-controls">
              <select id="mm-type-filter" class="filter-select">
                <option value="">All Types</option>
                <option value="org">Organizations</option>
                <option value="club">Clubs</option>
                <option value="school">Schools</option>
                <option value="academy">Academies</option>
                <option value="rep_program">Rep Programs</option>
              </select>
              <select id="mm-bulk-action" class="filter-select">
                <option value=""></option>
                <option value="merge">Merge</option>
                <option value="delete">Delete</option>
              </select>
              <button class="btn btn-secondary btn-sm" id="mm-bulk-execute" disabled>Execute</button>
              <button class="btn btn-primary btn-sm" id="new-member-btn">+ New Member</button>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>
                <th class="col-check"><input type="checkbox" id="mm-check-all" title="Select all"></th>
                <th>Name</th>
                <th>Short Name</th>
                <th>Type</th>
                <th>Level / Status</th>
                <th>Parent / Sanctioning Body</th>
                <th>Website</th>
              </tr></thead>
              <tbody id="mm-list">
                <tr><td colspan="7" class="list-empty">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    },

    async init() {
      const TYPE_LABEL = {
        international: 'International', national: 'National',
        provincial: 'Provincial', regional: 'Regional',
        club: 'Club', school: 'School', academy: 'Academy', rep_program: 'Rep Program'
      };

      let allRows      = [];
      let visibleRows  = [];

      const listEl      = document.getElementById('mm-list');
      const checkAll    = document.getElementById('mm-check-all');
      const bulkAction  = document.getElementById('mm-bulk-action');
      const bulkExecute = document.getElementById('mm-bulk-execute');

      bulkAction.addEventListener('change', () => {
        bulkExecute.disabled = !bulkAction.value;
      });

      function syncMasterCheck() {
        const boxes   = [...listEl.querySelectorAll('.row-check')];
        const checked = boxes.filter(cb => cb.checked).length;
        checkAll.checked       = boxes.length > 0 && checked === boxes.length;
        checkAll.indeterminate = checked > 0 && checked < boxes.length;
      }

      checkAll.addEventListener('change', () => {
        listEl.querySelectorAll('.row-check').forEach(cb => cb.checked = checkAll.checked);
        checkAll.indeterminate = false;
      });

      listEl.addEventListener('change', e => {
        if (e.target.matches('.row-check')) syncMasterCheck();
      });

      function renderRows(filter) {
        visibleRows = filter ? allRows.filter(r => r._kind === filter || r.type === filter) : allRows;
        if (!visibleRows.length) {
          listEl.innerHTML = `<tr><td colspan="7" class="list-empty">No records found.</td></tr>`;
          checkAll.checked = false; checkAll.indeterminate = false;
          return;
        }
        listEl.innerHTML = visibleRows.map(r => {
          const typeLabel = TYPE_LABEL[r.level || r.type] || r.level || r.type || '—';
          const parentCol = r._kind === 'org'
            ? (r.parent_acronym ? escapeHtml(r.parent_acronym) : r.parent_name ? escapeHtml(r.parent_name) : '<span style="color:var(--text-muted)">—</span>')
            : (r.sanctioning_acronym ? escapeHtml(r.sanctioning_acronym) : r.sanctioning_org ? escapeHtml(r.sanctioning_org) : '<span style="color:var(--text-muted)">—</span>');
          const levelStatus = r._kind === 'org' ? typeLabel : `<span style="color:var(--text-muted)">${escapeHtml(r.status || '—')}</span>`;
          const kindBadge = r._kind === 'org'
            ? `<span style="font-size:.7rem;padding:1px 6px;border-radius:10px;background:var(--accent);color:#000;font-weight:600">ORG</span>`
            : `<span style="font-size:.7rem;padding:1px 6px;border-radius:10px;background:var(--surface2);color:var(--text-muted)">${escapeHtml(typeLabel)}</span>`;
          const rowId   = r._kind === 'org' ? r.org_id : r.member_id;
          const editHash = r._kind === 'org'
            ? `#/org-form?id=${r.org_id}&back=${encodeURIComponent(window.location.hash || '#/membership')}`
            : `#/member-form?id=${r.member_id}&back=${encodeURIComponent(window.location.hash || '#/membership')}`;
          return `
            <tr>
              <td class="col-check"><input type="checkbox" class="row-check" data-id="${rowId}" data-kind="${r._kind}"></td>
              <td><a href="${editHash}" class="row-link">${escapeHtml(r.name)}</a></td>
              <td style="color:var(--text-muted)">${escapeHtml(r.short_name || r.acronym || '—')}</td>
              <td>${kindBadge}</td>
              <td>${levelStatus}</td>
              <td>${parentCol}</td>
              <td>${r.website ? `<a href="${escapeHtml(r.website)}" target="_blank" class="row-link" rel="noopener noreferrer">${escapeHtml(r.website)}</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
            </tr>`;
        }).join('');
        syncMasterCheck();
      }

      async function loadAll() {
        listEl.innerHTML = `<tr><td colspan="7" class="list-empty">Loading…</td></tr>`;
        const res  = await fetch('api/membership');
        const data = await res.json();
        if (data.error) {
          listEl.innerHTML = `<tr><td colspan="7" class="list-empty">${escapeHtml(data.error)}</td></tr>`;
          return;
        }
        const orgs    = (data.organizations || []).map(o => ({ ...o, _kind: 'org' }));
        const members = (data.members || []).map(m => ({ ...m, _kind: 'member' }));
        allRows = [...orgs, ...members];
        renderRows(document.getElementById('mm-type-filter').value);
      }

      document.getElementById('mm-type-filter').addEventListener('change', e => {
        renderRows(e.target.value);
      });

      bulkExecute.addEventListener('click', async () => {
        const action  = bulkAction.value;
        if (!action) return;
        const checked = [...listEl.querySelectorAll('.row-check:checked')];
        if (!checked.length) { await alertDialog('No Selection', 'Select at least one row first.'); return; }

        if (action === 'delete') {
          const selected = checked.map(cb => {
            const kind = cb.dataset.kind;
            const id   = parseInt(cb.dataset.id);
            const row  = allRows.find(r => r._kind === kind && (kind === 'org' ? r.org_id : r.member_id) === id);
            return { kind, id, name: row?.name ?? `#${id}` };
          });
          const preview = selected.length <= 5
            ? selected.map(s => s.name).join('\n')
            : selected.slice(0, 5).map(s => s.name).join('\n') + `\n…and ${selected.length - 5} more`;
          if (!await confirmDialog('Delete', `Delete ${selected.length} record(s)? This cannot be undone.\n\n${preview}`)) return;

          bulkExecute.disabled = true; bulkExecute.textContent = 'Deleting…';
          let deleted = 0;
          const errors = [];
          for (const s of selected) {
            const url = s.kind === 'org' ? `api/membership/orgs/${s.id}` : `api/membership/members/${s.id}`;
            try {
              const d = await fetch(url, { method: 'DELETE' }).then(r => r.json());
              if (d.success) deleted++;
              else errors.push(`${s.name}: ${d.error}`);
            } catch { errors.push(`${s.name}: request failed`); }
          }
          await loadAll();
          bulkAction.value = ''; bulkExecute.disabled = true; bulkExecute.textContent = 'Execute';
          if (errors.length) await alertDialog('Delete Results', `${deleted} deleted.\n\nSkipped:\n${errors.join('\n')}`);
        }

        if (action === 'merge') {
          const selected = checked.map(cb => {
            const kind = cb.dataset.kind;
            const id   = parseInt(cb.dataset.id);
            const row  = allRows.find(r => r._kind === kind && (kind === 'org' ? r.org_id : r.member_id) === id);
            return { kind, id, name: row?.name ?? `#${id}` };
          });
          const kinds = [...new Set(selected.map(s => s.kind))];
          if (kinds.length > 1) {
            await alertDialog('Cannot Merge', 'All selected rows must be the same type (all organizations or all members).'); return;
          }
          if (kinds[0] === 'org') {
            await alertDialog('Not yet implemented', 'Merge is not yet implemented for organizations.'); return;
          }
          if (selected.length < 2) {
            await alertDialog('Cannot Merge', 'Select at least 2 members to merge.'); return;
          }
          const mergeItems = selected.map(s => ({ id: s.id, label: s.name }));
          TeamMergeModal.open(mergeItems, async () => {
            await loadAll();
            bulkAction.value = '';
            bulkExecute.disabled = true;
          }, {
            title: `Merge ${selected.length} Members`,
            description: 'Select the master member. All teams from the other member(s) will be reassigned to it, then the source members will be deleted. This cannot be undone.',
            confirmFn: async (masterKey, master, sources) => {
              return fetch('api/membership/members/merge', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ masterId: parseInt(masterKey), sourceIds: sources.map(s => s.id) }),
              }).then(r => r.json());
            },
            successMsg: (master, sources) =>
              `Merge complete.\n\nMaster: ${master.label}\nMerged in: ${sources.map(s => s.label).join(', ')}`,
          });
        }
      });

      document.getElementById('new-member-btn').addEventListener('click', () => {
        // TODO: open new member form
      });

      await loadAll();
    }
  }
};

// ── Import Wizard ─────────────────────────────────────────────────────────────

let wiz = null;

function wizReset() {
  wiz = {
    step: 1,
    parsed: [],         // [{rawXml, source, filename, gameDate, home:{...}, visitor:{...}, plays:[]}]
    merged: null,       // Combined game view
    allTeams: [],       // DB teams for matching
    allSeasons: [],     // DB seasons for step 3
    homeTeamId: null,
    visitorTeamId: null,
    gameDate: null,
    gameTime: null,
    gameLocation: null,
    comptypeId: null,
    seasonId: null,
    homeDbPlayers: [],
    visitorDbPlayers: [],
    playerMap: {},      // "side:idx" → {playerId, newPlayer:{first_name,last_name}}
    existingCompId: null,
    uploadIds: [],
    tab: 'wizard',
    uploads: []
  };
}

// ── XML Parsing ───────────────────────────────────────────────────────────────

function wizParseDate(s) {
  if (!s) return null;
  const [m, d, y] = s.split('/');
  return (m && d && y) ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : null;
}

function wizParseTime(s) {
  if (!s) return '00:00:00';
  const m = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return '00:00:00';
  let h = parseInt(m[1]);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${m[2]}:00`;
}

function wizParseXml(xmlString, filename) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML file');
  const bbgame = doc.querySelector('bbgame');
  if (!bbgame) throw new Error('Not a bbgame XML file');

  const source   = bbgame.getAttribute('source') || 'Unknown';
  const venue    = bbgame.querySelector(':scope > venue');
  const status   = bbgame.querySelector(':scope > status');
  const rules    = venue?.querySelector('rules');

  const homeName    = venue?.getAttribute('homename') || '';
  const visitorName = venue?.getAttribute('visname')  || '';
  const dateStr     = venue?.getAttribute('date')     || '';

  function parseTeam(el) {
    const vh = el.getAttribute('vh');
    const periodScores = [...el.querySelectorAll('linescore lineprd')]
      .sort((a, b) => parseInt(a.getAttribute('prd')) - parseInt(b.getAttribute('prd')))
      .map(lp => parseInt(lp.getAttribute('score')) || 0);

    const players = [...el.querySelectorAll(':scope > player')]
      .filter(p => p.getAttribute('gp') !== '0')
      .map(p => {
        const statsEl = p.querySelector(':scope > stats');
        if (!statsEl || statsEl.getAttribute('sec') === '+') return null;
        const g = a => parseInt(statsEl.getAttribute(a) || '0') || 0;
        return {
          checkname: p.getAttribute('checkname') || '',
          uni:       p.getAttribute('uni') || '0',
          gs:        p.getAttribute('gs') === '1' ? 1 : 0,
          min:  g('min') * 60,
          tp:   g('tp'),  fgm:  g('fgm'),  fga:  g('fga'),
          fgm3: g('fgm3'), fga3: g('fga3'),
          ftm:  g('ftm'),  fta:  g('fta'),
          oreb: g('oreb'), dreb: g('dreb'), reb: g('treb'),
          ast:  g('ast'),  stl:  g('stl'),  blk: g('blk'),
          to:   g('to'),   pf:   g('pf'),   tf:  g('tf'),  dq: g('dq')
        };
      }).filter(Boolean);

    return { vh, periodScores, players, hasPlayers: players.length > 0 };
  }

  const teams = {};
  bbgame.querySelectorAll(':scope > team').forEach(el => {
    const t = parseTeam(el);
    teams[t.vh] = t;
  });

  // Parse plays
  const plays = [];
  doc.querySelectorAll('plays > period').forEach(pEl => {
    const period = parseInt(pEl.getAttribute('number'));
    let seq = 0;
    pEl.querySelectorAll('play').forEach(p => {
      const action = p.getAttribute('action');
      if (!action) return;
      const checkname = p.getAttribute('checkname');
      const ts = p.getAttribute('timeStamp');
      let wallClock = null;
      if (ts) {
        const parts = ts.split(' ');
        const d = wizParseDate(parts[0]);
        if (d && parts[1]) wallClock = `${d} ${parts[1]}`;
      }
      plays.push({
        period, seq: seq++,
        clock:         p.getAttribute('time') || '00:00',
        action,
        play_type:     p.getAttribute('type') || null,
        vh:            p.getAttribute('vh')   || null,
        checkname:     (['TEAM','TM'].includes(checkname)) ? null : (checkname || null),
        home_score:    p.hasAttribute('hscore') ? parseInt(p.getAttribute('hscore')) : null,
        visitor_score: p.hasAttribute('vscore') ? parseInt(p.getAttribute('vscore')) : null,
        wall_clock:    wallClock,
        is_paint:      p.getAttribute('paint') === 'Y' ? 1 : 0
      });
    });
  });

  const home    = teams['H'] || { periodScores: [], players: [], hasPlayers: false };
  const visitor = teams['V'] || { periodScores: [], players: [], hasPlayers: false };

  // Detect starters from PBP when no explicit gs="1" attributes were present (HoopStats)
  const hasExplicitStarters = [...home.players, ...visitor.players].some(p => p.gs === 1);
  if (!hasExplicitStarters) wizDetectStarters(home, visitor, plays);

  return {
    source, filename, rawXml: xmlString,
    gameDate:     wizParseDate(dateStr),
    dateStr,
    homeName, visitorName,
    time:       venue?.getAttribute('time')       || '',
    location:   venue?.getAttribute('location')   || '',
    postseason: venue?.getAttribute('postseason') || 'N',
    leaguegame: venue?.getAttribute('leaguegame') || null,
    complete:   status?.getAttribute('complete')  || 'N',
    numPeriods: parseInt(rules?.getAttribute('prds') || '4'),
    home, visitor, plays
  };
}

function wizDetectStarters(home, visitor, plays) {
  const subOut            = { H: new Set(), V: new Set() };
  const subIn             = { H: new Set(), V: new Set() };
  const seenBeforeFirstSub = { H: new Set(), V: new Set() };
  const firstSubSeen      = { H: false, V: false };

  for (const play of plays) {
    if (play.period !== 1 || !play.vh || !play.checkname) continue;
    const vh = play.vh;
    if (play.action === 'SUB') {
      if (play.play_type === 'OUT') subOut[vh]?.add(play.checkname);
      if (play.play_type === 'IN')  subIn[vh]?.add(play.checkname);
      firstSubSeen[vh] = true;
    } else if (!firstSubSeen[vh]) {
      seenBeforeFirstSub[vh]?.add(play.checkname);
    }
  }

  // Starter = subbed OUT without ever subbing IN, OR appeared before first SUB
  const starters = {
    H: new Set([...[...subOut.H].filter(c => !subIn.H.has(c)), ...seenBeforeFirstSub.H]),
    V: new Set([...[...subOut.V].filter(c => !subIn.V.has(c)), ...seenBeforeFirstSub.V])
  };

  for (const p of home.players)    if (starters.H.has(p.checkname)) p.gs = 1;
  for (const p of visitor.players) if (starters.V.has(p.checkname)) p.gs = 1;
}

function wizMerge() {
  if (!wiz.parsed.length) return null;
  if (wiz.parsed.length === 1) {
    const g = wiz.parsed[0];
    const disc = g.complete === 'N' ? ['File is marked as incomplete (complete="N")'] : [];
    return { ...g, discrepancies: disc };
  }

  const [g1, g2] = wiz.parsed;
  const disc = [];

  // Compare period scores between the two files
  // Determine mapping: is g2 also from "home" perspective or "visitor" perspective?
  const g2FromVis = g2.homeName === g1.visitorName;
  const g2HomePrd = g2FromVis ? g2.visitor.periodScores : g2.home.periodScores;
  const g2VisPrd  = g2FromVis ? g2.home.periodScores    : g2.visitor.periodScores;

  g1.home.periodScores.forEach((s, i) => {
    if (g2HomePrd[i] !== undefined && s !== g2HomePrd[i])
      disc.push(`Q${i+1} home score: file 1 says ${s}, file 2 says ${g2HomePrd[i]}`);
  });
  g1.visitor.periodScores.forEach((s, i) => {
    if (g2VisPrd[i] !== undefined && s !== g2VisPrd[i])
      disc.push(`Q${i+1} visitor score: file 1 says ${s}, file 2 says ${g2VisPrd[i]}`);
  });

  // Merge: take players from whichever file has data for each side
  const homePl    = g1.home.hasPlayers    ? g1.home.players
                  : g2FromVis              ? g2.visitor.players
                  :                         g2.home.players;
  const visitorPl = g1.visitor.hasPlayers ? g1.visitor.players
                  : g2FromVis              ? g2.home.players
                  :                         g2.visitor.players;

  return {
    source: g1.source === g2.source ? g1.source : 'Mixed',
    filename: `${g1.filename} + ${g2.filename}`,
    rawXml: null,
    gameDate: g1.gameDate, dateStr: g1.dateStr,
    homeName: g1.homeName, visitorName: g1.visitorName,
    time: g1.time, location: g1.location,
    postseason: g1.postseason, leaguegame: g1.leaguegame,
    complete: (g1.complete === 'Y' || g2.complete === 'Y') ? 'Y' : 'N',
    numPeriods: g1.numPeriods,
    home:    { periodScores: g1.home.periodScores,    players: homePl,    hasPlayers: homePl.length > 0 },
    visitor: { periodScores: g1.visitor.periodScores, players: visitorPl, hasPlayers: visitorPl.length > 0 },
    plays: g1.plays.length >= g2.plays.length ? g1.plays : g2.plays,
    discrepancies: disc
  };
}

// ── Team matching ─────────────────────────────────────────────────────────────

function wizTeamSim(xmlName, dbName) {
  const tok = s => new Set((s || '').toLowerCase().replace(/[^a-z0-9 ]/g,'').split(' ').filter(Boolean));
  const a = tok(xmlName), b = tok(dbName);
  if (!a.size || !b.size) return 0;
  let hits = 0; for (const t of a) if (b.has(t)) hits++;
  return hits / Math.max(a.size, b.size);
}

function wizBestTeam(xmlName) {
  let best = null, bestScore = -1;
  for (const t of wiz.allTeams) {
    let s = wizTeamSim(xmlName, t.name);
    if (t.abbrev) s = Math.max(s, wizTeamSim(xmlName, t.abbrev) * 0.85);
    if (s > bestScore) { bestScore = s; best = t; }
  }
  return best && bestScore > 0.25 ? best : null;
}

// ── Player matching ───────────────────────────────────────────────────────────

function wizLev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({length: n+1}, (_, i) => i), cur = [];
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++)
      cur[j] = a[i-1] === b[j-1] ? prev[j-1] : 1 + Math.min(prev[j], cur[j-1], prev[j-1]);
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function wizPlayerSim(xmlCheck, dbFirst, dbLast) {
  const dbCheck = `${dbLast.toUpperCase()},${dbFirst.toUpperCase()}`;
  if (xmlCheck === dbCheck) return 1;
  if (xmlCheck.split(',')[0] === dbLast.toUpperCase()) return 0.8;
  const maxLen = Math.max(xmlCheck.length, dbCheck.length);
  return maxLen ? Math.max(0, 1 - wizLev(xmlCheck, dbCheck) / maxLen) : 0;
}

function wizCandidates(xmlCheck, dbPlayers) {
  return dbPlayers
    .map(p => ({ ...p, score: wizPlayerSim(xmlCheck, p.first_name, p.last_name) }))
    .filter(p => p.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ── Wizard render ─────────────────────────────────────────────────────────────

function wizTabBar() {
  return `<div style="display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid var(--border)">
    ${[['wizard','New Import'],['history','Upload History']].map(([t, lbl]) =>
      `<button onclick="wizTab('${t}')" style="padding:8px 20px;background:none;border:none;border-bottom:2px solid ${wiz.tab===t?'var(--accent)':'transparent'};color:${wiz.tab===t?'var(--accent)':'var(--text-muted)'};cursor:pointer;font-size:14px;font-weight:${wiz.tab===t?'600':'400'}">${lbl}</button>`
    ).join('')}
  </div>`;
}

function wizRender() {
  const body = document.getElementById('wiz-body');
  if (!body || !wiz) return;

  if (wiz.tab === 'history') {
    body.innerHTML = wizTabBar() + wizHistoryHtml();
    return;
  }

  const labels = ['Upload','Teams','Season','Players','Confirm'];
  const progress = labels.map((lbl, i) => {
    const n = i + 1;
    const done = n < wiz.step, active = n === wiz.step;
    const color = active ? 'var(--accent)' : done ? 'var(--text-muted)' : 'var(--border)';
    return `<span style="display:flex;align-items:center;gap:5px;color:${color}">
      <span style="width:20px;height:20px;border-radius:50%;border:2px solid currentColor;display:inline-flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">${done?'✓':n}</span>
      <span style="font-size:12px">${lbl}</span>
      ${i < labels.length-1 ? '<span style="color:var(--border);margin:0 2px">›</span>' : ''}
    </span>`;
  }).join('');

  const stepHtml = wiz.step===1 ? wizStep1Html() :
                   wiz.step===2 ? wizStep2Html() :
                   wiz.step===3 ? wizStep3Html() :
                   wiz.step===4 ? wizStep4Html() : wizStep5Html();

  body.innerHTML = `
    ${wizTabBar()}
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">${progress}</div>
    ${stepHtml}`;

  if (wiz.step === 1) {
    const inp = document.getElementById('wiz-file-in');
    if (inp) inp.addEventListener('change', async e => {
      for (const file of [...e.target.files]) {
        if (wiz.parsed.length >= 2) break;
        try { wiz.parsed.push(wizParseXml(await file.text(), file.name)); }
        catch (err) { alert(`Cannot parse ${file.name}: ${err.message}`); }
      }
      inp.value = '';
      wizRender();
    });
  }
}

async function wizTab(tab) {
  wiz.tab = tab;
  if (tab === 'history') {
    const body = document.getElementById('wiz-body');
    if (body) body.innerHTML = wizTabBar() + '<p style="color:var(--text-muted)">Loading…</p>';
    const data = await fetch('api/import/uploads').then(r => r.json()).catch(() => ({}));
    wiz.uploads = data.uploads || [];
  }
  wizRender();
}

function wizHistoryHtml() {
  if (!wiz.uploads.length) {
    return `<p style="color:var(--text-muted);padding:20px 0">No uploads yet.</p>`;
  }

  const statusBadge = s => {
    const map = {
      complete:    ['#1b3a1b','#4caf50'],
      discrepancy: ['#3a1a00','#ff9800'],
      partial:     ['#1a2a3a','#64b5f6'],
      pending:     ['#2a2a2a','#888']
    };
    const [bg, color] = map[s] || map.pending;
    return `<span style="background:${bg};color:${color};border:1px solid ${color};border-radius:4px;padding:2px 8px;font-size:11px;white-space:nowrap">${s}</span>`;
  };

  const vhLabel = v => ({ H: 'Home', V: 'Visitor', both: 'Both' }[v] || v);

  const rows = wiz.uploads.map(u => {
    const discHtml = u.discrepancies
      ? (() => {
          try {
            const items = JSON.parse(u.discrepancies);
            return Array.isArray(items)
              ? `<ul style="margin:6px 0 0;padding-left:16px;font-size:11px;color:#ff9800">${items.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul>`
              : `<div style="font-size:11px;color:#ff9800;margin-top:4px">${escapeHtml(u.discrepancies)}</div>`;
          } catch { return `<div style="font-size:11px;color:#ff9800;margin-top:4px">${escapeHtml(u.discrepancies)}</div>`; }
        })()
      : '';

    const gameLink = u.competition_id
      ? `<a href="#/boxscore?id=${u.competition_id}" style="color:var(--accent)">#${u.competition_id}</a>`
      : '<span style="color:var(--text-muted)">—</span>';

    const when = u.uploaded_at ? u.uploaded_at.replace('T',' ').substring(0,16) : '';

    return `<tr>
      <td style="white-space:nowrap;color:var(--text-muted);font-size:12px">${escapeHtml(when)}</td>
      <td style="white-space:nowrap;font-size:12px">
        ${u.uploaded_by_name ? `<div>${escapeHtml(u.uploaded_by_name)}</div>` : ''}
        <div style="color:var(--text-muted);font-size:11px">${escapeHtml(u.uploaded_by_username||'—')}</div>
      </td>
      <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(u.source)}</td>
      <td style="word-break:break-all;font-size:12px">${escapeHtml(u.original_filename)}</td>
      <td style="white-space:nowrap">${escapeHtml(u.visitor_name)} @ ${escapeHtml(u.home_name)}</td>
      <td style="white-space:nowrap">${escapeHtml(u.game_date||'')}</td>
      <td style="white-space:nowrap;font-size:12px;color:var(--text-muted)">${vhLabel(u.vh)}</td>
      <td>${statusBadge(u.status)}${discHtml}</td>
      <td>${gameLink}</td>
    </tr>`;
  }).join('');

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-secondary btn-sm" onclick="wizTab('history')">↻ Refresh</button>
    </div>
    <div class="table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Uploaded</th>
            <th>By</th>
            <th>Source</th>
            <th>File</th>
            <th>Game</th>
            <th>Date</th>
            <th>Side</th>
            <th>Status</th>
            <th>Game ID</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Step 1: Upload ────────────────────────────────────────────────────────────

function wizStep1Html() {
  const cards = wiz.parsed.map((g, i) => `
    <div style="border:1px solid var(--border);border-radius:6px;padding:12px 16px;margin-top:12px;display:flex;justify-content:space-between;align-items:start;gap:12px">
      <div>
        <div style="font-weight:600;color:var(--accent);word-break:break-all">${escapeHtml(g.filename)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${escapeHtml(g.source)} · ${escapeHtml(g.dateStr)}</div>
        <div style="margin-top:6px">${escapeHtml(g.visitorName)} @ ${escapeHtml(g.homeName)}</div>
        <div style="font-size:12px;margin-top:4px;color:${g.complete==='Y'?'#4caf50':'var(--text-muted)'}">
          ${g.complete==='Y'?'✓ Complete':'⚠ Incomplete'}
          · Home: ${g.home.players.length} players
          · Visitor: ${g.visitor.players.length} players
          · ${g.plays.length} plays
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="wizRemoveFile(${i})">✕</button>
    </div>`).join('');

  return `
    ${wiz.parsed.length < 2 ? `
    <div id="wiz-drop" style="border:2px dashed var(--border);border-radius:8px;padding:36px;text-align:center;cursor:pointer"
         onclick="document.getElementById('wiz-file-in').click()">
      <div style="font-size:28px;margin-bottom:8px">⬆</div>
      <div style="color:var(--text)">Click to select StatCrew XML file${wiz.parsed.length===1?' (2nd file, optional)':'(s)'}</div>
      <div style="color:var(--text-muted);font-size:13px;margin-top:6px">HoopStats or PrestoSports · Upload 2 files from the same game for dual-sided HoopStats import</div>
    </div>
    <input type="file" id="wiz-file-in" accept=".xml" multiple style="display:none">` : ''}
    ${cards}
    <div style="margin-top:24px;display:flex;justify-content:flex-end">
      <button class="btn btn-primary" ${wiz.parsed.length?'':'disabled'} onclick="wizGo(2)">Next: Map Teams →</button>
    </div>`;
}

function wizRemoveFile(i) { wiz.parsed.splice(i, 1); wizRender(); }

// ── Step 2: Teams ─────────────────────────────────────────────────────────────

function wizStep2Html() {
  const g = wiz.merged;
  if (!g) return '<p>No game data.</p>';

  if (wiz.homeTeamId === null) {
    const h = wizBestTeam(g.homeName), v = wizBestTeam(g.visitorName);
    wiz.homeTeamId    = h?.team_id    ?? '';
    wiz.visitorTeamId = v?.team_id    ?? '';
  }
  if (wiz.comptypeId === null)
    wiz.comptypeId = g.postseason==='Y' ? 4 : g.leaguegame==='Y' ? 3 : g.leaguegame==='N' ? 2 : '';
  if (!wiz.gameDate)     wiz.gameDate     = g.gameDate  || '';
  if (!wiz.gameTime)     wiz.gameTime     = g.time      || '';
  if (!wiz.gameLocation) wiz.gameLocation = g.location  || '';

  const mkOpts = selId => wiz.allTeams.map(t =>
    `<option value="${t.team_id}" ${t.team_id==selId?'selected':''}>${escapeHtml(t.name)}</option>`
  ).join('');

  return `
    ${g.complete==='N'?`<div style="background:#3a2000;border:1px solid #8b5000;border-radius:6px;padding:10px 14px;margin-bottom:16px;color:#ffb74d">
      ⚠ This file is marked incomplete — stats may be partial.</div>`:''}
    <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <label class="form-label">Home Team <span style="color:var(--text-muted);font-weight:400">(XML: "${escapeHtml(g.homeName)}")</span></label>
        <select class="form-control" onchange="wiz.homeTeamId=parseInt(this.value)||null">
          <option value="">— Select Team —</option>${mkOpts(wiz.homeTeamId)}
        </select>
      </div>
      <div>
        <label class="form-label">Visitor Team <span style="color:var(--text-muted);font-weight:400">(XML: "${escapeHtml(g.visitorName)}")</span></label>
        <select class="form-control" onchange="wiz.visitorTeamId=parseInt(this.value)||null">
          <option value="">— Select Team —</option>${mkOpts(wiz.visitorTeamId)}
        </select>
      </div>
    </div>
    <div class="form-grid" style="grid-template-columns:160px 1fr 1fr;gap:16px;margin-top:16px">
      <div>
        <label class="form-label">Game Date</label>
        <input class="form-control" type="date" value="${escapeHtml(wiz.gameDate||'')}" oninput="wiz.gameDate=this.value">
      </div>
      <div>
        <label class="form-label">Time <span style="font-weight:400;color:var(--text-muted)">(optional)</span></label>
        <input class="form-control" type="text" value="${escapeHtml(wiz.gameTime||'')}" placeholder="7:00 PM" oninput="wiz.gameTime=this.value">
      </div>
      <div>
        <label class="form-label">Location</label>
        <input class="form-control" type="text" value="${escapeHtml(wiz.gameLocation||'')}" placeholder="Gym name" oninput="wiz.gameLocation=this.value">
      </div>
    </div>
    <div style="margin-top:16px;max-width:220px">
      <label class="form-label">Game Type</label>
      <select class="form-control" onchange="wiz.comptypeId=parseInt(this.value)||null">
        <option value="">— Unknown —</option>
        <option value="1" ${wiz.comptypeId==1?'selected':''}>Pre-Season</option>
        <option value="2" ${wiz.comptypeId==2?'selected':''}>Non-Conference</option>
        <option value="3" ${wiz.comptypeId==3?'selected':''}>Conference</option>
        <option value="4" ${wiz.comptypeId==4?'selected':''}>Post-Season</option>
      </select>
    </div>
    <div id="wiz-dup-msg" style="margin-top:12px"></div>
    <div style="margin-top:24px;display:flex;justify-content:space-between">
      <button class="btn btn-secondary" onclick="wizGo(1)">← Back</button>
      <button class="btn btn-primary" onclick="wizStep2Adv()">Next: Season →</button>
    </div>`;
}

async function wizStep2Adv() {
  if (!wiz.homeTeamId || !wiz.visitorTeamId) return alert('Please select both teams.');
  if (wiz.homeTeamId === wiz.visitorTeamId) return alert('Home and visitor must be different teams.');
  if (!wiz.gameDate) return alert('Please enter the game date.');

  try {
    const data = await fetch(`api/import/check?team_id=${wiz.homeTeamId}&opponent_id=${wiz.visitorTeamId}&date=${wiz.gameDate}`)
      .then(r => r.json());
    if (data.existing) {
      wiz.existingCompId = data.existing.competition_id;
      const msg = document.getElementById('wiz-dup-msg');
      if (msg && data.existing.has_boxscores) {
        msg.innerHTML = `<div style="background:#1a3a00;border:1px solid #2e6000;border-radius:6px;padding:10px 14px;color:#a5d6a7">
          ℹ A game already exists (ID #${data.existing.competition_id}) for these teams on this date. Proceeding will add or update stats.
        </div>`;
      }
    } else {
      wiz.existingCompId = null;
    }
  } catch {}

  wizGo(3);
}

// ── Step 3: Season ────────────────────────────────────────────────────────────

function wizStep3Html() {
  const opts = wiz.allSeasons.map(s =>
    `<option value="${s.season_id}" ${s.season_id==wiz.seasonId?'selected':''}>
      ${escapeHtml(s.league_name)} — ${escapeHtml(s.name)} (${s.start_date} to ${s.end_date})
    </option>`
  ).join('');

  return `
    <p style="color:var(--text-muted);margin-bottom:16px">
      Select the season this game belongs to.
      ${wiz.gameDate ? `Showing seasons for these teams covering <strong>${escapeHtml(wiz.gameDate)}</strong>.` : 'Showing seasons for these teams.'}
      ${!wiz.allSeasons.length ? ' No matching seasons found — showing all recent seasons.' : ''}
    </p>
    <div style="max-width:520px">
      <label class="form-label">Season</label>
      <select class="form-control" onchange="wiz.seasonId=parseInt(this.value)||null">
        <option value="">— Select Season —</option>${opts}
      </select>
      <p style="margin-top:10px;font-size:13px;color:var(--text-muted)">
        Don't see the right season? <a href="#/seasons" style="color:var(--accent)">Create one</a> first, then come back.
      </p>
    </div>
    <div style="margin-top:24px;display:flex;justify-content:space-between">
      <button class="btn btn-secondary" onclick="wizGo(2)">← Back</button>
      <button class="btn btn-primary" onclick="wiz.seasonId ? wizGo(4) : alert('Please select a season.')">Next: Match Players →</button>
    </div>`;
}

// ── Step 4: Players ───────────────────────────────────────────────────────────

function wizStep4Html() {
  const g = wiz.merged;

  const sections = ['home','visitor'].map(side => {
    const teamName   = side === 'home' ? g.homeName : g.visitorName;
    const xmlPlayers = g[side].players;
    const dbPlayers  = side === 'home' ? wiz.homeDbPlayers : wiz.visitorDbPlayers;

    if (!xmlPlayers.length) return `
      <div style="margin-bottom:24px">
        <h3 style="font-size:15px;margin:0 0 8px">${escapeHtml(teamName)}</h3>
        <p style="color:var(--text-muted);font-style:italic">No individual player stats in this file for this team.</p>
      </div>`;

    const rows = xmlPlayers.map((p, idx) => {
      const key     = `${side}:${idx}`;
      const mapping = wiz.playerMap[key] || {};
      const status  = mapping.newPlayer
        ? `<span style="color:#4caf50">+ New</span>`
        : mapping.playerId
          ? `<span style="color:#4caf50">✓</span>`
          : `<span style="color:#f44336">⚠</span>`;

      const dbOpts = `<option value="">— Select —</option>` +
        dbPlayers.map(d =>
          `<option value="${d.player_id}" ${d.player_id==mapping.playerId?'selected':''}>` +
          `${escapeHtml(d.last_name)}, ${escapeHtml(d.first_name)}${d.jersey_number?` #${d.jersey_number}`:''}` +
          `</option>`
        ).join('');

      const parts = p.checkname.split(',');
      const sugLast  = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase() : '';
      const sugFirst = parts[1]?.trim() ? parts[1].trim()[0].toUpperCase() + parts[1].trim().slice(1).toLowerCase() : '';

      const inputRow = mapping.newPlayer ? `
        <div style="display:flex;gap:6px;margin-top:6px">
          <input class="form-control" style="flex:1;font-size:12px" placeholder="First" value="${escapeHtml(mapping.newPlayer.first_name||sugFirst)}"
            oninput="wizUpdNew('${side}',${idx},'first_name',this.value)">
          <input class="form-control" style="flex:1;font-size:12px" placeholder="Last" value="${escapeHtml(mapping.newPlayer.last_name||sugLast)}"
            oninput="wizUpdNew('${side}',${idx},'last_name',this.value)">
          <button class="btn btn-secondary btn-sm" onclick="wizCancelNew('${side}',${idx})">✕</button>
        </div>` : '';

      return `<tr>
        <td style="color:var(--text-muted);white-space:nowrap">#${escapeHtml(p.uni)}</td>
        <td style="white-space:nowrap;font-size:13px">${escapeHtml(p.checkname)}</td>
        <td>
          ${mapping.newPlayer ? '' : `<select class="form-control" style="font-size:12px" onchange="wizMapP('${side}',${idx},this.value)">${dbOpts}</select>`}
          ${inputRow}
          ${mapping.newPlayer ? '' : `<button class="btn btn-secondary btn-sm" style="margin-top:4px;font-size:11px;padding:2px 8px"
            onclick="wizSetNew('${side}',${idx},'${escapeHtml(sugFirst)}','${escapeHtml(sugLast)}')">+ Create new player</button>`}
        </td>
        <td>${status}</td>
      </tr>`;
    });

    const unmapped = xmlPlayers.filter((_, idx) => {
      const m = wiz.playerMap[`${side}:${idx}`] || {};
      return !m.playerId && !m.newPlayer;
    }).length;

    return `<div style="margin-bottom:28px">
      <h3 style="font-size:15px;margin:0 0 8px">${escapeHtml(teamName)}</h3>
      ${unmapped ? `<p style="color:#f44336;font-size:13px;margin:0 0 8px">${unmapped} player(s) still need to be matched.</p>` : ''}
      <div class="table-wrap" style="max-height:380px;overflow-y:auto">
        <table class="stats-table">
          <thead><tr><th>#</th><th>XML Name</th><th style="min-width:220px">Database Match</th><th>Status</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  const allMapped = ['home','visitor'].every(side =>
    wiz.merged[side].players.every((_, idx) => {
      const m = wiz.playerMap[`${side}:${idx}`] || {};
      return m.playerId || m.newPlayer;
    })
  );

  return `
    ${sections}
    <div style="display:flex;justify-content:space-between">
      <button class="btn btn-secondary" onclick="wizGo(3)">← Back</button>
      <button class="btn btn-primary" ${allMapped?'':'disabled'} onclick="wizGo(5)">Next: Preview →</button>
    </div>`;
}

function wizMapP(side, idx, val) {
  wiz.playerMap[`${side}:${idx}`] = { playerId: parseInt(val)||null, newPlayer: null };
  wizRender();
}
function wizSetNew(side, idx, first, last) {
  wiz.playerMap[`${side}:${idx}`] = { playerId: null, newPlayer: { first_name: first, last_name: last } };
  wizRender();
}
function wizCancelNew(side, idx) {
  wiz.playerMap[`${side}:${idx}`] = { playerId: null, newPlayer: null };
  wizRender();
}
function wizUpdNew(side, idx, field, val) {
  const m = wiz.playerMap[`${side}:${idx}`];
  if (m?.newPlayer) m.newPlayer[field] = val;
}

// ── Step 5: Preview & Confirm ─────────────────────────────────────────────────

function wizStep5Html() {
  const g = wiz.merged;
  const homeTotal = g.home.periodScores.reduce((a,b)=>a+b,0);
  const visTotal  = g.visitor.periodScores.reduce((a,b)=>a+b,0);
  const qHdrs = g.home.periodScores.map((_,i)=>`<th>Q${i+1}</th>`).join('');

  function bsRows(side) {
    const db = side==='home' ? wiz.homeDbPlayers : wiz.visitorDbPlayers;
    const rows = g[side].players.map((p, idx) => {
      const m = wiz.playerMap[`${side}:${idx}`] || {};
      let name = m.newPlayer ? `${m.newPlayer.first_name} ${m.newPlayer.last_name} (new)`
               : m.playerId  ? (() => { const d=db.find(x=>x.player_id==m.playerId); return d?`${d.first_name} ${d.last_name}`:`Player #${m.playerId}`; })()
               : '???';
      return `<tr>
        <td style="color:var(--text-muted)">#${escapeHtml(p.uni)}</td>
        <td>${escapeHtml(name)}</td>
        <td>${Math.round(p.min/60)}</td>
        <td>${p.tp}</td><td>${p.fgm}/${p.fga}</td><td>${p.fgm3}/${p.fga3}</td>
        <td>${p.ftm}/${p.fta}</td><td>${p.reb}</td><td>${p.ast}</td><td>${p.pf}</td>
      </tr>`;
    });
    return rows.join('') || `<tr><td colspan="10" style="color:var(--text-muted)">No player stats</td></tr>`;
  }

  const discHtml = g.discrepancies?.length ? `
    <div style="background:#3a0000;border:1px solid #7c0000;border-radius:6px;padding:12px;margin-bottom:20px;color:#ff6b6b">
      <strong>⚠ Discrepancies — review before confirming:</strong>
      <ul style="margin:8px 0 0;padding-left:20px">${g.discrepancies.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul>
    </div>` : '';

  const seasonLabel = wiz.allSeasons.find(s=>s.season_id==wiz.seasonId)?.name || '';

  return `
    <div style="margin-bottom:20px">
      <div style="font-size:18px;font-weight:600;color:var(--accent)">${escapeHtml(g.visitorName)} @ ${escapeHtml(g.homeName)}</div>
      <div style="color:var(--text-muted);margin-top:4px">${escapeHtml(wiz.gameDate||'')} · ${escapeHtml(wiz.gameLocation||g.location||'')} · ${escapeHtml(seasonLabel)}</div>
      <table style="border-collapse:collapse;margin-top:12px;font-size:14px">
        <thead><tr><th style="text-align:left;padding:3px 16px 3px 0;color:var(--text-muted)">Team</th>${qHdrs}<th style="padding:3px 8px;color:var(--text-muted)">Final</th></tr></thead>
        <tbody>
          <tr>
            <td style="padding:3px 16px 3px 0">${escapeHtml(g.homeName)}</td>
            ${g.home.periodScores.map(s=>`<td style="padding:3px 8px">${s}</td>`).join('')}
            <td style="padding:3px 8px;font-weight:600">${homeTotal}</td>
          </tr>
          <tr>
            <td style="padding:3px 16px 3px 0">${escapeHtml(g.visitorName)}</td>
            ${g.visitor.periodScores.map(s=>`<td style="padding:3px 8px">${s}</td>`).join('')}
            <td style="padding:3px 8px;font-weight:600">${visTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${discHtml}
    ${['home','visitor'].map(side=>`
      <div style="margin-bottom:20px">
        <div style="font-weight:600;margin-bottom:8px">${escapeHtml(side==='home'?g.homeName:g.visitorName)}</div>
        <div class="table-wrap"><table class="stats-table" style="font-size:12px">
          <thead><tr><th>#</th><th>Player</th><th>Min</th><th>PTS</th><th>FG</th><th>3PT</th><th>FT</th><th>Reb</th><th>Ast</th><th>PF</th></tr></thead>
          <tbody>${bsRows(side)}</tbody>
        </table></div>
      </div>`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px">
      <button class="btn btn-secondary" onclick="wizGo(4)">← Back</button>
      <div style="display:flex;align-items:center;gap:12px">
        <span id="wiz-status" style="color:var(--text-muted);font-size:13px"></span>
        <button class="btn btn-primary" id="wiz-confirm-btn" onclick="wizCommit()">Confirm Import</button>
      </div>
    </div>`;
}

// ── Navigation ────────────────────────────────────────────────────────────────

async function wizGo(n) {
  if (n === 2 && wiz.step < 2) {
    wiz.merged = wizMerge();
  }
  if (n === 3) {
    const date = wiz.gameDate || wiz.merged?.gameDate;
    const params = new URLSearchParams();
    if (date)              params.set('date', date);
    if (wiz.homeTeamId)    params.set('home_team_id', wiz.homeTeamId);
    if (wiz.visitorTeamId) params.set('visitor_team_id', wiz.visitorTeamId);
    const data = await fetch(`api/import/seasons?${params}`).then(r=>r.json()).catch(()=>({}));
    wiz.allSeasons = data.seasons || [];
    if (!wiz.seasonId && wiz.allSeasons.length === 1) wiz.seasonId = wiz.allSeasons[0].season_id;
  }
  if (n === 4) {
    const [hr, vr] = await Promise.all([
      fetch(`api/import/players?team_id=${wiz.homeTeamId}&season_id=${wiz.seasonId}`).then(r=>r.json()).catch(()=>({})),
      fetch(`api/import/players?team_id=${wiz.visitorTeamId}&season_id=${wiz.seasonId}`).then(r=>r.json()).catch(()=>({}))
    ]);
    wiz.homeDbPlayers    = hr.players || [];
    wiz.visitorDbPlayers = vr.players || [];
    // Auto-map exact matches on first entry
    for (const side of ['home','visitor']) {
      const db = side==='home' ? wiz.homeDbPlayers : wiz.visitorDbPlayers;
      wiz.merged[side].players.forEach((p, idx) => {
        const key = `${side}:${idx}`;
        if (!wiz.playerMap[key]) {
          const cands = wizCandidates(p.checkname, db);
          wiz.playerMap[key] = { playerId: cands[0]?.score===1 ? cands[0].player_id : null, newPlayer: null };
        }
      });
    }
  }
  wiz.step = n;
  wizRender();
}

// ── Commit ────────────────────────────────────────────────────────────────────

async function wizCommit() {
  const btn    = document.getElementById('wiz-confirm-btn');
  const status = document.getElementById('wiz-status');
  if (btn) btn.disabled = true;

  try {
    // Archive XML files
    if (status) status.textContent = 'Archiving…';
    const uploadIds = [];
    for (const parsed of wiz.parsed) {
      const vh = wiz.parsed.length===1 ? 'both' : parsed.home.hasPlayers ? 'H' : 'V';
      try {
        const r = await fetch('api/import/archive', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            filename: parsed.filename, xml: parsed.rawXml,
            homeName: wiz.merged.homeName, visitorName: wiz.merged.visitorName,
            gameDate: wiz.gameDate || wiz.merged.gameDate,
            source: parsed.source, vh
          })
        }).then(r=>r.json());
        if (r.upload_id) uploadIds.push(r.upload_id);
      } catch {}
    }

    // Build boxscores
    const g = wiz.merged;
    const boxscores = [];
    for (const side of ['home','visitor']) {
      g[side].players.forEach((p, idx) => {
        const m = wiz.playerMap[`${side}:${idx}`] || {};
        boxscores.push({
          side, playerId: m.playerId||null, newPlayer: m.newPlayer||null,
          jersey_number: parseInt(p.uni)||0, started: p.gs||0,
          min: p.min, tp: p.tp, fgm: p.fgm, fga: p.fga,
          fgm3: p.fgm3, fga3: p.fga3, ftm: p.ftm, fta: p.fta,
          oreb: p.oreb, dreb: p.dreb, reb: p.reb,
          ast: p.ast, stl: p.stl, blk: p.blk,
          to: p.to, pf: p.pf, tf: p.tf, dq: p.dq||0
        });
      });
    }

    // Build plays with resolved IDs
    const checkLookup = {};
    for (const side of ['home','visitor'])
      g[side].players.forEach((p, idx) => { checkLookup[p.checkname] = { side, idx }; });

    const plays = g.plays.map(play => {
      const teamId = play.vh==='H' ? wiz.homeTeamId : play.vh==='V' ? wiz.visitorTeamId : null;
      let playerId = null;
      if (play.checkname) {
        const lu = checkLookup[play.checkname];
        if (lu) playerId = wiz.playerMap[`${lu.side}:${lu.idx}`]?.playerId || null;
      }
      return { ...play, teamId, playerId };
    });

    // Commit
    if (status) status.textContent = 'Importing…';
    const startTime = `${wiz.gameDate||g.gameDate} ${wizParseTime(wiz.gameTime||g.time)}`;
    const resp = await fetch('api/import/commit', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        uploadIds, existingCompetitionId: wiz.existingCompId||null,
        game: {
          homeTeamId:    parseInt(wiz.homeTeamId),
          visitorTeamId: parseInt(wiz.visitorTeamId),
          seasonId:      parseInt(wiz.seasonId),
          startTime, location: wiz.gameLocation||g.location||null,
          comptypeId: wiz.comptypeId||null
        },
        periods: { home: g.home.periodScores, visitor: g.visitor.periodScores },
        boxscores, plays, discrepancies: g.discrepancies||[]
      })
    }).then(r=>r.json());

    if (resp.error) throw new Error(resp.error);

    // Show success
    const body = document.getElementById('wiz-body');
    if (body) {
      const discHtml = resp.discrepancies?.length ? `
        <div style="margin-top:16px;color:#ffc107"><strong>⚠ Discrepancies on record:</strong>
          <ul>${resp.discrepancies.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul></div>` : '';
      body.innerHTML = `
        <div style="text-align:center;padding:48px 0">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <div style="font-size:20px;font-weight:600;color:var(--accent)">Import complete</div>
          <div style="color:var(--text-muted);margin-top:8px">Game #${resp.competition_id} added to the database.</div>
          ${discHtml}
          <div style="margin-top:28px;display:flex;gap:12px;justify-content:center">
            <a href="#/boxscore?id=${resp.competition_id}" class="btn btn-primary">View Boxscore</a>
            <button class="btn btn-secondary" onclick="pages.import.init()">Import Another</button>
          </div>
        </div>`;
    }
  } catch (err) {
    if (btn) btn.disabled = false;
    if (status) status.textContent = '';
    alert('Import failed: ' + err.message);
  }
}

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

const CHEVRON_ICON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

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
    lg.website_url   ? [lg.website_url,                                    GLOBE_ICON, 'Website']        : null,
    lg.contact_email ? [`mailto:${lg.contact_email}`,                      MAIL_ICON,  lg.contact_email] : null,
    lg.facebook      ? [`https://www.facebook.com/${strip(lg.facebook)}`,  FB_ICON,    'Facebook']       : null,
    lg.x_handle      ? [`https://x.com/${strip(lg.x_handle)}`,             X_ICON,     'X (Twitter)']    : null,
    lg.instagram     ? [`https://www.instagram.com/${strip(lg.instagram)}`, IG_ICON,   'Instagram']      : null,
  ].filter(Boolean);
  if (!items.length) return '<span style="color:var(--text-muted)">—</span>';
  return items.map(([url, icon, title]) =>
    `<a class="link-icon" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)}">${icon}</a>`
  ).join('');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sm-theme', theme);
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.content = theme === 'light' ? '#0969da' : '#e5a00d';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMin(sec) {
  const s = Number(sec) || 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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
        const res  = await fetch(_league ? `api/leagues/${_league.league_id}` : 'api/leagues', {
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
      `<option value="${l.league_id}"${String(l.league_id) === String(leagueId) ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
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
                <label for="sm-start-date">Start Date <span style="color:var(--accent)">*</span></label>
                <input type="date" id="sm-start-date">
              </div>
              <div class="form-group">
                <label for="sm-end-date">End Date <span style="color:var(--accent)">*</span></label>
                <input type="date" id="sm-end-date">
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
      setValue('sm-start-date', season.start_date ? String(season.start_date).slice(0, 10) : '');
      setValue('sm-end-date',   season.end_date   ? String(season.end_date).slice(0, 10)   : '');
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
        start_date: document.getElementById('sm-start-date').value,
        end_date:   document.getElementById('sm-end-date').value,
      };
      if (!body.league_id || !body.name || !body.start_date || !body.end_date) {
        showStatus('sm-status', 'error', 'All fields are required.');
        return;
      }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const res  = await fetch(_season ? `api/seasons/${_season.season_id}` : 'api/seasons', {
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
        const res  = await fetch(_team ? `api/teams/${_team.team_id}` : 'api/teams', {
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
      `<option value="${l.league_id}">${escapeHtml(l.name)}</option>`
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
                  ${seasons.map(s => `<option value="${s.season_id}">${escapeHtml(s.name)} (${escapeHtml(s.league_name)})</option>`).join('')}
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
          .map(s => `<option value="${s.season_id}">${escapeHtml(s.name)} (${escapeHtml(s.league_name)})</option>`)
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
        const res  = await fetch(`api/teams/${_team.team_id}/seasons`, {
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

const TeamSeasonInfoModal = (() => {
  let _overlay = null;

  const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  function _close() {
    document.removeEventListener('keydown', _onKey);
    if (_overlay) { _overlay.remove(); _overlay = null; }
  }

  function open(team, season, onUpdated) {
    _close();

    const thumbSrc = season.logo_path ? `${season.logo_path}?t=${Date.now()}` : null;
    const thumbHtml = thumbSrc
      ? `<img id="tsi-thumb" src="${thumbSrc}" style="width:80px;height:80px;object-fit:contain;border-radius:6px;border:1px solid var(--border);background:var(--surface2)" alt="">`
      : `<div id="tsi-thumb" style="width:80px;height:80px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="tsi-modal">
        <div class="modal" role="dialog" aria-modal="true" style="max-width:480px">
          <div class="modal-header">
            <span class="modal-title">Edit Season Info</span>
            <button class="modal-close" id="tsi-x" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <div style="margin-bottom:10px;color:var(--text-muted);font-size:.85em">
            ${escapeHtml(season.season_name)} &mdash; ${escapeHtml(season.label)}
          </div>

          <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">
            ${thumbHtml}
            <div style="display:flex;flex-direction:column;gap:6px;padding-top:4px">
              <input type="file" id="tsi-file" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none">
              <button type="button" class="btn btn-secondary btn-sm" id="tsi-upload-btn">Upload Logo</button>
              <button type="button" class="btn btn-secondary btn-sm" id="tsi-remove-btn" ${season.logo_path ? '' : 'style="display:none"'}>Remove Logo</button>
              <span id="tsi-logo-status" style="font-size:.8em"></span>
            </div>
          </div>

          <div class="form-group">
            <label>Display Name <span style="color:var(--text-muted);font-weight:400;font-size:.85em">(overrides team name this season)</span></label>
            <input type="text" id="tsi-display-name" value="${escapeHtml(season.display_name || '')}" placeholder="${escapeHtml(team.name)}" autocomplete="off" spellcheck="false">
          </div>
          <div class="form-group">
            <label>Nickname <span style="color:var(--text-muted);font-weight:400;font-size:.85em">(overrides team nickname)</span></label>
            <input type="text" id="tsi-nickname" value="${escapeHtml(season.nickname || '')}" placeholder="${escapeHtml(team.nickname || '')}" autocomplete="off" spellcheck="false">
          </div>
          <div class="form-group">
            <label>Title Sponsor</label>
            <input type="text" id="tsi-sponsor" value="${escapeHtml(season.sponsor || '')}" placeholder="e.g. Scotiabank" autocomplete="off" spellcheck="false">
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" id="tsi-save">Save</button>
            <button class="btn btn-secondary" id="tsi-cancel">Cancel</button>
          </div>
          <div class="status-msg" id="tsi-status"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);
    _overlay = document.getElementById('tsi-modal');

    let currentLogoPath = season.logo_path;

    const _openedAt = Date.now();
    _overlay.addEventListener('click', e => {
      if (Date.now() - _openedAt < 400) return;
      if (e.target === _overlay) _close();
    });
    document.getElementById('tsi-x').addEventListener('click', _close);
    document.getElementById('tsi-cancel').addEventListener('click', _close);
    document.addEventListener('keydown', _onKey);

    document.getElementById('tsi-upload-btn').addEventListener('click', () => {
      document.getElementById('tsi-file').click();
    });

    document.getElementById('tsi-file').addEventListener('change', async () => {
      const file = document.getElementById('tsi-file').files[0];
      if (!file) return;
      const statusEl   = document.getElementById('tsi-logo-status');
      const uploadBtn  = document.getElementById('tsi-upload-btn');
      const removeBtn  = document.getElementById('tsi-remove-btn');
      if (file.size > 1_048_576) {
        statusEl.textContent = 'Too large (max 1 MB)'; statusEl.style.color = '#e53935';
        document.getElementById('tsi-file').value = ''; return;
      }
      uploadBtn.disabled = true; uploadBtn.textContent = 'Uploading…';
      statusEl.textContent = ''; statusEl.style.color = '';
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res    = await fetch(`api/teams/${team.team_id}/seasons/${season.season_id}/photo`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: dataUrl }),
        });
        const result = await res.json();
        if (result.success) {
          currentLogoPath = result.logo_path;
          const thumb = document.getElementById('tsi-thumb');
          if (thumb.tagName === 'IMG') {
            thumb.src = `${currentLogoPath}?t=${Date.now()}`;
          } else {
            const img = document.createElement('img');
            img.id = 'tsi-thumb';
            img.style.cssText = 'width:80px;height:80px;object-fit:contain;border-radius:6px;border:1px solid var(--border);background:var(--surface2)';
            img.alt = '';
            img.src = `${currentLogoPath}?t=${Date.now()}`;
            thumb.replaceWith(img);
          }
          removeBtn.style.display = '';
          statusEl.textContent = 'Uploaded.'; statusEl.style.color = 'var(--accent)';
        } else {
          statusEl.textContent = result.error || 'Upload failed'; statusEl.style.color = '#e53935';
        }
      } catch {
        statusEl.textContent = 'Upload failed'; statusEl.style.color = '#e53935';
      } finally {
        uploadBtn.disabled = false; uploadBtn.textContent = 'Upload Logo';
        document.getElementById('tsi-file').value = '';
      }
    });

    document.getElementById('tsi-remove-btn').addEventListener('click', async () => {
      const statusEl  = document.getElementById('tsi-logo-status');
      const removeBtn = document.getElementById('tsi-remove-btn');
      removeBtn.disabled = true;
      try {
        const res    = await fetch(`api/teams/${team.team_id}/seasons/${season.season_id}/photo`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          currentLogoPath = null;
          const noThumb = document.createElement('div');
          noThumb.id = 'tsi-thumb';
          noThumb.style.cssText = 'width:80px;height:80px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center';
          noThumb.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
          document.getElementById('tsi-thumb').replaceWith(noThumb);
          removeBtn.style.display = 'none';
          statusEl.textContent = 'Logo removed.'; statusEl.style.color = 'var(--accent)';
        } else {
          statusEl.textContent = result.error || 'Remove failed'; statusEl.style.color = '#e53935';
          removeBtn.disabled = false;
        }
      } catch {
        statusEl.textContent = 'Request failed'; statusEl.style.color = '#e53935';
        removeBtn.disabled = false;
      }
    });

    document.getElementById('tsi-save').addEventListener('click', async () => {
      const btn      = document.getElementById('tsi-save');
      const statusEl = document.getElementById('tsi-status');
      btn.disabled = true; btn.textContent = 'Saving…';
      statusEl.textContent = ''; statusEl.style.color = '';
      try {
        const body = {
          display_name: document.getElementById('tsi-display-name').value.trim() || null,
          nickname:     document.getElementById('tsi-nickname').value.trim() || null,
          sponsor:      document.getElementById('tsi-sponsor').value.trim() || null,
        };
        const res    = await fetch(`api/teams/${team.team_id}/seasons/${season.season_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const result = await res.json();
        if (result.success) {
          const updated = { ...body, logo_path: currentLogoPath };
          if (onUpdated) onUpdated(updated);
          _close();
        } else {
          statusEl.textContent = result.error || 'Save failed'; statusEl.style.color = '#e53935';
          btn.disabled = false; btn.textContent = 'Save';
        }
      } catch {
        statusEl.textContent = 'Request failed'; statusEl.style.color = '#e53935';
        btn.disabled = false; btn.textContent = 'Save';
      }
    });
  }

  return { open };
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

// ── Auth screens ─────────────────────────────────────────────────────────────
function showAuthScreen(mode) {
  const isSetup = mode === 'setup';
  document.getElementById('sidebar').style.display = 'none';
  const main = document.getElementById('main');
  main.style.cssText = 'margin-left:0;display:flex;align-items:center;justify-content:center;min-height:calc(100vh - var(--header-h))';
  main.innerHTML = `
    <div style="width:100%;max-width:360px">
      <div class="card">
        <div class="section-title">${isSetup ? 'Create Admin Account' : 'Sign In'}</div>
        ${isSetup ? '<p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">No users exist yet. Create the first account to get started.</p>' : ''}
        <div class="form-group">
          <label for="auth-user">Username</label>
          <input id="auth-user" type="text" autocomplete="username" autocapitalize="none" spellcheck="false">
        </div>
        <div class="form-group">
          <label for="auth-pass">Password</label>
          <input id="auth-pass" type="password" autocomplete="${isSetup ? 'new-password' : 'current-password'}">
        </div>
        <div style="margin-top:16px">
          <button class="btn btn-primary" id="auth-submit" style="width:100%">
            ${isSetup ? 'Create Account' : 'Sign In'}
          </button>
        </div>
        <div class="status-msg" id="auth-status"></div>
      </div>
    </div>`;

  const userEl   = document.getElementById('auth-user');
  const passEl   = document.getElementById('auth-pass');
  const submitEl = document.getElementById('auth-submit');

  async function submit() {
    const username = userEl.value.trim();
    const password = passEl.value;
    if (!username || !password) { showStatus('auth-status', 'error', 'Username and password required'); return; }
    submitEl.disabled = true;
    submitEl.textContent = isSetup ? 'Creating…' : 'Signing in…';
    try {
      const res  = await fetch(isSetup ? 'api/auth/setup' : 'api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.error) {
        showStatus('auth-status', 'error', data.error);
        submitEl.disabled = false;
        submitEl.textContent = isSetup ? 'Create Account' : 'Sign In';
        return;
      }
      currentUser = { user_id: data.user_id, username: data.username, default_team_id: data.default_team_id || null, default_season_id: data.default_season_id || null };
      document.getElementById('sidebar').style.display = '';
      main.style.cssText = '';
      bootApp();
    } catch {
      showStatus('auth-status', 'error', 'Request failed');
      submitEl.disabled = false;
      submitEl.textContent = isSetup ? 'Create Account' : 'Sign In';
    }
  }

  submitEl.addEventListener('click', submit);
  passEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  userEl.addEventListener('keydown', e => { if (e.key === 'Enter') passEl.focus(); });
  userEl.focus();
}

function renderHeaderUser() {
  const el = document.getElementById('header-user');
  if (!el) return;
  if (!currentUser) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="position:relative" id="user-menu-wrap">
      <button id="user-menu-btn" title="${escapeHtml(currentUser.username)}"
        style="background:none;border:none;cursor:pointer;padding:4px;border-radius:50%;color:var(--text);display:flex;align-items:center;justify-content:center;width:34px;height:34px;transition:background .15s">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      </button>
      <div id="user-menu-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:var(--surface);border:1px solid var(--border);border-radius:8px;min-width:168px;box-shadow:0 4px 20px rgba(0,0,0,.5);z-index:1000;overflow:hidden">
        <div style="padding:8px 14px 7px;border-bottom:1px solid var(--border);font-size:.75rem;color:var(--text-muted)">${escapeHtml(currentUser.username)}</div>
        <button id="user-menu-profile" style="width:100%;background:none;border:none;cursor:pointer;padding:10px 14px;text-align:left;font-size:.9rem;color:var(--text);display:flex;align-items:center;gap:10px;transition:background .1s">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Edit Profile
        </button>
        <button id="user-menu-logout" style="width:100%;background:none;border:none;cursor:pointer;padding:10px 14px;text-align:left;font-size:.9rem;color:var(--text);display:flex;align-items:center;gap:10px;transition:background .1s">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log out
        </button>
      </div>
    </div>`;

  const menuBtn  = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-menu-dropdown');

  menuBtn.addEventListener('mouseenter', () => menuBtn.style.background = 'var(--surface2)');
  menuBtn.addEventListener('mouseleave', () => menuBtn.style.background = 'none');
  ['user-menu-profile','user-menu-logout'].forEach(id => {
    const b = document.getElementById(id);
    b.addEventListener('mouseenter', () => b.style.background = 'var(--surface2)');
    b.addEventListener('mouseleave', () => b.style.background = 'none');
  });

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.style.display !== 'none';
    dropdown.style.display = isOpen ? 'none' : 'block';
  });

  document.getElementById('user-menu-profile').addEventListener('click', () => {
    dropdown.style.display = 'none';
    window.location.hash = '#/user-profile';
  });

  document.getElementById('user-menu-logout').addEventListener('click', async () => {
    await fetch('api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.reload();
  });

  document.addEventListener('click', function closeOnOutside(e) {
    if (!document.getElementById('user-menu-wrap')?.contains(e.target)) {
      dropdown.style.display = 'none';
      document.removeEventListener('click', closeOnOutside);
    }
  });
}

function showAddUserModal(onDone) {
  const CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal-overlay" id="adduser-modal">
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <span class="modal-title">Add User</span>
          <button class="modal-close" id="adduser-x" aria-label="Close">${CLOSE}</button>
        </div>
        <div class="form-group">
          <label for="adduser-name">Username</label>
          <input id="adduser-name" type="text" autocomplete="off" autocapitalize="none" spellcheck="false">
        </div>
        <div class="form-group">
          <label for="adduser-type">User Type</label>
          <select id="adduser-type">
            <option value="administrator">Administrator</option>
            <option value="team_manager">Team Manager</option>
          </select>
        </div>
        <div class="form-group">
          <label for="adduser-email">Email</label>
          <input id="adduser-email" type="email" autocomplete="off">
        </div>
        <div class="form-group">
          <label for="adduser-pass">Password</label>
          <input id="adduser-pass" type="password" autocomplete="new-password">
        </div>
        <div style="margin-bottom:12px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9em;color:var(--text)">
            <input type="checkbox" id="adduser-notify" disabled style="width:auto;padding:0;border:none;background:none;cursor:pointer">
            <span id="adduser-notify-label">Notify via email</span>
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="adduser-save">Add User</button>
          <button class="btn btn-secondary" id="adduser-cancel">Cancel</button>
        </div>
        <div class="status-msg" id="adduser-status"></div>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);
  const overlay = document.getElementById('adduser-modal');
  const close   = () => overlay.remove();
  document.getElementById('adduser-x').addEventListener('click', close);
  document.getElementById('adduser-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  const emailInput   = document.getElementById('adduser-email');
  const notifyCheck  = document.getElementById('adduser-notify');
  const notifyLabel  = document.getElementById('adduser-notify-label');

  // Check if SMTP is configured to decide if notify can be enabled
  fetch('api/settings/email').then(r => r.json()).then(em => {
    if (!em.host || !em.user) {
      notifyLabel.style.color = 'var(--text-muted)';
      notifyLabel.title = 'Email (SMTP) is not configured in Settings';
    }
  }).catch(() => {});

  emailInput.addEventListener('input', () => {
    fetch('api/settings/email').then(r => r.json()).then(em => {
      notifyCheck.disabled = !emailInput.value.trim() || !em.host || !em.user;
      if (notifyCheck.disabled) notifyCheck.checked = false;
    }).catch(() => { notifyCheck.disabled = true; });
  });

  document.getElementById('adduser-save').addEventListener('click', async () => {
    const username  = document.getElementById('adduser-name').value.trim();
    const user_type = document.getElementById('adduser-type').value;
    const email     = document.getElementById('adduser-email').value.trim();
    const password  = document.getElementById('adduser-pass').value;
    const notify    = document.getElementById('adduser-notify').checked;
    if (!username || !password) { showStatus('adduser-status', 'error', 'Username and password required'); return; }
    const btn = document.getElementById('adduser-save');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const res  = await fetch('api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, user_type, email, notify })
      });
      const data = await res.json();
      if (data.success) { close(); onDone?.(); }
      else { showStatus('adduser-status', 'error', data.error || 'Failed'); btn.disabled = false; btn.textContent = 'Add User'; }
    } catch {
      showStatus('adduser-status', 'error', 'Request failed');
      btn.disabled = false; btn.textContent = 'Add User';
    }
  });
  document.getElementById('adduser-name').focus();
}

function bootApp() {
  renderHeaderUser();
  initSidebar();
  renderPage();
}

// ── Router ────────────────────────────────────────────────────────────────────
function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '') || 'team-profile';
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
  const page = pages[route] || pages['team-profile'];
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
      <a href="#/${item.route}" title="${item.label}">
        <span class="menu-icon">${item.icon}</span>
        <span class="menu-label">${item.label}</span>
      </a>
    </li>`;
  const BOTTOM = ['settings', 'users'];
  const main   = MENU_ITEMS.filter(i => !BOTTOM.includes(i.route));
  const bottom = MENU_ITEMS.filter(i => BOTTOM.includes(i.route));
  document.getElementById('menu').innerHTML =
    main.map(renderItem).join('') +
    (bottom.length ? `<li class="menu-divider"></li>` + bottom.map(renderItem).join('') : '');
}

function initSidebar() {
  const hamburger     = document.getElementById('hamburger');
  const sidebar       = document.getElementById('sidebar');
  const overlay       = document.getElementById('overlay');
  const sidebarToggle = document.getElementById('sidebar-toggle');

  const ICON_COLLAPSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><path d="m16 15-3-3 3-3"/></svg>`;
  const ICON_EXPAND   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><path d="m14 9 3 3-3 3"/></svg>`;

  let collapsed = localStorage.getItem('sm-sidebar-collapsed') === '1';

  function applySidebarState() {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    sidebarToggle.innerHTML = collapsed ? ICON_EXPAND      : ICON_COLLAPSE;
    sidebarToggle.title     = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  }

  applySidebarState();

  sidebarToggle.addEventListener('click', () => {
    collapsed = !collapsed;
    localStorage.setItem('sm-sidebar-collapsed', collapsed ? '1' : '0');
    applySidebarState();
  });

  // Mobile drawer
  const closeMobile = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  };

  hamburger.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', open);
  });

  overlay.addEventListener('click', closeMobile);
  document.getElementById('menu').addEventListener('click', e => {
    if (e.target.closest('a')) closeMobile();
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', renderPage);

document.addEventListener('DOMContentLoaded', async () => {
  fetch('api/version').then(r => r.json()).then(d => {
    if (d.version) document.getElementById('app-version').textContent = `v${d.version}`;
  }).catch(() => {});

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  try {
    const res  = await fetch('api/auth/me');
    const data = res.ok ? await res.json() : null;
    if (data?.status === 'no_db') { bootApp(); return; }
    if (data?.status === 'setup') { showAuthScreen('setup'); return; }
    if (res.ok && data?.user_id) { currentUser = data; bootApp(); return; }
  } catch {}
  showAuthScreen('login');
});
