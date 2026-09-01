const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const TEXT = `🤖 <b>AIEDUTIZIM — ta’lim uchun AI yordamchingiz!</b>\n\n` +
`🎓 Semestr imtihonlariga tayyorlaning!\n` +
`📚 Kurs ishini yarating\n` +
`📝 Test va topshiriqlar bilan ishlang\n` +
`📊 Zamonaviy slayd va taqdimotlar tayyorlang\n` +
`🌐 Matnlarni tarjima qiling\n` +
`📄 Obektivka yarating\n\n` +
`⚡ Barchasi — bitta botda, tez va qulay!\n\n` +
`🌐 www.aide.uz\n` +
`🤖 @AIEDUTIZIM_bot\n` +
`💬 Savollar va yordam: @aiedutizimchat\n\n` +
`🚀 AIEDUTIZIM — ta’limni sun’iy intellekt bilan osonlashtiring!`;

const pattern1 = /const greeting =[\s\S]*?Kerakli bo'limni tanlang:`;/;
code = code.replace(pattern1, "const greeting = `" + TEXT + "\\n\\nKerakli bo'limni tanlang:`;");

const pattern2 = /return ctx\.reply\([\s\S]*?Botdan foydalanish va ro'yxatdan o'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"<\/b> tugmasini bosing:`,/;
code = code.replace(pattern2, "return ctx.reply(`" + TEXT + "\\n\\n<i>Botdan foydalanish va ro'yxatdan o'tish uchun iltimos, pastdagi <b>\"📱 Kontaktni yuborish\"</b> tugmasini bosing:</i>`,");

fs.writeFileSync('telegram.ts', code);
console.log("Done");
