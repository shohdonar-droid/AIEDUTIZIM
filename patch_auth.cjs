const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const replacement = `export async function getAuthedUser(userId: number): Promise<any | null> {
  if (!db) return null;
  try {
    const { collection, query, where, getDocs } = require('firebase/firestore');
    const usersRef = collection(db, "users");
    let q = query(usersRef, where("telegramId", "==", userId));
    let snap = await getDocs(q);
    if (snap.empty) {
      q = query(usersRef, where("telegramId", "==", String(userId)));
      snap = await getDocs(q);
    }
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function getKeyboard(`;

code = code.replace("export async function getKeyboard(", replacement);

fs.writeFileSync('telegram.ts', code);
console.log("Patched getAuthedUser");
