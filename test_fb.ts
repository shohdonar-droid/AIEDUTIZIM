import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const rawConfigPath = 'firebase-applet-config.json';
const firebaseConfigRaw = JSON.parse(fs.readFileSync(rawConfigPath, 'utf8'));
const firebaseConfig = {
    apiKey: firebaseConfigRaw.apiKey,
    projectId: firebaseConfigRaw.projectId,
    appId: firebaseConfigRaw.appId,
};
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfigRaw.firestoreDatabaseId);

async function run() {
    try {
        const q = query(collection(db, 'users'), where('teacherId', '==', 'L3b2NjDOrIS4QnpjmnS7kQWOreE3'));
        const snap = await getDocs(q);
        console.log(`Matched users size: ${snap.size}`);
        snap.forEach(d => {
            const data = d.data();
            console.log(`ID: ${d.id} | Name: ${data.displayName} | Email: ${data.email} | Login: ${data.login} | Role: ${data.role}`);
        });
        process.exit(0);
    } catch(e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
