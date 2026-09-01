const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldRoute = `  app.post("/api/telegram/unlink", async (req, res) => {
    try {
      const { telegramId } = req.body;
      if (telegramId) {
        const { bot, getKeyboard } = await import("./telegram.js");
        if (bot && getKeyboard) {
          const kb = await getKeyboard("student", telegramId, false);
          await bot.telegram.sendMessage(
            telegramId,
            "🔌 <b>Sizning Telegram akkauntingiz talaba profilidan uzildi!</b>\\nBot faqat cheklangan rejimda ishlaydi.",
            {
              parse_mode: "HTML",
              reply_markup: { keyboard: kb, resize_keyboard: true }
            }
          );
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error("[Telegram Unlink API Error]:", e);
      res.status(500).json({ error: "Failed to notify telegram" });
    }
  });`;

const newRoute = `  app.post("/api/telegram/unlink", async (req, res) => {
    try {
      const { telegramId, studentUid } = req.body;
      if (telegramId) {
        let balanceToTransfer = 0;
        let ballToTransfer = 0;
        
        if (studentUid) {
           const studentSnap = await getDoc(doc(db, "users", studentUid));
           if (studentSnap.exists()) {
              const sData = studentSnap.data();
              balanceToTransfer = sData.balance || 0;
              ballToTransfer = sData.ball || 0;
              if (balanceToTransfer > 0 || ballToTransfer > 0) {
                 await updateDoc(doc(db, "users", studentUid), {
                    balance: 0,
                    ball: 0
                 });
              }
           }
        }
        
        let q = query(collection(db, "users"), where("telegramId", "==", telegramId));
        let snap = await getDocs(q);
        if (snap.empty) {
           q = query(collection(db, "users"), where("telegramId", "==", String(telegramId)));
           snap = await getDocs(q);
        }
        let botUserDoc = null;
        for (const d of snap.docs) {
           if (d.data().isBotUser) {
              botUserDoc = d;
              break;
           }
        }
        
        if (botUserDoc) {
           if (balanceToTransfer > 0 || ballToTransfer > 0) {
              await updateDoc(doc(db, "users", botUserDoc.id), {
                 balance: (botUserDoc.data().balance || 0) + balanceToTransfer,
                 ball: (botUserDoc.data().ball || 0) + ballToTransfer
              });
           }
        } else {
           await addDoc(collection(db, "users"), {
              telegramId: telegramId,
              uid: \`tg_\${telegramId}\`,
              displayName: "Foydalanuvchi",
              name: "Foydalanuvchi",
              username: "",
              phone: "",
              role: "bot_user",
              systemId: Math.floor(1000000 + Math.random() * 9000000),
              ball: ballToTransfer,
              balance: balanceToTransfer,
              spentBalls: 0,
              referralCount: 0,
              referrals: 0,
              invitedBy: null,
              createdAt: serverTimestamp(),
              isTelegramUser: true,
              isBotUser: true
           });
        }
        
        const { bot, getKeyboard } = await import("./telegram.js");
        if (bot && getKeyboard) {
          const kb = await getKeyboard("bot_user", telegramId, true);
          await bot.telegram.sendMessage(
            telegramId,
            "🔌 <b>Sizning Telegram akkauntingiz talaba profilidan uzildi!</b>\\nEndi siz oldingi bot foydalanuvchisi rejimiga qaytdingiz (balansingiz saqlab qolindi).",
            {
              parse_mode: "HTML",
              reply_markup: { keyboard: kb, resize_keyboard: true }
            }
          ).catch(() => {});
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error("[Telegram Unlink API Error]:", e);
      res.status(500).json({ error: "Failed to notify telegram" });
    }
  });`;

if (content.includes('app.post("/api/telegram/unlink"')) {
  content = content.replace(oldRoute, newRoute);
  fs.writeFileSync('server.ts', content);
  console.log("Patched server.ts");
} else {
  console.log("Could not find unlink route in server.ts");
}
