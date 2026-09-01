const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const regex = /return ctx\.reply\([\s\S]*?bot\.on\("contact",/m;

const replacement = `return ctx.reply("Siz 1 daqiqa ichida ko'p so'rov yubordingiz. Iltimos, biroz kuting va qayta urinib ko'ring.");
  }

  timestamps.push(now);
  requestHistory.set(userId, timestamps);
  
  return next();
});

export async function getKeyboard(
  role: string = "student",
  userId?: number,
  isAuthenticated: boolean = false,
) {
  let authed = isAuthenticated;
  let userRole = role;

  if (userId && isAuthenticated !== false) {
    const adminIds = getAdminIds();
    if (adminIds.includes(userId)) {
      authed = true;
      userRole = "admin";
    } else {
      const user = await getAuthedUser(userId);
      if (user) {
        authed = true;
        userRole = user.role || role;
      }
    }
  }

  const userHeader = [
    [{ text: "💻 CHIRCHIQ KOMPYUTER XIZMATLARI" }],
    [{ text: "🎓 Mening topshiriqlarim" }],
    [{ text: "👤 Profil" }, { text: "💬 Adminga murojaat" }],
    [{ text: "🤖 Xizmatlar" }, { text: "💰 Bonus olish" }],
    [{ text: "💰 Balans" }, { text: "🌐 Rasmiy sayt" }]
  ];

  if (authed && (userRole === "admin" || userRole === "subadmin")) {
    const adminIds = getAdminIds();
    const isPrimary = adminIds.length === 0 || adminIds[0] === userId;

    return [
      [{ text: "💻 CHIRCHIQ KOMPYUTER XIZMATLARI" }],
      [{ text: "🎓 Mening topshiriqlarim" }, { text: "👤 Profil" }],
      [{ text: "🤖 Xizmatlar" }, { text: "💬 Savol-javob" }],
      [{ text: "💵 Balans to'ldirish (Admin)" }],
      [{ text: "📢 E'lon yuborish" }, { text: \`📊 Statistika (\${telegramUsersCount})\` }],
      isPrimary 
        ? [{ text: "📥 Javob berilmaganlar" }, { text: "💰 Narxlar sozlamalari" }]
        : [{ text: "📥 Javob berilmaganlar" }],
      [{ text: "🌐 Rasmiy sayt" }]
    ];
  }

  return userHeader;
}

export async function getAiAssistantKeyboard(userId?: number) {
  const adminIds = getAdminIds();
  const isAdmin = userId ? adminIds.includes(userId) : false;

  const rows = [
    [{ text: "🤖 Xizmatlar" }],
    [{ text: "📊 Slayd yaratish" }, { text: "📄 Kurs ishi yaratish" }],
    [{ text: "💎 Pro slayd" }, { text: "💎 Pro kurs ishi" }],
    [{ text: "📝 Test yaratish" }, { text: "🌐 Tarjimon" }],
    [{ text: "📄 Obektivka yaratish" }],
    [{ text: "⬅️ Asosiy menyu" }]
  ];
  return rows;
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const startPayload = ctx.message.text.split(" ")[1];

  pendingLogins.delete(userId);
  aiAssistantActiveUsers.delete(userId);
  aiServiceStates.delete(userId);

  let isNewUser = false;
  const tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
  let userList: number[] = [];
  try {
    if (fs.existsSync(tgUsersListPath)) {
      userList = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
    }
  } catch (e) {}

  if (!userList.includes(userId)) {
    userList.push(userId);
    isNewUser = true;
    try {
      const contentStr = JSON.stringify(userList);
      fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
    } catch (err) {}
  }
  telegramUsersCount = userList.length;

  if (isNewUser) {
    const textDesc = \`🎉 <b>Yangi a'zo qo'shildi!</b>\\n\` +
                     \`━━━━━━━━━━━━━━━━━━━━━━━━━\\n\` +
                     \`👤 Ism: <b>\${ctx.from.first_name || ""} \${ctx.from.last_name || ""}</b>\\n\` +
                     \`🔗 Username: @\${ctx.from.username || "yo'q"}\\n\` +
                     \`🆔 Telegram ID: <code>\${userId}</code>\`;
    await notifyAdminsDirectly(textDesc);
  }

  const authed = await getAuthedUser(userId);
  const isAdmin = getAdminIds().includes(userId) || (authed && (authed.role === "admin" || authed.role === "subadmin"));

  if (isAdmin) {
    const greeting =
      \`🤖 <b>Assalomu alaykum Administrator!</b>\\n\\n\` +
      \`AIEDUTIZIM boshqaruv paneliga xush kelibsiz. Kerakli menyuni tanlang:\`;
    return ctx.reply(greeting, {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getKeyboard("admin", userId, true),
        resize_keyboard: true,
      },
    });
  }

  let hasPhone = false;
  if (db) {
    try {
      const usersRef = collection(db, "users");
      let q = query(usersRef, where("telegramId", "==", userId));
      let snap = await getDocs(q);
      if (snap.empty) {
        q = query(usersRef, where("telegramId", "==", String(userId)));
        snap = await getDocs(q);
      }
      if (!snap.empty) {
        const uData = snap.docs[0].data();
        if (uData.phone || uData.phoneNumber) {
          hasPhone = true;
        }
      }
    } catch (e) {}
  }

  const NEW_GREETING_TEXT = \`🤖 <b>AIEDUTIZIM — ta’lim uchun AI yordamchingiz!</b>\\n\\n\` +
\`🎓 Semestr imtihonlariga tayyorlaning!\\n\` +
\`📚 Kurs ishini yarating\\n\` +
\`📝 Test va topshiriqlar bilan ishlang\\n\` +
\`📊 Zamonaviy slayd va taqdimotlar tayyorlang\\n\` +
\`🌐 Matnlarni tarjima qiling\\n\` +
\`📄 Obektivka yarating\\n\\n\` +
\`⚡ Barchasi — bitta botda, tez va qulay!\\n\\n\` +
\`🌐 www.aide.uz\\n\` +
\`🤖 @AIEDUTIZIM_bot\\n\` +
\`💬 Savollar va yordam: @aiedutizimchat\\n\\n\` +
\`🚀 AIEDUTIZIM — ta’limni sun’iy intellekt bilan osonlashtiring!\`;

  if (hasPhone) {
    return ctx.reply(NEW_GREETING_TEXT + "\\n\\nKerakli bo'limni tanlang:", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getKeyboard("bot_user", userId, true),
        resize_keyboard: true,
      },
    });
  }

  let referrerId = undefined;
  if (startPayload && startPayload.startsWith("ref_")) {
    referrerId = startPayload.replace("ref_", "");
  }

  pendingLogins.set(userId, { step: "await_contact", referrerId });

  return ctx.reply(NEW_GREETING_TEXT + \`\\n\\n<i>Botdan foydalanish va ro'yxatdan o'tish uchun iltimos, pastdagi <b>"📱 Kontaktni yuborish"</b> tugmasini bosing:</i>\`, {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: [
          [{ text: "📱 Kontaktni yuborish", request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
  });
});

bot.on("contact",`;

code = code.replace(regex, replacement);
fs.writeFileSync('telegram.ts', code);
console.log("Restored successfully!");
