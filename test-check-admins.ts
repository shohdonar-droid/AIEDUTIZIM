import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

let configRaw: any = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp({
  apiKey: configRaw.apiKey,
  authDomain: configRaw.authDomain,
  projectId: configRaw.projectId
});
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, configRaw.firestoreDatabaseId);

async function run() {
  const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
  console.log("Admins:");
  adminSnap.forEach(d => console.log(d.id, d.data().telegramId, d.data().displayName));
  process.exit(0);
}
run();
