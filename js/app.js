// ============================================
// app.js — Logique principale de Météo LPAOSF
// ============================================

import { REGIONS, REGION_BY_KEY, loadForecast, getCachedForecast, MAX_AGE_MS } from './api.js';
import {
  VARIABLES, VARIABLE_ORDER, colorFor, textOn, formatValue,
  varLabel, varShort, classLabel, describeWeather, weatherIcon, windDirection
} from './config.js';
import { initMap, updateMap, refreshMapLanguage, showUserLocation } from './map.js';
import { t, getLang, setLang, locale, applyStatic, errorText } from './i18n.js';

/* ---------- Préférences (mémorisées dans le navigateur) ---------- */
const PREF_KEY = 'lpaosf:prefs:v2';
function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ region: state.region, varKey: state.varKey })); } catch { /* ignore */ }
}

/* ---------- Lien partageable : #r=dakar&v=tempMax&d=2026-10-14 ---------- */
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return { region: p.get('r'), varKey: p.get('v'), date: p.get('d') };
}
function writeHash() {
  const p = new URLSearchParams({ r: state.region, v: state.varKey });
  if (state.date && state.date !== availableDates()[0]) p.set('d', state.date);
  history.replaceState(null, '', `#${p}`);
}

const prefs = readPrefs();
const fromHash = readHash();
const state = {
  data: null,
  fetchedAt: null,
  fromCache: false,
  error: null,
  loading: false,
  region: [fromHash.region, prefs.region].find(k => REGION_BY_KEY[k]) || 'dakar',
  varKey: [fromHash.varKey, prefs.varKey].find(k => VARIABLES[k]) || 'tempMax',
  date: /^\d{4}-\d{2}-\d{2}$/.test(fromHash.date || '') ? fromHash.date : null,
  nearest: null
};

/* ---------- DOM ---------- */
const $ = id => document.getElementById(id);
const el = {
  status: $('status'), refresh: $('refreshBtn'), lang: $('langBtn'), locate: $('locateBtn'), share: $('shareBtn'),
  banner: $('banner'), regionSelect: $('regionSelect'), chips: $('variableChips'), days: $('dayStrip'),
  mapSubtitle: $('mapSubtitle'), mapError: $('mapError'), legend: $('legend'),
  ranking: $('rankingList'), detail: $('detail'), footer: $('footerText'), toast: $('toast')
};

/* ---------- Dates (toujours en heure de Dakar) ---------- */
const TZ = 'Africa/Dakar';
function todayDakar() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function nowHourDakar() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date());
}
/** Formate une date « AAAA-MM-JJ » sans décalage de fuseau. */
function fmtDate(iso, opts) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale(), { timeZone: 'UTC', ...opts });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(locale(), { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
function fmtDayMonth(iso) { return fmtDate(iso, { day: 'numeric', month: 'long' }); }
function relativeDay(iso) {
  const today = todayDakar();
  if (iso === today) return t('day.today');
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (iso === tomorrow) return t('day.tomorrow');
  return capitalize(fmtDate(iso, { weekday: 'long' }));
}
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Jours disponibles à partir d'aujourd'hui (un cache de la veille est recadré). */
function availableDates() {
  if (!state.data) return [];
  const today = todayDakar();
  return state.data.dates.filter(d => d >= today);
}

function dayFor(regionKey, date) {
  return state.data?.regions[regionKey]?.days.find(d => d.date === date) || null;
}

/* ---------- Contrôles ---------- */
function buildControls() {
  el.regionSelect.innerHTML = REGIONS
    .slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map(r => `<option value="${r.key}">${r.name}</option>`).join('');
  el.regionSelect.value = state.region;
  el.regionSelect.addEventListener('change', () => selectRegion(el.regionSelect.value, { scroll: false }));

  el.chips.addEventListener('click', e => {
    const b = e.target.closest('[data-var]');
    if (!b) return;
    state.varKey = b.dataset.var;
    savePrefs();
    renderAll();
  });

  el.days.addEventListener('click', e => {
    const b = e.target.closest('[data-date]');
    if (!b) return;
    state.date = b.dataset.date;
    renderAll();
  });

  el.detail.addEventListener('click', e => {
    const row = e.target.closest('[data-date]');
    if (row) { state.date = row.dataset.date; renderAll(); }
  });

  el.ranking.addEventListener('click', e => {
    const li = e.target.closest('[data-region]');
    if (li) selectRegion(li.dataset.region);
  });

  el.refresh.addEventListener('click', () => refresh({ force: true }));
  el.lang.addEventListener('click', () => switchLanguage(getLang() === 'fr' ? 'en' : 'fr'));
  el.locate.addEventListener('click', locateMe);
  el.share.addEventListener('click', shareView);
  if (!('geolocation' in navigator)) el.locate.hidden = true;

  window.addEventListener('hashchange', () => {
    const h = readHash();
    if (REGION_BY_KEY[h.region]) state.region = h.region;
    if (VARIABLES[h.varKey]) state.varKey = h.varKey;
    if (h.date) state.date = h.date;
    el.regionSelect.value = state.region;
    renderAll();
  });
}

function renderTexts() {
  applyStatic();
  el.chips.innerHTML = VARIABLE_ORDER.map(k => `
    <button type="button" class="chip" role="radio" data-var="${k}" title="${esc(varLabel(k))}">${esc(varShort(k))}</button>`).join('');
  el.footer.innerHTML =
    `${t('footer.forecast', { link: '<a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>' })} ` +
    t('footer.limits', { link: '<a href="https://www.geoboundaries.org/" target="_blank" rel="noopener">geoBoundaries</a>' });
}

function switchLanguage(lang) {
  setLang(lang);
  renderTexts();
  refreshMapLanguage();
  if (state.data) renderAll();
  else if (state.error) showFatalError(state.error);
  else renderStatus();
}

function selectRegion(key, { scroll = true } = {}) {
  if (!REGION_BY_KEY[key]) return;
  state.region = key;
  el.regionSelect.value = key;
  savePrefs();
  renderAll();
  if (scroll && window.matchMedia('(max-width: 960px)').matches) {
    document.querySelector('.detail-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ---------- Géolocalisation : région du chef-lieu le plus proche ---------- */
function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function locateMe() {
  el.locate.classList.add('is-busy');
  el.status.textContent = t('status.locating');
  navigator.geolocation.getCurrentPosition(pos => {
    el.locate.classList.remove('is-busy');
    const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    const nearest = REGIONS.reduce((best, r) => (distanceKm(me, r) < distanceKm(me, best) ? r : best));
    state.nearest = nearest.key;
    showUserLocation(me.lat, me.lon);
    selectRegion(nearest.key);
  }, () => {
    el.locate.classList.remove('is-busy');
    renderStatus();
    toast(t('error.geo'));
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 });
}

/* ---------- Partage ---------- */
async function shareView() {
  writeHash();
  const url = location.href;
  try {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: `Météo LPAOSF · ${REGION_BY_KEY[state.region].name}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast(t('share.done'));
  } catch { /* partage annulé */ }
}

let toastTimer;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2200);
}

/* ---------- Rendu ---------- */
function renderAll() {
  renderStatus();
  if (!state.data) return;

  const dates = availableDates();
  if (!dates.length) {
    el.detail.innerHTML = `<p class="empty">${t('cache.tooOld')}</p>`;
    return;
  }
  if (!dates.includes(state.date)) state.date = dates[0];

  renderChips();
  renderDays(dates);
  renderMapAndLegend();
  renderRanking();
  renderDetail(dates);
  writeHash();
}

function renderStatus() {
  const { fetchedAt, fromCache, error, loading } = state;
  el.refresh.classList.toggle('is-spinning', loading);
  el.refresh.disabled = loading;

  if (loading && !fetchedAt) el.status.textContent = t('status.loading');
  else if (loading) el.status.textContent = t('status.refreshing');
  else if (fetchedAt) el.status.textContent = (fromCache && error ? t('status.offline') : '') + t('status.updated', { time: fmtTime(fetchedAt) });
  else el.status.textContent = t('status.unavailable');
  el.status.classList.toggle('is-warn', !!(fromCache && error));

  const age = fetchedAt ? Date.now() - fetchedAt : 0;
  if (error && fetchedAt) {
    el.banner.hidden = false;
    el.banner.className = 'banner is-warn';
    const date = new Date(fetchedAt).toLocaleDateString(locale(), { timeZone: TZ, day: 'numeric', month: 'long' });
    el.banner.innerHTML = `${esc(t('banner.failed', { error: errorText(error), date, time: fmtTime(fetchedAt) }))} <button type="button" class="link-btn" data-retry>${t('banner.retry')}</button>`;
    el.banner.querySelector('[data-retry]').onclick = () => refresh({ force: true });
  } else if (age > 6 * 3600 * 1000 && !loading) {
    el.banner.hidden = false;
    el.banner.className = 'banner is-warn';
    el.banner.textContent = t('banner.old');
  } else {
    el.banner.hidden = true;
  }
}

function renderChips() {
  el.chips.querySelectorAll('.chip').forEach(b => {
    const on = b.dataset.var === state.varKey;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', on);
  });
}

function renderDays(dates) {
  el.days.innerHTML = dates.map((d, i) => {
    const on = d === state.date;
    const top = i === 0 ? t('day.todayShort') : capitalize(fmtDate(d, { weekday: 'short' }).replace('.', ''));
    return `<button type="button" class="day${on ? ' is-active' : ''}" role="radio" aria-checked="${on}" data-date="${d}" aria-label="${relativeDay(d)} ${fmtDayMonth(d)}">
      <span class="day-name">${top}</span><span class="day-num">${fmtDate(d, { day: 'numeric' })}</span>
    </button>`;
  }).join('');
  el.days.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function valuesFor(varKey, date) {
  return Object.fromEntries(REGIONS.map(r => [r.key, dayFor(r.key, date)?.[varKey] ?? null]));
}

function renderMapAndLegend() {
  const v = VARIABLES[state.varKey];
  const values = valuesFor(state.varKey, state.date);
  el.mapSubtitle.textContent = `${varLabel(state.varKey)}${v.unit ? ` (${v.unit})` : ''} · ${relativeDay(state.date)} ${fmtDayMonth(state.date)}`;
  updateMap(values, state.varKey, state.region);

  const f = n => n.toLocaleString(locale());
  const labels = v.colors.map((_, i) => {
    if (v.hasClasses) return t(`class.${state.varKey}`)[i];
    const lo = v.breaks[i - 1], hi = v.breaks[i];
    if (i === 0) return `< ${f(hi)}`;
    if (i === v.colors.length - 1) return `≥ ${f(lo)}`;
    return `${f(lo)}–${f(hi)}`;
  });
  el.legend.innerHTML = `<span class="legend-unit">${v.unit || t('legend.index')}</span>` + v.colors.map((c, i) =>
    `<span class="legend-item"><span class="legend-swatch" style="background:${c}"></span>${capitalize(labels[i])}</span>`).join('');
}

function renderRanking() {
  const values = valuesFor(state.varKey, state.date);
  const v = VARIABLES[state.varKey];
  const sorted = REGIONS.slice().sort((a, b) => (values[b.key] ?? -Infinity) - (values[a.key] ?? -Infinity));
  el.ranking.innerHTML = sorted.map(r => {
    const val = values[r.key];
    const c = colorFor(state.varKey, val) || '#cbd5e1';
    return `<li data-region="${r.key}" class="${r.key === state.region ? 'is-selected' : ''}">
      <button type="button"><span class="rank-name">${r.name}</span>
      <span class="rank-val" style="background:${c};color:${textOn(c)}">${formatValue(state.varKey, val)} ${v.unit}</span></button></li>`;
  }).join('');
}

/* ---------- Panneau détail ---------- */
function renderDetail(dates) {
  const region = REGION_BY_KEY[state.region];
  const rd = state.data.regions[state.region];
  const day = dayFor(state.region, state.date);
  if (!day) { el.detail.innerHTML = `<p class="empty">${t('detail.noData')}</p>`; return; }
  const isToday = state.date === todayDakar();
  const wx = describeWeather(isToday ? rd.current.weatherCode : day.weatherCode);

  const hero = isToday ? `
    <div class="hero">
      <div class="hero-main">
        ${weatherIcon(rd.current.weatherCode, { isDay: rd.current.isDay, size: 72 })}
        <div>
          <div class="hero-temp">${formatValue('tempMax', rd.current.temperature)}<span>°C</span></div>
          <div class="hero-cond">${wx.label}</div>
        </div>
      </div>
      <dl class="hero-facts">
        <div><dt>${t('detail.feels')}</dt><dd>${formatValue('tempMax', rd.current.apparent)} °C</dd></div>
        <div><dt>${t('detail.humidity')}</dt><dd>${rd.current.humidity ?? '–'} %</dd></div>
        <div><dt>${t('detail.wind')}</dt><dd>${formatValue('windMax', rd.current.wind)} km/h ${windDirection(rd.current.windDir)}</dd></div>
        <div><dt>${t('detail.day')}</dt><dd>${formatValue('tempMin', day.tempMin)} / ${formatValue('tempMax', day.tempMax)} °C</dd></div>
      </dl>
      <p class="hero-note">${t('detail.modelled', { time: rd.current.time.slice(11, 16) })}</p>
    </div>` : `
    <div class="hero">
      <div class="hero-main">
        ${weatherIcon(day.weatherCode, { size: 72 })}
        <div>
          <div class="hero-temp">${formatValue('tempMax', day.tempMax)}<span>°C</span></div>
          <div class="hero-cond">${wx.label} · ${t('detail.min')} ${formatValue('tempMin', day.tempMin)} °C</div>
        </div>
      </div>
    </div>`;

  const capeLevel = classLabel('cape', day.cape);
  const stats = [
    [t('stat.rain'), `${formatValue('precipSum', day.precipSum)} mm`, t('stat.rainSub', { p: day.precipProbability ?? '–' })],
    [t('stat.windMax'), `${formatValue('windMax', day.windMax)} km/h`, day.windDir != null ? t('stat.windSub', { dir: windDirection(day.windDir) }) : ''],
    [t('stat.humidity'), `${day.humidity ?? '–'} %`, t('stat.humiditySub')],
    [t('stat.uv'), `${formatValue('uv', day.uv)}`, classLabel('uv', day.uv) || ''],
    [t('stat.cape'), `${formatValue('cape', day.cape)} J/kg`, capeLevel ? t('stat.capeSub', { level: capeLevel }) : ''],
    [t('stat.pressure'), `${formatValue('pressure', day.pressure)} hPa`, t('stat.pressureSub')],
    [t('stat.soil'), `${formatValue('soilTemp', day.soilTemp)} °C`, t('stat.soilSub', { v: formatValue('soilMoisture', day.soilMoisture) })],
    [t('stat.sun'), `${day.sunrise ?? '–'}–${day.sunset ?? '–'}`, t('stat.sunSub')]
  ];

  const alerts = attentionPoints(day);
  const nearestNote = state.nearest === state.region
    ? `<p class="nearest-note"><span class="dot" aria-hidden="true"></span>${t('detail.nearest')}</p>` : '';

  el.detail.innerHTML = `
    <div class="detail-head">
      <h2 id="regionName" class="region-name">${region.name}</h2>
      <p class="region-date">${relativeDay(state.date)} ${fmtDayMonth(state.date)}</p>
    </div>
    ${nearestNote}
    ${hero}
    ${alerts.length ? `<ul class="alerts" aria-label="${t('section.alerts')}">${alerts.map(a => `<li class="alert alert-${a.level}">${a.text}</li>`).join('')}</ul>` : ''}
    <div class="stats">${stats.map(([k, v, s]) => `
      <div class="stat"><div class="stat-label">${k}</div><div class="stat-value">${v}</div>${s ? `<div class="stat-sub">${s}</div>` : ''}</div>`).join('')}
    </div>

    <h3 class="section-title">${t('section.hourly')}</h3>
    <div class="hourly-chart" id="hourlyChart">${hourlyChart(day.hours, isToday)}</div>

    <h3 class="section-title">${t('section.forecast', { n: dates.length })}</h3>
    <ol class="forecast">${forecastRows(rd, dates)}</ol>
    <p class="disclaimer">${t('disclaimer')}</p>
  `;
  wireChart();
}

function attentionPoints(day) {
  const out = [];
  const fv = (k, v) => formatValue(k, v);
  if (day.tempMax >= 40) out.push({ level: 'high', text: t('alert.heatHigh', { v: fv('tempMax', day.tempMax) }) });
  else if (day.tempMax >= 37) out.push({ level: 'mid', text: t('alert.heatMid', { v: fv('tempMax', day.tempMax) }) });
  if (day.precipSum >= 20) out.push({ level: 'high', text: t('alert.rainHigh', { v: fv('precipSum', day.precipSum) }) });
  else if (day.precipSum >= 5 && day.precipProbability >= 50) out.push({ level: 'mid', text: t('alert.rainMid', { v: fv('precipSum', day.precipSum), p: day.precipProbability }) });
  if (day.cape >= 2500 && day.precipProbability >= 40) out.push({ level: 'mid', text: t('alert.storm', { v: fv('cape', day.cape) }) });
  if (day.windMax >= 50) out.push({ level: 'high', text: t('alert.wind', { v: fv('windMax', day.windMax) }) });
  if (day.uv >= 11) out.push({ level: 'mid', text: t('alert.uv', { v: fv('uv', day.uv) }) });
  return out;
}

function forecastRows(rd, dates) {
  const days = rd.days.filter(d => dates.includes(d.date));
  const lo = Math.min(...days.map(d => d.tempMin ?? Infinity));
  const hi = Math.max(...days.map(d => d.tempMax ?? -Infinity));
  const span = Math.max(hi - lo, 1);
  return days.map(d => {
    const left = ((d.tempMin - lo) / span) * 100;
    const width = Math.max(((d.tempMax - d.tempMin) / span) * 100, 4);
    const on = d.date === state.date;
    const wx = describeWeather(d.weatherCode);
    return `<li><button type="button" class="fc-row${on ? ' is-active' : ''}" data-date="${d.date}" aria-pressed="${on}">
      <span class="fc-day">${d.date === dates[0] ? t('day.today') : capitalize(fmtDate(d.date, { weekday: 'short', day: 'numeric' }))}</span>
      <span class="fc-icon" title="${wx.label}">${weatherIcon(d.weatherCode, { size: 28 })}</span>
      <span class="fc-rain${d.precipProbability >= 30 ? ' is-visible' : ''}">${d.precipProbability ?? 0} %</span>
      <span class="fc-min">${formatValue('tempMin', d.tempMin)}°</span>
      <span class="fc-bar" aria-hidden="true"><span style="left:${left}%;width:${width}%"></span></span>
      <span class="fc-max">${formatValue('tempMax', d.tempMax)}°</span>
    </button></li>`;
  }).join('');
}

/* ---------- Graphique horaire (SVG, sans dépendance) ---------- */
let chartHours = [];
let chartW = 640;
const CHART_PAD = { l: 34, r: 34, t: 18, b: 28 };

function hourlyChart(hours, isToday) {
  chartHours = hours;
  if (!hours.length) return `<p class="empty">${t('chart.none')}</p>`;
  // Largeur réelle du conteneur : le texte garde sa taille sur mobile
  chartW = Math.max(300, Math.min(720, Math.round(el.detail.clientWidth || 640)));
  const W = chartW, H = W < 480 ? 180 : 200, P = CHART_PAD;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const temps = hours.map(h => h.temperature).filter(v => v != null);
  const tMin = Math.floor(Math.min(...temps) - 1), tMax = Math.ceil(Math.max(...temps) + 1);
  const pMax = Math.max(5, ...hours.map(h => h.precipitation ?? 0));
  const x = i => P.l + (i + 0.5) * (iw / hours.length);
  const yT = v => P.t + ih - ((v - tMin) / (tMax - tMin)) * ih;
  const yP = p => P.t + ih - (p / pMax) * ih;
  const bw = (iw / hours.length) * 0.6;

  const pts = hours.map((h, i) => (h.temperature == null ? null : `${x(i).toFixed(1)},${yT(h.temperature).toFixed(1)}`)).filter(Boolean);
  const area = `M${pts[0]} L${pts.join(' L')} L${x(hours.length - 1).toFixed(1)},${P.t + ih} L${x(0).toFixed(1)},${P.t + ih} Z`;
  const bars = hours.map((h, i) => (h.precipitation > 0
    ? `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${yP(h.precipitation).toFixed(1)}" width="${bw.toFixed(1)}" height="${(P.t + ih - yP(h.precipitation)).toFixed(1)}" rx="1.5" class="bar"/>` : '')).join('');
  const ticksT = [tMin, Math.round((tMin + tMax) / 2), tMax];
  const step = W < 480 ? 6 : 3;
  const xLabels = hours.map((h, i) => (i % step === 0 ? `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="axis" text-anchor="middle">${h.hour.slice(0, 2)}h</text>` : '')).join('');

  // Repère « maintenant » sur la journée en cours
  let nowMark = '';
  if (isToday) {
    const i = hours.findIndex(h => h.hour.slice(0, 2) === nowHourDakar());
    if (i >= 0) nowMark = `<line x1="${x(i)}" x2="${x(i)}" y1="${P.t - 4}" y2="${P.t + ih}" class="now-line"/><text x="${x(i)}" y="${P.t - 7}" class="axis now-label" text-anchor="middle">${t('chart.now')}</text>`;
  }

  return `
  <div class="chart-legend"><span class="key key-temp"></span>${t('chart.temp')}<span class="key key-rain"></span>${t('chart.rain')}</div>
  <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${t('chart.aria')}">
    ${ticksT.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${yT(v)}" y2="${yT(v)}" class="grid"/><text x="${P.l - 6}" y="${yT(v) + 4}" class="axis" text-anchor="end">${v}°</text>`).join('')}
    <text x="${W - P.r + 6}" y="${P.t + 4}" class="axis axis-rain">${pMax.toFixed(0)}</text>
    <text x="${W - P.r + 6}" y="${P.t + ih + 4}" class="axis axis-rain">0</text>
    ${nowMark}
    ${bars}
    <path d="${area}" class="temp-area"/>
    <polyline points="${pts.join(' ')}" class="temp-line"/>
    ${xLabels}
    <line class="cursor" x1="0" x2="0" y1="${P.t}" y2="${P.t + ih}" visibility="hidden"/>
    <circle class="cursor-dot" r="4" cx="0" cy="0" visibility="hidden"/>
    <rect class="hit" x="${P.l}" y="${P.t}" width="${iw}" height="${ih}" fill="transparent"/>
  </svg>
  <div class="chart-tip" hidden></div>`;
}

function wireChart() {
  const box = document.getElementById('hourlyChart');
  const svg = box?.querySelector('svg');
  if (!svg || !chartHours.length) return;
  const tip = box.querySelector('.chart-tip');
  const cursor = svg.querySelector('.cursor');
  const dot = svg.querySelector('.cursor-dot');
  const line = svg.querySelector('.temp-line').points;
  const W = chartW, P = CHART_PAD;
  const iw = W - P.l - P.r;

  const show = evt => {
    const rect = svg.getBoundingClientRect();
    const sx = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.min(chartHours.length - 1, Math.max(0, Math.floor(((sx - P.l) / iw) * chartHours.length)));
    const h = chartHours[i];
    const pt = line[i];
    if (!pt) return;
    cursor.setAttribute('x1', pt.x); cursor.setAttribute('x2', pt.x);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    cursor.setAttribute('visibility', 'visible'); dot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<strong>${h.hour}</strong> · ${describeWeather(h.weatherCode).label}<br>` + t('chart.tip', {
      t: formatValue('tempMax', h.temperature), p: formatValue('precipSum', h.precipitation),
      pp: h.precipProbability ?? '–', w: formatValue('windMax', h.wind), h: h.humidity ?? '–'
    });
    const px = (pt.x / W) * rect.width;
    tip.style.left = `${Math.min(Math.max(px, 90), rect.width - 90)}px`;
  };
  const hide = () => {
    tip.hidden = true;
    cursor.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden');
  };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

/* ---------- Chargement ---------- */
let inflight = null;
async function refresh({ force = false } = {}) {
  if (inflight) return inflight;
  if (!force && state.fetchedAt && Date.now() - state.fetchedAt < MAX_AGE_MS) return;
  state.loading = true;
  renderStatus();
  inflight = (async () => {
    try {
      const res = await loadForecast({
        onRetry: (n, total) => { el.status.textContent = t('status.retry', { n, total }); }
      });
      Object.assign(state, { data: res.data, fetchedAt: res.fetchedAt, fromCache: res.fromCache, error: res.error });
    } catch (error) {
      state.error = error;
      if (!state.data) showFatalError(error);
    } finally {
      state.loading = false;
      inflight = null;
      renderAll();
    }
  })();
  return inflight;
}

function showFatalError(error) {
  const node = document.getElementById('errorTpl').content.cloneNode(true);
  applyStatic(node);
  node.querySelector('.error-msg').textContent = t('error.hint', { error: errorText(error) });
  node.querySelector('.retry').addEventListener('click', () => refresh({ force: true }));
  el.detail.replaceChildren(node);
}

/* ---------- Démarrage ---------- */
async function start() {
  renderTexts();
  buildControls();

  // Affichage immédiat depuis le cache, puis actualisation en arrière-plan.
  const cached = getCachedForecast();
  if (cached) Object.assign(state, { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true });

  initMap('map', { onRegionSelect: key => selectRegion(key) })
    .then(() => renderAll())
    .catch(err => {
      console.error(err);
      el.mapError.hidden = false;
    });

  renderAll();
  await refresh({ force: !cached || Date.now() - cached.fetchedAt >= MAX_AGE_MS });

  // Actualisation automatique : retour sur l'onglet, retour du réseau, toutes les 30 min.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online', () => refresh({ force: true }));
  setInterval(() => { if (!document.hidden) refresh(); }, 5 * 60 * 1000);
}

start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}

