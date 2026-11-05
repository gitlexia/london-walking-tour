# London on Foot

**A personalised walking-tour planner for London.**

London on Foot brings the city's landmarks, neighbourhoods and lesser-known corners together on one interactive map. Explore a curated collection of places, build a walk around your interests, or choose your own stops anywhere on the map. Every itinerary can be arranged in your preferred order or optimised for a more efficient journey.

## Explore London

From Westminster's historic streets to Brixton's markets, Camden's canals and Notting Hill's colourful terraces, London on Foot is designed for discovering the city at your own pace.

The experience includes **54 curated places** and **seven ready-made walking tours**:

| Walk | Explore |
| --- | --- |
| The London classics | Westminster, royal landmarks and iconic squares |
| Art & little streets | Galleries, cultural landmarks and West End backstreets |
| Along the Thames | Riverside walks, architecture and markets |
| East London character | Spitalfields, Brick Lane and independent neighbourhoods |
| South London character | Brixton's markets, music and local history |
| West London character | Notting Hill, Portobello Road and surrounding streets |
| North London character | Camden, its canals and Primrose Hill |

## Make the city your own

- **Build a route directly on the map.** Click any point within Greater London to set a starting location or create a custom waypoint.
- **Mix landmarks with personal stops.** Combine curated attractions with cafés, meeting points or places you discover along the way.
- **Choose how to travel.** Follow the exact order of your itinerary or let the route optimiser suggest a more efficient sequence.
- **Fine-tune every stop.** Drag itinerary cards into place, use animated up/down controls, reposition map pins and adjust how long you spend at each stop.
- **Find any London location.** Search for streets and landmarks outside the curated collection, or paste supported Google Maps sharing links.
- **Plan around your pace.** Choose a walking speed, estimate travel and visit time, and create one-way or circular walks.
- **Keep and share your discoveries.** Save walks in your browser, share an itinerary link, export a JSON copy or open directions in Google Maps.

## How it works

1. **Discover:** browse locations by category or start with a themed London walk.
2. **Personalise:** select attractions, click the map to add your own stops, and set your starting point.
3. **Plan:** keep your chosen stop order or optimise the route for walking time.
4. **Explore:** follow the itinerary on the interactive map and share it with others.

Routes use pedestrian path data where available, with clearly identified distance estimates when a mapped walking route cannot be returned.

## Built with

| Layer | Technology |
| --- | --- |
| Interface | React, JavaScript, Vite |
| Map | Leaflet, React Leaflet, OpenStreetMap |
| Route planning | Nearest-neighbour search, 2-opt, swap and relocation heuristics |
| Walking directions | Valhalla pedestrian routing |
| Icons | Lucide |
| Trip storage | Browser local storage and shareable URLs |

The route planner can preserve a manually arranged itinerary or improve stop order using walking-time estimates. Route optimisation is heuristic rather than a guarantee of the absolute shortest possible path.

## Run locally

**Requirements:** Node.js 18 or later and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

Other commands:

```bash
npm run build    # Create the production frontend bundle
npm run preview  # Preview the production bundle locally
npm test         # Run the route-planning tests
```

## Project structure

```text
src/
├── main.jsx           # Interactive map and application interface
├── styles.css         # Layout and visual system
├── data.js            # Curated places and suggested walks
├── photos.js          # Photography catalogue
└── lib/
    ├── optimizer.js   # Walking-tour route optimisation
    ├── routing.js     # Pedestrian routing integration
    └── trip.js        # Itineraries, sharing and browser storage
```

## Maps, photography & attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). London photography is sourced from Wikimedia Commons under the licences attributed to the individual works. See [image credits and licences](IMAGE_CREDITS.md) for photographer credits, source links and reuse terms.

