import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, or, and } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app);

async function checkMessages() {
  try {
    const q = query(collection(db, 'messages'));
    const snap = await getDocs(q);
    console.log('Total messages:', snap.size);
    snap.forEach(doc => {
      console.log('Msg:', doc.id, doc.data());
    });
    
    console.log('\nChecking anonymous users:');
    const uSnap = await getDocs(query(collection(db, 'users'), where('isAnonymousContact', '==', true)));
    uSnap.forEach(u => {
      console.log('Anon User:', u.id, u.data());
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkMessages();
