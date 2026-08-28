const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

code = code.replace(
  '[{ text: "🤖 Xizmatlar" }, { text: "👥 Do\'stlarni taklif qilish" }],',
  '[{ text: "🤖 Xizmatlar" }, { text: "💰 Bonus olish" }],'
);

code = code.replace(
  '💡 <i>Hozircha har bir do\'stingiz uchun ${refBonus.toLocaleString()} so\'m olish uchun quyidagi "👥 Do\'stlarni taklif qilish" tugmasidan foydalaning!</i>',
  '💡 <i>Hozircha har bir do\'stingiz uchun ${refBonus.toLocaleString()} so\'m olish uchun quyidagi "💰 Bonus olish" tugmasidan foydalaning!</i>'
);

code = code.replace(
  'if (normText === "👥 Do\'stlarni taklif qilish" || normText === "👥 Do\'stni taklif qilish") {',
  'if (normText === "💰 Bonus olish" || normText === "bonus olish") {'
);

const oldRefMsg = '                   `🔗 <b>Telegram bot referal havolangiz:</b>\\n` +\n' +
'                   `${botRefLink}\\n\\n` +\n' +
'                   `🔗 <b>Veb-sayt havolangiz:</b>\\n` +\n' +
'                   `${webRefLink}\\n\\n` +\n' +
'                   `👉 Havolani do\\'stlaringizga ulashing va balansingizni to\\'ldiring!`;';

const newRefMsg = '                   `🔗 <b>Telegram bot referal havolangiz:</b>\\n` +\n' +
'                   `${botRefLink}\\n\\n` +\n' +
'                   `👉 Havolani do\\'stlaringizga ulashing va balansingizni to\\'ldiring!`;';

code = code.replace(oldRefMsg, newRefMsg);

fs.writeFileSync('telegram.ts', code);
console.log("Replaced successfully");
