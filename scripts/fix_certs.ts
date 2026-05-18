import { collection, query, where, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function run() {
  const certsToDel = ["YAU-00021", "YAU-00022", "YAU-00023", "YAU-00024", "YAU-00025", "YAU-00027", "YAU-00028", "YAU-00029", "YAU-00030"];
  
  const q = query(collection(db, 'enrollments'), where('certificateId', 'in', certsToDel));
  const snapshot = await getDocs(q);
  
  for (const item of snapshot.docs) {
     try {
       await deleteDoc(doc(db, 'enrollments', item.id));
       console.log('Deleted cert', item.id, item.data().certificateId);
     } catch (err: any) {
       console.log('Error deleting cert', item.id, err.message);
     }
  }
  
  try {
     await setDoc(doc(db, 'counters', 'certificates'), { count: 7 }, { merge: true });
     console.log('Counter reset to 7');
  } catch (err: any) {
     console.log('Error setting counter', err.message);
  }
  process.exit(0);
}
run();
