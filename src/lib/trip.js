import { BY_ID, DEFAULT_IDS, MAX_STOPS } from '../data.js';

const STORAGE_KEY = 'london-on-foot-v2';
const LEGACY_KEY = 'london-on-foot-v1';
const SPEEDS = [3.5, 4.5, 5.5];
export const LONDON_BOUNDS = { minLat: 51.2, maxLat: 51.8, minLon: -0.65, maxLon: 0.35 };

export function inLondon(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= LONDON_BOUNDS.minLat && lat <= LONDON_BOUNDS.maxLat &&
    lon >= LONDON_BOUNDS.minLon && lon <= LONDON_BOUNDS.maxLon;
}
export function isCustom(id) { return typeof id === 'string' && id.startsWith('pin-'); }

export function cleanTrip(raw) {
  // Keep arbitrary pins as first-class stops, but never trust shared URLs / local storage.
  const custom = Array.isArray(raw?.custom) ? raw.custom.filter(p =>
    p && typeof p.id === 'string' && /^pin-[a-zA-Z0-9_-]{1,60}$/.test(p.id) &&
    inLondon(Number(p.lat), Number(p.lon))
  ).slice(0, MAX_STOPS).map(p => ({
    id: p.id, lat: Number(Number(p.lat).toFixed(6)), lon: Number(Number(p.lon).toFixed(6)),
    name: String(p.name || 'Map pin').replace(/[<>]/g, '').trim().slice(0, 65) || 'Map pin',
    visit: 0, area: 'Your map pin', category: 'Custom stop', detail: 'A point you selected on the map.'
  })) : [];
  const uniqueCustom = [...new Map(custom.map(p => [p.id, p])).values()];
  const usable = new Set([...Object.keys(BY_ID), ...uniqueCustom.map(p => p.id)]);
  const ids = Array.isArray(raw?.ids) ? [...new Set(raw.ids.filter(id => typeof id === 'string' && usable.has(id)))].slice(0, MAX_STOPS) : [...DEFAULT_IDS];
  const selected = new Set(ids);
  const start = typeof raw?.start === 'string' && selected.has(raw.start) ? raw.start : '';
  const pace = SPEEDS.includes(Number(raw?.pace)) ? Number(raw.pace) : 4.5;
  const visits = Object.fromEntries(Object.entries(raw?.visits && typeof raw.visits === 'object' ? raw.visits : {})
    .filter(([id, minutes]) => selected.has(id) && Number.isInteger(minutes) && minutes >= 0 && minutes <= 240));
  return { ids, custom: uniqueCustom.filter(p => selected.has(p.id)), start, loop: raw?.loop === true,
    pace, visits, mode: raw?.mode === 'manual' ? 'manual' : 'optimise' };
}

export function getPlace(id, trip) {
  return BY_ID[id] || trip.custom?.find(p => p.id === id) || null;
}
export function tripPlaces(trip) {
  return trip.ids.map(id => getPlace(id, trip)).filter(Boolean);
}

export function loadTrip() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('stops')) {
      const pins = params.get('pins');
      const visits = params.get('visits');
      return cleanTrip({ ids: params.get('stops')?.split(','), custom: pins?.length < 4000 ? JSON.parse(pins || '[]') : [],
        visits: visits?.length < 2000 ? JSON.parse(visits || '{}') : {},
        start: params.get('start') || '', loop: params.get('loop') === '1',
        pace: Number(params.get('pace')), mode: params.get('mode') || 'optimise' });
    }
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    return cleanTrip(saved ? JSON.parse(saved) : {});
  } catch { return cleanTrip({}); }
}

export function persistTrip(trip) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanTrip(trip))); } catch { /* private browsing */ }
}

export function shareUrl(trip) {
  const safe = cleanTrip(trip);
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('stops', safe.ids.join(','));
  if (safe.custom.length) url.searchParams.set('pins', JSON.stringify(safe.custom.map(({id, lat, lon, name}) => ({id, lat, lon, name}))));
  if (safe.start) url.searchParams.set('start', safe.start);
  if (safe.loop) url.searchParams.set('loop', '1');
  if (safe.pace !== 4.5) url.searchParams.set('pace', safe.pace);
  if (safe.mode === 'manual') url.searchParams.set('mode', 'manual');
  if (Object.keys(safe.visits).length) url.searchParams.set('visits', JSON.stringify(safe.visits));
  return url.toString();
}

export function downloadJson(trip, order) {
  const safe = cleanTrip(trip);
  const payload = {
    app: 'London on Foot', version: 2, exportedAt: new Date().toISOString(),
    preferences: safe,
    itinerary: order.map((id, index) => ({ position: index + 1, id,
      place: getPlace(id, safe)?.name || id, lat: getPlace(id, safe)?.lat, lon: getPlace(id, safe)?.lon }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  anchor.href = url; anchor.download = 'my-london-walk.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function googleMapsUrl(order, roundTrip, trip) {
  const locations = order.map(id => getPlace(id, trip)).filter(Boolean);
  if (locations.length < 2) return null;
  const points = roundTrip ? [...locations, locations[0]] : locations;
  const coord = ({lat, lon}) => `${lat},${lon}`;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', coord(points[0]));
  url.searchParams.set('destination', coord(points[points.length - 1]));
  url.searchParams.set('travelmode', 'walking');
  if (points.length > 2) url.searchParams.set('waypoints', points.slice(1, -1).map(coord).join('|'));
  return url.toString();
}
