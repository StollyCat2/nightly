#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const API_KEY = 'AIzaSyB0fda-X546A5dpLB9bVBfVQVZ28EDwZw8';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

const venues = [
  { name: 'Biblioteket Bar', address: 'Vetrlidsallmenningen 2, 5014 Bergen', email: 'booking@biblioteketbar.no' },
  { name: 'Fincken',         address: 'Nygårdsgaten 2A, 5015 Bergen',        email: 'post@fincken.no' },
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

async function createAuthUser(email) {
  const res = await fetch(AUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: Math.random().toString(36).slice(-8) + 'Aa1!', returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.localId) throw new Error(`Auth feil: ${JSON.stringify(data)}`);
  return data.localId;
}

function fsVal(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(fsVal) } };
  return { nullValue: null };
}

async function writeVenueDoc(uid, venue, coords, token) {
  const res = await fetch(`${FIRESTORE}/venues/${uid}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries({
      name: venue.name, address: venue.address, description: '',
      ownerEmail: venue.email.toLowerCase(), phone: '',
      lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      images: [], isActive: true, inviteStatus: 'pending', views: 0, clicks: 0,
    }).map(([k, v]) => [k, fsVal(v)])) }),
  });
  if (!res.ok) throw new Error(await res.text());
}

(async () => {
  const token = getAccessToken();
  console.log('Oppretter venues...\n');
  for (const venue of venues) {
    try {
      const [uid, coords] = await Promise.all([createAuthUser(venue.email), geocode(venue.address)]);
      await writeVenueDoc(uid, venue, coords, token);
      console.log(`✓ ${venue.name} — ${coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'ingen koordinater'}`);
    } catch (err) {
      console.error(`✗ ${venue.name}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1100));
  }
  console.log('\nFerdig! Refresh Chrome for å se markørene.');
})();
