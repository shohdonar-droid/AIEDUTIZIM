import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export type UserRoleIDType = 'teacher' | 'staff' | 'mustaqil_o_qituvchi' | 'student';

/**
 * Generates a 7-digit sequential ID based on user role:
 * - Tashkilot (teacher): Starts with 1 (e.g., 1000001, 1000002...)
 * - Xodim (staff): Starts with 2 (e.g., 2000001, 2000002...)
 * - Mustaqil o'qituvchi (mustaqil_o_qituvchi): Starts with 3 (e.g., 3000001, 3000002...)
 * - Talaba (student): Starts with 4 (e.g., 4000001, 4000002...)
 */
export async function getNextSequentialId(role: UserRoleIDType): Promise<string> {
  let baseNumber = 1000001;
  let prefixChar = '1';

  if (role === 'teacher') {
    baseNumber = 1000001;
    prefixChar = '1';
  } else if (role === 'staff') {
    baseNumber = 2000001;
    prefixChar = '2';
  } else if (role === 'mustaqil_o_qituvchi') {
    baseNumber = 3000001;
    prefixChar = '3';
  } else if (role === 'student') {
    baseNumber = 4000001;
    prefixChar = '4';
  }

  try {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    
    let maxId = baseNumber - 1;

    snap.docs.forEach((d) => {
      const data = d.data();
      const val = data.systemId || data.login || '';
      if (typeof val === 'string' && /^\d{7}$/.test(val) && val.startsWith(prefixChar)) {
        const num = parseInt(val, 10);
        if (num > maxId) {
          maxId = num;
        }
      } else if (typeof val === 'number' && val >= baseNumber && val < baseNumber + 1000000) {
        if (val > maxId) {
          maxId = val;
        }
      }
    });

    return (maxId + 1).toString();
  } catch (err) {
    console.error("Error generating next sequential ID for role", role, err);
    return baseNumber.toString();
  }
}
