const fs = require('fs');
let serverContent = fs.readFileSync('server.ts', 'utf8');

const apiRoute = `
  app.post("/api/telegram/unlink", async (req, res) => {
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
  });
`;

// Insert the new route before app.post("/api/telegram-webhook"
const targetStr = 'app.post("/api/telegram-webhook"';
if (serverContent.includes(targetStr)) {
  serverContent = serverContent.replace(targetStr, apiRoute + '\\n  ' + targetStr);
  fs.writeFileSync('server.ts', serverContent);
  console.log("Patched server.ts successfully");
} else {
  console.log("Target string not found in server.ts");
}
