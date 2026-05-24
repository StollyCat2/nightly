#!/usr/bin/env node
/**
 * Seed Bergen venues directly to Firestore via REST API.
 * Requires: gcloud auth application-default login (already done)
 * Run: node scripts/seed-bergen.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { access_token, expires_at } = config.tokens;
  if (expires_at && Date.now() < expires_at) return access_token;
  throw new Error('Firebase access token is expired. Run: firebase login --reauth');
}

const venues = [
  {
    id: 'bergen-legal',
    name: 'Legal',
    address: 'Nedre Ole Bulls plass 4, 5012 Bergen',
    description: 'En av Bergens mest populære barer i hjertet av byen. Kjent for god stemning og et bredt utvalg drikke.',
    lat: 60.3913,
    lng: 5.3221,
    phone: '+47 55 23 20 20',
    isActive: true,
    images: [],
    views: 0,
    clicks: 0,
  },
  {
    id: 'bergen-garage',
    name: 'Garage',
    address: 'Christies gate 14, 5015 Bergen',
    description: 'Ikonisk rocke- og metalbar i Bergen sentrum. Levende musikk, øl på fat og ekte underground-atmosfære.',
    lat: 60.3929,
    lng: 5.3246,
    phone: '+47 55 32 19 80',
    isActive: true,
    images: [],
    views: 0,
    clicks: 0,
  },
  {
    id: 'bergen-landmark',
    name: 'Landmark',
    address: 'Koengen 1, 5010 Bergen',
    description: 'Stort utestedsanlegg ved Koengen med bar, klubb og konsertscene. Populært blant studenter og festglade bergensere.',
    lat: 60.3882,
    lng: 5.3311,
    phone: '+47 55 36 31 00',
    isActive: true,
    images: [],
    views: 0,
    clicks: 0,
  },
  {
    id: 'bergen-hulen',
    name: 'Hulen',
    address: 'Olaf Ryes vei 48, 5012 Bergen',
    description: 'Legendarisk studentklubb i en grotte under Nygårdsparken. En av Norges eldste og mest særegne musikklubber.',
    lat: 60.3836,
    lng: 5.3306,
    phone: '+47 55 20 00 70',
    isActive: true,
    images: [],
    views: 0,
    clicks: 0,
  },
  {
    id: 'bergen-apollon',
    name: 'Apollon Platebar',
    address: 'Neumanns gate 2, 5015 Bergen',
    description: 'Platebutikk og bar i ett. Unikt konsept med levende musikk, nisjeøl og vinylplater langs veggene.',
    lat: 60.3938,
    lng: 5.3265,
    phone: '+47 55 36 68 10',
    isActive: true,
    images: [],
    views: 0,
    clicks: 0,
  },
];

function toFirestoreValue(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (val === null || val === undefined) return { nullValue: null };
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function writeVenue(venue) {
  const token = await getAccessToken();
  const { id, ...data } = venue;
  const url = `${BASE_URL}/venues/${id}`;
  const body = JSON.stringify(toFirestoreDoc(data));

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to write ${venue.name}: ${err}`);
  }
  console.log(`✓ ${venue.name}`);
}

(async () => {
  console.log('Seeder Bergen-venues til Firestore...\n');
  for (const venue of venues) {
    await writeVenue(venue);
  }
  console.log('\nFerdig! 5 steder lagt til i Bergen.');
})();
