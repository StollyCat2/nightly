#!/usr/bin/env node
const fs = require('fs'), os = require('os'), path = require('path');

const PROJECT_ID = 'nightly-app-f3722';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const TYPES = {
  // Bergen
  'Hectors Hybel':              'bar',
  'Rævedilter Bar og Kafe':     'bar',
  'The Old Irish Pub Bergen':   'bar',
  'Heidis Bier Bar':            'bar',
  'Vaskeriet':                  'bar',
  'Metz Bergen':                'nattklubb',
  'Magda':                      'bar',
  'Apollon Platebar':           'bar',
  'Pingvinen':                  'bar',
  'Finnegans Irish Pub':        'bar',
  'Baran Café':                 'bar',
  'Biblioteket Bar':            'bar',
  'Fincken':                    'bar',
  'Rebel':                      'nattklubb',
  // Oslo
  'Jaeger':                     'nattklubb',
  'Blå':                        'nattklubb',
  'Himkok':                     'bar',
  'Dattera til Hagen':          'bar',
  'Kulturhuset':                'bar',
  'Nedre Løkka':                'bar',
  'Internasjonalen':            'bar',
  'Scotsman':                   'bar',
  'Rockefeller':                'nattklubb',
  'The Thief Bar':              'bar',
  "Heidi's Bier Bar Oslo":      'bar',
  'The Old Irish Pub Oslo':     'bar',
  // Stavanger
  'Cardinal Pub & Bar':         'bar',
  'The Old Irish Pub Stavanger':'bar',
  'LouLou Stavanger':           'nattklubb',
  'Beverly Hills Fun Pub':      'bar',
  'Martinique Bar':             'bar',
  'Matros Bar':                 'bar',
  'Backstage Stavanger':        'nattklubb',
  'Tivoli Bar Stavanger':       'bar',
  'Tom And Lello':              'bar',
  'Hanekam':                    'bar',
  'Show Bar':                   'nattklubb',
};

function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const { tokens } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (tokens.expires_at && Date.now() < tokens.expires_at) return tokens.access_token;
  throw new Error('Token utløpt. Kjør: firebase login --reauth');
}

(async () => {
  const token = getAccessToken();

  const res = await fetch(`${FIRESTORE}/venues`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const docs = data.documents ?? [];

  console.log(`Fant ${docs.length} venues. Setter typer...\n`);

  let updated = 0, skipped = 0;
  for (const doc of docs) {
    const name = doc.fields?.name?.stringValue;
    const type = TYPES[name];
    if (!type) { console.log(`⚠ Ingen type for: ${name}`); skipped++; continue; }

    const uid = doc.name.split('/').pop();
    const patchRes = await fetch(
      `${FIRESTORE}/venues/${uid}?updateMask.fieldPaths=type`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { type: { stringValue: type } } }),
      }
    );
    if (patchRes.ok) { console.log(`✓ ${name} → ${type}`); updated++; }
    else { console.error(`✗ ${name}: ${await patchRes.text()}`); }
  }

  console.log(`\nFerdig! ${updated} oppdatert, ${skipped} uten type.`);
})();
