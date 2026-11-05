/**
 * Hand-curated places and approximate entrance/meeting coordinates.
 * These are suggestions, not a verified live places database; hours, ticketing,
 * accessibility, entry points and temporary closures must be checked separately.
 */
export const CATEGORIES = ['All', 'History', 'Art & culture', 'Architecture', 'Markets', 'Parks & gardens', 'Neighbourhoods', 'South London character', 'West London character', 'North London character'];

export const PLACES = [
  { id:'westminster-abbey', name:'Westminster Abbey', area:'Westminster', category:'History', lat:51.4993, lon:-0.1273, visit:45, detail:'A thousand years of royal history and remarkable Gothic architecture.' },
  { id:'big-ben', name:'Big Ben & Parliament', area:'Westminster', category:'Architecture', lat:51.5007, lon:-0.1246, visit:15, detail:'The iconic Elizabeth Tower beside the Houses of Parliament.' },
  { id:'buckingham-palace', name:'Buckingham Palace', area:'Westminster', category:'History', lat:51.5014, lon:-0.1419, visit:20, detail:'The monarch’s London residence and its ceremonial forecourt.' },
  { id:'st-james-park', name:'St James’s Park', area:'Westminster', category:'Parks & gardens', lat:51.5025, lon:-0.1344, visit:25, detail:'Lakeside paths and lovely views in one of London’s royal parks.' },
  { id:'war-rooms', name:'Churchill War Rooms', area:'Westminster', category:'History', lat:51.5021, lon:-0.1291, visit:75, detail:'Explore the underground wartime headquarters; admission usually required.' },
  { id:'trafalgar-square', name:'Trafalgar Square', area:'West End', category:'History', lat:51.5080, lon:-0.1281, visit:15, detail:'A bustling civic square framed by galleries and landmarks.' },
  { id:'national-gallery', name:'The National Gallery', area:'West End', category:'Art & culture', lat:51.5089, lon:-0.1283, visit:60, detail:'World-renowned paintings overlooking Trafalgar Square.' },
  { id:'covent-garden', name:'Covent Garden Piazza', area:'West End', category:'Neighbourhoods', lat:51.5117, lon:-0.1230, visit:30, detail:'A historic market piazza with performers, shops and cafés.' },
  { id:'seven-dials', name:'Seven Dials', area:'West End', category:'Neighbourhoods', lat:51.5131, lon:-0.1260, visit:20, detail:'Seven little streets packed with interesting independent shops.' },
  { id:'somerset-house', name:'Somerset House', area:'Strand', category:'Architecture', lat:51.5107, lon:-0.1179, visit:30, detail:'An elegant riverside cultural landmark with a grand courtyard.' },
  { id:'british-museum', name:'The British Museum', area:'Bloomsbury', category:'Art & culture', lat:51.5194, lon:-0.1269, visit:75, detail:'A vast collection of objects from across world history.' },
  { id:'carnaby-street', name:'Carnaby Street', area:'Soho', category:'Neighbourhoods', lat:51.5136, lon:-0.1383, visit:25, detail:'Colourful lanes with a long fashion and music history.' },
  { id:'london-eye', name:'London Eye', area:'South Bank', category:'Architecture', lat:51.5033, lon:-0.1196, visit:20, detail:'A landmark observation wheel on the River Thames.' },
  { id:'southbank-centre', name:'Southbank Centre', area:'South Bank', category:'Art & culture', lat:51.5056, lon:-0.1161, visit:30, detail:'Concert halls, cultural spaces and a lively riverfront.' },
  { id:'tate-modern', name:'Tate Modern', area:'Bankside', category:'Art & culture', lat:51.5076, lon:-0.0994, visit:60, detail:'Contemporary art inside a monumental former power station.' },
  { id:'shakespeares-globe', name:'Shakespeare’s Globe', area:'Bankside', category:'History', lat:51.5081, lon:-0.0972, visit:25, detail:'A faithful recreation of the Elizabethan playhouse.' },
  { id:'borough-market', name:'Borough Market', area:'London Bridge', category:'Markets', lat:51.5055, lon:-0.0911, visit:45, detail:'A celebrated food market with produce and street food.' },
  { id:'tower-bridge', name:'Tower Bridge', area:'Tower Bridge', category:'Architecture', lat:51.5055, lon:-0.0754, visit:25, detail:'Victorian engineering and one of London’s best-known crossings.' },
  { id:'tower-of-london', name:'Tower of London', area:'Tower Hill', category:'History', lat:51.5081, lon:-0.0761, visit:90, detail:'A historic fortress beside the Thames, home to the Crown Jewels.' },
  { id:'st-pauls', name:'St Paul’s Cathedral', area:'City of London', category:'Architecture', lat:51.5138, lon:-0.0984, visit:45, detail:'Sir Christopher Wren’s magnificent domed cathedral.' },
  { id:'sky-garden', name:'Sky Garden', area:'City of London', category:'Architecture', lat:51.5113, lon:-0.0835, visit:40, detail:'Indoor gardens and sweeping views; booking may be needed.' },
  { id:'leadenhall-market', name:'Leadenhall Market', area:'City of London', category:'Markets', lat:51.5127, lon:-0.0837, visit:20, detail:'An ornate Victorian covered market under a striking roof.' },
  { id:'barbican', name:'Barbican Centre', area:'Barbican', category:'Architecture', lat:51.5201, lon:-0.0935, visit:45, detail:'Brutalist architecture and a celebrated arts complex.' },
  { id:'old-spitalfields', name:'Old Spitalfields Market', area:'Spitalfields', category:'Markets', lat:51.5194, lon:-0.0758, visit:40, detail:'Stalls, design shops and food in a historic covered market.' },
  { id:'brick-lane', name:'Brick Lane', area:'Shoreditch', category:'Neighbourhoods', lat:51.5223, lon:-0.0716, visit:35, detail:'Street art, vintage shops, bakeries and East London culture.' },
  { id:'columbia-road', name:'Columbia Road', area:'Bethnal Green', category:'Markets', lat:51.5291, lon:-0.0690, visit:30, detail:'A beautiful East London street known for its Sunday flower market.' },
  { id:'camden-market', name:'Camden Market', area:'Camden', category:'Markets', lat:51.5416, lon:-0.1461, visit:55, detail:'Eclectic shopping and food beside the canal.' },
  { id:'regents-park', name:'Regent’s Park', area:'Regent’s Park', category:'Parks & gardens', lat:51.5309, lon:-0.1465, visit:45, detail:'Broad gardens, pathways and lush green spaces.' },
  { id:'hyde-park', name:'Hyde Park', area:'Hyde Park', category:'Parks & gardens', lat:51.5074, lon:-0.1657, visit:45, detail:'An expansive royal park with paths around the Serpentine.' },
  { id:'vam', name:'Victoria and Albert Museum', area:'South Kensington', category:'Art & culture', lat:51.4967, lon:-0.1722, visit:75, detail:'An outstanding collection of art, design and decorative objects.' },
  { id:'natural-history', name:'Natural History Museum', area:'South Kensington', category:'Art & culture', lat:51.4967, lon:-0.1764, visit:75, detail:'Dramatic Victorian architecture and natural-world exhibits.' },
  { id:'kensington-gardens', name:'Kensington Gardens', area:'Kensington', category:'Parks & gardens', lat:51.5073, lon:-0.1800, visit:45, detail:'Quiet pathways, formal gardens and Kensington Palace.' },
  { id:'portobello-road', name:'Portobello Road', area:'Notting Hill', category:'Markets', lat:51.5152, lon:-0.2058, visit:45, detail:'Famous for antiques, pastel façades and lively market days.' },
  { id:'cutty-sark', name:'Cutty Sark', area:'Greenwich', category:'History', lat:51.4820, lon:-0.0095, visit:45, detail:'A restored nineteenth-century tea clipper on the river.' },
  { id:'greenwich-park', name:'Greenwich Park', area:'Greenwich', category:'Parks & gardens', lat:51.4779, lon:-0.0015, visit:45, detail:'Hilltop paths with skyline views across Greenwich and Canary Wharf.' },
  { id:'royal-observatory', name:'Royal Observatory', area:'Greenwich', category:'History', lat:51.4769, lon:-0.0005, visit:45, detail:'Stand near the Prime Meridian and explore timekeeping history.' },

  // South London character — a compact Brixton neighbourhood walk.
  { id:'windrush-square', name:'Windrush Square', area:'Brixton', category:'History', lat:51.4612, lon:-0.1157, visit:20, detail:'A civic square celebrating Brixton’s Caribbean heritage, beside the Black Cultural Archives.' },
  { id:'ritzy-brixton', name:'The Ritzy & Atlantic Road', area:'Brixton', category:'Art & culture', lat:51.4610, lon:-0.1152, visit:15, detail:'A long-running local cinema and a lively gateway into Brixton’s independent streets.' },
  { id:'electric-avenue', name:'Electric Avenue', area:'Brixton', category:'Markets', lat:51.4626, lon:-0.1145, visit:25, detail:'A historic market street, well known for its electric lighting and Eddy Grant’s song.' },
  { id:'brixton-village', name:'Brixton Village', area:'Brixton', category:'Markets', lat:51.4621, lon:-0.1116, visit:40, detail:'An atmospheric covered arcade known for independent food traders and shops.' },
  { id:'market-row', name:'Market Row', area:'Brixton', category:'Markets', lat:51.4616, lon:-0.1121, visit:30, detail:'Browse the indoor market arcade and neighbourhood businesses.' },
  { id:'brockwell-park', name:'Brockwell Park', area:'Herne Hill', category:'Parks & gardens', lat:51.4495, lon:-0.1066, visit:40, detail:'Open lawns, mature trees and views over south London.' },

  // West London character — close-knit Notting Hill stops, plus an optional canal detour.
  { id:'notting-hill-gate', name:'Notting Hill Gate', area:'Notting Hill', category:'Neighbourhoods', lat:51.5095, lon:-0.1965, visit:15, detail:'A bustling starting point for discovering Notting Hill’s residential side streets.' },
  { id:'westbourne-grove', name:'Westbourne Grove', area:'Notting Hill', category:'Neighbourhoods', lat:51.5144, lon:-0.1963, visit:25, detail:'Victorian terraces, small shops and café-lined stretches.' },
  { id:'lancaster-road', name:'Lancaster Road', area:'Notting Hill', category:'Architecture', lat:51.5170, lon:-0.2052, visit:15, detail:'A photogenic street of colourful houses near Portobello Road.' },
  { id:'museum-of-brands', name:'Museum of Brands', area:'Ladbroke Grove', category:'Art & culture', lat:51.5186, lon:-0.2106, visit:60, detail:'A distinctive collection of packaging, advertising and popular culture; ticketed entry.' },
  { id:'golborne-road', name:'Golborne Road', area:'North Kensington', category:'Markets', lat:51.5231, lon:-0.2087, visit:30, detail:'A lively neighbourhood street known for independent food spots and market stalls.' },
  { id:'little-venice', name:'Little Venice', area:'Maida Vale', category:'Neighbourhoods', lat:51.5221, lon:-0.1826, visit:30, detail:'Canal junctions, narrowboats and waterside paths north of Paddington.' },

  // North London character — Camden Lock, its markets and Primrose Hill.
  { id:'camden-high-street', name:'Camden High Street', area:'Camden Town', category:'Neighbourhoods', lat:51.5383, lon:-0.1428, visit:25, detail:'Independent shops, music history and colourful storefronts.' },
  { id:'camden-lock', name:'Camden Lock', area:'Camden', category:'History', lat:51.5409, lon:-0.1461, visit:20, detail:'A working canal lock and lively waterside meeting point.' },
  { id:'stables-market', name:'Stables Market', area:'Camden', category:'Markets', lat:51.5421, lon:-0.1488, visit:35, detail:'A maze of market lanes in former stables and industrial buildings.' },
  { id:'chalk-farm-road', name:'Chalk Farm Road', area:'Camden', category:'Neighbourhoods', lat:51.5431, lon:-0.1514, visit:20, detail:'Music venues, shops and the northward continuation of Camden’s street life.' },
  { id:'primrose-hill', name:'Primrose Hill', area:'Primrose Hill', category:'Parks & gardens', lat:51.5394, lon:-0.1607, visit:35, detail:'A grassy hilltop with one of north London’s best skyline viewpoints.' },
  { id:'hampstead-heath', name:'Hampstead Heath', area:'Hampstead', category:'Parks & gardens', lat:51.560863, lon:-0.163572, visit:60, detail:'Wild wooded paths, open meadows and ponds on one of London’s best-loved heaths.' }
];

export const BY_ID = Object.fromEntries(PLACES.map((place) => [place.id, place]));
export const PRESETS = [
  { id:'classic', photo:'bigben', title:'The London classics', tagline:'Royal sights & iconic squares', ids:['buckingham-palace','st-james-park','westminster-abbey','big-ben','trafalgar-square'] },
  { id:'culture', photo:'covent', title:'Art & little streets', tagline:'Galleries, piazzas & backstreets', ids:['british-museum','seven-dials','covent-garden','somerset-house','national-gallery'] },
  { id:'river', photo:'tate', title:'Along the Thames', tagline:'An easy riverfront adventure', ids:['london-eye','southbank-centre','tate-modern','shakespeares-globe','borough-market'] },
  { id:'east', title:'East London character', tagline:'Markets, street art & old streets', photo:'brick', ids:['leadenhall-market','old-spitalfields','brick-lane','columbia-road'] },
  { id:'south', title:'South London character', tagline:'Brixton markets, music & civic spaces', photo:'brixton', ids:['windrush-square','ritzy-brixton','electric-avenue','brixton-village','market-row','brockwell-park'] },
  { id:'west', title:'West London character', tagline:'Notting Hill lanes & Portobello market', photo:'portobello', ids:['notting-hill-gate','westbourne-grove','lancaster-road','portobello-road','museum-of-brands','golborne-road'] },
  { id:'north', title:'North London character', tagline:'Camden Lock & Primrose Hill', photo:'camden', ids:['camden-high-street','camden-market','camden-lock','stables-market','chalk-farm-road','primrose-hill'] }
];
export const DEFAULT_IDS = PRESETS[0].ids;
export const MAX_STOPS = 9;

// Neighbourhood-style chips are additive: a place can remain a Market, Park, etc.
// while also belonging to a regional character walk.
export const CHARACTER_GROUPS = {
  'South London character': ['windrush-square','ritzy-brixton','electric-avenue','brixton-village','market-row','brockwell-park'],
  'West London character': ['notting-hill-gate','westbourne-grove','lancaster-road','portobello-road','museum-of-brands','golborne-road','little-venice','kensington-gardens'],
  'North London character': ['camden-high-street','camden-market','camden-lock','stables-market','chalk-farm-road','primrose-hill','regents-park','hampstead-heath']
};
export function matchesCategory(place, category) {
  return category === 'All' || place.category === category || CHARACTER_GROUPS[category]?.includes(place.id) || false;
}
