// ============================================
// api.js — Open-Meteo API client
// ============================================

export const REGIONS = {
  dakar:       { lat: 14.7167, lon: -17.4677 },
  thies:       { lat: 14.7833, lon: -16.9333 },
  diourbel:    { lat: 14.6500, lon: -16.2333 },
  fatick:      { lat: 14.3333, lon: -16.4167 },
  kaolack:     { lat: 14.1500, lon: -16.0667 },
  louga:       { lat: 15.6167, lon: -16.2333 },
  matam:       { lat: 15.6500, lon: -13.2500 },
  'saint-louis':{ lat: 16.0333, lon: -16.5000 },
  tambacounda: { lat: 13.7667, lon: -13.6833 },
  kedougou:    { lat: 12.5570, lon: -12.1850 },
  kolda:       { lat: 12.8833, lon: -14.9500 },
  sedhiou:     { lat: 12.7083, lon: -15.5569 },
  ziguinchor:  { lat: 12.5581, lon: -16.2730 },
  kaffrine:    { lat: 14.1058, lon: -15.5506 }
};

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'relative_humidity_2m_mean',
  'wind_speed_10m_max',
  'uv_index_max'
];

const HOURLY_VARS = [
  'temperature_2m',
  'cape',
  'rain',
  'cloud_cover',
  'soil_temperature_0_to_7cm',
  'soil_moisture_0_to_7cm',
  'wind_speed_10m',
  'surface_pressure'
];

/* ---------- Daily ---------- */
export async function fetchDaily(regionKey) {
  const { lat, lon } = REGIONS[regionKey];
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: DAILY_VARS.join(','),
    forecast_days: '14',
    timezone: 'auto'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur daily ${regionKey}: ${res.status}`);
  return res.json();
}

/* ---------- Hourly (for a single day or range) ---------- */
export async function fetchHourly(regionKey, startDate, endDate = null) {
  const { lat, lon } = REGIONS[regionKey];
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: HOURLY_VARS.join(','),
    start_date: startDate,
    end_date: endDate || startDate,
    timezone: 'auto'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur hourly ${regionKey}: ${res.status}`);
  return res.json();
}

/* ---------- Mappers ---------- */
export function mapDailyToApp(json) {
  const d = json.daily;
  const out = {};
  d.time.forEach((date, i) => {
    out[date] = {
      daytime: {
        temperature: {
          max: round(d.temperature_2m_max[i]),
          min: round(d.temperature_2m_min[i])
        },
        precipitation: {
          amount: round(d.precipitation_sum[i]),
          probability: d.precipitation_probability_max[i]
        },
        humidity: d.relative_humidity_2m_mean[i],
        wind: { speed: round(d.wind_speed_10m_max[i]) },
        uv: d.uv_index_max[i]
      }
    };
  });
  return out;
}

export function mapHourlyToApp(json) {
  const h = json.hourly;
  return h.time.map((t, i) => ({
    hour: t.slice(11, 16),
    temperature: round(h.temperature_2m[i]),
    cape: h.cape[i] != null ? round(h.cape[i]) : null,
    rain: round(h.rain[i]),
    cloudCover: h.cloud_cover[i],
    soilTemp: h.soil_temperature_0_to_7cm[i] != null ? round(h.soil_temperature_0_to_7cm[i]) : null,
    soilMoisture: h.soil_moisture_0_to_7cm[i] != null ? round(h.soil_moisture_0_to_7cm[i], 3) : null,
    windSpeed: round(h.wind_speed_10m[i]),
    surfacePressure: h.surface_pressure[i] != null ? round(h.surface_pressure[i]) : null
  }));
}

/* ---------- Aggregate hourly to daily ---------- */
export function aggregateHourlyToDaily(hourlyArray) {
  if (!hourlyArray || hourlyArray.length === 0) return null;
  const vals = key => hourlyArray.map(h => h[key]).filter(v => v != null);
  const avg = key => {
    const arr = vals(key);
    return arr.length ? round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  };
  const max = key => {
    const arr = vals(key);
    return arr.length ? round(Math.max(...arr)) : null;
  };
  return {
    cape: max('cape'),
    surfacePressure: avg('surfacePressure'),
    soilTemp: avg('soilTemp'),
    soilMoisture: avg('soilMoisture')
  };
}

function round(n, d = 1) {
  return n == null ? null : Number(n.toFixed(d));
}
