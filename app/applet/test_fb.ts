import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
const firebaseConfigRaw = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfigRaw);
const db = getFirestore(app);
getDocs(collection(db, 'users')).then(snap => {
    console.log("Found users: ", snap.size);
    snap.docs.slice(0, 5).forEach(d => console.log(d.id, d.data()));
    process.exit(0);
});
