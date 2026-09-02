const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const linkLogic = `  const startPayload = ctx.message.text.split(" ")[1];

  if (startPayload && startPayload.startsWith("link_") && db) {
    const token = startPayload.replace("link_", "");
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramToken", "==", token));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const uDoc = snap.docs[0];
        await updateDoc(doc(db, "users", uDoc.id), {
          telegramId: userId,
          telegramLinked: true,
          telegramToken: null
        });
        
        ctx.reply("✅ Telegram akkauntingiz veb-saytdagi profilingizga muvaffaqiyatli ulandi!", {
           reply_markup: { keyboard: await getKeyboard(uDoc.data().role || "bot_user", userId, true), resize_keyboard: true }
        });
        return;
      }
    } catch (e) {
      console.error("Link error:", e);
    }
  }
`;

code = code.replace('const startPayload = ctx.message.text.split(" ")[1];', linkLogic);
fs.writeFileSync('telegram.ts', code);
console.log("Patched link logic");
