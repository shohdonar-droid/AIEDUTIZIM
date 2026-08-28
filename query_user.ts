import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
async function run() {
  const users = await getDocs(collection(db, "telegram_users"));
  users.forEach(d => {
    const data = d.data();
    if (data.username === "dilyorbek1998" || data.telegramId === 8106966088) {
      console.log("tgUsers:", d.id, data.systemId, data.username);
    }
  });
  process.exit(0);
}
run();
