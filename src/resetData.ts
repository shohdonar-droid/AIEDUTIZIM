import { db } from './lib/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

async function resetData() {
  const collectionsToReset = ['payments', 'active_subscriptions'];

  for (const collectionName of collectionsToReset) {
    console.log(`Resetting collection: ${collectionName}`);
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.size === 0) {
        console.log(`Collection ${collectionName} is already empty.`);
        continue;
    }

    const batch = writeBatch(db);
    snapshot.forEach((document) => {
      batch.delete(document.ref);
    });
    
    await batch.commit();
    console.log(`Collection ${collectionName} reset. Deleted ${snapshot.size} documents.`);
  }
}

resetData().then(() => console.log('All done')).catch(console.error);
