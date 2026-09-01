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
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply("🚪 Telegram akkauntingiz talaba profilidan uzildi.", {
         reply_markup: { keyboard: await getKeyboard("user", ctx.from.id, false), resize_keyboard: true }
      });`;

const newLogout = `bot.action(/tgtst_logout_(.+)/, async (ctx) => {
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
      });`;

if (content.includes(oldLogout)) {
  content = content.replace(oldLogout, newLogout);
  fs.writeFileSync('telegram.ts', content);
  console.log("Patched logout");
} else {
  console.log("Logout block not found");
}
