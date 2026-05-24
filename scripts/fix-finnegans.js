#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const { tokens } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (tokens.expires_at && Date.now() < tokens.expires_at) return tokens.access_token;
  throw new Error('Token utløpt. Kjør: firebase login --reauth');
}

async function getVenueIdByName(name, token) {
  const res = await fetch(`${FIRESTORE}/venues`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const doc = (data.documents ?? []).find(d => d.fields?.name?.stringValue === name);
  return doc ? doc.name.split('/').pop() : null;
}

(async () => {
  const token = getAccessToken();
  const uid = await getVenueIdByName('Finnegans Irish Pub', token);
  if (!uid) { console.error('Fant ikke Finnegans i Firestore'); process.exit(1); }

  const url = `${FIRESTORE}/venues/${uid}?updateMask.fieldPaths=lat&updateMask.fieldPaths=lng`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { lat: { doubleValue: 60.3927364 }, lng: { doubleValue: 5.3208675 } } }),
  });
  console.log(res.ok ? '✓ Finnegans Irish Pub koordinater oppdatert' : `✗ Feil: ${await res.text()}`);
})();
