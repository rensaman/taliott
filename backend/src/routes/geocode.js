import { Router } from 'express';

const router = Router();
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export function mapNominatimResult(r) {
  return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name };
}

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) return res.json([]);

  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=5`;
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'taliott/1.0 (group-scheduling-app)' },
    });
    if (!upstream.ok) throw new Error(`Nominatim ${upstream.status}`);
    const data = await upstream.json();
    return res.json(data.map(mapNominatimResult));
  } catch (err) {
    console.error('[geocode]', err.message);
    return res.status(502).json({ error: 'Geocoding service unavailable' });
  }
});

export default router;
