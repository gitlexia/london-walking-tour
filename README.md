# London on Foot

A London-first walking tour planner rebuilt from the algorithmic ideas in the T13 travel-planning project. The first version is a **React + Vite** website with an interactive **Leaflet / OpenStreetMap** map, curated London places, and a **walking-time route optimiser**. No Java server, database, account, API key, or payment is needed to test it locally.

## Quick start (Mac / Windows / Linux)

**You need:** an internet connection for the initial npm install and for map tiles / live pedestrian routing, plus **Node.js 18+** (Node.js 20 or 22 LTS recommended). Check your versions with `node -v` and `npm -v`.

Open Terminal in this unzipped `london-walks-lab` folder and run:

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

To stop the website, press `Ctrl+C` in Terminal.

> **Do not double-click `index.html`.** This is a modern React project; start its local Vite server with the commands above.

### Build a completely custom route

1. Open **Your walk → Clear** to begin with an empty itinerary (the sample landmarks are selected by default).
2. **Click on any empty part of the map within Greater London**. A small panel shows the exact coordinate you clicked. Choose **Start here** to use it as the beginning of your walk, or **Add as next stop** to append a waypoint. This is a place *you* choose; it does not need to be in the curated attraction catalogue.
3. Click an existing attraction marker and choose **Add as next stop**; click somewhere else on the map and add another custom waypoint. Repeat in any mixture: your flat → an attraction → a coffee shop → another attraction.
4. Open **Your walk → Route order**. Select **Follow my order** to walk in precisely that sequence, or **Optimise stops** to ask the route engine to rearrange stops while keeping a chosen start fixed.
5. Click **Draw my walking route** (manual) or **Optimise my walking tour** (optimised). The app will request pedestrian paths, then fall back to labelled approximate lines if routing is offline.
6. Rename a custom point by editing its name in the itinerary; **drag its numbered map pin** to fine-tune its coordinates. Use the up/down arrows to reorder the walk. A custom pin defaults to **0 minutes** spent there, but you can add a pause.
7. Click **Share walk** or **Export JSON**. Your map pins, names, coordinates, stop order, visit durations and preferences are retained in the shared link. A local (`localhost`) share link only works on your computer until the website is hosted publicly.

**Limits:** up to 9 total stops; map clicks are restricted to a Greater London bounding box. A click is not automatically saved until you choose one of the two buttons. Street routing is external and may be unavailable.

## What works

| Feature | Status |
|---|---|
| Search/filter 53 curated London attractions | Ready |
| Seven one-click sample walks | Ready |
| Add/remove stops (maximum 9 at a time) | Ready |
| Open walk or circular route | Ready |
| Fixed starting attraction, custom map pin or smart start | Ready |
| Click anywhere on the London map to set a start or waypoint | Ready |
| Alternate user-created waypoints with curated attractions | Ready |
| Drag and rename custom map pins | Ready |
| Follow exact manual order OR optimise route | Ready |
| Walking pace and visit durations | Ready |
| Route optimisation (nearest neighbour + 2-opt + swap + relocation) | Ready |
| Real pedestrian time matrix + route geometries | Uses public Valhalla demo when available |
| Clearly labelled approximate fallback | Ready |
| Interactive street map | Uses OSM map tiles (online) |
| Automatically save preferences to this browser | Ready |
| Share route, custom coordinates, names, order, visits | Ready; localhost links only work on this machine |
| Export selected itinerary as JSON | Ready |
| Google Maps walking directions link | Ready; Google may limit waypoints depending on device |
| Opening hours, tickets, wheelchair-accessible routing, Tube | Not yet |
| Accounts, cloud-synced trips, accommodation, payments | Not yet |

## Updated imagery and London character walks (November 2026)

- Removed the “YOUR CITY, YOUR WAY” tagline and all sparkle/star decoration from the interface.
- Replaced emoji thumbnails with 30 free-licensed real London photographs displayed on place cards, selected itinerary stops and all seven quick-start tour cards.
- Added **South London character** (Brixton), **West London character** (Notting Hill) and **North London character** (Camden/Primrose Hill) as both filter chips and ready-made walking tours. All existing attraction-type categories are retained.
- **Important**: photographs are loaded **from Wikimedia Commons at runtime** rather than bundled as JPEGs. You must be online to see them. The **Photo credits** button in the app and [`IMAGE_CREDITS.md`](IMAGE_CREDITS.md) provide each photographer, licence and source page. Some stop cards use nearby/neighbourhood representative photos, rather than a photo of that exact stop.
- The new coordinates are approximate walking-visit points and have not been checked against every official entrance, closure or opening time.

## How routing works

1. In **manual** mode, the site directly requests the chosen sequence of walking paths from `POST /routing/route`. In **optimisation** mode, it first requests a pedestrian time/distance matrix via `POST /routing/sources_to_targets`.
2. The Vite development server proxies `/routing/*` to `https://valhalla1.openstreetmap.de/*`, which avoids browser CORS issues. No personal data or login information are sent. The selected coordinates are sent to Valhalla.
3. In **Follow my order** mode, stops are routed in the exact itinerary sequence. In **Optimise stops** mode, `src/lib/optimizer.js` uses nearest-neighbour plus 2-opt reversals, swaps and relocations to improve walking time, testing possible starting points if no start is chosen. **This heuristic does not guarantee the mathematically shortest route.**
4. The app requests the selected walking route from `POST /routing/route` and decodes Valhalla's **polyline6** geometry to display actual mapped paths and per-leg distances/times.
5. If the external route service fails or is blocked, the interface still works: it estimates based on Haversine distances multiplied by 1.28 to approximate urban walking detours. The map labels fallback lines as *approximate* — they are **not guaranteed walkable street paths**.

Walking times are rough estimates based on the route service's base pace adjusted for the pace selected in the UI. The site does not consider queueing, traffic signals, weather, tickets or opening hours. Some place coordinates are approximate and may not be the correct entrance or meeting point.

### Troubleshooting

**`npm: command not found`** — install a recent Node.js LTS from https://nodejs.org and reopen Terminal.

**`EADDRINUSE` / Port 5173 busy** — stop another Vite server, or change `server.port` in `vite.config.js`.

**The map is blank** — the map uses externally hosted tiles, so you need internet access. Check browser ad blockers and the browser's developer console.

**Only dashed straight lines appear / optimiser says estimated** — the public Valhalla demo is rate-limited or unreachable, or the route could not be calculated. The fallback still selects a reasonable stop order, but its times are not street-validated. Try again later.

**`npm install` fails** — make sure your computer can reach `registry.npmjs.org`, then try `npm install` again. There is no `node_modules` directory in the ZIP; npm must install dependencies once.

**Shared link doesn't work for someone else** — `http://localhost:5173` exists only on your computer. Once deployed to a public domain, links will work for everyone. URL sharing now also includes custom map pins, names and visit-duration overrides. The URL can be longer for complex custom routes.

**Map or routing does not work with `npm run preview`** — `vite.config.js` includes a preview proxy, but check your Vite version. In production, you will need a suitable reverse proxy and commercial/production-rated services.

## Commands

```bash
npm run dev      # local development at http://localhost:5173
npm test         # run Node's built-in tests for the optimiser/data utilities
npm run build    # production frontend bundle in dist/
npm run preview  # preview the bundle locally at http://localhost:4173
```

## Project structure

```text
london-walks-lab/
├── index.html               Page metadata and React mount point
├── vite.config.js           Vite and local routing proxy
├── package.json             Frontend dependencies and scripts
├── src/
│   ├── main.jsx             App screens, UI interactions, Leaflet map
│   ├── styles.css           Desktop/mobile visual design
│   ├── data.js              London catalogue, categories, presets
│   ├── photos.js            Commons photo metadata and URLs
│   └── lib/
│       ├── optimizer.js     Nearest neighbour, 2-opt and refinements
│       ├── routing.js       Valhalla walking matrix + polyline6 decoding
│       └── trip.js          Data validation, local saves, sharing/export
├── tests/
│   └── optimizer.test.js    Unit tests runnable without npm install
├── IMAGE_CREDITS.md        Photograph provenance, licence terms and credits
└── MIGRATION_NOTES.md       Differences from the source T13 project
```

## Use and API limitations

This is a prototype for **local testing**, not a hosted production service:

- **Valhalla demo**: `valhalla1.openstreetmap.de` is a volunteer-operated public demo with fair-use/rate limits. The dev proxy adds an `X-Client-Id` header. If you publish a user-facing website, follow Valhalla's public-demo guidance (contact the maintainers via their GitHub discussions) and move to a production routing provider or self-hosted instance. Docs: https://valhalla.github.io/valhalla/start/introduction/
- **OSM map tiles**: used only for live viewing, with map attribution shown. Follow https://operations.osmfoundation.org/policies/tiles/ for production usage; use a production tile host for scale.
- **Map/tour content**: attractions and duration suggestions are editorial seed data; update and verify them before public launch. The app does not validate opening days/hours or accessibility.
- **Intellectual property**: the original ZIP contained group-project material without a LICENSE file. This project is a new implementation inspired by the algorithmic approach, without bundling any original photographs, account secrets or database files. Clarify rights to any team contributions you plan to reuse or publish.

## Notes on testing in the build environment

All 19 JavaScript utility, routing, catalogue and custom-map-stop tests passed after this update. The build environment was unable to reach the npm registry (`EAI_AGAIN`), so `npm install`, `npm run build` and a full browser smoke test could **not** be completed here. Please run `npm install` and `npm run dev` on your own computer as shown above. No web build was claimed or simulated.

## Next upgrades

Future options: address search and reverse geocoding of map pins, date-aware opening hours, accessible walking preferences, saved accounts, place details and production-grade routing services.
