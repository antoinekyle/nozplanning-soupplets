// =============================================
//  NOZ P854 — Application Planning
//  app.js — logique principale
// =============================================

/* ——— PLANNING OVERRIDES (Firebase sync) ——— */
function getOverrides() {
  try { return JSON.parse(localStorage.getItem('noz_planning_overrides') || '[]'); }
  catch { return []; }
}

function getEffectiveShift(prenom, jourIdx, originalShift) {
  const overrides = getOverrides();
  const ov = overrides.find(o => o.prenom === prenom && o.jourIdx === jourIdx);
  return ov ? { j: originalShift.j, deb: ov.deb, fin: ov.fin, task: ov.task } : originalShift;
}

// Recharge tout le planning quand Firebase notifie un changement
function onRemoteChange() {
  // Reconstruire toutes les pages employés
  STAFF.forEach((s, i) => {
    const page = document.getElementById('page-p' + i);
    if (!page) return;
    const wasActive = page.classList.contains('active');
    page.remove();
    buildPersonPage(s, i);
    if (wasActive) document.getElementById('page-p' + i)?.classList.add('active');
    // Re-render consignes
    const container = document.getElementById('consignes-' + i);
    const countEl   = document.getElementById('consigne-count-' + i);
    if (container) renderConsignesFor(s.prenom, container, countEl);
  });
  // Reconstruire le tableau global
  const global = document.getElementById('page-global');
  if (global) {
    const wasActive = global.classList.contains('active');
    global.remove();
    buildGlobalPage();
    if (wasActive) document.getElementById('page-global')?.classList.add('active');
  }
  showSyncToast('Planning mis à jour ↗');
}

function showSyncToast(msg) {
  let t = document.getElementById('sync-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'sync-toast';
    t.style.cssText = 'position:fixed;top:60px;right:12px;background:#0D2240;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:500;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2500);
}

/* ——— NAV ——————————————————————————————————— */
function buildNav() {
  const nav = document.getElementById('nav');

  const tabs = [
    { id: 'global',    label: 'Planning global', icon: '📅' },
    { id: 'calendar',  label: 'Calendrier',      icon: '🗓' },
    ...STAFF.map((s, i) => ({ id: 'p' + i, label: s.prenom, staff: s })),
    { id: 'pointage',  label: 'Pointage',         icon: '🕐' },
  ];

  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.page = tab.id;

    if (tab.staff) {
      const s = tab.staff;
      btn.innerHTML = `
        <span class="avatar-xs" style="background:${roleColor(s.role)}">${initiales(s)}</span>
        ${s.prenom}
      `;
    } else {
      btn.innerHTML = `<span style="font-size:15px;line-height:1">${tab.icon}</span> ${tab.label}`;
    }

    btn.addEventListener('click', () => showPage(tab.id));

    // Badge notification consignes sur onglet employé
    if (tab.staff) {
      const count = getConsignesFor(tab.staff.prenom).length;
      if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-dot';
        badge.id = 'notif-' + tab.id;
        badge.textContent = count;
        btn.appendChild(badge);
      }
    }

    nav.appendChild(btn);
  });
}

function showPage(id) {
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.page === id)
  );
  document.querySelectorAll('.page').forEach(p =>
    p.classList.toggle('active', p.id === 'page-' + id)
  );
}

/* ——— GLOBAL PAGE ——————————————————————————— */
function buildGlobalPage() {
  const pages = document.getElementById('pages');
  const div = document.createElement('div');
  div.className = 'page active';
  div.id = 'page-global';

  // Stats summary
  const totalContrat = STAFF.reduce((s, e) => s + e.contrat, 0);
  const totalPlannif = STAFF.reduce((s, e) => s + totalHeures(e), 0);
  const nbRepos = STAFF.reduce((s, e) => s + e.shifts.filter(sh => !sh.deb).length, 0);

  // Legend
  const legendHTML = Object.entries(TASKS).map(([k, v]) =>
    `<span class="legend-item">
      <span class="legend-dot" style="background:${v.color}"></span>${v.label}
    </span>`
  ).join('') +
  `<span class="legend-item">
    <span class="legend-dot" style="background:var(--bg-muted);border:1px solid var(--border)"></span>Repos
  </span>`;

  // Table rows
  const rows = STAFF.map(s => {
    const total = totalHeures(s);
    const ok = Math.abs(total - s.contrat) <= 1;
    const role = ROLES[s.role] || { label: s.role, color: '#888' };

    const cells = JOURS.slice(0, 6).map((j, idx) => {
      const sh = s.shifts[idx];
      const horsLimite = JOURS_HORS?.[j];
      if (horsLimite) {
        return `<td style="padding:5px 4px;text-align:center">
          <span style="font-size:10px;color:var(--text-light);background:var(--bg-muted);padding:2px 6px;border-radius:8px">Hors mois</span>
        </td>`;
      }
      const eff = getEffectiveShift(s.prenom, idx, sh || { j, deb: 0, fin: 0, task: null });
      const isOv = getOverrides().some(o => o.prenom === s.prenom && o.jourIdx === idx);
      if (!eff || !eff.deb) return `<td style="padding:5px 4px"><span class="shift-pill shift-repos">${isOv?'⚡ ':''}</span></td>`;
      const t = TASKS[eff.task] || { color: '#888', label: eff.task };
      return `<td style="padding:5px 4px">
        <span class="shift-pill" style="background:${t.color};${isOv?'outline:2px solid #fbbf24;outline-offset:1px':''}" title="${eff.task} — ${eff.deb}h à ${eff.fin}h${isOv?' (modifié)':''}">
          ${eff.deb}h–${eff.fin}h
        </span>
      </td>`;
    }).join('');

    return `<tr>
      <td style="padding:7px 12px;min-width:140px">
        <div class="emp-cell">
          <span class="avatar-xs" style="background:${role.color}">${initiales(s)}</span>
          <div>
            <div class="emp-name">${s.prenom} ${s.nom}</div>
          </div>
        </div>
      </td>
      <td style="padding:5px 8px">
        <span class="emp-role" style="background:${role.color}">${role.label}</span>
      </td>
      <td style="text-align:center;font-size:11px;color:var(--text-muted)">${s.contrat}h</td>
      ${cells}
      <td style="text-align:center;padding:5px 10px">
        <span class="${ok ? 'h-ok' : 'h-warn'}">${total}h</span>
      </td>
    </tr>`;
  }).join('');

  div.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-label">Équipe</div>
        <div class="stat-card-num">${STAFF.length}</div>
        <div class="stat-card-sub">collaborateurs</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Heures planifiées</div>
        <div class="stat-card-num">${totalPlannif}h</div>
        <div class="stat-card-sub">/ ${totalContrat}h contrat</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Jours de repos</div>
        <div class="stat-card-num">${nbRepos}</div>
        <div class="stat-card-sub">sur la semaine</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Semaine</div>
        <div class="stat-card-num">${SEMAINE.numero}</div>
        <div class="stat-card-sub">13 – 19 avr. 2026</div>
      </div>
    </div>

    <div class="section-header">
      <span class="section-title">Planning semaine ${SEMAINE.numero} — ${SEMAINE.magasin}</span>
    </div>

    <div class="legend">${legendHTML}</div>

    <div class="card">
      <div class="table-wrap">
        <table class="ptable">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Rôle</th>
              <th class="center">Contrat</th>
              ${JOURS.slice(0,6).map(j => {
                const hl = JOURS_HORS?.[j];
                return `<th class="center" ${hl ? 'style="opacity:0.4"' : ''}>${j}<br><span style="font-weight:400;font-size:10px">${JOURS_DATES[j]}${hl ? ' 🚫' : ''}</span></th>`;
              }).join('')}
              <th class="center">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  pages.appendChild(div);
}

/* ——— PERSON PAGE ——————————————————————————— */
function buildPersonPage(s, i) {
  const pages = document.getElementById('pages');
  const div = document.createElement('div');
  div.className = 'page';
  div.id = 'page-p' + i;

  const total = totalHeures(s);
  const ok = Math.abs(total - s.contrat) <= 1;
  const role = ROLES[s.role] || { label: s.role, color: '#888' };
  const avatarColor = role.color;

  const TL_START = 6;
  const TL_END   = 21;
  const TL_SPAN  = TL_END - TL_START;

  const dayCards = s.shifts.map((sh, idx) => {
    const jour = JOURS[idx];
    const jourFull = JOURS_FULL[jour];
    const date = JOURS_DATES[jour];
    const horsLimite = JOURS_HORS?.[jour]; // jour hors du mois

    // Appliquer les overrides admin
    const eff = horsLimite ? { deb: 0, fin: 0, task: null } : getEffectiveShift(s.prenom, idx, sh);
    const isOverride = !horsLimite && getOverrides().some(o => o.prenom === s.prenom && o.jourIdx === idx);

    if (!eff.deb) {
      const label = horsLimite
        ? `<span style="font-size:10px;background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:8px">Hors mois</span>`
        : `Jour de repos${isOverride ? ' <span style="font-size:10px;background:#fef9c3;color:#92400e;padding:1px 5px;border-radius:8px">modifié</span>' : ''}`;
      return `
        <div class="day-card repos" ${horsLimite ? 'style="opacity:0.4"' : ''}>
          <div class="day-card-inner">
            <span class="day-label">${jour}</span>
            <span class="day-date">${jourFull} ${date}</span>
            <span style="font-size:12px;color:var(--text-light);font-style:italic">${label}</span>
          </div>
        </div>`;
    }

    const t = TASKS[eff.task] || { color: '#888', label: eff.task || '' };
    const dur = eff.fin - eff.deb;

    const leftPct  = ((eff.deb - TL_START) / TL_SPAN * 100).toFixed(1);
    const widthPct = (dur / TL_SPAN * 100).toFixed(1);

    const ticks = [];
    for (let h = TL_START; h <= TL_END; h += 3) {
      ticks.push(`<span>${h}h</span>`);
    }
    const modifBadge = isOverride ? `<span style="font-size:9px;background:#fef9c3;color:#92400e;padding:1px 5px;border-radius:8px;margin-left:6px">modifié</span>` : '';

    return `
      <div class="day-card">
        <div class="day-card-inner">
          <span class="day-label">${jour}</span>
          <span class="day-date">${jourFull} ${date}</span>
          <span class="day-task-badge" style="background:${t.color}">${t.label}</span>
          <span class="day-hours-range" style="margin-left:8px">${eff.deb}h00 → ${eff.fin}h00${modifBadge}</span>
          <span class="day-dur">${dur}h</span>
        </div>
        <div class="tl-wrap">
          <div class="tl-track">
            <div class="tl-fill" style="left:${leftPct}%;width:${widthPct}%;background:${t.color}">
              ${eff.deb}h–${eff.fin}h
            </div>
          </div>
          <div class="tl-ticks">${ticks.join('')}</div>
        </div>
      </div>`;
  }).join('');

  div.innerHTML = `
    <div class="person-header">
      <div class="avatar-lg" style="background:${avatarColor}">${initiales(s)}</div>
      <div class="ph-info">
        <div class="ph-name">${s.prenom} ${s.nom}</div>
        <div class="ph-meta">${role.label} · Contrat ${s.contrat}h / semaine · S${SEMAINE.numero}</div>
        <!-- ONGLET CONSIGNES cliquable sous le nom -->
        <button
          id="consigne-toggle-${i}"
          onclick="toggleConsignesTab(${i})"
          style="
            margin-top:8px;
            display:inline-flex;align-items:center;gap:5px;
            background:transparent;
            border:1px solid rgba(255,255,255,0.25);
            border-radius:20px;
            padding:3px 10px;
            font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);
            cursor:pointer;transition:all 0.15s;
          "
          onmouseover="this.style.background='rgba(255,255,255,0.1)'"
          onmouseout="this.style.background='transparent'"
        >
          📌 Consignes
          <span id="consigne-count-${i}" style="background:var(--noz-red);color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;display:none">0</span>
        </button>
      </div>
      <div class="ph-stats">
        <div class="ph-stat-num ${ok ? 'ph-stat-ok' : 'ph-stat-warn'}">${total}h</div>
        <div class="ph-stat-label">planifiées / ${s.contrat}h</div>
      </div>
    </div>

    <!-- PANNEAU CONSIGNES — caché par défaut, s'ouvre au clic -->
    <div id="consignes-tab-${i}" style="display:none;margin-bottom:14px"></div>

    <div class="week-list">${dayCards}</div>

    <div style="margin-top:12px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:space-between;font-size:12px;">
      <span style="color:var(--text-muted)">Heures planifiées cette semaine</span>
      <span style="font-weight:700;color:${ok?'#16a34a':'#ea580c'}">
        ${total}h / ${s.contrat}h · Écart : ${total >= s.contrat ? '+' : ''}${total - s.contrat}h
      </span>
    </div>
  `;

  pages.appendChild(div);
}

/* ——— CALENDAR PAGE ——————————————————————— */
function buildCalendarPage() {
  const pages = document.getElementById('pages');
  const div = document.createElement('div');
  div.className = 'page';
  div.id = 'page-calendar';

  div.innerHTML = `
    <div class="cal-header">
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <span class="cal-month-title" id="cal-title"></span>
        <button class="cal-nav-btn" id="cal-next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">Planning semaine ${SEMAINE.numero}</div>
    </div>

    <div class="cal-wrapper">
      <div class="cal-grid">
        <div class="cal-weekdays">
          ${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j =>
            `<div class="cal-weekday">${j}</div>`
          ).join('')}
        </div>
        <div class="cal-days" id="cal-days"></div>
      </div>
    </div>

    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Légende équipe</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${STAFF.map(s => {
          const rc = roleColor(s.role);
          return `<span style="display:flex;align-items:center;gap:5px;background:var(--bg-card);border:1px solid var(--border);padding:3px 10px;border-radius:20px;font-size:11px;color:var(--text-muted)">
            <span style="width:8px;height:8px;border-radius:50%;background:${rc};flex-shrink:0"></span>
            ${s.prenom}
          </span>`;
        }).join('')}
      </div>
    </div>
  `;

  pages.appendChild(div);
  initCalendar();
}

function initCalendar() {
  let current = new Date(2026, 3, 1); // Avril 2026

  function render() {
    const title = document.getElementById('cal-title');
    const container = document.getElementById('cal-days');
    if (!title || !container) return;

    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    title.textContent = months[current.getMonth()] + ' ' + current.getFullYear();

    // Compute days to show
    const year  = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    // Start from Monday
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1;

    const cells = [];
    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, other: true });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ date: new Date(year, month, d), other: false });
    }
    // Next month padding
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), other: true });
    }

    // Build events map: iso date → [{prenom, color, task, deb, fin}]
    const eventsMap = {};
    const weekDates = {
      'Lun': '2026-04-13', 'Mar': '2026-04-14', 'Mer': '2026-04-15',
      'Jeu': '2026-04-16', 'Ven': '2026-04-17', 'Sam': '2026-04-18', 'Dim': '2026-04-19',
    };
    STAFF.forEach(s => {
      const rc = roleColor(s.role);
      s.shifts.forEach((sh, idx) => {
        if (!sh.deb) return;
        const jour = JOURS[idx];
        const iso  = weekDates[jour];
        if (!iso) return;
        if (!eventsMap[iso]) eventsMap[iso] = [];
        const t = TASKS[sh.task] || { color: rc, label: sh.task };
        eventsMap[iso].push({ prenom: s.prenom, color: t.color, task: t.label, deb: sh.deb, fin: sh.fin });
      });
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    container.innerHTML = cells.map(cell => {
      const iso = cell.date.toISOString().split('T')[0];
      const isToday = cell.date.getTime() === today.getTime();
      const events = eventsMap[iso] || [];

      const evHTML = events.slice(0, 3).map(ev =>
        `<div class="cal-event" style="background:${ev.color}" title="${ev.prenom} — ${ev.task} ${ev.deb}h–${ev.fin}h">
          ${ev.prenom}
        </div>`
      ).join('');

      const more = events.length > 3
        ? `<div style="font-size:8px;color:var(--text-muted);padding:1px 3px">+${events.length - 3}</div>`
        : '';

      return `<div class="cal-day ${cell.other ? 'other-month' : ''} ${isToday ? 'today' : ''}">
        <div class="cal-day-num">${cell.date.getDate()}</div>
        ${evHTML}${more}
      </div>`;
    }).join('');
  }

  document.getElementById('cal-prev')?.addEventListener('click', () => {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    render();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    render();
  });

  render();
}

/* ——— PDF EXPORT ———————————————————————————— */
function setupPDF() {
  document.getElementById('btn-pdf')?.addEventListener('click', () => {
    showToast('Impression en cours…');
    setTimeout(() => window.print(), 200);
  });
}

/* ——— TOAST ———————————————————————————————— */
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ——— CONSIGNES ENGINE ————————————————————— */

const CONSIGNES_KEY = 'noz_consignes';

function getAllConsignes() {
  try { return JSON.parse(localStorage.getItem(CONSIGNES_KEY) || '[]'); }
  catch { return []; }
}

function saveAllConsignes(list) {
  localStorage.setItem(CONSIGNES_KEY, JSON.stringify(list));
}

function getConsignesFor(prenom) {
  const all = getAllConsignes();
  return all.filter(c => c.dest === prenom || c.dest === 'Tous');
}

function addConsigne(dest, text, priority) {
  const all = getAllConsignes();
  const c = {
    id:       Date.now(),
    dest,
    text,
    priority,
    from:     'Antoine (Gérant)',
    date:     new Date().toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }),
  };
  all.unshift(c);
  saveAllConsignes(all);
  refreshAllConsignes();
  updateNavBadges();
}

function deleteConsigne(id) {
  const all = getAllConsignes().filter(c => c.id !== id);
  saveAllConsignes(all);
  refreshAllConsignes();
  updateNavBadges();
}

function toggleConsignesTab(i) {
  const tab = document.getElementById('consignes-tab-' + i);
  if (!tab) return;
  const isOpen = tab.style.display !== 'none';
  tab.style.display = isOpen ? 'none' : 'block';
  const btn = document.getElementById('consigne-toggle-' + i);
  if (btn) btn.style.borderColor = isOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,165,0,0.7)';
}

function renderConsignesFor(prenom, _unused, countEl) {
  const list = getConsignesFor(prenom);
  const idx  = STAFF.findIndex(s => s.prenom === prenom);
  const tabEl = idx >= 0 ? document.getElementById('consignes-tab-' + idx) : null;
  const badge = idx >= 0 ? document.getElementById('consigne-count-' + idx) : null;

  // Badge sur le bouton
  if (badge) {
    badge.textContent = list.length;
    badge.style.display = list.length > 0 ? 'inline-block' : 'none';
  }
  if (countEl) countEl.textContent = list.length > 0 ? list.length : '';

  if (!tabEl) return;

  if (!list.length) {
    tabEl.innerHTML = '<div style="padding:12px 14px;font-size:13px;color:var(--text-muted);font-style:italic">Aucune consigne en cours.</div>';
    return;
  }

  const icons = { haute: '🔴', normale: '🟡', info: '🔵' };
  tabEl.innerHTML = `
    <div style="
      background:#fff8f0;
      border:1.5px solid #f97316;
      border-radius:var(--radius-md);
      overflow:hidden;
    ">
      <div style="background:#f97316;padding:8px 14px;display:flex;align-items:center;justify-content:space-between">
        <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:.3px">
          📌 CONSIGNES DU GÉRANT
          <span style="background:rgba(255,255,255,0.3);color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px;margin-left:6px">${list.length}</span>
        </span>
        <button onclick="toggleConsignesTab(${idx})" style="background:none;border:none;color:rgba(255,255,255,0.8);cursor:pointer;font-size:16px;padding:0;line-height:1">×</button>
      </div>
      <div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px">
        ${list.map(c => `
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span style="font-size:13px;flex-shrink:0;margin-top:1px">${icons[c.priority] || '🟡'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#7c2d12;font-weight:500;line-height:1.4">${escHtml(c.text)}</div>
              <div style="font-size:10px;color:#c2410c;margin-top:2px">
                ${c.from} · ${c.date}
                ${c.dest === 'Tous' ? '<span style="background:#fed7aa;color:#c2410c;padding:0 5px;border-radius:8px;margin-left:4px;font-size:9px">Toute l\'équipe</span>' : ''}
              </div>
            </div>
          </div>
        `).join('<hr style="border:none;border-top:1px solid #fed7aa;margin:2px 0">')}
      </div>
    </div>`;
}

function refreshAllConsignes() {
  STAFF.forEach((s, i) => {
    const countEl = document.getElementById('consigne-count-' + i);
    renderConsignesFor(s.prenom, null, countEl);
  });
  renderConsignesPage();
  updateNavBadges();
}

function updateNavBadges() {
  STAFF.forEach((s, i) => {
    const existing = document.getElementById('notif-p' + i);
    const count = getConsignesFor(s.prenom).length;
    if (existing) {
      existing.textContent = count;
      existing.style.display = count > 0 ? '' : 'none';
    }
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ——— CONSIGNES PAGE ——————————————————————— */

function buildConsignesPage() {
  const pages = document.getElementById('pages');
  const div = document.createElement('div');
  div.className = 'page';
  div.id = 'page-consignes';
  div.innerHTML = `
    <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
      <h2 style="font-size:16px;font-weight:600;color:var(--text)">Consignes équipe</h2>
      <span style="font-size:11px;color:var(--text-muted)">Visible sur la fiche de chaque employé</span>
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:20px;box-shadow:var(--shadow-sm)">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:12px">
        Nouvelle consigne
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center">
        <label style="font-size:12px;color:var(--text-muted);font-weight:500">Pour :</label>
        <select id="consigne-dest" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;font-size:13px;background:var(--bg-card);color:var(--text);cursor:pointer">
          <option value="Tous">👥 Toute l'équipe</option>
          ${STAFF.map(s => `<option value="${s.prenom}">${s.prenom} ${s.nom}</option>`).join('')}
        </select>

        <label style="font-size:12px;color:var(--text-muted);font-weight:500;margin-left:8px">Priorité :</label>
        <select id="consigne-priority" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;font-size:13px;background:var(--bg-card);color:var(--text);cursor:pointer">
          <option value="normale">🟡 Normale</option>
          <option value="haute">🔴 Haute</option>
          <option value="info">🔵 Info</option>
        </select>
      </div>

      <textarea id="consigne-text"
        placeholder="Ex: Penser à faire le TDM avant 9h, vérifier le facing après la livraison..."
        style="width:100%;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 14px;font-size:13px;background:var(--bg-muted);color:var(--text);resize:vertical;min-height:80px;font-family:inherit;outline:none;transition:border-color 0.15s"
        onfocus="this.style.borderColor='var(--noz-navy)'"
        onblur="this.style.borderColor='var(--border)'"
      ></textarea>

      <div style="display:flex;justify-content:flex-end;margin-top:10px;gap:8px">
        <button onclick="document.getElementById('consigne-text').value=''" style="padding:8px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);background:none;color:var(--text-muted);cursor:pointer;font-size:13px">
          Effacer
        </button>
        <button onclick="submitConsigne()" style="padding:8px 20px;border:none;border-radius:var(--radius-sm);background:var(--noz-navy);color:#fff;cursor:pointer;font-size:13px;font-weight:600;transition:background 0.15s" onmouseover="this.style.background='#1a3a6e'" onmouseout="this.style.background='var(--noz-navy)'">
          Envoyer la consigne
        </button>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
      <span>Consignes actives</span>
      <button onclick="clearAllConsignes()" style="font-size:10px;color:var(--text-light);background:none;border:none;cursor:pointer;font-weight:400">Tout effacer</button>
    </div>
    <div id="consignes-page-list"></div>
  `;
  pages.appendChild(div);
  renderConsignesPage();
}

function renderConsignesPage() {
  const container = document.getElementById('consignes-page-list');
  if (!container) return;
  const all = getAllConsignes();
  if (!all.length) {
    container.innerHTML = '<div class="consigne-empty" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md)">Aucune consigne active</div>';
    return;
  }
  const icons = { haute: '🔴', normale: '🟡', info: '🔵' };
  container.innerHTML = all.map(c => `
    <div class="consigne-banner priority-${c.priority}" data-id="${c.id}">
      <span class="consigne-icon">${icons[c.priority] || '🟡'}</span>
      <div class="consigne-body">
        <div class="consigne-from" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span>Pour : <strong>${c.dest}</strong></span>
          <span class="priority-badge priority-${c.priority}">${c.priority}</span>
        </div>
        <div class="consigne-text">${escHtml(c.text)}</div>
        <div class="consigne-date">${c.from} · ${c.date}</div>
      </div>
      <button class="consigne-del" onclick="deleteConsigne(${c.id})" title="Supprimer">×</button>
    </div>`).join('');
}

function submitConsigne() {
  const text     = document.getElementById('consigne-text').value.trim();
  const dest     = document.getElementById('consigne-dest').value;
  const priority = document.getElementById('consigne-priority').value;
  if (!text) {
    document.getElementById('consigne-text').style.borderColor = '#dc2626';
    setTimeout(() => document.getElementById('consigne-text').style.borderColor = 'var(--border)', 1500);
    return;
  }
  addConsigne(dest, text, priority);
  document.getElementById('consigne-text').value = '';
  showToast('Consigne envoyée ✓');
}

function clearAllConsignes() {
  if (!confirm('Effacer toutes les consignes ?')) return;
  localStorage.removeItem(CONSIGNES_KEY);
  refreshAllConsignes();
  updateNavBadges();
  showToast('Consignes effacées');
}

/* ——— POINTAGE ENGINE ————————————————————— */

const POINTAGE_KEY = 'noz_pointages';

function getPointages() {
  try { return JSON.parse(localStorage.getItem(POINTAGE_KEY) || '{}'); }
  catch { return {}; }
}
function savePointages(data) {
  localStorage.setItem(POINTAGE_KEY, JSON.stringify(data));
  if (typeof syncSaveOverride === 'function' && window._fbAvailable) {
    fetch(`${window.FIREBASE_URL}/pointages.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// Arrondit au quart d'heure selon le type
// Arrivée → quart d'heure SUPÉRIEUR (8h52 → 9h00, 9h03 → 9h15)
// Départ  → quart d'heure INFÉRIEUR (16h58 → 16h45, 17h02 → 17h00)
function arrondiQuart(type) {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();

  let hArr, mArr;
  if (type === 'arrivee') {
    // Quart supérieur : on monte au prochain quart
    const quarterUp = Math.ceil(m / 15) * 15;
    if (quarterUp === 60) { hArr = h + 1; mArr = 0; }
    else { hArr = h; mArr = quarterUp; }
  } else {
    // Quart inférieur : on descend au quart précédent
    const quarterDown = Math.floor(m / 15) * 15;
    hArr = h; mArr = quarterDown;
  }

  return `${String(hArr).padStart(2,'0')}:${String(mArr).padStart(2,'0')}`;
}

function nowTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function nowISO() { return new Date().toISOString(); }

// Enregistre une arrivée ou un départ avec arrondi au quart d'heure
function enregistrerPointage(prenom, type) {
  const data        = getPointages();
  const day         = todayKey();
  const heureReelle = nowTime();
  const heureArrondie = arrondiQuart(type);

  if (!data[day]) data[day] = {};
  if (!data[day][prenom]) data[day][prenom] = {};
  data[day][prenom][type] = {
    time:    heureArrondie,   // heure arrondie (celle qui compte)
    timeReel: heureReelle,    // heure réelle (pour info)
    iso:     nowISO(),
  };
  savePointages(data);
  return { heureArrondie, heureReelle };
}

// Retourne le statut du jour pour une personne
function getStatutJour(prenom) {
  const data = getPointages();
  const day  = todayKey();
  return data[day]?.[prenom] || {};
}

// Calcule la durée travaillée en minutes
function dureeMinutes(arrivee, depart) {
  if (!arrivee || !depart) return null;
  const [ah, am] = arrivee.split(':').map(Number);
  const [dh, dm] = depart.split(':').map(Number);
  return (dh * 60 + dm) - (ah * 60 + am);
}

// Détecte le retard en minutes
function retardMinutes(prevuH, realTime) {
  if (!realTime || !prevuH) return 0;
  const [ph, pm] = [prevuH * 60, 0];
  const [rh, rm] = realTime.split(':').map(Number);
  const diff = (rh * 60 + rm) - (ph + pm);
  return Math.max(0, diff);
}

/* ——— PAGE POINTAGE ——————————————————————— */

let pinPointage = '';
let pointagePersonne = null;

function buildPointagePage() {
  const pages = document.getElementById('pages');
  const div = document.createElement('div');
  div.className = 'page';
  div.id = 'page-pointage';

  div.innerHTML = `
    <div style="max-width:480px;margin:0 auto">

      <!-- TITRE -->
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:22px;font-weight:700;color:var(--text)">🕐 Pointage</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px" id="pointage-date"></div>
      </div>

      <!-- PAVÉ PIN -->
      <div id="pointage-pin-screen">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:16px">
          <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-align:center;margin-bottom:16px">
            Entrez votre code PIN
          </div>

          <!-- Points PIN -->
          <div style="display:flex;justify-content:center;gap:12px;margin-bottom:20px" id="pt-dots">
            <div class="pt-dot" id="pt-d0"></div>
            <div class="pt-dot" id="pt-d1"></div>
            <div class="pt-dot" id="pt-d2"></div>
            <div class="pt-dot" id="pt-d3"></div>
          </div>

          <!-- Pavé numérique -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
            ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(n => `
              <button class="pt-key" ${n==='' ? 'style="visibility:hidden"' : ''} data-v="${n}" onclick="ptKey('${n}')">
                ${n}
              </button>`).join('')}
          </div>

          <div id="pt-error" style="text-align:center;color:#dc2626;font-size:12px;font-weight:600;margin-top:12px;min-height:18px"></div>
        </div>
      </div>

      <!-- ÉCRAN POINTAGE APRÈS IDENTIFICATION -->
      <div id="pointage-action-screen" style="display:none">
        <div style="background:var(--noz-navy);border-radius:var(--radius-lg);padding:20px;text-align:center;margin-bottom:16px;color:#fff">
          <div id="pt-avatar" style="width:52px;height:52px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border:2px solid rgba(255,255,255,0.3)"></div>
          <div id="pt-name" style="font-size:18px;font-weight:700"></div>
          <div id="pt-role" style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px"></div>
          <div id="pt-shift-prevu" style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px"></div>
        </div>

        <!-- Statut actuel -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted);margin-bottom:10px">Pointages aujourd'hui</div>
          <div id="pt-status-detail"></div>
        </div>

        <!-- Boutons pointage -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <button id="btn-arrivee" onclick="pointer('arrivee')" style="padding:16px;border:none;border-radius:var(--radius-md);background:#16a34a;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:opacity 0.15s">
            ✅ Arrivée
          </button>
          <button id="btn-depart" onclick="pointer('depart')" style="padding:16px;border:none;border-radius:var(--radius-md);background:#dc2626;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:opacity 0.15s">
            🚪 Départ
          </button>
        </div>

        <button onclick="ptReset()" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:none;color:var(--text-muted);cursor:pointer;font-size:13px">
          ← Changer d'employé
        </button>
      </div>

      <!-- RÉCAP DU JOUR -->
      <div style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted);margin-bottom:8px">
          Présences du jour
        </div>
        <div id="pointage-recap-jour" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden"></div>
      </div>

    </div>
  `;

  pages.appendChild(div);

  // Styles PIN
  if (!document.getElementById('pt-styles')) {
    const style = document.createElement('style');
    style.id = 'pt-styles';
    style.textContent = `
      .pt-dot { width:14px;height:14px;border-radius:50%;border:2px solid var(--border-md);transition:all 0.15s; }
      .pt-dot.filled { background:var(--noz-navy);border-color:var(--noz-navy); }
      .pt-dot.ok { background:#16a34a;border-color:#16a34a; }
      .pt-dot.err { background:#dc2626;border-color:#dc2626;animation:ptShake 0.3s ease; }
      @keyframes ptShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
      .pt-key {
        padding:14px 0;font-size:20px;font-weight:600;
        border:1px solid var(--border);border-radius:var(--radius-md);
        background:var(--bg-card);color:var(--text);cursor:pointer;
        transition:all 0.1s;
      }
      .pt-key:hover { background:var(--bg-muted); }
      .pt-key:active { transform:scale(0.93);background:var(--noz-navy);color:#fff;border-color:var(--noz-navy); }
    `;
    document.head.appendChild(style);
  }

  // Init date
  document.getElementById('pointage-date').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  renderRecapJour();
}

function ptKey(v) {
  if (v === '⌫') {
    pinPointage = pinPointage.slice(0, -1);
  } else if (pinPointage.length < 4) {
    pinPointage += v;
  }
  updatePtDots();
  document.getElementById('pt-error').textContent = '';
  if (pinPointage.length === 4) setTimeout(checkPtPin, 150);
}

function updatePtDots(state) {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('pt-d' + i);
    d.className = 'pt-dot';
    if (state === 'ok') d.classList.add('ok');
    else if (state === 'err') d.classList.add('err');
    else if (i < pinPointage.length) d.classList.add('filled');
  }
}

function checkPtPin() {
  const personne = STAFF.find(s => s.pin === pinPointage);
  if (personne) {
    updatePtDots('ok');
    setTimeout(() => showPointageAction(personne), 400);
  } else {
    updatePtDots('err');
    document.getElementById('pt-error').textContent = 'Code incorrect';
    setTimeout(() => {
      pinPointage = '';
      updatePtDots();
    }, 800);
  }
}

function showPointageAction(personne) {
  pointagePersonne = personne;
  document.getElementById('pointage-pin-screen').style.display = 'none';
  document.getElementById('pointage-action-screen').style.display = 'block';

  const rc = roleColor(personne.role);
  const av = document.getElementById('pt-avatar');
  av.textContent = initiales(personne);
  av.style.background = rc;

  document.getElementById('pt-name').textContent = personne.prenom + ' ' + personne.nom;
  document.getElementById('pt-role').textContent = (ROLES[personne.role]?.label || personne.role) + ' · ' + personne.contrat + 'h/sem';

  // Shift prévu aujourd'hui (dimanche = idx 6, hors planning)
  const jourIdx = (new Date().getDay() + 6) % 7;
  const sh = jourIdx < 6 ? personne.shifts[jourIdx] : null;
  const prevuEl = document.getElementById('pt-shift-prevu');

  const btnA = document.getElementById('btn-arrivee');
  const btnD = document.getElementById('btn-depart');

  if (!sh?.deb) {
    // Jour de repos ou dimanche → bloquer les boutons
    prevuEl.innerHTML = '<span style="color:#f97316;font-weight:600">⚠️ Jour de repos — pointage non autorisé</span>';
    btnA.disabled = true; btnA.style.opacity = '0.3'; btnA.style.cursor = 'not-allowed';
    btnD.disabled = true; btnD.style.opacity = '0.3'; btnD.style.cursor = 'not-allowed';
  } else {
    prevuEl.textContent = `Prévu : ${sh.deb}h00 → ${sh.fin}h00`;
    btnA.disabled = false;
    btnD.disabled = false;
  }

  renderPointageStatus(personne);
}

function renderPointageStatus(personne) {
  const statut = getStatutJour(personne.prenom);
  const el = document.getElementById('pt-status-detail');
  const jourIdx = (new Date().getDay() + 6) % 7;
  const sh = jourIdx < 6 ? personne.shifts[jourIdx] : null;

  // Si repos, afficher message et sortir
  if (!sh?.deb) {
    el.innerHTML = `<div style="padding:8px 0;color:var(--text-muted);font-size:13px;font-style:italic">Pas de shift prévu aujourd'hui.</div>`;
    return;
  }

  let html = '';

  // — ARRIVÉE —
  if (statut.arrivee) {
    const retard = retardMinutes(sh.deb, statut.arrivee.time);
    const realInfo = statut.arrivee.timeReel && statut.arrivee.timeReel !== statut.arrivee.time
      ? ` <span style="color:var(--text-light);font-size:10px">(réel : ${statut.arrivee.timeReel})</span>` : '';
    html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:18px">✅</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">Arrivée : ${statut.arrivee.time}${realInfo}</div>
        ${retard > 0
          ? `<div style="font-size:11px;color:#dc2626;font-weight:500">⚠️ ${retard} min de retard</div>`
          : `<div style="font-size:11px;color:#16a34a">À l'heure ✓</div>`}
      </div>
    </div>`;
  } else {
    html += `<div style="padding:8px 0;color:var(--text-muted);font-size:13px;border-bottom:1px solid var(--border)">
      ⏳ Arrivée non pointée
    </div>`;
  }

  // — DÉPART —
  if (statut.depart) {
    const duree = dureeMinutes(statut.arrivee?.time, statut.depart.time);
    const realInfo = statut.depart.timeReel && statut.depart.timeReel !== statut.depart.time
      ? ` <span style="color:var(--text-light);font-size:10px">(réel : ${statut.depart.timeReel})</span>` : '';
    const dureeStr = duree !== null && duree > 0
      ? `${Math.floor(duree/60)}h${String(duree%60).padStart(2,'0')} travaillées`
      : '';
    const supBadge = statut.depart.heureSup
      ? `<div style="font-size:11px;color:#f97316;font-weight:600;margin-top:2px">⏰ HS · ${statut.depart.justification}</div>` : '';
    html += `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0">
      <span style="font-size:18px;margin-top:1px">🚪</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">Départ : ${statut.depart.time}${realInfo}</div>
        ${dureeStr ? `<div style="font-size:11px;color:var(--text-muted)">${dureeStr}</div>` : ''}
        ${supBadge}
      </div>
    </div>`;
  } else {
    html += `<div style="padding:8px 0;color:var(--text-muted);font-size:13px">⏳ Départ non pointé</div>`;
  }

  el.innerHTML = html;

  // — Boutons activer/désactiver —
  const btnA = document.getElementById('btn-arrivee');
  const btnD = document.getElementById('btn-depart');

  // Arrivée : désactivé si déjà pointé
  if (statut.arrivee) {
    btnA.disabled = true; btnA.style.opacity = '0.35'; btnA.style.cursor = 'not-allowed';
  } else {
    btnA.disabled = false; btnA.style.opacity = '1'; btnA.style.cursor = 'pointer';
  }

  // Départ : disponible seulement si arrivée pointée ET départ pas encore fait
  if (statut.arrivee && !statut.depart) {
    btnD.disabled = false; btnD.style.opacity = '1'; btnD.style.cursor = 'pointer';
  } else {
    btnD.disabled = true; btnD.style.opacity = '0.35'; btnD.style.cursor = 'not-allowed';
  }
}

// Convertit "HH:MM" en minutes depuis minuit
function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Modale justification heures sup
function showJustificationModal(heureArrondie, heureFinPrevue, callback) {
  const overlay = document.createElement('div');
  overlay.id = 'justif-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  const supMins = timeToMins(heureArrondie) - timeToMins(heureFinPrevue);
  const supStr  = `${Math.floor(supMins/60)}h${String(supMins%60).padStart(2,'0')}`;
  const raisons = ['Livraison tardive','Inventaire','Caisse longue','Nettoyage','Demande gérant','Forte affluence'];
  overlay.innerHTML = `
    <div style="background:var(--bg-card,#fff);border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:28px;margin-bottom:6px">⏰</div>
        <div style="font-size:15px;font-weight:700;color:var(--text,#111)">Heure supplémentaire</div>
        <div style="font-size:12px;color:var(--text-muted,#666);margin-top:5px">
          Fin prévue : <strong>${heureFinPrevue}</strong> → Départ : <strong>${heureArrondie}</strong><br>
          <span style="color:#dc2626;font-weight:600">+${supStr} supplémentaire(s)</span>
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--text-muted,#666);margin-bottom:6px">Raison :</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">
        ${raisons.map(r => `<button onclick="selectJustif('${r}')" style="padding:4px 9px;border:1px solid #ddd;border-radius:16px;background:none;font-size:11px;color:#666;cursor:pointer" class="jchip">${r}</button>`).join('')}
      </div>
      <textarea id="justif-text" placeholder="Ou précisez..." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px;resize:none;min-height:55px;font-family:inherit;outline:none"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="cancelJustif()" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;background:none;color:#666;cursor:pointer;font-size:13px">Annuler</button>
        <button onclick="confirmJustif()" style="flex:2;padding:10px;border:none;border-radius:8px;background:#0D2240;color:#fff;cursor:pointer;font-size:13px;font-weight:600">✅ Valider le départ</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  window._justifCallback = callback;
}

function selectJustif(raison) {
  document.getElementById('justif-text').value = raison;
  document.querySelectorAll('.jchip').forEach(b => {
    const sel = b.textContent === raison;
    b.style.background = sel ? '#0D2240' : 'none';
    b.style.color      = sel ? '#fff' : '#666';
    b.style.borderColor= sel ? '#0D2240' : '#ddd';
  });
}

function confirmJustif() {
  const text = document.getElementById('justif-text').value.trim();
  if (!text) { document.getElementById('justif-text').style.borderColor='#dc2626'; setTimeout(()=>document.getElementById('justif-text').style.borderColor='#ddd',1500); return; }
  document.getElementById('justif-overlay')?.remove();
  if (window._justifCallback) window._justifCallback(text);
}

function cancelJustif() {
  document.getElementById('justif-overlay')?.remove();
  window._justifCallback = null;
}

function pointer(type) {
  if (!pointagePersonne) return;

  // Vérifier que le bouton n'est pas désactivé
  const btnId = type === 'arrivee' ? 'btn-arrivee' : 'btn-depart';
  if (document.getElementById(btnId)?.disabled) return;

  // Vérifier jour travaillé
  const jourIdx = (new Date().getDay() + 6) % 7;
  const sh = jourIdx < 6 ? pointagePersonne.shifts[jourIdx] : null;
  if (!sh?.deb) return;

  const statut = getStatutJour(pointagePersonne.prenom);
  if (type === 'arrivee' && statut.arrivee) return;
  if (type === 'depart' && (!statut.arrivee || statut.depart)) return;

  const heureArrondie = arrondiQuart(type);

  if (type === 'depart') {
    const jourIdx = (new Date().getDay() + 6) % 7;
    const sh = pointagePersonne.shifts[jourIdx];
    if (sh?.fin) {
      const finMins  = sh.fin * 60;
      const deptMins = timeToMins(heureArrondie);
      if (deptMins > finMins) {
        const finStr = `${String(sh.fin).padStart(2,'0')}:00`;
        showJustificationModal(heureArrondie, finStr, (justification) => {
          const data = getPointages();
          const day  = todayKey();
          if (!data[day]) data[day] = {};
          if (!data[day][pointagePersonne.prenom]) data[day][pointagePersonne.prenom] = {};
          data[day][pointagePersonne.prenom].depart = {
            time: heureArrondie, timeReel: nowTime(), iso: nowISO(),
            heureSup: true, justification,
          };
          savePointages(data);
          const sup = deptMins - finMins;
          showToast(`Départ ${heureArrondie} · +${Math.floor(sup/60)}h${String(sup%60).padStart(2,'0')} justifiées ✓`);
          renderPointageStatus(pointagePersonne);
          renderRecapJour();
        });
        return;
      }
    }
  }

  const { heureArrondie: ha, heureReelle } = enregistrerPointage(pointagePersonne.prenom, type);
  const label = type === 'arrivee' ? 'Arrivée' : 'Départ';
  const diffMsg = ha !== heureReelle ? ` (réel : ${heureReelle})` : '';
  showToast(`${label} : ${ha}${diffMsg} ✓`);
  renderPointageStatus(pointagePersonne);
  renderRecapJour();
}

function ptReset() {
  pinPointage = '';
  pointagePersonne = null;
  updatePtDots();
  document.getElementById('pt-error').textContent = '';
  document.getElementById('pointage-pin-screen').style.display = 'block';
  document.getElementById('pointage-action-screen').style.display = 'none';
}

function renderRecapJour() {
  const el = document.getElementById('pointage-recap-jour');
  if (!el) return;
  const data = getPointages();
  const day  = todayKey();
  const jourIdx = (new Date().getDay() + 6) % 7;

  const rows = STAFF.map(s => {
    const sh = s.shifts[jourIdx];
    if (!sh?.deb) return ''; // repos
    const pt = data[day]?.[s.prenom] || {};
    const retard = sh?.deb && pt.arrivee ? retardMinutes(sh.deb, pt.arrivee.time) : 0;
    const duree = pt.arrivee && pt.depart ? dureeMinutes(pt.arrivee.time, pt.depart.time) : null;

    let statut, couleur;
    if (pt.depart)       { statut = '✅ Parti';       couleur = '#6b7280'; }
    else if (pt.arrivee) { statut = '🟢 Présent';     couleur = '#16a34a'; }
    else                 { statut = '⏳ Attendu';      couleur = '#f59e0b'; }

    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
      <span style="width:30px;height:30px;border-radius:50%;background:${roleColor(s.role)};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${initiales(s)}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${s.prenom}</div>
        <div style="font-size:11px;color:var(--text-muted)">
          Prévu : ${sh.deb}h–${sh.fin}h
          ${pt.arrivee ? `· Arrivée : ${pt.arrivee.time}` : ''}
          ${pt.depart  ? `· Départ : ${pt.depart.time}` : ''}
          ${duree !== null ? `· <strong>${Math.floor(duree/60)}h${String(duree%60).padStart(2,'0')}</strong>` : ''}
          ${retard > 0 ? `<span style="color:#dc2626">· ${retard}min retard</span>` : ''}
        </div>
      </div>
      <span style="font-size:11px;font-weight:600;color:${couleur};flex-shrink:0">${statut}</span>
    </div>`;
  }).join('');

  el.innerHTML = rows || '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Aucun employé prévu aujourd\'hui</div>';
}

/* ——— INIT ———————————————————————————————— */
// ——— Reconstruction complète des pages avec nouveau STAFF ———
function rebuildAllPages(newStaff) {
  // Remplace le STAFF global
  STAFF.length = 0;
  newStaff.forEach(s => STAFF.push(s));

  // Vider toutes les pages et la nav
  document.getElementById('nav').innerHTML   = '';
  document.getElementById('pages').innerHTML = '';

  // Reconstruire
  buildNav();
  buildGlobalPage();
  buildCalendarPage();
  buildPointagePage();
  STAFF.forEach((s, i) => buildPersonPage(s, i));
  STAFF.forEach((s, i) => {
    const ct = document.getElementById('consigne-count-' + i);
    renderConsignesFor(s.prenom, null, ct);
  });
  showPage('global');
  showSyncToast('Planning mis à jour depuis Google Sheets ↗');
}

async function init() {
  document.getElementById('week-badge').textContent = `Semaine ${SEMAINE.numero}`;

  // 1. Afficher d'abord avec les données de data.js (instantané)
  buildNav();
  buildGlobalPage();
  buildCalendarPage();
  buildPointagePage();
  STAFF.forEach((s, i) => buildPersonPage(s, i));
  STAFF.forEach((s, i) => {
    const countEl = document.getElementById('consigne-count-' + i);
    renderConsignesFor(s.prenom, null, countEl);
  });
  showPage('global');
  setupPDF();

  // 2. Firebase : charger staff + overrides + écoutes temps réel
  if (typeof initFirebase === 'function') {
    await initFirebase();

    // Charger le staff depuis Firebase (Google Sheets → Firebase)
    const fbStaff = await syncGetStaff();
    if (fbStaff && fbStaff.length > 0) {
      rebuildAllPages(fbStaff);
    } else {
      // Pas de staff Firebase → essayer le cache local
      const cached = getCachedStaff();
      if (cached && cached.length > 0) {
        rebuildAllPages(cached);
        showSyncToast('Planning chargé depuis le cache local');
      }
    }

    // Charger les overrides admin
    await syncGetOverrides();
    onRemoteChange();

    // Écouter les mises à jour en temps réel
    startRealTimeSync(
      () => onRemoteChange(),
      () => {
        STAFF.forEach((s, i) => {
          const ct = document.getElementById('consigne-count-' + i);
          renderConsignesFor(s.prenom, null, ct);
        });
        showSyncToast('Consignes mises à jour ↗');
      }
    );

    // Écouter les mises à jour du staff (Google Sheets)
    listenStaffUpdates(newStaff => {
      rebuildAllPages(newStaff);
      // Ré-appliquer les overrides après rebuild
      syncGetOverrides().then(() => onRemoteChange());
    });
  }
}

document.addEventListener('DOMContentLoaded', init);

