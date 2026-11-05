import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaceInput, moveStop, safePlaceResults } from '../src/lib/place-search.js';
import placesHandler from '../api/places.js';

const result = (input) => parsePlaceInput(input);

test('the place finder accepts London names, addresses and postcodes', () => {
  assert.deepEqual(result('Hampstead Heath'), { kind:'query', query:'Hampstead Heath' });
  assert.deepEqual(result('NW3 7JE'), { kind:'query', query:'NW3 7JE' });
  assert.equal(result('H').kind, 'invalid');
});

test('the place finder accepts Google Maps named links and precise coordinates', () => {
  const named = result('https://www.google.com/maps/place/Hampstead+Heath/@51.56,-0.16,15z/');
  assert.deepEqual(named, { kind:'query', query:'Hampstead Heath' });
  const pinned = result('https://www.google.com/maps/place/Hampstead+Heath/data=!4m6!3m5!8m2!3d51.560863!4d-0.163572');
  assert.equal(pinned.name, 'Hampstead Heath');
  assert.equal(pinned.lat, 51.560863);
  assert.equal(pinned.lon, -0.163572);
  assert.equal(result('https://maps.app.goo.gl/abc12').kind, 'shortlink');
  assert.equal(result('https://google.com/maps?q=51.56,-0.16').kind, 'coordinate');
  assert.equal(result('51.5608, -0.1635').kind, 'coordinate');
});

test('unsafe links, locations outside London and malformed coordinates are refused', () => {
  assert.equal(result('https://evil.example.com/maps/@51.56,-0.16').kind, 'invalid');
  assert.equal(result('https://www.google.com/maps?q=48.8584,2.2945').kind, 'invalid');
  assert.equal(result('48.8584,2.2945').kind, 'invalid');
});

test('moving items keeps all stops and supports arbitrary positions', () => {
  const ids = ['camden-lock', 'hampstead-heath', 'primrose-hill', 'regents-park'];
  assert.deepEqual(moveStop(ids, 1, 3), ['camden-lock', 'primrose-hill', 'regents-park', 'hampstead-heath']);
  assert.deepEqual(moveStop(ids, 3, 0), ['regents-park', 'camden-lock', 'hampstead-heath', 'primrose-hill']);
  assert.deepEqual(moveStop(ids, 3, 5), ids);
  assert.deepEqual(ids, ['camden-lock', 'hampstead-heath', 'primrose-hill', 'regents-park']);
});

test('external results are validated and sanitised before being added', () => {
  assert.deepEqual(safePlaceResults([{name:'Hampstead Heath',lat:51.56,lon:-0.16,detail:'North London'}, {name:'Paris',lat:48.85,lon:2.29}]),
    [{name:'Hampstead Heath',lat:51.56,lon:-0.16,detail:'North London'}]);
});

function makeResponse() {
  return { headers: {}, statusCode: 200, setHeader(k,v){ this.headers[k] = v; return this; },
    status(s){ this.statusCode=s; return this; }, json(o){ this.body=o; return this; } };
}

test('the places API refuses wrong methods and malicious short links', async () => {
  let r = makeResponse();
  await placesHandler({method:'POST', query:{}}, r);
  assert.equal(r.statusCode, 405);
  r = makeResponse();
  await placesHandler({method:'GET', query:{url:'https://attacker.example.com/latest'},headers:{}}, r);
  assert.equal(r.statusCode,400);
});

test('the places API returns valid London search results from OpenStreetMap', async () => {
  const original = globalThis.fetch;
  try {
    let requestedUrl;
    let identifying;
    globalThis.fetch = async (url, options) => {
      requestedUrl = String(url);
      identifying = options.headers['User-Agent'];
      return { ok:true, json:async()=>[
        {name:'Hampstead Heath',display_name:'Hampstead Heath, London, UK',lat:'51.560863',lon:'-0.163572'},
        {name:'Eiffel Tower',display_name:'Paris',lat:'48.8584',lon:'2.2945'}
      ] };
    };
    const r = makeResponse();
    await placesHandler({method:'GET', query:{q:'Hampstead Heath'},headers:{host:'london-on-foot.vercel.app'}},r);
    assert.equal(r.statusCode,200);
    assert.equal(r.body.results.length,1);
    assert.equal(r.body.results[0].name,'Hampstead Heath');
    assert.ok(requestedUrl.includes('nominatim.openstreetmap.org'));
    assert.ok(identifying.includes('LondonOnFoot/1.0'));
  } finally { globalThis.fetch = original; }
});

test('the places API resolves Google Maps short redirects only within allowed hosts', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => ({ status:302, headers:{get(name){ return name==='location' ? 'https://www.google.com/maps/place/Hampstead+Heath/@51.56,-0.16,14z' : null; }} });
    const r = makeResponse();
    await placesHandler({method:'GET', query:{url:'https://maps.app.goo.gl/xyz'},headers:{}},r);
    assert.equal(r.statusCode,200);
    assert.ok(r.body.url.includes('Hampstead'));
  } finally { globalThis.fetch = original; }
});
