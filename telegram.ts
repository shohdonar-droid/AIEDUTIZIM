import { Telegraf } from "telegraf";
import { initializeApp, setLogLevel } from "firebase/app";
import {
  initializeFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  setDoc,
  deleteField,
  onSnapshot,
  getDoc,
  runTransaction,
  limit,
  orderBy,
} from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRotation } from "./src/lib/gemini";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
setLogLevel("error");

const APP_URL = (process.env.APP_URL || "https://aiedutizim.vercel.app").replace(/\/$/, "");

function mdToHtml(md: string): string {
  if (!md) return "";
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

// Simple initialization of Firebase Client outside of React
const rawConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
let firebaseApiKey = "";
let firebaseProjectId = "";

if (fs.existsSync(rawConfigPath)) {
  const firebaseConfigRaw = JSON.parse(fs.readFileSync(rawConfigPath, "utf8"));
  firebaseApiKey = firebaseConfigRaw.apiKey;
  firebaseProjectId = firebaseConfigRaw.projectId;
  const firebaseConfig = {
    apiKey: firebaseConfigRaw.apiKey,
    authDomain: firebaseConfigRaw.authDomain,
    projectId: firebaseConfigRaw.projectId,
    storageBucket: firebaseConfigRaw.storageBucket,
    messagingSenderId: firebaseConfigRaw.messagingSenderId,
    appId: firebaseConfigRaw.appId,
  };
  const app = initializeApp(firebaseConfig);
  db = initializeFirestore(
    app,
    { experimentalForceLongPolling: true },
    firebaseConfigRaw.firestoreDatabaseId,
  );
}

const botToken =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8602426313:AAEnX9khyPLZYFWrvvVRJqP5PRANqbD7i-I";
export const bot = new Telegraf(botToken);

export let telegramUsersCount = 0;

const adminIdsPath = path.join(process.cwd(), "admin_telegram_ids.json");

export function getAdminIds(): number[] {
  try {
    if (fs.existsSync(adminIdsPath)) {
      return JSON.parse(fs.readFileSync(adminIdsPath, "utf8"));
    }
  } catch (e) {}
  return [];
}

export function registerAdminId(id: number) {
  try {
    const list = getAdminIds();
    if (!list.includes(id)) {
      list.push(id);
      fs.writeFileSync(adminIdsPath, JSON.stringify(list), "utf8");
      console.log("[Telegram] Registered admin Telegram ID:", id);
    }
  } catch (e) {}
}

export async function notifyAdminsDirectly(text: string, options: any = {}) {
  const ids = getAdminIds();
  console.log("[Telegram] Notifying admin Telegram IDs:", ids);
  for (const adminId of ids) {
    try {
      const kb = await getKeyboard("admin", adminId, true);
      const fullOptions = {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: kb,
          resize_keyboard: true,
          ...options?.reply_markup
        },
        ...options
      };
      await bot.telegram.sendMessage(adminId, text, fullOptions).catch((err) => {
        console.error(`Direct notification failed for admin ${adminId}:`, err);
      });
    } catch (e) {}
  }
}

export function isTodayBirthday(birthDateStr?: string | null): boolean {
  if (!birthDateStr) return false;
  try {
    const today = new Date();
    const tDay = today.getDate();
    const tMonth = today.getMonth() + 1;
    
    let bDay = 0;
    let bMonth = 0;
    if (birthDateStr.includes("-")) {
      const parts = birthDateStr.split("-");
      bDay = parseInt(parts[2], 10);
      bMonth = parseInt(parts[1], 10);
    } else if (birthDateStr.includes(".")) {
      const parts = birthDateStr.split(".");
      bDay = parseInt(parts[0], 10);
      bMonth = parseInt(parts[1], 10);
    } else if (birthDateStr.includes("/")) {
      const parts = birthDateStr.split("/");
      bDay = parseInt(parts[1], 10);
      bMonth = parseInt(parts[0], 10);
    }
    
    return bDay === tDay && bMonth === tMonth;
  } catch (e) {
    return false;
  }
}

export function formatProfileInfo(uData: any, role: string, displayName: string, email: string): string {
  let profileMsg = "";
  const normRole = (role || "").toLowerCase();

  profileMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (normRole === "student") {
    profileMsg += `✍️ <b>F.I.SH:</b> <code>${uData?.displayName || displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🛡️ <b>Roli:</b> <code>Talaba</code>\n`;
    profileMsg += `🏢 <b>Yo'nalishi:</b> <code>${uData?.departmentName || uData?.direction || "Kiritilmagan"}</code>\n`;
    profileMsg += `👥 <b>Guruhi:</b> <code>${uData?.groupName || "Kiritilmagan"}</code>\n`;
    profileMsg += `📞 <b>Tel raqami:</b> <code>${uData?.phone || "Kiritilmagan"}</code>\n`;
    profileMsg += `📧 <b>Emaili:</b> <code>${uData?.email || email || "Kiritilmagan"}</code>\n`;
  } else if (normRole === "admin") {
    profileMsg += `✍️ <b>F.I.SH:</b> <code>${uData?.displayName || displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🛡️ <b>Roli:</b> <code>Administrator</code>\n`;
    profileMsg += `📧 <b>Emaili:</b> <code>${uData?.email || email || "Kiritilmagan"}</code>\n`;
  } else if (normRole === "subadmin") {
    profileMsg += `✍️ <b>F.I.SH:</b> <code>${uData?.displayName || displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🛡️ <b>Roli:</b> <code>Kichik Administrator</code>\n`;
    profileMsg += `📧 <b>Emaili:</b> <code>${uData?.email || email || "Kiritilmagan"}</code>\n`;
    if (uData?.phone) profileMsg += `📞 <b>Tel raqami:</b> <code>${uData.phone}</code>\n`;
  } else if (normRole === "teacher") {
    profileMsg += `🏫 <b>Tashkilot nomi:</b> <code>${uData?.displayName || displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🛡️ <b>Roli:</b> <code>Tashkilot</code>\n`;
    profileMsg += `📞 <b>Tel raqami:</b> <code>${uData?.phone || "Kiritilmagan"}</code>\n`;
    profileMsg += `📧 <b>Emaili:</b> <code>${uData?.email || email || "Kiritilmagan"}</code>\n`;
  } else if (normRole === "staff") {
    profileMsg += `✍️ <b>F.I.SH:</b> <code>${uData?.displayName || displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🏫 <b>Qaysi tashkilotga tegishli:</b> <code>${uData?.teacherName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🛡️ <b>Roli:</b> <code>Xodim</code>\n`;
    profileMsg += `📞 <b>Tel raqami:</b> <code>${uData?.phone || "Kiritilmagan"}</code>\n`;
    profileMsg += `📧 <b>Emaili:</b> <code>${uData?.email || email || "Kiritilmagan"}</code>\n`;
  } else {
    profileMsg += `✍️ <b>F.I.SH:</b> <code>${uData?.displayName || displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `🛡️ <b>Roli:</b> <code>${normRole.toUpperCase()}</code>\n`;
    profileMsg += `📧 <b>Emaili:</b> <code>${uData?.email || email || "Kiritilmagan"}</code>\n`;
    if (uData?.phone) profileMsg += `📞 <b>Tel raqami:</b> <code>${uData.phone}</code>\n`;
  }
  profileMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return profileMsg;
}

export async function fetchTelegramUsersCount() {
  const tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
  let list: number[] = [];
  try {
    if (fs.existsSync(tgUsersListPath)) {
      list = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
    }
  } catch (e) {}
  
  telegramUsersCount = list.length;

  if (db) {
    try {
      const snap = await getDocs(collection(db, "telegram_users"));
      snap.forEach((d) => {
        const idNum = Number(d.id);
        if (!isNaN(idNum) && idNum !== 0 && !list.includes(idNum)) {
          list.push(idNum);
        }
      });
      telegramUsersCount = list.length;
      try {
        fs.writeFileSync(tgUsersListPath, JSON.stringify(list), "utf8");
      } catch (err) {}
      console.log("[Telegram] Initialized telegramUsersCount from DB and cache:", telegramUsersCount);
    } catch (e) {
      console.error("[Telegram] Failed to fetch initial telegram users count from Firestore, using local count:", telegramUsersCount);
    }
  }
}

async function registerTelegramId(
  targetRegisterId: number,
  chatType: string = "private",
  chatTitle: string = "",
  fromData: any = {}
) {
  if (!targetRegisterId) return;
  const tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
  let userList: number[] = [];
  try {
    if (fs.existsSync(tgUsersListPath)) {
      userList = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
    }
  } catch (e) {}

  if (!userList.includes(targetRegisterId)) {
    userList.push(targetRegisterId);
    try {
      fs.writeFileSync(tgUsersListPath, JSON.stringify(userList), "utf8");
    } catch (err) {}
    telegramUsersCount = userList.length;
    console.log(`[Telegram] Registered new chat target ID: ${targetRegisterId}. Total: ${telegramUsersCount}`);
  }

  if (db) {
    try {
      const docRef = doc(db, "telegram_users", String(targetRegisterId));
      await setDoc(docRef, {
        telegramId: targetRegisterId,
        firstName: fromData?.first_name || "",
        lastName: fromData?.last_name || "",
        username: fromData?.username || "",
        type: chatType || "private",
        title: chatTitle || "",
        lastActive: new Date().toISOString(),
        isGroup: chatType === "group" || chatType === "supergroup" || targetRegisterId < 0
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.error("Failed to auto-register sender in Firestore:", e);
    }
  }
}

const pendingLogins = new Map<
  number,
  { step: string; email?: string; targetUserId?: string; targetMenu?: string }
>();

class PersistentMap<K, V> extends Map<K, V> {
  private filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, "utf8");
        const data = JSON.parse(fileContent);
        if (Array.isArray(data)) {
          for (const [key, val] of data) {
            const parsedKey = !isNaN(Number(key)) ? Number(key) : key;
            super.set(parsedKey as any, val);
          }
        }
        console.log(`[PersistentMap] Loaded ${this.size} keys from ${path.basename(this.filePath)}`);
      }
    } catch (err) {
      console.error(`[PersistentMap] Failed to load data from ${this.filePath}:`, err);
    }
  }

  private save() {
    try {
      const data = Array.from(this.entries());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error(`[PersistentMap] Failed to save data to ${this.filePath}:`, err);
    }
  }

  set(key: K, value: V): this {
    super.set(key, value);
    this.save();
    return this;
  }

  delete(key: K): boolean {
    const result = super.delete(key);
    this.save();
    return result;
  }

  clear() {
    super.clear();
    this.save();
  }
}

const authedUsers = new PersistentMap<
  number,
  {
    uid: string;
    displayName: string;
    role: string;
    email: string;
    docId?: string;
  }
>(path.join(process.cwd(), "telegram_local_cache.json"));

const aiAssistantActiveUsers = new PersistentMap<number, boolean>(
  path.join(process.cwd(), "telegram_ai_active.json")
);

const customMenuTexts = new PersistentMap<string, string>(
  path.join(process.cwd(), "telegram_custom_menus.json")
);

const requestHistory = new Map<number, number[]>();

// Rate limiting middleware: 20 requests per minute per user (exempts admins and teachers)
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();

  // If /start command is issued, reset rate limits and bypass restriction to cleanly reload
  const isStart =
    ctx.message &&
    "text" in ctx.message &&
    (ctx.message.text === "/start" || ctx.message.text.startsWith("/start"));
  if (isStart) {
    requestHistory.set(userId, [now]);
    return next();
  }

  // Retrieve authenticated state (including database check if needed)
  const authed = await getAuthedUser(userId);
  if (authed && (authed.role === "admin" || authed.role === "subadmin" || authed.role === "teacher")) {
    return next();
  }

  let timestamps = requestHistory.get(userId) || [];
  timestamps = timestamps.filter((t) => now - t < 60000); // 1 minute window

  if (timestamps.length >= 20) {
    return ctx.reply(
      "⚠️ Siz juda ko'p so'rov yubordingiz. Bot limitiga ko'ra, har bir foydalanuvchi 1 daqiqada ko'pi bilan 20 ta so'rov yuborishi mumkin. Iltimos, biroz kutib qayta urinib ko'ring.",
    );
  }

  timestamps.push(now);
  requestHistory.set(userId, timestamps);
  return next();
});

async function getKeyboard(
  role: string = "student",
  userId?: number,
  isAuthenticated: boolean = false,
) {
  let authed = isAuthenticated;
  let userRole = role;
  if (userId) {
    const user = await getAuthedUser(userId);
    if (user) {
      authed = true;
      userRole = user.role || role;
    }
  }

  const rows: any[][] = [];
  if (authed) {
    if (userRole === "admin" || userRole === "subadmin") {
      rows.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
      rows.push([{ text: "📢 E'lon yuborish" }, { text: `📊 Statistika (${telegramUsersCount})` }]);
      rows.push([{ text: "📥 Javob berilmaganlar" }, { text: "⚙️ Menyu sozlamalari" }]);
      rows.push([{ text: "🤖 AI yordamchi" }]);
      return rows;
    }
    rows.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
  } else {
    rows.push([{ text: "🔑 Kirish" }]);
  }

  rows.push([{ text: "🤖 AIEDUTIZIM haqida" }, { text: "📚 Kurslar" }]);
  rows.push([{ text: "🎮 Quizizz testlar" }, { text: "🏆 Sertifikatlar" }]);
  rows.push([{ text: "💬 Adminga murojaat" }, { text: "❓ Yordam" }]);
  rows.push([{ text: "🌐 Rasmiy sayt" }]);

  return rows;
}

async function getAuthedUser(userId: number) {
  if (authedUsers.has(userId)) {
    const cached = authedUsers.get(userId);
    if (cached) {
      if (cached.role === "admin" || cached.role === "subadmin") {
        registerAdminId(userId);
      }
      return cached;
    }
  }
  let authed = null;
  let queryAttempted = false;
  let querySuccess = false;
  if (db) {
    queryAttempted = true;
    try {
      // Use indexed queries only. Never do collection scan to save quota.
      let snap = await getDocs(
        query(collection(db, "users"), where("telegramId", "==", userId)),
      );
      
      if (snap.empty) {
        snap = await getDocs(
          query(collection(db, "users"), where("telegramId", "==", String(userId))),
        );
      }
      
      if (!snap.empty) {
        const uDoc = snap.docs[0];
        const uData = uDoc.data();
        let derivedRole = uData.role || "student";
        const emailLower = (uData.email || "").toLowerCase().trim();
        const loginLower = (uData.login || "").toLowerCase().trim();
        
        if (emailLower === "elyorbek@admin.uz" || loginLower === "uy_admin" || loginLower === "admin") {
          derivedRole = "admin";
        }

        authed = {
          uid: uData.uid,
          displayName: uData.displayName || uData.email,
          role: derivedRole,
          email: uData.email,
          docId: uDoc.id,
        };
      }
      querySuccess = true;
    } catch (e) {
      console.error("DB check auth error:", e);
      // Fallback: If DB query fails (such as quota exceeded), return cached user if we have one
      if (authedUsers.has(userId)) {
        const cached = authedUsers.get(userId);
        if (cached && (cached.role === "admin" || cached.role === "subadmin")) {
          registerAdminId(userId);
        }
        return cached;
      }
    }
  }
  if (!queryAttempted || querySuccess) {
    if (authed) {
      authedUsers.set(userId, authed);
      if (authed.role === "admin" || authed.role === "subadmin") {
        registerAdminId(userId);
      }
    } else {
      authedUsers.delete(userId);
    }
  }
  return authed;
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  // Clear any pending actions to "reload" bot state cleanly
  pendingLogins.delete(userId);
  // Do not delete authedUsers so they remain logged in on /start as requested!

  // Local cache file register for offline-first backup and real-time updates
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
      fs.writeFileSync(tgUsersListPath, JSON.stringify(userList), "utf8");
    } catch (err) {}
  }

  telegramUsersCount = userList.length;

  if (isNewUser) {
    const textDesc = `🎉 <b>Yangi a'zo qo'shildi!</b>\n` +
                     `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `👤 Ism: <b>${ctx.from.first_name || ""} ${ctx.from.last_name || ""}</b>\n` +
                     `🔗 Username: @${ctx.from.username || "yo'q"}\n` +
                     `🆔 Telegram ID: <code>${userId}</code>`;
    await notifyAdminsDirectly(textDesc);
  }

  // Save every user to telegram_users collection for broadcast purposes
  if (db) {
    try {
      const docRef = doc(db, "telegram_users", String(userId));
      const snap = await getDoc(docRef).catch(() => null);
      if (!snap || !snap.exists()) {
        await addDoc(collection(db, "admin_notifications"), {
          text: `Yangi xabar: Botimizga yangi a'zo qo'shildi!\n👤 Ism: ${ctx.from.first_name || ""} ${ctx.from.last_name || ""}\n🔗 Username: @${ctx.from.username || "yoq"}\n🆔 ID: ${userId}`,
          timestamp: serverTimestamp(),
        }).catch(() => {});
      }
      await setDoc(
        docRef,
        {
          telegramId: userId,
          firstName: ctx.from.first_name || "",
          lastName: ctx.from.last_name || "",
          username: ctx.from.username || "",
          lastActive: new Date().toISOString(),
        },
        { merge: true },
      ).catch(() => {});
    } catch (e) {
      console.error("Failed to save telegram user doc:", e);
    }
  }

  const authed = await getAuthedUser(userId);
  const role = authed ? authed.role : "student";

  // Deactivate AI assistant mode when launching start command
  aiAssistantActiveUsers.delete(userId);

  const greeting =
    `🤖 <b>Assalomu alaykum! AIEDUTIZIM Telegram botiga xush kelibsiz.</b>\n\n` +
    `🎓 <b>AIEDUTIZIM</b> — Sun'iy Intellekt Asosidagi Ta'lim Tizimi bo‘lib, talabalar, o‘qituvchilar va tashkilotlar uchun mo‘ljallangan zamonaviy raqamli ta'lim platformasidir.\n\n` +
    `Kerakli bo‘limni tanlang.`;

  ctx.reply(greeting, {
    parse_mode: "HTML",
    reply_markup: {
      keyboard: await getKeyboard(role, userId, !!authed),
      resize_keyboard: true,
    },
  });
});

bot.command("unanswered", async (ctx) => {
  await handleUnansweredRequest(ctx);
});

bot.command("javobsiz", async (ctx) => {
  await handleUnansweredRequest(ctx);
});

async function handleUnansweredRequest(ctx: any) {
  const userId = ctx.from.id;
  const authed = await getAuthedUser(userId);
  if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
    return ctx.reply("Sizda bu huquq yo'q.");
  }
  const loadingMsg = await ctx.reply("🔍 Javob berilmagan murojaatlar qidirilmoqda...");
  try {
    const qMessages = query(
      collection(db, "messages"),
      orderBy("timestamp", "desc"),
      limit(300)
    );
    const msgSnap = await getDocs(qMessages);
    const rawMsgs = msgSnap.docs.map(doc => ({ ...doc.data() as any, id: doc.id }));
    rawMsgs.sort((a: any, b: any) => {
      const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
      const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
      return tA - tB;
    });

    const latestConvMessage = new Map<string, any>();
    const partnerNames = new Map<string, string>();

    const isAdminMsg = (m: any) => 
      m.senderId === "SYSTEM_ADMIN" || 
      m.senderRole === "admin" || 
      m.senderRole === "subadmin";

    for (const m of rawMsgs) {
      let partnerId = "";
      let partnerName = "";
      if (isAdminMsg(m)) {
        partnerId = m.receiverId;
        partnerName = m.receiverName || "Foydalanuvchi";
      } else {
        partnerId = m.senderId;
        partnerName = m.senderName || "Foydalanuvchi";
      }

      if (partnerId && partnerId !== "SYSTEM_ADMIN") {
        latestConvMessage.set(partnerId, m);
        if (!isAdminMsg(m)) {
          partnerNames.set(partnerId, partnerName);
        } else if (partnerName && partnerName !== "Foydalanuvchi") {
          partnerNames.set(partnerId, partnerName);
        }
      }
    }

    const unansweredList: { partnerId: string; partnerName: string; text: string; timeStr: string }[] = [];

    for (const [partnerId, lastMsg] of latestConvMessage.entries()) {
      if (!isAdminMsg(lastMsg)) {
        const partnerName = partnerNames.get(partnerId) || "Foydalanuvchi";
        const date = lastMsg.timestamp?.toDate ? lastMsg.timestamp.toDate() : new Date();
        const timeStr = date.toLocaleDateString("uz-UZ") + " " + date.toLocaleTimeString("uz-UZ", { hour: '2-digit', minute: '2-digit' });
        unansweredList.push({
          partnerId,
          partnerName,
          text: lastMsg.text || "(Matnsiz)",
          timeStr
        });
      }
    }

    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

    if (unansweredList.length === 0) {
      return ctx.reply("🎉 <b>Ajoyib! Barcha murojaatlarga javob berilgan!</b>\n\nHech qanday javob berilmagan xabarlar topilmadi.", { parse_mode: "HTML" });
    }

    let text = `📥 <b>Javob berilmagan murojaatlar ro'yxati (${unansweredList.length} ta):</b>\n\n`;
    for (let i = 0; i < unansweredList.length; i++) {
      const item = unansweredList[i];
      text += `${i + 1}. 👤 <b>${item.partnerName}</b> (ID: <code>${item.partnerId}</code>)\n`;
      text += `🕒 <code>${item.timeStr}</code>\n`;
      text += `💬 <i>"${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}"</i>\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }
    text += `\n✍️ Javob yozish uchun quyidagi ro'yxatdan foydalanuvchini tanlang:`;

    const inline_keyboard: any[][] = [];
    for (const item of unansweredList.slice(0, 10)) {
      inline_keyboard.push([
        {
          text: `✍️ ${item.partnerName.substring(0, 25)}`,
          callback_data: `reply_${item.partnerId}`,
        }
      ]);
    }

    if (unansweredList.length > 10) {
      text += `\n\n📌 <i>Yana ${unansweredList.length - 10} ta javobsiz xabar bor, birinchi 10 tasi yuqorida ko'rsatilgan. To'liq ro'yxatni ko'rish yoki boshqa foydalanuvchi bilan yozishmalarni ko'rish uchun <code>/viewmsg_ID</code> ko'rinishida yuboring.</i>`;
    }

    return ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard
      }
    });
  } catch (err) {
    if (loadingMsg?.message_id) {
      await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});
    }
    console.error("Unanswered messages error:", err);
    return ctx.reply("Xatolik yuz berdi: " + (err as any).message);
  }
}

bot.command("login", (ctx) => {
  if (!db) return ctx.reply("Ma'lumotlar bazasi ulanmagan.");
  pendingLogins.set(ctx.from.id, { step: "email" });
  ctx.reply("Profilga kirish uchun loginingizni yoki emailingizni kiriting:");
});

bot.command("app", (ctx) => {
  ctx.reply(
    `AI Edu platformasini Telegram ichidan chiqmasdan to'liq ishlatish uchun quyidagi tugmani bosing va Miniapp-ga kiring:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Miniapp'ni ochish",
              web_app: { url: APP_URL },
            },
          ],
        ],
      },
    },
  );
});

bot.action("edit_menu_haqida", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "🤖 AIEDUTIZIM haqida" });
  await ctx.reply("✏️ \"🤖 AIEDUTIZIM haqida\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("edit_menu_kurslar", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "📚 Kurslar" });
  await ctx.reply("✏️ \"📚 Kurslar\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("edit_menu_quiz_test", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "🎮 Quizizz testlar" });
  await ctx.reply("✏️ \"🎮 Quizizz testlar\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("edit_menu_sertifikat", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "🏆 Sertifikatlar" });
  await ctx.reply("✏️ \"🏆 Sertifikatlar\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("edit_menu_murojaat", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "💬 Adminga murojaat" });
  await ctx.reply("✏️ \"💬 Adminga murojaat\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("edit_menu_yordam", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "❓ Yordam" });
  await ctx.reply("✏️ \"❓ Yordam\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("edit_menu_sayt", async (ctx) => {
  const userId = ctx.from.id;
  pendingLogins.set(userId, { step: "edit_menu_content", targetMenu: "🌐 Rasmiy sayt" });
  await ctx.reply("✏️ \"🌐 Rasmiy sayt\" menyusi uchun yangi matn yoki ma'lumotni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("logout", async (ctx) => {
  const userId = ctx.from.id;
  const authed = await getAuthedUser(userId);
  pendingLogins.delete(userId);
  if (authed && db) {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("telegramId", "==", userId)),
      );
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), {
          telegramId: deleteField(),
        });
      }
    } catch (e) {
      console.error("Logout error", e);
    }
  }
  authedUsers.delete(userId);
  aiAssistantActiveUsers.delete(userId);
  await ctx.reply("✅ Siz tizimdan muvaffaqiyatli chiqdingiz.", {
    reply_markup: {
      keyboard: await getKeyboard(undefined, userId, false),
      resize_keyboard: true,
    },
  });
  try {
    ctx.answerCbQuery();
  } catch (e) {}
});

bot.action(/reply_(.+)/, (ctx) => {
  const targetUserId = ctx.match[1];
  pendingLogins.set(ctx.from.id, {
    step: "reply_message",
    targetUserId,
    originalMessageId: ctx.callbackQuery?.message?.message_id,
    originalChatId: ctx.callbackQuery?.message?.chat?.id,
  } as any);
  ctx.reply(
    "Javob xabarini yuboring (bu unga Telegram va tizim orqali boradi):",
  );
  ctx.answerCbQuery();
});

bot.action(/viewmsg_(.+)/, async (ctx) => {
  const targetUserId = ctx.match[1];
  ctx.answerCbQuery();

  try {
    const adminUid = authedUsers.get(ctx.from.id)?.uid;
    if (!adminUid) return ctx.reply("Sizning profilingiz aniqlanmadi.");

    let msgs: any[] = [];
    const q1 = query(
      collection(db, "messages"),
      where("senderId", "==", targetUserId),
    );
    const snap1 = await getDocs(q1);
    msgs.push(...snap1.docs.map((d) => ({ ...d.data(), id: d.id })));

    const q2 = query(
      collection(db, "messages"),
      where("receiverId", "==", targetUserId),
    );
    const snap2 = await getDocs(q2);
    msgs.push(...snap2.docs.map((d) => ({ ...d.data(), id: d.id })));

    const seen = new Set();
    msgs = msgs
      .filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return (
          d.receiverId === adminUid ||
          d.receiverRole === "admin" ||
          d.senderId === adminUid ||
          d.senderRole === "admin"
        );
      })
      .sort(
        (a, b) =>
          (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0),
      );

    if (msgs.length === 0) {
      return ctx.reply("Xabarlar topilmadi.");
    }

    msgs = msgs.slice(-20); // last 20

    let text = `<b>${msgs[msgs.length - 1].senderName || "Foydalanuvchi"} bilan yozishmalar:</b>\n\n`;
    for (const m of msgs) {
      const roleName =
        m.senderId === adminUid || m.senderRole === "admin"
          ? "Siz"
          : m.senderName || "U";
      text += `👤 <b>${roleName}:</b> ${m.text || ""}\n`;
    }

    ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✍️ Javob yozish", callback_data: `reply_${targetUserId}` }],
        ],
      },
    });
  } catch (e) {
    ctx.reply("Xatolik: " + (e as any).message);
  }
});

// Filter deleted handling here

async function getSystemContextInfo(): Promise<string> {
  let studentsCount = 0;
  let teachersCount = 0;
  let staffCount = 0;
  let adminsCount = 0;
  let tgUsersCount = 0;
  let coursesListText = "Hozircha kurslar kiritilmagan.";
  
  if (db) {
    try {
      const snapUsers = await getDocs(collection(db, "users"));
      snapUsers.forEach((d) => {
        const uData = d.data();
        const r = uData.role;
        const emailLower = (uData.email || "").toLowerCase().trim();
        if (r === "admin" || emailLower === "elyorbek@admin.uz") {
          adminsCount++;
        } else if (r === "teacher") {
          teachersCount++;
        } else if (r === "staff") {
          staffCount++;
        } else if (r === "student") {
          studentsCount++;
        } else {
          studentsCount++;
        }
      });
      const snapTg = await getDocs(collection(db, "telegram_users"));
      tgUsersCount = snapTg.size;

      // Save to local cache
      const statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
      try {
        fs.writeFileSync(statsCachePath, JSON.stringify({
          adminsCount,
          teachersCount,
          staffCount,
          studentsCount,
          tgUsersCount
        }, null, 2), "utf8");
      } catch (err) {}
    } catch (e) {
      console.error("[ContextStats] Error reading statistics for context:", e);
      // fallback from cache
      const statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
      if (fs.existsSync(statsCachePath)) {
        try {
          const cachedStats = JSON.parse(fs.readFileSync(statsCachePath, "utf8"));
          adminsCount = cachedStats.adminsCount || 0;
          teachersCount = cachedStats.teachersCount || 0;
          staffCount = cachedStats.staffCount || 0;
          studentsCount = cachedStats.studentsCount || 0;
          tgUsersCount = cachedStats.tgUsersCount || 0;
        } catch (err) {}
      }
    }

    try {
      const cSnap = await getDocs(collection(db, "courses"));
      if (!cSnap.empty) {
        coursesListText = cSnap.docs.map(d => {
          const c: any = d.data();
          return `- ${c.title} (${c.category || "Dasturlash"}): ${c.description || "Tavsif yo'q"}`;
        }).join("\n");
      }
    } catch (e) {
      console.error("[ContextCourses] Error reading courses for context:", e);
    }
  }

  const totalUsers = adminsCount + teachersCount + staffCount + studentsCount;
  return `Tizimning joriy haqiqiy statistikasi va ma'lumotlari:
- Jami ro'yxatdan o'tgan foydalanuvchilar: ${totalUsers} ta
- Tizimdagi adminlar (Adminlar): ${adminsCount} ta (Bosh admin: Elyorbek)
- Tizimdagi tashkilotlar / o'quv markazlari (Teachers/Organizations): ${teachersCount} ta
- Tizimdagi o'qituvchilar va xodimlar (Staff): ${staffCount} ta
- Tizimdagi talabalar / o'quvchilar (Students): ${studentsCount} ta
- Telegram botimizdan faol foydalanayotgan a'zolar (start yuborganlar): ${tgUsersCount} ta

Platformadagi joriy fanlar / dars kurslari ro'yxati:
${coursesListText}`;
}

bot.on("message", async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const pending = pendingLogins.get(userId);
  const authed = await getAuthedUser(userId);

  // Auto-register current user or group chat to update telegramUsersCount and support broadcasts to groups
  const targetRegisterId = chatId || userId;
  if (targetRegisterId) {
    await registerTelegramId(
      targetRegisterId,
      chatType || "private",
      (ctx.chat as any)?.title || "",
      ctx.from || {}
    );
  }

  let userText = "";
  if ("text" in ctx.message) {
    userText = ctx.message.text;
  } else if ("caption" in ctx.message) {
    userText = ctx.message.caption || "[Media yuborildi]";
  } else {
    userText = "[Media yuborildi]";
  }

  // Broadcast step
  if (pending && pending.step === "broadcast_message") {
    pendingLogins.delete(userId);
    const m = ctx.message;
    ctx.reply(`E'lon tarqatish boshlandi (Guruhlar va shaxsiy foydalanuvchilarga)... Iltimos kuting.`);

    try {
      const tgUsersSnap = await getDocs(
        query(collection(db, "telegram_users")),
      );

      (async () => {
        let count = 0;
        
        // Find all unique user/group IDs from Firestore + local fallback cache
        const uniqueIds = new Set<number>();
        
        for (const uDoc of tgUsersSnap.docs) {
          const uData = uDoc.data();
          const docIdNum = Number(uDoc.id);
          const tgId = uData.telegramId ? Number(uData.telegramId) : (!isNaN(docIdNum) && docIdNum !== 0 ? docIdNum : null);
          if (tgId) {
            uniqueIds.add(tgId);
          }
        }

        try {
          const tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
          if (fs.existsSync(tgUsersListPath)) {
            const localList = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
            if (Array.isArray(localList)) {
              localList.forEach(id => {
                if (id) uniqueIds.add(Number(id));
              });
            }
          }
        } catch (e) {
          console.error("[Broadcast] Local file fallback reading error:", e);
        }

        for (const tgId of uniqueIds) {
          if (tgId && tgId !== userId) {
            try {
              if (m && m.message_id) {
                await bot.telegram.copyMessage(tgId, ctx.chat.id, m.message_id);
                count++;
              }
            } catch (copyErr: any) {
              console.error(`[Broadcast] Failed to send message to ${tgId}:`, copyErr?.message || copyErr);
            }
            // Delay to prevent being throttled by Telegram rate limits
            await new Promise((r) => setTimeout(r, 65));
          }
        }

        bot.telegram
          .sendMessage(
              userId,
              `📢 E'lon muvaffaqiyatli tarqatildi:\n\nJami ${count} ta foydalanuvchi/guruhga yuborildi.`,
            )
          .catch((e) => console.error(e));
      })();

      return;
    } catch (e) {
      return ctx.reply("E'lon yuborishda xatolik yuz berdi.");
    }
  }

  if (userText.startsWith("/")) return; // Ignore other commands

  const normText = userText.trim();

  if (
    normText === "📥 Javob berilmaganlar" ||
    normText === "📥 Javob berilmagan murojaatlar" ||
    normText.toLowerCase().includes("javob berilmaganlar")
  ) {
    await handleUnansweredRequest(ctx);
    return;
  }

  if (
    normText === "📊 Statistika" ||
    normText.startsWith("📊 Statistika") ||
    normText.toLowerCase().includes("statistika")
  ) {
    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
      return ctx.reply("Sizda bu huquq yo'q.");
    }
    const loadingMsg = await ctx.reply("📊 Statistika yuklanmoqda...");
    try {
      let totalDBUsers = 0;
      const rolesCount: Record<string, number> = {
        admin: 0,
        subadmin: 0,
        teacher: 0,
        student: 0,
        staff: 0,
        guest: 0
      };

      if (db) {
        const queryUsers = await getDocs(collection(db, "users"));
        queryUsers.forEach((doc) => {
          const u = doc.data();
          let role = (u.role || "student").toLowerCase().trim();
          const email = (u.email || "").toLowerCase().trim();
          const login = (u.login || "").toLowerCase().trim();
          
          if (role === "admin") {
            const isSuper = (email === "elyorbek@admin.uz" || login === "uy_admin" || login === "admin" || email === "elyorbek@gmail.com");
            if (!isSuper) {
              role = "subadmin";
            }
          }

          if (rolesCount[role] !== undefined) {
            rolesCount[role]++;
          } else {
            rolesCount[role] = 1;
          }
        });
        totalDBUsers = (rolesCount.admin || 0) + (rolesCount.subadmin || 0) + (rolesCount.teacher || 0) + (rolesCount.student || 0) + (rolesCount.staff || 0) + (rolesCount.guest || 0);
      }

      await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

      let statsMsg = `📊 <b>Joriy vaqt uchun Bot va Tizim Statistika:</b>\n\n`;
      statsMsg += `👥 <b>Tizimdagi jami foydalanuvchilar soni:</b> ${totalDBUsers}\n`;
      statsMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      statsMsg += `👑 <b>Bosh Adminlar (Super Admin):</b> ${rolesCount.admin}\n`;
      statsMsg += `🛡️ <b>Kichik Adminlar (Sub Admin):</b> ${rolesCount.subadmin}\n`;
      statsMsg += `🏫 <b>Tashkilotlar (O'qituvchi):</b> ${rolesCount.teacher}\n`;
      statsMsg += `🎓 <b>Talabalar:</b> ${rolesCount.student}\n`;
      statsMsg += `💼 <b>Xodimlar:</b> ${rolesCount.staff}\n`;
      if (rolesCount.guest > 0) {
        statsMsg += `👤 <b>Mehmonlar:</b> ${rolesCount.guest}\n`;
      }
      statsMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      statsMsg += `🤖 <b>Telegram bot a'zolari:</b> ${telegramUsersCount}\n`;
      statsMsg += `✨ <i>Barcha ma'lumotlar real vaqt rejimida ma'lumotlar bazasidan hisoblab chiqildi!</i>`;

      return ctx.reply(statsMsg, { parse_mode: "HTML" });
    } catch (err) {
      console.error("Statistics error:", err);
      return ctx.reply(
        `📊 <b>Statistika (Kesh rejimida):</b>\n\nBot foydalanuvchilari soni: ${telegramUsersCount}\n\nUlanishda xatolik yuz bergani sababli rollar keshdan o'qildi.`,
        { parse_mode: "HTML" }
      );
    }
  }

  if (normText === "⚙️ Menyu sozlamalari") {
    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
      return ctx.reply("Sizda bu huquq yo'q.");
    }
    return ctx.reply(
      "⚙️ <b>Menyu sozlamalari bo'limiga xush kelibsiz!</b>\n\nTegishli menyuni tanlab, uning foydalanuvchilarga ko'rinadigan matnini o'zgartirishingiz mumkin:",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🤖 AIEDUTIZIM haqida", callback_data: "edit_menu_haqida" }],
            [{ text: "📚 Kurslar", callback_data: "edit_menu_kurslar" }],
            [{ text: "🎮 Quizizz testlar", callback_data: "edit_menu_quiz_test" }],
            [{ text: "🏆 Sertifikatlar", callback_data: "edit_menu_sertifikat" }],
            [{ text: "💬 Adminga murojaat", callback_data: "edit_menu_murojaat" }],
            [{ text: "❓ Yordam", callback_data: "edit_menu_yordam" }],
            [{ text: "🌐 Rasmiy sayt", callback_data: "edit_menu_sayt" }]
          ]
        }
      }
    );
  }

  // Static menus check:
  if (normText === "🤖 AIEDUTIZIM haqida") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("🤖 AIEDUTIZIM haqida");
    return ctx.reply(
      customText || "AIEDUTIZIM — Sun'iy Intellekt Asosidagi Ta'lim Tizimi bo‘lib, talabalar, o‘qituvchilar va tashkilotlar uchun yaratilgan zamonaviy raqamli ta'lim platformasidir."
    );
  }

  if (normText === "📚 Kurslar") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("📚 Kurslar");
    return ctx.reply(
      customText || "Platformada modulli kurslar mavjud. Talabalar kurs materiallarini o‘rganishlari, topshiriqlarni bajarishlari va natijalarini kuzatishlari mumkin."
    );
  }

  if (normText === "🎮 Quizizz testlar") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("🎮 Quizizz testlar");
    return ctx.reply(
      customText || "Interaktiv va qiziqarli testlar orqali bilimlarni tekshirish imkoniyati mavjud. Eng yuqori natija ko‘rsatgan ishtirokchilar sertifikat bilan taqdirlanadi."
    );
  }

  if (normText === "🏆 Sertifikatlar") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("🏆 Sertifikatlar");
    return ctx.reply(
      customText || "Barcha sertifikatlar QR-kod va unikal ID bilan himoyalangan. Sertifikat haqiqiyligini platforma orqali tekshirish mumkin."
    );
  }

  if (normText === "❓ Yordam") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("❓ Yordam");
    return ctx.reply(
      customText || "Botdan foydalanish bo‘yicha ma'lumotlar va tez-tez beriladigan savollarga javoblar."
    );
  }

  if (normText === "🌐 Rasmiy sayt") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("🌐 Rasmiy sayt");
    return ctx.reply(
      customText || "🔗 https://aiedutizim.vercel.app"
    );
  }

  if (normText === "🤖 AI yordamchi") {
    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
      return ctx.reply(
        "⚠️ <b>Kechirasiz, sun'iy intellekt yordamchisi faqatgina Tizim Administratori profili uchun ochiq.</b>",
        { parse_mode: "HTML" }
      );
    }
    aiAssistantActiveUsers.set(userId, true);
    return ctx.reply(
      "🤖 AI yordamchi faollashtirildi.\n\nEndi istalgan savolingizni yozishingiz mumkin. Men sun'iy intellekt yordamida javob beraman."
    );
  }

  if (normText === "💬 Adminga murojaat") {
    aiAssistantActiveUsers.delete(userId);
    const customText = customMenuTexts.get("💬 Adminga murojaat");
    pendingLogins.set(userId, { step: "admin_message" });
    return ctx.reply(
      customText || "Savol, taklif yoki muammolaringiz bo‘lsa xabaringizni yuboring. Administrator siz bilan tez orada bog‘lanadi."
    );
  }

  if (normText === "🔑 Kirish" || normText === "Kirish") {
    aiAssistantActiveUsers.delete(userId);
    if (!db) return ctx.reply("Ma'lumotlar bazasi ulanmagan.");
    pendingLogins.set(userId, { step: "email" });
    return ctx.reply(
      "Profilga kirish uchun loginingizni yoki emailingizni kiriting:\n\n(Misol uchun: login nomi yoki to'liq email manzilni yuborishingiz mumkin)",
    );
  }

  if (normText === "👤 Profil") {
    aiAssistantActiveUsers.delete(userId);
    if (!authed) {
      return ctx.reply(
        "❌ Siz tizimga kirmagansiz.\n\nIltimos, \"🔑 Kirish\" tugmasi orqali tizimga kiring."
      );
    }

    let dbDoc = null;
    if (authed.docId) {
      try {
        const res = await getDoc(doc(db, "users", authed.docId));
        if (res.exists()) dbDoc = res;
      } catch (e) {}
    }
    if (!dbDoc) {
      try {
        const res = await getDoc(doc(db, 'users', authed.uid));
        if (res.exists()) dbDoc = res;
      } catch (e) {}
    }
    if (!dbDoc && db) {
      try {
        const q = query(collection(db, "users"), where("uid", "==", authed.uid));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          dbDoc = qSnap.docs[0];
        }
      } catch (e) {}
    }

    let uData = dbDoc ? dbDoc.data() : null;
    const roleText = uData?.role || authed.role || "student";
    let roleDisplay = "Mehmon";
    if (roleText === "admin") roleDisplay = "Administrator";
    else if (roleText === "teacher") roleDisplay = "Tashkilot";
    else if (roleText === "staff") roleDisplay = "Xodim";
    else if (roleText === "student") roleDisplay = "Talaba";

    let profileMsg = `👤 <b>Profil ma'lumotlari:</b>\n\n`;
    profileMsg += `• <b>F.I.Sh.:</b> <code>${uData?.displayName || authed.displayName || "Kiritilmagan"}</code>\n`;
    profileMsg += `• <b>Email:</b> <code>${uData?.email || authed.email || "Kiritilmagan"}</code>\n`;
    profileMsg += `• <b>Telefon:</b> <code>${uData?.phone || uData?.phoneNumber || "Kiritilmagan"}</code>\n`;
    profileMsg += `• <b>Tashkilot:</b> <code>${uData?.teacherName || uData?.departmentName || "Kiritilmagan"}</code>\n`;
    profileMsg += `• <b>Lavozim yoki rol:</b> <code>${roleDisplay}</code>\n`;
    profileMsg += `• <b>Profil rasmi:</b> <code>${uData?.photoURL || uData?.avatar || "Kiritilmagan"}</code>`;

    return ctx.reply(profileMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📱 Tizimga kirish", web_app: { url: "https://aiedutizim.vercel.app/login" } }],
          [{ text: "🚪 Chiqish", callback_data: "logout" }]
        ]
      }
    });
  }

  if (normText === "🚪 Chiqish" || normText === "🚪 Tizimdan chiqish" || normText === "Chiqish") {
    pendingLogins.delete(userId);
    if (authed && db) {
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where("telegramId", "==", userId)),
        );
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), {
            telegramId: deleteField(),
          });
        }
      } catch (e) {
        console.error("Logout error", e);
      }
    }
    authedUsers.delete(userId);
    aiAssistantActiveUsers.delete(userId);
    return ctx.reply("✅ Siz tizimdan muvaffaqiyatli chiqdingiz.", {
      reply_markup: {
        keyboard: await getKeyboard(undefined, userId, false),
        resize_keyboard: true,
      },
    });
  }

  if (normText === "⚙️ Bot holati") {
    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin" && authed.role !== "teacher")) {
      return ctx.reply("Sizda bu huquq yo'q.");
    }
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;

    let botStatus =
      `⚙️ <b>BOTNİNG ISHLASH HOLATI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🖥 <b>Tizim ma'lumotlari:</b>\n` +
      `   ⚡️ Server: <code>Google Cloud Run (Node.js)</code>\n` +
      `   ⏳ Ishlash vaqti (Uptime): <code>${hours}h ${minutes}m ${seconds}s</code>\n` +
      `   📦 Kutubxona: <code>Telegraf v4.16.3</code>\n\n` +
      `🧠 <b>AI Xizmati:</b>\n` +
      `   🤖 Model: <code>Gemini 2.0 Flash / 1.5 Pro</code>\n` +
      `   🛡 Rate-Limit: <code>Admin/O'qituvchilar cheksiz, Talabalar daqiqasiga 20 ta so'rov</code>\n\n` +
      `🗄 <b>Baza holati (Firestore):</b>\n` +
      `   🔹 ProjectID: <code>${firebaseProjectId || "aiedutizim-default"}</code>\n` +
      `   📶 Aloqa: <code>Muvaffaqiyatli (Ulandi)</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 <i>Bot holati mukammal ishlamoqda. Yangi so'rovlarni qabul qilishga tayyor!</i>`;
    return ctx.reply(botStatus, { parse_mode: "HTML" });
  }

  if (
    normText === "📢 E'lon berish" ||
    normText === "📢 Umumiy e'lon yuborish" ||
    normText === "📢 E'lon yuborish" ||
    normText === "E'lon yuborish"
  ) {
    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin" && authed.role !== "teacher")) {
      return ctx.reply("Sizda bu huquq yo'q.");
    }
    pendingLogins.set(userId, { step: "broadcast_message" });
    return ctx.reply("Yuboriladigan e'lon matni, rasm yoki videoni yuboring:");
  }

  // Handle remaining logic
  if (pending) {
    if (pending.step === "reply_message") {
      const uName = authed ? authed.displayName : "Admin";
      const senderId = authed ? authed.uid : "SYSTEM_ADMIN";

      pendingLogins.delete(userId);

      try {
        await addDoc(collection(db, "messages"), {
          senderId: senderId,
          senderName: uName + " (Admin / Telegram)",
          senderRole: "admin",
          receiverId: pending.targetUserId,
          text: userText,
          timestamp: serverTimestamp(),
          isRead: false,
          fromTelegram: true,
        });

        const origMsgId = (pending as any).originalMessageId;
        const origChatId = (pending as any).originalChatId;
        if (origMsgId && origChatId) {
          try {
            await ctx.telegram.editMessageReplyMarkup(origChatId, origMsgId, undefined, { inline_keyboard: [] });
          } catch (editErr) {
            console.error("Failed to edit message reply markup:", editErr);
          }
        }

        return ctx.reply("Javobingiz muvaffaqiyatli yuborildi.");
      } catch (e) {
        return ctx.reply("Xatolik yuz berdi: " + (e as any).message);
      }
    } else if (pending.step === "email") {
      let emailInput = userText.trim();

      if (!emailInput.includes("@")) {
        try {
          const ADMIN_LOGIN = "Elyorbek";
          const ADMIN_EMAIL = "elyorbek@admin.uz";
          const queryLogin = emailInput.toLowerCase().trim();

          if (queryLogin === ADMIN_LOGIN.toLowerCase()) {
            emailInput = ADMIN_EMAIL;
          } else {
            // Attempt to find user by login field using indexed query
            const loginQuery = query(collection(db, "users"), where("login", "==", emailInput));
            const snap = await getDocs(loginQuery);
            if (!snap.empty) {
              emailInput = snap.docs[0].data().email;
            } else {
              // Fallback to searching common email formats (student, teacher)
              emailInput = queryLogin + "@student.uz";
            }
          }
        } catch (e) {
          emailInput = emailInput.toLowerCase().trim() + "@student.uz";
        }
      }

      pending.email = emailInput;
      pending.step = "password";
      pendingLogins.set(userId, pending);
      return ctx.reply("Endi parolingizni kiriting:");
    } else if (pending.step === "admin_message") {
      const uName = authed
        ? authed.displayName
        : ctx.from.first_name || "Foydalanuvchi";
      const senderId = authed ? authed.uid : `tg_${userId}`;
      const senderRole = authed ? authed.role : "bot_user";

      if (db) {
        try {
          await addDoc(collection(db, "messages"), {
            senderId: senderId,
            senderName: uName + " (Telegram)",
            receiverId: "SYSTEM_ADMIN",
            receiverRole: "admin",
            text: userText,
            timestamp: serverTimestamp(),
            isRead: false,
            fromTelegram: true,
          });

          if (!authed) {
            await getDocs(
              query(collection(db, "users"), where("uid", "==", senderId)),
            ).then(async (snap) => {
              if (snap.empty) {
                await setDoc(doc(db, "users", senderId), {
                  uid: senderId,
                  displayName: uName + " (Telegram)",
                  role: senderRole,
                  telegramId: userId,
                });
              }
            });
          }
        } catch (e) {
          console.error("Failed to add admin message", e);
        }
      }
      pendingLogins.delete(userId);
      return ctx.reply(
        "Murojaatingiz imkon qadar tezroq ko‘rib chiqiladi va sizga javob beriladi.",
      );
    } else if (pending.step === "edit_menu_content") {
      const targetMenu = (pending as any).targetMenu!;
      pendingLogins.delete(userId);
      customMenuTexts.set(targetMenu, userText);
      return ctx.reply(
        `✅ <b>"${targetMenu}"</b> menyusi matni muvaffaqiyatli va tezroq yangilandi!\n\nEndi foydalanuvchilar ushbu menyuni bosganda shu ma'lumotni olishadi.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            keyboard: await getKeyboard("admin", userId, true),
            resize_keyboard: true,
          }
        }
      );
    } else if (pending.step === "password") {
      let email = pending.email!;
      const password = userText;
      pendingLogins.delete(userId);

      ctx.reply("Ma'lumotlar tekshirilmoqda, iltimos kuting...");

      try {
        let authRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          },
        );
        let authData = await authRes.json();

        // Auto-retry fallback for @teacher.uz (Tashkilot or Xodim) accounts if default @student.uz sign-in failed
        if (authData.error && email.toLowerCase().endsWith("@student.uz")) {
          const teacherFallbackEmail = email.split("@")[0] + "@teacher.uz";
          try {
            const retryRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: teacherFallbackEmail, password, returnSecureToken: true }),
              },
            );
            const retryData = await retryRes.json();
            if (retryData && !retryData.error) {
              authData = retryData;
              email = teacherFallbackEmail;
            }
          } catch (retryErr) {}
        }

        if (authData.error) {
          // Fallback: If this is the default admin attempting to log in for the first time, sign them up
          if (email.toLowerCase() === "elyorbek@admin.uz" && password === "1104aA") {
            try {
              const signUpRes = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password, returnSecureToken: true }),
                }
              );
              const signUpData = await signUpRes.json();
              if (signUpData && !signUpData.error) {
                authData = signUpData;
              }
            } catch (signUpErr) {}
          }
        }

        if (authData.error) {
          return ctx.reply(
            "Email (Login) yoki parol noto'g'ri. Qaytadan urinish uchun ishchi oynada 🔑 Kirish ni bering.",
          );
        }

        const uid = authData.localId;

        let displayName = email;
        let role = "student";
        let departmentName = "Kiritilmagan";
        let groupName = "Kiritilmagan";

        try {
          let docId = "";
          let uData: any = null;

          // 1. Try finding by Document ID
          try {
            const mainDocSnap = await getDoc(doc(db, "users", uid));
            if (mainDocSnap.exists()) {
              docId = mainDocSnap.id;
              uData = mainDocSnap.data();
            }
          } catch (e) {}

          // 2. If not found, try querying by 'uid' field
          if (!uData) {
            try {
              const uQuery = query(
                collection(db, "users"),
                where("uid", "==", uid),
              );
              const snap = await getDocs(uQuery);
              if (!snap.empty) {
                docId = snap.docs[0].id;
                uData = snap.docs[0].data();
              }
            } catch (e) {}
          }

          // 3. If not found, try querying by 'email' field
          if (!uData) {
            try {
              const emailQuery = query(
                collection(db, "users"),
                where("email", "==", email),
              );
              const snapEmail = await getDocs(emailQuery);
              if (!snapEmail.empty) {
                docId = snapEmail.docs[0].id;
                uData = snapEmail.docs[0].data();
              }
            } catch (e) {}
          }

          // 4. If not found, try querying by 'login' field
          if (!uData) {
            try {
              const parts = email.split("@");
              if (parts.length > 0) {
                const loginVal = parts[0];
                const loginQuery = query(
                  collection(db, "users"),
                  where("login", "==", loginVal),
                );
                const snapLogin = await getDocs(loginQuery);
                if (!snapLogin.empty) {
                  docId = snapLogin.docs[0].id;
                  uData = snapLogin.docs[0].data();
                }
              }
            } catch (e) {}
          }

          // Try identifying the user document from uid first
          try {
            const uQuery = query(
              collection(db, "users"),
              where("uid", "==", uid),
            );
            const snap = await getDocs(uQuery);
            if (!snap.empty) {
              docId = snap.docs[0].id;
              uData = snap.docs[0].data();
            } else {
              // If not found by uid field, try document ID directly
              const docRef = doc(db, "users", uid);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                docId = docSnap.id;
                uData = docSnap.data();
              }
            }
          } catch (e) {}

          // Role fallback logic if no user data found
          if (!uData) {
            if (email.toLowerCase() === "elyorbek@admin.uz") {
              const adminDocParams = {
                uid: uid,
                displayName: `Elyorbek (Admin)`,
                firstName: "Elyorbek",
                lastName: "Admin",
                email: email,
                login: "Elyorbek",
                role: "admin",
                createdAt: serverTimestamp(),
                telegramId: userId,
              };
              try {
                await setDoc(doc(db, "users", uid), adminDocParams);
                docId = uid;
                uData = adminDocParams;
              } catch (err) {
                console.error("Failed to create admin doc:", err);
              }
            }
          }

          if (uData) {
            displayName = uData.displayName || email;
            role = uData.role || "student";
            departmentName = uData.departmentName || "Kiritilmagan";
            groupName = uData.groupName || "Kiritilmagan";

            // Enforce admin privileges for Elyorbek regardless of underlying doc contents
            if (email.toLowerCase().trim() === "elyorbek@admin.uz") {
              role = "admin";
            }

            try {
              await updateDoc(doc(db, "users", docId), { 
                telegramId: userId,
                role: role 
              });
            } catch (e) {}
          }

          const encodedCreds = encodeURIComponent(
            Buffer.from(`${email}:${password}`).toString("base64"),
          );
          const autoLoginUrl = `${APP_URL}/login?auto=${encodedCreds}`;

          let replyMsg = `✅ <b>Akkauntingiz muvaffaqiyatli ulandi!</b>\n\n`;
          replyMsg += formatProfileInfo(uData, role, displayName, email);

          replyMsg += `\n\nEndi "Tizimga kirish" tugmasi orqali o'z profilingizga to'g'ridan to'g'ri o'tishingiz mumkin!`;

          authedUsers.set(userId, { uid, displayName, role, email, docId });

          const userBirthDate = uData ? uData.birthDate : null;
          if (isTodayBirthday(userBirthDate)) {
            const bdayGreetings = 
              `🎉✨ <b>TUG'ILGAN KUNINGIZ BILAN TABRIKLAYMIZ!</b> ✨🎉\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `Hurmatli <b>${displayName}</b>! 🎂\n\n` +
              `Sizni bugungi tavallud ayomingiz bilan chin qalbimizdan muborakbod etamiz! 🌸\n` +
              `Sizga sihat-salomatlik, baxt-saodat, uzoq umr va o'qish hamda ish faoliyatingizda ulkan muvaffaqiyatlar tilaymiz! 🌟\n\n` +
              `Tizimimiz siz bilan birga ekanligidan mamnun va faxrlanadi! 😊🎈\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━`;
            ctx.reply(bdayGreetings, { parse_mode: "HTML" }).catch(() => {});
          }

          await addDoc(collection(db, "admin_notifications"), {
            text: `Yangi tizimga ulanish (Telegram orqali):\n👤 F.I.SH: ${displayName}\n🛡 Profil: ${role.toUpperCase()}\n📧 Email: ${email}`,
            timestamp: serverTimestamp(),
          });

          ctx.reply(replyMsg, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📱 Tizimga kirish", web_app: { url: "https://aiedutizim.vercel.app/login" } }],
              ],
            },
          });

          ctx.reply("Asosiy menyu yangilandi:", {
            reply_markup: {
              keyboard: await getKeyboard(role, userId, true),
              resize_keyboard: true,
            },
          });
        } catch (e) {
          console.error("Login verification post-auth checking error:", e);
          const encodedCreds = encodeURIComponent(
            Buffer.from(`${email}:${password}`).toString("base64"),
          );
          const autoLoginUrl = `${APP_URL}/login?auto=${encodedCreds}`;

          let derivedRole = "student";
          if (email.toLowerCase().includes("@admin")) {
            derivedRole = "admin";
          } else if (email.toLowerCase().includes("@teacher")) {
            derivedRole = "teacher";
          }

          authedUsers.set(userId, {
            uid,
            displayName: email,
            role: derivedRole,
            email,
            docId: "",
          });

          ctx.reply(
            `✅ Akkauntingiz muvaffaqiyatli ulandi!\n\n👤 Email: ${email}\n🛡 Profil: ${derivedRole.toUpperCase()}\n\nEndi "Tizimga kirish" tugmasi orqali o'z profilingizga to'g'ridan to'g'ri o'tishingiz mumkin!`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "📱 Tizimga kirish",
                      web_app: { url: "https://aiedutizim.vercel.app/login" },
                    },
                  ],
                ],
              },
            },
          );

          ctx.reply("Asosiy menyu yangilandi:", {
            reply_markup: {
              keyboard: await getKeyboard(derivedRole, userId, true),
              resize_keyboard: true,
            },
          });
        }
      } catch (err: any) {
        ctx.reply("Xatolik yuz berdi: " + err.message);
      }
      return;
    }
  }

  const lowered = userText.toLowerCase().trim();
  if (authed && (authed.role === "admin" || authed.role === "subadmin" || authed.role === "teacher")) {
    if (lowered === "yordamchi" || lowered === "shogird") {
      return ctx.reply("Labbay, Ustoz! Sizga qanday yordam bera olaman?");
    }
  }

  // Not in login flow, handle as AI chat prompt
  let promptMsg: any = null;
  let intervalId: any = null;
  try {
    try {
      promptMsg = await ctx.reply("Bajarilmoqda...");
    } catch (e) {}

    let dotCount = 3;
    if (promptMsg) {
      intervalId = setInterval(async () => {
        dotCount = (dotCount % 3) + 1; // 1, 2, 3
        const dots = ".".repeat(dotCount);
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            promptMsg.message_id,
            undefined,
            `Bajarilmoqda${dots}`,
          );
        } catch (e) {}
      }, 1000);
    }

    const uName = authed
      ? authed.displayName
      : ctx.from.first_name || "Foydalanuvchi";
    const isAdmin = authed
      ? authed.role === "admin" || authed.role === "teacher"
      : false;

    // Get system statistics and courses to embed contextually
    const sysContext = await getSystemContextInfo();

    let functionResponses: any[] = [];
    let lastFunctionCall: any = null;
    let loopCount = 0;
    let finalReply = "";

    while (loopCount < 3) {
      loopCount++;
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: loopCount === 1 ? userText : "",
          history: [],
          userName: uName,
          isAdminMode: isAdmin,
          systemContext: sysContext,
          functionResponses:
            functionResponses.length > 0 ? functionResponses : undefined,
          lastFunctionCall: lastFunctionCall || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.isFunctionCall) {
          const fnName = data.functionCall.name;
          const fnArgs = data.functionCall.args;
          lastFunctionCall = data.functionCall;
          let executionResult = "";

          try {
            if (fnName === "getSystemStats") {
              let studentsCount = 0;
              let teachersCount = 0;
              let staffCount = 0;
              let adminsCount = 0;
              let tgUsersCount = 0;
              try {
                const snapUsers = await getDocs(collection(db, "users"));
                snapUsers.forEach((d) => {
                  const uData = d.data();
                  const r = uData.role;
                  const emailLower = (uData.email || "").toLowerCase().trim();
                  if (r === "admin" || emailLower === "elyorbek@admin.uz") {
                    adminsCount++;
                  } else if (r === "teacher") {
                    teachersCount++;
                  } else if (r === "staff") {
                    staffCount++;
                  } else if (r === "student") {
                    studentsCount++;
                  } else {
                    studentsCount++;
                  }
                });
                const snapTg = await getDocs(collection(db, "telegram_users"));
                tgUsersCount = snapTg.size;
              } catch (e) {
                const statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
                if (fs.existsSync(statsCachePath)) {
                  try {
                    const cachedStats = JSON.parse(fs.readFileSync(statsCachePath, "utf8"));
                    adminsCount = cachedStats.adminsCount || 0;
                    teachersCount = cachedStats.teachersCount || 0;
                    staffCount = cachedStats.staffCount || 0;
                    studentsCount = cachedStats.studentsCount || 0;
                    tgUsersCount = cachedStats.tgUsersCount || 0;
                  } catch (err) {}
                }
              }
              const totalUsers = adminsCount + teachersCount + staffCount + studentsCount;
              executionResult = `Tizim foydalanuvchilari statistikasi (Bazada):\n` +
                `- Adminlar: ${adminsCount} ta\n` +
                `- Tashkilotlar: ${teachersCount} ta\n` +
                `- Xodimlar: ${staffCount} ta\n` +
                `- Talabalar: ${studentsCount} ta\n` +
                `- Jami foydalanuvchilar: ${totalUsers} ta\n\n` +
                `- Telegram bot faol foydalanuvchilari (start bosganlar): ${tgUsersCount} ta.`;
            } else if (fnName === "getUsersList") {
              let q: any = collection(db, "users");
              if (fnArgs.role) {
                q = query(q, where("role", "==", fnArgs.role));
              }
              const usersSnap = await getDocs(q);
              const list = usersSnap.docs
                .map((d) => {
                  const dt: any = d.data();
                  return dt.displayName + " (" + dt.role + ")";
                })
                .join(", ");
              executionResult = `Topilgan foydalanuvchilar ro'yxati: ${list || "Topilmadi"}`;
            } else if (fnName === "checkBirthdays") {
              const todayStr = new Date()
                .toISOString()
                .split("T")[0]
                .substring(5);
              const usersSnap = await getDocs(collection(db, "users"));
              const p: any[] = usersSnap.docs
                .map((d) => d.data())
                .filter(
                  (dt: any) => dt.birthDate && dt.birthDate.endsWith(todayStr),
                );
              if (p.length > 0) {
                executionResult =
                  "Bugun tug'ilgan kuni bo'lganlar: " +
                  p.map((dt) => dt.displayName).join(", ");
              } else {
                executionResult =
                  "Bugun tug'ilgan kuni bo'lgan foydalanuvchilar topilmadi.";
              }
            } else if (fnName === "publishTest") {
              const t = (fnArgs.testTitle || "").toLowerCase();
              const testsSnap = await getDocs(collection(db, "tests"));
              const target = testsSnap.docs.find((d) => {
                const ddata = d.data();
                return (
                  (ddata.title && ddata.title.toLowerCase().includes(t)) ||
                  (ddata.courseName &&
                    ddata.courseName.toLowerCase().includes(t))
                );
              });
              if (target) {
                await updateDoc(doc(db, "tests", target.id), {
                  isPublished: true,
                });
                executionResult = `"${target.data().title}" nomli test muvaffaqiyatli publish qilindi!`;
              } else {
                executionResult = `"${fnArgs.testTitle}" mavzusidagi test topilmadi.`;
              }
            } else if (fnName === "createQuizizz") {
              const pin = Math.floor(
                100000 + Math.random() * 900000,
              ).toString();

              let questions: any[] = [];

              try {
                const pText = fnArgs.context
                  ? `Matn: ${fnArgs.context}. Mavzu: ${fnArgs.title}. 5 ta JSON test yarat.`
                  : `Mavzu: ${fnArgs.title}. 5 ta JSON test yarat.`;

                const genRes = await generateContentWithRotation({
                  model: "gemini-3.5-flash",
                  contents: [{ role: "user", parts: [{ text: pText }] }],
                  config: {
                    systemInstruction:
                      'Faqat JSON formatda array qaytar:\n[{ "question": "savol", "options": ["A","B","C","D"], "correctAnswer": "To\'g\'ri javob matni" }]. Boshqa text qo\'shma.',
                    temperature: 0.7,
                  },
                });
                try {
                  let txt = genRes.text || "[]";
                  txt = txt
                    .replace(/```json/g, "")
                    .replace(/```/g, "")
                    .trim();
                  questions = JSON.parse(txt);
                } catch (e) {}
              } catch (e) {}

              await addDoc(collection(db, "quiz_history"), {
                teacherId: authed ? authed.uid : "ADMIN",
                pin,
                title: fnArgs.title,
                context: fnArgs.context || "",
                questions,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              executionResult = `"${fnArgs.title}" mavzusida PIN: ${pin} va ${questions.length} ta savol bo'lgan quiz yaratildi.`;
            } else if (fnName === "createCourse") {
              const courseRef = await addDoc(collection(db, "courses"), {
                title: fnArgs.title,
                description: fnArgs.description || "Ushbu fan bo'yicha darslar va materiallar turkumi.",
                category: fnArgs.category || "Dasturlash",
                createdAt: serverTimestamp(),
                creatorId: authed ? authed.uid : "ADMIN",
                lessons: [],
                quizzes: []
              });
              executionResult = `"${fnArgs.title}" nomli yangi kurs/fan muvaffaqiyatli yaratildi. Hujjat ID: ${courseRef.id}`;
            } else if (fnName === "addSystemUser") {
              const genUid = "ai_" + Math.floor(100000 + Math.random() * 900000).toString();
              await setDoc(doc(db, "users", genUid), {
                uid: genUid,
                displayName: fnArgs.displayName,
                email: fnArgs.email,
                password: fnArgs.password,
                role: fnArgs.role || "student",
                createdAt: serverTimestamp(),
              });
              executionResult = `Yangi foydalanuvchi muvaffaqiyatli qo'shildi!\n👤 Ismi: ${fnArgs.displayName}\n📧 Emaili: ${fnArgs.email}\n🔑 Paroli: ${fnArgs.password}\n🛡 Roli: ${(fnArgs.role || "student").toUpperCase()}`;
            } else if (fnName === "createSystemNotification") {
              const uSnap = await getDocs(collection(db, "users"));
              let sentCount = 0;
              for (const uDoc of uSnap.docs) {
                await addDoc(collection(db, "messages"), {
                  text: fnArgs.text,
                  senderId: "SYSTEM_ADMIN",
                  senderName: "Tizim ma'muriyati",
                  receiverId: uDoc.id,
                  createdAt: serverTimestamp(),
                  isRead: false
                });
                sentCount++;
              }
              await addDoc(collection(db, "admin_notifications"), {
                text: `Tizimda e'lon tarqatildi: "${fnArgs.text}" (${sentCount} ta foydalanuvchiga)`,
                timestamp: serverTimestamp()
              });
              executionResult = `Barcha ${sentCount} ta foydalanuvchiga "${fnArgs.text}" mavzusidagi e'lon muvaffaqiyatli yuborildi.`;
            } else if (fnName === "getCoursesList") {
              const cSnap = await getDocs(collection(db, "courses"));
              const list = cSnap.docs.map(d => {
                const c: any = d.data();
                return `- **${c.title}** (${c.category || "Boshqa"}): ${c.description || "Tavsif yo'q"}`;
              }).join("\n");
              executionResult = `Platformadagi darslar/kurslar ro'yxati:\n${list || "Hozircha fanlar kiritilmagan."}`;
            } else {
              executionResult = "Noma'lum funksiya chaqirildi.";
            }
          } catch (e: any) {
            executionResult = "Funksiya bajarilishida xatolik: " + e.message;
          }

          functionResponses = [{ name: fnName, response: executionResult }];
          continue; // proceed next
        } else {
          finalReply = data.reply;
          break;
        }
      } else {
        const data = await res.json().catch(() => null);
        finalReply = data?.error || "AI javob qaytara olmadi.";
        break;
      }
    }

    if (intervalId) {
      clearInterval(intervalId);
    }
    if (promptMsg) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, promptMsg.message_id);
      } catch (e) {}
    }

    if (finalReply) {
      if (isAdmin) {
        const borderReply =
          `👑 <b>USTOZ - ADMIN TIZIMI AI YORDAMCHISI</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `${mdToHtml(finalReply)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💡 <i>Tizim administratorlari uchun cheksiz AI xizmati faollashtirilgan.</i>`;
        await ctx.reply(borderReply, { parse_mode: "HTML" });
      } else {
        await ctx.reply(mdToHtml(finalReply), { parse_mode: "HTML" });
      }
    }
  } catch (e) {
    if (intervalId) {
      clearInterval(intervalId);
    }
    if (promptMsg) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, promptMsg.message_id);
      } catch (e) {}
    }
    ctx.reply("Server bilan bog'lanishda xatolik yuz berdi.");
  }
});

bot.on("my_chat_member", async (ctx) => {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const chatTitle = (ctx.chat as any)?.title || "";
  console.log(`[Telegram] Bot added to/updated in chat ${chatId} of type ${chatType}`);
  if (chatId) {
    await registerTelegramId(chatId, chatType, chatTitle, {
      first_name: ctx.from?.first_name || "",
      last_name: ctx.from?.last_name || "",
      username: ctx.from?.username || "",
    });
  }
});

bot.on("new_chat_members", async (ctx) => {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const chatTitle = (ctx.chat as any)?.title || "";
  console.log(`[Telegram] New members in chat ${chatId}`);
  if (chatId) {
    await registerTelegramId(chatId, chatType, chatTitle, {
      first_name: ctx.from?.first_name || "",
      last_name: ctx.from?.last_name || "",
      username: ctx.from?.username || "",
    });
  }
});

bot.on("group_chat_created", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    await registerTelegramId(chatId, "group", (ctx.chat as any)?.title || "", {});
  }
});

bot.on("supergroup_chat_created", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    await registerTelegramId(chatId, "supergroup", (ctx.chat as any)?.title || "", {});
  }
});

export function launchBot() {
  fetchTelegramUsersCount();
  bot.telegram
    .setMyDescription(
      "**Assalomu alaykum! AIEDUTIZIM platformasining telegram botiga xush kelibsiz!**\n\n🎓 AIEDUTIZIM — tashkilotlar, o‘qituvchilar va talabalar uchun mo‘ljallangan yagona markazlashgan raqamli ta'lim platformasi bo‘lib, zamonaviy ta'lim jarayonlarini samarali boshqarish imkonini beradi.",
    )
    .catch((e) => console.error("Could not set bot description", e));

  if (db) {
    const startupTime = Date.now();

    // Listen for admin notifications
    let isAdminLogsInit = false;
    onSnapshot(query(collection(db, "admin_notifications"), orderBy("timestamp", "desc"), limit(10)), async (snapshot) => {
      if (!isAdminLogsInit) {
        isAdminLogsInit = true;
        return;
      }
      const newChanges = snapshot
        .docChanges()
        .filter((c) => c.type === "added");
      for (const change of newChanges) {
        const data = change.doc.data();
        const msgTime = data.timestamp?.toMillis
          ? data.timestamp.toMillis()
          : Date.now();
        // Ignore if older than 5s from startup
        if (msgTime < startupTime - 5000) continue;

        try {
          let alreadyProcessed = false;
          await runTransaction(db, async (transaction) => {
            const docRef = doc(db, "admin_notifications", change.doc.id);
            const s = await transaction.get(docRef);
            if (!s.exists() || s.data().processedByBot) {
              alreadyProcessed = true;
              return;
            }
            transaction.update(docRef, { processedByBot: true });
          });
          if (alreadyProcessed) continue;

          const adminSnap = await getDocs(
            query(collection(db, "users"), where("role", "==", "admin")),
          );
          adminSnap.forEach((d) => {
            const uData = d.data();
            if (uData.telegramId) {
              bot.telegram
                .sendMessage(
                  Number(uData.telegramId),
                  `🚨 Tizim xabari:\n\n${data.text}`,
                )
                .catch(() => {});
            }
          });
        } catch (e) {}
      }
    }, (error) => {
      console.warn("[Telegram] admin_notifications snapshot listener error (quota/network):", error.message || error);
    });

    // Listen for new messages targeting tg users
    let isInit = false;
    onSnapshot(query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(20)), async (snapshot) => {
      console.log(
        `TG onSnapshot triggered. isInit:`,
        isInit,
        "docChanges:",
        snapshot.docChanges().length,
      );
      if (!isInit) {
        isInit = true;
        return;
      }
      const newChanges = snapshot
        .docChanges()
        .filter((c) => c.type === "added");
      for (const change of newChanges) {
        const mData = change.doc.data();
        const msgTime = mData.timestamp?.toMillis
          ? mData.timestamp.toMillis()
          : Date.now();
        if (msgTime < startupTime - 5000) continue; // safety net for old messages
        console.log("New message to process:", mData);
        if (mData.senderId !== mData.receiverId) {
          try {
            let alreadyProcessed = false;
            await runTransaction(db, async (transaction) => {
              const docRef = doc(db, "messages", change.doc.id);
              const s = await transaction.get(docRef);
              if (!s.exists() || s.data().processedByBot) {
                alreadyProcessed = true;
                return;
              }
              transaction.update(docRef, { processedByBot: true });
            });
            if (alreadyProcessed) continue;

            let recipients: any[] = [];
            if (mData.receiverRole === "admin" || mData.receiverId === "SYSTEM_ADMIN") {
              // Load from local file-based admin IDs cache for maximum resilience
              const localAdminIds = getAdminIds();
              for (const aId of localAdminIds) {
                recipients.push({ telegramId: aId, role: "admin" });
              }

              // Try database snap as fallback/overlay if possible
              try {
                const adminSnap = await getDocs(
                  query(collection(db, "users"), where("role", "==", "admin")),
                );
                adminSnap.forEach((d) => {
                  const data = d.data();
                  if (data.telegramId) {
                    const idNum = Number(data.telegramId);
                    if (!localAdminIds.includes(idNum) && !recipients.some(x => x.telegramId === idNum)) {
                      recipients.push(data);
                    }
                  }
                });
              } catch (e) {
                console.warn("[Telegram] users query error (using local fallback is fine):", e);
              }
            } else if (
              mData.receiverId &&
              mData.receiverId !== "SYSTEM_ADMIN"
            ) {
              if (mData.receiverId.startsWith("tg_")) {
                const tgIdStr = mData.receiverId.replace("tg_", "");
                recipients.push({
                  telegramId: Number(tgIdStr),
                  role: "student",
                });
              } else {
                const uSnap = await getDoc(doc(db, "users", mData.receiverId));
                if (uSnap.exists()) recipients.push(uSnap.data());
              }
            }

            for (const uData of recipients) {
              if (uData.telegramId) {
                const tgId = Number(uData.telegramId);
                let senderDetails = "";
                if (mData.senderName) {
                  senderDetails = ` (${mData.senderName})`;
                }

                let opts: any = {};
                let messageText = "";
                if (uData.role === "admin" || uData.role === "teacher") {
                  opts.reply_markup = {
                    inline_keyboard: [
                      [
                        {
                          text: "✍️ Javob yozish",
                          callback_data: `reply_${mData.senderId}`,
                        },
                      ],
                    ],
                  };
                  messageText = `📨 Yangi xabar${senderDetails}:\n\n${mData.text}`;
                } else {
                  messageText = `📨 Sizga Admindan xabar keldi:\n\n${mData.text}`;
                }
                bot.telegram
                  .sendMessage(tgId, messageText, opts)
                  .catch((e) => console.error("TG MSG: ", e));
              }
            }
          } catch (e) {
            console.error("Error sending TG msg", e);
          }
        }
      }
    }, (error) => {
      console.warn("[Telegram] messages snapshot listener error (quota/network):", error.message || error);
    });

    // Listen for new published tests
    let testIsInit = false;
    onSnapshot(query(collection(db, "tests"), orderBy("createdAt", "desc"), limit(10)), async (snapshot) => {
      if (!testIsInit) {
        testIsInit = true;
        return;
      }
      const newChanges = snapshot
        .docChanges()
        .filter((c) => c.type === "added");
      for (const change of newChanges) {
        const tData = change.doc.data();
        if (tData.isPublished) {
          try {
            let alreadyProcessed = false;
            await runTransaction(db, async (transaction) => {
              const docRef = doc(db, "tests", change.doc.id);
              const s = await transaction.get(docRef);
              if (!s.exists() || s.data().processedByBot) {
                alreadyProcessed = true;
                return;
              }
              transaction.update(docRef, { processedByBot: true });
            });
            if (alreadyProcessed) continue;
            const uQuery = query(
              collection(db, "users"),
              where("role", "==", "student"),
            );
            const allStudentsSnap = await getDocs(uQuery);
            allStudentsSnap.forEach((userDoc) => {
              const uData = userDoc.data();
              if (uData.telegramId) {
                const isMatched =
                  (tData.groupIds && tData.groupIds.includes(uData.groupId)) ||
                  (tData.departmentIds &&
                    tData.departmentIds.includes(uData.departmentId));
                if (isMatched) {
                  bot.telegram
                    .sendMessage(
                      Number(uData.telegramId),
                      `📝 Sizning guruhingiz/yo'nalishingiz uchun yangi test(topshiriq) yuklandi: "${tData.title}". Tizimga kirib ishlashingiz mumkin!`,
                    )
                    .catch((e) => console.error("TG MSG: ", e));
                }
              }
            });
          } catch (e) {
            console.error("Test notification error:", e);
          }
        }
      }
    }, (error) => {
      console.warn("[Telegram] tests snapshot listener error (quota/network):", error.message || error);
    });

    // Certificate listener
    let certIsInit = false;
    onSnapshot(query(collection(db, "certificates"), orderBy("createdAt", "desc"), limit(10)), async (snapshot) => {
      if (!certIsInit) {
        certIsInit = true;
        return;
      }
      const newChanges = snapshot
        .docChanges()
        .filter((c) => c.type === "added");
      for (const change of newChanges) {
        const cert = change.doc.data();
        if (cert.studentId && cert.studentName) {
          try {
            let alreadyProcessed = false;
            await runTransaction(db, async (transaction) => {
              const docRef = doc(db, "certificates", change.doc.id);
              const s = await transaction.get(docRef);
              if (!s.exists() || s.data().processedByBot) {
                alreadyProcessed = true;
                return;
              }
              transaction.update(docRef, { processedByBot: true });
            });
            if (alreadyProcessed) continue;
            const uSnap = await getDoc(doc(db, "users", cert.studentId));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              if (uData.telegramId) {
                const msg = `🎉 Tabriklaymiz, ${uData.displayName}!!!\n\nSiz "${cert.courseName || cert.title}" bo'yicha muvaffaqiyatli o'tib, yangi sertifikatni qo'lga kiritdingiz! 🏆\n\nBu sizning tinimsiz mehnatingiz va izlanishlaringiz samarasidir. Tizimga kirib "Sertifikatlar" bo'limidan maxsus sertifikatingizni ko'rib olishingiz mumkin.`;
                bot.telegram
                  .sendMessage(Number(uData.telegramId), msg)
                  .catch((e) => console.error("TG MSG: ", e));
              }
            }
          } catch (err) {}
        }
      }
    }, (error) => {
      console.warn("[Telegram] certificates snapshot listener error (quota/network):", error.message || error);
    });

    // Birthday auto-check once every 24h
    const checkBirthdaysTimer = () => {
      const todayStr = new Date().toISOString().split("T")[0].substring(5); // MM-DD
      getDocs(collection(db, "users"))
        .then((snap) => {
          snap.forEach((d) => {
            const dt = d.data();
            if (
              dt.telegramId &&
              dt.birthDate &&
              dt.birthDate.endsWith(todayStr)
            ) {
              if (dt.lastBirthdayGreeting !== todayStr) {
                updateDoc(doc(db, "users", d.id), {
                  lastBirthdayGreeting: todayStr,
                });
                const bMsg = `🎂 Tug'ilgan kuningiz muborak bo'lsin, ${dt.displayName}!\n\nAIEDUTIZIM jamoasi sizga mustahkam sog'liq, bitmas-tuganmas g'ayrat va o'quv ishlaringizda ulkan yutuqlar tilaydi! Har doim eng yuqori marralarga erishib yuring! 🎉 Omad yor bo'lsin!`;
                bot.telegram
                  .sendMessage(Number(dt.telegramId), bMsg)
                  .catch((e) => console.error("TG MSG: ", e));
              }
            }
          });
        })
        .catch(() => {});
    };
    checkBirthdaysTimer();
    setInterval(checkBirthdaysTimer, 24 * 60 * 60 * 1000); // Check once a day
  }

  // Telegram bot launcher
  bot
    .launch()
    .then(() => {
      console.log("Telegram bot is running...");
      bot.telegram
        .setChatMenuButton({
          menuButton: {
            type: "web_app",
            text: "📱 Tizimga kirish",
            web_app: { url: "https://aiedutizim.vercel.app/login" },
          },
        })
        .catch((e) => console.error("Could not set menu button", e));

      // One-time broadcast of restart & new version info to all registered telegram bot users
      if (db) {
        const checkFile = path.join(process.cwd(), "telegram_broadcast_restart_done.json");
        if (!fs.existsSync(checkFile)) {
          getDocs(collection(db, "telegram_users"))
            .then(async (snap) => {
              console.log(`[Broadcast] Found ${snap.size} telegram users to notify about the new restart and version.`);
              const userDocs = snap.docs;
              const broadcastText =
                `🚀 <b>YANGI VERSIYA ISHGA TUSHIRILDI!</b>\n\n` +
                `AIEDUTIZIM platformasining Telegram boti muvaffaqiyatli tarzda qayta ishga tushirildi va eng so'nggi yangilanishlar bilan yangi versiyasi foydalanishga topshirildi.\n\n` +
                `🤖 <b>Nimalar o'zgardi va yaxshilandi?</b>\n` +
                `• ⚡️ <b>Eng so'nggi Sun'iy Intellekt (AI):</b> Endilikda bot barcha foydalanuvchilarning tizim haqidagi hamda o'zlari qiziqtirgan istalgan savollariga ham eng aqlli <b>Gemini 3.5-Flash</b> modeli yordamida tezkor va mukammal javob qaytaradi!\n` +
                `• 👑 <b>Admin buyruqlari kengaytirildi:</b> Tizim ma'murlari (Adminlar va O'qituvchilar) endilikda bot orqali bevosita yangi dars/kurs yaratish (<i>createCourse</i>), yangi xodimlarni va talabalarni qo'shish (<i>addSystemUser</i>) va hamda barcha foydalanuvchilarga bildirishnoma tarqatish kabi tizim boshqaruvi buyruqlarini bevosita botning o'ziga yuklangan admin imkoniyatlari orqali bajara oladi!\n` +
                `• 📊 <b>Statistika va Barqarorlik:</b> Ma'lumotlar bazasi yuklamasini kamaytiruvchi va limitlar tugaganda ham barqaror ishlashni ta'minlovchi mustahkam kesh & xizmat algoritmi integratsiya qilindi.\n\n` +
                `💡 <i>Yangi versiyani faollashtirish va menyularingizni yangilash uchun hoziroq /start buyrug'ini yuboring!</i>`;

              for (let i = 0; i < userDocs.length; i++) {
                const uDoc = userDocs[i];
                const userId = Number(uDoc.id);
                if (!isNaN(userId) && userId > 0) {
                  try {
                    await bot.telegram.sendMessage(userId, broadcastText, {
                      parse_mode: "HTML"
                    });
                    console.log(`[Broadcast] Successfully sent restart notice to user: ${userId}`);
                  } catch (sendErr) {
                    console.error(`[Broadcast] Failed to send restart notice to ${userId}:`, sendErr);
                  }
                  // Safe rate limiting delay of 100ms
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }
              }
              fs.writeFileSync(checkFile, JSON.stringify({ completedAt: new Date().toISOString() }, null, 2), "utf8");
              console.log("[Broadcast] One-time restart notification process completed.");
            })
            .catch((err) => {
              console.error("[Broadcast] Failed to read telegram_users collection for restart notice:", err);
            });
        }
      }
    })
    .catch((err: any) => {
      if (err?.response?.error_code === 409) {
        console.log("Telegram bot conflict (409): already running. Ignoring.");
      } else {
        console.log("Telegram bot error:", err);
      }
    });
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
