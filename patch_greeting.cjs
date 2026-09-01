const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const oldGreetingPhone = `  if (hasPhone) {
    const greeting =
      \`🤖 <b>Assalomu alaykum! AIEDUTIZIM Telegram botiga xush kelibsiz.</b>\\n\\n\` +
      \`🎓 <b>AIEDUTIZIM</b> — Sun'iy Intellekt Asosidagi Ta'lim Tizimi.\\n\\n\` +
      \`Kerakli bo'limni tanlang:\`;`;

const newGreetingPhone = `  if (hasPhone) {
    const greeting =
      \`🤖 <b>AIEDUTIZIM — ta'lim uchun AI yordamchingiz!</b>\\n\\n\` +
      \`🎓 Semestr imtihonlariga tayyorlaning!\\n\` +
      \`📚 Kurs ishini yarating\\n\` +
      \`📝 Test va topshiriqlar bilan ishlang\\n\` +
      \`📊 Zamonaviy slayd va taqdimotlar tayyorlang\\n\` +
      \`🌐 Matnlarni tarjima qiling\\n\` +
      \`📄 Obektivka yarating\\n\\n\` +
      \`⚡ Barchasi — bitta botda, tez va qulay!\\n\\n\` +
      \`🌐 www.aide.uz\\n\` +
      \`🤖 @AIEDUTIZIM_bot\\n\` +
      \`💬 Savollar va yordam: @aiedutizimchat\\n\\n\` +
      \`🚀 AIEDUTIZIM — ta'limni sun'iy intellekt bilan osonlashtiring!\\n\\n\` +
      \`Kerakli bo'limni tanlang:\`;`;

const oldGreetingNoPhone = `  return ctx.reply(
    \`👋 <b>Assalomu alaykum! AIEDUTIZIM botiga xush kelibsiz.</b>\\n\\n\` +
    \`Botdan foydalanish va ro'yxatdan o'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"</b> tugmasini bosing:\`,`;

const newGreetingNoPhone = `  return ctx.reply(
      \`🤖 <b>AIEDUTIZIM — ta'lim uchun AI yordamchingiz!</b>\\n\\n\` +
      \`🎓 Semestr imtihonlariga tayyorlaning!\\n\` +
      \`📚 Kurs ishini yarating\\n\` +
      \`📝 Test va topshiriqlar bilan ishlang\\n\` +
      \`📊 Zamonaviy slayd va taqdimotlar tayyorlang\\n\` +
      \`🌐 Matnlarni tarjima qiling\\n\` +
      \`📄 Obektivka yarating\\n\\n\` +
      \`⚡ Barchasi — bitta botda, tez va qulay!\\n\\n\` +
      \`🌐 www.aide.uz\\n\` +
      \`🤖 @AIEDUTIZIM_bot\\n\` +
      \`💬 Savollar va yordam: @aiedutizimchat\\n\\n\` +
      \`🚀 AIEDUTIZIM — ta'limni sun'iy intellekt bilan osonlashtiring!\\n\\n\` +
      \`<i>Botdan foydalanish va ro'yxatdan o'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"</b> tugmasini bosing:</i>\`,`;

if (content.includes(oldGreetingPhone)) {
  content = content.replace(oldGreetingPhone, newGreetingPhone);
  console.log("Patched phone greeting!");
} else {
  console.log("Failed to patch phone greeting. String not found.");
}

if (content.includes(oldGreetingNoPhone)) {
  content = content.replace(oldGreetingNoPhone, newGreetingNoPhone);
  console.log("Patched no phone greeting!");
} else {
  console.log("Failed to patch no phone greeting. String not found.");
}

fs.writeFileSync('telegram.ts', content);
