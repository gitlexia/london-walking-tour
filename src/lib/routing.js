import { estimateMatrix, makeLegs } from './optimizer.js';

const IS_VERCEL_BUILD = import.meta.env?.PROD === true;
const ROUTING_URL = IS_VERCEL_BUILD ? '/api/routing' : '/routing';
const BASE_SPEED_KMH = 4.8; // Approximate default used for display-time adjustment.

async function postValhalla(endpoint, payload, signal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const url = IS_VERCEL_BUILD ? `${ROUTING_URL}?endpoint=${encodeURIComponent(endpoint)}` : `${ROUTING_URL}/${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Routing service returned HTTP ${response.status}`);
    const data = await response.json();
    if (data.error_code || data.error) throw new Error(data.error || 'Routing service error');
    return data;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function decodePolyline6(encoded) {
  if (typeof encoded !== 'string') return [];
  let position = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates = [];
  const nextNumber = () => {
    let result = 0;
    let shift = 0;
    while (position < encoded.length) {
      const byte = encoded.charCodeAt(position++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (byte < 0x20) return (result & 1) ? ~(result >> 1) : result >> 1;
    }
    throw new Error('Invalid encoded route geometry.');
  };
  while (position < encoded.length) {
    latitude += nextNumber();
    longitude += nextNumber();
    coordinates.push([latitude / 1e6, longitude / 1e6]);
  }
  return coordinates;
}

function parseMatrix(data, places, speed) {
  const rows = data.sources_to_targets;
  const n = places.length;
  if (!Array.isArray(rows) || rows.length !== n || rows.some(row => !Array.isArray(row) || row.length !== n)) {
    throw new Error('Incomplete walking-time matrix.');
  }
  const time = [];
  const distance = [];
  for (let i = 0; i < n; i++) {
    const t = [], d = [];
    for (let j = 0; j < n; j++) {
      const point = rows[i][j];
      const seconds = Number(point?.time);
      const km = Number(point?.distance);
      if (point?.time == null || point?.distance == null || !Number.isFinite(seconds) || !Number.isFinite(km) || seconds < 0 || km < 0) {
        throw new Error('Walking route missing between stops.');
      }
      t.push(seconds * BASE_SPEED_KMH / speed);
      d.push(km);
    }
    time.push(t); distance.push(d);
  }
  return { time, distance, source: 'walking-times' };
}

/**
 * User-initiated calls only (do not query while typing or panning).
 * Returns a routed time matrix; if public server is offline, an honest estimate.
 */
export async function fetchWalkingMatrix(places, speedKmh, signal) {
  const locations = places.map(({lat,lon}) => ({lat,lon}));
  try {
    const data = await postValhalla('sources_to_targets', {
      sources: locations, targets: locations, costing: 'pedestrian', units: 'km'
    }, signal);
    return parseMatrix(data, places, speedKmh);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ...estimateMatrix(places, speedKmh), fallbackReason: error?.message || 'Routing service unavailable' };
  }
}

/**
 * Draw actual pedestrian paths and per-leg distances after order is chosen.
 * If path fetch fails, retain street-time matrix and draw direct-line approximations.
 */
export async function fetchWalkingLegs(places, order, matrix, roundTrip, speedKmh, signal, tryEstimatedRoute = false) {
  const fallbackLegs = makeLegs(order, matrix, places, roundTrip);
  if ((matrix.source === 'estimate' && !tryEstimatedRoute) || order.length < 2) return { legs: fallbackLegs, source: matrix.source };
  const sequence = roundTrip ? [...order, order[0]] : order;
  try {
    const data = await postValhalla('route', {
      locations: sequence.map(index => ({lat: places[index].lat, lon: places[index].lon, type: 'break'})),
      costing: 'pedestrian', units: 'km', directions_type: 'instructions'
    }, signal);
    const legs = data.trip?.legs;
    if (!Array.isArray(legs) || legs.length !== sequence.length - 1) throw new Error('Missing street paths.');
    return {
      source: 'walking-path',
      legs: fallbackLegs.map((leg, index) => {
        const live = legs[index];
        const coords = decodePolyline6(live.shape);
        if (coords.length < 2) throw new Error('Missing geometry for a walking leg.');
        return {
          ...leg,
          km: Number.isFinite(live.summary?.length) ? live.summary.length : leg.km,
          minutes: Number.isFinite(live.summary?.time) ? live.summary.time * BASE_SPEED_KMH / speedKmh / 60 : leg.minutes,
          coords,
          directions: (live.maneuvers || []).map(m => m.instruction).filter(Boolean)
        };
      })
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { legs: fallbackLegs, source: matrix.source === 'estimate' ? 'estimate' : 'walking-times', fallbackReason: error?.message || 'Route geometry unavailable' };
  }
}
