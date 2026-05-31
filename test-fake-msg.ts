import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

let configRaw: any = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(configRaw);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, configRaw.firestoreDatabaseId);

async function run() {
  await addDoc(collection(db, 'messages'), {
    senderId: 'SYSTEM_ADMIN',
    receiverId: 'tg_11111',
    receiverRole: 'student',
    text: 'Test fake msg',
    timestamp: serverTimestamp(),
    isRead: false
  });
  console.log("Added");
  setTimeout(() => process.exit(0), 1000);
}
run();
