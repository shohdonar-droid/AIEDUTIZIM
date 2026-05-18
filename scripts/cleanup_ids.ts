import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  // Config will be injected by the environment or we can read it
};

// Note: In this environment we can import the config
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app);

async function cleanup() {
  const idsToDelete = [
    'YAU-00021', 'YAU-00022', 'YAU-00023', 'YAU-00024', 'YAU-00025',
    'YAU-00027', 'YAU-00028', 'YAU-00029', 'YAU-00030'
  ];

  console.log('Starting cleanup...');

  for (const id of idsToDelete) {
    try {
      // Delete from certificates
      await deleteDoc(doc(db, 'certificates', id));
      console.log(`Deleted certificate ${id}`);

      // Delete from enrollments where certificateId == id
      const q = query(collection(db, 'enrollments'), where('certificateId', '==', id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        console.log(`Deleted enrollment for certificate ${id}`);
      }
    } catch (err) {
      console.error(`Error deleting ${id}:`, err);
    }
  }

  // Reset counter to 7
  try {
    await updateDoc(doc(db, 'counters', 'certificates'), { count: 7 });
    console.log('Reset certificates counter to 7');
  } catch (err) {
    console.error('Error resetting counter:', err);
  }

  console.log('Cleanup finished.');
  process.exit(0);
}

cleanup();
