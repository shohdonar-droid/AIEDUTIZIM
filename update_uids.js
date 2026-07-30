import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

function generateSixDigitId() {
  const chars = '0123456789';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

async function updateUsers() {
  const usersSnapshot = await db.collection('users').get();
  let count = 0;
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const platformUid = data.platformUid;
    
    if (!platformUid || !/^\d{6}$/.test(platformUid)) {
      const newUid = generateSixDigitId();
      await doc.ref.update({ platformUid: newUid });
      console.log(`Updated user ${doc.id} with new platformUid: ${newUid}`);
      count++;
    }
  }
  
  console.log(`Finished updating ${count} users.`);
}

updateUsers().catch(console.error);
