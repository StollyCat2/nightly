#!/usr/bin/env node
const fs = require('fs'), os = require('os'), path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function getAccessToken() {
  const { tokens } = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  if (tokens.expires_at && Date.now() < tokens.expires_at) return tokens.access_token;
  throw new Error('Token utløpt. Kjør: firebase login --reauth');
}

const concerts = [
  // Bergen
  { artist: 'Aurora',          title: 'Northern Lights Tour',     venue: 'Landmark',           city: 'Bergen',    date: '2026-06-07', genre: 'Pop',        ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Sigrid',          title: 'Sommernatt',               venue: 'Landmark',           city: 'Bergen',    date: '2026-06-14', genre: 'Pop',        ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Kvelertak',       title: 'Nattesferd Live',          venue: 'Garage',             city: 'Bergen',    date: '2026-06-05', genre: 'Metal',      ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Sondre Lerche',   title: 'Akustisk',                 venue: 'Hulen',              city: 'Bergen',    date: '2026-06-20', genre: 'Pop',        ticketUrl: 'https://www.billettservice.no' },
  { artist: 'Röyksopp',        title: 'Profound Mysteries III',   venue: 'Landmark',           city: 'Bergen',    date: '2026-07-04', genre: 'Elektronisk',ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Motorpsycho',     title: 'Heavy Metal Fruit',        venue: 'Garage',             city: 'Bergen',    date: '2026-06-27', genre: 'Rock',       ticketUrl: 'https://www.billettservice.no' },
  { artist: 'Talking Heads',   title: 'Stop Making Sense Tour',   venue: 'Grieghallen',        city: 'Bergen',    date: '2026-07-12', genre: 'Rock',       ticketUrl: 'https://www.ticketmaster.no' },

  // Oslo
  { artist: 'Billie Eilish',   title: 'Hit Me Hard and Soft Tour',venue: 'Spektrum',           city: 'Oslo',      date: '2026-06-03', genre: 'Pop',        ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Kygo',            title: 'Golden Hour Live',         venue: 'Telenor Arena',      city: 'Oslo',      date: '2026-06-21', genre: 'Elektronisk',ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Hozier',          title: 'Unreal Unearth Tour',      venue: 'Rockefeller',        city: 'Oslo',      date: '2026-06-10', genre: 'Rock',       ticketUrl: 'https://www.billettservice.no' },
  { artist: 'Parcels',         title: 'Sommerturné',              venue: 'Blå',                city: 'Oslo',      date: '2026-06-18', genre: 'Pop',        ticketUrl: 'https://www.billettservice.no' },
  { artist: 'Burial',          title: 'Antidawn Live',            venue: 'Jaeger',             city: 'Oslo',      date: '2026-06-25', genre: 'Elektronisk',ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Marcus & Martinus','title': 'Heartbeats Tour',       venue: 'Oslo Spektrum',      city: 'Oslo',      date: '2026-07-02', genre: 'Pop',        ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Fontaines D.C.',  title: 'Romance Tour',             venue: 'Rockefeller',        city: 'Oslo',      date: '2026-06-30', genre: 'Rock',       ticketUrl: 'https://www.billettservice.no' },

  // Stavanger
  { artist: 'Astrid S',        title: 'Innermost Tour',           venue: 'Stavanger Konserthus',city: 'Stavanger', date: '2026-06-13', genre: 'Pop',       ticketUrl: 'https://www.ticketmaster.no' },
  { artist: 'Kaizers Orchestra','title': 'Violeta Violeta',       venue: 'Folken',             city: 'Stavanger', date: '2026-07-19', genre: 'Rock',       ticketUrl: 'https://www.billettservice.no' },
];

function toTs(dateStr) {
  return { timestampValue: new Date(dateStr + 'T20:00:00Z').toISOString() };
}

function fsVal(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  return { nullValue: null };
}

(async () => {
  const token = getAccessToken();
  console.log('Seeder konserter...\n');

  for (const c of concerts) {
    const { date, ...rest } = c;
    const fields = {
      ...Object.fromEntries(Object.entries(rest).map(([k,v]) => [k, fsVal(v)])),
      date: toTs(date),
    };
    const id = `${c.city.toLowerCase()}-${c.artist.toLowerCase().replace(/[^a-z]/g,'-')}-${date}`;
    const res = await fetch(`${FIRESTORE}/concerts/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    console.log(res.ok ? `✓ ${c.artist} — ${c.city} ${date}` : `✗ ${c.artist}: ${await res.text()}`);
  }
  console.log('\nFerdig!');
})();
