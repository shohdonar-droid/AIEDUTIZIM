import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logSystemAction(
  action: string,
  module: string,
  userName: string,
  userRole: string
) {
  try {
    await addDoc(collection(db, 'system_logs'), {
      action,
      module,
      userName,
      userRole,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging system action:', error);
  }
}
