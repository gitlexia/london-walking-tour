# Migrating the original T13 project to London on Foot

## What the uploaded code contained

The supplied `t13-main (14).zip` contained a React 16 / Webpack UI, a Java / Maven HTTP server, an environment-dependent geographical database layer and route-construction classes including `TourConstruction.java`, `TwoOptimizer.java` and `ThreeOptimizer.java`. It also contained images from a team project and operational configuration. The archive did not have a standalone LICENSE file.

## What changed

- Rebuilt the frontend as **React 18 + Vite**, with a redesigned responsive interface and **React Leaflet** map.
- Replaced the original geographical database/search backend with a **curated local London catalogue**. It has no passwords or database dependencies.
- Reimplemented the algorithmic strategy of `TourConstruction` (nearest neighbour) and `TwoOptimizer` (2-opt) as testable functions in `src/lib/optimizer.js`, with improvements for an **open path**, optional circular tours, selected starts, directed travel times, relocation and pair swaps.
- Switched from optimising great-circle geographical distances to optimising a **pedestrian road-network time matrix** when available. The Great Circle / Haversine approximation remains the labelled emergency fallback.
- Added trip persistence, JSON download, shareable stop-selection URLs, itinerary settings and external Google Maps walking directions.
- Removed the need to run the Java service or MySQL/MariaDB, reducing local prerequisites to Node + npm.
- Avoided including the original images, credentials and unrelated deployment scripts. No original source code has been copied verbatim into the rebuilt runtime.

## Original classes to new files

| Original concept | New location |
|---|---|
| TourConstruction / nearest-neighbour initial tour | `src/lib/optimizer.js` → `nearestNeighbour`, `optimiseOrder` |
| TwoOptimizer / 2-opt | `src/lib/optimizer.js` → `improveOrder` |
| DistancesRequest / distance calculation | `src/lib/optimizer.js` → `haversineKm`, `estimateMatrix` |
| Geographical database | `src/data.js` editorial London places |
| Server-side tour endpoint | `src/lib/routing.js` (public walking routes through local Vite proxy) |
| Trip UI and map | `src/main.jsx` |
| UI styling | `src/styles.css` |

This migration is designed to get a practical walking-tour prototype running quickly. If you later want a full-stack portfolio case study, a Node/FastAPI service can be added for user accounts, curated places, route caching and scalable production routing.
