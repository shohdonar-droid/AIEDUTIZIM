import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app);

async function resetCounter() {
  try {
    await updateDoc(doc(db, 'counters', 'certificates'), { count: 7 });
    console.log('Reset certificates counter to 7');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting counter:', err);
    process.exit(1);
  }
}

resetCounter();
