'use strict';

// ===== STATE =====
let profiles = [];
let currentProfile = null;
let data = {};
let currentView = 'dashboard';
const today = new Date().toISOString().slice(0, 10);

// ===== MOTIVATIONAL QUOTES =====
const QUOTES = [
  "Chaque petit pas compte. Tu es sur la bonne voie 🌟",
  "La constance est plus puissante que la perfection.",
  "Un jour à la fois, un pas à la fois.",
  "Tu n'as pas à être parfait·e, juste persistant·e.",
  "Regarde jusqu'où tu es arrivé·e, pas ce qu'il reste à faire.",
  "Le corps accomplit ce que l'esprit croit possible.",
  "Prends soin de toi aujourd'hui — tu le mérites.",
  "Chaque journée est une nouvelle opportunité.",
  "Le progrès, pas la perfection.",
  "Tu es plus fort·e que tu ne le crois.",
];

const ACTIVITIES = [
  { id: 'marche', icon: '🚶', label: 'Marche' },
  { id: 'course', icon: '🏃', label: 'Course' },
  { id: 'velo', icon: '🚴', label: 'Vélo' },
  { id: 'natation', icon: '🏊', label: 'Natation' },
  { id: 'muscu', icon: '🏋️', label: 'Muscu' },
  { id: 'yoga', icon: '🧘', label: 'Yoga' },
  { id: 'danse', icon: '💃', label: 'Danse' },
  { id: 'autre', icon: '⚡', label: 'Autre' },
];

const MOODS = [
  { val: 5, emoji: '😄', label: 'Super' },
  { val: 4, emoji: '😊', label: 'Bien' },
  { val: 3, emoji: '😐', label: 'Moyen' },
  { val: 2, emoji: '😔', label: 'Bas' },
  { val: 1, emoji: '😩', label: 'Dur' },
];

const EMOJIS = ['🌸','🌟','🦋','🌺','💪','🌈','🎯','🦊','🌙','⭐','🍀','🌻','🎀','🦄','🐝','🌷'];

const BADGES = [
  { id: 'first_weigh', icon: '⚖️', label: 'Première pesée', check: d => d.weights.length >= 1 },
  { id: 'first_measure', icon: '📏', label: 'Premières mesures', check: d => d.measures.length >= 1 },
  { id: 'streak_7', icon: '🔥', label: '7 jours de suivi', check: d => getStreak(d) >= 7 },
  { id: 'streak_30', icon: '🏆', label: '30 jours de suivi', check: d => getStreak(d) >= 30 },
  { id: 'minus_1', icon: '🎉', label: '-1 kg', check: (d, p) => getLost(d, p) >= 1 },
  { id: 'minus_3', icon: '🌟', label: '-3 kg', check: (d, p) => getLost(d, p) >= 3 },
  { id: 'minus_5', icon: '💫', label: '-5 kg', check: (d, p) => getLost(d, p) >= 5 },
  { id: 'minus_10', icon: '🏅', label: '-10 kg', check: (d, p) => getLost(d, p) >= 10 },
  { id: 'goal', icon: '🎯', label: 'Objectif atteint !', check: (d, p) => p.goalWeight && getLastWeight(d) <= p.goalWeight },
  { id: 'hydration', icon: '💧', label: '8 verres en un jour', check: d => d.water.some(w => w.glasses >= 8) },
  { id: 'journal_7', icon: '📖', label: '7 notes de journal', check: d => d.journal.length >= 7 },
];

// ===== STORAGE =====
function loadProfiles() {
  try { profiles = JSON.parse(localStorage.getItem('wl_profiles') || '[]'); } catch { profiles = []; }
}
function saveProfiles() {
  localStorage.setItem('wl_profiles', JSON.stringify(profiles));
}
function loadData(profileId) {
  try { data = JSON.parse(localStorage.getItem(`wl_data_${profileId}`) || 'null') || emptyData(); }
  catch { data = emptyData(); }
}
function saveData() {
  if (!currentProfile) return;
  localStorage.setItem(`wl_data_${currentProfile.id}`, JSON.stringify(data));
}
function emptyData() {
  return { weights: [], measures: [], water: [], activity: [], mood: [], journal: [], calories: [] };
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== HELPERS =====
function getLastWeight(d) {
  if (!d.weights.length) return null;
  return d.weights[d.weights.length - 1].value;
}
function getLost(d, p) {
  const start = p.startWeight || d.weights[0]?.value;
  const last = getLastWeight(d);
  if (!start || !last) return 0;
  return Math.max(0, start - last);
}
function getGoalPct(d, p) {
  if (!p.startWeight || !p.goalWeight) return 0;
  const lost = getLost(d, p);
  const total = p.startWeight - p.goalWeight;
  if (total <= 0) return 100;
  return Math.min(100, Math.round((lost / total) * 100));
}
function getStreak(d) {
  if (!d.weights.length) return 0;
  const dates = [...new Set(d.weights.map(w => w.date))].sort();
  let streak = 0;
  let cursor = new Date(today);
  for (let i = dates.length - 1; i >= 0; i--) {
    const d2 = dates[i];
    const diff = Math.round((cursor - new Date(d2)) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = new Date(d2); }
    else break;
  }
  return streak;
}
function getWeightToday(d) {
  return d.weights.find(w => w.date === today) || null;
}
function getWaterToday(d) {
  return d.water.find(w => w.date === today)?.glasses || 0;
}
function getMoodToday(d) {
  return d.mood.find(m => m.date === today)?.value || null;
}
function getActivityToday(d) {
  return d.activity.find(a => a.date === today)?.types || [];
}
function getCaloriesToday(d) {
  return d.calories.find(c => c.date === today)?.value || null;
}
function calcIMC(weight, heightCm) {
  if (!weight || !heightCm) return null;
  return weight / ((heightCm / 100) ** 2);
}
function imcCategory(imc) {
  if (imc < 18.5) return { label: 'Maigreur', cls: 'maigreur' };
  if (imc < 25)   return { label: 'Normal', cls: 'normal' };
  if (imc < 30)   return { label: 'Surpoids', cls: 'surpoids' };
  return { label: 'Obésité', cls: 'obese' };
}
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtDateLong(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function checkNewBadges() {
  const prev = new Set(data.badges || []);
  const earned = [];
  BADGES.forEach(b => {
    if (!prev.has(b.id) && b.check(data, currentProfile)) {
      earned.push(b);
      prev.add(b.id);
    }
  });
  if (earned.length) {
    data.badges = [...prev];
    saveData();
    showBadgeToast(earned[0]);
  }
}
function showBadgeToast(badge) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999;max-width:300px;width:90%;';
  toast.innerHTML = `<div class="badge-toast">${badge.icon} ${badge.label} débloqué !</div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== PROFILE SCREEN =====
function renderProfileScreen() {
  document.getElementById('profile-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');

  const list = document.getElementById('profile-list');
  if (!profiles.length) {
    list.innerHTML = `<div style="color:var(--text3);font-size:14px;text-align:center;width:100%;padding:10px 0 20px;">Aucun profil — créez le premier !</div>`;
  } else {
    list.innerHTML = profiles.map(p => `
      <div class="profile-card" data-id="${p.id}">
        <div class="profile-card-emoji">${p.emoji}</div>
        <div class="profile-card-name">${esc(p.name)}</div>
      </div>`).join('');
    list.querySelectorAll('.profile-card').forEach(card => {
      card.addEventListener('click', () => enterProfile(card.dataset.id));
    });
  }

  document.getElementById('btn-new-profile').onclick = () => showNewProfileModal();
}

function enterProfile(id) {
  const profile = profiles.find(p => p.id === id);
  if (!profile) return;
  currentProfile = profile;
  loadData(profile.id);
  document.getElementById('profile-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('header-emoji').textContent = profile.emoji;
  document.getElementById('header-name').textContent = profile.name;
  setView('dashboard');
  bindNav();
  document.getElementById('header-profile-btn').onclick = () => {
    currentProfile = null; data = {};
    renderProfileScreen();
  };
  document.getElementById('header-settings-btn').onclick = () => showSettingsModal();
}

// ===== NAV =====
function bindNav() {
  document.getElementById('bottom-nav').querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => setView(btn.dataset.view);
  });
}
function setView(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if      (view === 'dashboard') renderDashboard();
  else if (view === 'poids')     renderPoids();
  else if (view === 'corps')     renderCorps();
  else if (view === 'jour')      renderJour();
  else if (view === 'journal')   renderJournal();
}

// ===== DASHBOARD =====
function renderDashboard() {
  const main = document.getElementById('main-content');
  const lastW = getLastWeight(data);
  const pct = getGoalPct(data, currentProfile);
  const streak = getStreak(data);
  const lost = getLost(data, currentProfile);
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const waterToday = getWaterToday(data);
  const moodToday = getMoodToday(data);
  const actToday = getActivityToday(data);
  const weightToday = getWeightToday(data);
  const calToday = getCaloriesToday(data);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonjour' : 'Bonsoir';

  main.innerHTML = `
    <div class="dashboard-view">
      <div class="greeting">${greeting}, <span>${esc(currentProfile.name)}</span> ${currentProfile.emoji}</div>

      <div class="hero-card">
        <div class="card-label card-label-light">Poids actuel</div>
        <div class="hero-numbers">
          <div class="hero-weight">${lastW ? lastW.toFixed(1) : '—'}</div>
          <div class="hero-unit">kg</div>
        </div>
        ${currentProfile.goalWeight ? `
          <div class="hero-goal">Objectif : ${currentProfile.goalWeight} kg · Il reste ${Math.max(0, (lastW || 0) - currentProfile.goalWeight).toFixed(1)} kg</div>
          <div class="progress-bar-wrap" style="margin-top:10px;">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="hero-progress-pct">${pct}% de l'objectif atteint</div>
        ` : `<div class="hero-goal" style="opacity:.6">Définissez un objectif dans les réglages</div>`}
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">${lost > 0 ? '-' + lost.toFixed(1) : '0'}</div>
          <div class="stat-label">kg perdus</div>
          ${lost > 0 ? `<div class="stat-delta good">↓ Bravo !</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-value">${streak}</div>
          <div class="stat-label">jours consécutifs</div>
          ${streak >= 3 ? `<div class="stat-delta good">🔥 En forme !</div>` : ''}
        </div>
      </div>

      <div class="today-section">
        <div class="today-title">Aujourd'hui</div>
        <div class="today-items">
          <div class="today-item ${weightToday ? 'done' : ''}" id="dash-weight">
            <div class="today-item-icon">⚖️</div>
            <div class="today-item-label">Pesée</div>
            <div class="today-item-val">${weightToday ? weightToday.value + ' kg' : 'À faire'}</div>
          </div>
          <div class="today-item ${waterToday >= 8 ? 'done' : ''}" id="dash-water">
            <div class="today-item-icon">💧</div>
            <div class="today-item-label">Eau</div>
            <div class="today-item-val">${waterToday}/8</div>
          </div>
          <div class="today-item ${actToday.length > 0 ? 'done' : ''}" id="dash-activity">
            <div class="today-item-icon">🏃</div>
            <div class="today-item-label">Activité</div>
            <div class="today-item-val">${actToday.length > 0 ? actToday.length + ' activité' + (actToday.length > 1 ? 's' : '') : 'À faire'}</div>
          </div>
          <div class="today-item ${moodToday ? 'done' : ''}" id="dash-mood">
            <div class="today-item-icon">${moodToday ? MOODS.find(m => m.val === moodToday)?.emoji || '😊' : '🙂'}</div>
            <div class="today-item-label">Humeur</div>
            <div class="today-item-val">${moodToday ? MOODS.find(m => m.val === moodToday)?.label : 'À faire'}</div>
          </div>
        </div>
      </div>

      <div class="motivation-card">
        <div class="motivation-text">"${quote}"</div>
      </div>
    </div>`;

  document.getElementById('dash-weight').onclick = () => setView('poids');
  document.getElementById('dash-water').onclick = () => setView('jour');
  document.getElementById('dash-activity').onclick = () => setView('jour');
  document.getElementById('dash-mood').onclick = () => setView('jour');
}

// ===== POIDS =====
function renderPoids() {
  const main = document.getElementById('main-content');
  const lastW = getLastWeight(data);
  const imc = calcIMC(lastW, currentProfile.height);
  const imcCat = imc ? imcCategory(imc) : null;

  main.innerHTML = `
    <div class="poids-view">
      <div class="weigh-in-card">
        <div class="weigh-title">⚖️ Saisir mon poids</div>
        <div class="weight-input-row">
          <input type="number" class="weight-input" id="weight-val" placeholder="70.5"
            step="0.1" min="30" max="300" value="${getWeightToday(data)?.value || ''}">
          <span class="weight-unit-lbl">kg</span>
          <button class="btn-save-weight" id="btn-save-weight">Enregistrer</button>
        </div>
      </div>

      ${lastW && currentProfile.height ? `
      <div class="imc-card">
        <div class="imc-row">
          <div>
            <div class="card-label">Indice de masse corporelle</div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
              <div class="imc-val">${imc.toFixed(1)}</div>
              <div class="imc-cat ${imcCat.cls}">${imcCat.label}</div>
            </div>
          </div>
        </div>
      </div>` : ''}

      <div class="chart-card">
        <div class="chart-title">
          <span>Courbe de poids</span>
          ${data.weights.length > 1 ? `<span style="font-size:11px;color:var(--text3);font-weight:400;">${data.weights.length} mesures</span>` : ''}
        </div>
        ${data.weights.length < 2 ? `<div class="chart-empty">📈 Ajoutez au moins 2 pesées pour voir la courbe</div>`
          : `<svg id="weight-chart" height="160"></svg>`}
      </div>

      <div class="weight-history">
        <div class="weight-history-header">Historique</div>
        ${!data.weights.length ? `<div class="empty-state"><div class="empty-text">Aucune pesée enregistrée</div></div>` :
          [...data.weights].reverse().slice(0, 20).map((w, i, arr) => {
            const prev = arr[i + 1];
            const delta = prev ? w.value - prev.value : null;
            const deltaStr = delta !== null ? (delta > 0 ? `<span style="color:var(--orange)">+${delta.toFixed(1)}</span>` : delta < 0 ? `<span style="color:var(--green)">${delta.toFixed(1)}</span>` : '<span style="color:var(--text3)">—</span>') : '';
            return `<div class="weight-history-item">
              <div class="weight-history-date">${fmtDate(w.date)}</div>
              <div class="weight-history-val">${w.value} kg</div>
              <div class="weight-history-delta">${deltaStr}</div>
              <button class="weight-history-del" data-date="${w.date}" data-val="${w.value}">✕</button>
            </div>`;
          }).join('')}
      </div>
    </div>`;

  document.getElementById('btn-save-weight').onclick = () => {
    const val = parseFloat(document.getElementById('weight-val').value);
    if (!val || val < 30 || val > 300) return;
    data.weights = data.weights.filter(w => w.date !== today);
    data.weights.push({ date: today, value: val });
    data.weights.sort((a, b) => a.date.localeCompare(b.date));
    if (!currentProfile.startWeight) { currentProfile.startWeight = val; saveProfiles(); }
    saveData(); checkNewBadges(); renderPoids();
  };

  document.querySelectorAll('.weight-history-del').forEach(btn => {
    btn.onclick = () => {
      data.weights = data.weights.filter(w => !(w.date === btn.dataset.date && w.value == btn.dataset.val));
      saveData(); renderPoids();
    };
  });

  if (data.weights.length >= 2) drawWeightChart();
}

function drawWeightChart() {
  const svg = document.getElementById('weight-chart');
  if (!svg) return;
  const W = svg.parentElement.clientWidth - 40;
  const H = 160;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);

  const weights = data.weights.slice(-30);
  const vals = weights.map(w => w.value);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const pad = { l: 36, r: 12, t: 14, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const x = i => pad.l + (i / (weights.length - 1)) * iw;
  const y = v => pad.t + (1 - (v - min) / (max - min)) * ih;

  // Goal line
  if (currentProfile.goalWeight) {
    const gy = y(currentProfile.goalWeight);
    if (gy >= pad.t && gy <= pad.t + ih) {
      svg.innerHTML += `<line x1="${pad.l}" y1="${gy}" x2="${pad.l + iw}" y2="${gy}" stroke="#ec4899" stroke-width="1" stroke-dasharray="4,3" opacity=".5"/>`;
    }
  }

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const yy = pad.t + (i / 4) * ih;
    const vv = max - (i / 4) * (max - min);
    svg.innerHTML += `<line x1="${pad.l}" y1="${yy}" x2="${pad.l + iw}" y2="${yy}" stroke="#e9e4f7" stroke-width="1"/>
      <text x="${pad.l - 4}" y="${yy + 4}" text-anchor="end" font-size="9" fill="#a89cc0">${vv.toFixed(0)}</text>`;
  }

  // Path
  const pts = weights.map((w, i) => `${x(i)},${y(w.value)}`).join(' ');
  const areaD = `M${x(0)},${y(weights[0].value)} ` +
    weights.map((w, i) => `L${x(i)},${y(w.value)}`).join(' ') +
    ` L${x(weights.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;

  svg.innerHTML += `
    <defs>
      <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity=".2"/>
        <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#grd)"/>
    <polyline points="${pts}" fill="none" stroke="url(#grad2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <defs><linearGradient id="grad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs>`;

  // Dots
  weights.forEach((w, i) => {
    svg.innerHTML += `<circle cx="${x(i)}" cy="${y(w.value)}" r="3" fill="#7c3aed"/>`;
  });

  // Last label
  const last = weights[weights.length - 1];
  svg.innerHTML += `<text x="${x(weights.length - 1)}" y="${y(last.value) - 8}" text-anchor="middle" font-size="10" fill="#7c3aed" font-weight="700">${last.value}</text>`;
}

// ===== CORPS =====
function renderCorps() {
  const main = document.getElementById('main-content');
  const lastM = data.measures.length ? data.measures[data.measures.length - 1] : null;
  const firstM = data.measures.length ? data.measures[0] : null;

  const fields = [
    { key: 'waist',  label: 'Tour de taille', icon: '📐' },
    { key: 'hips',   label: 'Hanches', icon: '🔵' },
    { key: 'chest',  label: 'Poitrine', icon: '🔴' },
    { key: 'arms',   label: 'Bras', icon: '💪' },
    { key: 'thighs', label: 'Cuisses', icon: '🦵' },
  ];

  main.innerHTML = `
    <div class="corps-view">
      <div class="measures-card">
        <div class="weigh-title">📏 Mes mensurations</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:16px;">En centimètres</div>
        <div class="measures-grid">
          ${fields.map(f => `
            <div class="measure-field">
              <label class="measure-label">${f.icon} ${f.label}</label>
              <input type="number" class="measure-input" data-key="${f.key}"
                placeholder="${lastM?.[f.key] || '—'}"
                value="${lastM?.[f.key] || ''}" min="30" max="300" step="0.5">
            </div>`).join('')}
        </div>
        <button class="btn-save-measures" id="btn-save-measures">Enregistrer les mesures</button>
      </div>

      ${data.measures.length > 1 ? `
      <div class="measures-history">
        <div class="measures-history-header">Historique des mesures</div>
        ${[...data.measures].reverse().map((m, i, arr) => {
          const prev = arr[i + 1];
          return `<div class="measures-history-item">
            <div class="measures-history-date">${fmtDate(m.date)}</div>
            <div class="measures-pills">
              ${fields.filter(f => m[f.key]).map(f => {
                const delta = prev?.[f.key] ? m[f.key] - prev[f.key] : null;
                const dStr = delta !== null && delta !== 0 ? `<span class="mdelta ${delta < 0 ? 'good' : 'bad'}"> (${delta > 0 ? '+' : ''}${delta.toFixed(1)})</span>` : '';
                return `<span class="measure-pill"><strong>${m[f.key]}</strong> cm ${f.label.split(' ')[f.label.split(' ').length-1].toLowerCase()}${dStr}</span>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>` : data.measures.length === 1 ? `
      <div class="measures-history">
        <div class="measures-history-header">Historique des mesures</div>
        <div class="measures-history-item">
          <div class="measures-history-date">${fmtDate(data.measures[0].date)}</div>
          <div class="measures-pills">
            ${fields.filter(f => data.measures[0][f.key]).map(f =>
              `<span class="measure-pill"><strong>${data.measures[0][f.key]}</strong> cm ${f.label}</span>`
            ).join('')}
          </div>
        </div>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon">📏</div>
        <div class="empty-text">Aucune mesure encore.<br>Saisissez vos mensurations pour suivre votre évolution.</div>
      </div>`}
    </div>`;

  document.getElementById('btn-save-measures').onclick = () => {
    const entry = { date: today };
    let hasAny = false;
    fields.forEach(f => {
      const v = parseFloat(document.querySelector(`.measure-input[data-key="${f.key}"]`).value);
      if (v && v > 0) { entry[f.key] = v; hasAny = true; }
    });
    if (!hasAny) return;
    data.measures = data.measures.filter(m => m.date !== today);
    data.measures.push(entry);
    data.measures.sort((a, b) => a.date.localeCompare(b.date));
    saveData(); checkNewBadges(); renderCorps();
  };
}

// ===== JOURNÉE =====
function renderJour() {
  const main = document.getElementById('main-content');
  const waterToday = getWaterToday(data);
  const moodToday = getMoodToday(data);
  const actToday = getActivityToday(data);
  const calToday = getCaloriesToday(data);

  main.innerHTML = `
    <div class="jour-view">

      <div class="water-card">
        <div class="water-title">💧 Hydratation</div>
        <div class="water-sub">Objectif : 8 verres par jour</div>
        <div class="water-glasses">
          ${Array.from({length: 8}, (_, i) => `
            <button class="glass-btn ${i < waterToday ? 'filled' : ''}" data-glass="${i + 1}">
              ${i < waterToday ? '💧' : '🫙'}
            </button>`).join('')}
        </div>
        <div class="water-total">${waterToday}/8 verre${waterToday > 1 ? 's' : ''} aujourd'hui</div>
      </div>

      <div class="activity-card">
        <div class="activity-title">🏃 Activité physique</div>
        <div class="activity-grid">
          ${ACTIVITIES.map(a => `
            <button class="activity-btn ${actToday.includes(a.id) ? 'active' : ''}" data-act="${a.id}">
              <span class="activity-btn-icon">${a.icon}</span>
              ${a.label}
            </button>`).join('')}
        </div>
      </div>

      <div class="mood-card">
        <div class="mood-title">😊 Comment je me sens</div>
        <div class="mood-options">
          ${MOODS.map(m => `
            <button class="mood-btn ${moodToday === m.val ? 'active' : ''}" data-mood="${m.val}">
              <span class="mood-emoji">${m.emoji}</span>
              ${m.label}
            </button>`).join('')}
        </div>
      </div>

      <div class="calories-card">
        <div class="cal-title">🍽️ Calories</div>
        <div class="cal-sub">Optionnel — une estimation suffit</div>
        <div class="cal-input-row">
          <input type="number" class="cal-input" id="cal-input" placeholder="1800"
            value="${calToday || ''}" min="0" max="9999">
          <span style="font-size:13px;color:var(--text3);font-weight:600;">kcal</span>
          <button class="btn-save-cal" id="btn-save-cal">OK</button>
        </div>
        ${calToday ? `<div style="font-size:12px;color:var(--text3);margin-top:8px;">${calToday} kcal enregistrées aujourd'hui</div>` : ''}
      </div>

    </div>`;

  // Water
  document.querySelectorAll('.glass-btn').forEach(btn => {
    btn.onclick = () => {
      const g = parseInt(btn.dataset.glass);
      const cur = getWaterToday(data);
      const newVal = cur === g ? g - 1 : g;
      data.water = data.water.filter(w => w.date !== today);
      if (newVal > 0) data.water.push({ date: today, glasses: newVal });
      saveData(); checkNewBadges(); renderJour();
    };
  });

  // Activity
  document.querySelectorAll('.activity-btn').forEach(btn => {
    btn.onclick = () => {
      const act = btn.dataset.act;
      let cur = [...getActivityToday(data)];
      if (cur.includes(act)) cur = cur.filter(a => a !== act);
      else cur.push(act);
      data.activity = data.activity.filter(a => a.date !== today);
      if (cur.length) data.activity.push({ date: today, types: cur });
      saveData(); renderJour();
    };
  });

  // Mood
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = () => {
      const val = parseInt(btn.dataset.mood);
      data.mood = data.mood.filter(m => m.date !== today);
      data.mood.push({ date: today, value: val });
      saveData(); renderJour();
    };
  });

  // Calories
  document.getElementById('btn-save-cal').onclick = () => {
    const val = parseInt(document.getElementById('cal-input').value);
    if (!val || val <= 0) return;
    data.calories = (data.calories || []).filter(c => c.date !== today);
    data.calories.push({ date: today, value: val });
    saveData(); renderJour();
  };
}

// ===== JOURNAL =====
function renderJournal() {
  const main = document.getElementById('main-content');
  const todayEntry = data.journal.find(j => j.date === today);
  const earnedBadges = new Set(data.badges || []);

  main.innerHTML = `
    <div class="journal-view">
      <div class="journal-write">
        <div class="journal-date">${fmtDateLong(today)}</div>
        <textarea class="journal-textarea" id="journal-text"
          placeholder="Comment s'est passée votre journée ? Vos ressentis, vos victoires, vos défis…">${todayEntry?.text || ''}</textarea>
        <button class="btn-save-journal" id="btn-save-journal">Enregistrer la note</button>
      </div>

      <div class="badges-section">
        <div class="badges-title">🏅 Mes badges</div>
        <div class="badges-grid">
          ${BADGES.map(b => `
            <div class="badge-item ${earnedBadges.has(b.id) ? 'earned' : 'locked'}">
              <span class="badge-icon">${b.icon}</span>
              ${b.label}
            </div>`).join('')}
        </div>
      </div>

      ${data.journal.length > 0 ? `
      <div class="journal-entries">
        <div class="journal-entry-title">Notes précédentes</div>
        ${[...data.journal].reverse().slice(0, 20).map(j => `
          <div class="journal-entry">
            <div class="journal-entry-date">${fmtDateLong(j.date)}</div>
            <div class="journal-entry-text">${esc(j.text)}</div>
          </div>`).join('')}
      </div>` : ''}
    </div>`;

  document.getElementById('btn-save-journal').onclick = () => {
    const text = document.getElementById('journal-text').value.trim();
    if (!text) return;
    data.journal = data.journal.filter(j => j.date !== today);
    data.journal.push({ date: today, text });
    data.journal.sort((a, b) => a.date.localeCompare(b.date));
    saveData(); checkNewBadges(); renderJournal();
  };
}

// ===== MODALS =====
function showNewProfileModal() {
  let selectedEmoji = EMOJIS[0];
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Nouveau profil</div>

    <div class="section-divider">Choisissez votre emoji</div>
    <div class="emoji-grid">
      ${EMOJIS.map(e => `<div class="emoji-opt ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
    </div>

    <div class="section-divider">Vos informations</div>
    <input type="text" class="modal-input" id="new-name" placeholder="Votre prénom" maxlength="20">

    <div class="modal-input-row">
      <span class="modal-input-label">Taille (cm)</span>
      <input type="number" class="modal-input" id="new-height" placeholder="165" min="100" max="250" style="margin-bottom:0;flex:1;">
    </div>
    <div class="modal-input-row">
      <span class="modal-input-label">Poids actuel</span>
      <input type="number" class="modal-input" id="new-weight" placeholder="70" step="0.1" style="margin-bottom:0;flex:1;">
    </div>
    <div class="modal-input-row">
      <span class="modal-input-label">Objectif (kg)</span>
      <input type="number" class="modal-input" id="new-goal" placeholder="60" step="0.1" style="margin-bottom:0;flex:1;">
    </div>

    <div style="margin-top:20px;">
      <button class="btn-modal-primary" id="btn-create-profile">Créer mon profil</button>
      <button class="btn-modal-secondary" id="btn-cancel-modal">Annuler</button>
    </div>`;

  document.getElementById('modal-overlay').classList.remove('hidden');

  box.querySelectorAll('.emoji-opt').forEach(opt => {
    opt.onclick = () => {
      selectedEmoji = opt.dataset.emoji;
      box.querySelectorAll('.emoji-opt').forEach(o => o.classList.toggle('selected', o === opt));
    };
  });

  document.getElementById('btn-create-profile').onclick = () => {
    const name = document.getElementById('new-name').value.trim();
    if (!name) { document.getElementById('new-name').focus(); return; }
    const height = parseFloat(document.getElementById('new-height').value) || null;
    const weight = parseFloat(document.getElementById('new-weight').value) || null;
    const goal = parseFloat(document.getElementById('new-goal').value) || null;
    const profile = { id: genId(), name, emoji: selectedEmoji, height, startWeight: weight, goalWeight: goal, createdAt: today };
    profiles.push(profile);
    saveProfiles();
    closeModal();
    if (weight) {
      currentProfile = profile;
      loadData(profile.id);
      data.weights.push({ date: today, value: weight });
      saveData();
      currentProfile = null; data = {};
    }
    renderProfileScreen();
  };

  document.getElementById('btn-cancel-modal').onclick = closeModal;
  document.getElementById('modal-overlay').onclick = e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); };
}

function showSettingsModal() {
  const p = currentProfile;
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">⚙️ Réglages</div>

    <div class="section-divider">Profil</div>
    <div class="modal-input-row">
      <span class="modal-input-label">Prénom</span>
      <input type="text" class="modal-input" id="set-name" value="${esc(p.name)}" maxlength="20" style="margin-bottom:0;flex:1;">
    </div>
    <div class="modal-input-row">
      <span class="modal-input-label">Taille (cm)</span>
      <input type="number" class="modal-input" id="set-height" value="${p.height || ''}" placeholder="165" style="margin-bottom:0;flex:1;">
    </div>

    <div class="section-divider">Objectifs</div>
    <div class="modal-input-row">
      <span class="modal-input-label">Poids de départ</span>
      <input type="number" class="modal-input" id="set-start" value="${p.startWeight || ''}" step="0.1" placeholder="75" style="margin-bottom:0;flex:1;">
    </div>
    <div class="modal-input-row">
      <span class="modal-input-label">Objectif (kg)</span>
      <input type="number" class="modal-input" id="set-goal" value="${p.goalWeight || ''}" step="0.1" placeholder="60" style="margin-bottom:0;flex:1;">
    </div>
    <div class="modal-input-row">
      <span class="modal-input-label">Date objectif</span>
      <input type="date" class="modal-input" id="set-goaldate" value="${p.goalDate || ''}" style="margin-bottom:0;flex:1;">
    </div>

    <div style="margin-top:20px;">
      <button class="btn-modal-primary" id="btn-save-settings">Enregistrer</button>
      <button class="btn-modal-secondary" id="btn-cancel-settings">Fermer</button>
      <button class="btn-modal-danger" id="btn-delete-profile">Supprimer ce profil</button>
    </div>`;

  document.getElementById('modal-overlay').classList.remove('hidden');

  document.getElementById('btn-save-settings').onclick = () => {
    const name = document.getElementById('set-name').value.trim();
    if (!name) return;
    p.name = name;
    p.height = parseFloat(document.getElementById('set-height').value) || null;
    p.startWeight = parseFloat(document.getElementById('set-start').value) || null;
    p.goalWeight = parseFloat(document.getElementById('set-goal').value) || null;
    p.goalDate = document.getElementById('set-goaldate').value || null;
    saveProfiles();
    document.getElementById('header-name').textContent = p.name;
    closeModal(); setView(currentView);
  };

  document.getElementById('btn-cancel-settings').onclick = closeModal;

  document.getElementById('btn-delete-profile').onclick = () => {
    if (!confirm(`Supprimer le profil de ${p.name} ? Toutes les données seront perdues.`)) return;
    profiles = profiles.filter(pr => pr.id !== p.id);
    localStorage.removeItem(`wl_data_${p.id}`);
    saveProfiles();
    closeModal();
    currentProfile = null; data = {};
    renderProfileScreen();
  };

  document.getElementById('modal-overlay').onclick = e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-box').innerHTML = '';
}

// ===== UTILS =====
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== SW =====
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadProfiles();
  registerSW();
  renderProfileScreen();
});
