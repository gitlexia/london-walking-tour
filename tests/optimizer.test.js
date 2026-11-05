import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMatrix, haversineKm, makeLegs, optimiseOrder, tourCost } from '../src/lib/optimizer.js';
import { BY_ID, PLACES, PRESETS, MAX_STOPS, CATEGORIES, matchesCategory } from '../src/data.js';
import { PHOTOS, PHOTO_FOR_PLACE, photoUrl } from '../src/photos.js';
import { cleanTrip } from '../src/lib/trip.js';
import { decodePolyline6, fetchWalkingMatrix, fetchWalkingLegs } from '../src/lib/routing.js';

test('all curated places have unique IDs and sensible London coordinates', () => {
  assert.equal(new Set(PLACES.map(p => p.id)).size, PLACES.length);
  for (const p of PLACES) {
    assert.ok(p.lat >= 51.40 && p.lat <= 51.56, p.name);
    assert.ok(p.lon >= -0.25 && p.lon <= 0.02, p.name);
    assert.ok(p.visit > 0);
  }
});

test('presets reference known stops and respect the route limit', () => {
  for (const preset of PRESETS) {
    assert.ok(preset.ids.length <= MAX_STOPS);
    for (const id of preset.ids) assert.ok(BY_ID[id], id);
  }
});

test('haversine distance identical place is zero and symmetric', () => {
  const a = { lat: 51.51, lon: -0.13 }, b = { lat: 51.515, lon: -0.09 };
  assert.equal(haversineKm(a,a), 0);
  assert.ok(Math.abs(haversineKm(a,b) - haversineKm(b,a)) < 1e-8);
});

test('route optimiser returns each place once and improves a poor sequence', () => {
  const time = [[0, 10, 1, 20], [10,0,10,1], [1,10,0,1], [20,1,1,0]];
  const result = optimiseOrder(time, { startIndex: 0 });
  assert.deepEqual(new Set(result), new Set([0,1,2,3]));
  assert.equal(result[0], 0);
  assert.ok(tourCost(result,time) <= tourCost([0,1,2,3],time));
});

test('round trips include closing leg, while point-to-point trips do not', () => {
  const places = [BY_ID['big-ben'], BY_ID['westminster-abbey']];
  const matrix = estimateMatrix(places);
  assert.equal(makeLegs([0,1], matrix, places, false).length, 1);
  assert.equal(makeLegs([0,1], matrix, places, true).length, 2);
  assert.equal(makeLegs([0], matrix, places, true).length, 0);
  assert.ok(tourCost([0,1],matrix.time,true) > tourCost([0,1],matrix.time,false));
});

test('asymmetric costs and fixed-start constraints are supported', () => {
  const times = [[0,1,4],[8,0,1],[1,6,0]];
  const result = optimiseOrder(times,{startIndex:1});
  assert.equal(result[0],1);
  assert.equal(result.length,3);
  assert.ok(tourCost(result,times) <= tourCost([1,0,2],times));
});

test('empty route / single stop handled', () => {
  assert.deepEqual(optimiseOrder([]), []);
  assert.deepEqual(optimiseOrder([[0]]), [0]);
  assert.throws(() => optimiseOrder([[0,-2],[1,0]]));
});

test('shared inputs are limited, cleaned and deduplicated', () => {
  const ids = [...PRESETS[0].ids, ...PRESETS[0].ids, 'injected-id'];
  const trip = cleanTrip({ ids, start:'injected-id', pace:1000, loop:true, visits:{'big-ben':90,'unknown':-3} });
  assert.equal(trip.ids.length, PRESETS[0].ids.length);
  assert.equal(trip.start, '');
  assert.equal(trip.pace,4.5);
  assert.equal(trip.loop,true);
});

test('polyline6 decoder accepts empty and a simple encoded point', () => {
  assert.deepEqual(decodePolyline6(''), []);
  // A known 6-decimal line: [0,0] to [0.000001,0.000001]
  assert.deepEqual(decodePolyline6('??AA'), [[0,0],[0.000001,0.000001]]);
});


test('Valhalla matrix and route responses produce pedestrian paths', async () => {
  const originalFetch = globalThis.fetch;
  const sample = [BY_ID['big-ben'], BY_ID['westminster-abbey']];
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith('/sources_to_targets')) {
      return new Response(JSON.stringify({ sources_to_targets: [
        [{distance:0,time:0},{distance:0.4,time:300}],
        [{distance:0.4,time:330},{distance:0,time:0}]
      ] }), {status:200});
    }
    return new Response(JSON.stringify({trip:{legs:[{
      summary:{length:0.5,time:360}, shape:'??AA',maneuvers:[{instruction:'Continue straight'}]
    }]}}), {status:200});
  };
  try {
    const matrix = await fetchWalkingMatrix(sample,4.8);
    assert.equal(matrix.source,'walking-times');
    assert.equal(matrix.time[0][1],300);
    const route = await fetchWalkingLegs(sample,[0,1],matrix,false,4.8);
    assert.equal(route.source,'walking-path');
    assert.equal(route.legs[0].km,0.5);
    assert.deepEqual(route.legs[0].directions,['Continue straight']);
    assert.equal(calls.length,2);
  } finally { globalThis.fetch = originalFetch; }
});

test('unreachable routing service falls back to explicitly estimated walk', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const matrix = await fetchWalkingMatrix([BY_ID['big-ben'], BY_ID['westminster-abbey']], 4.5);
    assert.equal(matrix.source,'estimate');
    assert.ok(matrix.fallbackReason.includes('offline'));
    assert.ok(matrix.distance[0][1] > 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('new London character categories filter local, walkable stops', () => {
  for (const area of ['South London character','West London character','North London character']) {
    assert.ok(CATEGORIES.includes(area));
    assert.ok(PLACES.filter(p => matchesCategory(p, area)).length >= 6, area);
  }
  assert.equal(matchesCategory(BY_ID['brixton-village'], 'South London character'), true);
  assert.equal(matchesCategory(BY_ID['brixton-village'], 'West London character'), false);
  assert.equal(matchesCategory(BY_ID['portobello-road'], 'West London character'), true);
  assert.equal(matchesCategory(BY_ID['camden-market'], 'North London character'), true);
  assert.equal(matchesCategory(BY_ID['camden-market'], 'Markets'), true);
  for (const id of ['south','west','north']) assert.ok(PRESETS.find(p => p.id === id), id);
});

test('all place and preset photos have explicit Wikimedia source and CC attribution', () => {
  assert.equal(PLACES.length, 53);
  for (const p of PLACES) {
    const key = PHOTO_FOR_PLACE[p.id];
    assert.ok(PHOTOS[key], `${p.name} lacks a photo`);
    assert.match(photoUrl(key), /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
  }
  for (const p of PRESETS) assert.ok(PHOTOS[p.photo]);
  for (const image of Object.values(PHOTOS)) {
    assert.match(image.license, /^CC BY/);
    assert.ok(image.author && image.filename && image.licenseUrl);
  }
});

test('manual route can draw pedestrian paths directly without matrix optimisation', async () => {
  const originalFetch = globalThis.fetch;
  const places = [
    {id:'pin-my-flat',lat:51.491,lon:-.115},
    BY_ID['big-ben'],
    {id:'pin-coffee',lat:51.503,lon:-.118}
  ];
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({url, input: JSON.parse(init.body)});
    return new Response(JSON.stringify({trip:{legs:[
      {shape:'??AA', summary:{length:.6,time:400}, maneuvers:[]},
      {shape:'??AA', summary:{length:.4,time:260}, maneuvers:[]}
    ]}}), {status:200});
  };
  try {
    const result = await fetchWalkingLegs(places,[0,1,2],estimateMatrix(places),false,4.5,undefined,true);
    assert.equal(result.source,'walking-path');
    assert.equal(result.legs.length,2);
    assert.equal(result.legs[1].to,'pin-coffee');
    assert.equal(calls.length,1);
    assert.ok(calls[0].url.endsWith('/route'));
    assert.deepEqual(calls[0].input.locations.map(p=>p.lat), places.map(p=>p.lat));
  } finally { globalThis.fetch = originalFetch; }
});

test('manual route falls back to explicitly approximate lines if direct routing fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const places = [BY_ID['big-ben'], BY_ID['westminster-abbey']];
    const result = await fetchWalkingLegs(places,[0,1],estimateMatrix(places),false,4.5,undefined,true);
    assert.equal(result.source,'estimate');
    assert.equal(result.legs.length,1);
    assert.equal(result.legs[0].coords.length,2);
  } finally { globalThis.fetch = originalFetch; }
});
