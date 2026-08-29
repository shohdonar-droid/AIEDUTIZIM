import sys
content = open('telegram.ts', 'r').read()

old_isService = """  const isService = Object.keys(AI_COSTS).includes(normText);
  if (isService && !pending) {
    const dynamicCosts = await getBotConfigCosts();
    const cost = dynamicCosts[normText] !== undefined ? dynamicCosts[normText] : AI_COSTS[normText];
    
    return ctx.reply(
      `🤖 <b>${normText}</b>\\n\\n💳 Xizmat narxi: <b>${cost.toLocaleString()} so'm</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Yaratish", callback_data: `start_ai_srv_${normText}` }]
          ]
        }
      }
    );
  }"""

new_isService = """  // Specific AI Services Handler (Runs OUTSIDE of pure AI Chat mode)
  // Fayl tarjima qilish shouldn't show as a separate startable service
  const isService = Object.keys(AI_COSTS).includes(normText) && normText !== "📄 Fayl tarjima qilish";
  
  if (isService && !pending) {
    const dynamicCosts = await getBotConfigCosts();
    const cost = dynamicCosts[normText] !== undefined ? dynamicCosts[normText] : AI_COSTS[normText];
    
    if (normText === "🌐 Tarjimon") {
      const fileCost = dynamicCosts["📄 Fayl tarjima qilish"] !== undefined ? dynamicCosts["📄 Fayl tarjima qilish"] : (AI_COSTS["📄 Fayl tarjima qilish"] || 10000);
      return ctx.reply(
        `🤖 <b>${normText}</b>\\n\\n💳 Matn tarjima qilish - <b>${cost.toLocaleString()} so'm</b>\\n💳 Fayl (Word/Txt) tarjima qilish - <b>${fileCost.toLocaleString()} so'm</b>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Yaratish", callback_data: `start_ai_srv_${normText}` }]
            ]
          }
        }
      );
    }

    return ctx.reply(
      `🤖 <b>${normText}</b>\\n\\n💳 Xizmat narxi: <b>${cost.toLocaleString()} so'm</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Yaratish", callback_data: `start_ai_srv_${normText}` }]
          ]
        }
      }
    );
  }"""

start_idx = content.find("  const isService = Object.keys(AI_COSTS).includes(normText);")
end_idx = content.find("  } else {\n    // console.log(`[Telegram] Wizard check: user ${userId}")
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_isService + content[end_idx+4:]
    open('telegram.ts', 'w').write(content)
    print("Replaced successfully")
else:
    print("Could not find the block to replace")
