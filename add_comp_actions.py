import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

# Add actions before bot.on("message"
actions_code = """
// --- CHIRCHIQ KOMPYUTER XIZMATLARI ACTIONS ---

bot.action(/comp_srv_view_(.+)/, async (ctx) => {
  const shopId = ctx.match[1];
  try {
    const snap = await getDoc(doc(db, "computer_services", shopId));
    if (!snap.exists()) {
      return ctx.answerCbQuery("Bu xizmat topilmadi.", { show_alert: true });
    }
    const shop = snap.data();
    
    let text = `💻 <b>${shop.name}</b>\\n\\n`;
    text += `📋 <b>Xizmatlar:</b>\\n${shop.services || "Ma'lumot yo'q"}\\n\\n`;
    text += `📍 <b>Manzil:</b> ${shop.address || "Ma'lumot yo'q"}\\n`;
    text += `📞 <b>Bog'lanish:</b> ${shop.contact || "Ma'lumot yo'q"}`;

    const buttons = [
      [{ text: "🔙 Orqaga", callback_data: "comp_srv_back" }]
    ];

    const adminIds = getAdminIds();
    const userId = ctx.from.id;
    const authed = await getAuthedUser(userId);
    const isAdminUser = adminIds.includes(userId) || (authed && (authed.role === "admin" || authed.role === "subadmin"));

    if (isAdminUser) {
      buttons.push([
        { text: "✏️ Tahrirlash (Admin)", callback_data: `comp_srv_edit_${shopId}` },
        { text: "🗑 O'chirish (Admin)", callback_data: `comp_srv_del_${shopId}` }
      ]);
    }

    if (shop.photoId) {
      await ctx.deleteMessage().catch(() => {});
      await ctx.replyWithPhoto(shop.photoId, {
        caption: text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } catch (e) {
    console.error(e);
    ctx.answerCbQuery("Xatolik").catch(() => {});
  }
});

bot.action("comp_srv_back", async (ctx) => {
  const userId = ctx.from.id;
  const adminIds = getAdminIds();
  const authed = await getAuthedUser(userId);
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

    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    console.error(e);
  }
});

bot.action("comp_srv_add", async (ctx) => {
  pendingLogins.set(ctx.from.id, { step: "admin_comp_add_name" });
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply("✍️ Yangi kompyuterxona nomini kiriting:\\n\\n<i>Bekor qilish uchun <b>⬅️ Asosiy menyu</b> tugmasini bosing.</i>", {
    parse_mode: "HTML",
    reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
  });
});

bot.action(/comp_srv_del_(.+)/, async (ctx) => {
  const shopId = ctx.match[1];
  try {
    await deleteDoc(doc(db, "computer_services", shopId));
    await ctx.answerCbQuery("O'chirildi", { show_alert: true });
    
    const snap = await getDocs(collection(db, "computer_services"));
    const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let text = "💻 <b>CHIRCHIQ KOMPYUTER XIZMATLARI</b>\\n\\nQuyidagi kompyuter xizmatlaridan birini tanlang:";
    if (shops.length === 0) {
      text = "💻 <b>CHIRCHIQ KOMPYUTER XIZMATLARI</b>\\n\\nHozircha ro'yxat bo'sh.";
    }

    const buttons = shops.map(shop => ([{ text: shop.name || "Nomsiz xizmat", callback_data: `comp_srv_view_${shop.id}` }]));
    buttons.push([{ text: "➕ Yangi qo'shish (Admin)", callback_data: "comp_srv_add" }]);

    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    console.error(e);
  }
});

bot.action(/comp_srv_edit_(.+)/, async (ctx) => {
  const shopId = ctx.match[1];
  pendingLogins.set(ctx.from.id, { step: "admin_comp_edit_select", shopId });
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply("Qaysi qismini tahrirlamoqchisiz?\\n\\n<i>Bekor qilish uchun <b>⬅️ Asosiy menyu</b> tugmasini bosing.</i>", {
    parse_mode: "HTML",
    reply_markup: {
       inline_keyboard: [
           [{text: "Nomi", callback_data: "comp_srv_edit_field_name"}],
           [{text: "Xizmatlar", callback_data: "comp_srv_edit_field_services"}],
           [{text: "Manzil", callback_data: "comp_srv_edit_field_address"}],
           [{text: "Bog'lanish", callback_data: "comp_srv_edit_field_contact"}],
           [{text: "Rasm", callback_data: "comp_srv_edit_field_photo"}],
       ]
    }
  });
});

bot.action(/comp_srv_edit_field_(.+)/, async (ctx) => {
    const field = ctx.match[1];
    const pending = pendingLogins.get(ctx.from.id);
    if (!pending || pending.step !== "admin_comp_edit_select") {
        return ctx.answerCbQuery("Xatolik", { show_alert: true });
    }
    pending.step = "admin_comp_edit_do";
    pending.editField = field;
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(`✍️ Yangi ${field} ma'lumotini yuboring (rasm bo'lsa rasm yuboring):\\n\\n<i>Bekor qilish uchun <b>⬅️ Asosiy menyu</b> tugmasini bosing.</i>`, {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
    });
});

// --- END CHIRCHIQ KOMPYUTER XIZMATLARI ACTIONS ---

bot.on("message", async (ctx) => {"""

if 'bot.on("message", async (ctx) => {' in content:
    content = content.replace('bot.on("message", async (ctx) => {', actions_code, 1)
    with open('telegram.ts', 'w') as f:
        f.write(content)
    print("Added bot actions")
else:
    print("Failed to find bot.on message")

