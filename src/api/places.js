/**
 * Search OpenStreetMap Nominatim on explicit user submit (never autocomplete).
 * Resolve Google Maps short-link redirects, without scraping Google place data.
 * Appropriate for a small personal site; for large traffic use a dedicated
 * commercial geocoding provider or your own Nominatim instance.
 */
const VIEWBOX = '-0.65,51.8,0.35,51.2';
const GOOGLE_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com', 'google.co.uk', 'www.google.co.uk', 'maps.google.co.uk']);
let lastLookup = 0;

function london(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 51.2 && lat <= 51.8 && lon >= -0.65 && lon <= 0.35;
}

function linkAllowed(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && GOOGLE_HOSTS.has(u.hostname.toLowerCase()) &&
      !(u.hostname === 'goo.gl' && !u.pathname.startsWith('/maps'));
  } catch { return false; }
}

function appHost(request) {
  const candidate = String(request.headers.host || '').replace(/[^a-zA-Z0-9.:-]/g, '').slice(0, 120);
  return candidate || 'london-on-foot.vercel.app';
}

export default async function handler(request, response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const shortUrl = request.query?.url;
  if (typeof shortUrl === 'string') {
    if (shortUrl.length > 500 || !linkAllowed(shortUrl)) return response.status(400).json({ error: 'Invalid Google Maps link' });
    try {
      let url = shortUrl;
      for (let i = 0; i < 6; i++) {
        if (!linkAllowed(url)) return response.status(400).json({ error: 'Not a Google Maps sharing link' });
        const result = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5500) });
        if (result.status >= 300 && result.status < 400) {
          const next = result.headers.get('location');
          if (!next) break;
          url = new URL(next, url).toString();
          continue;
        }
        break;
      }
      if (!linkAllowed(url)) return response.status(400).json({ error: 'Unexpected destination for map link' });
      return response.status(200).json({ url });
    } catch { return response.status(502).json({ error: 'Could not open that sharing link. Search by name instead.' }); }
  }

  const q = typeof request.query?.q === 'string' ? request.query.q.trim() : '';
  if (q.length < 3 || q.length > 120) return response.status(400).json({ error: 'Enter a London place or address (3–120 characters).' });
  // Best-effort instance throttle. Global 1 request/sec cannot be guaranteed on
  // serverless; for higher usage replace this with a provider and a shared limiter.
  if (Date.now() - lastLookup < 1050) return response.status(429).json({ error: 'Please wait a moment before searching again.' });
  lastLookup = Date.now();
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '7');
    url.searchParams.set('viewbox', VIEWBOX);
    url.searchParams.set('bounded', '1');
    const upstream = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'User-Agent': `LondonOnFoot/1.0 (+https://${appHost(request)})`,
        'Referer': `https://${appHost(request)}/`
      },
      signal: AbortSignal.timeout(9000)
    });
    if (!upstream.ok) return response.status(upstream.status === 429 ? 429 : 502).json({ error: 'Place search is temporarily unavailable. Please try again.' });
    const places = await upstream.json();
    const results = (Array.isArray(places) ? places : []).filter(p => london(Number(p.lat), Number(p.lon)))
      .slice(0, 7).map(p => ({
        name: String(p.name || p.display_name?.split(',')[0] || 'London location').slice(0, 65),
        detail: String(p.display_name || '').slice(0, 180), lat: Number(p.lat), lon: Number(p.lon)
      }));
    response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return response.status(200).json({ results, attribution: '© OpenStreetMap contributors' });
  } catch { return response.status(502).json({ error: 'Place search is temporarily unavailable. You can also add a point by clicking the map.' }); }
}
