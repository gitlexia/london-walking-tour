/**
 * Location input helpers. We never fetch Google Maps Places API content:
 * a visitor can supply a Maps link containing coordinates or a place name,
 * while searching other places uses OpenStreetMap-powered geocoding.
 */
import { inLondon } from './trip.js';

const MAPS_HOSTS = new Set(['google.com', 'www.google.com', 'maps.google.com', 'google.co.uk', 'www.google.co.uk', 'maps.google.co.uk', 'maps.app.goo.gl', 'goo.gl']);

function coordinates(lat, lon, label = 'Map location') {
  const latitude = Number(lat);
  const longitude = Number(lon);
  return inLondon(latitude, longitude) ? { kind: 'coordinate', lat: latitude, lon: longitude, name: label.slice(0, 65) } : null;
}

function locationName(url) {
  const place = url.pathname.match(/\/maps\/place\/([^/]+)/i);
  if (place) {
    try { return decodeURIComponent(place[1].replace(/\+/g, ' ')).slice(0, 100); }
    catch { return place[1].replace(/\+/g, ' ').slice(0, 100); }
  }
  const search = url.searchParams.get('q') || url.searchParams.get('query');
  if (search && !/^place_id:/i.test(search)) return search.slice(0, 100);
  return '';
}

export function parsePlaceInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return { kind: 'invalid', message: 'Enter a place name, address or Google Maps link.' };

  const rawCoordinates = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (rawCoordinates) {
    return coordinates(rawCoordinates[1], rawCoordinates[2], 'My coordinates') ||
      { kind: 'invalid', message: 'Choose coordinates inside Greater London.' };
  }

  if (/^https?:\/\//i.test(value)) {
    let url;
    try { url = new URL(value); } catch { return { kind: 'invalid', message: 'That link is not valid.' }; }
    if (url.protocol !== 'https:' || !MAPS_HOSTS.has(url.hostname.toLowerCase())) {
      return { kind: 'invalid', message: 'Paste a Google Maps sharing link or search by place name.' };
    }
    if (url.hostname === 'maps.app.goo.gl' || (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps'))) {
      return { kind: 'shortlink', url: url.toString() };
    }

    // A pinned location's !3d!4d coordinates are more precise than @viewport coordinates.
    const fullUrl = `${url.pathname}${url.search}`;
    const pin = fullUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i);
    const requested = url.searchParams.get('q') || url.searchParams.get('query');
    const explicit = requested?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const label = locationName(url) || 'Shared map point';
    if (pin || explicit) {
      const result = coordinates(...(pin || explicit).slice(1, 3), label);
      return result || { kind: 'invalid', message: 'That shared map point is outside Greater London.' };
    }
    if (label) return { kind: 'query', query: label };
    // @ is often the camera centre, not the entrance: use it only if the link contains no place name.
    const camera = fullUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (camera) {
      return coordinates(camera[1], camera[2], 'Shared map point') ||
        { kind: 'invalid', message: 'That shared location is outside Greater London.' };
    }
    return { kind: 'invalid', message: 'This Google Maps link has no usable location. Try searching for the place by name.' };
  }
  if (value.length < 3 || value.length > 120) return { kind: 'invalid', message: 'Use a place name between 3 and 120 characters.' };
  return { kind: 'query', query: value };
}

export function moveStop(ids, from, to) {
  if (!Array.isArray(ids)) return [];
  if (!Number.isInteger(from) || !Number.isInteger(to) ||
    from < 0 || to < 0 || from >= ids.length || to >= ids.length) return [...ids];
  const next = [...ids];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

export function safePlaceResults(records) {
  return (Array.isArray(records) ? records : []).filter(p => p && inLondon(Number(p.lat), Number(p.lon)))
    .slice(0, 7).map(p => ({
      name: String(p.name || 'London place').replace(/[<>]/g, '').slice(0, 65),
      detail: String(p.detail || '').replace(/[<>]/g, '').slice(0, 180),
      lat: Number(Number(p.lat).toFixed(6)), lon: Number(Number(p.lon).toFixed(6))
    }));
}
