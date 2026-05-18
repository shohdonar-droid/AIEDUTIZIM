import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app);

async function checkAdmins() {
  try {
    const adminsSnap = await getDocs(collection(db, 'users'));
    console.log('Total users:', adminsSnap.size);
    adminsSnap.forEach(doc => {
      const data = doc.data();
      if (['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(data.email) || data.role === 'admin') {
        console.log('Admin Candidate:', doc.id, 'Data:', data);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAdmins();
