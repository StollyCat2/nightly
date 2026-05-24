#!/usr/bin/env node
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
  throw new Error('Firebase access token er utløpt. Kjør: firebase login --reauth');
}

const IDS = ['bergen-legal', 'bergen-garage', 'bergen-landmark', 'bergen-hulen', 'bergen-apollon'];

(async () => {
  const token = await getAccessToken();
  console.log('Sletter seedede Bergen-venues...\n');
  for (const id of IDS) {
    const res = await fetch(`${BASE_URL}/venues/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(res.ok ? `✓ Slettet ${id}` : `✗ Feil ved sletting av ${id}: ${res.status}`);
  }
  console.log('\nFerdig. Opprett stedene på nytt via admin-appen.');
})();
