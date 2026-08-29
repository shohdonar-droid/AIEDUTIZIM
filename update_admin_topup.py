import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

old_admin_topup = """    pendingLogins.set(userId, { step: "admin_manual_topup_id" });
    return ctx.reply(
      "🆔 <b>Foydalanuvchi ID raqamini kiriting:</b>\\n\\n" +
      "<i>Foydalanuvchining 7 xonali ID raqami, Telegram ID yoki Firestore UID raqamini yozing.</i>",
      { parse_mode: "HTML" }
    );"""

new_admin_topup = """    pendingLogins.set(userId, { step: "admin_manual_topup_id" });
    return ctx.reply(
      "🆔 <b>Foydalanuvchi ID raqamini kiriting:</b>\\n\\n" +
      "<i>Foydalanuvchining 7 xonali ID raqami, Telegram ID yoki Firestore UID raqamini yozing.</i>",
      { 
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "⬅️ Asosiy menyu" }]],
          resize_keyboard: true
        }
      }
    );"""

if old_admin_topup in content:
    content = content.replace(old_admin_topup, new_admin_topup)
    print("Successfully replaced admin topup keyboard")
else:
    print("Could not find the old admin topup reply string")

with open('telegram.ts', 'w') as f:
    f.write(content)
