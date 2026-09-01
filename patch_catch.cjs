const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const replacement = `bot.catch((err: any, ctx) => {
  const errMsg = err?.message || String(err);
  if (errMsg.includes("409") || errMsg.includes("Conflict")) {
    console.warn("⚠️ [Telegraf Catch] 409 Conflict ignored (another instance active).");
    return;
  }
  console.error(\`[Telegraf Global Catch] Fault in processing update \${ctx?.update?.update_id || "unknown"}:\`, err);
  
  // Write to a local log file so we can inspect the exact error!
  try {
    const fs = require("fs");
    fs.appendFileSync("tg-errors.log", new Date().toISOString() + " - " + errMsg + "\\n" + (err.stack || "") + "\\n\\n");
  } catch(e){}

  if (ctx && typeof ctx.reply === "function") {
    ctx.reply("⚠️ Tizimda kichik uzilish kuzatildi. Iltimos, xabaringizni qaytadan yuboring.").catch(() => {});
  }
});`;

code = code.replace(/bot\.catch\(\(err: any, ctx\) => \{[\s\S]*?\}\);/, replacement);
fs.writeFileSync('telegram.ts', code);
console.log("Patched catch block");
