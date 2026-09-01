const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const newGreeting = `🤖 <b>AIEDUTIZIM — ta’lim uchun AI yordamchingiz!</b>\\n\\n🎓 Semestr imtihonlariga tayyorlaning!\\n📚 Kurs ishini yarating\\n📝 Test va topshiriqlar bilan ishlang\\n📊 Zamonaviy slayd va taqdimotlar tayyorlang\\n🌐 Matnlarni tarjima qiling\\n📄 Obektivka yarating\\n\\n⚡ Barchasi — bitta botda, tez va qulay!\\n\\n🌐 www.aide.uz\\n🤖 @AIEDUTIZIM_bot\\n💬 Savollar va yordam: @aiedutizimchat\\n\\n🚀 AIEDUTIZIM — ta’limni sun’iy intellekt bilan osonlashtiring!`;

const oldPhoneGreeting = '      `🤖 <b>Assalomu alaykum! AIEDUTIZIM Telegram botiga xush kelibsiz.</b>` +\n' +
'      `🎓 <b>AIEDUTIZIM</b> — Sun\'iy Intellekt Asosidagi Ta\'lim Tizimi.` +\n' +
'      `Kerakli bo\'limni tanlang:`;';

const newPhoneGreeting = '      `' + newGreeting + '\\n\\nKerakli bo\\'limni tanlang:`;';

if (content.includes(oldPhoneGreeting)) {
  content = content.replace(oldPhoneGreeting, newPhoneGreeting);
  console.log("Patched phone greeting!");
} else {
  // Let's try regex if exact match fails
  content = content.replace(/const greeting =[\s\S]*?Kerakli bo'limni tanlang:`;/, "const greeting = `" + newGreeting + "\\n\\nKerakli bo\\'limni tanlang:`;");
  console.log("Used Regex to patch phone greeting");
}

const oldNoPhoneGreeting = '    `👋 <b>Assalomu alaykum! AIEDUTIZIM botiga xush kelibsiz.</b>` +\n' +
'    `Botdan foydalanish va ro\'yxatdan o\'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"</b> tugmasini bosing:`,';

const newNoPhoneGreeting = '    `' + newGreeting + '\\n\\n<i>Botdan foydalanish va ro\\'yxatdan o\\'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"</b> tugmasini bosing:</i>`,';

if (content.includes(oldNoPhoneGreeting)) {
  content = content.replace(oldNoPhoneGreeting, newNoPhoneGreeting);
  console.log("Patched no phone greeting!");
} else {
  content = content.replace(/return ctx\.reply\(\s*`👋 <b>Assalomu alaykum! AIEDUTIZIM botiga xush kelibsiz\.<\/b>` \+\s*`Botdan foydalanish va ro'yxatdan o'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"<\/b> tugmasini bosing:`,/, 'return ctx.reply(\n    `' + newGreeting + '\\n\\n<i>Botdan foydalanish va ro\\'yxatdan o\\'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"</b> tugmasini bosing:</i>`,');
  console.log("Used Regex to patch no phone greeting");
}

fs.writeFileSync('telegram.ts', content);
