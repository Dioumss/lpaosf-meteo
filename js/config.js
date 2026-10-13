// ============================================
// config.js — Variables affichées, échelles de couleurs, codes météo
// ============================================

import { t, locale } from './i18n.js';

/**
 * Chaque variable a des classes fixes (et non relatives au jour affiché),
 * pour qu'une même couleur signifie la même chose d'un jour à l'autre.
 * breaks : bornes inférieures des classes 2..n ; colors : n couleurs.
 */
export const VARIABLES = {
  tempMax: {
    unit: '°C', decimals: 0,
    breaks: [24, 28, 32, 36, 40],
    colors: ['#9ecae1', '#fde68a', '#fbbf24', '#f97316', '#dc2626', '#7f1d1d']
  },
  tempMin: {
    unit: '°C', decimals: 0,
    breaks: [18, 21, 24, 27, 30],
    colors: ['#6baed6', '#bfdbfe', '#fde68a', '#fbbf24', '#f97316', '#dc2626']
  },
  precipSum: {
    unit: 'mm', decimals: 1,
    breaks: [1, 5, 10, 20, 50],
    colors: ['#f1f5f9', '#c6dbef', '#6baed6', '#2171b5', '#08519c', '#3f007d']
  },
  precipProbability: {
    unit: '%', decimals: 0,
    breaks: [20, 40, 60, 80],
    colors: ['#f1f5f9', '#c6dbef', '#6baed6', '#2171b5', '#08306b']
  },
  humidity: {
    unit: '%', decimals: 0,
    breaks: [30, 50, 70, 85],
    colors: ['#fde68a', '#d9f0d3', '#7fcdbb', '#1d91c0', '#0c2c84']
  },
  windMax: {
    unit: 'km/h', decimals: 0,
    breaks: [15, 25, 35, 50],
    colors: ['#ecfdf5', '#a7f3d0', '#34d399', '#7c3aed', '#4c1d95']
  },
  uv: {
    // Catégories OMS
    unit: '', decimals: 0,
    breaks: [3, 6, 8, 11],
    colors: ['#4ade80', '#facc15', '#fb923c', '#ef4444', '#a855f7'],
    hasClasses: true
  },
  cape: {
    unit: 'J/kg', decimals: 0,
    breaks: [500, 1000, 2500, 4000],
    colors: ['#f1f5f9', '#fde68a', '#fb923c', '#dc2626', '#7f1d1d'],
    hasClasses: true
  },
  pressure: {
    unit: 'hPa', decimals: 0,
    breaks: [995, 1000, 1005, 1010],
    colors: ['#7c3aed', '#a78bfa', '#e2e8f0', '#93c5fd', '#2563eb']
  },
  soilTemp: {
    unit: '°C', decimals: 0,
    breaks: [24, 28, 32, 36],
    colors: ['#e7d7c1', '#d6b48c', '#b8865b', '#8c5a32', '#5c3317']
  },
  soilMoisture: {
    unit: 'm³/m³', decimals: 2,
    breaks: [0.05, 0.1, 0.2, 0.3],
    colors: ['#d6b48c', '#e8dcb5', '#a6d96a', '#1a9850', '#006837']
  }
};

export const VARIABLE_ORDER = Object.keys(VARIABLES);

export const varLabel = k => t(`var.${k}`);
export const varShort = k => t(`var.${k}.short`);
/** Libellé de classe (UV, CAPE) ou null. */
export function classLabel(k, value) {
  if (value == null || !VARIABLES[k].hasClasses) return null;
  return t(`class.${k}`)[classIndex(k, value)];
}

export function classIndex(varKey, value) {
  const { breaks } = VARIABLES[varKey];
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i++;
  return i;
}

export function colorFor(varKey, value) {
  if (value == null) return null;
  return VARIABLES[varKey].colors[classIndex(varKey, value)];
}

/** Couleur de texte lisible sur un fond donné. */
export function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#0f172a' : '#ffffff';
}

export function formatValue(varKey, value) {
  if (value == null) return '–';
  const { decimals } = VARIABLES[varKey];
  return value.toLocaleString(locale(), { minimumFractionDigits: decimals ? Math.min(decimals, 1) : 0, maximumFractionDigits: decimals });
}

/* ---------- Codes météo OMS (WMO) ---------- */

const WMO_ICON = {
  0: 'clear', 1: 'mostly-clear', 2: 'partly', 3: 'cloudy', 45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'heavy-rain', 66: 'rain', 67: 'heavy-rain',
  71: 'cloudy', 73: 'cloudy', 75: 'cloudy', 77: 'cloudy',
  80: 'showers', 81: 'showers', 82: 'heavy-rain', 85: 'cloudy', 86: 'cloudy',
  95: 'storm', 96: 'storm', 99: 'storm'
};

export function describeWeather(code) {
  const icon = WMO_ICON[code];
  return icon ? { label: t(`wx.${code}`), icon } : { label: t('wx.unknown'), icon: 'cloudy' };
}

/* ---------- Icônes SVG (dessin simple, sans dépendance) ---------- */

const SUN = '<circle cx="12" cy="12" r="4.2" fill="#f5b301"/><g stroke="#f5b301" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>';
const MOON = '<path d="M15.5 3.5a8 8 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z" fill="#94a3b8"/>';
const SMALL_SUN = '<g transform="translate(9 -2) scale(.62)">' + SUN + '</g>';
const SMALL_MOON = '<g transform="translate(9 -1) scale(.6)">' + MOON + '</g>';
const CLOUD = (fill = 'var(--cloud, #cbd5e1)') => `<path d="M7 18.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.9 9.4 4.6 4.6 0 0 0 7 18.5z" fill="${fill}"/>`;
const DROPS = (n = 3) => {
  const xs = [8, 12, 16].slice(0, n);
  return `<g stroke="#2b7bd6" stroke-width="1.8" stroke-linecap="round">${xs.map(x => `<path d="M${x} 20.2l-1 2.3"/>`).join('')}</g>`;
};
const BOLT = '<path d="M12.6 15.5l-2.4 4h2.3l-1.3 3.6 3.9-5h-2.4l1.4-2.6z" fill="#f5b301"/>';
const FOG = '<g stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"><path d="M4 9h16M3 13h18M5 17h14"/></g>';

export function weatherIcon(code, { isDay = true, size = 32 } = {}) {
  const { icon, label } = describeWeather(code);
  const lift = s => `<g transform="translate(0 -2.5)">${s}</g>`;
  let body;
  switch (icon) {
    case 'clear': body = isDay ? SUN : MOON; break;
    case 'mostly-clear': body = (isDay ? SMALL_SUN : SMALL_MOON) + `<g transform="translate(-2 2) scale(.85)">${CLOUD()}</g>`; break;
    case 'partly': body = (isDay ? SMALL_SUN : SMALL_MOON) + CLOUD(); break;
    case 'cloudy': body = CLOUD('#94a3b8'); break;
    case 'fog': body = FOG; break;
    case 'drizzle': body = lift(CLOUD()) + DROPS(2); break;
    case 'rain': case 'showers': body = (icon === 'showers' && isDay ? SMALL_SUN : '') + lift(CLOUD()) + DROPS(3); break;
    case 'heavy-rain': body = lift(CLOUD('#64748b')) + DROPS(3); break;
    case 'storm': body = lift(CLOUD('#64748b')) + BOLT; break;
    default: body = CLOUD();
  }
  return `<svg class="wx-icon" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${label}">${body}</svg>`;
}

export function windDirection(deg) {
  if (deg == null) return '';
  return t('dirs')[Math.round(deg / 45) % 8];
}
