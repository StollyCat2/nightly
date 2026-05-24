#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const venues = [
  { name: 'Hectors Hybel',            address: 'Nygårdsgaten 2, 5015 Bergen' },
  { name: 'Rævedilter Bar og Kafe',   address: 'Christies gate 9, 5015 Bergen' },
  { name: 'The Old Irish Pub Bergen', address: 'Øvre Ole Bulls plass 9, 5012 Bergen' },
  { name: 'Heidis Bier Bar',          address: 'Håkonsgaten 27, 5015 Bergen' },
  { name: 'Vaskeriet',                address: 'Magnus Barfots gate 4, 5015 Bergen' },
  { name: 'Metz Bergen',              address: 'Torget 7, 5014 Bergen' },
];

function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const { tokens } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (tokens.expires_at && Date.now() < tokens.expires_at) return tokens.access_token;
  throw new Error('Token utløpt. Kjør: firebase login --reauth');
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=no`;
  const res = await fetch(url, { headers: { 'User-Agent': 'NightlyApp/1.0' } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function getVenueIdByName(name, token) {
  const res = await fetch(`${FIRESTORE}/venues`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const doc = (data.documents ?? []).find(d => d.fields?.name?.stringValue === name);
  if (!doc) return null;
  return doc.name.split('/').pop();
}

async function updateCoords(uid, lat, lng, address, token) {
  const url = `${FIRESTORE}/venues/${uid}?updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=address`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        lat: { doubleValue: lat },
        lng: { doubleValue: lng },
        address: { stringValue: address },
      },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

(async () => {
  const token = getAccessToken();
  console.log('Oppdaterer koordinater...\n');

  for (const venue of venues) {
    const uid = await getVenueIdByName(venue.name, token);
    if (!uid) { console.error(`✗ ${venue.name}: ikke funnet i Firestore`); continue; }

    const coords = await geocode(venue.address);
    if (!coords) { console.error(`✗ ${venue.name}: geocoding feilet`); continue; }

    await updateCoords(uid, coords.lat, coords.lng, venue.address, token);
    console.log(`✓ ${venue.name}: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);

    await new Promise(r => setTimeout(r, 1100)); // Nominatim rate limit: 1 req/sek
  }

  console.log('\nFerdig! Oppdater siden i Chrome for å se de nye posisjonene.');
})();
