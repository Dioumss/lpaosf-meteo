// ============================================
// app.js — Main application logic
// ============================================

import {
  REGIONS,
  fetchDaily,
  fetchHourly,
  mapDailyToApp,
  mapHourlyToApp,
  aggregateHourlyToDaily
} from './api.js';
import { initMap, showMap, updateMapLabels } from './map.js';

/* ---------- DOM refs ---------- */
const regionSel   = document.getElementById('region');
const paramSel    = document.getElementById('parameter');
const dateSel     = document.getElementById('date');
const searchBtn   = document.getElementById('searchBtn');
const display     = document.getElementById('weatherDisplay');
const hourlyDet   = document.getElementById('hourlyDetails');
const hourlyTbl   = document.getElementById('hourlyTable');
const mapLegend   = document.getElementById('mapLegend');

/* ---------- Fill selects ---------- */
Object.keys(REGIONS).forEach(r => {
  const opt = document.createElement('option');
  opt.value = r;
  opt.textContent = r.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  regionSel.appendChild(opt);
});

for (let i = 0; i < 14; i++) {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const iso = d.toISOString().split('T')[0];
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const opt = document.createElement('option');
  opt.value = iso;
  opt.textContent = i === 0 ? `Aujourd'hui — ${label}` : label;
  dateSel.appendChild(opt);
}

/* ---------- Caches ---------- */
const dailyCache = {};
const hourlyCache = {}; // { region: { date: [hours] } }
const extraCache = {};  // { region: { date: { cape, surfacePressure, soilTemp, soilMoisture } } }

/* ---------- Legend labels ---------- */
const PARAM_LABELS = {
  general: 'Vue générale',
  temperature: 'Température max',
  precipitation: 'Probabilité de pluie',
  humidity: 'Humidité relative',
  wind: 'Vent max',
  uv: 'Indice UV',
  cape: 'CAPE (instabilité)',
  surface_pressure: 'Pression surface',
  soil_temperature_0_to_7cm: 'Température sol',
  soil_moisture_0_to_7cm: 'Humidité sol'
};

/* ---------- Event wiring ---------- */
searchBtn.addEventListener('click', onSearch);
paramSel.addEventListener('change', onParamChange);

async function onSearch() {
  const region = regionSel.value;
  const param  = paramSel.value;
  const date   = dateSel.value;

  searchBtn.disabled = true;
  searchBtn.querySelector('.btn-text').textContent = 'Chargement…';
  display.innerHTML = '<div class="loading">⏳ Récupération des données météo…</div>';
  showMap(false);
  hourlyDet.open = false;
  hourlyDet.style.display = 'none';

  try {
    // 1) Fetch daily for ALL regions (needed for the map)
    const regionsToFetch = Object.keys(REGIONS);
    const dailyPromises = regionsToFetch.map(async k => {
      if (!dailyCache[k]) {
        const raw = await fetchDaily(k);
        dailyCache[k] = mapDailyToApp(raw);
      }
      return [k, dailyCache[k]];
    });
    const dailyEntries = await Promise.all(dailyPromises);
    const dailyData = Object.fromEntries(dailyEntries);

    // 2) Fetch extra hourly data (CAPE, pressure, soil) for all regions if needed
    const needsExtra = ['cape','surface_pressure','soil_temperature_0_to_7cm','soil_moisture_0_to_7cm'].includes(param);
    const today = new Date().toISOString().split('T')[0];
    const targetDate = date || today;

    if (needsExtra) {
      const extraPromises = regionsToFetch.map(async k => {
        if (!extraCache[k]?.[targetDate]) {
          const raw = await fetchHourly(k, targetDate);
          const hours = mapHourlyToApp(raw);
          extraCache[k] = extraCache[k] || {};
          extraCache[k][targetDate] = aggregateHourlyToDaily(hours);
        }
        if (extraCache[k]?.[targetDate] && dailyData[k]?.[targetDate]) {
          Object.assign(dailyData[k][targetDate].daytime, extraCache[k][targetDate]);
        }
        return [k, dailyData[k]];
      });
      await Promise.all(extraPromises);
    }

    // 3) Determine what to show
    const selectedRegion = region;
    const selectedDate   = date;

    let regionsToShow = selectedRegion ? [selectedRegion] : Object.keys(REGIONS);
    let datesToShow;
    if (selectedDate) {
      datesToShow = [selectedDate];
    } else if (selectedRegion) {
      // One region, no date → show all 14 days
      datesToShow = Object.keys(dailyData[selectedRegion] || {}).sort();
    } else {
      // No region, no date → show all regions for today only
      datesToShow = [today];
    }

    let html = '';
    regionsToShow.forEach(r => {
      datesToShow.forEach(d => {
        if (dailyData[r]?.[d]) {
          html += buildDailyCard(r, param, dailyData[r][d], d);
        }
      });
    });
    display.innerHTML = html || '<div class="empty">Aucune donnée disponible.</div>';

    // 4) Update map with labels
    updateMapLabels(dailyData, param, date, (clickedRegion) => {
      regionSel.value = clickedRegion;
      onSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    showMap(true);
    mapLegend.textContent = PARAM_LABELS[param] || param;

    // 5) Hourly table if single region + single date
    if (selectedRegion && selectedDate) {
      hourlyDet.style.display = 'block';
      hourlyTbl.innerHTML = '<div class="loading">⏳ Chargement des horaires…</div>';

      if (!hourlyCache[selectedRegion]?.[selectedDate]) {
        const rawHourly = await fetchHourly(selectedRegion, selectedDate);
        hourlyCache[selectedRegion] = hourlyCache[selectedRegion] || {};
        hourlyCache[selectedRegion][selectedDate] = mapHourlyToApp(rawHourly);
      }
      hourlyTbl.innerHTML = buildHourlyTable(hourlyCache[selectedRegion][selectedDate]);
    }

  } catch (e) {
    console.error(e);
    display.innerHTML = `<div class="error">❌ Impossible de récupérer les données.<br><small>${e.message}</small></div>`;
    showMap(false);
    hourlyDet.style.display = 'none';
  } finally {
    searchBtn.disabled = false;
    searchBtn.querySelector('.btn-text').textContent = 'Actualiser les données';
  }
}

/* When parameter changes, just refresh map + cards if data already loaded */
async function onParamChange() {
  const param = paramSel.value;
  const date  = dateSel.value;
  const region = regionSel.value;

  mapLegend.textContent = PARAM_LABELS[param] || param;

  const hasData = Object.keys(dailyCache).length === Object.keys(REGIONS).length;
  if (!hasData) return;

  const today = new Date().toISOString().split('T')[0];
  const targetDate = date || today;

  // Handle extra data if needed
  const needsExtra = ['cape','surface_pressure','soil_temperature_0_to_7cm','soil_moisture_0_to_7cm'].includes(param);
  if (needsExtra) {
    const regionsToFetch = Object.keys(REGIONS);
    const extraPromises = regionsToFetch.map(async k => {
      if (!extraCache[k]?.[targetDate]) {
        const raw = await fetchHourly(k, targetDate);
        const hours = mapHourlyToApp(raw);
        extraCache[k] = extraCache[k] || {};
        extraCache[k][targetDate] = aggregateHourlyToDaily(hours);
      }
      if (extraCache[k]?.[targetDate] && dailyCache[k]?.[targetDate]) {
        Object.assign(dailyCache[k][targetDate].daytime, extraCache[k][targetDate]);
      }
    });
    await Promise.all(extraPromises);
  }

  // Re-render cards
  let regionsToShow = region ? [region] : Object.keys(REGIONS);
  let datesToShow;
  if (date) {
    datesToShow = [date];
  } else if (region) {
    datesToShow = Object.keys(dailyCache[region] || {}).sort();
  } else {
    datesToShow = [today];
  }

  let html = '';
  regionsToShow.forEach(r => {
    datesToShow.forEach(d => {
      if (dailyCache[r]?.[d]) {
        html += buildDailyCard(r, param, dailyCache[r][d], d);
      }
    });
  });
  display.innerHTML = html || '<div class="empty">Aucune donnée.</div>';

  // Re-render map labels
  updateMapLabels(dailyCache, param, date, (clickedRegion) => {
    regionSel.value = clickedRegion;
    onSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Card builder ---------- */
function buildDailyCard(region, param, data, date) {
  const d = data.daytime;
  const fmtDate = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = `<div class="weather-card">
    <div class="card-header">
      <div class="card-title">${region.replace(/-/g, ' ')}</div>
      <div class="day-badge">${fmtDate}</div>
    </div>
    <div class="weather-grid">`;

  switch (param) {
    case 'temperature':
      html += item('🌡️ Max', `${d.temperature?.max ?? '-'} °C`)
           +  item('❄️ Min', `${d.temperature?.min ?? '-'} °C`);
      break;
    case 'precipitation':
      html += item('☔ Probabilité', `${d.precipitation?.probability ?? '-'} %`)
           +  item('🌧️ Cumul', `${d.precipitation?.amount ?? '-'} mm`);
      break;
    case 'humidity':
      html += item('💧 Humidité', `${d.humidity ?? '-'} %`);
      break;
    case 'wind':
      html += item('💨 Vent max', `${d.wind?.speed ?? '-'} km/h`);
      break;
    case 'uv':
      html += item('☀️ UV max', `${d.uv ?? '-'}`);
      break;
    case 'cape':
      html += item('⚡ CAPE', `${d.cape ?? '-'} J/kg`);
      break;
    case 'surface_pressure':
      html += item('📉 Pression', `${d.surfacePressure ?? '-'} hPa`);
      break;
    case 'soil_temperature_0_to_7cm':
      html += item('🌱 Temp. sol', `${d.soilTemp ?? '-'} °C`);
      break;
    case 'soil_moisture_0_to_7cm':
      html += item('🌱 Humidité sol', `${d.soilMoisture ?? '-'} m³/m³`);
      break;
    default:
      html += item('🌡️ Température', `${d.temperature?.min ?? '-'} – ${d.temperature?.max ?? '-'} °C`, true)
           +  item('☔ Pluie', `${d.precipitation?.probability ?? '-'} %`)
           +  item('💧 Humidité', `${d.humidity ?? '-'} %`)
           +  item('💨 Vent', `${d.wind?.speed ?? '-'} km/h`)
           +  item('☀️ UV', `${d.uv ?? '-'}`);
  }
  html += '</div></div>';
  return html;
}

function item(label, value, full = false) {
  return `<div class="weather-item ${full ? 'full-width' : ''}">
    <div class="item-label">${label}</div>
    <div class="item-value">${value}</div>
  </div>`;
}

/* ---------- Hourly table ---------- */
function buildHourlyTable(arr) {
  if (!arr || arr.length === 0) return '<div class="empty">Aucune donnée horaire.</div>';
  return `<table>
    <thead><tr>
      <th>Heure</th><th>Temp °C</th><th>Pluie mm</th><th>Vent km/h</th>
      <th>CAPE</th><th>Pression hPa</th><th>Sol °C</th><th>Nuages %</th>
    </tr></thead>
    <tbody>${arr.map(h => `<tr>
      <td>${h.hour}</td>
      <td>${h.temperature ?? '-'}</td>
      <td>${h.rain ?? '-'}</td>
      <td>${h.windSpeed ?? '-'}</td>
      <td>${h.cape ?? '-'}</td>
      <td>${h.surfacePressure ?? '-'}</td>
      <td>${h.soilTemp ?? '-'}</td>
      <td>${h.cloudCover ?? '-'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

/* ---------- Init ---------- */
initMap();
onSearch();
