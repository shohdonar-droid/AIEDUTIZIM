import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';

let configRaw: any = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(configRaw);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, configRaw.firestoreDatabaseId);

async function run() {
  const snap = await getDocs(query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(5)));
  snap.forEach(d => console.log(d.id, JSON.stringify(d.data(), null, 2)));
  process.exit(0);
}
run();
