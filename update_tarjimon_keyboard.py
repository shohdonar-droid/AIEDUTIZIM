import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

old_wizard_reply = """  userWizardStates.set(userId, { service: normText, step: 1, data: { __chargedCost: isAdmin ? 0 : chargeCost, __textCost: cost, __fileCost: dynamicCosts['📄 Fayl tarjima qilish'] !== undefined ? dynamicCosts['📄 Fayl tarjima qilish'] : 10000 } });
  
  await ctx.reply(promptText, {
    parse_mode: "HTML",
    reply_markup: {
      keyboard: [[{ text: "⬅️ Asosiy menyu" }]],
      resize_keyboard: true
    }
  });"""

new_wizard_reply = """  userWizardStates.set(userId, { service: normText, step: 1, data: { __chargedCost: isAdmin ? 0 : chargeCost, __textCost: cost, __fileCost: dynamicCosts['📄 Fayl tarjima qilish'] !== undefined ? dynamicCosts['📄 Fayl tarjima qilish'] : 10000 } });
  
  let keyboardButtons = [[{ text: "⬅️ Asosiy menyu" }]];
  
  if (normText === "🌐 Tarjimon") {
    keyboardButtons = [
      [{ text: "O'zbek - Rus" }, { text: "Rus - O'zbek" }],
      [{ text: "O'zbek - Ingliz" }, { text: "Ingliz - O'zbek" }],
      [{ text: "⬅️ Asosiy menyu" }]
    ];
  }

  await ctx.reply(promptText, {
    parse_mode: "HTML",
    reply_markup: {
      keyboard: keyboardButtons,
      resize_keyboard: true
    }
  });"""

if old_wizard_reply in content:
    content = content.replace(old_wizard_reply, new_wizard_reply)
    print("Successfully replaced tarjimon wizard keyboard")
else:
    print("Could not find the old tarjimon wizard reply string")

with open('telegram.ts', 'w') as f:
    f.write(content)
