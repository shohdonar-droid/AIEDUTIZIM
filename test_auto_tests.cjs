const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const autoTestsSnap = await db.collection("auto_tests").get();
  console.log("Total auto_tests:", autoTestsSnap.size);
  autoTestsSnap.forEach(d => {
    const data = d.data();
    console.log("Test ID:", d.id, "Title:", data.title, "Groups:", data.groupIds, "Creator:", data.creatorId);
  });
}
run().catch(console.error);
