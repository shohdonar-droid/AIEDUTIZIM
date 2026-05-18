import { collection, query, where, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function run() {
  const certsToDel = ["YAU-00008", "YAU-00009", "YAU-00010", "YAU-00011", "YAU-00012", "YAU-00013", "YAU-00014", "YAU-00015", "YAU-00016", "YAU-00017", "YAU-00018", "YAU-00019", "YAU-00020", "YAU-00021", "YAU-00022", "YAU-00023", "YAU-00024", "YAU-00025", "YAU-00026", "YAU-00027", "YAU-00028", "YAU-00029", "YAU-00030", "YAU-00031", "YAU-00032"];
  
  const q = query(collection(db, 'certificates'), where('certificateId', '>=', 'YAU-00008'));
  const snapshot = await getDocs(q);
  
  for (const item of snapshot.docs) {
     try {
       await deleteDoc(doc(db, 'certificates', item.id));
       console.log('Deleted cert from certificates', item.id, item.data().certificateId);
     } catch (err: any) {
       console.log('Error deleting cert', item.id, err.message);
     }
  }

  const q2 = query(collection(db, 'enrollments'), where('certificateId', '>=', 'YAU-00008'));
  const snap2 = await getDocs(q2);
  
  for (const item of snap2.docs) {
     try {
       await deleteDoc(doc(db, 'enrollments', item.id));
       console.log('Deleted cert from enrollments', item.id, item.data().certificateId);
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
