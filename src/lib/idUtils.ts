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

/**
 * Utility function to sort users by ID (systemId, login, or uid) in ascending numerical/alphanumeric order.
 * Falls back to displayName if IDs are not present.
 */
export function compareUsersById(a: any, b: any): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const idA = String(a.systemId || a.login || a.system_id || a.id || a.uid || '').trim();
  const idB = String(b.systemId || b.login || b.system_id || b.id || b.uid || '').trim();

  if (idA && idB) {
    const cmp = idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
  } else if (idA) {
    return -1;
  } else if (idB) {
    return 1;
  }

  const nameA = a.displayName || a.name || '';
  const nameB = b.displayName || b.name || '';
  return nameA.localeCompare(nameB, 'uz-UZ');
}

