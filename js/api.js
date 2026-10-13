// ============================================
// api.js — Client Open-Meteo fiable
// Une seule requête pour les 14 régions, délai d'expiration,
// nouvelles tentatives et cache local horodaté.
// ============================================

/** Chefs-lieux des 14 régions (coordonnées des points de prévision). */
export const REGIONS = [
  { key: 'dakar',       name: 'Dakar',        iso: 'SN-DK', lat: 14.7167, lon: -17.4677 },
  { key: 'thies',       name: 'Thiès',        iso: 'SN-TH', lat: 14.7833, lon: -16.9333 },
  { key: 'diourbel',    name: 'Diourbel',     iso: 'SN-DB', lat: 14.6500, lon: -16.2333 },
  { key: 'fatick',      name: 'Fatick',       iso: 'SN-FK', lat: 14.3333, lon: -16.4167 },
  { key: 'kaolack',     name: 'Kaolack',      iso: 'SN-KL', lat: 14.1500, lon: -16.0667 },
  { key: 'kaffrine',    name: 'Kaffrine',     iso: 'SN-KA', lat: 14.1058, lon: -15.5506 },
  { key: 'louga',       name: 'Louga',        iso: 'SN-LG', lat: 15.6167, lon: -16.2333 },
  { key: 'saint-louis', name: 'Saint-Louis',  iso: 'SN-SL', lat: 16.0333, lon: -16.5000 },
  { key: 'matam',       name: 'Matam',        iso: 'SN-MT', lat: 15.6500, lon: -13.2500 },
  { key: 'tambacounda', name: 'Tambacounda',  iso: 'SN-TC', lat: 13.7667, lon: -13.6833 },
  { key: 'kedougou',    name: 'Kédougou',     iso: 'SN-KE', lat: 12.5570, lon: -12.1850 },
  { key: 'kolda',       name: 'Kolda',        iso: 'SN-KD', lat: 12.8833, lon: -14.9500 },
  { key: 'sedhiou',     name: 'Sédhiou',      iso: 'SN-SE', lat: 12.7083, lon: -15.5569 },
  { key: 'ziguinchor',  name: 'Ziguinchor',   iso: 'SN-ZG', lat: 12.5581, lon: -16.2730 }
];

export const REGION_BY_KEY = Object.fromEntries(REGIONS.map(r => [r.key, r]));
export const REGION_BY_ISO = Object.fromEntries(REGIONS.map(r => [r.iso, r]));

import { AppError } from './i18n.js';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const TIMEZONE = 'Africa/Dakar';
const FORECAST_DAYS = 14;

const CURRENT_VARS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
  'weather_code', 'wind_speed_10m', 'wind_direction_10m', 'precipitation', 'is_day'
];
const DAILY_VARS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_sum', 'precipitation_probability_max',
  'relative_humidity_2m_mean', 'wind_speed_10m_max', 'wind_direction_10m_dominant',
  'uv_index_max', 'sunrise', 'sunset'
];
const HOURLY_VARS = [
  'temperature_2m', 'precipitation', 'precipitation_probability',
  'relative_humidity_2m', 'wind_speed_10m', 'cloud_cover', 'weather_code',
  'cape', 'surface_pressure', 'soil_temperature_0_to_7cm', 'soil_moisture_0_to_7cm'
];

const CACHE_KEY = 'lpaosf:forecast:v3';
/** Au-delà de cet âge, les données sont actualisées automatiquement. */
export const MAX_AGE_MS = 30 * 60 * 1000;

/* ---------- Réseau ---------- */

class HttpError extends AppError {
  constructor(status) {
    super('error.http', { status });
    this.status = status;
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new HttpError(res.status);
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new AppError('error.timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Réessaie en cas de coupure réseau, de délai dépassé, d'erreur 5xx ou 429. */
async function fetchJSONWithRetry(url, { timeouts = [12000, 20000, 30000], onRetry = () => {} } = {}) {
  const attempts = timeouts.length;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchWithTimeout(url, timeouts[i]);
    } catch (e) {
      lastErr = e;
      const retriable = !(e instanceof HttpError) || e.status >= 500 || e.status === 429;
      if (!retriable || i === attempts - 1) break;
      onRetry(i + 2, attempts);
      await new Promise(r => setTimeout(r, 1000 * 2 ** i)); // 1 s, 2 s
    }
  }
  if (!navigator.onLine) throw new AppError('error.noInternet');
  if (lastErr instanceof TypeError) throw new AppError('error.unreachable');
  throw lastErr;
}

function buildUrl() {
  const params = new URLSearchParams({
    latitude: REGIONS.map(r => r.lat).join(','),
    longitude: REGIONS.map(r => r.lon).join(','),
    current: CURRENT_VARS.join(','),
    daily: DAILY_VARS.join(','),
    hourly: HOURLY_VARS.join(','),
    timezone: TIMEZONE,
    forecast_days: String(FORECAST_DAYS),
    wind_speed_unit: 'kmh'
  });
  return `${ENDPOINT}?${params}`;
}

/* ---------- Normalisation ---------- */

const round = (n, d = 1) => (n == null || Number.isNaN(n) ? null : Number(n.toFixed(d)));
const clean = arr => arr.filter(v => v != null && !Number.isNaN(v));
const mean = arr => { const a = clean(arr); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };
const max = arr => { const a = clean(arr); return a.length ? Math.max(...a) : null; };

function normalizeLocation(json) {
  const d = json.daily;
  const h = json.hourly;

  // Heures regroupées par jour (les chaînes sont déjà en heure de Dakar)
  const hoursByDate = {};
  h.time.forEach((t, i) => {
    const date = t.slice(0, 10);
    (hoursByDate[date] ||= []).push({
      time: t,
      hour: t.slice(11, 16),
      temperature: round(h.temperature_2m[i]),
      precipitation: round(h.precipitation[i]),
      precipProbability: h.precipitation_probability[i],
      humidity: h.relative_humidity_2m[i],
      wind: round(h.wind_speed_10m[i]),
      cloudCover: h.cloud_cover[i],
      weatherCode: h.weather_code[i],
      cape: round(h.cape[i], 0),
      pressure: round(h.surface_pressure[i]),
      soilTemp: round(h.soil_temperature_0_to_7cm[i]),
      soilMoisture: round(h.soil_moisture_0_to_7cm[i], 3)
    });
  });

  const days = d.time.map((date, i) => {
    const hours = hoursByDate[date] || [];
    return {
      date,
      weatherCode: d.weather_code[i],
      tempMax: round(d.temperature_2m_max[i]),
      tempMin: round(d.temperature_2m_min[i]),
      precipSum: round(d.precipitation_sum[i]),
      precipProbability: d.precipitation_probability_max[i],
      humidity: d.relative_humidity_2m_mean[i],
      windMax: round(d.wind_speed_10m_max[i]),
      windDir: d.wind_direction_10m_dominant[i],
      uv: round(d.uv_index_max[i], 0), // indice OMS : entier
      sunrise: d.sunrise[i]?.slice(11, 16) ?? null,
      sunset: d.sunset[i]?.slice(11, 16) ?? null,
      // Agrégats journaliers des variables uniquement horaires
      cape: round(max(hours.map(x => x.cape)), 0),
      pressure: round(mean(hours.map(x => x.pressure))),
      soilTemp: round(mean(hours.map(x => x.soilTemp))),
      soilMoisture: round(mean(hours.map(x => x.soilMoisture)), 3),
      hours
    };
  });

  const c = json.current;
  return {
    current: {
      time: c.time,
      temperature: round(c.temperature_2m),
      apparent: round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      weatherCode: c.weather_code,
      wind: round(c.wind_speed_10m),
      windDir: c.wind_direction_10m,
      precipitation: round(c.precipitation),
      isDay: c.is_day === 1
    },
    days
  };
}

function normalize(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length !== REGIONS.length || !list.every(x => x?.daily?.time && x?.hourly?.time && x?.current)) {
    throw new AppError('error.incomplete');
  }
  const regions = {};
  REGIONS.forEach((r, i) => { regions[r.key] = normalizeLocation(list[i]); });
  return {
    regions,
    today: list[0].current.time.slice(0, 10),
    dates: list[0].daily.time
  };
}

/* ---------- Cache local ---------- */

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data?.regions && parsed.fetchedAt ? parsed : null;
  } catch { return null; }
}

function writeCache(entry) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch { /* quota / mode privé */ }
}

/** Données en cache (même périmées), pour un affichage immédiat. */
export function getCachedForecast() {
  return readCache();
}

/**
 * Télécharge les prévisions. Renvoie { data, fetchedAt, fromCache, error }.
 * En cas d'échec, renvoie le dernier cache disponible avec l'erreur,
 * ou lève l'erreur s'il n'y a rien en cache.
 */
export async function loadForecast({ onRetry } = {}) {
  try {
    const raw = await fetchJSONWithRetry(buildUrl(), { onRetry });
    const entry = { fetchedAt: Date.now(), data: normalize(raw) };
    writeCache(entry);
    return { ...entry, fromCache: false, error: null };
  } catch (error) {
    const cached = readCache();
    if (cached) return { ...cached, fromCache: true, error };
    throw error;
  }
}
