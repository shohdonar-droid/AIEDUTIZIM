import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

old_menu_buttons = """  const menuButtons = [
    "ℹ️ Tizim haqida", "💰 Balans", "💳 Balansni to'ldirish",
    "💬 Adminga murojaat", "🌐 Rasmiy sayt",
    "🔙 Asosiy Menyu", "⬅️ Asosiy menyu", "🚪 Chiqish", "👤 Profil", "🔑 Kirish",
    "🤖 AI Yordamchi", "🤖 Xizmatlar", "Xizmatlar", "🤖 XIZMATLAR", "XIZMATLAR", "💬 Savol-javob"
  ];"""

new_menu_buttons = """  const menuButtons = [
    "ℹ️ Tizim haqida", "💰 Balans", "💳 Balansni to'ldirish",
    "💬 Adminga murojaat", "🌐 Rasmiy sayt",
    "🔙 Asosiy Menyu", "⬅️ Asosiy menyu", "🚪 Chiqish", "👤 Profil", "🔑 Kirish",
    "🤖 AI Yordamchi", "🤖 Xizmatlar", "Xizmatlar", "🤖 XIZMATLAR", "XIZMATLAR", "💬 Savol-javob",
    "💻 CHIRCHIQ KOMPYUTER XIZMATLARI"
  ];"""

new_handler = """  if (normText === "💻 CHIRCHIQ KOMPYUTER XIZMATLARI") {
    aiModeDeactivate();
    aiAssistantActiveUsers.delete(userId);
    
    const adminIds = getAdminIds();
    const isAdminUser = adminIds.includes(userId) || (authed && (authed.role === "admin" || authed.role === "subadmin"));

    try {
      const snap = await getDocs(collection(db, "computer_services"));
      const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      let text = "💻 <b>CHIRCHIQ KOMPYUTER XIZMATLARI</b>\\n\\nQuyidagi kompyuter xizmatlaridan birini tanlang:";
      if (shops.length === 0) {
        text = "💻 <b>CHIRCHIQ KOMPYUTER XIZMATLARI</b>\\n\\nHozircha ro'yxat bo'sh.";
      }

      const buttons = shops.map(shop => ([{ text: shop.name || "Nomsiz xizmat", callback_data: `comp_srv_view_${shop.id}` }]));
      
      if (isAdminUser) {
        buttons.push([{ text: "➕ Yangi qo'shish (Admin)", callback_data: "comp_srv_add" }]);
      }

      return ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    } catch (e) {
      console.error("Error fetching computer services:", e);
      return ctx.reply("❌ Xatolik yuz berdi.");
    }
  }

  if (normText === "🤖 AI Yordamchi" || normText === "🤖 Xizmatlar" || normText === "Xizmatlar" || normText === "🤖 XIZMATLAR" || normText === "XIZMATLAR") {"""

if old_menu_buttons in content:
    content = content.replace(old_menu_buttons, new_menu_buttons)
    content = content.replace('  if (normText === "🤖 AI Yordamchi" || normText === "🤖 Xizmatlar" || normText === "Xizmatlar" || normText === "🤖 XIZMATLAR" || normText === "XIZMATLAR") {', new_handler)
    with open('telegram.ts', 'w') as f:
        f.write(content)
    print("Added Chirchiq menu handler")
else:
    print("Failed to find menu buttons to replace")
