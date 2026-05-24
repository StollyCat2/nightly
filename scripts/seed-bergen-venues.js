#!/usr/bin/env node
/**
 * Creates proper Firebase Auth accounts + Firestore venue docs for Bergen venues.
 * Mirrors exactly what AdminCreateVenueScreen does — no invite emails sent.
 * Run: node scripts/seed-bergen-venues.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const API_KEY = 'AIzaSyB0fda-X546A5dpLB9bVBfVQVZ28EDwZw8';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

const venues = [
  {
    name: 'Hectors Hybel',
    address: 'Nygårdsgaten 2, 5015 Bergen',
    email: 'post@hectorshybel.no',
    lat: 60.3886,
    lng: 5.3234,
    description: '',
    phone: '',
  },
  {
    name: 'Rævedilter Bar og Kafe',
    address: 'Christies gate 9, 5015 Bergen',
    email: 'raevedilterbar@gmail.com',
    lat: 60.3867,
    lng: 5.3198,
    description: '',
    phone: '',
  },
  {
    name: 'The Old Irish Pub Bergen',
    address: 'Veiten 3, 5012 Bergen',
    email: '5012@oldirishpub.no',
    lat: 60.3913,
    lng: 5.3221,
    description: '',
    phone: '',
  },
  {
    name: 'Heidis Bier Bar',
    address: 'Håkonsgaten 27, 5015 Bergen',
    email: 'bergen@heidisbierbar.no',
    lat: 60.3952,
    lng: 5.3243,
    description: '',
    phone: '',
  },
  {
    name: 'Vaskeriet',
    address: 'Magnus Barfots gate 4, 5015 Bergen',
    email: 'post@vaskerietbar.no',
    lat: 60.3876,
    lng: 5.3218,
    description: '',
    phone: '',
  },
  {
    name: 'Metz Bergen',
    address: 'Torget 7, 5014 Bergen',
    email: 'post@metzbergen.no',
    lat: 60.3975,
    lng: 5.3249,
    description: '',
    phone: '',
  },
];

function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { access_token, expires_at } = config.tokens;
  if (expires_at && Date.now() < expires_at) return access_token;
  throw new Error('Firebase access token er utløpt. Kjør: firebase login --reauth');
}

function randomPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4) + 'Aa1!';
}

function fsVal(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(fsVal) } };
  if (val === null || val === undefined) return { nullValue: null };
  return { stringValue: String(val) };
}

function toDoc(obj) {
  return { fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fsVal(v)])) };
}

async function createAuthUser(email) {
  const res = await fetch(AUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: randomPassword(), returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.localId) throw new Error(`Auth feil for ${email}: ${JSON.stringify(data)}`);
  return data.localId;
}

async function writeVenueDoc(uid, venue, token) {
  const doc = {
    name: venue.name,
    address: venue.address,
    description: venue.description,
    ownerEmail: venue.email.toLowerCase(),
    phone: venue.phone,
    lat: venue.lat,
    lng: venue.lng,
    images: [],
    isActive: true,
    inviteStatus: 'pending',
    views: 0,
    clicks: 0,
  };
  const res = await fetch(`${FIRESTORE}/venues/${uid}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toDoc(doc)),
  });
  if (!res.ok) throw new Error(`Firestore feil for ${venue.name}: ${await res.text()}`);
}

(async () => {
  console.log('Oppretter Bergen-venues...\n');
  const token = getAccessToken();

  for (const venue of venues) {
    try {
      const uid = await createAuthUser(venue.email);
      await writeVenueDoc(uid, venue, token);
      console.log(`✓ ${venue.name} (${uid.slice(0, 8)}...)`);
    } catch (err) {
      console.error(`✗ ${venue.name}: ${err.message}`);
    }
  }

  console.log('\nFerdig! Stedene er klare i admin-appen og på kartet.');
})();
