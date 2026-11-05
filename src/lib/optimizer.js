/**
 * London on Foot routing heuristics.
 * Reimplements the nearest-neighbour / 2-opt ideas from the source T13 Java project
 * for a *path* (no forced return), with optional fixed starting point and loop.
 * Costs can be asymmetric; all comparisons recompute full directed path costs.
 */
const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// This is explicitly an estimate, NOT road network distance.
export function estimateMatrix(places, speedKmh = 4.5) {
  const distance = places.map((a, i) => places.map((b, j) => i === j ? 0 : haversineKm(a, b) * 1.28));
  const time = distance.map(row => row.map(km => km / speedKmh * 3600));
  return { distance, time, source: 'estimate' };
}

export function tourCost(order, times, roundTrip = false) {
  if (order.length < 2) return 0;
  let cost = 0;
  for (let i = 1; i < order.length; i++) cost += times[order[i - 1]][order[i]];
  if (roundTrip) cost += times[order[order.length - 1]][order[0]];
  return cost;
}

function nearestNeighbour(times, start) {
  const remaining = new Set(times.map((_, i) => i));
  remaining.delete(start);
  const order = [start];
  while (remaining.size) {
    const last = order[order.length - 1];
    let next = null;
    let lowest = Infinity;
    for (const candidate of remaining) {
      if (times[last][candidate] < lowest) {
        lowest = times[last][candidate];
        next = candidate;
      }
    }
    order.push(next);
    remaining.delete(next);
  }
  return order;
}

function improveOrder(initial, times, roundTrip) {
  let best = initial.slice();
  let bestCost = tourCost(best, times, roundTrip);
  const n = best.length;
  // Preserve the starting point while improving the sequence.
  // Search 2-opt reversals, pair swaps, and single-stop relocations.
  for (let pass = 0; pass < 40; pass++) {
    let improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const reverse = best.slice();
        reverse.splice(i, j - i + 1, ...best.slice(i, j + 1).reverse());
        const swapped = best.slice();
        [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
        for (const candidate of [reverse, swapped]) {
          const cost = tourCost(candidate, times, roundTrip);
          if (cost + 1e-8 < bestCost) { best = candidate; bestCost = cost; improved = true; }
        }
      }
    }
    for (let i = 1; i < n; i++) {
      for (let j = 1; j < n; j++) {
        if (i === j) continue;
        const moved = best.slice();
        const [stop] = moved.splice(i, 1);
        moved.splice(j, 0, stop);
        const cost = tourCost(moved, times, roundTrip);
        if (cost + 1e-8 < bestCost) { best = moved; bestCost = cost; improved = true; }
      }
    }
    if (!improved) break;
  }
  return best;
}

export function optimiseOrder(times, { startIndex = null, roundTrip = false } = {}) {
  const n = times.length;
  if (!n) return [];
  if (!times.every(row => row.length === n && row.every(v => Number.isFinite(v) && v >= 0))) {
    throw new Error('A complete non-negative time matrix is required.');
  }
  if (startIndex !== null && (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= n)) {
    throw new Error('Starting place is outside of the selected stops.');
  }
  const starts = startIndex === null ? [...Array(n).keys()] : [startIndex];
  let winner = null;
  let lowest = Infinity;
  for (const start of starts) {
    const candidate = improveOrder(nearestNeighbour(times, start), times, roundTrip);
    const cost = tourCost(candidate, times, roundTrip);
    if (cost < lowest) { winner = candidate; lowest = cost; }
  }
  return winner;
}

export function makeLegs(order, matrix, places, roundTrip = false, paths = []) {
  if (order.length < 2) return [];
  const sequence = roundTrip ? [...order, order[0]] : order;
  return sequence.slice(1).map((toIndex, index) => {
    const fromIndex = sequence[index];
    return {
      from: places[fromIndex].id,
      to: places[toIndex].id,
      km: matrix.distance[fromIndex][toIndex],
      minutes: matrix.time[fromIndex][toIndex] / 60,
      coords: paths[index] || [[places[fromIndex].lat, places[fromIndex].lon], [places[toIndex].lat, places[toIndex].lon]]
    };
  });
}

export function formatMinutes(value) {
  const minutes = Math.round(value);
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}
