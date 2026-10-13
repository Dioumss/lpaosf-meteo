// ============================================
// map.js — Carte choroplèthe des 14 régions (Leaflet)
// ============================================

import { REGION_BY_ISO } from './api.js';
import { VARIABLES, colorFor, textOn, formatValue } from './config.js';
import { t } from './i18n.js';

const SENEGAL_BOUNDS = [[12.25, -17.6], [16.75, -11.3]];
// Carte thématique sans fond tuilé : aucune dépendance à un fournisseur de
// tuiles (les fonds CARTO exigent désormais une clé et affichent un filigrane).
// Ajustements manuels de la position des étiquettes (régions côtières serrées)
const LABEL_OVERRIDES = { 'SN-DK': [14.70, -17.42], 'SN-TH': [14.80, -16.78] };

const PLACE_LABELS = [
  { key: 'place.sea', at: [13.6, -17.25], cls: 'sea' },
  { key: 'place.gm', at: [13.42, -15.5], cls: 'country' },
  { key: 'place.mr', at: [16.55, -13.3], cls: 'country' },
  { key: 'place.ml', at: [14.2, -11.75], cls: 'country' },
  { key: 'place.gn', at: [12.38, -12.9], cls: 'country' },
  { key: 'place.gw', at: [12.3, -15.6], cls: 'country' }
];
const ATTRIBUTION = () => `${t('map.limits')} <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener">geoBoundaries</a>`;

let map, geoLayer, labelLayer, placeLayer, attribution;
let geojson = null;
let onSelect = () => {};
let state = { values: {}, varKey: 'tempMax', selected: null };

export async function initMap(container, { onRegionSelect }) {
  onSelect = onRegionSelect;
  if (typeof L === 'undefined') throw new Error('Leaflet not loaded');

  map = L.map(container, {
    zoomControl: false,
    attributionControl: true,
    zoomSnap: 0.25,
    minZoom: 5,
    maxZoom: 10,
    maxBounds: [[10.5, -20], [18.5, -9.5]]
  });
  map.attributionControl.setPrefix(false);
  attribution = ATTRIBUTION();
  map.attributionControl.addAttribution(attribution);
  L.control.zoom({ position: 'topright' }).addTo(map);
  placeLayer = L.layerGroup().addTo(map);
  renderPlaces();

  map.fitBounds(SENEGAL_BOUNDS, { padding: [4, 4] });
  // Étiquettes compactes (valeur seule) quand la carte est petite
  const updateDensity = () => map.getContainer().classList.toggle('labels-compact', map.getZoom() < 6.9);
  map.on('zoomend', updateDensity);
  updateDensity();
  let userMoved = false;
  map.on('dragstart', () => { userMoved = true; });
  map.on('zoomstart', e => { if (e.originalEvent) userMoved = true; });
  new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    if (!width || !height) return;
    map.invalidateSize();
    if (!userMoved) map.fitBounds(SENEGAL_BOUNDS, { padding: [4, 4] });
  }).observe(document.getElementById(container));

  const res = await fetch('assets/regions.geojson');
  geojson = await res.json();

  geoLayer = L.geoJSON(geojson, {
    style: styleFor,
    onEachFeature: (feature, layer) => {
      const region = REGION_BY_ISO[feature.properties.iso];
      if (!region) return;
      layer.on({
        click: () => onSelect(region.key),
        mouseover: () => layer.setStyle({ weight: 2.5 }),
        mouseout: () => geoLayer.resetStyle(layer)
      });
    }
  }).addTo(map);
  labelLayer = L.layerGroup().addTo(map);
  render();
}

function renderPlaces() {
  placeLayer.clearLayers();
  PLACE_LABELS.forEach(p => L.marker(p.at, {
    icon: L.divIcon({ className: `place-label place-${p.cls}`, html: `<span>${t(p.key)}</span>`, iconSize: [0, 0] }),
    interactive: false, keyboard: false
  }).addTo(placeLayer));
}

/** Retraduit les textes de la carte après un changement de langue. */
export function refreshMapLanguage() {
  if (!map) return;
  map.attributionControl.removeAttribution(attribution);
  attribution = ATTRIBUTION();
  map.attributionControl.addAttribution(attribution);
  renderPlaces();
  render();
}

function styleFor(feature) {
  const region = REGION_BY_ISO[feature.properties.iso];
  const value = region ? state.values[region.key] : null;
  const fill = colorFor(state.varKey, value) || '#cbd5e1';
  const selected = region && region.key === state.selected;
  return {
    fillColor: fill,
    fillOpacity: value == null ? 0.25 : 0.78,
    color: selected ? '#0b5fa5' : 'rgba(255,255,255,.9)',
    weight: selected ? 3 : 1.2,
    className: selected ? 'region-shape is-selected' : 'region-shape'
  };
}

function render() {
  if (!geoLayer) return;
  geoLayer.setStyle(styleFor);
  geoLayer.eachLayer(l => {
    const region = REGION_BY_ISO[l.feature.properties.iso];
    if (region && region.key === state.selected) l.bringToFront();
  });

  labelLayer.clearLayers();
  const v = VARIABLES[state.varKey];
  geojson.features.forEach(f => {
    const region = REGION_BY_ISO[f.properties.iso];
    if (!region) return;
    const value = state.values[region.key];
    const bg = colorFor(state.varKey, value) || '#cbd5e1';
    const selected = region.key === state.selected;
    const html = `
      <button type="button" class="map-label${selected ? ' is-selected' : ''}" style="--lbl-bg:${bg};--lbl-fg:${textOn(bg)}"
        aria-label="${region.name}: ${formatValue(state.varKey, value)} ${v.unit}">
        <span class="map-label-value">${formatValue(state.varKey, value)}</span>
        <span class="map-label-name">${region.name}</span>
      </button>`;
    const icon = L.divIcon({ className: 'map-label-wrap', html, iconSize: [0, 0] });
    L.marker(LABEL_OVERRIDES[f.properties.iso] || f.properties.label, { icon, keyboard: false, zIndexOffset: selected ? 1000 : 0 })
      .on('click', () => onSelect(region.key))
      .addTo(labelLayer);
  });
}

/**
 * @param {Object} values  { regionKey: number|null }
 * @param {string} varKey  clé de VARIABLES
 * @param {string|null} selected  région sélectionnée
 */
export function updateMap(values, varKey, selected) {
  state = { values, varKey, selected };
  render();
}

let userMarker = null;
/** Affiche la position de l'utilisateur (point bleu). */
export function showUserLocation(lat, lon) {
  if (!map) return;
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lon], {
    radius: 7, color: '#ffffff', weight: 2.5, fillColor: '#1479c8', fillOpacity: 1, interactive: false
  }).addTo(map);
}
