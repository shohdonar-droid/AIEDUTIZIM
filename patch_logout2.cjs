const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const oldLogout = `bot.action(/tgtst_logout_(.+)/, async (ctx) => {
   const studentDocId = ctx.match[1];
   await ctx.answerCbQuery();
   try {
      await updateDoc(doc(db, "users", studentDocId), {
         telegramLinked: false,
         telegramId: null,
         telegramToken: null
      });
      authedUsers.delete(ctx.from.id);
      aiAssistantActiveUsers.delete(ctx.from.id);
      userWizardStates.delete(ctx.from.id);
      pendingLogins.delete(ctx.from.id);
      
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply("🚪 Telegram akkauntingiz talaba profilidan muvaffaqiyatli uzildi! Endi bot sizni mehmon sifatida ko'radi.", {
         reply_markup: { keyboard: await getKeyboard("user", ctx.from.id, false), resize_keyboard: true }
      });
   } catch (e) {
      console.error(e);
      await ctx.reply("❌ Xatolik yuz berdi");
   }
});`;

const newLogout = `bot.action(/tgtst_logout_(.+)/, async (ctx) => {
   const studentDocId = ctx.match[1];
   const telegramId = ctx.from.id;
   await ctx.answerCbQuery();
   try {
      const studentSnap = await getDoc(doc(db, "users", studentDocId));
      let balanceToTransfer = 0;
      let ballToTransfer = 0;
      if (studentSnap.exists()) {
        const sData = studentSnap.data();
        balanceToTransfer = sData.balance || 0;
        ballToTransfer = sData.ball || 0;
        
        await updateDoc(doc(db, "users", studentDocId), {
           telegramLinked: false,
           telegramId: null,
           telegramToken: null,
           balance: 0,
           ball: 0
        });
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
            displayName: ctx.from.first_name || "Foydalanuvchi",
            name: ctx.from.first_name || "Foydalanuvchi",
            username: ctx.from.username || "",
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

      authedUsers.delete(ctx.from.id);
      aiAssistantActiveUsers.delete(ctx.from.id);
      userWizardStates.delete(ctx.from.id);
      pendingLogins.delete(ctx.from.id);
      
      await ctx.deleteMessage().catch(() => {});
      const kb = await getKeyboard("bot_user", ctx.from.id, true);
      await ctx.reply("🚪 Telegram akkauntingiz talaba profilidan muvaffaqiyatli uzildi! Endi siz oldingi bot foydalanuvchisi rejimiga qaytdingiz (balansingiz saqlab qolindi).", {
         reply_markup: { keyboard: kb, resize_keyboard: true }
      });
   } catch (e) {
      console.error(e);
      await ctx.reply("❌ Xatolik yuz berdi");
   }
});`;

if (content.includes("bot.action(/tgtst_logout_(.+)/, async (ctx) => {")) {
  content = content.replace(oldLogout, newLogout);
  fs.writeFileSync('telegram.ts', content);
  console.log("Patched tgtst_logout_");
} else {
  console.log("Could not find tgtst_logout_");
}
