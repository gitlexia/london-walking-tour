/**
 * London on Foot pedestrian routing proxy for Vercel Functions.
 * Requests are server-side so public browsers do not need a special CORS setup.
 * This endpoint intentionally supports only the two Valhalla operations we use.
 */
const VALHALLA_API = 'https://valhalla1.openstreetmap.de';
const MAX_REQUEST_SIZE = 16000;
const ALLOWED_ENDPOINTS = new Set(['route', 'sources_to_targets']);
const withinLondon = ({ lat, lon }) =>
  typeof lat === 'number' && Number.isFinite(lat) && lat >= 51.2 && lat <= 51.75 &&
  typeof lon === 'number' && Number.isFinite(lon) && lon >= -0.6 && lon <= 0.3;

function isValidRequest(endpoint, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.costing !== 'pedestrian') return false;
  if (endpoint === 'route') {
    return Array.isArray(body.locations) && body.locations.length >= 2 && body.locations.length <= 10 &&
      body.locations.every(withinLondon);
  }
  return Array.isArray(body.sources) && Array.isArray(body.targets) &&
    body.sources.length >= 2 && body.sources.length <= 9 && body.targets.length >= 2 && body.targets.length <= 9 &&
    body.sources.every(withinLondon) && body.targets.every(withinLondon);
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const endpoint = request.query?.endpoint;
  if (typeof endpoint !== 'string' || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return response.status(400).json({ error: 'Unsupported routing operation' });
  }
  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    if (JSON.stringify(body).length > MAX_REQUEST_SIZE || !isValidRequest(endpoint, body)) {
      return response.status(400).json({ error: 'Invalid walking-route request' });
    }
  } catch {
    return response.status(400).json({ error: 'Malformed JSON request' });
  }
  try {
    const upstream = await fetch(`${VALHALLA_API}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Identify the published application to the public demo service.
        'X-Client-Id': process.env.VALHALLA_CLIENT_ID || 'london-on-foot'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) {
      return response.status(upstream.status === 429 ? 429 : 502).json({ error: 'Pedestrian routing service unavailable' });
    }
    const data = await upstream.json();
    return response.status(200).json(data);
  } catch {
    return response.status(502).json({ error: 'Pedestrian routing service unavailable' });
  }
}
