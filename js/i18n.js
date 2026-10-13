// ============================================
// i18n.js — Français / English
// Langue choisie : préférence enregistrée, sinon langue du navigateur.
// ============================================

const DICT = {
  fr: {
    'app.subtitle': 'Sénégal · 14 régions · 14 jours',
    'app.home': 'Météo LPAOSF, accueil',
    'app.description': 'Prévisions météo à 14 jours pour les 14 régions du Sénégal : température, pluie, vent, UV, CAPE, sol.',
    'lang.switch': 'Switch to English',
    'lang.other': 'EN',
    'refresh': 'Actualiser les prévisions',
    'locate': 'Région la plus proche de moi',
    'share': 'Copier le lien de cette vue',
    'share.done': 'Lien copié',
    'map.title': 'Carte des régions',
    'map.region': 'Choisir une région',
    'map.variables': 'Variable affichée',
    'map.days': 'Jour affiché',
    'map.aria': 'Carte du Sénégal par région',
    'map.legend': 'Légende',
    'map.error': 'Carte indisponible. Les prévisions restent consultables à côté.',
    'map.limits': 'Limites :',
    'ranking.title': 'Classement des 14 régions',
    'footer.forecast': 'Prévisions : {link} (meilleur modèle disponible, actualisé toutes les 30 min).',
    'footer.limits': 'Limites administratives : {link} (CC BY 3.0 IGO), simplifiées. Points de prévision : chefs-lieux de région.',
    'status.loading': 'Chargement…',
    'status.refreshing': 'Actualisation…',
    'status.updated': 'Mis à jour à {time}',
    'status.offline': 'Hors ligne · ',
    'status.unavailable': 'Indisponible',
    'status.retry': 'Connexion lente, tentative {n}/{total}…',
    'status.locating': 'Localisation…',
    'banner.failed': 'Actualisation impossible ({error}). Affichage des prévisions du {date} à {time}.',
    'banner.retry': 'Réessayer',
    'banner.old': 'Ces prévisions datent de plus de 6 heures.',
    'error.title': 'Impossible de charger les prévisions',
    'error.hint': '{error}. Vérifiez votre connexion puis réessayez.',
    'error.retry': 'Réessayer',
    'error.noInternet': 'Pas de connexion Internet',
    'error.unreachable': 'Serveur météo injoignable',
    'error.timeout': 'Délai de réponse dépassé',
    'error.incomplete': 'Réponse du serveur météo incomplète',
    'error.http': 'Le serveur météo a répondu {status}',
    'error.geo': 'Position indisponible',
    'cache.tooOld': 'Les données en cache sont trop anciennes. Actualisez pour obtenir les prévisions du jour.',
    'day.today': "Aujourd'hui",
    'day.todayShort': 'Auj.',
    'day.tomorrow': 'Demain',
    'detail.noData': 'Aucune donnée pour ce jour.',
    'detail.feels': 'Ressenti',
    'detail.humidity': 'Humidité',
    'detail.wind': 'Vent',
    'detail.day': 'Journée',
    'detail.modelled': 'Valeurs modélisées à {time} (heure de Dakar)',
    'detail.min': 'min',
    'detail.nearest': 'Région la plus proche de votre position',
    'stat.rain': 'Pluie',
    'stat.rainSub': 'Probabilité {p} %',
    'stat.windMax': 'Vent max',
    'stat.windSub': 'Dominant {dir}',
    'stat.humidity': 'Humidité',
    'stat.humiditySub': 'Moyenne journalière',
    'stat.uv': 'UV max',
    'stat.cape': 'CAPE max',
    'stat.capeSub': 'Instabilité {level}',
    'stat.pressure': 'Pression',
    'stat.pressureSub': 'Moyenne en surface',
    'stat.soil': 'Sol 0–7 cm',
    'stat.soilSub': 'Humidité {v} m³/m³',
    'stat.sun': 'Soleil',
    'stat.sunSub': 'Lever – coucher',
    'section.hourly': 'Heure par heure',
    'section.forecast': 'Prévisions sur {n} jours',
    'section.alerts': "Points d'attention",
    'chart.temp': 'Température (°C)',
    'chart.rain': 'Pluie (mm/h)',
    'chart.aria': 'Température et pluie heure par heure',
    'chart.none': 'Pas de données horaires.',
    'chart.now': 'Maint.',
    'chart.tip': '{t} °C · pluie {p} mm ({pp} %)<br>vent {w} km/h · humidité {h} %',
    'alert.heatHigh': 'Forte chaleur : {v} °C attendus.',
    'alert.heatMid': 'Chaleur marquée : {v} °C.',
    'alert.rainHigh': 'Fortes pluies : {v} mm prévus.',
    'alert.rainMid': 'Pluie probable : {v} mm ({p} %).',
    'alert.storm': 'Atmosphère très instable (CAPE {v} J/kg) : orages possibles.',
    'alert.wind': "Vent fort : jusqu'à {v} km/h.",
    'alert.uv': 'UV extrêmes ({v}) : protection indispensable.',
    'disclaimer': "Seuils d'attention indicatifs. Pour la vigilance officielle, consultez les bulletins de l'ANACIM.",
    'legend.index': 'Indice',
    // Variables
    'var.tempMax': 'Température max', 'var.tempMax.short': 'T max',
    'var.tempMin': 'Température min', 'var.tempMin.short': 'T min',
    'var.precipSum': 'Cumul de pluie', 'var.precipSum.short': 'Pluie',
    'var.precipProbability': 'Probabilité de pluie', 'var.precipProbability.short': 'Proba. pluie',
    'var.humidity': 'Humidité relative moyenne', 'var.humidity.short': 'Humidité',
    'var.windMax': 'Vent max à 10 m', 'var.windMax.short': 'Vent',
    'var.uv': 'Indice UV max', 'var.uv.short': 'UV',
    'var.cape': 'CAPE max (instabilité)', 'var.cape.short': 'CAPE',
    'var.pressure': 'Pression de surface moyenne', 'var.pressure.short': 'Pression',
    'var.soilTemp': 'Température du sol (0–7 cm)', 'var.soilTemp.short': 'T sol',
    'var.soilMoisture': 'Humidité du sol (0–7 cm)', 'var.soilMoisture.short': 'Hum. sol',
    'class.uv': ['Faible', 'Modéré', 'Élevé', 'Très élevé', 'Extrême'],
    'class.cape': ['faible', 'modérée', 'forte', 'très forte', 'extrême'],
    'dirs': ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
    // Pays et mer sur la carte
    'place.sea': 'Océan Atlantique', 'place.gm': 'Gambie', 'place.mr': 'Mauritanie',
    'place.ml': 'Mali', 'place.gn': 'Guinée', 'place.gw': 'Guinée-Bissau',
    // Codes météo OMS
    'wx.0': 'Ciel dégagé', 'wx.1': 'Peu nuageux', 'wx.2': 'Partiellement nuageux', 'wx.3': 'Couvert',
    'wx.45': 'Brouillard', 'wx.48': 'Brouillard givrant',
    'wx.51': 'Bruine légère', 'wx.53': 'Bruine', 'wx.55': 'Bruine dense', 'wx.56': 'Bruine verglaçante', 'wx.57': 'Bruine verglaçante',
    'wx.61': 'Pluie faible', 'wx.63': 'Pluie modérée', 'wx.65': 'Pluie forte', 'wx.66': 'Pluie verglaçante', 'wx.67': 'Pluie verglaçante',
    'wx.71': 'Neige', 'wx.73': 'Neige', 'wx.75': 'Neige', 'wx.77': 'Neige',
    'wx.80': 'Averses faibles', 'wx.81': 'Averses', 'wx.82': 'Averses violentes', 'wx.85': 'Averses de neige', 'wx.86': 'Averses de neige',
    'wx.95': 'Orage', 'wx.96': 'Orage avec grêle', 'wx.99': 'Orage violent avec grêle',
    'wx.unknown': 'Conditions inconnues'
  },
  en: {
    'app.subtitle': 'Senegal · 14 regions · 14 days',
    'app.home': 'LPAOSF Weather, home',
    'app.description': '14-day weather forecasts for the 14 regions of Senegal: temperature, rain, wind, UV, CAPE, soil.',
    'lang.switch': 'Passer en français',
    'lang.other': 'FR',
    'refresh': 'Refresh forecasts',
    'locate': 'Region nearest to me',
    'share': 'Copy a link to this view',
    'share.done': 'Link copied',
    'map.title': 'Regional map',
    'map.region': 'Choose a region',
    'map.variables': 'Displayed variable',
    'map.days': 'Displayed day',
    'map.aria': 'Map of Senegal by region',
    'map.legend': 'Legend',
    'map.error': 'Map unavailable. Forecasts are still available alongside.',
    'map.limits': 'Boundaries:',
    'ranking.title': 'Ranking of the 14 regions',
    'footer.forecast': 'Forecasts: {link} (best available model, refreshed every 30 min).',
    'footer.limits': 'Administrative boundaries: {link} (CC BY 3.0 IGO), simplified. Forecast points: regional capitals.',
    'status.loading': 'Loading…',
    'status.refreshing': 'Refreshing…',
    'status.updated': 'Updated at {time}',
    'status.offline': 'Offline · ',
    'status.unavailable': 'Unavailable',
    'status.retry': 'Slow connection, attempt {n}/{total}…',
    'status.locating': 'Locating…',
    'banner.failed': 'Could not refresh ({error}). Showing forecasts from {date} at {time}.',
    'banner.retry': 'Try again',
    'banner.old': 'These forecasts are more than 6 hours old.',
    'error.title': 'Could not load forecasts',
    'error.hint': '{error}. Check your connection and try again.',
    'error.retry': 'Try again',
    'error.noInternet': 'No internet connection',
    'error.unreachable': 'Weather server unreachable',
    'error.timeout': 'Request timed out',
    'error.incomplete': 'Incomplete response from the weather server',
    'error.http': 'The weather server responded {status}',
    'error.geo': 'Location unavailable',
    'cache.tooOld': "Cached data is too old. Refresh to get today's forecasts.",
    'day.today': 'Today',
    'day.todayShort': 'Today',
    'day.tomorrow': 'Tomorrow',
    'detail.noData': 'No data for this day.',
    'detail.feels': 'Feels like',
    'detail.humidity': 'Humidity',
    'detail.wind': 'Wind',
    'detail.day': 'Day',
    'detail.modelled': 'Modelled values at {time} (Dakar time)',
    'detail.min': 'min',
    'detail.nearest': 'Region nearest to your location',
    'stat.rain': 'Rain',
    'stat.rainSub': 'Probability {p} %',
    'stat.windMax': 'Max wind',
    'stat.windSub': 'Mostly from {dir}',
    'stat.humidity': 'Humidity',
    'stat.humiditySub': 'Daily mean',
    'stat.uv': 'Max UV',
    'stat.cape': 'Max CAPE',
    'stat.capeSub': '{level} instability',
    'stat.pressure': 'Pressure',
    'stat.pressureSub': 'Surface mean',
    'stat.soil': 'Soil 0–7 cm',
    'stat.soilSub': 'Moisture {v} m³/m³',
    'stat.sun': 'Sun',
    'stat.sunSub': 'Sunrise – sunset',
    'section.hourly': 'Hour by hour',
    'section.forecast': '{n}-day forecast',
    'section.alerts': 'Things to watch',
    'chart.temp': 'Temperature (°C)',
    'chart.rain': 'Rain (mm/h)',
    'chart.aria': 'Hourly temperature and rain',
    'chart.none': 'No hourly data.',
    'chart.now': 'Now',
    'chart.tip': '{t} °C · rain {p} mm ({pp} %)<br>wind {w} km/h · humidity {h} %',
    'alert.heatHigh': 'Extreme heat: {v} °C expected.',
    'alert.heatMid': 'Very hot: {v} °C.',
    'alert.rainHigh': 'Heavy rain: {v} mm expected.',
    'alert.rainMid': 'Rain likely: {v} mm ({p} %).',
    'alert.storm': 'Very unstable atmosphere (CAPE {v} J/kg): thunderstorms possible.',
    'alert.wind': 'Strong wind: up to {v} km/h.',
    'alert.uv': 'Extreme UV ({v}): protection essential.',
    'disclaimer': 'Indicative thresholds. For official warnings, see ANACIM bulletins.',
    'legend.index': 'Index',
    'var.tempMax': 'Max temperature', 'var.tempMax.short': 'Max T',
    'var.tempMin': 'Min temperature', 'var.tempMin.short': 'Min T',
    'var.precipSum': 'Rainfall total', 'var.precipSum.short': 'Rain',
    'var.precipProbability': 'Chance of rain', 'var.precipProbability.short': 'Rain chance',
    'var.humidity': 'Mean relative humidity', 'var.humidity.short': 'Humidity',
    'var.windMax': 'Max wind at 10 m', 'var.windMax.short': 'Wind',
    'var.uv': 'Max UV index', 'var.uv.short': 'UV',
    'var.cape': 'Max CAPE (instability)', 'var.cape.short': 'CAPE',
    'var.pressure': 'Mean surface pressure', 'var.pressure.short': 'Pressure',
    'var.soilTemp': 'Soil temperature (0–7 cm)', 'var.soilTemp.short': 'Soil T',
    'var.soilMoisture': 'Soil moisture (0–7 cm)', 'var.soilMoisture.short': 'Soil moist.',
    'class.uv': ['Low', 'Moderate', 'High', 'Very high', 'Extreme'],
    'class.cape': ['Weak', 'Moderate', 'Strong', 'Very strong', 'Extreme'],
    'dirs': ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    'place.sea': 'Atlantic Ocean', 'place.gm': 'Gambia', 'place.mr': 'Mauritania',
    'place.ml': 'Mali', 'place.gn': 'Guinea', 'place.gw': 'Guinea-Bissau',
    'wx.0': 'Clear sky', 'wx.1': 'Mainly clear', 'wx.2': 'Partly cloudy', 'wx.3': 'Overcast',
    'wx.45': 'Fog', 'wx.48': 'Freezing fog',
    'wx.51': 'Light drizzle', 'wx.53': 'Drizzle', 'wx.55': 'Dense drizzle', 'wx.56': 'Freezing drizzle', 'wx.57': 'Freezing drizzle',
    'wx.61': 'Light rain', 'wx.63': 'Moderate rain', 'wx.65': 'Heavy rain', 'wx.66': 'Freezing rain', 'wx.67': 'Freezing rain',
    'wx.71': 'Snow', 'wx.73': 'Snow', 'wx.75': 'Snow', 'wx.77': 'Snow',
    'wx.80': 'Light showers', 'wx.81': 'Showers', 'wx.82': 'Violent showers', 'wx.85': 'Snow showers', 'wx.86': 'Snow showers',
    'wx.95': 'Thunderstorm', 'wx.96': 'Thunderstorm with hail', 'wx.99': 'Severe thunderstorm with hail',
    'wx.unknown': 'Unknown conditions'
  }
};

export const LANGS = ['fr', 'en'];
const LANG_KEY = 'lpaosf:lang';

function initialLang() {
  try {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* ignore */ }
  return (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
}

let lang = initialLang();

export const getLang = () => lang;
export const locale = () => (lang === 'en' ? 'en-GB' : 'fr-FR');

export function setLang(next) {
  if (!LANGS.includes(next)) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  document.documentElement.lang = next;
}

/** Traduit une clé ; {nom} est remplacé par params.nom. */
export function t(key, params = {}) {
  const v = DICT[lang][key] ?? DICT.fr[key] ?? key;
  if (typeof v !== 'string') return v;
  return v.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
}

/** Applique les traductions aux éléments statiques marqués data-i18n*. */
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(n => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });
  root.querySelectorAll('[data-i18n-title]').forEach(n => { n.title = t(n.dataset.i18nTitle); });
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = t('app.description');
}

/** Erreur dont le message est traduit au moment de l'affichage. */
export class AppError extends Error {
  constructor(key, params = {}) {
    super(key);
    this.key = key;
    this.params = params;
  }
  get text() { return t(this.key, this.params); }
}

export const errorText = e => (e instanceof AppError ? e.text : (e?.message || t('error.unreachable')));
