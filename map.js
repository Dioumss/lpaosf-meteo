// ============================================
// map.js — Leaflet map with region value labels
// ============================================

import { REGIONS } from './api.js';

let map = null;
let layers = [];

export function initMap() {
  if (map) return map;

  map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([14.5, -14.5], 7);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  L.control.attribution({ position: 'bottomright' }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);

  return map;
}

export function showMap(show = true) {
  const section = document.getElementById('mapSection');
  section.style.display = show ? 'block' : 'none';
  if (show && map) {
    requestAnimationFrame(() => map.invalidateSize());
  }
}

/**
 * Update map labels with the selected parameter values.
 * @param {Object} dailyData — { regionKey: { date: { daytime: {...} } } }
 * @param {string} param — selected parameter key
 * @param {string|null} date — specific date or null for today
 * @param {Function} onRegionClick — callback(regionKey)
 */
export function updateMapLabels(dailyData, param, date, onRegionClick) {
  if (!map) initMap();

  // Clear previous layers
  layers.forEach(l => map.removeLayer(l));
  layers = [];

  const today = new Date().toISOString().split('T')[0];
  const targetDate = date || today;

  Object.entries(REGIONS).forEach(([key, { lat, lon }]) => {
    const regionDates = dailyData[key];
    if (!regionDates) return;

    const dayData = regionDates[targetDate];
    if (!dayData || !dayData.daytime) return;

    const { value, unit, cssClass } = extractValue(dayData.daytime, param);
    if (value == null) return;

    const icon = L.divIcon({
      className: 'region-label',
      html: `
        <div class="label-bg ${cssClass}">
          <span class="label-value">${value}</span>
          <span class="label-unit">${unit}</span>
        </div>
        <div class="label-name">${formatRegionName(key)}</div>
      `,
      iconSize: [60, 70],
      iconAnchor: [30, 55]
    });

    const marker = L.marker([lat, lon], { icon, zIndexOffset: 1000 })
      .addTo(map)
      .on('click', () => onRegionClick(key));

    layers.push(marker);
  });

  // Fit bounds if we have markers
  if (layers.length > 0) {
    const group = new L.featureGroup(layers);
    map.fitBounds(group.getBounds().pad(0.15));
  }
}

function extractValue(daytime, param) {
  const d = daytime;
  switch (param) {
    case 'temperature':
      return { value: d.temperature?.max, unit: '°C', cssClass: d.temperature?.max > 35 ? 'hot' : d.temperature?.max < 25 ? 'cold' : '' };
    case 'precipitation':
      return { value: d.precipitation?.probability, unit: '%', cssClass: d.precipitation?.probability > 50 ? 'wet' : '' };
    case 'humidity':
      return { value: d.humidity, unit: '%', cssClass: d.humidity > 70 ? 'wet' : '' };
    case 'wind':
      return { value: d.wind?.speed, unit: 'km/h', cssClass: d.wind?.speed > 30 ? 'wind' : '' };
    case 'uv':
      return { value: d.uv, unit: 'UV', cssClass: d.uv > 7 ? 'uv' : d.uv > 4 ? 'hot' : '' };
    case 'cape':
      return { value: d.cape, unit: 'J/kg', cssClass: d.cape > 1000 ? 'hot' : '' };
    case 'surface_pressure':
      return { value: d.surfacePressure, unit: 'hPa', cssClass: 'pressure' };
    case 'soil_temperature_0_to_7cm':
      return { value: d.soilTemp, unit: '°C', cssClass: 'soil' };
    case 'soil_moisture_0_to_7cm':
      return { value: d.soilMoisture, unit: 'm³/m³', cssClass: d.soilMoisture > 0.3 ? 'wet' : 'soil' };
    default:
      return { value: d.temperature?.max, unit: '°C', cssClass: '' };
  }
}

function formatRegionName(key) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
