import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function run() {
  const q = query(collection(db, 'enrollments'), where('certificateId', '>=', 'YAU-00020'));
  const snapshot = await getDocs(q);
  console.log(snapshot.docs.map(d => d.data().certificateId));
  process.exit(0);
}
run();
