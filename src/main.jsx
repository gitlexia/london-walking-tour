import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import {
  ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Clock3, Compass,
  Download, ExternalLink, Footprints, GripVertical, Heart, Info, MapPin, Plus, RotateCcw,
  Route, Search, Share2, Trash2, X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { BY_ID, CATEGORIES, DEFAULT_IDS, MAX_STOPS, PLACES, PRESETS, matchesCategory } from './data.js';
import { PHOTOS, photoUrl, photoSourceUrl, placePhotoKey } from './photos.js';
import { estimateMatrix, formatMinutes, makeLegs, optimiseOrder } from './lib/optimizer.js';
import { fetchWalkingLegs, fetchWalkingMatrix } from './lib/routing.js';
import { cleanTrip, downloadJson, googleMapsUrl, loadTrip, persistTrip, shareUrl, getPlace, tripPlaces, inLondon } from './lib/trip.js';
import { moveStop, parsePlaceInput, safePlaceResults } from './lib/place-search.js';

const SOURCE_LABELS = {
  'walking-path': 'Mapped walking paths',
  'walking-times': 'Street times · approximate lines',
  estimate: 'Estimated distances · approximate lines'
};

function pinIcon(number, isSelected, custom = false) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<span class="place-pin ${isSelected ? `is-selected ${custom ? 'is-custom' : ''}` : 'is-available'}">${isSelected ? `<span class="pin-number">${number || '·'}</span>` : '<span class="marker-dot"></span>'}</span>`,
    iconSize: isSelected ? [34, 42] : [15, 15],
    iconAnchor: isSelected ? [17, 36] : [8, 8],
    popupAnchor: [0, -22]
  });
}

function FocusMap({ locations }) {
  const map = useMap();
  const key = locations.map(location => `${location.lat},${location.lon}`).join('|');
  useEffect(() => {
    if (!locations.length) return;
    if (locations.length === 1) { map.flyTo([locations[0].lat, locations[0].lon], 15, { duration: 0.5 }); return; }
    map.fitBounds(L.latLngBounds(locations.map(p => [p.lat, p.lon])), {
      padding: [60, 60], maxZoom: 15, animate: true
    });
  }, [key, map]);
  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({ click(event) { onPick({ lat: event.latlng.lat, lon: event.latlng.lng }); } });
  return null;
}

function TourMap({ selected, order, legs, source, onAdd, onStart, onRemove, onMovePoint, highlightedId, onHighlight, pending, onPick, onAddPoint, onCancelPin, count }) {
  const selectedSet = new Set(selected.map(p => p.id));
  const display = order.map(id => selected.find(p => p.id === id)).filter(Boolean);
  return (
    <div className="map-wrap">
      <MapContainer center={[51.5103, -0.118]} zoom={13} scrollWheelZoom={true} zoomControl={false} className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapClickHandler onPick={onPick} />
        <FocusMap locations={display} />
        {legs.map((leg, index) => (
          <Polyline
            key={`${leg.from}-${leg.to}-${index}-${source}`}
            positions={leg.coords}
            pathOptions={{ color: '#1d5c4b', weight: 5, opacity: 0.83, dashArray: source === 'walking-path' ? undefined : '9 11', lineCap:'round' }}
          />
        ))}
        {PLACES.filter(p => !selectedSet.has(p.id)).map(p => (
          <Marker key={p.id} position={[p.lat,p.lon]} icon={pinIcon(null, false)}>
            <Popup>
              <div className="map-popup">
                <strong>{p.name}</strong>
                <span>{p.area} · {p.category}</span>
                <button className="popup-add" onClick={() => onAdd(p.id)}><Plus size={14}/> Add as next stop</button>
                <button className="popup-add" onClick={() => onStart(p.id)}><MapPin size={14}/> Start my walk here</button>
              </div>
            </Popup>
          </Marker>
        ))}
        {display.map((p,index) => (
          <Marker key={p.id} position={[p.lat,p.lon]} icon={pinIcon(index+1, true, p.category === 'Custom stop')}
            draggable={p.category === 'Custom stop'}
            eventHandlers={p.category === 'Custom stop' ? { dragend: event => {
              const coords = event.target.getLatLng();
              if (!inLondon(coords.lat, coords.lng)) event.target.setLatLng([p.lat, p.lon]);
              onMovePoint(p.id, coords.lat, coords.lng);
            }} : undefined}
            zIndexOffset={highlightedId === p.id ? 1000 : 150}>
            <Popup eventHandlers={{add: () => onHighlight(p.id)}}>
              <div className="map-popup">
                <strong>{p.name}</strong>
                <span>{p.category === 'Custom stop' ? 'Your point · drag pin to reposition' : `${p.area} · ${p.visit} min suggested`}</span>
                {index !== 0 && <button className="popup-add" onClick={() => onStart(p.id)}><MapPin size={14}/> Make starting point</button>}
                <button className="popup-remove" onClick={() => onRemove(p.id)}>Remove stop</button>
              </div>
            </Popup>
          </Marker>
        ))}
        {pending && <Marker key={`${pending.lat}-${pending.lon}`} position={[pending.lat, pending.lon]} icon={pinIcon(0, true, true)} zIndexOffset={1100} />}
      </MapContainer>
      {pending && <div className="map-click-card" role="group" aria-label="Create a custom map stop">
        <div className="map-click-header"><span><MapPin size={16}/> Your map point</span><button onClick={onCancelPin} aria-label="Cancel map point"><X size={17}/></button></div>
        <small>{pending.lat.toFixed(5)}, {pending.lon.toFixed(5)}</small>
        <p>Make this your first stop or add it after the places already in your walk.</p>
        <button className="map-click-primary" disabled={count >= MAX_STOPS} onClick={() => onAddPoint(true)}><MapPin size={14}/> Start here</button>
        <button className="map-click-secondary" disabled={count >= MAX_STOPS} onClick={() => onAddPoint(false)}><Plus size={14}/> Add as next stop</button>
        {count >= MAX_STOPS && <small>Maximum {MAX_STOPS} stops per walk.</small>}
      </div>}
      <div className="map-note">
        <span className={`route-status-dot ${source === 'walking-path' ? 'live' : ''}`}></span>
        {SOURCE_LABELS[source]}
      </div>
      <div className="map-brand">LONDON <span>ON FOOT</span></div>
      <div className="map-instruction">Click map to add a point · Drag custom pins to adjust</div>
    </div>
  );
}

function Intro({ count }) {
  return (
    <div className="hero">
      <h1>London, <em>on foot.</em></h1>
      <p>Pick the places you love. We’ll find a lovely way to walk between them.</p>
      <div className="hero-stats"><span><MapPin size={15}/> {PLACES.length} handpicked spots</span><span><Footprints size={16}/> Walking only</span><span><Heart size={15}/> Made for curious people</span></div>
      <div className="hero-count">{count} {count === 1 ? 'stop' : 'stops'} in your walk</div>
    </div>
  );
}

function LicensedPhoto({ photoKey, className, alt }) {
  // Decorative fallback is CSS-only if a Commons image cannot load.
  // Individual photos and required attributions can be reviewed via Photo credits.
  const photo = PHOTOS[photoKey];
  if (!photo) return <div className={`${className} photo-fallback`} aria-hidden="true" />;
  return <div className={`${className} photo-frame`}>
    <img src={photoUrl(photoKey, 520)} alt="" aria-hidden="true" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
  </div>;
}

function PhotoCredits({ onClose }) {
  return <div className="credits-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="credits-dialog" role="dialog" aria-modal="true" aria-labelledby="credits-title">
      <div className="credits-heading"><div><h2 id="credits-title">Photograph credits</h2><p>Genuine London photography used under Creative Commons licences via Wikimedia Commons. Images are visually cropped in cards, and original authors retain their rights.</p></div><button onClick={onClose} aria-label="Close photo credits"><X size={20}/></button></div>
      <div className="credits-list">{Object.entries(PHOTOS).map(([key, photo]) => <div key={key} className="credit-item"><LicensedPhoto photoKey={key} className="credit-thumb" alt={photo.title} /><div><strong>{photo.title}</strong><span>Photo by {photo.author}</span><p><a href={photoSourceUrl(key)} target="_blank" rel="noopener noreferrer">Original on Wikimedia Commons <ExternalLink size={12}/></a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></p></div></div>)}</div>
      <div className="credits-footer"><span>Image crops are layout-only; share-alike obligations apply to any derived image files, not automatically to unrelated code.</span><button onClick={onClose}>Close</button></div>
    </section>
  </div>;
}

function PlaceCard({ place, selected, onToggle, disableAdd }) {
  return (
    <article className={`place-card ${selected ? 'place-card-added' : ''}`}>
      <LicensedPhoto photoKey={placePhotoKey(place)} className="place-photo" alt={place.name} />
      <div className="place-info">
        <div className="place-area">{place.area} <span>·</span> {place.category}</div>
        <h3>{place.name}</h3>
        <p>{place.detail}</p>
        <div className="place-duration"><Clock3 size={13}/> {place.visit} min suggested visit</div>
      </div>
      <button
        className={`place-toggle ${selected ? 'added' : ''}`}
        onClick={() => onToggle(place.id)}
        disabled={!selected && disableAdd}
        aria-label={`${selected ? 'Remove' : 'Add'} ${place.name}`}
        title={!selected && disableAdd ? `Limit ${MAX_STOPS} stops per route` : selected ? 'Remove from walk' : 'Add to walk'}
      >{selected ? <Check size={17}/> : <Plus size={18}/>}</button>
    </article>
  );
}

function TourStop({ place, index, leg, first, onRemove, onMove, visit, onVisit, onRename, total, drag, onGrab, onDrag, onDrop, onCancelDrag }) {
  const custom = place.category === 'Custom stop';
  const minutes = visit ?? place.visit;
  return (
    <div data-stop-id={place.id} className={`tour-item ${drag?.id === place.id ? 'is-dragging' : ''} ${drag?.before === place.id ? 'drop-before' : ''} ${drag?.after === place.id ? 'drop-after' : ''}`}
      style={drag?.id === place.id ? { transform: `translate3d(0, ${drag.offset}px, 0)` } : undefined}>
      <div className="tour-rail"><span className="tour-number">{index + 1}</span><span className="tour-connector"></span></div>
      <div className="tour-content">
        {first && <div className="stop-overline">YOUR STARTING POINT</div>}
        {!first && leg && <div className="walk-between"><Footprints size={14}/>{Math.max(1, Math.round(leg.minutes))} min walk <span>·</span> {leg.km.toFixed(2)} km</div>}
        <div className="tour-heading">
          {custom ? <div className="tour-photo tour-custom-icon"><MapPin size={20}/></div> : <LicensedPhoto photoKey={placePhotoKey(place)} className="tour-photo" alt={place.name} />}
          <div className="tour-place-text">
            {custom ? <input key={place.id} className="custom-name-input" defaultValue={place.name} maxLength={65} aria-label={`Rename ${place.name}`} title="Click to rename your map point" onBlur={e => { const name = e.target.value.replace(/[<>]/g, '').trim().slice(0,65) || place.name; onRename(place.id, name); e.target.value = name; }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /> : <strong>{place.name}</strong>}
            <small>{custom ? `Map point · ${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}` : place.area}</small>
          </div>
        </div>
        <div className="tour-item-footer">
          <label className="visit-select-label">{custom ? 'Pause' : 'Stay'} <select aria-label={`Visit duration for ${place.name}`} value={minutes} onChange={e => onVisit(place.id, Number(e.target.value))}>
            {[0,10,15,20,25,30,40,45,60,75,90,120,150,180].concat([minutes]).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(min => <option key={min} value={min}>{min} min</option>)}
          </select></label>
          <div className="tour-actions">
            <button className="tour-drag-handle" title="Drag to reorder stops" aria-label={`Drag ${place.name} to reorder, or use arrow keys`} type="button"
              onPointerDown={event => onGrab(event, place.id)}
              onPointerMove={onDrag} onPointerUp={onDrop} onPointerCancel={onCancelDrag}
              onKeyDown={event => { if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); onMove(index, -1); } else if (event.key === 'ArrowDown' && index < total - 1) { event.preventDefault(); onMove(index, 1); } }}><GripVertical size={17}/></button>
            <button title="Move up" aria-label={`Move ${place.name} up`} disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp size={15}/></button>
            <button title="Move down" aria-label={`Move ${place.name} down`} disabled={index === total - 1} onClick={() => onMove(index, 1)}><ArrowDown size={15}/></button>
            <button title="Remove stop" aria-label={`Remove ${place.name}`} onClick={() => onRemove(place.id)}><X size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ index, children, hint }) {
  return <div className="section-title"><span className="section-index">{index}</span><span>{children}</span>{hint && <span className="section-hint">{hint}</span>}</div>;
}

function App() {
  const [trip, setTrip] = useState(loadTrip);
  const [tab, setTab] = useState('explore');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [highlightedId, setHighlightedId] = useState('');
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeMessage, setPlaceMessage] = useState('');
  const [findingPlaces, setFindingPlaces] = useState(false);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const listRef = useRef(null);
  const previousPositions = useRef(null);
  const plannerScrollRef = useRef(null);
  const finderRef = useRef(null);
  const placeController = useRef(null);
  const controller = useRef(null);

  const selected = useMemo(() => tripPlaces(trip), [trip.ids, trip.custom]);
  const selectedSet = useMemo(() => new Set(trip.ids), [trip.ids]);
  const visiblePlaces = useMemo(() => PLACES.filter(place => {
    return matchesCategory(place, category) &&
      `${place.name} ${place.area} ${place.category}`.toLowerCase().includes(search.trim().toLowerCase());
  }), [search, category]);

  const previewMatrix = useMemo(() => estimateMatrix(selected, trip.pace), [selected, trip.pace]);
  const draftIds = trip.mode === 'manual' ? trip.ids : (trip.start && trip.ids.includes(trip.start) ? [trip.start, ...trip.ids.filter(id => id !== trip.start)] : trip.ids);
  const orderedIds = result?.ids ?? draftIds;
  const previewLegs = useMemo(() => makeLegs(orderedIds.map(id => selected.findIndex(p => p.id === id)), previewMatrix, selected, trip.loop), [orderedIds.join('|'), selected, previewMatrix, trip.loop]);
  const legs = result?.legs ?? previewLegs;
  const source = result?.source ?? 'estimate';
  const totalKm = legs.reduce((sum, leg) => sum + leg.km, 0);
  const walkMin = legs.reduce((sum, leg) => sum + leg.minutes, 0);
  const visitMin = selected.reduce((sum, place) => sum + (trip.visits[place.id] ?? place.visit), 0);
  const totalMin = walkMin + visitMin;

  useEffect(() => { persistTrip(trip); }, [trip]);
  useEffect(() => () => { controller.current?.abort(); placeController.current?.abort(); }, []);

  const captureStopPositions = () => {
    if (!listRef.current) return;
    previousPositions.current = new Map(Array.from(listRef.current.querySelectorAll('[data-stop-id]'), node => {
      const top = node.getBoundingClientRect().top;
      return [node.dataset.stopId, top - (dragRef.current?.id === node.dataset.stopId ? dragRef.current.offset : 0)];
    }));
  };

  // FLIP transitions: the stop is animated from its previous position to its new one.
  // This makes arrow-button moves easy to follow as well as drag/drop reorders.
  useLayoutEffect(() => {
    const old = previousPositions.current;
    previousPositions.current = null;
    if (!old || !listRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const node of listRef.current.querySelectorAll('[data-stop-id]')) {
      const oldTop = old.get(node.dataset.stopId);
      if (oldTop === undefined) continue;
      const distance = oldTop - node.getBoundingClientRect().top;
      if (Math.abs(distance) > 2) node.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0px)' }],
        { duration: 300, easing: 'cubic-bezier(.2,.7,.15,1)' }
      );
    }
  }, [orderedIds.join('|')]);

  const changeTrip = (modify) => {
    controller.current?.abort();
    setBusy(false);
    setResult(null);
    setMessage('');
    setTrip(previous => cleanTrip(modify(previous)));
  };
  const addOrRemove = (id) => {
    if (!trip.ids.includes(id) && trip.ids.length >= MAX_STOPS) {
      setMessage(`Choose up to ${MAX_STOPS} stops per walk.`);
      return;
    }
    changeTrip(previous => {
      const exists = previous.ids.includes(id);
      const ids = exists ? orderedIds.filter(item => item !== id) : [...orderedIds, id];
      return { ...previous, ids, start: previous.start === id ? '' : previous.start,
        custom: previous.custom.filter(p => p.id !== id || !exists) };
    });
  };
  const addAttractionFromMap = (id) => {
    if (trip.ids.includes(id)) return;
    if (trip.ids.length >= MAX_STOPS) { setMessage(`Choose up to ${MAX_STOPS} stops per walk.`); return; }
    changeTrip(previous => ({ ...previous, ids: [...orderedIds, id], mode: 'manual' }));
    setTab('itinerary');
  };
  const setStart = (id) => {
    if (!trip.ids.includes(id) && trip.ids.length >= MAX_STOPS) { setMessage(`Choose up to ${MAX_STOPS} stops per walk.`); return; }
    changeTrip(previous => ({ ...previous, ids: [id, ...orderedIds.filter(item => item !== id)], start: id, mode:'manual' }));
    setTab('itinerary');
  };
  const addCustomPoint = (asStart) => {
    if (!pending || trip.ids.length >= MAX_STOPS) return;
    const { lat, lon } = pending;
    if (!inLondon(lat, lon)) { setMessage('Choose a point within Greater London.'); return; }
    const id = `pin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const count = trip.custom.length + 1;
    const place = { id, lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)), name: `My map point ${count}` };
    changeTrip(previous => ({...previous, custom: [...previous.custom, place],
      ids: asStart ? [id, ...orderedIds] : [...orderedIds, id],
      start: asStart ? id : previous.start, mode:'manual'}));
    setPending(null);
    setTab('itinerary');
  };
  const moveCustomPoint = (id, lat, lon) => {
    if (!inLondon(lat, lon)) { setMessage('Custom pins must stay within Greater London.'); return; }
    changeTrip(previous => ({...previous, custom: previous.custom.map(p => p.id === id ? {...p, lat:Number(lat.toFixed(6)), lon:Number(lon.toFixed(6))} : p)}));
  };
  const renameCustomPoint = (id, name) => {
    const cleaned = name.replace(/[<>]/g, '').trim().slice(0, 65);
    const current = trip.custom.find(p => p.id === id);
    if (!current || !cleaned || current.name === cleaned) return;
    setTrip(previous => cleanTrip({...previous, custom: previous.custom.map(p => p.id === id ? {...p, name: cleaned} : p)}));
  };
  const applyPreset = (preset) => {
    changeTrip(previous => ({ ...previous, ids: preset.ids, custom: [], visits:{}, start: '', mode:'optimise' }));
    setTab('itinerary');
  };
  const reorderTo = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= orderedIds.length || to >= orderedIds.length) return;
    captureStopPositions();
    const next = moveStop(orderedIds, from, to);
    changeTrip(previous => ({ ...previous, ids: next, start: next[0], mode: 'manual' }));
  };
  const reorder = (index, amount) => reorderTo(index, index + amount);

  const beginDrag = (event, id) => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || !listRef.current) return;
    const from = orderedIds.indexOf(id);
    if (from < 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, from, to: from, originY: event.clientY, pointerId: event.pointerId, offset: 0, initialScroll: plannerScrollRef.current?.scrollTop || 0 };
    setDrag({ id, offset: 0, before: '', after: '' });
  };
  const moveDrag = event => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId || !listRef.current) return;
    event.preventDefault();
    const scroll = plannerScrollRef.current;
    if (scroll) {
      const box = scroll.getBoundingClientRect();
      if (event.clientY > box.bottom - 58) scroll.scrollTop += 13;
      else if (event.clientY < box.top + 58) scroll.scrollTop -= 13;
    }
    const otherNodes = Array.from(listRef.current.querySelectorAll('[data-stop-id]')).filter(node => node.dataset.stopId !== active.id);
    const target = otherNodes.filter(node => event.clientY > node.getBoundingClientRect().top + node.getBoundingClientRect().height / 2).length;
    const nextNode = otherNodes[target];
    const lastNode = otherNodes[otherNodes.length - 1];
    const offset = event.clientY - active.originY + (scroll?.scrollTop || 0) - active.initialScroll;
    dragRef.current = { ...active, to: target, offset };
    setDrag({ id: active.id, offset, before: nextNode?.dataset.stopId || '', after: !nextNode ? lastNode?.dataset.stopId || '' : '' });
  };
  const finishDrag = event => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    // Restore the visual position before FLIP measures the new layout.
    dragRef.current = { ...active };
    setDrag(null);
    if (active.from !== active.to) reorderTo(active.from, active.to);
    dragRef.current = null;
  };
  const cancelDrag = () => { dragRef.current = null; setDrag(null); };

  const addFoundLocation = (location, asStart = false) => {
    if (trip.ids.length >= MAX_STOPS) { setPlaceMessage(`This walk has the maximum of ${MAX_STOPS} stops.`); return; }
    if (!inLondon(location.lat, location.lon)) { setPlaceMessage('This location is outside the supported London area.'); return; }
    const id = `pin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const place = { id, lat: Number(location.lat.toFixed(6)), lon: Number(location.lon.toFixed(6)), name: location.name.slice(0, 65) };
    changeTrip(previous => ({ ...previous, custom: [...previous.custom, place],
      ids: asStart ? [id, ...orderedIds] : [...orderedIds, id],
      start: asStart ? id : previous.start, mode: 'manual' }));
    setPlaceMessage(`${place.name} added to your walk.`);
    setTab('itinerary');
  };

  const findAnyPlace = async (input = placeQuery) => {
    placeController.current?.abort();
    const controllerForSearch = new AbortController();
    placeController.current = controllerForSearch;
    setPlaceResults([]);
    setPlaceMessage('');
    setFindingPlaces(true);
    try {
      let parsed = parsePlaceInput(input);
      if (parsed.kind === 'shortlink') {
        const response = await fetch(`/api/places?url=${encodeURIComponent(parsed.url)}`, { signal: controllerForSearch.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not read the shared Google Maps link.');
        parsed = parsePlaceInput(data.url);
      }
      if (parsed.kind === 'invalid') throw new Error(parsed.message);
      if (parsed.kind === 'coordinate') {
        setPlaceResults([parsed]);
        setPlaceMessage('Shared map location found. Add it to your walk below.');
        return;
      }
      const query = parsed.query;
      const url = import.meta.env.DEV
        ? `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=7&bounded=1&viewbox=-0.65%2C51.8%2C0.35%2C51.2&q=${encodeURIComponent(query)}`
        : `/api/places?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { signal: controllerForSearch.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Place search is temporarily unavailable.');
      }
      const json = await response.json();
      const records = Array.isArray(json) ? json.map(p => ({ name: p.name || p.display_name?.split(',')[0], detail: p.display_name, lat: p.lat, lon: p.lon })) : json.results;
      const places = safePlaceResults(records);
      setPlaceResults(places);
      setPlaceMessage(places.length ? `${places.length} matching London ${places.length === 1 ? 'place' : 'places'} found.` : 'No matching place found. Try a nearby street or click directly on the map.');
    } catch (error) {
      if (!controllerForSearch.signal.aborted) setPlaceMessage(error.message || 'Search unavailable.');
    } finally {
      if (placeController.current === controllerForSearch) setFindingPlaces(false);
    }
  };
  const changeStart = (id) => {
    changeTrip(previous => ({...previous, start:id,
      ids: id && previous.mode === 'manual' ? [id, ...previous.ids.filter(item => item !== id)] : previous.ids}));
  };
  const changeMode = (mode) => {
    changeTrip(previous => ({...previous, mode, ids:mode === 'manual' ? [...orderedIds] : previous.ids,
      start: mode === 'manual' ? orderedIds[0] || '' : previous.start}));
  };
  const changeVisit = (id, minutes) => setTrip(previous => ({ ...previous, visits: { ...previous.visits, [id]: minutes } }));

  const optimise = async () => {
    if (selected.length < 2 || busy) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setMessage('');
    try {
      const matrix = trip.mode === 'manual' ? estimateMatrix(selected, trip.pace) : await fetchWalkingMatrix(selected, trip.pace, active.signal);
      const startIndex = trip.start ? selected.findIndex(place => place.id === trip.start) : null;
      const order = trip.mode === 'manual' ? selected.map((_, i) => i) : optimiseOrder(matrix.time, { startIndex: startIndex === -1 ? null : startIndex, roundTrip: trip.loop });
      const routed = await fetchWalkingLegs(selected, order, matrix, trip.loop, trip.pace, active.signal, trip.mode === 'manual');
      if (active.signal.aborted) return;
      const ids = order.map(i => selected[i].id);
      setResult({ ids, legs: routed.legs, source: routed.source });
      setTab('itinerary');
      if (routed.source === 'estimate') setMessage('Live pedestrian routing is unavailable. Your walk uses approximate distances, shown with dashed lines.');
      else if (routed.fallbackReason) setMessage('Street walking times were used, but the drawn route lines are approximate.');
      else setMessage(trip.mode === 'manual' ? 'Your custom route is mapped in the exact order you chose.' : 'Your optimised tour is ready, with mapped pedestrian paths.');
    } catch (error) {
      if (!active.signal.aborted) setMessage(`Unable to build a walk: ${error.message}`);
    } finally {
      if (controller.current === active) setBusy(false);
    }
  };

  const share = async () => {
    try { await navigator.clipboard.writeText(shareUrl({ ...trip, ids: orderedIds })); setMessage('Shareable link copied, including custom map pins and your chosen order.'); }
    catch { window.prompt('Copy your tour link:', shareUrl({ ...trip, ids: orderedIds })); }
  };
  const mapsUrl = googleMapsUrl(orderedIds, trip.loop, trip);
  const chosenLegForIndex = (index) => index === 0 ? null : legs[index - 1];

  return (
    <div className="app">
      <header className="site-header">
        <a href="/" className="brand" title="London on Foot home"><span className="brand-mark"><Footprints size={19} strokeWidth={2.3}/></span><span>london<span className="brand-light"> on foot</span></span></a>
        <div className="header-nav"><span className="header-note">An independent walking tour planner</span><span className="header-divider"></span><span className="header-pill"><span></span> LONDON · UK</span></div>
      </header>

      <main className="app-body">
        <section className="planner-panel" aria-label="Walking tour planner">
          <div className="planner-scroll" ref={plannerScrollRef}>
            <Intro count={trip.ids.length}/>
            <div className="panel-tabs" role="tablist" aria-label="Planner view">
              <button className={tab === 'explore' ? 'active' : ''} role="tab" aria-selected={tab === 'explore'} onClick={() => setTab('explore')}><Compass size={16}/> Explore places</button>
              <button className={tab === 'itinerary' ? 'active' : ''} role="tab" aria-selected={tab === 'itinerary'} onClick={() => setTab('itinerary')}><Route size={16}/> Your walk <span className="tab-count">{trip.ids.length}</span></button>
            </div>
            {tab === 'explore' ? (
              <div className="content-pane">
                <SectionTitle index="01" hint="START SOMEWHERE">Quick-start walks</SectionTitle>
                <div className="preset-row">
                  {PRESETS.map((preset) => (
                    <button key={preset.id} className="preset-card" onClick={() => applyPreset(preset)}>
                      <LicensedPhoto photoKey={preset.photo} className="preset-photo" alt={preset.title} />
                      <span className="preset-shade" aria-hidden="true"></span>
                      <span className="preset-meta"><strong>{preset.title}</strong><small>{preset.tagline}</small></span>
                      <ArrowRight size={16} className="preset-arrow"/>
                    </button>
                  ))}
                </div>
                <SectionTitle index="02" hint={`${visiblePlaces.length} PLACES`}>Make it your own</SectionTitle>
                <label className="search-box"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search London’s best bits…" aria-label="Search places"/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={16}/></button>}</label>
                <div className="any-place-card" ref={finderRef}>
                  <div className="any-place-head"><MapPin size={17}/><div><strong>Find anywhere in London</strong><span>Not in the collection? Search by name, address or paste a Google Maps link.</span></div></div>
                  <form className="any-place-form" onSubmit={event => { event.preventDefault(); findAnyPlace(); }}>
                    <input aria-label="Search any London place" placeholder="Try Hampstead Heath, a café or a Maps link" value={placeQuery} onChange={event => setPlaceQuery(event.target.value)} />
                    <button type="submit" disabled={findingPlaces || !placeQuery.trim()}>{findingPlaces ? 'Finding…' : 'Find'}</button>
                  </form>
                  {placeMessage && <p className="any-place-feedback" role="status">{placeMessage}</p>}
                  {placeResults.length > 0 && <div className="any-place-results">
                    {placeResults.map((place, index) => <div key={`${place.lat}-${place.lon}-${index}`} className="any-place-result">
                      <div className="any-place-result-text"><strong>{place.name}</strong><span>{place.detail || `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`}</span></div>
                      <div className="any-place-result-actions">
                        <button type="button" disabled={trip.ids.length >= MAX_STOPS} title="Add to the end of the walk" onClick={() => addFoundLocation(place)}><Plus size={14}/> Add</button>
                        <button type="button" disabled={trip.ids.length >= MAX_STOPS} title="Make the first stop" onClick={() => addFoundLocation(place, true)}><MapPin size={14}/> Start</button>
                      </div>
                    </div>)}
                  </div>}
                  <span className="any-place-attribution">Place search: © OpenStreetMap contributors</span>
                </div>
                <div className="category-row" aria-label="Filter by category">
                  {CATEGORIES.map(item => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}
                </div>
                <div className="places-list">
                  {visiblePlaces.map(place => <PlaceCard key={place.id} place={place} selected={selectedSet.has(place.id)} onToggle={addOrRemove} disableAdd={trip.ids.length >= MAX_STOPS}/>)}
                  {!visiblePlaces.length && <div className="empty-search">Not in our collection? <button type="button" onClick={() => { setPlaceQuery(search); finderRef.current?.scrollIntoView({ behavior:'smooth',block:'center' }); }}>Search all London places for “{search}”</button></div>}
                </div>
              </div>
            ) : (
              <div className="content-pane itinerary-pane">
                <SectionTitle index="01" hint="SET YOUR PREFERENCES">Your walking style</SectionTitle>
                <div className="settings-card">
                  <label className="field-label" htmlFor="start-select"><MapPin size={16}/> Starting point</label>
                  <div className="select-wrap"><select id="start-select" value={trip.start} onChange={e => changeStart(e.target.value)}>
                    <option value="">{trip.mode === 'manual' ? 'Use first stop in your list' : 'Choose best starting point'}</option>
                    {selected.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select><ChevronDown size={16}/></div>
                  <div className="field-row"><span className="field-label"><Route size={16}/> Route order</span><span className="small-field-note">{trip.mode === 'manual' ? 'Exactly as listed' : 'Shortest estimated walk'}</span></div>
                  <div className="segmented route-mode-switch" role="group" aria-label="Route ordering">
                    <button className={trip.mode === 'manual' ? 'selected' : ''} onClick={() => changeMode('manual')}>Follow my order</button>
                    <button className={trip.mode === 'optimise' ? 'selected' : ''} onClick={() => changeMode('optimise')}>Optimise stops</button>
                  </div>
                  <p className="route-mode-help">{trip.mode === 'manual' ? 'Drag stops by their handle, or use the arrows to adjust your route.' : 'We find a shorter order; drag any stop to switch to your chosen order.'}</p>
                  <div className="field-row"><span className="field-label"><Footprints size={16}/> Walking pace</span><span className="small-field-note">{trip.pace === 3.5 ? 'Relaxed' : trip.pace === 4.5 ? 'Comfortable' : 'Brisk'}</span></div>
                  <div className="segmented">{[3.5,4.5,5.5].map(pace => <button key={pace} className={trip.pace === pace ? 'selected' : ''} onClick={() => changeTrip(prev => ({...prev,pace}))}>{pace === 3.5 ? 'Easy' : pace === 4.5 ? 'Normal' : 'Brisk'}</button>)}</div>
                  <label className="loop-setting"><span><RotateCcw size={16}/> Return to starting point<small>Make this a circular walking tour</small></span><input type="checkbox" checked={trip.loop} onChange={e => changeTrip(prev => ({...prev,loop:e.target.checked}))}/><span className="switch" aria-hidden="true"></span></label>
                </div>
                <div className="itinerary-heading"><SectionTitle index="02" hint={trip.mode === 'manual' ? 'YOUR EXACT ORDER' : result ? 'REORDERED FOR YOU' : 'DRAFT ORDER'}>Your itinerary</SectionTitle><button className="text-button" onClick={() => changeTrip(prev=>({...prev,ids:[],custom:[],visits:{},start:''}))} disabled={!trip.ids.length}><Trash2 size={14}/> Clear</button></div>
                {!selected.length ? <div className="empty-itinerary"><Compass size={28}/><h3>A city full of possibilities.</h3><p>Click anywhere on the map to add your own point, or browse our handpicked places.</p><button onClick={() => setTab('explore')}>Browse places <ArrowRight size={15}/></button></div> : (
                  <div className="itinerary-list" ref={listRef}>
                    {orderedIds.map((id, index) => <TourStop key={id} place={getPlace(id, trip)} index={index} first={index === 0} leg={chosenLegForIndex(index)} onRemove={addOrRemove} onMove={reorder} visit={trip.visits[id]} onVisit={changeVisit} onRename={renameCustomPoint} total={orderedIds.length} drag={drag} onGrab={beginDrag} onDrag={moveDrag} onDrop={finishDrag} onCancelDrag={cancelDrag}/>)}
                    {trip.loop && orderedIds.length > 1 && <div className="return-leg"><RotateCcw size={15}/> Walk {Math.max(1, Math.round(legs[legs.length-1]?.minutes || 0))} min back to {getPlace(orderedIds[0],trip)?.name}</div>}
                  </div>
                )}
                {selected.length > 0 && <div className="itinerary-tools"><button onClick={() => setTab('explore')}><Plus size={15}/> Add more stops</button><button onClick={() => downloadJson(trip, orderedIds)}><Download size={15}/> Export JSON</button></div>}
              </div>
            )}
          </div>
          <div className="planner-bottom">
            {message && <div className={`feedback ${source === 'walking-path' ? 'good' : ''}`} role="status"><Info size={15}/><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={14}/></button></div>}
            <div className="summary-row">
              <div className="summary-stat"><small>WALKING</small><strong>{totalKm.toFixed(1)} <span>km</span></strong></div>
              <div className="summary-stat"><small>ON FOOT</small><strong>{formatMinutes(walkMin)}</strong></div>
              <div className="summary-stat"><small>WITH STOPS</small><strong>{formatMinutes(totalMin)}</strong></div>
            </div>
            <button className="optimise-button" disabled={selected.length < 2 || busy} onClick={optimise}>
              {busy ? <><span className="loading-spinner"></span> Mapping your walk…</> : <><Route size={19}/> {trip.mode === 'manual' ? 'Draw my walking route' : result ? 'Re-optimise this walk' : 'Optimise my walking tour'} <ArrowRight size={19}/></>}
            </button>
            <div className="bottom-links"><button onClick={share} disabled={!selected.length}><Share2 size={14}/> Share walk</button>{mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open in Google Maps</a>}<button onClick={() => setCreditsOpen(true)}>Photo credits</button></div>
          </div>
        </section>
        <section className="map-panel" aria-label="Map of London attractions">
          <TourMap selected={selected} order={orderedIds} legs={legs} source={source} onAdd={addAttractionFromMap} onStart={setStart} onRemove={addOrRemove} onMovePoint={moveCustomPoint} highlightedId={highlightedId} onHighlight={setHighlightedId} pending={pending} onPick={coords => { if (!inLondon(coords.lat, coords.lon)) { setMessage('Choose a point within Greater London.'); return; } setPending(coords); }} onAddPoint={addCustomPoint} onCancelPin={() => setPending(null)} count={trip.ids.length}/>
          <div className="map-top-card"><span className="map-top-icon"><Compass size={18}/></span><div><strong>Your London, beautifully connected.</strong><small>{result ? 'Your updated walk is shown on the map.' : 'Click anywhere on the map to add your own point.'}</small></div></div>
          <div className="map-footnote">Routes and visit times are estimates. Check opening hours, accessibility and tickets before travelling.</div>
        </section>
      </main>
      {creditsOpen && <PhotoCredits onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
