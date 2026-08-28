import { db } from './src/lib/firebase';
import { doc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

async function run() {
  const users = await getDocs(collection(db, "users"));
  let counter = 4000002;
  const batch = writeBatch(db);
  
  users.forEach(d => {
    const data = d.data();
    if ((data.systemId === "4000001" || data.systemId === 4000001) && data.uid !== '0Nc1LSkkQISDyaUVvpGQLYdeV8D2') {
      console.log("Fixing user:", d.id, data.displayName, "to", counter);
      batch.update(doc(db, "users", d.id), { systemId: String(counter) });
      counter++;
    }
  });
  
  const tgUsers = await getDocs(collection(db, "telegram_users"));
  tgUsers.forEach(d => {
    const data = d.data();
    if ((data.systemId === "4000001" || data.systemId === 4000001)) {
      console.log("Fixing tg user:", d.id, data.firstName, "to", counter);
      batch.update(doc(db, "telegram_users", d.id), { systemId: String(counter) });
      counter++;
    }
  });
  
  await batch.commit();
  console.log("Done");
  process.exit(0);
}
run();
