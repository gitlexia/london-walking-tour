import test from 'node:test';
import assert from 'node:assert/strict';
import { BY_ID, MAX_STOPS } from '../src/data.js';
import { cleanTrip, getPlace, tripPlaces, inLondon, googleMapsUrl, shareUrl, loadTrip } from '../src/lib/trip.js';

const sample = {
  custom: [
    { id: 'pin-start', name: 'My flat', lat: 51.49123, lon: -0.11534 },
    { id: 'pin-cafe', name: 'Coffee stop', lat: 51.4935, lon: -0.1128 }
  ],
  ids: ['pin-start', 'big-ben', 'pin-cafe', 'westminster-abbey'],
  mode: 'manual', start: 'pin-start', pace: 3.5, loop: false,
  visits: { 'pin-start': 0, 'big-ben': 30, 'pin-cafe': 15 }
};

test('alternating map pins and attractions preserve chosen order and a custom start', () => {
  const trip = cleanTrip(sample);
  assert.deepEqual(trip.ids, sample.ids);
  assert.equal(trip.start, 'pin-start');
  assert.equal(trip.mode, 'manual');
  assert.deepEqual(tripPlaces(trip).map(p => p.name), ['My flat', BY_ID['big-ben'].name, 'Coffee stop', BY_ID['westminster-abbey'].name]);
  assert.equal(getPlace('pin-start', trip).visit, 0);
  assert.equal(trip.visits['pin-start'], 0);
  assert.equal(trip.visits['pin-cafe'], 15);
});

test('shared links restore all custom coordinates, manual order, names, pace, visits and loop', () => {
  const initial = globalThis.window;
  try {
    globalThis.window = { location: { href: 'http://localhost:5173/' } };
    const url = shareUrl(sample);
    assert.equal(new URL(url).searchParams.get('mode'), 'manual');
    assert.ok(url.includes('pin-start'));
    globalThis.window = { location: { href: url, search: new URL(url).search } };
    assert.deepEqual(loadTrip(), cleanTrip(sample));
    const google = googleMapsUrl(sample.ids, true, cleanTrip(sample));
    const params = new URL(google).searchParams;
    assert.equal(params.get('origin'), '51.49123,-0.11534');
    assert.equal(params.get('destination'), '51.49123,-0.11534');
    assert.ok(params.get('waypoints').includes('51.4935,-0.1128'));
  } finally { globalThis.window = initial; }
});

test('invalid, out-of-London and forged pins are discarded from shared data', () => {
  const trip = cleanTrip({ ids: ['pin-bad','pin-outside','pin-valid','big-ben','big-ben'],
    custom: [
      { id:'pin-bad',lat:NaN,lon:0,name:'Unsafe' },
      { id:'pin-outside',lat:48.8,lon:2.3,name:'Paris' },
      { id:'pin-valid',lat:51.5,lon:-.1,name:'<script>Here</script>' }
    ], start:'pin-outside', mode:'manual' });
  assert.deepEqual(trip.ids, ['pin-valid','big-ben']);
  assert.equal(trip.start, '');
  assert.equal(trip.custom[0].name, 'scriptHere/script');
  assert.equal(inLondon(51.5, -.12), true);
  assert.equal(inLondon(40.7, -.12), false);
  assert.ok(trip.ids.length <= MAX_STOPS);
});

test('missing custom stop is removed cleanly, maintaining curated points', () => {
  const trip = cleanTrip({...sample, ids: ['big-ben','pin-start'], custom: []});
  assert.deepEqual(trip.ids, ['big-ben']);
  assert.equal(trip.start, '');
});
