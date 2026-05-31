import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, query, where, getDocs } from 'firebase/firestore';
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
        const adminSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'teacher', 'organization'])));
        console.log("Users found:", adminSnap.size);
        adminSnap.forEach(d => {
            console.log(d.id, d.data().role, d.data().telegramId);
        });
        process.exit(0);
    } catch(e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
