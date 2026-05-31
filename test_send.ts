import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
        await addDoc(collection(db, 'messages'), {
            senderId: 'tg_12345',
            senderName: 'Shohdon (Telegram)',
            receiverId: 'SYSTEM_ADMIN',
            receiverRole: 'admin',
            text: 'Test message from telegram',
            timestamp: serverTimestamp(),
            isRead: false,
            fromTelegram: true
        });
        console.log("Message added!");
        process.exit(0);
    } catch(e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
