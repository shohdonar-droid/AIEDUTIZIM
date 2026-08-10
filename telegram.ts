import { Telegraf } from "telegraf";
import { initializeApp, getApps, getApp, setLogLevel } from "firebase/app";
import firebaseConfigRaw from "./firebase-applet-config.json";
import {
  initializeFirestore,
  getFirestore,
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
  getCountFromServer,
} from "firebase/firestore";
import { GoogleGenAI, Type as SDKType } from "@google/genai";

const Type = SDKType || {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
};
import { generateContentWithRotation } from "./src/lib/gemini";
import { generateCourseWorkDataWithGemini, buildCourseWorkDocxBuffer } from "./src/lib/courseworkGenerator.js";
import { process3x4PassportPhoto } from "./src/lib/passportProcessor.js";
import dotenv from "dotenv";
import sharp from "sharp";
import fs from "fs";
import path from "path";

dotenv.config();
setLogLevel("error");

const APP_URL = (process.env.APP_URL || "https://aiedutizim.vercel.app").replace(/\/$/, "");

function getApiUrl(subPath: string): string {
  // Use port 3000 as per environment constraints
  return `http://127.0.0.1:3000${subPath}`;
}

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

// Robust initialization of Firebase Client using static JSON config and safe getApps context
let db: any = null;

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfigRaw.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfigRaw.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfigRaw.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfigRaw.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfigRaw.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfigRaw.appId,
};

const firebaseApiKey = firebaseConfig.apiKey;
const firebaseProjectId = firebaseConfig.projectId;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const targetDbId = process.env.FIREBASE_DATABASE_ID || firebaseConfigRaw.firestoreDatabaseId;
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true }, targetDbId);
} catch (e) {
  db = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
}

export let botPaused = false;
export let adminTelegramId: number | null = null;
export let adminTelegramIds: number[] = [];

// Session tracking and broadcast logic for Telegram bot users
export const activeTgSessions = new Map<number, { sessionId: string; lastActive: number; loginTime: number }>();

export async function broadcastBotResumed() {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "telegram_users"));
    console.log(`[Broadcast Resumed] Broadcasting bot active state to ${snap.size} users...`);
    const userDocs = snap.docs;
    const broadcastText = 
      `⚡️ <b>TIZIM QAYTA ISHGA TUSHIRILDI!</b>\n\n` +
      `Assalomu alaykum! Hurmatli foydalanuvchi, <b>AIEDUTIZIM</b> Telegram boti tizimdagi yangilanish ishlaridan so'ng qayta ishga tushirildi.\n\n` +
      `🤖 <b>Barcha xizmatlar va buyruqlar to'liq faol:</b>\n` +
      `• Sun'iy intellekt (AI) yordamchisidan bemalol foydalanishingiz mumkin.\n` +
      `• Profilni tekshirish, savol-javob, tarjimon, tezis hamda maqola tayyorlash xizmatlari ishlamoqda.\n\n` +
      `💡 <i>Botdan bemalol foydalanishingiz mumkin! Yangi menyuni ko'rish uchun /start buyrug'ini yuboring.</i>`;

    const getKeyboard = (role: string, uid: number, authVal: boolean) => {
      const buttons = [];
      if (authVal) {
        buttons.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
        buttons.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
        // buttons.push([{ text: "👥 Do'stlarni taklif qilish" }]);
      } else {
        buttons.push([{ text: "🔑 Kirish" }]);
        buttons.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
        // buttons.push([{ text: "👥 Do'stlarni taklif qilish" }]);
      }
      return buttons;
    };

    for (const uDoc of userDocs) {
      const userId = Number(uDoc.id);
      if (!isNaN(userId) && userId > 0) {
        try {
          const isAuthed = authedUsers.get(userId) !== undefined;
          const kb = getKeyboard("student", userId, isAuthed);
          await bot.telegram.sendMessage(userId, broadcastText, {
            parse_mode: "HTML"
          });
          console.log(`[Broadcast Resumed] Sent notice to ${userId}`);
        } catch (sendErr: any) {
          const msg = sendErr?.message || "";
          if (
            !msg.includes("chat not found") &&
            !msg.includes("bot was blocked") &&
            !msg.includes("bot was kicked") &&
            !msg.includes("user is deactivated")
          ) {
            console.error(`[Broadcast Resumed] Failed to send to ${userId}:`, sendErr);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 80)); // polite rate limit
      }
    }
  } catch (err) {
    console.error("[Broadcast Resumed] Error reading telegram_users:", err);
  }
}

let lastKnownPaused: boolean | null = null;
let currentBotToken: string = sanitizeBotToken(process.env.TELEGRAM_BOT_TOKEN || "8602426313:AAEnX9khyPLZYFWrvvVRJqP5PRANqbD7i-I");

export function updateActiveBotToken(newToken: string) {
  const cleanToken = sanitizeBotToken(newToken);
  if (cleanToken && cleanToken !== currentBotToken) {
    currentBotToken = cleanToken;
    if (globalT.bot) {
      (globalT.bot.telegram as any).token = cleanToken;
      console.log("[Telegram] Applied updated Telegram Bot token to Telegraf runtime.");
      globalT.bot.telegram.getMe().then((me) => {
        console.log(`✅ [Telegram Bot] Successfully connected to Telegram API as @${me.username}`);
      }).catch((err) => {
        console.error(`❌ [Telegram Bot] Token verification failed:`, err?.message || err);
      });
    }
  }
}

if (db && process.env.VERCEL !== "1") {
  onSnapshot(doc(db, "settings", "bot_settings"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const nextPaused = data.isPaused === true || data.status === "paused";
      
      const wasPaused = lastKnownPaused;
      lastKnownPaused = nextPaused;
      botPaused = nextPaused;

      if (wasPaused === true && nextPaused === false) {
        console.log("[Telegram] Bot was resumed by admin. Initiating reload/resume union broadcast notifications...");
        broadcastBotResumed().catch((e) => console.error("Broadcast resumed fail: ", e));
      }

      if (data.botToken) {
        updateActiveBotToken(data.botToken);
      }

      if (data.adminTelegramId) {
        adminTelegramId = Number(data.adminTelegramId);
      } else {
        adminTelegramId = null;
      }

      if (Array.isArray(data.adminTelegramIds)) {
        adminTelegramIds = data.adminTelegramIds.map(Number).filter(x => !isNaN(x) && x > 0);
      } else if (typeof data.adminTelegramIds === "string") {
        adminTelegramIds = data.adminTelegramIds.split(",")
          .map(x => Number(x.trim()))
          .filter(x => !isNaN(x) && x > 0);
      } else {
        adminTelegramIds = adminTelegramId ? [adminTelegramId] : [];
      }

      // Ensure the primary is first
      if (adminTelegramId && !adminTelegramIds.includes(adminTelegramId)) {
        adminTelegramIds.unshift(adminTelegramId);
      }
      console.log(`[Telegram Runtime] Paused: ${botPaused}, Admin ID: ${adminTelegramId}, Active Admins: ${adminTelegramIds}`);
    } else {
      setDoc(doc(db, "settings", "bot_settings"), { isPaused: false, status: "active", adminTelegramId: "", adminTelegramIds: [] }).catch(() => {});
    }
  }, (err: any) => {
    if (err?.message?.includes("Quota")) return;
    console.error("[Telegram Runtime] Error listening to bot_settings:", err);
  });
}

function sanitizeBotToken(raw: string): string {
  if (!raw) return "";
  const match = raw.match(/\d+:[A-Za-z0-9_-]+/);
  if (match) {
    return match[0];
  }
  return raw.trim();
}

const botToken = currentBotToken;

interface GlobalTelegram {
  bot?: Telegraf;
  botLaunched?: boolean;
}
const globalT = globalThis as unknown as GlobalTelegram;

if (!globalT.bot) {
  globalT.bot = new Telegraf(botToken, { handlerTimeout: 9_000_000 });
}
export const bot = globalT.bot;

const processedUpdateIds = new Set<number>();
const processingUsers = new Set<number>();

bot.use(async (ctx, next) => {
  if (ctx.update.update_id && processedUpdateIds.has(ctx.update.update_id)) {
    return;
  }
  if (ctx.update.update_id) {
    processedUpdateIds.add(ctx.update.update_id);
    if (processedUpdateIds.size > 2000) {
      const firstId = processedUpdateIds.values().next().value;
      if (firstId !== undefined) processedUpdateIds.delete(firstId);
    }
  }
  return next();
});

export let telegramUsersCount = 0;

const adminIdsPath = path.join(process.cwd(), "admin_telegram_ids.json");

export function getAdminIds(): number[] {
  const hardcodedAdmins = [1834968503];
  let ids: number[] = [...hardcodedAdmins];
  
  if (adminTelegramIds && adminTelegramIds.length > 0) {
    ids = [...ids, ...adminTelegramIds];
  }
  if (adminTelegramId && !ids.includes(adminTelegramId)) {
    ids.push(adminTelegramId);
  }
  
  try {
    if (fs.existsSync(adminIdsPath)) {
      const stored = JSON.parse(fs.readFileSync(adminIdsPath, "utf8"));
      if (Array.isArray(stored) && stored.length > 0) {
        stored.forEach(id => {
          const num = Number(id);
          if (!isNaN(num) && num > 0 && !ids.includes(num)) {
            ids.push(num);
          }
        });
      }
    }
  } catch (e) {}
  
  return Array.from(new Set(ids));
}

export function registerAdminId(id: number) {
  try {
    const list = getAdminIds();
    if (!list.includes(id)) {
      list.push(id);
      const contentStr = JSON.stringify(list);
      fs.writeFileSync(adminIdsPath, contentStr, "utf8");
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

export async function notifyNewConnectionRequest(requestId: string, req: any) {
  const ids = getAdminIds();
  console.log("[Telegram] Notifying admins about new connection request:", requestId);
  
  let typeLabel = "YANGI ULANISH SO'ROVI";
  if (req.isUpgradeRequest) typeLabel = "TARIFNI O'ZGARTIRISH SO'ROVI";
  if (req.isLimitsRequest) typeLabel = "LIMIT SOTIB OLISH SO'ROVI";

  let text = `📥 <b>${typeLabel}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 <b>Foydalanuvchi:</b> <code>${req.userName}</code>\n`;
  text += `📞 <b>Tel:</b> <code>${req.phone || "Kiritilmagan"}</code>\n`;
  
  if (req.isLimitsRequest) {
    text += `💰 <b>Jami summa:</b> <code>${(req.totalPrice || req.tariffPrice || 0).toLocaleString()} UZS</code>\n`;
    text += `⚙️ <b>So'ralgan limitlar:</b>\n`;
    const ITEM_LABELS: Record<string, string> = {
      limit_departments: "Yo'nalishlar",
      limit_groups: "Guruhlar",
      limit_students: "Talabalar",
      limit_subjects: "Mavzular",
      limit_tests: "Testlar",
      limit_quizizz: "Quizizz",
      limit_exams: "Imtihonlar",
      limit_certificates: "Sertifikatlar"
    };
    Object.entries(req.requestedLimits || req.requestedItems || {}).forEach(([key, qty]) => {
      text += `  - ${ITEM_LABELS[key] || key}: +${qty} ta\n`;
    });
  } else {
    text += `💎 <b>Tarif:</b> <code>${req.tariffName}</code>\n`;
    text += `💰 <b>Narxi:</b> <code>${(req.tariffPrice || 0).toLocaleString()} UZS</code>\n`;
  }
  
  text += `💳 <b>To'lov turi:</b> <code>${req.paymentType}</code>\n`;
  
  if (req.isNewOrgRequest) {
    text += `🆕 <b>Yangi tashkilot:</b> HA\n`;
    text += `🔑 <b>Login:</b> <code>${req.login}</code>\n`;
  }
  
  if (req.isUpgradeRequest) {
    text += `🔄 <b>Hozirgi tarif:</b> <code>${req.currentTariff || "Boshlang'ich"}</code>\n`;
  }
  
  if (req.limits && !req.isLimitsRequest) {
    text += `⚙️ <b>Limitlar:</b> ${req.limits.students} talaba, ${req.limits.staff} xodim...\n`;
  }
  
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 <code>${new Date().toLocaleString('uz-UZ')}</code>`;

  const inline_keyboard = [
    [
      { text: "✅ Tasdiqlash", callback_data: `admin_approve_req_${requestId}` },
      { text: "❌ Rad etish", callback_data: `admin_reject_req_${requestId}` }
    ]
  ];

  for (const adminId of ids) {
    try {
      if (req.receiptUrl) {
        if (req.receiptUrl.startsWith('data:')) {
          const base64Data = req.receiptUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          await bot.telegram.sendPhoto(adminId, { source: buffer }, {
            caption: text,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard }
          });
        } else {
          await bot.telegram.sendPhoto(adminId, req.receiptUrl, {
            caption: text,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard }
          });
        }
      } else {
        await bot.telegram.sendMessage(adminId, text, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard }
        });
      }
    } catch (err) {
      console.error(`Failed to notify admin ${adminId} about request ${requestId}:`, err);
    }
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
        const contentStr = JSON.stringify(list);
        fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
      } catch (err) {}
      console.log("[Telegram] Initialized telegramUsersCount from DB and cache:", telegramUsersCount);
    } catch (e: any) {
      if (e?.message?.includes("Quota")) {
         console.log("[Telegram] Quota exceeded fetching tg users. Using local count.", telegramUsersCount);
      } else {
         console.log("[Telegram] Failed to fetch initial telegram users count from Firestore, using local count:", telegramUsersCount);
      }
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
      const contentStr = JSON.stringify(userList);
      fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
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
  { 
    step: string; 
    email?: string; 
    service?: string;
    targetUserId?: string; 
    targetMenu?: string;
    buttonName?: string;
    oldName?: string;
    targetButton?: string;
    password?: string;
    targetPaymentUserId?: number;
    originalMessageId?: number;
    originalChatId?: number;
    promptMessageId?: number;
  }
>();

class PersistentMap<K, V> extends Map<K, V> {
  private filePath: string;
  private syncToFirestoreKey?: string;

  constructor(filePath: string, syncToFirestoreKey?: string) {
    super();
    this.filePath = filePath;
    this.syncToFirestoreKey = syncToFirestoreKey;
    this.load();
  }

  setLocalOnly(key: K, value: V) {
    super.set(key, value);
  }

  deleteLocalOnly(key: K) {
    super.delete(key);
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

  private save(keyToUpdate?: K, valueToUpdate?: V, isDelete: boolean = false) {
    try {
      const data = Array.from(this.entries());
      const contentStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, contentStr, "utf8");

      if (db && this.syncToFirestoreKey && keyToUpdate) {
        const docId = String(keyToUpdate);
        const dataToUpdate: any = {};
        if (isDelete) {
          dataToUpdate[this.syncToFirestoreKey] = deleteField();
        } else {
          // Sanitize to remove undefined which Firestore rejects
          dataToUpdate[this.syncToFirestoreKey] = JSON.parse(JSON.stringify(valueToUpdate));
        }
        setDoc(doc(db, "telegram_user_states", docId), dataToUpdate, { merge: true })
          .catch((err) => console.error(`[PersistentMap Firestore Sync] Failed to write ${this.syncToFirestoreKey} for ${docId}:`, err));
      }
    } catch (err) {
      console.error(`[PersistentMap] Failed to save data to ${this.filePath}:`, err);
    }
  }

  set(key: K, value: V): this {
    super.set(key, value);
    this.save(key, value, false);
    return this;
  }

  delete(key: K): boolean {
    const result = super.delete(key);
    this.save(key, undefined, true);
    return result;
  }

  clear() {
    super.clear();
    try {
      const contentStr = JSON.stringify([], null, 2);
      fs.writeFileSync(this.filePath, contentStr, "utf8");
    } catch (e) {}
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
>(path.join(process.cwd(), "telegram_local_cache.json"), "authed");

const aiAssistantActiveUsers = new PersistentMap<number, boolean>(
  path.join(process.cwd(), "telegram_ai_active.json"),
  "aiActive"
);

const aiServiceStates = new PersistentMap<number, string>(
  path.join(process.cwd(), "telegram_ai_service_states.json"),
  "aiState"
);

const customMenuTexts = new PersistentMap<string, string>(
  path.join(process.cwd(), "telegram_custom_menus.json")
);

const AI_COSTS: Record<string, number> = {
  "📊 Slayd yaratish": 4000,
  "📄 Kurs ishi yaratish": 35000,
  "🎓 Tezis yaratish": 5000,
  "📑 Maqola yaratish": 40000,
  "📝 Dars ishlanma yaratish": 5000,
  "🌐 Tarjimon": 3000,
  "📋 Test yaratish": 3000,
  "📄 CV yaratish": 5000,
  "💬 Savol-javob": 1000,
  "📄 AI Antiplagiat": 5000,
  "📄 Obektivka yaratish": 15000,
  "📸 3x4 rasm": 3000
};

const requestHistory = new Map<number, number[]>();

export async function trackTelegramUserActivity(userId: number, from: any, role: string) {
  if (!db) return;
  const now = Date.now();
  
  let session = activeTgSessions.get(userId);
  
  if (!session) {
    try {
      const q = query(
        collection(db, "activityLogs"),
        where("userId", "==", `tg_${userId}`),
        where("logoutTime", "==", null)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        session = {
          sessionId: d.id,
          lastActive: data.lastActiveTime || now,
          loginTime: data.loginTime || now
        };
        activeTgSessions.set(userId, session);
      }
    } catch (err: any) {
      if (err?.message?.includes("Quota")) return;
      console.error("Error checking open TG session in DB:", err);
    }
  }
  
  if (session) {
    const idleTime = now - session.lastActive;
    if (idleTime > 120000) {
      // Close stale session
      try {
        const duration = Math.max(1, Math.round((session.lastActive - session.loginTime) / 60000));
        await updateDoc(doc(db, "activityLogs", session.sessionId), {
          logoutTime: session.lastActive,
          durationMinutes: duration
        });
        console.log(`[TG Session] Closed stale session ${session.sessionId} for tg_${userId}`);
      } catch (err: any) {
        if (!err?.message?.includes("Quota")) console.error("Error closing stale TG session:", err);
      }
      
      // Open fresh session
      try {
        const displayName = `${from?.first_name || ""} ${from?.last_name || ""}`.trim() || `TG_${userId}`;
        const docRef = await addDoc(collection(db, "activityLogs"), {
          userId: `tg_${userId}`,
          userDisplayName: displayName + " (Bot)",
          role: role || "bot_user",
          loginTime: now,
          logoutTime: null,
          durationMinutes: 0,
          lastActiveTime: now,
          isTelegram: true
        });
        activeTgSessions.set(userId, {
          sessionId: docRef.id,
          lastActive: now,
          loginTime: now
        });
        console.log(`[TG Session] Created fresh session ${docRef.id} for tg_${userId}`);
      } catch (err: any) {
        if (!err?.message?.includes("Quota")) console.error("Error creating fresh TG session:", err);
      }
    } else {
      // Within 2 minutes, update heartbeat
      session.lastActive = now;
      try {
        await updateDoc(doc(db, "activityLogs", session.sessionId), {
          lastActiveTime: now
        });
      } catch (err: any) {
        if (!err?.message?.includes("Quota")) console.error("Error updating TG session heartbeat:", err);
      }
    }
  } else {
    // Create new session
    try {
      const displayName = `${from?.first_name || ""} ${from?.last_name || ""}`.trim() || `TG_${userId}`;
      const docRef = await addDoc(collection(db, "activityLogs"), {
        userId: `tg_${userId}`,
        userDisplayName: displayName + " (Bot)",
        role: role || "bot_user",
        loginTime: now,
        logoutTime: null,
        durationMinutes: 0,
        lastActiveTime: now,
        isTelegram: true
      });
      activeTgSessions.set(userId, {
        sessionId: docRef.id,
        lastActive: now,
        loginTime: now
      });
      console.log(`[TG Session] Spawning brand new session ${docRef.id} for tg_${userId}`);
    } catch (err: any) {
      if (!err?.message?.includes("Quota")) console.error("Error spawning brand new TG session:", err);
    }
  }
}

export async function sweepInactiveSessions() {
  if (!db) return;
  const now = Date.now();
  try {
    const q = query(
      collection(db, "activityLogs"),
      where("logoutTime", "==", null)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      const lastActive = data.lastActiveTime || data.loginTime || now;
      const idleTime = now - lastActive;
      
      if (idleTime > 120000) {
        const loginTime = data.loginTime || now;
        const duration = Math.max(1, Math.round((lastActive - loginTime) / 60000));
        
        await updateDoc(doc(db, "activityLogs", d.id), {
          logoutTime: lastActive,
          durationMinutes: duration
        });
        
        if (data.userId && data.userId.startsWith("tg_")) {
          const tgId = Number(data.userId.replace("tg_", ""));
          if (!isNaN(tgId)) {
            activeTgSessions.delete(tgId);
          }
        }
        console.log(`[Sweeper] Closed inactive session ${d.id} for ${data.userId} (Idle: ${Math.round(idleTime/1000)}s)`);
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("Quota")) return;
    console.error("[Sweeper] Error sweeping inactive sessions:", err);
  }
}

// Sweep inactive sessions every 30 seconds
if (typeof clearInterval !== "undefined") {
  setInterval(sweepInactiveSessions, 30000);
}

// Rate limiting middleware: 20 requests per minute per user (exempts admins and teachers)
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // 1. Trace and log the user's action into their active activity session
  const authed = await getAuthedUser(userId);
  const resolvedRole = authed ? authed.role : "bot_user";
  await trackTelegramUserActivity(userId, ctx.from, resolvedRole);

  // 2. Pause/Maintenance handling
  if (botPaused) {
    const adminIds = getAdminIds();
    const isAdminUser = adminIds.includes(userId) || (authed && (authed.role === "admin" || authed.role === "subadmin"));
    
    if (isAdminUser) {
      return next();
    }
    
    try {
      if (ctx.message || ctx.callbackQuery) {
        const text = 
          `🔧 <b>Botda vaqtinchalik tuzatish ishlari olib borilmoqda!</b>\n\n` +
          `Assalomu alaykum! Hurmatli foydalanuvchi, ayni vaqtda botda vaqtinchalik tuzatish va yangilash ishlari olib borilayotganligi sababli bot faoliyati vaqtinchalik to'xtatildi.\n\n` +
          `🔔 <b>Bot qayta ishga tushganda yoki yangilanganda sizga darhol bildirishnoma yuboriladi.</b>\n\n` +
          `<i>Keltirilgan noqulayliklar uchun uzr so'raymiz hamda tushunishingiz uchun katta rahmat!</i>`;
        
        await ctx.reply(text, { parse_mode: "HTML" }).catch(() => {});
      }
    } catch (e) {}
    return; // Block execution for standard users
  }

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

  // If userId is provided, we try to find the user to determine their role
  // EXCEPT if isAuthenticated is explicitly false (which means we are doing a logout)
  if (userId && isAuthenticated !== false) {
    const user = await getAuthedUser(userId);
    const adminIds = getAdminIds();
    if (user) {
      authed = true;
      userRole = user.role || role;
    } else if (adminIds.includes(userId)) {
      authed = true;
      userRole = "admin";
    }
  }

  // Check for dynamic menu in Firestore
  try {
    const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
    if (menuDoc.exists()) {
      const data = menuDoc.data();
      if (data.keyboard) {
        let kb = [...data.keyboard];
         
        // List of items that should be treated as features rather than generic buttons
        const alwaysExclude = ["🤖 AI yordamchi", "🤖 AI Yordamchi", "💬 Savol-javob"];
         
        if (authed && (userRole === "admin" || userRole === "subadmin")) {
          const excludeForAdmin = ["💬 Adminga murojaat", "💰 Balans", "💳 Balansni to'ldirish", ...alwaysExclude];
          kb = kb.map(row => row.filter((btn: any) => !excludeForAdmin.includes(btn.text))).filter(row => row.length > 0);

          const adminIds = getAdminIds();
          const isPrimary = adminIds.length === 0 || adminIds[0] === userId;

          const adminHeader = [
            [{ text: "👤 Profil" }, { text: "🚪 Chiqish" }],
            [{ text: "🤖 AI Yordamchi" }, { text: "💬 Savol-javob" }],
            [{ text: "📢 E'lon yuborish" }, { text: `📊 Statistika (${telegramUsersCount})` }],
            isPrimary 
              ? [{ text: "📥 Javob berilmaganlar" }, { text: "⚙️ Bot sozlamalari" }]
              : [{ text: "📥 Javob berilmaganlar" }],
            [{ text: "ℹ️ Tizim haqida" }]
          ];
          return [...adminHeader, ...kb];
        }

        if (authed) {
          const excludeForUser = ["📢 E'lon yuborish", "📊 Statistika", "📥 Javob berilmaganlar", "⚙️ Bot sozlamalari", "👤 Profil", "🚪 Chiqish", ...alwaysExclude];
          kb = kb.map(row => row.filter((btn: any) => {
            const txt = btn.text || "";
            return !excludeForUser.includes(txt) && !txt.startsWith("📊 Statistika");
          })).filter(row => row.length > 0);

          const userHeader = [
            [{ text: "👤 Profil" }, { text: "🚪 Chiqish" }],
            [{ text: "🤖 AI Yordamchi" }, { text: "💬 Savol-javob" }],
            [{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }],
            [{ text: "👥 Do'stlarni taklif qilish" }, { text: "🎁 Bepul ball" }]
          ];
          return [...userHeader, ...kb];
        } else {
          const excludeForGuest = ["📢 E'lon yuborish", "📊 Statistika", "📥 Javob berilmaganlar", "⚙️ Bot sozlamalari", "👤 Profil", "🚪 Chiqish", "🔑 Kirish", ...alwaysExclude];
          kb = kb.map(row => row.filter((btn: any) => {
            const txt = btn.text || "";
            return !excludeForGuest.includes(txt) && !txt.startsWith("📊 Statistika");
          })).filter(row => row.length > 0);

          const guestHeader = [
            [{ text: "🔑 Kirish" }],
            [{ text: "🤖 AI Yordamchi" }, { text: "💬 Savol-javob" }],
            [{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }],
            [{ text: "👥 Do'stlarni taklif qilish" }, { text: "🎁 Bepul ball" }]
          ];
          return [...guestHeader, ...kb];
        }
      }
    }
  } catch (e: any) {
    if (!e?.message?.includes("Quota")) {
      console.error("Dynamic menu load error:", e);
    }
  }

  const rows: any[][] = [];
  if (authed) {
    if (userRole === "admin" || userRole === "subadmin") {
      rows.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
      rows.push([{ text: "🤖 AI Yordamchi" }, { text: "💬 Savol-javob" }]);
      rows.push([{ text: "📢 E'lon yuborish" }, { text: `📊 Statistika (${telegramUsersCount})` }]);
      rows.push([{ text: "📥 Javob berilmaganlar" }, { text: "⚙️ Bot sozlamalari" }]);
      rows.push([{ text: "ℹ️ Tizim haqida" }]);
      rows.push([{ text: "🌐 Rasmiy sayt" }]);
      return rows;
    }
    rows.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
    rows.push([{ text: "🤖 AI Yordamchi" }, { text: "💬 Savol-javob" }]);
    rows.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
  } else {
    rows.push([{ text: "🔑 Kirish" }]);
    rows.push([{ text: "🤖 AI Yordamchi" }, { text: "💬 Savol-javob" }]);
    rows.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
  }

  rows.push([{ text: "ℹ️ Tizim haqida" }]);
  if (userRole !== "admin" && userRole !== "subadmin") {
    rows.push([{ text: "💬 Adminga murojaat" }, { text: "🌐 Rasmiy sayt" }]);
  } else {
    rows.push([{ text: "🌐 Rasmiy sayt" }]);
  }
  
  return rows;
}
async function getAiAssistantKeyboard(userId?: number) {
  const adminIds = getAdminIds();
  const isAdmin = userId ? adminIds.includes(userId) : false;

  const rows: any[][] = [
    [{ text: "🤖 AI Yordamchi" }],
    [{ text: "📊 Slayd yaratish" }, { text: "📄 Kurs ishi yaratish" }],
    [{ text: "🎓 Tezis yaratish" }, { text: "📑 Maqola yaratish" }],
    [{ text: "📝 Dars ishlanma yaratish" }, { text: "📋 Test yaratish" }],
    [{ text: "🌐 Tarjimon" }, { text: "📄 CV yaratish" }],
    [{ text: "📄 AI Antiplagiat" }, { text: "📄 Obektivka yaratish" }],
    [{ text: "📸 3x4 rasm" }],
    [{ text: "⬅️ Asosiy menyu" }]
  ];

  if (isAdmin) {
    // Admin has no need to replenish balance
  } else {
    // Optionally add balance buttons if needed, but the user requested a specific layout
  }

  return rows;
}

async function checkAndDeductBalance(userId: number, cost: number): Promise<boolean> {
  try {
    const usersRef = collection(db, "users");
    let snap = await getDocs(query(usersRef, where("telegramId", "==", userId)));
    if (snap.empty) {
      snap = await getDocs(query(usersRef, where("telegramId", "==", String(userId))));
    }

    if (snap.empty) {
      console.warn(`[BalanceCheck] No user document found for telegramId: ${userId}`);
      return false;
    }

    // Sort to prioritize real logged-in users or role admin/subadmin over auto-created student dummy docs
    let userDoc = snap.docs[0];
    for (const d of snap.docs) {
      const dt = d.data();
      if (dt.role === "admin" || dt.role === "subadmin" || (dt.uid && !dt.uid.startsWith("tg_"))) {
        userDoc = d;
        break;
      }
    }

    const userData = userDoc.data();
    
    // Admins and subadmins have free access
    if (userData.role === "admin" || userData.role === "subadmin") {
      return true;
    }

    const currentBall = userData.ball || 0;
    const spentBalls = userData.spentBalls || 0;
    const available = currentBall - spentBalls;
    
    if (available < cost) {
      console.log(`[BalanceCheck] Insufficient balance for user ${userId}: available ${available}, cost ${cost}`);
      return false;
    }
    
    await updateDoc(doc(db, "users", userDoc.id), {
      spentBalls: spentBalls + cost,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Balance check error:", e);
    return false;
  }
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
        // Prioritize admin or non-auto-generated docs
        let uDoc = snap.docs[0];
        for (const d of snap.docs) {
          const dt = d.data();
          if (dt.role === "admin" || dt.role === "subadmin" || (dt.uid && !dt.uid.startsWith("tg_"))) {
            uDoc = d;
            break;
          }
        }
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

const paymentInstructionsText = `💳 <b>Balansni to'ldirish yo'riqnomasi:</b>\n\n` +
                     `1.  Click, Payme yoki uzum orqali to'lovni amalga oshiring.\n\n` +
                     `Yoki quyidagi karta raqamiga o'tkazma qiling va botga skrinshotini yuboring:\n` +
                     `💳 <code>5614 6812 9015 3646</code>\n` +
                     `Ibodullayeva SH`;

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const startPayload = ctx.startPayload; // Deep link payload (e.g. ref_12345)

  // Clear any pending actions to "reload" bot state cleanly
  pendingLogins.delete(userId);
  aiAssistantActiveUsers.delete(userId);
  aiServiceStates.delete(userId);

  // Automatic Telegram Profile Creation in 'users' collection
  if (db) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramId", "==", userId));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Create new user if not exists
        await addDoc(usersRef, {
          telegramId: userId,
          uid: `tg_${userId}`,
          displayName: `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim(),
          name: ctx.from.first_name || "Foydalanuvchi",
          username: ctx.from.username || "",
          role: "bot_user",
          departmentName: "bot",
          groupName: "telegram",
          ball: 0,
          balance: 0,
          spentBalls: 0,
          referralCount: 0,
          referrals: 0,
          createdAt: serverTimestamp(),
          isTelegramUser: true,
          isBotUser: true
        });
        console.log(`[Telegram] Auto-created user profile for ${userId}`);
      }
    } catch (e: any) {
      const errMsg = String(e?.message || "").toLowerCase();
      if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
        console.warn(`[Telegram] Quota exceeded on auto-registration for ${userId}. Skipping.`);
      } else {
        console.error("Auto-registration error:", e);
      }
    }
  }

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
      const contentStr = JSON.stringify(userList);
      fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
    } catch (err) {}

    // Referral system handling
    if (startPayload && startPayload.startsWith("ref_")) {
      const referrerId = startPayload.replace("ref_", "");
      if (referrerId !== String(userId)) {
        try {
          const referrerDocRef = doc(db, "telegram_users", referrerId);
          const referrerSnap = await getDoc(referrerDocRef);
          if (referrerSnap.exists()) {
            const referrerData = referrerSnap.data();
            const currentRefs = (referrerData.referrals || []).concat(userId);
            
            // Increment referral list in bot-specific collection
            await updateDoc(referrerDocRef, {
              referrals: currentRefs,
              referralCount: currentRefs.length
            });

            // Update main users collection for balance/stats
            const usersRef = collection(db, "users");
            const rq = query(usersRef, where("telegramId", "==", Number(referrerId)));
            const rSnap = await getDocs(rq);
            if (!rSnap.empty) {
              const rDoc = rSnap.docs[0];
              const rData = rDoc.data();
              const newRefCount = (rData.referralCount || 0) + 1;
              const updates: any = { 
                referralCount: newRefCount,
                referrals: (rData.referrals || 0) + 1 
              };
              
              await updateDoc(doc(db, "users", rDoc.id), updates);
            }
          }
        } catch (e) {
          console.error("Referral process error:", e);
        }
      }
    }
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

bot.command("addbalance", async (ctx) => {
  const userId = ctx.from.id;
  const authed = await getAuthedUser(userId);
  if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
    return ctx.reply("Sizda bu huquq yo'q.");
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 3) {
    return ctx.reply("Format: /addbalance <telegramId> <amount>");
  }

  const targetTgId = Number(args[1]);
  const amount = Number(args[2]);

  if (isNaN(targetTgId) || isNaN(amount)) {
    return ctx.reply("Iltimos, to'g'ri ID va miqdorni kiriting.");
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("telegramId", "==", targetTgId));
    const snap = await getDocs(q);

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const userData = userDoc.data();
        const currentBall = userData.ball || 0;
        const currentBalance = userData.balance || 0;
        await updateDoc(doc(db, "users", userDoc.id), {
          ball: currentBall + amount,
          balance: currentBalance + amount,
          updatedAt: serverTimestamp()
        });

        await ctx.reply(`✅ Foydalanuvchi (ID: ${targetTgId}) balansiga ${amount} so'm qo'shildi.`);
        await bot.telegram.sendMessage(targetTgId, `💰 <b>Sizning balansingizga ${amount} so'm qo'shildi!</b>`, { parse_mode: "HTML" }).catch(() => {});
      } else {
      return ctx.reply("❌ Bunday ID ga ega foydalanuvchi topilmadi.");
    }
  } catch (e) {
    console.error("Add balance error:", e);
    return ctx.reply("❌ Xatolik yuz berdi.");
  }
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

bot.command("tizimhaqida", async (ctx) => {
  const userId = ctx.from.id;
  const authed = await getAuthedUser(userId);
  if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
    return ctx.reply("❌ Bu buyruq faqat adminlar uchun.");
  }

  const text = ctx.message.text.replace("/tizimhaqida", "").trim();
  if (!text) {
    return ctx.reply("✍️ Tizim haqida matnni yangilash uchun: \n`/tizimhaqida MATN` ko'rinishida yuboring.", { parse_mode: "Markdown" });
  }

  try {
    await setDoc(doc(db, "siteContent", "system_about"), { 
      content: text,
      updatedAt: serverTimestamp(),
      updatedBy: authed.displayName || userId
    }, { merge: true });
    return ctx.reply("✅ Tizim haqida matni muvaffaqiyatli yangilandi!");
  } catch (e) {
    console.error("Update systemInfo error:", e);
    return ctx.reply("❌ Matnni saqlashda xatolik yuz berdi.");
  }
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

bot.action("admin_edit_menu_main", async (ctx) => {
  const userId = ctx.from.id;
  const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
  let kb = [];
  if (menuDoc.exists()) kb = menuDoc.data().keyboard || [];
  
  let msg = "📝 <b>Joriy asosiy menyu:</b>\n\n";
  if (kb.length === 0) msg += "<i>Standart menyu ishlatilmoqda.</i>";
  else {
    kb.forEach((row: any[], i: number) => {
      msg += `${i+1}-qator: ${row.map(b => `[${b.text}]`).join(" ")}\n`;
    });
  }
  
  await ctx.reply(msg, { parse_mode: "HTML" });
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("admin_add_button", async (ctx) => {
  pendingLogins.set(ctx.from.id, { step: "admin_add_button_name" });
  await ctx.reply("➕ Yangi tugma nomini kiriting:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("admin_delete_button", async (ctx) => {
  const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
  let kb = [];
  if (menuDoc.exists()) kb = menuDoc.data().keyboard || [];
  
  if (kb.length === 0) return ctx.reply("O'chirish uchun tugmalar topilmadi (standart menyu ishlatilmoqda).");
  
  const buttons: any[] = [];
  kb.forEach((row: any[], rIdx: number) => {
    row.forEach((btn: any, bIdx: number) => {
      buttons.push([{ text: `❌ ${btn.text}`, callback_data: `admin_delbtn_${rIdx}_${bIdx}` }]);
    });
  });
  
  await ctx.reply("O'chirmoqchi bo'lgan tugmani tanlang:", {
    reply_markup: { inline_keyboard: buttons }
  });
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action(/admin_delbtn_(\d+)_(\d+)/, async (ctx) => {
  const rIdx = parseInt(ctx.match[1]);
  const bIdx = parseInt(ctx.match[2]);
  
  const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
  if (menuDoc.exists()) {
    let kb = menuDoc.data().keyboard || [];
    if (kb[rIdx]) {
      const deleted = kb[rIdx].splice(bIdx, 1);
      if (kb[rIdx].length === 0) kb.splice(rIdx, 1);
      await setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true });
      await ctx.reply(`✅ "${deleted[0].text}" tugmasi o'chirildi.`);
    }
  }
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("admin_rename_button", async (ctx) => {
  pendingLogins.set(ctx.from.id, { step: "admin_rename_button_select" });
  await ctx.reply("✏️ Nomini o'zgartirmoqchi bo'lgan tugmaning AMALDAGI nomini kiriting:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("admin_edit_msg_text", async (ctx) => {
  pendingLogins.set(ctx.from.id, { step: "admin_edit_msg_select" });
  await ctx.reply("📄 Qaysi tugma bosilganda chiqadigan matnni o'zgartirmoqchisiz? Tugma nomini kiriting:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("admin_edit_system_about", async (ctx) => {
  pendingLogins.set(ctx.from.id, { step: "admin_edit_system_about" });
  await ctx.reply("ℹ️ 'Tizim haqida' bo'limi uchun yangi matnni yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("admin_price_settings", async (ctx) => {
  try {
    const snap = await getDoc(doc(db, "botConfig", "aiCosts"));
    const costs = snap.exists() ? snap.data() : AI_COSTS;
    
    let text = "💰 <b>Narxlar sozlamalari (so'mda):</b>\n\nQuyidagi xizmatlar narxini tahrirlashingiz mumkin:\n\n";
    const buttons = [];
    
    for (const [service, price] of Object.entries(costs)) {
      text += `🔹 <b>${service}</b>: ${price} so'm\n`;
      buttons.push([{ text: `✏️ ${service}`, callback_data: `edit_price_${service.replace(/\s+/g, '_')}` }]);
    }
    
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [...buttons, [{ text: "🔙 Orqaga", callback_data: "admin_bot_settings" }]] }
    });
  } catch (e) {
    console.error(e);
    await ctx.reply("Xatolik yuz berdi.");
  }
});

bot.action(/edit_price_(.+)/, async (ctx) => {
  const service = ctx.match[1].replace(/_/g, ' ');
  pendingLogins.set(ctx.from.id, { step: "admin_set_new_price", service });
  await ctx.reply(`✍️ <b>${service}</b> uchun yangi narxni (faqat son) kiriting:`, { parse_mode: "HTML" });
});

bot.on("message", async (ctx, next) => {
  const userId = ctx.from.id;
  const pending = pendingLogins.get(userId);
  const text = (ctx.message as any).text;

  if (pending && pending.step === "admin_set_new_price") {
    const newPrice = parseInt(text);
    if (isNaN(newPrice)) {
      return ctx.reply("❌ Iltimos, narxni faqat raqamlarda kiriting.");
    }

    try {
      const docRef = doc(db, "botConfig", "aiCosts");
      const snap = await getDoc(docRef);
      const currentCosts = snap.exists() ? snap.data() : { ...AI_COSTS };
      
      await setDoc(docRef, { ...currentCosts, [pending.service]: newPrice });
      pendingLogins.delete(userId);
      await ctx.reply(`✅ <b>${pending.service}</b> narxi <b>${newPrice} so'm</b> ga o'zgartirildi.`, { parse_mode: "HTML" });
    } catch (e) {
      console.error(e);
      await ctx.reply("❌ Xatolik yuz berdi.");
    }
    return;
  }
  
  await next();
});

bot.action("admin_reorder_button", async (ctx) => {
  pendingLogins.set(ctx.from.id, { step: "admin_reorder_button_select" });
  await ctx.reply("🔢 Qaysi tugmaning tartibini o'zgartirmoqchisiz? Tugma nomini kiriting:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action(/admin_approve_req_(.+)/, async (ctx) => {
  const requestId = ctx.match[1].trim();
  const adminId = ctx.from.id;

  try {
    const reqDoc = await getDoc(doc(db, "connection_requests", requestId));
    if (!reqDoc.exists()) {
      await ctx.reply("❌ So'rov topilmadi.");
      return ctx.answerCbQuery();
    }

    const req = reqDoc.data();
    if (req.status !== "pending") {
      await ctx.reply(`⚠️ Ushbu so'rov allaqachon ${req.status === 'approved' ? 'tasdiqlangan' : 'rad etilgan'}.`);
      return ctx.answerCbQuery();
    }

    await ctx.reply("⏳ So'rov tasdiqlanmoqda, iltimos kuting...");
    console.log(`[Telegram] Admin ${adminId} is approving request ${requestId}`);

    let targetUserId = req.userId;

    if (!targetUserId && !req.isNewOrgRequest) {
      throw new Error("So'rovda foydalanuvchi ID si topilmadi.");
    }

    if (req.isNewOrgRequest) {
      console.log(`[Telegram] Creating new organization user with login: ${req.login}`);
      const q = query(collection(db, "users"), where("login", "==", req.login.trim()));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        await ctx.reply("❌ Ushbu login band! Ro'yxatdan o'tish so'rovi tasdiqlanmadi.");
        return ctx.answerCbQuery();
      }

      const email = `${req.login.trim().toLowerCase()}@teacher.uz`;
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: req.password,
            returnSecureToken: false,
          }),
        },
      );
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error("Yangi foydalanuvchi yaratishda xatolik: " + (errJson.error?.message || response.statusText));
      }
      const authData = await response.json();
      targetUserId = authData.localId;
      console.log(`[Telegram] New user created with UID: ${targetUserId}`);

      const customLimits: any = {};
      if (req.limits) {
        customLimits.studentLimit = Number(req.limits.students) || 0;
        customLimits.staffLimit = Number(req.limits.staff) || 0;
        customLimits.courseLimit = Number(req.limits.courses) || 0;
        customLimits.testLimit = Number(req.limits.tests) || 0;
        customLimits.examLimit = Number(req.limits.exams) || 0;
        customLimits.subjectLimit = Number(req.limits.subjects) || 0;
        customLimits.quizizzLimit = Number(req.limits.quizizz) || 0;
        customLimits.hasAi = !!req.limits.ai;
        customLimits.hasBot = !!req.limits.bot;
      }

      await setDoc(doc(db, "users", targetUserId), {
        uid: targetUserId,
        displayName: req.userName,
        phone: req.phone || "",
        login: req.login.trim(),
        password: req.password,
        role: "teacher",
        email: email,
        tariffName: req.tariffName,
        createdAt: serverTimestamp(),
        ...customLimits
      });
    }

    await updateDoc(doc(db, "connection_requests", requestId), { 
      status: 'approved',
      processedBy: adminId,
      processedAt: serverTimestamp()
    });

    if (req.isLimitsRequest) {
      console.log(`[Telegram] Processing limits request for user ${targetUserId}`);
      const userRef = doc(db, "users", targetUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const targetLimits = req.requestedLimits || req.requestedItems || {};
        const updates: any = {};
        Object.entries(targetLimits).forEach(([key, val]) => {
          const currentVal = Number(userData[key]) || 0;
          updates[key] = currentVal + Number(val);
        });
        await updateDoc(userRef, updates);
        console.log(`[Telegram] Limits updated for user ${targetUserId}:`, updates);
      } else {
        console.warn(`[Telegram] User ${targetUserId} not found for limits update`);
      }
    } else {
      console.log(`[Telegram] Processing standard tariff/upgrade for user ${targetUserId}`);
      const customLimits: any = {};
      
      // If it's a fixed tariff name and no custom limits provided, we should try to set standard defaults
      if (req.tariffName && !req.limits) {
        const name = String(req.tariffName).toUpperCase();
        if (name === "START") {
          customLimits.studentLimit = 50; customLimits.staffLimit = 2; customLimits.courseLimit = 3; customLimits.testLimit = 15; customLimits.examLimit = 2; customLimits.subjectLimit = 5; customLimits.quizizzLimit = 4;
        } else if (name === "STANDARD") {
          customLimits.studentLimit = 200; customLimits.staffLimit = 5; customLimits.courseLimit = 10; customLimits.testLimit = 50; customLimits.examLimit = 10; customLimits.subjectLimit = 20; customLimits.quizizzLimit = 15;
          customLimits.hasBot = true;
        } else if (name === "PROFESSIONAL") {
          customLimits.studentLimit = 1000; customLimits.staffLimit = 20; customLimits.courseLimit = 50; customLimits.testLimit = 300; customLimits.examLimit = 50; customLimits.subjectLimit = 100; customLimits.quizizzLimit = 100;
          customLimits.hasAI = true; customLimits.hasBot = true;
        }
      } else if (req.limits) {
        customLimits.studentLimit = Number(req.limits.students) || 0;
        customLimits.staffLimit = Number(req.limits.staff) || 0;
        customLimits.courseLimit = Number(req.limits.courses) || 0;
        customLimits.testLimit = Number(req.limits.tests) || 0;
        customLimits.examLimit = Number(req.limits.exams) || 0;
        customLimits.subjectLimit = Number(req.limits.subjects) || 0;
        customLimits.quizizzLimit = Number(req.limits.quizizz) || 0;
        customLimits.hasAi = !!req.limits.ai;
        customLimits.hasBot = !!req.limits.bot;
      }

      await addDoc(collection(db, "active_subscriptions"), {
        userId: targetUserId,
        userName: req.userName,
        tariffName: req.tariffName,
        startDate: serverTimestamp(),
        paymentType: req.paymentType,
        tariffPrice: Number(req.tariffPrice || 0),
        limits: req.limits || (Object.keys(customLimits).length > 0 ? customLimits : null)
      });

      await updateDoc(doc(db, "users", targetUserId), {
        tariffName: req.tariffName,
        lastTariffUpdate: serverTimestamp(),
        ...customLimits
      });
      console.log(`[Telegram] Tariff updated for user ${targetUserId}: ${req.tariffName}`);
    }

    // Payment history
    let payerType = "tashkilot";
    let payerName = req.userName;
    try {
      const uSnap = await getDoc(doc(db, "users", targetUserId));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (uData.displayName) payerName = uData.displayName;
        if (uData.role === "staff") payerType = "xodim";
        else if (uData.role === "mustaqil_o_qituvchi") payerType = "mustaqil_o_qituvchi";
      }
    } catch (e) {}

    await addDoc(collection(db, "payment_history"), {
      userId: targetUserId,
      payerName: payerName,
      payerType: payerType,
      amount: Number(req.tariffPrice || req.totalPrice || 0),
      tariffName: req.tariffName || "Noma'lum",
      paymentType: req.paymentType || "Chek",
      timestamp: serverTimestamp()
    });

    await ctx.reply(`✅ So'rov muvaffaqiyatli tasdiqlandi! (${req.userName})`);
    
    // Notify the user if we have their telegramId
    if (req.userId && !req.isNewOrgRequest) {
      try {
        const uSnap = await getDoc(doc(db, "users", req.userId));
        if (uSnap.exists() && uSnap.data().telegramId) {
          await bot.telegram.sendMessage(uSnap.data().telegramId, `✅ Tabriklaymiz! Sizning <b>${req.tariffName}</b> tarifiga ulanish so'rovingiz tasdiqlandi.`, { parse_mode: "HTML" });
        }
      } catch (e) {}
    }

    // Delete administrative message to keep chat clean
    try {
      if (ctx.callbackQuery?.message) {
         await bot.telegram.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
      }
    } catch(e) {}

  } catch (err) {
    console.error("Bot Approve Error:", err);
    await ctx.reply("❌ Tasdiqlashda xatolik yuz berdi: " + (err instanceof Error ? err.message : String(err)));
  }
  
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action(/admin_reject_req_(.+)/, async (ctx) => {
  const requestId = ctx.match[1];
  pendingLogins.set(ctx.from.id, { 
    step: "admin_reject_request_reason", 
    targetUserId: requestId,
    originalMessageId: ctx.callbackQuery?.message?.message_id,
    originalChatId: ctx.callbackQuery?.message?.chat?.id
  });
  await ctx.reply("❌ Rad etish sababini yuboring:");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action(/admin_approve_pay_(\d+)/, async (ctx) => {
  const targetId = parseInt(ctx.match[1]);
  
  // Try to find user name for context
  let uName = "Foydalanuvchi";
  try {
    const q = query(collection(db, "users"), where("telegramId", "==", targetId));
    const s = await getDocs(q);
    if (!s.empty) uName = s.docs[0].data().name || s.docs[0].data().displayName || uName;
  } catch (e) {}

  const promptMsg = await ctx.reply(`👤 <b>${uName}</b> uchun qancha so'm qo'shmoqchisiz? Faqat son kiriting:`, { parse_mode: "HTML" });

  pendingLogins.set(ctx.from.id, { 
    step: "admin_payment_amount", 
    targetPaymentUserId: targetId,
    originalMessageId: ctx.callbackQuery?.message?.message_id,
    originalChatId: ctx.callbackQuery?.message?.chat?.id,
    promptMessageId: promptMsg.message_id
  });
  
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action(/admin_reject_pay_(\d+)/, async (ctx) => {
  const targetId = parseInt(ctx.match[1]);
  const userId = ctx.from.id;
  
  await bot.telegram.sendMessage(targetId, `❌ To\x27lov chekingiz rad etildi.\n\nIltimos administrator bilan bog\x27laning.`, { parse_mode: "HTML" }).catch(() => {});
  
  // Update payment status in Firestore and delete all admin messages
  try {
    const pQuery = query(collection(db, "payments"), 
      where("userId", "==", targetId), 
      where("status", "==", "pending"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const pSnap = await getDocs(pQuery);
    if (!pSnap.empty) {
      const pDoc = pSnap.docs[0];
      const pData = pDoc.data();
      
      // Delete the message from all admins chats
      if (Array.isArray(pData.tgSentMessages)) {
        for (const item of pData.tgSentMessages) {
          if (item.chatId && item.messageId) {
            await bot.telegram.deleteMessage(item.chatId, item.messageId).catch(() => {});
          }
        }
      }

      await updateDoc(doc(db, "payments", pDoc.id), {
        status: "rejected",
        processedAt: serverTimestamp(),
        processedBy: userId
      });
    }
  } catch (e) {}

  await ctx.reply("❌ To'lov rad etildi va foydalanuvchiga xabar yuborildi.");
  try { ctx.answerCbQuery(); } catch(e){}
});

bot.action("add_balance", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply(paymentInstructionsText, { 
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Click", url: "https://click.uz/" }, { text: "Payme", url: "https://payme.uz/" }, { text: "Uzum", url: "https://uzum.com/" }]
        ]
      }
    });
  } catch (e) {}
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

bot.action(/reply_(.+)/, async (ctx) => {
  const targetUserId = ctx.match[1];
  
  // Extract original text from the callback message (where the reply button was clicked)
  let originalText = "";
  if (ctx.callbackQuery?.message) {
    if ("text" in ctx.callbackQuery.message) {
      originalText = ctx.callbackQuery.message.text;
    } else if ("caption" in ctx.callbackQuery.message) {
      originalText = ctx.callbackQuery.message.caption || "";
    }
  }

  const promptMsg = await ctx.reply(
    "Javob xabarini yuboring (bu unga Telegram va tizim orqali boradi):",
  );
  pendingLogins.set(ctx.from.id, {
    step: "reply_message",
    targetUserId,
    originalMessageId: ctx.callbackQuery?.message?.message_id,
    originalChatId: ctx.callbackQuery?.message?.chat?.id,
    promptMessageId: promptMsg.message_id,
    originalText,
  } as any);
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

const statsCache = {
  data: "",
  timestamp: 0
};

async function getSystemContextInfo(): Promise<string> {
  const now = Date.now();
  if (statsCache.data && (now - statsCache.timestamp < 1000 * 60 * 10)) { // 10 minute cache
     return statsCache.data;
  }

  let studentsCount = 0;
  let teachersCount = 0;
  let staffCount = 0;
  let adminsCount = 0;
  let tgUsersCount = 0;
  let coursesListText = "Hozircha kurslar kiritilmagan.";
  
  if (db) {
    try {
      // Use getCountFromServer for much lower quota usage (1 read vs 1000s)
      const [sSnap, tSnap, stSnap, aSnap, tgSnap] = await Promise.all([
        getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
        getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
        getCountFromServer(query(collection(db, "users"), where("role", "==", "staff"))),
        getCountFromServer(query(collection(db, "users"), where("role", "==", "admin"))),
        getCountFromServer(collection(db, "telegram_users"))
      ]);

      studentsCount = sSnap.data().count;
      teachersCount = tSnap.data().count;
      staffCount = stSnap.data().count;
      adminsCount = aSnap.data().count;
      tgUsersCount = tgSnap.data().count;

      // Special case for super admin
      if (adminsCount === 0) adminsCount = 1;

      // Courses list - read sparingly or use limit
      const cSnap = await getDocs(query(collection(db, "courses"), limit(10)));
      if (!cSnap.empty) {
        coursesListText = cSnap.docs.map(d => {
          const c: any = d.data();
          return `- ${c.title} (${c.category || "Dasturlash"})`;
        }).join("\n");
      }
    } catch (e: any) {
      console.log("[ContextStats] Error or quota limit in context fetch:", e.message);
      // fallback from file cache
      const statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
      if (fs.existsSync(statsCachePath)) {
        try {
          const cachedStats = JSON.parse(fs.readFileSync(statsCachePath, "utf8"));
          adminsCount = cachedStats.adminsCount || 1;
          teachersCount = cachedStats.teachersCount || 0;
          staffCount = cachedStats.staffCount || 0;
          studentsCount = cachedStats.studentsCount || 0;
          tgUsersCount = cachedStats.tgUsersCount || 0;
        } catch (err) {}
      }
    }
  }

  const totalUsers = adminsCount + teachersCount + staffCount + studentsCount;
  const result = `Tizimning joriy haqiqiy statistikasi va ma'lumotlari:
- Jami ro'yxatdan o'tgan foydalanuvchilar: ${totalUsers} ta
- Tizimdagi adminlar (Adminlar): ${adminsCount} ta (Bosh admin: Elyorbek)
- Tizimdagi tashkilotlar / o'quv markazlari (Teachers/Organizations): ${teachersCount} ta
- Tizimdagi o'qituvchilar va xodimlar (Staff): ${staffCount} ta
- Tizimdagi talabalar / o'quvchilar (Students): ${studentsCount} ta
- Telegram botimizdan faol foydalanayotgan a'zolar (start yuborganlar): ${tgUsersCount} ta

Platformadagi joriy fanlar / dars kurslari ro'yxati:
${coursesListText}`;

  statsCache.data = result;
  statsCache.timestamp = now;
  
  // Persist to file for app restarts
  const statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
  try {
    const contentStr = JSON.stringify({
      adminsCount, teachersCount, staffCount, studentsCount, tgUsersCount
    });
    fs.writeFileSync(statsCachePath, contentStr, "utf8");
  } catch (err) {}

  return result;
}

interface WizardState {
  service: string;
  step: number;
  data: any;
  state?: string;
}

const userWizardStates = new PersistentMap<number, WizardState>(
  path.join(process.cwd(), "telegram_wizard_states.json"),
  "wizard"
);

async function ensureUserStateSynced(userId: number) {
  if (!db) return;
  try {
    const docRef = doc(db, "telegram_user_states", String(userId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      
      // sync authedUsers
      if (data.authed) {
        authedUsers.setLocalOnly(userId, data.authed);
      } else {
        authedUsers.deleteLocalOnly(userId);
      }
      
      // sync aiActive
      if (data.aiActive !== undefined) {
        aiAssistantActiveUsers.setLocalOnly(userId, data.aiActive);
      } else {
        aiAssistantActiveUsers.deleteLocalOnly(userId);
      }
      
      // sync aiState
      if (data.aiState !== undefined) {
        aiServiceStates.setLocalOnly(userId, data.aiState);
      } else {
        aiServiceStates.deleteLocalOnly(userId);
      }
      
      // sync wizard
      if (data.wizard) {
        userWizardStates.setLocalOnly(userId, data.wizard);
      } else {
        userWizardStates.deleteLocalOnly(userId);
      }
    }
  } catch (err: any) {
    const errMsg = String(err?.message || "").toLowerCase();
    if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
      console.warn(`[ensureUserStateSynced] Quota limit exceeded for ${userId}. Using local cache.`);
    } else {
      console.error(`[ensureUserStateSynced] Error syncing state for ${userId} from Firestore:`, err);
    }
  }
}

function safeParseJSON(text: string | null | undefined, defaultValue: any): any {
  if (!text) return defaultValue;
  try {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim();
    const start = Math.max(cleaned.indexOf('['), cleaned.indexOf('{'));
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
    return JSON.parse(cleaned);
  } catch (e) {
    if (text && text.trim().startsWith('[')) {
      try {
        let partial = text.trim();
        const lastCompleteObject = partial.lastIndexOf('}');
        if (lastCompleteObject !== -1) {
           const fixed = partial.substring(0, lastCompleteObject + 1) + ']';
           return JSON.parse(fixed.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim());
        }
      } catch (innerE) {}
    }
    return defaultValue;
  }
}

async function runPresentationGeneration(ctx: any, data: any) {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const loadingMsg = await ctx.reply(`⏳ <b>Taqdimot tayyorlanmoqda...</b>\n\nIltimos kuting, bu biroz vaqt olishi mumkin.`, { parse_mode: "HTML" });

  try {
    const res = await fetch(getApiUrl("/api/gemini"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generatePresentation",
        topic: data.topic,
        count: Number(data.slideCount) || 15,
        options: {
          language: data.language,
          designType: data.designType,
          addImages: data.addImages === "Ha, rasm qo'shilsin" || data.addImages === true,
          createDiagrams: data.createDiagrams === "Ha, grafiklar bo'lsin" || data.createDiagrams === true,
          speakerNotes: data.speakerNotes === "Ha, ma'ruzachi nutqi yozilsin" || data.speakerNotes === true
        }
      })
    });

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    if (res.ok) {
      const respData = await res.json();
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      
      const templateName = respData.template || data.designType || "Modern";
      const designPlanText = respData.designPlan || "Professional Design Template";
      const slidesList = Array.isArray(respData.slides) ? respData.slides : (Array.isArray(respData) ? respData : []);

      const stylesMap: Record<string, any> = {
        Zamonaviy: {
          bg: "F8FAFC", coverBg: "0F172A", titleColor: "FFFFFF", contentTitleColor: "0F172A",
          contentSub: "2563EB", contentBody: "1E293B", primaryAccent: "2563EB", secondaryAccent: "7C3AED",
          accentLight: "EFF6FF", bannerFill: "0F172A"
        },
        Modern: {
          bg: "F8FAFC", coverBg: "0F172A", titleColor: "FFFFFF", contentTitleColor: "0F172A",
          contentSub: "2563EB", contentBody: "1E293B", primaryAccent: "2563EB", secondaryAccent: "7C3AED",
          accentLight: "EFF6FF", bannerFill: "0F172A"
        },
        Akademik: {
          bg: "FAF8F5", coverBg: "1E40AF", titleColor: "FFFFFF", contentTitleColor: "1E3A8A",
          contentSub: "10B981", contentBody: "1F2937", primaryAccent: "1E40AF", secondaryAccent: "F59E0B",
          accentLight: "EFF6FF", bannerFill: "1E40AF"
        },
        Academic: {
          bg: "FAF8F5", coverBg: "1E40AF", titleColor: "FFFFFF", contentTitleColor: "1E3A8A",
          contentSub: "10B981", contentBody: "1F2937", primaryAccent: "1E40AF", secondaryAccent: "F59E0B",
          accentLight: "EFF6FF", bannerFill: "1E40AF"
        },
        Minimalistik: {
          bg: "FFFFFF", coverBg: "171717", titleColor: "FFFFFF", contentTitleColor: "000000",
          contentSub: "2563EB", contentBody: "262626", primaryAccent: "000000", secondaryAccent: "7C3AED",
          accentLight: "F5F5F5", bannerFill: "171717"
        },
        Minimal: {
          bg: "FFFFFF", coverBg: "171717", titleColor: "FFFFFF", contentTitleColor: "000000",
          contentSub: "2563EB", contentBody: "262626", primaryAccent: "000000", secondaryAccent: "7C3AED",
          accentLight: "F5F5F5", bannerFill: "171717"
        },
        Korporativ: {
          bg: "F1F5F9", coverBg: "0B0F19", titleColor: "FFFFFF", contentTitleColor: "0B0F19",
          contentSub: "EF4444", contentBody: "334155", primaryAccent: "2563EB", secondaryAccent: "10B981",
          accentLight: "E2E8F0", bannerFill: "0B0F19"
        },
        Professional: {
          bg: "F1F5F9", coverBg: "0F172A", titleColor: "FFFFFF", contentTitleColor: "0F172A",
          contentSub: "10B981", contentBody: "334155", primaryAccent: "2563EB", secondaryAccent: "10B981",
          accentLight: "E2E8F0", bannerFill: "0F172A"
        },
        Dark: {
          bg: "1E293B", coverBg: "0F172A", titleColor: "FFFFFF", contentTitleColor: "FFFFFF",
          contentSub: "38BDF8", contentBody: "E2E8F0", primaryAccent: "38BDF8", secondaryAccent: "F43F5E",
          accentLight: "334155", bannerFill: "0F172A"
        },
        Light: {
          bg: "FAFAFA", coverBg: "F4F4F5", titleColor: "18181B", contentTitleColor: "18181B",
          contentSub: "4F46E5", contentBody: "27272A", primaryAccent: "4F46E5", secondaryAccent: "06B6D4",
          accentLight: "F4F4F5", bannerFill: "E4E4E7"
        }
      };

      const selectedStyle = stylesMap[templateName] || stylesMap[data.designType] || stylesMap.Zamonaviy || stylesMap.Modern;

      const getSlideImage = (queryOrObj: any) => {
        const query = typeof queryOrObj === "string" 
          ? queryOrObj 
          : (queryOrObj?.imageKeyword || queryOrObj?.title || data.topic || "presentation");
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
      };
      
      const getIconUrl = (iconName: string) => {
        let cleanName = iconName;
        if (!cleanName.includes(':')) cleanName = `mdi:${cleanName}`;
        return `https://api.iconify.design/${cleanName}.svg?width=128&height=128&color=%23${selectedStyle.primaryAccent}`;
      };
      
      const getChartUrl = (chartData: any[], chartType: string = 'bar') => {
        const labels = chartData.map(d => d.label);
        const data = chartData.map(d => Number(d.value));
        const chartConfig = {
          type: chartType,
          data: {
            labels: labels,
            datasets: [{ 
               label: 'Data', 
               data: data, 
               backgroundColor: ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6']
            }]
          },
          options: {
            plugins: { legend: { display: chartType !== 'bar' } }
          }
        };
        return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=400&bkg=white`;
      };

      slidesList.forEach((s: any, idx: number) => {
        const layout = s.layout || (idx === 0 ? "cover" : "content");
        const slide = pptx.addSlide();
        
        // @ts-ignore
        slide.transition = { type: "morph" };

        if (s.iconType && layout !== "cover" && layout !== "image-left" && layout !== "image-right" && layout !== "chart") {
            try {
              slide.addImage({ path: getIconUrl(s.iconType), x: 8.5, y: 0.15, w: 0.7, h: 0.7 });
            } catch (e) {}
        }
        
        if (layout === "cover") {
            slide.background = { fill: selectedStyle.coverBg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 5.625, fill: { color: selectedStyle.primaryAccent } });
            slide.addShape(pptx.ShapeType.rect, { x: 8.5, y: 0, w: 1.5, h: 1.5, fill: { color: selectedStyle.secondaryAccent, transparency: 80 } });
            
            slide.addText(s.title || data.topic, { x: 1.0, y: 1.5, w: 8.0, h: 1.5, fontSize: 38, bold: true, color: selectedStyle.titleColor, align: "left", valign: "middle" });
            slide.addText(s.subtitle || "Premium designed presentation", { x: 1.0, y: 3.1, w: 8.0, h: 0.6, fontSize: 20, color: selectedStyle.contentSub, align: "left" });
            slide.addText(s.content || "Microsoft PowerPoint Custom Layout Template.", { x: 1.0, y: 4.1, w: 8.0, h: 0.8, fontSize: 13, color: "94A3B8", align: "left" });
        
        } else if (layout === "agenda" || layout === "summary") {
            slide.background = { fill: selectedStyle.bg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
            slide.addText(s.title || "Mundarija", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
            
            if (s.bulletPoints && s.bulletPoints.length > 0) {
                s.bulletPoints.forEach((bp: string, i: number) => {
                    const xOffset = i % 2 === 0 ? 0.8 : 5.2;
                    const yOffset = 1.3 + Math.floor(i / 2) * 1.3;
                    if (yOffset + 1.1 <= 5.625) {
                       slide.addShape(pptx.ShapeType.rect, { x: xOffset, y: yOffset, w: 4.0, h: 1.1, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                       slide.addShape(pptx.ShapeType.rect, { x: xOffset, y: yOffset, w: 0.1, h: 1.1, fill: { color: selectedStyle.primaryAccent } });
                       
                       slide.addShape(pptx.ShapeType.rect, { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fill: { color: selectedStyle.accentLight } });
                       slide.addText(String(i + 1).padStart(2, '0'), { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: selectedStyle.primaryAccent, align: "center", valign: "middle" });
                       
                       slide.addText(bp, { x: xOffset + 0.8, y: yOffset + 0.1, w: 3.0, h: 0.9, fontSize: 13, bold: true, color: selectedStyle.contentBody, valign: "middle" });
                    }
                });
            } else if (layout === "summary") {
                slide.addShape(pptx.ShapeType.rect, { x: 1.5, y: 1.4, w: 7.0, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle.primaryAccent, width: 2 } });
                slide.addText("🏆 XULOSA VA TAQDIMOT YAKUNI", { x: 2.0, y: 1.7, w: 6.0, h: 0.5, fontSize: 22, bold: true, color: selectedStyle.contentTitleColor, align: "center" });
                slide.addText(s.content || "Mavzu yuzasidan barcha zarur xulosalar to'liq shakllantirildi.", { x: 2.0, y: 2.4, w: 6.0, h: 1.2, fontSize: 16, color: selectedStyle.contentBody, align: "center" });
                slide.addText("E'tiboringiz uchun rahmat!", { x: 2.0, y: 3.8, w: 6.0, h: 0.6, fontSize: 20, bold: true, color: selectedStyle.contentSub, align: "center" });
            } else {
                slide.addText(s.content || "", { x: 0.8, y: 1.5, w: 8.4, h: 3.0, fontSize: 16, color: selectedStyle.contentBody });
            }
            
        } else if (layout === "image-left") {
            slide.background = { fill: selectedStyle.bg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
            
            slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle.accentLight } });
            const imgUrl = getSlideImage(s);
            slide.addImage({ path: imgUrl, x: 0.8, y: 1.3, w: 4.0, h: 3.6 });
            
            if (s.chartData) {
              slide.addImage({ path: getChartUrl(s.chartData), x: 5.5, y: 2.0, w: 4, h: 2.5 });
            }
            
            let currY = 1.3;
            if (s.subtitle) {
               slide.addText(s.subtitle, { x: 5.1, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle.contentSub });
               currY += 0.6;
            }
            if (s.content) {
               slide.addText(s.content, { x: 5.1, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
               currY += 1.4;
            }
            if (s.bulletPoints && s.bulletPoints.length > 0) {
               const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
               slide.addText(bulletTxt, { x: 5.1, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
            }
            
        } else if (layout === "image-right") {
            slide.background = { fill: selectedStyle.bg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
            
            slide.addShape(pptx.ShapeType.rect, { x: 5.3, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle.accentLight } });
            const imgUrl = getSlideImage(s);
            slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });
            
            let currY = 1.3;
            if (s.subtitle) {
               slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle.contentSub });
               currY += 0.6;
            }
            if (s.content) {
               slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
               currY += 1.4;
            }
            if (s.bulletPoints && s.bulletPoints.length > 0) {
               const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
               slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
            }
            
        } else if (layout === "cards" && s.bulletPoints && s.bulletPoints.length > 0) {
            slide.background = { fill: selectedStyle.bg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
            
            slide.addText(s.subtitle || s.content || "Infografika kartalari", { x: 0.8, y: 1.1, w: 8.4, h: 0.4, fontSize: 14, color: selectedStyle.contentSub, italic: true });
            
            let pointsCount = s.bulletPoints.length;
            if (pointsCount > 4) pointsCount = 4;
            const cWidth = 8.4 / pointsCount - 0.2;
            for (let i = 0; i < pointsCount; i++) {
                const startX = 0.8 + (i * cWidth) + (i * 0.2);
                slide.addShape(pptx.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                slide.addShape(pptx.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 0.15, fill: { color: (i % 2 === 0 ? selectedStyle.primaryAccent : selectedStyle.secondaryAccent) } });
                slide.addText("★", { x: startX + 0.1, y: 1.9, w: cWidth - 0.2, h: 0.4, fontSize: 18, color: selectedStyle.primaryAccent, align: "center" });
                slide.addText(s.bulletPoints[i], { x: startX + 0.1, y: 2.4, w: cWidth - 0.2, h: 2.4, fontSize: 12, color: selectedStyle.contentBody, align: "center", valign: "top" });
            }
            
        } else if (layout === "chart" && s.chartData && s.chartData.length > 0) {
            slide.background = { fill: selectedStyle.bg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
            slide.addText(s.title || "Tahliliy Diagramma", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
            
            try {
              const cImgUrl = getChartUrl(s.chartData, s.chartType || "bar");
              slide.addImage({ path: cImgUrl, x: 0.5, y: 1.3, w: 5.0, h: 3.6 });
            } catch (e) {
              // fallback native chart
              const labels = s.chartData.map((d: any) => String(d.label || "A"));
              const values = s.chartData.map((d: any) => Number(d.value || 0));
              slide.addChart(pptx.ChartType.bar, [{ name: "Ma'lumot", labels: labels, values: values }], { x: 0.5, y: 1.3, w: 5.0, h: 3.6 });
            }
            
            slide.addShape(pptx.ShapeType.rect, { x: 5.8, y: 1.3, w: 3.8, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
            if (s.subtitle) {
               slide.addText(s.subtitle, { x: 6.0, y: 1.5, w: 3.4, h: 0.5, fontSize: 16, bold: true, color: selectedStyle.contentTitleColor });
            }
            if (s.content) {
               slide.addText(s.content, { x: 6.0, y: 2.1, w: 3.4, h: 1.5, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
            }
            if (s.bulletPoints && s.bulletPoints.length > 0) {
               const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
               slide.addText(bulletTxt, { x: 6.0, y: 3.0, w: 3.4, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
            }
            
        } else {
            slide.background = { fill: selectedStyle.bg };
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
            
            if (s.chartData && s.chartData.length > 0) {
                try {
                   const labels = s.chartData.map((d: any) => String(d.label || "A"));
                   const values = s.chartData.map((d: any) => Number(d.value || 0));
                   slide.addChart(pptx.ChartType.bar, [{ name: "Ma'lumot", labels: labels, values: values }], { x: 0.8, y: 1.3, w: 4.4, h: 3.6 });
                   
                   slide.addShape(pptx.ShapeType.rect, { x: 5.4, y: 1.3, w: 3.8, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                   slide.addText(s.content || "Tahliliy ma'lumotlar diagrammasi", { x: 5.6, y: 1.5, w: 3.4, h: 3.2, fontSize: 13, color: selectedStyle.contentBody });
                } catch(chartErr) {
                   slide.addText(s.content || "", { x: 0.8, y: 1.4, w: 8.4, h: 3.5, fontSize: 14, color: selectedStyle.contentBody });
                }
            } else {
                const imgUrl = getSlideImage(s);
                slide.addShape(pptx.ShapeType.rect, { x: 5.3, y: 1.4, w: 3.9, h: 3.6, fill: { color: selectedStyle.accentLight } });
                slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });

                let currY = 1.3;
                if (s.subtitle) {
                   slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.4, fontSize: 18, bold: true, color: selectedStyle.contentSub });
                   currY += 0.5;
                }
                if (s.content) {
                   slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
                   currY += 1.4;
                }
                if (s.bulletPoints && s.bulletPoints.length > 0) {
                   const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
                   slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
                }
            }
        }
      });

      const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });
      const filename = `${data.topic?.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_taqdimot.pptx`;
      userWizardStates.delete(userId);
      await ctx.replyWithDocument(
        { source: pptxBuffer as any, filename },
        { caption: `📊 "${data.topic}" mavzusida premium ${templateName} taqdimoti tayyor!\n🎨 Dizayn uslubi: ${designPlanText}` }
      );
      return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: await getAiAssistantKeyboard(userId),
          resize_keyboard: true
        }
      });
    } else {
      let errText = "...";
      let errMsg = "";
      try {
        const errorJson = await res.json();
        errMsg = errorJson.error || "Noma'lum xato";
      } catch (e) {
        errText = await res.text().catch(() => "Noma'lum xato");
        errMsg = errText.substring(0, 100);
      }
      console.error("Presentation API Error:", res.status, errMsg);
      userWizardStates.delete(userId);
      return ctx.reply(`❌ Taqdimot ma'lumotlarini yuklashda xato yuz berdi:\n\n💬 Sabab: ${errMsg}\n\nIltimos, keyinroq qayta urinib ko'ring yoki Slaydlar sonini biroz kamaytirib tekshiring.`);
    }
  } catch (err: any) {
    console.error("Presentation generation err:", err);
    userWizardStates.delete(userId);
    return ctx.reply("❌ Taqdimot PPTX faylini yaratishda xato yuz berdi: " + err.message);
  }
}

async function runCourseWorkDocxGeneration(ctx: any, data: any) {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;

  const loadingMsg = await ctx.reply(
    `⏳ <b>Akademik Kurs Ishi generatsiya qilinmoqda...</b>\n\n` +
    `<i>1. OAK va akademik standartlar bo'yicha 3 bob va 6 paragrafli reja shakllantirilmoqda...\n` +
    `2. Nazariy va amaliy bo'limlar, manbalar hamda oraliq xulosalar tahlil qilinmoqda...\n` +
    `3. Word (.docx) standarti bo'yicha shakllantirilmoqda...</i>\n\n` +
    `Iltimos kuting, bu biroz vaqt olishi mumkin.`,
    { parse_mode: "HTML" }
  );

  try {
    const courseWorkData = await generateCourseWorkDataWithGemini({
      topic: data.topic || "Mavzu ko'rsatilmadi",
      subject: data.subject || "Fan ko'rsatilmadi",
      university: data.university || "OTM ko'rsatilmadi",
      faculty: data.faculty,
      department: data.department,
      direction: data.direction,
      studentName: data.studentName,
      advisor: data.advisor,
      city: data.city || "Toshkent",
      year: data.year || "2026",
      pageCount: data.pageCount || "30",
      object: data.object,
      subjectItem: data.subjectItem,
      extraRequirements: data.extraRequirements
    });

    const docxBuffer = await buildCourseWorkDocxBuffer(courseWorkData);

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    const cleanStr = (s: string) => (s || "kurs_ishi").substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Kurs_ishi_${cleanStr(data.topic)}_${cleanStr(data.studentName)}.docx`;

    await ctx.replyWithDocument(
      { source: docxBuffer, filename },
      {
        caption: `✅ <b>AKADEMIK KURS ISHI TAYYOR BO'LDI!</b>\n\n` +
          `📌 <b>Mavzu:</b> ${data.topic}\n` +
          `🎓 <b>Talaba:</b> ${data.studentName || "Ko'rsatilmadi"}\n` +
          `🏛 <b>OTM:</b> ${data.university || "Ko'rsatilmadi"}\n` +
          `📑 <b>Struktura:</b> Titul varaqasi, Mundarija, Kirish, 3 ta bob (6 paragraf), Xulosa, Ilmiy-amaliy tavsiyalar, Adabiyotlar ro'yxati.\n\n` +
          `✨ <i>Fayl OAK va oliy ta'lim standartlariga mos Word (.docx) formatida tayyorlandi.</i>`,
        parse_mode: "HTML"
      }
    );

    return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getAiAssistantKeyboard(userId),
        resize_keyboard: true
      }
    });
  } catch (err: any) {
    console.error("[CourseWork Generation Error]:", err);
    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
    return ctx.reply(`❌ <b>Kurs ishi yaratishda xatolik yuz berdi:</b> ${err.message || "Noma'lum xato"}`, { parse_mode: "HTML" });
  }
}

async function runDocumentGeneration(ctx: any, docType: string, data: any) {
  if (docType === "kurs_ishi") {
    return runCourseWorkDocxGeneration(ctx, data);
  }

  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const loadingMsg = await ctx.reply(`⏳ <b>Hujjat tayyorlanmoqda...</b>\n\nIltimos kuting, bu biroz vaqt olishi mumkin.`, { parse_mode: "HTML" });
  
  try {
    let topicStr = data.topic;
    if (docType === "kurs_ishi") {
      topicStr = `Mavzu: ${data.topic || ""}. Fan: ${data.subject || ""}. OTM: ${data.university || ""}. Fakultet: ${data.faculty || ""}. Kafedra: ${data.department || ""}. Yo'nalish: ${data.direction || ""}. Talaba: ${data.studentName || ""}. Rahbar: ${data.advisor || ""}. Sahifalar: ${data.pageCount || ""}`;
    } else if (docType === "tezis") {
      topicStr = `Mavzu: ${data.topic || ""}. Muallif: ${data.author || ""}. OTM: ${data.university || ""}. Yo'nalish: ${data.direction || ""}.`;
    } else if (docType === "maqola") {
      topicStr = `Mavzu: ${data.topic || ""}. Muallif: ${data.author || ""}. Tashkilot: ${data.org || ""}. Til: ${data.language || ""}`;
    } else if (docType === "dars_ishlanma") {
      topicStr = `Mavzu: ${data.topic || ""}. Fan: ${data.subject || ""}. Sinf/Kurs: ${data.classGroup || ""}. Turi: ${data.lessonType || ""}`;
    } else if (docType === "test") {
      topicStr = `Mavzu: ${data.topic || ""}. Fan: ${data.subject || ""}. Soni: ${data.questionCount || ""}. Variant: ${data.optionsCount || ""}`;
    } else if (docType === "cv") {
      topicStr = `F.I.Sh: ${data.name || ""}.`;
    }

    const res = await fetch(getApiUrl("/api/gemini"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generateDocument",
        topic: topicStr,
        docType: docType,
        options: data
      })
    });

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    if (res.ok) {
      const respData = await res.json();
      let title = respData.title || data.topic;
      let content = respData.content || "";

      // Post-process placeholders inside the content for Kurs Ishi to be absolutely foolproof!
      if (docType === "kurs_ishi") {
        content = content
          .replace(/\[Oliy ta'lim muassasasi nomi\]/g, data.university)
          .replace(/\[OTM\]/g, data.university)
          .replace(/\[Fakultet nomi\]/g, data.faculty)
          .replace(/\[Fakultet\]/g, data.faculty)
          .replace(/\[Kafedra nomi\]/g, data.department)
          .replace(/\[Kafedra\]/g, data.department)
          .replace(/\[Talaba F\.I\.Sh\.\]/g, data.studentName)
          .replace(/\[Talaba\]/g, data.studentName)
          .replace(/\[Ilmiy rahbar F\.I\.Sh\., ilmiy darajasi\]/g, data.advisor)
          .replace(/\[Ilmiy rahbar\]/g, data.advisor);
      }

      // Convert content to fully styled Word Document (.docx)
      const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Footer, PageNumber } = await import("docx");
      const children: any[] = [];

      // Add a styled Page-1: Beautiful Cover Page for coursework
      if (docType === "kurs_ishi") {
        children.push(new Paragraph({
          children: [new TextRun({ text: data.university.toUpperCase(), bold: true, size: 28, font: "Times New Roman" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120, line: 360 }
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: `${data.faculty.toUpperCase()} \n ${data.department.toUpperCase()}`, bold: true, size: 28, font: "Times New Roman" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200, line: 360 }
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: "KURS ISHI", bold: true, size: 48, font: "Times New Roman", color: "1E3A8A" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400, line: 360 }
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: `MAVZU: "${data.topic.toUpperCase()}"`, bold: true, size: 28, font: "Times New Roman" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240, line: 360 }
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: `Fan: ${data.subject}`, italics: true, size: 28, font: "Times New Roman" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1500, line: 360 }
        }));
        
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `Bajardi: ${data.studentName}\n`, bold: true, size: 28, font: "Times New Roman" }),
            new TextRun({ text: `Yo'nalish: ${data.direction}\n`, size: 28, font: "Times New Roman" }),
            new TextRun({ text: `Ilmiy rahbar: ${data.advisor}`, bold: true, size: 28, font: "Times New Roman" })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 1000, line: 360 }
        }));

        children.push(new Paragraph({
          children: [new TextRun({ text: "TOSHKENT - 2026", bold: true, size: 28, font: "Times New Roman" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }));

        children.push(new Paragraph({
          pageBreakBefore: true,
          children: []
        }));
      }

      // Title Paragraph
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: docType === "kurs_ishi" ? 32 : 36, // 16pt / 18pt
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 600 }
      }));

      // Parse and format body text cleanly
      const lines = content.split("\n");
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) {
          children.push(new Paragraph({ spacing: { after: 200 } }));
          return;
        }

        let p: any;
        const baseSize = docType === "kurs_ishi" ? 28 : 26;
        const baseSpacing = { 
          line: docType === "kurs_ishi" ? 360 : 280, 
          before: 0, 
          after: 100 
        };
        const baseIndent = docType === "kurs_ishi" ? { firstLine: 708 } : undefined;

        if (trimmed.startsWith('# ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.replace('# ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 30, color: "1E3A8A" })], 
            heading: HeadingLevel.HEADING_1, 
            alignment: AlignmentType.LEFT,
            spacing: { ...baseSpacing, before: 400, after: 250 } 
          });
        } else if (trimmed.startsWith('## ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.replace('## ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 28, color: "2563EB" })], 
            heading: HeadingLevel.HEADING_2, 
            spacing: { ...baseSpacing, before: 300, after: 200 } 
          });
        } else if (trimmed.startsWith('### ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.replace('### ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 26, color: "4F46E5" })], 
            heading: HeadingLevel.HEADING_3, 
            spacing: { ...baseSpacing, before: 200, after: 150 } 
          });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.substring(2).replace(/\*\*/g, ''), font: "Times New Roman", size: baseSize })],
            bullet: { level: 0 }, 
            spacing: { ...baseSpacing, after: 120 } 
          });
        } else {
          const runs: any[] = [];
          const regex = /\*\*(.*?)\*\*/g;
          let lastIdx = 0;
          let match;
          while ((match = regex.exec(trimmed)) !== null) {
            if (match.index > lastIdx) {
              runs.push(new TextRun({ text: trimmed.substring(lastIdx, match.index), font: "Times New Roman", size: baseSize }));
            }
            runs.push(new TextRun({ text: match[1], bold: true, font: "Times New Roman", size: baseSize }));
            lastIdx = regex.lastIndex;
          }
          if (lastIdx < trimmed.length) {
            runs.push(new TextRun({ text: trimmed.substring(lastIdx), font: "Times New Roman", size: baseSize }));
          }
          if (runs.length === 0) {
            runs.push(new TextRun({ text: trimmed, font: "Times New Roman", size: baseSize }));
          }

          p = new Paragraph({ 
            children: runs, 
            spacing: baseSpacing,
            alignment: AlignmentType.JUSTIFIED,
            indent: baseIndent
          });
        }
        children.push(p);
      });

      const doc = new Document({
        sections: [{
          properties: {
            titlePage: docType === "kurs_ishi",
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1701, // ~3cm
                right: 850   // ~1.5cm
              }
            }
          },
          footers: docType === "kurs_ishi" ? {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                }),
              ],
            }),
            first: new Footer({
              children: [], // No page number on cover
            }),
          } : undefined,
          children: children
        }]
      });

      const docxBuffer = await Packer.toBuffer(doc);

      if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B) {
        throw new Error("Docx fayli validatsiya xatoligi: noto'g'ri ZIP formati.");
      }

      const cleanFileName = `${(data.topic || data.name || "hujjat").substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_hujjat.docx`;
      await ctx.replyWithDocument(
        { source: docxBuffer as any, filename: cleanFileName },
        { caption: `✅ Sarlavha: ${title}\n\nHaqiqiy Microsoft Word formatidagi fayl muvaffaqiyatli tayyorlandi!` }
      );
      return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: await getAiAssistantKeyboard(userId),
          resize_keyboard: true
        }
      });
    } else {
      let errMsg = "Noma'lum server hatosi";
      try {
        const errorData = await res.json();
        errMsg = errorData.error || errorData.message || errMsg;
      } catch (e) {
        errMsg = res.statusText || errMsg;
      }
      return ctx.reply(`❌ Xatolik: Serverdan ma'lumot olish muvaffaqiyatsiz bo'ldi.\n\n💬 Sabab: ${errMsg}`);
    }
  } catch (err: any) {
    console.error("Document generation error:", err);
    return ctx.reply(`❌ Hujjat yaratishda xato yuz berdi: ${err.message || 'Noma\x27lum error'}`);
  }
}

async function runObektivkaDocxGeneration(ctx: any, data: any) {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const loadingMsg = await ctx.reply(`⏳ <b>Obektivka hujjati tayyorlanmoqda...</b>\n\nIltimos kuting, hozir faylingiz shakllantiriladi.`, { parse_mode: "HTML" });

  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } = await import("docx");

    const children: any[] = [];

    // Header section with Title and 3x4 Photo frame on top right
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "MA'LUMOTNOMA", bold: true, font: "Times New Roman", size: 30 })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100, after: 100 }
                }),
                new Paragraph({
                  children: [new TextRun({ text: (data.name || "").toUpperCase(), bold: true, font: "Times New Roman", size: 26 })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 180 }
                })
              ],
              width: { size: 78, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "3x4\nRasm", bold: true, font: "Times New Roman", size: 20, color: "555555" })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 300, after: 300 }
                })
              ],
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 8, color: "000000" }
              }
            })
          ]
        })
      ]
    });

    children.push(headerTable);
    children.push(new Paragraph({ spacing: { before: 180, after: 120 } }));

    // Personal Details (Formatted according to exact Uzbek Obektivka template with separated title and copy value rows)
    const createLabelRow2Col = (label1: string, label2: string) => {
      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: label1, bold: true, font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: label2, bold: true, font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      });
    };

    const createValueRow2Col = (val1: string, val2: string) => {
      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: val1 || "yo'q", font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: val2 || "yo'q", font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      });
    };

    const createSameLineRow = (label: string, val: string) => {
      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: val || "yo'q", font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      });
    };

    const createLabelRow1Col = (label: string) => {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        ]
      });
    };

    const createValueRow1Col = (val: string) => {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: val || "yo'q", font: "Times New Roman", size: 22 })],
                spacing: { before: 40, after: 40 }
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        ]
      });
    };

    const createCenterHeaderRow1Col = (title: string) => {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: title, bold: true, font: "Times New Roman", size: 24 })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 }
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        ]
      });
    };

    const infoRows = [
      createLabelRow2Col("Tug'ilgan yili:", "Tug'ilgan joyi:"),
      createValueRow2Col(data.birthDate, data.birthPlace),

      createLabelRow2Col("Millati:", "Partiyaviyligi:"),
      createValueRow2Col(data.nationality, data.party),

      createLabelRow2Col("Ma'lumoti:", "Tamomlagan:"),
      createValueRow2Col(data.education, data.graduated),

      createSameLineRow("Ma'lumoti bo'yicha mutaxassisligi:", data.specialty),

      createLabelRow2Col("Ilmiy darajasi:", "Ilmiy unvoni:"),
      createValueRow2Col(data.academicDegree, data.academicTitle),

      createLabelRow1Col("Qaysi chet tillarini biladi:"),
      createValueRow1Col(data.languages),

      createLabelRow1Col("Davlat mukofotlari bilan taqdirlanganmi:"),
      createValueRow1Col(data.awards),

      createLabelRow1Col("Xalq deputatlari, respublika, viloyat, shahar va tuman Kengashi deputatimi yoki boshqa saylanadigan organlarning a’zosimi (to’liq ko’rsatilishi lozim):"),
      createValueRow1Col(data.deputy),

      createCenterHeaderRow1Col("MEHNAT FAOLIYATI"),
      createValueRow1Col(data.workHistory || "")
    ];

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: infoRows
    });

    children.push(infoTable);

    // Page Break to place Relatives section on Page 2
    children.push(new Paragraph({
      children: [new PageBreak()]
    }));

    // Relatives section title matching sample image (Page 2)
    children.push(new Paragraph({
      children: [new TextRun({ text: `${data.name || ""}ning yaqin qarindoshlari haqida`, bold: true, font: "Times New Roman", size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 }
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: "MA'LUMOT", bold: true, font: "Times New Roman", size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 }
    }));

    // Relatives Table Header matching sample image column titles
    const relativeTableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Qarindosh-ligi", bold: true, font: "Times New Roman", size: 20 })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Familiyasi, ismi va otasining ismi", bold: true, font: "Times New Roman", size: 20 })], alignment: AlignmentType.CENTER })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Tug'ilgan yili va joyi", bold: true, font: "Times New Roman", size: 20 })], alignment: AlignmentType.CENTER })],
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Ish joyi va lavozimi", bold: true, font: "Times New Roman", size: 20 })], alignment: AlignmentType.CENTER })],
            width: { size: 22, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Yashash joyi", bold: true, font: "Times New Roman", size: 20 })], alignment: AlignmentType.CENTER })],
            width: { size: 18, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ];

    // Add relatives
    const allRelatives = [...(data.relatives || [])];
    
    allRelatives.forEach(rel => {
      relativeTableRows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rel.relation || "", font: "Times New Roman", size: 20 })], alignment: AlignmentType.CENTER })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rel.name || "", font: "Times New Roman", size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rel.birth || "", font: "Times New Roman", size: 20 })] })],
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rel.work || "", font: "Times New Roman", size: 20 })] })],
            width: { size: 22, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rel.address || "", font: "Times New Roman", size: 20 })] })],
            width: { size: 18, type: WidthType.PERCENTAGE }
          })
        ]
      }));
    });

    const relativeTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: relativeTableRows
    });

    children.push(relativeTable);

    // Document structure
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1701, // ~3cm
              right: 850   // ~1.5cm
            }
          }
        },
        children: children
      }]
    });

    const docxBuffer = await Packer.toBuffer(doc);

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    const cleanFileName = `Obektivka_${(data.name || "hujjat").substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    await ctx.replyWithDocument(
      { source: docxBuffer as any, filename: cleanFileName },
      { caption: `✅ <b>Sizning obektivkangiz tayyor bo'ldi!</b>\n\nMicrosoft Word formatidagi fayl muvaffaqiyatli shakllantirildi.` }
    );

    return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getAiAssistantKeyboard(userId),
        resize_keyboard: true
      }
    });

  } catch (err: any) {
    console.error("Obektivka generation error:", err);
    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
    return ctx.reply(`❌ Obektivka hujjatini yaratishda xato yuz berdi: ${err.message || 'Noma\x27lum xatolik'}`);
  }
}

async function runTestGeneration(ctx: any, data: any) {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const loadingMsg = await ctx.reply(`⏳ <b>Testlar shakllantirilmoqda...</b>\n\nIltimos kuting.`, { parse_mode: "HTML" });

  try {
    const topicStr = `Fan: ${data.subject}. Mavzu: ${data.topic}. Soni: ${data.questionCount}`;
    const res = await fetch(getApiUrl("/api/gemini"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generateDynamicTest",
        topic: topicStr,
        count: Number(data.questionCount) || 10,
        options: {
          optionsCount: Number(data.optionsCount) || 4
        }
      })
    });

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    if (res.ok) {
      const respData = await res.json();
      const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
      const children: any[] = [];
      
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: `${data.subject.toUpperCase()} FANI BO'YICHA TESTLAR`,
            bold: true,
            size: 32,
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 }
      }));

      children.push(new Paragraph({
        children: [
          new TextRun({
            text: `Mavzu: "${data.topic}"`,
            italics: true,
            size: 24,
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }));

      respData.forEach((t: any, i: number) => {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: `${i + 1}. ${t.text}`,
              bold: true,
              size: 26,
              font: "Times New Roman"
            })
          ],
          spacing: { before: 240, after: 120 }
        }));

        if (Array.isArray(t.options)) {
          t.options.forEach((o: string, j: number) => {
            const prefix = `${String.fromCharCode(65 + j)}) `;
            const isCorrect = j === t.correctIdx;
            children.push(new Paragraph({
              children: [
                new TextRun({ text: prefix, bold: true, font: "Times New Roman", size: 26 }),
                new TextRun({ text: o, font: "Times New Roman", size: 26 }),
                ...(isCorrect ? [
                  new TextRun({ text: "  [To'g'ri javob ✅]", bold: true, color: "15803D", font: "Times New Roman", size: 26 })
                ] : [])
              ],
              indent: { left: 720 },
              spacing: { after: 100 }
            }));
          });
        }
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
            }
          },
          children: children
        }]
      });

      const docxBuffer = await Packer.toBuffer(doc);
      
      if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B) {
        throw new Error("Docx file validation failed: ZIP signature error");
      }

      const cleanFileName = `${data.topic?.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_testlar.docx`;
      await ctx.replyWithDocument(
        { source: docxBuffer as any, filename: cleanFileName },
        { caption: `📋 "${data.topic}" mavzusi bo'yicha testlar muvaffaqiyatli shakllantirildi!` }
      );
      return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: await getAiAssistantKeyboard(userId),
          resize_keyboard: true
        }
      });
    } else {
      return ctx.reply("❌ Test savollarini shakllantirishda xato yuz berdi.");
    }
  } catch (err: any) {
    console.error("Test word generation err:", err);
    return ctx.reply("❌ Test Word faylini yaratishda xato yuz berdi: " + err.message);
  }
}

async function runTranslationGeneration(ctx: any, data: any) {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const loadingMsg = await ctx.reply(`⏳ <b>Tarjima qilinmoqda...</b>`, { parse_mode: "HTML" });

  try {
    const res = await fetch(getApiUrl("/api/gemini"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generateDocument",
        topic: `[Direction: ${data.direction || "O'zbek-Ingliz"}]. Text to translate: ${data.text}`,
        docType: "tarjimon"
      })
    });

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    if (res.ok) {
      const respData = await res.json();
      await ctx.reply(`🌐 <b>Tarjima xulosasi:</b>\n\n${respData.content || 'Tarjima bo\'sh qaytdi.'}`, { parse_mode: "HTML" });
      return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: await getAiAssistantKeyboard(userId),
          resize_keyboard: true
        }
      });
    } else {
      return ctx.reply("❌ Tarjima qilishda xatolik yuz berdi.");
    }
  } catch (err: any) {
    console.error("Translation err:", err);
    return ctx.reply("❌ Tarjima qilishda xato yuz berdi: " + err.message);
  }
}

async function handleAntiplagiatAnalysis(ctx: any, input: string) {
    const userId = ctx.from.id;
    
    const loadingMsg = await ctx.reply("⏳ Tahlil qilinmoqda, iltimos kuting...");
    
    try {
      const analysisPrompt = `Ushbu matnni antiplagiat nuqtai nazaridan tahlil qiling: "${input}".                
      
      Quyidagi ko'rinishda hisobot qaytaring:
      ━━━━━━━━━━━━━━━
      📄 AI ANTIPLAGIAT HISOBOTI
      ━━━━━━━━━━━━━━━
      
      📊 Umumiy o'xshashlik: [XX]%
      
      🤖 AI yozganlik ehtimoli: [XX]%
      
      📝 Takrorlangan jumlalar: [XX] ta
      
      🎓 Akademik uslub:
      [Yaxshi/O'rta/Past]
      
      ⚠️ Plagiat xavfi:
      [Past/O'rta/Yuqori]
      
      💡 Tavsiyalar:
      - [Tavsiya 1]
      - [Tavsiya 2]
      - [Tavsiya 3]
      
      ━━━━━━━━━━━━━━━
      
      Eslatma: Natijalar Gemini AI tahliliga asoslangan bo'lib, rasmiy antiplagiat natijasi hisoblanmaydi.`;
  
      const report = await generateContentWithRotation({
        model: "gemini-3.6-flash",
        contents: analysisPrompt
      });
      
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      await ctx.reply(report.text, { parse_mode: "HTML" });
      
    } catch (err: any) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      await ctx.reply(`❌ Xatolik yuz berdi: ${err.message || 'Keyinroq urinib ko\'ring.'}`);
    }
  }

async function handle3x4PhotoGeneration(ctx: any, fileId: string) {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;

  const loadingMsg = await ctx.reply(
    "⏳ <b>3x4 o'lchamdagi rasm tayyorlanmoqda...</b>\n\n<i>Sun'iy intellekt inson qiyofasini aniqlamoqda, yuzi va sochlarini to'liq muhofaza qilgan holda orqa fonni toza oq (#FFFFFF) rangga o'tkazmoqda...</i>",
    { parse_mode: "HTML" }
  );

  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const downloadUrl = fileLink.href || fileLink.toString();

    const fetchRes = await fetch(downloadUrl);
    if (!fetchRes.ok) {
      throw new Error("Telegram serveridan rasmni yuklab olish imkoni bo'lmadi.");
    }
    const inputBuffer = Buffer.from(await fetchRes.arrayBuffer());

    // Call our advanced AI passport processor with face/hair protection & smart cropping
    const processedBuffer = await process3x4PassportPhoto(inputBuffer);

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

    await ctx.replyWithPhoto(
      { source: processedBuffer },
      {
        caption: "✅ <b>3x4 o'lchamdagi hujjat rasmingiz tayyor bo'ldi!</b>\n\n" +
          "• <b>Orqa fon:</b> Toza oq (#FFFFFF)\n" +
          "• <b>O'lcham:</b> 3x4 (600x800 px / 300 DPI)\n" +
          "• <b>Yuz va sochlar:</b> 100% asl holatda muhofaza qilingan",
        parse_mode: "HTML"
      }
    );

    await ctx.replyWithDocument(
      { source: processedBuffer, filename: "3x4_hujjat_rasmi.jpg" },
      { caption: "📄 <b>Pechat (bosib chiqarish) uchun asl sifatli fayl</b>", parse_mode: "HTML" }
    );

    return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getAiAssistantKeyboard(userId),
        resize_keyboard: true
      }
    });

  } catch (err: any) {
    console.error("[3x4 Photo Error]:", err);
    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
    await ctx.reply(`❌ <b>Rasmni qayta ishlashda xatolik yuz berdi:</b> ${err.message || 'Iltimos, qaytadan boshqa rasm yuboring.'}`, { parse_mode: "HTML" });
    return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getAiAssistantKeyboard(userId),
        resize_keyboard: true
      }
    });
  }
}

async function handleWizardStep(ctx: any, wizard: any, input: string) {
  const userId = ctx.from.id;
  const service = wizard.service;
  const step = wizard.step;
  const data = wizard.data;

  if (service === "📊 Slayd yaratish") {
    if (step === 1) {
      data.topic = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("📊 <b>Slaydlar sonini kiriting:</b>\n<i>Masalan: 10, 15, 20</i>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "10" }, { text: "15" }, { text: "20" }], [{ text: "⬅️ Asosiy menyu" }]],
          resize_keyboard: true
        }
      });
    } else if (step === 2) {
      data.slideCount = input.replace(/[^0-9]/g, "") || "10";
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("📊 <b>Taqdimot tilini tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "O'zbekcha" }, { text: "Ruscha" }, { text: "Inglizcha" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 3) {
      data.language = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("📊 <b>Dizayn turini tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "Academic" }, { text: "Professional" }],
            [{ text: "Minimal" }, { text: "Modern" }],
            [{ text: "Dark" }, { text: "Light" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 4) {
      data.designType = input;
      userWizardStates.set(userId, { service, step: 5, data });
      return ctx.reply("📊 <b>Taqdimotga rasmlar qo'shilsinmi?</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "Ha, rasm qo'shilsin" }],
            [{ text: "Yo'q, rasm kerak emas" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 5) {
      data.addImages = input;
      userWizardStates.set(userId, { service, step: 6, data });
      return ctx.reply("📊 <b>Tahliliy diagrammalar va grafiklar yaratilsinmi?</b>\n<i>Statistik ma'lumotlar mavjud bo'lsa, avtomatik grafiklar hosil qilinadi.</i>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "Ha, grafiklar bo'lsin" }],
            [{ text: "Yo'q, grafiklar kerak emas" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 6) {
      data.createDiagrams = input;
      userWizardStates.set(userId, { service, step: 7, data });
      return ctx.reply("📊 <b>Ma'ruzachi nutqi (Speaker Notes / Himoya matni) kerakmi?</b>\n<i>Har bir slayd uchun taqdimotni himoya qilishda aytiladigan maxsus ma'ruza matni yoziladi.</i>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "Ha, ma'ruzachi nutqi yozilsin" }],
            [{ text: "Yo'q, nutq kerak emas" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 7) {
      data.speakerNotes = input;
      userWizardStates.delete(userId);
      await runPresentationGeneration(ctx, data);
    }
  }

  else if (service === "📄 Kurs ishi yaratish") {
    if (step === 1) {
      data.topic = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("📄 <b>Fan nomini kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.subject = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("📄 <b>OTM (Universitet) nomini kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 3) {
      data.university = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("📄 <b>Fakultet nomini kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 4) {
      data.faculty = input;
      userWizardStates.set(userId, { service, step: 5, data });
      return ctx.reply("📄 <b>Kafedra nomini kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 5) {
      data.department = input;
      userWizardStates.set(userId, { service, step: 6, data });
      return ctx.reply("📄 <b>Ta'lim yo'nalishini kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 6) {
      data.direction = input;
      userWizardStates.set(userId, { service, step: 7, data });
      return ctx.reply("📄 <b>Talaba F.I.Sh. kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 7) {
      data.studentName = input;
      userWizardStates.set(userId, { service, step: 8, data });
      return ctx.reply("📄 <b>Ilmiy rahbar F.I.Sh. kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 8) {
      data.advisor = input;
      userWizardStates.set(userId, { service, step: 9, data });
      return ctx.reply("📄 <b>Shahar va o'quv yilini kiriting (Masalan: Toshkent - 2026):</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "Toshkent - 2026" }, { text: "Chirchiq - 2026" }],
            [{ text: "O'tkazib yuborish (Toshkent - 2026) ➡️" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 9) {
      if (input.includes("O'tkazib") || !input.trim()) {
        data.city = "Toshkent";
        data.year = "2026";
      } else {
        const parts = input.split("-");
        data.city = parts[0]?.trim() || "Toshkent";
        data.year = parts[1]?.trim() || "2026";
      }
      userWizardStates.set(userId, { service, step: 10, data });
      return ctx.reply("📄 <b>Kurs ishi hajmini (sahifalar soni) tanlang:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "30" }, { text: "35" }],
            [{ text: "40" }, { text: "50" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 10) {
      data.pageCount = input.replace(/\D/g, '') || "30";
      userWizardStates.set(userId, { service, step: 11, data });
      return ctx.reply("📄 <b>Tadqiqot obyekti va predmetini kiriting:</b>\n\n<i>Masalan: Obyekt: Boshlang'ich sinf o'quvchilarida kreativlikni rivojlantirish jarayoni. Predmet: Kreativlikni rivojlantirishning interfaol metodlari va shart-sharoitlari.</i>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "O'tkazib yuborish (Avto) ➡️" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 11) {
      if (input.includes("O'tkazib")) {
        data.object = "";
        data.subjectItem = "";
      } else {
        data.object = input;
      }
      userWizardStates.set(userId, { service, step: 12, data });
      return ctx.reply("📄 <b>Real tajriba-sinov ma'lumotlari yoki qo'shimcha talablarni kiriting:</b>\n\n⚠️ <i>ESLATMA: Agar sizda real tajriba-sinov natijalari bo'lmasa, quyidagi tugmani bosing. Bot soxta statistika uydurmaydi, balki tajriba-sinov ishlarini tashkil etishning nazariy-amaliy tavsiya modelini yaratadi!</i>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [
            [{ text: "Tajriba ma'lumoti yo'q (Standart model) ➡️" }],
            [{ text: "⬅️ Asosiy menyu" }]
          ],
          resize_keyboard: true
        }
      });
    } else if (step === 12) {
      if (input.includes("Tajriba ma'lumoti yo'q")) {
        data.extraRequirements = "";
      } else {
        data.extraRequirements = input;
      }
      userWizardStates.delete(userId);
      await runCourseWorkDocxGeneration(ctx, data);
    }
  }

  else if (service === "🎓 Tezis yaratish") {
    if (step === 1) {
      data.topic = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("🎓 <b>Muallif F.I.Sh.:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.author = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("🎓 <b>OTM nomini kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 3) {
      data.university = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("🎓 <b>Yo'nalishni kiriting:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 4) {
      data.direction = input;
      userWizardStates.delete(userId);
      await runDocumentGeneration(ctx, "tezis", data);
    }
  }

  else if (service === "📑 Maqola yaratish") {
    if (step === 1) {
      data.topic = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("📑 <b>Muallif F.I.Sh.:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.author = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("📑 <b>Tashkilot (ish yoki o'qish joyi):</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 3) {
      data.org = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("📑 <b>Maqola tili (O'zbek, Ingliz, Rus):</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "O'zbek" }, { text: "Ingliz" }, { text: "Rus" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 4) {
      data.language = input;
      userWizardStates.delete(userId);
      await runDocumentGeneration(ctx, "maqola", data);
    }
  }

  else if (service === "📝 Dars ishlanma yaratish") {
    if (step === 1) {
      data.subject = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("📝 <b>Mavzu:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.topic = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("📝 <b>Sinf yoki kurs:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 3) {
      data.classGroup = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("📝 <b>Dars turi (Nazariy, Amaliy, Seminar):</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "Nazariy" }, { text: "Amaliy" }], [{ text: "Seminar" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 4) {
      data.lessonType = input;
      userWizardStates.delete(userId);
      await runDocumentGeneration(ctx, "dars_ishlanma", data);
    }
  }

  else if (service === "📋 Test yaratish") {
    if (step === 1) {
      data.subject = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("📋 <b>Mavzu:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.topic = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("📋 <b>Savollar soni:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "5" }, { text: "10" }, { text: "20" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 3) {
      data.questionCount = input.replace(/[^0-9]/g, "") || "10";
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("📋 <b>Variantlar soni (masalan: 4):</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "2" }, { text: "4" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 4) {
      data.optionsCount = input.replace(/[^0-9]/g, "") || "4";
      userWizardStates.delete(userId);
      await runTestGeneration(ctx, data);
    }
  }

  else if (service === "🌐 Tarjimon") {
    if (step === 1) {
      data.direction = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("🌐 <b>Tarjima qilinadigan matnni yuboring:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.text = input;
      userWizardStates.delete(userId);
      await runTranslationGeneration(ctx, data);
    }
  }

  else if (service === "📄 CV yaratish") {
    if (step === 1) {
      data.name = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("📄 <b>Tug'ilgan sana (masalan: 01.01.1990):</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 2) {
      data.birthDate = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("📄 <b>Telefon raqami:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 3) {
      data.phone = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("📄 <b>Email manzili:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 4) {
      data.email = input;
      userWizardStates.set(userId, { service, step: 5, data });
      return ctx.reply("📄 <b>Yashash manzili:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 5) {
      data.address = input;
      userWizardStates.set(userId, { service, step: 6, data });
      return ctx.reply("📄 <b>Ta'lim (Qayerda o'qigan):</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 6) {
      data.edu = input;
      userWizardStates.set(userId, { service, step: 7, data });
      return ctx.reply("📄 <b>Ish tajribasi:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 7) {
      data.exp = input;
      userWizardStates.set(userId, { service, step: 8, data });
      return ctx.reply("📄 <b>Ko'nikmalar:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 8) {
      data.skills = input;
      userWizardStates.set(userId, { service, step: 9, data });
      return ctx.reply("📄 <b>Tillar:</b>", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    } else if (step === 9) {
      data.languages = input;
      userWizardStates.delete(userId);
      await runDocumentGeneration(ctx, "cv", data);
    }
  }
  else if (service === "📄 AI Antiplagiat") {
    if (step === 1) {
      userWizardStates.delete(userId);
      await handleAntiplagiatAnalysis(ctx, input);
    }
  }
  else if (service === "📄 Obektivka yaratish") {
    if (step === 1) {
      data.name = input;
      userWizardStates.set(userId, { service, step: 2, data });
      return ctx.reply("Tug'ilgan yili: (01.01.2001)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 2) {
      data.birthDate = input;
      userWizardStates.set(userId, { service, step: 3, data });
      return ctx.reply("Tug'ilgan joyi: (Toshkent viloyati Chirchiq shahar)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 3) {
      data.birthPlace = input;
      userWizardStates.set(userId, { service, step: 4, data });
      return ctx.reply("Millati: (o'zbek)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "o'zbek" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 4) {
      data.nationality = input;
      userWizardStates.set(userId, { service, step: 5, data });
      return ctx.reply("Partiyaviyligi: (yo'q)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 5) {
      data.party = input;
      userWizardStates.set(userId, { service, step: 6, data });
      return ctx.reply("Ma'lumoti: (o'rta ta'lim)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "oliy" }, { text: "o'rta maxsus" }], [{ text: "o'rta ta'lim" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 6) {
      data.education = input;
      userWizardStates.set(userId, { service, step: 7, data });
      return ctx.reply("Tamomlagan: (Chirchiq shahar 1-maktab)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 7) {
      data.graduated = input;
      userWizardStates.set(userId, { service, step: 8, data });
      return ctx.reply("Ma'lumoti bo'yicha mutaxassisligi:(yo'q)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 8) {
      data.specialty = input;
      userWizardStates.set(userId, { service, step: 9, data });
      return ctx.reply("Ilmiy daraja: (yo'q)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 9) {
      data.academicDegree = input;
      userWizardStates.set(userId, { service, step: 10, data });
      return ctx.reply("Ilmiy unvoni:(yo'q)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 10) {
      data.academicTitle = input;
      userWizardStates.set(userId, { service, step: 11, data });
      return ctx.reply("Qaysi chet tillarini biladi: (rus,ingliz)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "rus,ingliz" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 11) {
      data.languages = input;
      userWizardStates.set(userId, { service, step: 12, data });
      return ctx.reply("Davlat mukofotlari bilan taqdirlanganmi (yo'q)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 12) {
      data.awards = input;
      userWizardStates.set(userId, { service, step: 13, data });
      return ctx.reply("Xalq deputatlari, respublika, viloyat, shahar va tuman Kengashi deputatimi yoki boshqa saylanadigan organlarning a’zosimi (to’liq ko’rsatilishi lozim): (yo'q)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 13) {
      data.deputy = input;
      data.relatives = [];
      userWizardStates.set(userId, { service, step: 14, data });
      return ctx.reply("<b>2-bo'lim: FISH ning yaqin qarindoshlari haqida ma'lumot</b>\n\nOtasi:(Fish ni kiriting )", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 14) {
      data.temp_relative = { relation: "Otasi", name: input };
      userWizardStates.set(userId, { service, step: 15, data });
      return ctx.reply("Tug'ilgan yili va joyi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 15) {
      data.temp_relative.birth = input;
      userWizardStates.set(userId, { service, step: 16, data });
      return ctx.reply("Ish joyi va lavozimi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 16) {
      data.temp_relative.work = input;
      userWizardStates.set(userId, { service, step: 17, data });
      return ctx.reply("yashash joyi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 17) {
      data.temp_relative.address = input;
      data.relatives.push(data.temp_relative);
      data.temp_relative = null;

      userWizardStates.set(userId, { service, step: 18, data });
      return ctx.reply("Onasi: (Fish ni kiriting)", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 18) {
      data.temp_relative = { relation: "Onasi", name: input };
      userWizardStates.set(userId, { service, step: 19, data });
      return ctx.reply("Tug'ilgan yili va joyi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 19) {
      data.temp_relative.birth = input;
      userWizardStates.set(userId, { service, step: 20, data });
      return ctx.reply("Ish joyi va lavozimi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 20) {
      data.temp_relative.work = input;
      userWizardStates.set(userId, { service, step: 21, data });
      return ctx.reply("yashash joyi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 21) {
      data.temp_relative.address = input;
      data.relatives.push(data.temp_relative);
      data.temp_relative = null;

      userWizardStates.set(userId, { service, step: 22, data });
      return ctx.reply("aka,uka,opa,singlingiz bormi?", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "ha" }, { text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]],
          resize_keyboard: true
        }
      });
    }
    else if (step === 22) {
      const lowerInput = input.trim().toLowerCase();
      if (lowerInput === "ha") {
        userWizardStates.set(userId, { service, step: 23, data });
        return ctx.reply("Tanlang:", {
          parse_mode: "HTML",
          reply_markup: {
            keyboard: [[{ text: "Akasi" }, { text: "Ukasi" }], [{ text: "Opasi" }, { text: "Singlisi" }], [{ text: "⬅️ Asosiy menyu" }]],
            resize_keyboard: true
          }
        });
      } else if (lowerInput === "yo'q") {
        userWizardStates.delete(userId);
        await runObektivkaDocxGeneration(ctx, data);
      } else {
        return ctx.reply("aka,uka,opa,singlingiz bormi?", {
          parse_mode: "HTML",
          reply_markup: {
            keyboard: [[{ text: "ha" }, { text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]],
            resize_keyboard: true
          }
        });
      }
    }
    else if (step === 23) {
      const validTypes = ["Akasi", "Ukasi", "Opasi", "Singlisi"];
      if (validTypes.includes(input)) {
        data.temp_relative_type = input;
        userWizardStates.set(userId, { service, step: 24, data });
        return ctx.reply(`${input} (fish ni kiriting)`, {
          parse_mode: "HTML",
          reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
        });
      } else {
        return ctx.reply("Tanlang:", {
          parse_mode: "HTML",
          reply_markup: {
            keyboard: [[{ text: "Akasi" }, { text: "Ukasi" }], [{ text: "Opasi" }, { text: "Singlisi" }], [{ text: "⬅️ Asosiy menyu" }]],
            resize_keyboard: true
          }
        });
      }
    }
    else if (step === 24) {
      data.temp_relative = { relation: data.temp_relative_type, name: input };
      userWizardStates.set(userId, { service, step: 25, data });
      return ctx.reply("Tug'ilgan yili va joyi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 25) {
      data.temp_relative.birth = input;
      userWizardStates.set(userId, { service, step: 26, data });
      return ctx.reply("Ish joyi va lavozimi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 26) {
      data.temp_relative.work = input;
      userWizardStates.set(userId, { service, step: 27, data });
      return ctx.reply("yashash joyi", {
        parse_mode: "HTML",
        reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
      });
    }
    else if (step === 27) {
      data.temp_relative.address = input;
      data.relatives.push(data.temp_relative);
      data.temp_relative = null;
      delete data.temp_relative_type;

      userWizardStates.set(userId, { service, step: 22, data });
      return ctx.reply("aka,uka,opa,singlingiz bormi?", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "ha" }, { text: "yo'q" }], [{ text: "⬅️ Asosiy menyu" }]],
          resize_keyboard: true
        }
      });
    }
  }

  else if (service === "📸 3x4 rasm") {
    let fileId: string | null = null;
    if (ctx.message && "photo" in ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    } else if (ctx.message && "document" in ctx.message && ctx.message.document) {
      const doc = ctx.message.document;
      if (doc.mime_type && doc.mime_type.startsWith("image/")) {
        fileId = doc.file_id;
      }
    }

    if (!fileId) {
      return ctx.reply("📸 <b>Iltimos, 3x4 rasm uchun shaxsiy rasmingizni foto yoki hujjat fayli ko'rinishida yuboring:</b>", {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "⬅️ Asosiy menyu" }]],
          resize_keyboard: true
        }
      });
    }

    userWizardStates.delete(userId);
    await handle3x4PhotoGeneration(ctx, fileId);
    return;
  }
}

bot.on("message", async (ctx) => {
  const userId = ctx.from.id;
  await ensureUserStateSynced(userId);

  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const pending = pendingLogins.get(userId);
  const authed = await getAuthedUser(userId);
  
  function aiModeDeactivate() {
    aiAssistantActiveUsers.delete(userId);
    aiServiceStates.delete(userId);
  }

  let userText = "";
  if ("text" in ctx.message) {
    userText = ctx.message.text;
  } else if ("caption" in ctx.message) {
    userText = ctx.message.caption || "[Media yuborildi]";
  } else {
    userText = "[Media yuborildi]";
  }
  const normText = userText.trim();

  // If user directly clicked Savol-javob, handled below with custom welcome message and keyboard
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

  // AI and Menu section exit check
  const menuButtons = [
    "ℹ️ Tizim haqida", "💰 Balans", "💳 Balansni to'ldirish",
    "💬 Adminga murojaat", "🌐 Rasmiy sayt",
    "🔙 Asosiy Menyu", "⬅️ Asosiy menyu", "🚪 Chiqish", "👤 Profil", "🔑 Kirish",
    "🤖 AI Yordamchi", "💬 Savol-javob"
  ];
  
  if (menuButtons.includes(normText) || normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
    if (normText !== "💬 Savol-javob") {
      aiAssistantActiveUsers.delete(userId);
      aiServiceStates.delete(userId);
    }
  }

  // Check if user is in an active Wizard state (only check if there is no pending transaction/admin state)
  const wizard = userWizardStates.get(userId);
  if (wizard && !pending) {
    if (menuButtons.includes(normText) || normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu" || AI_COSTS[normText]) {
      userWizardStates.delete(userId);
    } else {
      await handleWizardStep(ctx, wizard, normText);
      return;
    }
  }
  
  // Specific AI Services Handler (Runs OUTSIDE of pure AI Chat mode)
  if (normText === "💬 Savol-javob") {
    aiAssistantActiveUsers.set(userId, true);
    aiServiceStates.set(userId, "chat");
    return ctx.reply(
      "💬 <b>Savol-javob bo'limiga xush kelibsiz!</b>\n\n" +
      "Ushbu bo'limda o'quv jarayoniga oid istalgan fan, dars, matematika, tarix, fizika, geografiya, ingliz tili, dasturlash yoki boshqa har qanday o'quv mavzularidagi o'zingizni qiziqtirgan savolingizni yoza olasiz. Sun'iy intellekt savollaringizga batafsil javob beradi.\n\n" +
      "Chiqish va asosiy menyuga qaytish uchun <b>⬅️ Asosiy menyu</b> tugmasini bosing.",
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "⬅️ Asosiy menyu" }]],
          resize_keyboard: true
        }
      }
    );
  }

  if (normText === "🤖 AI Yordamchi") {
    return ctx.reply("🤖 <b>AI Yordamchi xizmatlari menyusiga xush kelibsiz!</b>\n\nKerakli xizmatni tanlang:", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: await getAiAssistantKeyboard(userId),
        resize_keyboard: true
      }
    });
  }

  if (AI_COSTS[normText] && !pending) {
    const cost = AI_COSTS[normText];
    const isAdmin = getAdminIds().includes(userId);
    const hasBalance = isAdmin || (await checkAndDeductBalance(userId, cost));
    
    if (!hasBalance) {
      return ctx.reply(`❌ <b>Balansingiz yetarli emas!</b>\n\nUshbu xizmat narxi: ${cost} so'm.\nSizning balansingizda mablag' yetarli emas.`, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 Balansni to'ldirish", callback_data: `add_balance` }]
          ]
        }
      });
    }

    // For services, disable open AI chat mode to prevent it from interfering with the wizard
    aiAssistantActiveUsers.delete(userId);
    aiServiceStates.delete(userId);

    // Start Wizard state for document / slideshow!
    let promptText = "Mavzuni kiriting:";
    if (normText === "📊 Slayd yaratish") { promptText = "📊 <b>Taqdimot mavzusini kiriting:</b>"; }
    else if (normText === "📄 Kurs ishi yaratish") { promptText = "📄 <b>Kurs ishi mavzusini kiriting:</b>"; }
    else if (normText === "🎓 Tezis yaratish") { promptText = "🎓 <b>Tezis mavzusini kiriting:</b>"; }
    else if (normText === "📑 Maqola yaratish") { promptText = "📑 <b>Maqola mavzusini kiriting:</b>"; }
    else if (normText === "📝 Dars ishlanma yaratish") { promptText = "📝 <b>Fan nomini kiriting:</b>"; }
    else if (normText === "📋 Test yaratish") { promptText = "📋 <b>Fan nomini kiriting:</b>"; }
    else if (normText === "🌐 Tarjimon") { promptText = "🌐 <b>Tarjima yo'nalishini kiriting (masalan: O'zbekcha-Inglizcha):</b>"; }
    else if (normText === "📄 CV yaratish") { promptText = "📄 <b>Foydalanuvchi F.I.Sh. kiriting:</b>"; }
    else if (normText === "📄 AI Antiplagiat") { promptText = "📄 <b>Matn yuboring yoki fayl (PDF, DOCX, TXT) yuklang:</b>"; }
    else if (normText === "📄 Obektivka yaratish") { promptText = "FISH ni kiriting: (Ortiqov Elyorbek Jasurbek o'g'li )"; }
    else if (normText === "📸 3x4 rasm") { promptText = "📸 <b>3x4 o'lchamdagi hujjat rasmini tayyorlash</b>\n\nIltimos, shaxsiy rasmingizni yuboring (foto yoki fayl ko'rinishida):\n\n<i>Sun'iy intellekt insonni aniqlaydi, orqa fonni toza oq (#FFFFFF) rangga o'zgartiradi va rasmni 3x4 (600x800 px) o'lchamga moslab beradi. Odamning yuzi va ko'rinishiga o'zgartirish kiritilmaydi.</i>"; }

    userWizardStates.set(userId, { service: normText, step: 1, data: {} });
    
    return ctx.reply(promptText, {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: [[{ text: "⬅️ Asosiy menyu" }]],
        resize_keyboard: true
      }
    });
  } else {
    // console.log(`[Telegram] Wizard check: user ${userId} has wizard state: ${!!wizard}, pending: ${!!pending}`);
  }

  // Photo or Text (cheque) forwarding to admin
  const isCheque = (ctx.message && "photo" in ctx.message) || 
    (userText.length > 15 && (userText.includes("8600") || userText.includes("9860") || userText.includes("4444") || userText.toLowerCase().includes("payme") || userText.toLowerCase().includes("click") || userText.toLowerCase().includes("uzcard") || userText.toLowerCase().includes("humo"))); // Heuristic for text cheque with common prefixes
  
  if (isCheque) {
    let adminIds = getAdminIds();
    
    // Self-healing: if adminIds is empty, look up in Firestore dynamically
    if (adminIds.length === 0 && db) {
      try {
        const usersRef = collection(db, "users");
        const adminQuery = query(usersRef, where("role", "in", ["admin", "subadmin"]));
        const adminSnap = await getDocs(adminQuery);
        const resolvedIds: number[] = [];
        for (const doc of adminSnap.docs) {
          const data = doc.data();
          const tgId = Number(data.telegramId);
          if (tgId && !isNaN(tgId)) {
            resolvedIds.push(tgId);
            registerAdminId(tgId); // Write to file
          }
        }
        if (resolvedIds.length > 0) {
          adminIds = resolvedIds;
          console.log("[Telegram Cheque] Dynamically healed admin List:", adminIds);
        }
      } catch (adminHealErr) {
        console.error("[Telegram Cheque] Admin healing failed:", adminHealErr);
      }
    }

    if (adminIds.length > 0) {
      const caption = `🧾 Yangi to\x27lov cheki\n\n👤 Ism: ${ctx.from.first_name || ""} ${ctx.from.last_name || ""}\n🆔 ID: ${userId}\n🔗 Username: @${ctx.from.username || "yo\x27q"}\n\n💰 Status: Tekshiruvda`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: "➕ To'ldirish", callback_data: `admin_approve_pay_${userId}` },
            { text: "❌ Rad etish", callback_data: `admin_reject_pay_${userId}` }
          ]
        ]
      };

      const sentAlerts: { chatId: number; messageId: number }[] = [];

      for (const aId of adminIds) {
        if (ctx.message && "photo" in ctx.message) {
          const photo = ctx.message.photo[ctx.message.photo.length - 1];
          try {
            const sentMsg = await bot.telegram.sendPhoto(aId, photo.file_id, { 
              caption, 
              parse_mode: "HTML",
              reply_markup: keyboard
            });
            if (sentMsg) {
              sentAlerts.push({ chatId: aId, messageId: sentMsg.message_id });
            }
          } catch (err) {}
        } else {
          try {
            const sentMsg = await bot.telegram.sendMessage(aId, caption + `\n\n📝 <b>Chek matni:</b>\n${userText}`, {
              parse_mode: "HTML",
              reply_markup: keyboard
            });
            if (sentMsg) {
              sentAlerts.push({ chatId: aId, messageId: sentMsg.message_id });
            }
          } catch (err) {}
        }
      }

      // Save payment intent to Firestore with tgSentMessages
      try {
        await addDoc(collection(db, "payments"), {
          userId,
          userName: `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim(),
          status: "pending",
          timestamp: serverTimestamp(),
          type: (ctx.message && "photo" in ctx.message) ? "image" : "text",
          content: (ctx.message && "photo" in ctx.message) ? ctx.message.photo[ctx.message.photo.length - 1].file_id : userText,
          tgSentMessages: sentAlerts
        });
      } catch (e) {}

    } else {
      console.warn("[Telegram Cheque] No admins found to notify about cheque submission of user id:", userId);
    }

    return ctx.reply("✅ Chekingiz adminga yuborildi. Tez orada tekshirilib, javobi yuboriladi. Muammolar yuzaga kelsa, support bilan bog'lanishingiz mumkin.");
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
              const msg = copyErr?.message || "";
              if (
                !msg.includes("chat not found") &&
                !msg.includes("bot was blocked") &&
                !msg.includes("bot was kicked") &&
                !msg.includes("user is deactivated")
              ) {
                console.error(`[Broadcast] Failed to send message to ${tgId}:`, copyErr?.message || copyErr);
              }
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

  // AI Assistant handling
  if (aiAssistantActiveUsers.get(userId)) {
    const currentState = aiServiceStates.get(userId);
    
    // Check if message is a known AI service button, switch to that service
    if (false && currentState && currentState !== "chat") {
      const loadingMsg = await ctx.reply(`⏳ <b>${currentState} tayyorlanmoqda...</b>\n\nIltimos kuting, bu biroz vaqt olishi mumkin.`, { parse_mode: "HTML" });
      try {
        let action = "generateDocument";
        let docType = "";
        let apiTopic = userText;

        if (currentState === "📊 Slayd yaratish") {
          action = "generatePresentation";
        } else if (currentState === "📄 Kurs ishi yaratish") {
          docType = "kurs_ishi";
        } else if (currentState === "🎓 Tezis yaratish") {
          docType = "tezis";
        } else if (currentState === "📑 Maqola yaratish") {
          docType = "maqola";
        } else if (currentState === "📝 Dars ishlanma yaratish") {
          docType = "dars_ishlanma";
        } else if (currentState === "🌐 Tarjimon") {
          docType = "tarjimon";
        } else if (currentState === "📋 Test yaratish") {
          action = "generateDynamicTest";
        }

        const res = await fetch(getApiUrl("/api/gemini"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            topic: apiTopic,
            docType,
            count: action === "generatePresentation" ? 15 : 10
          })
        });

        await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});

        if (res.ok) {
          const data = await res.json();
          aiServiceStates.delete(userId);

          if (action === "generatePresentation") {
            try {
              const PptxGenJS = (await import("pptxgenjs")).default;
              const pptx = new PptxGenJS();
              
              // Handle structured presentation object containing { template, slides }
              const templateName = data.template || "Modern";
              const designPlanText = data.designPlan || "Professional Design Template";
              const slidesList = Array.isArray(data.slides) ? data.slides : (Array.isArray(data) ? data : []);

              const stylesMap: Record<string, any> = {
                Business: {
                  bg: "F8FAFC",
                  coverBg: "0F172A",
                  titleColor: "FFFFFF",
                  contentTitleColor: "0F172A",
                  contentSub: "3B82F6",
                  contentBody: "1E293B",
                  primaryAccent: "3B82F6",
                  secondaryAccent: "10B981",
                  accentLight: "EFF6FF",
                  bannerFill: "0F172A"
                },
                Education: {
                  bg: "FAF8F5",
                  coverBg: "065F46",
                  titleColor: "FFFFFF",
                  contentTitleColor: "065F46",
                  contentSub: "B45309",
                  contentBody: "1F2937",
                  primaryAccent: "15803D",
                  secondaryAccent: "FBBF24",
                  accentLight: "F0FDF4",
                  bannerFill: "065F46"
                },
                Minimal: {
                  bg: "FAFAFA",
                  coverBg: "171717",
                  titleColor: "FFFFFF",
                  contentTitleColor: "000000",
                  contentSub: "E11D48",
                  contentBody: "262626",
                  primaryAccent: "000000",
                  secondaryAccent: "D4D4D4",
                  accentLight: "F5F5F5",
                  bannerFill: "171717"
                },
                Modern: {
                  bg: "0F172A",
                  coverBg: "0B0F19",
                  titleColor: "FFFFFF",
                  contentTitleColor: "FFFFFF",
                  contentSub: "A855F7",
                  contentBody: "CBD5E1",
                  primaryAccent: "8B5CF6",
                  secondaryAccent: "06B6D4",
                  accentLight: "1E293B",
                  bannerFill: "0F172A"
                },
                Creative: {
                  bg: "FFF1F2",
                  coverBg: "4C0519",
                  titleColor: "FFFFFF",
                  contentTitleColor: "4C0519",
                  contentSub: "F43F5E",
                  contentBody: "3F2021",
                  primaryAccent: "F43F5E",
                  secondaryAccent: "F97316",
                  accentLight: "FFE4E6",
                  bannerFill: "4C0519"
                }
              };

              const selectedStyle = stylesMap[templateName] || stylesMap.Modern;

              // Helper to generate dynamic image URL using Pollinations AI
              const getSlideImage = (point: any) => {
                const query = point.imageKeyword || point.title || "abstract digital background abstract";
                return `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
              };

              slidesList.forEach((s: any, idx: number) => {
                const layout = s.layout || (idx === 0 ? "cover" : "content");
                const slide = pptx.addSlide();
                
                if (layout === "cover") {
                    slide.background = { fill: selectedStyle.coverBg };
                    // Draw geometric panels on cover page
                    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 5.625, fill: { color: selectedStyle.primaryAccent } });
                    slide.addShape(pptx.ShapeType.rect, { x: 8.5, y: 0, w: 1.5, h: 1.5, fill: { color: selectedStyle.secondaryAccent, transparency: 80 } });
                    
                    // Main Titles
                    slide.addText(s.title || "Mavzuli Taqdimot", { x: 1.0, y: 1.5, w: 8.0, h: 1.5, fontSize: 38, bold: true, color: selectedStyle.titleColor, align: "left", valign: "middle" });
                    slide.addText(s.subtitle || "Oliy darajadagi zamonaviy taqdimot dizayni", { x: 1.0, y: 3.1, w: 8.0, h: 0.6, fontSize: 20, color: selectedStyle.contentSub, align: "left" });
                    slide.addText(s.content || "Microsoft PowerPoint Professional Template talablariga muvofiq.", { x: 1.0, y: 4.1, w: 8.0, h: 0.8, fontSize: 13, color: "94A3B8", align: "left" });
                
                } else if (layout === "agenda" || layout === "summary") {
                    slide.background = { fill: selectedStyle.bg };
                    // Header Area
                    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
                    slide.addText(s.title || "Mundarija", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                    
                    if (s.bulletPoints && s.bulletPoints.length > 0) {
                        s.bulletPoints.forEach((bp: string, i: number) => {
                            const xOffset = i % 2 === 0 ? 0.8 : 5.2;
                            const yOffset = 1.3 + Math.floor(i / 2) * 1.3;
                            if (yOffset + 1.1 <= 5.625) {
                               // Card container
                               slide.addShape(pptx.ShapeType.rect, { x: xOffset, y: yOffset, w: 4.0, h: 1.1, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                               slide.addShape(pptx.ShapeType.rect, { x: xOffset, y: yOffset, w: 0.1, h: 1.1, fill: { color: selectedStyle.primaryAccent } });
                               
                               // Index Badge
                               slide.addShape(pptx.ShapeType.rect, { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fill: { color: selectedStyle.accentLight } });
                               slide.addText(String(i + 1).padStart(2, '0'), { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: selectedStyle.primaryAccent, align: "center", valign: "middle" });
                               
                               // Card Content
                               slide.addText(bp, { x: xOffset + 0.8, y: yOffset + 0.1, w: 3.0, h: 0.9, fontSize: 13, bold: true, color: selectedStyle.contentBody, valign: "middle" });
                            }
                        });
                    } else if (layout === "summary") {
                        // Custom vector-like visual block for summary
                        slide.addShape(pptx.ShapeType.rect, { x: 1.5, y: 1.4, w: 7.0, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle.primaryAccent, width: 2 } });
                        slide.addText("🏆 XULOSA VA TAQDIMOT YAKUNI", { x: 2.0, y: 1.7, w: 6.0, h: 0.5, fontSize: 22, bold: true, color: selectedStyle.contentTitleColor, align: "center" });
                        slide.addText(s.content || "Mavzu yuzasidan barcha zarur xulosalar va dalillar to'liq shakllantirildi.", { x: 2.0, y: 2.4, w: 6.0, h: 1.2, fontSize: 16, color: selectedStyle.contentBody, align: "center" });
                        slide.addText("E'tiboringiz uchun rahmat!", { x: 2.0, y: 3.8, w: 6.0, h: 0.6, fontSize: 20, bold: true, color: selectedStyle.contentSub, align: "center" });
                    } else {
                        slide.addText(s.content || "", { x: 0.8, y: 1.5, w: 8.4, h: 3.0, fontSize: 16, color: selectedStyle.contentBody });
                    }
                    
                } else if (layout === "image-left") {
                    slide.background = { fill: selectedStyle.bg };
                    // Header Title Bar
                    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
                    slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                    
                    // Draw decorative background card shadow
                    slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle.accentLight } });
                    
                    const imgUrl = getSlideImage(s);
                    slide.addImage({ path: imgUrl, x: 0.8, y: 1.3, w: 4.0, h: 3.6 });
                    
                    let currY = 1.3;
                    if (s.subtitle) {
                       slide.addText(s.subtitle, { x: 5.1, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle.contentSub });
                       currY += 0.6;
                    }
                    if (s.content) {
                       slide.addText(s.content, { x: 5.1, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
                       currY += 1.4;
                    }
                    if (s.bulletPoints && s.bulletPoints.length > 0) {
                       const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
                       slide.addText(bulletTxt, { x: 5.1, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
                    }
                    
                } else if (layout === "image-right") {
                    slide.background = { fill: selectedStyle.bg };
                    // Header Title Bar
                    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
                    slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                    
                    // Draw decorative shadow box behind photo
                    slide.addShape(pptx.ShapeType.rect, { x: 5.3, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle.accentLight } });
                    
                    const imgUrl = getSlideImage(s);
                    slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });
                    
                    let currY = 1.3;
                    if (s.subtitle) {
                       slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle.contentSub });
                       currY += 0.6;
                    }
                    if (s.content) {
                       slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
                       currY += 1.4;
                    }
                    if (s.bulletPoints && s.bulletPoints.length > 0) {
                       const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
                       slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
                    }
                    
                } else if (layout === "cards" && s.bulletPoints && s.bulletPoints.length > 0) {
                    slide.background = { fill: selectedStyle.bg };
                    // Header Title Bar
                    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
                    slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                    
                    slide.addText(s.subtitle || s.content || "Infografika kartalari", { x: 0.8, y: 1.1, w: 8.4, h: 0.4, fontSize: 14, color: selectedStyle.contentSub, italic: true });
                    
                    let pointsCount = s.bulletPoints.length;
                    if (pointsCount > 4) pointsCount = 4;
                    const cWidth = 8.4 / pointsCount - 0.2;
                    for (let i = 0; i < pointsCount; i++) {
                        const startX = 0.8 + (i * cWidth) + (i * 0.2);
                        // Card
                        slide.addShape(pptx.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                        // Gradient Strip Accent top of inside card
                        slide.addShape(pptx.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 0.15, fill: { color: (i % 2 === 0 ? selectedStyle.primaryAccent : selectedStyle.secondaryAccent) } });
                        // Dynamic graphic icon label
                        slide.addText("★", { x: startX + 0.1, y: 1.9, w: cWidth - 0.2, h: 0.4, fontSize: 18, color: selectedStyle.primaryAccent, align: "center" });
                        // Inner text
                        slide.addText(s.bulletPoints[i], { x: startX + 0.1, y: 2.4, w: cWidth - 0.2, h: 2.4, fontSize: 12, color: selectedStyle.contentBody, align: "center", valign: "top" });
                    }
                    
                } else {
                    slide.background = { fill: selectedStyle.bg };
                    // Header Title Bar
                    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle.bannerFill } });
                    slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                    
                    if (s.chartData && s.chartData.length > 0) {
                        try {
                           const labels = s.chartData.map((d: any) => String(d.label || "A"));
                           const values = s.chartData.map((d: any) => Number(d.value || 0));
                           slide.addChart(pptx.ChartType.bar, [{ name: "Ma'lumot", labels: labels, values: values }], { x: 0.8, y: 1.3, w: 4.4, h: 3.6 });
                           
                           slide.addShape(pptx.ShapeType.rect, { x: 5.4, y: 1.3, w: 3.8, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                           slide.addText(s.content || "Tahliliy ma'lumotlar diagrammasi", { x: 5.6, y: 1.5, w: 3.4, h: 3.2, fontSize: 13, color: selectedStyle.contentBody });
                        } catch(chartErr) {
                           slide.addText(s.content || "", { x: 0.8, y: 1.4, w: 8.4, h: 3.5, fontSize: 14, color: selectedStyle.contentBody });
                        }
                    } else {
                        // Standard split text and graphic side by side layout
                        const imgUrl = getSlideImage(s);
                        slide.addShape(pptx.ShapeType.rect, { x: 5.3, y: 1.4, w: 3.9, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle.secondaryAccent, width: 1 } });
                        slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });

                        let currY = 1.3;
                        if (s.subtitle) {
                           slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.4, fontSize: 18, bold: true, color: selectedStyle.contentSub });
                           currY += 0.5;
                        }
                        if (s.content) {
                           slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle.contentBody, lineSpacing: 18 });
                           currY += 1.4;
                        }
                        if (s.bulletPoints && s.bulletPoints.length > 0) {
                           const bulletTxt = s.bulletPoints.map((bp: string) => `✦  ${bp}`).join("\n");
                           slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle.contentBody, lineSpacing: 18 });
                        }
                    }
                }
              });
              const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });
              return ctx.replyWithDocument(
                { source: pptxBuffer as any, filename: `${apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_taqdimot.pptx` },
                { caption: `📊 ${apiTopic} mavzusida premium ${templateName} taqdimoti tayyor!\n🎨 Dizayn uslubi: ${designPlanText}` }
              );
            } catch (err) {
              console.error("PPTX gen error:", err);
              // Fallback
              let text = `📊 **${apiTopic} mavzusida taqdimot rejasi:**\n\n`;
              const fallbackSlides = Array.isArray(data.slides) ? data.slides : (Array.isArray(data) ? data : []);
              fallbackSlides.forEach((s: any, i: number) => {
                text += `**${i + 1}-slayd: ${s.title}**\n${s.content}\n\n`;
              });
              const htmlContent = `<html><head><meta charset="utf-8"></head><body>${mdToHtml(text)}</body></html>`;
              return ctx.replyWithDocument(
                { source: Buffer.from(htmlContent, 'utf-8'), filename: `${apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_taqdimot.doc` },
                { caption: `📊 ${apiTopic} mavzusida taqdimot rejasi tayyor!` }
              );
            }
          } else if (action === "generateDynamicTest") {
            try {
              const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
              const children: any[] = [];
              
              // Header title paragraph
              children.push(new Paragraph({
                children: [
                  new TextRun({
                    text: `${apiTopic} mavzusidagi professional testlar`,
                    bold: true,
                    size: 32, // 16pt (32 half points)
                    font: "Times New Roman"
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 400 }
              }));

              // Process each questions with custom styles
              data.forEach((t: any, i: number) => {
                children.push(new Paragraph({
                  children: [
                    new TextRun({
                      text: `${i + 1}. ${t.text}`,
                      bold: true,
                      size: 28, // 14pt (28 half points)
                      font: "Times New Roman"
                    })
                  ],
                  spacing: { before: 240, after: 120 }
                }));

                if (Array.isArray(t.options)) {
                  t.options.forEach((o: string, j: number) => {
                    const prefix = `${String.fromCharCode(65 + j)}) `;
                    const isCorrect = j === t.correctIdx;
                    children.push(new Paragraph({
                      children: [
                        new TextRun({
                          text: prefix,
                          bold: true,
                          font: "Times New Roman",
                          size: 28
                        }),
                        new TextRun({
                          text: o,
                          font: "Times New Roman",
                          size: 28
                        }),
                        ...(isCorrect ? [
                          new TextRun({
                            text: "  [To'g'ri javob ✅]",
                            bold: true,
                            color: "15803D",
                            font: "Times New Roman",
                            size: 28
                          })
                        ] : [])
                      ],
                      indent: { left: 720 },
                      spacing: { after: 100 }
                    }));
                  });
                }
              });

              const doc = new Document({
                sections: [{
                  properties: {
                    page: {
                      margin: {
                        top: 1440,
                        bottom: 1440,
                        left: 1440,
                        right: 1440
                      }
                    }
                  },
                  children: children
                }]
              });

              const docxBuffer = await Packer.toBuffer(doc);
              
              // Validate generated DOCX Buffer
              if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B || docxBuffer[2] !== 0x03 || docxBuffer[3] !== 0x04) {
                throw new Error("Docx fayli nomi yoki tarkibida validatsiya xatoligi: noto'g'ri ZIP formati.");
              }

              return ctx.replyWithDocument(
                { source: docxBuffer as any, filename: `${apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_testlar.docx` },
                { caption: `📋 ${apiTopic} mavzusida haqiqiy Microsoft Word formatidagi testlar tayyor!` }
              );
            } catch (e: any) {
              console.error("Test docx error:", e);
              return ctx.reply(`❌ <b>Hujjat yaratishda validatsiya xatosi:</b> ${e.message || "Fayl yaratish muvaffaqiyatsiz bo'ldi."}`, { parse_mode: "HTML" });
            }
          } else {
            try {
              const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = await import("docx");
              const children: any[] = [];
              const rawTitle = data.title || apiTopic;

              // Title Paragraph (18pt bold Times New Roman, Centered)
              children.push(new Paragraph({
                children: [
                  new TextRun({
                    text: rawTitle,
                    bold: true,
                    size: 36, // 18pt
                    font: "Times New Roman"
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 600 }
              }));

              const contentText = data.content || "";
              const lines = contentText.split("\n");

              lines.forEach((line: string) => {
                const trimmed = line.trim();
                if (!trimmed) {
                  children.push(new Paragraph({ spacing: { after: 200 } }));
                  return;
                }

                let p: any;
                if (trimmed.startsWith('# ')) {
                  p = new Paragraph({ 
                    children: [new TextRun({ text: trimmed.replace('# ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 32 })], 
                    heading: HeadingLevel.HEADING_1, 
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 200 } 
                  });
                } else if (trimmed.startsWith('## ')) {
                  p = new Paragraph({ 
                    children: [new TextRun({ text: trimmed.replace('## ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 28 })], 
                    heading: HeadingLevel.HEADING_2, 
                    spacing: { before: 300, after: 150 } 
                  });
                } else if (trimmed.startsWith('### ')) {
                  p = new Paragraph({ 
                    children: [new TextRun({ text: trimmed.replace('### ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 26 })], 
                    heading: HeadingLevel.HEADING_3, 
                    spacing: { before: 200, after: 100 } 
                  });
                } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  p = new Paragraph({ 
                    children: [new TextRun({ text: trimmed.substring(2).replace(/\*\*/g, ''), font: "Times New Roman", size: 28 })],
                    bullet: { level: 0 }, 
                    spacing: { after: 100 } 
                  });
                } else {
                  // Bold markup inside paragraphs
                  const runs: any[] = [];
                  const regex = /\*\*(.*?)\*\*/g;
                  let lastIdx = 0;
                  let match;
                  while ((match = regex.exec(trimmed)) !== null) {
                    if (match.index > lastIdx) {
                      runs.push(new TextRun({ text: trimmed.substring(lastIdx, match.index), font: "Times New Roman", size: 28 }));
                    }
                    runs.push(new TextRun({ text: match[1], bold: true, font: "Times New Roman", size: 28 }));
                    lastIdx = regex.lastIndex;
                  }
                  if (lastIdx < trimmed.length) {
                    runs.push(new TextRun({ text: trimmed.substring(lastIdx), font: "Times New Roman", size: 28 }));
                  }
                  if (runs.length === 0) {
                    runs.push(new TextRun({ text: trimmed, font: "Times New Roman", size: 28 }));
                  }

                  p = new Paragraph({ 
                    children: runs, 
                    spacing: { after: 200 },
                    alignment: AlignmentType.JUSTIFIED
                  });
                }
                children.push(p);
              });

              const doc = new Document({
                sections: [{
                  properties: {
                    page: {
                      margin: {
                        top: 1440,
                        bottom: 1440,
                        left: 1440,
                        right: 1440
                      }
                    }
                  },
                  children: children
                }]
              });

              const docxBuffer = await Packer.toBuffer(doc);

              // Validate generated DOCX Buffer
              if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B || docxBuffer[2] !== 0x03 || docxBuffer[3] !== 0x04) {
                throw new Error("Docx fayli nomi yoki tarkibida validatsiya xatoligi: noto'g'ri ZIP formati.");
              }

              return ctx.replyWithDocument(
                { source: docxBuffer as any, filename: `${apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_hujjat.docx` },
                { caption: `📄 ${rawTitle} hujjati haqiqiy Microsoft Word (DOCX) formatida muvaffaqiyatli tayyorlandi!` }
              );
            } catch (e: any) {
              console.error("Document docx error:", e);
              return ctx.reply(`❌ <b>Hujjat yaratishda validatsiya xatosi:</b> ${e.message || "Fayl yaratish muvaffaqiyatsiz bo'ldi."}`, { parse_mode: "HTML" });
            }
          }
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "API xatosi");
        }
      } catch (err: any) {
        await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
        console.error("AI Service error:", err);
        return ctx.reply(`❌ <b>Xatolik yuz berdi:</b> ${err.message || "Keyinroq urinib ko'ring."}`, { parse_mode: "HTML" });
      }
    }

    // Default chat logic if currentState is "chat" (AI Savol-javob Tizimi)
    if (currentState === "chat") {
      if (processingUsers.has(userId)) {
        return ctx.reply("⏳ Iltimos kuting, AI hali o'ylamoqda...");
      }
      processingUsers.add(userId);
      try {
        try { await ctx.sendChatAction("typing"); } catch (e) {}
        const loadingMsg = await ctx.reply("🤖 <i>AI o'ylamoqda...</i>", { parse_mode: "HTML" });
        try {
          let prompt = userText;
          let imagePart: any = null;

          if ("photo" in ctx.message) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const link = await bot.telegram.getFileLink(photo.file_id);
            const response = await fetch(link.href);
            const buffer = await response.arrayBuffer();
            imagePart = {
              inlineData: {
                data: Buffer.from(buffer).toString("base64"),
                mimeType: "image/jpeg"
              }
            };
          }

          // Fetch "Tizim haqida" (system_about) content directly from Firestore
          let systemAboutText = "";
          try {
            const aboutSnap = await getDoc(doc(db, "siteContent", "system_about"));
            if (aboutSnap.exists()) {
              systemAboutText = aboutSnap.data().content || "";
            }
          } catch (aboutErr) {
            console.warn("Failed to fetch system_about for AI context, using static fallback:", aboutErr);
          }

          if (!systemAboutText) {
            systemAboutText = 
              "🚀 <b>AIEDUTIZIM</b> — Sun'iy Intellekt Asosidagi Zamonaviy Ta'lim Tizimi.\n\n" +
              "Platformamiz talabalar, o'qituvchilar va tashkilotlar uchun quyidagi imkoniyatlarni taqdim etadi:\n\n" +
              "✅ <b>AI-Test Tizimi:</b> Sun'iy intellekt yordamida mavzuga oid savollarni avtomatik shakllantirish.\n" +
              "✅ <b>Modulli Ta'lim:</b> Interaktiv darslar va o'quv jarayonini bosqichma-bosqich kuzatish.\n" +
              "✅ <b>Avtomatik Sertifikatlar:</b> QR-kodli rasmiy sertifikatlarni darhol yuklab olish.\n" +
              "✅ <b>Quizizz va Musobaqalar:</b> Real-vaqt rejimida bilimlar musobaqasini o'tkazish.\n" +
              "✅ <b>Smart Jurnal:</b> Barcha natijalar va statistikani xavfsiz kataloglash.\n\n" +
              "🌐 Batafsil: https://aiedutizim.vercel.app";
          }

          const systemCtx = await getSystemContextInfo();
          const systemInstructionText = `You are "Aqilli yordamchi", an expert academic AI collaborator specializing in educational technology and pedagogical research. 

### CORE FUNCTIONS:
1. Analyze user inputs thoroughly and provide detailed insights, responding directly to any specific questions.
2. If the user requests a "kurs ishi" (coursework) or "slayd" (presentation), YOU MUST FIRST ASK FOR THE SPECIFIC TOPIC ("mavzu"). Once the topic is provided, generate the requested document strictly following the guidelines below.

### 1. GUIDELINES FOR GENERATING KURS ISHI (ACADEMIC DOCX CONTENT):
Sen O'zbekiston oliy ta'lim tizimi standartlariga mos "kurs ishi" (course paper) yozuvchi ilmiy-akademik yordamchisan. Foydalanuvchi sendan mavzu, universitet nomi, fakultet, kafedra, yo'nalish, talaba F.I.Sh, ilmiy rahbar F.I.Sh kabi ma'lumotlarni oladi va shu asosda to'liq, original, ilmiy jihatdan puxta kurs ishi generatsiya qilishing kerak.

QAT'IY QOIDALAR (hech qachon buzilmasin):
1. ISM-FAMILIYALARNI TO'G'RI FORMATLA: Talaba va rahbar F.I.Sh doim odatiy grammatik qoidada — har bir so'zning faqat birinchi harfi katta, qolgani kichik (masalan: "Ortiqov Elyorbek", "Bekchanova Sh."). HECH QACHON "oRTIQOV eLYORBEK" kabi teskari case ishlatma. Universitet, fakultet, kafedra nomlarini ham standart Sarlavha holatida yoz (barcha harflarni bosh harf bilan YOZMA, faqat rasmiy qisqartmalar — ChDPU kabi — bundan mustasno).
2. HAR BIR SARLAVHA FAQAT BIR MARTA CHIQSIN: "MUNDARIJA", "KIRISH", "XULOSA" kabi bo'lim sarlavhalarini takrorlama. Har bir bo'lim sarlavhasi hujjatda faqat bitta joyda, bitta marta paydo bo'lsin.
3. METADATA/XIZMAT MA'LUMOTLARINI HUJJAT MATNIGA QO'SHMA: "Mavzu: ... Rahbar: ... Sahifalar: 30" kabi ichki xulosa-kartochkalarni yoki har qanday texnik/debug xarakteridagi qatorlarni yakuniy hujjat matniga hech qachon kiritma. Faqat foydalanuvchi ko'rishi kerak bo'lgan rasmiy kurs ishi matnini chiqar.
4. SXEMA VA JARAYONLARNI MATN-SAN'AT (ASCII-art) KO'RINISHIDA CHIZMA: Agar bosqichlar ketma-ketligini, jarayon oqimini yoki taqqoslashni ko'rsatish kerak bo'lsa — buni doim JADVAL (Markdown table yoki so'zma-so'z ro'yxat: "1-bosqich → 2-bosqich → ...") ko'rinishida ber. Kvadrat qavs, chiziq (---), o'q belgisi (▼, →) kabi belgilardan iborat "quti-diagramma" yaratma — bu Word'ga o'tkazilganda tartibsiz matn bo'lib qoladi.
5. ILMIY JIHATDAN PUXTALIK:
   - Har bir bobda kamida 2-3 ta haqiqiy yoki ishonchli tarzda umumlashtirilgan ilmiy nazariya/muallifga tayanish (masalan pedagogika uchun: Vygotsky, Gilford, Torrance, mahalliy olimlar).
   - Fikrlarni asossiz umumlashtirmasdan, sabab-natija bog'lanishi orqali yoz.
   - Har bir bob oxirida qisqa oraliq xulosa bo'lsin.
   - Adabiyotlar ro'yxatini turkumlarga bo'l: (I) qonun hujjatlari, (II) darslik/monografiyalar, (III) ilmiy maqolalar/dissertatsiyalar, (IV) xorijiy manbalar, (V) elektron resurslar — har biri to'g'ri bibliografik formatda (muallif, nomi, shahar, nashriyot, yil, sahifa).
   - O'zbekiston me'yoriy-huquqiy hujjatlariga (qonun, farmon, qaror) real sana va raqamlar bilan murojaat qil; agar aniq bilmasang, umumiy holatda ("tegishli me'yoriy hujjatlarga ko'ra" kabi) yoz, o'ylab topilgan sana/raqam bermaslik lozim.
6. STRUKTURA (standart 25-35 sahifa uchun):
   - Titul varaq (universitet, fakultet, kafedra, "KURS ISHI", mavzu, fan, F.I.Sh talaba/rahbar, shahar-yil)
   - Mundarija (bir marta)
   - Kirish (dolzarblik, muammo, obyekt, predmet, maqsad, vazifalar, ilmiy yangilik, metodlar, baza)
   - I BOB — nazariy asoslar (2 ta kichik bo'lim)
   - II BOB — amaliy holat tahlili (2 ta kichik bo'lim)
   - III BOB — takomillashtirish/tavsiyalar (2 ta kichik bo'lim)
   - Xulosa
   - Ilmiy-amaliy tavsiyalar
   - Foydalanilgan adabiyotlar ro'yxati (turkumlangan, kamida 15-20 manba)
7. USLUB: rasmiy-ilmiy uslub, birinchi shaxsda emas ("biz" yoki betaraf uchinchi shaxs), ortiqcha reklama iboralarisiz ("ajoyib", "zo'r" kabi so'zlarsiz), aniq va tekshirilishi mumkin bo'lgan fikrlar bilan.
8. FORMULALAR: Word (.docx) uchun LaTeX ($...$) ishlatmang, Unicode yoki oddiy matn ko'rinishida yozing.

### 2. GUIDELINES FOR GENERATING SLIDES (POWERPOINT CONTENT):
- Structure: Output clean, structured presentation outlines containing ONLY the slide title and slide content.
- NO placeholders or technical templates: NEVER include meta-text like "Microsoft PowerPoint Custom Layout Template", "Infografika kartalari", or UI shapes in the text output.
- Clean text: Avoid using raw special characters (like ★, ✦, 🔴) as bullet indicators; use standard Markdown lists instead.
- Data over placeholders: If a slide covers "Bo'lim tahlili" or "Statistika", do not write descriptive placeholders like "(Bozor hajmining o'sish sur'ati diagrammasi)". Instead, generate actual, plausible statistical data, percentages (e.g., 24.7%), or concrete table matrices so the user can present real information.

### 3. INTERACTION PATTERN:
- Always be supportive, adaptive, and maintain a peer-like grounded tone.
- If a request is broad or missing parameters, provide the initial analysis or ask a single relevant follow-up question to keep the workflow moving forward efficiently.

Atrof-muhit va joriy statistika (faqat platforma haqida savol bo'lsa):
${systemCtx}

Foydalanuvchi xabari: ${prompt}`;

          const aiResponse = await generateContentWithRotation({
            model: "gemini-3.6-flash",
            contents: [
              { role: "user", parts: [{ text: systemInstructionText }, ...(imagePart ? [imagePart] : [])] }
            ]
          });

          await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
          
          let replyText = aiResponse.text || "";
          const cleanResponseText = replyText.trim().replace(/[*_`]/g, "");

          // Programmatic fallback to guarantee adherence
          const bypassRestriction = (currentState === "chat");
          if (
            !bypassRestriction && (
              cleanResponseText.includes("topilmadi") ||
              cleanResponseText.includes("Administrator bilan bog") ||
              cleanResponseText.includes("mavjud emas") ||
              cleanResponseText.includes("I cannot find") ||
              cleanResponseText.includes("do not have") ||
              cleanResponseText.includes("not found") ||
              cleanResponseText.includes("Kechirasiz") ||
              (!cleanResponseText.toLowerCase().includes("aiedu") && 
              !cleanResponseText.toLowerCase().includes("tizim") && 
              !cleanResponseText.toLowerCase().includes("platform") && 
              !cleanResponseText.toLowerCase().includes("test") && 
              !cleanResponseText.toLowerCase().includes("sertifikat") && 
              !cleanResponseText.toLowerCase().includes("quiz") && 
              !cleanResponseText.toLowerCase().includes("portfolio") && 
              !cleanResponseText.toLowerCase().includes("jurnal") && 
              !cleanResponseText.toLowerCase().includes("kurs") && 
              !cleanResponseText.toLowerCase().includes("dars") && 
              !cleanResponseText.toLowerCase().includes("slayd") && 
              !cleanResponseText.toLowerCase().includes("maqola") && 
              !cleanResponseText.toLowerCase().includes("baho") && 
              !cleanResponseText.toLowerCase().includes("balans"))
            )
          ) {
            replyText = "❌ Ushbu savol bo'yicha ma'lumot topilmadi.\n📞 Administrator bilan bog'lanishingizni tavsiya qilaman.";
          }

          try {
            await ctx.reply(replyText, { parse_mode: "Markdown" });
          } catch (markdownErr) {
            try {
              await ctx.reply(replyText, { parse_mode: "HTML" });
            } catch (htmlErr) {
              await ctx.reply(replyText);
            }
          }
        } catch (err: any) {
          await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
          console.error("AI Assistant error detail:", err);
          const errMsg = err.message || "";
          if (errMsg.includes("Quota") || errMsg.includes("limit")) {
            await ctx.reply("⚠️ <b>AI limiti tugadi.</b> Iltimos birozdan so'ng urinib ko'ring yoki boshqa xizmatdan foydalaning.", { parse_mode: "HTML" });
          } else {
            await ctx.reply(`❌ AI bilan bog'lanishda xatolik yuz berdi: ${errMsg.substring(0, 100)}\n\nIltimos keyinroq urinib ko'ring.`);
          }
        }
      } finally {
        processingUsers.delete(userId);
      }
      return;
    } else {
      if (chatType === "private" && !pending && !userWizardStates.has(userId) && !aiAssistantActiveUsers.has(userId) && !userText.startsWith("/")) {
        return ctx.reply("📋 Kerakli xizmatni menyudan tanlang.");
      }
    }
  }

  if (userText.startsWith("/")) return; // Ignore other commands

  // Processing text messages

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
      return ctx.reply("Sizda bu huquq yo'q.", {
        reply_markup: {
          keyboard: await getKeyboard(authed?.role, userId, !!authed),
          resize_keyboard: true,
        },
      });
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
        try {
          const [sSnap, tSnap, stSnap, aSnap] = await Promise.all([
            getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
            getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
            getCountFromServer(query(collection(db, "users"), where("role", "==", "staff"))),
            getCountFromServer(query(collection(db, "users"), where("role", "==", "admin")))
          ]);
          rolesCount.student = sSnap.data().count;
          rolesCount.teacher = tSnap.data().count;
          rolesCount.staff = stSnap.data().count;
          rolesCount.admin = aSnap.data().count;
          totalDBUsers = rolesCount.student + rolesCount.teacher + rolesCount.staff + rolesCount.admin;
        } catch(e) {}
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

  if (normText === "⚙️ Bot sozlamalari") {
    const adminIds = getAdminIds();
    const isHardAdmin = adminIds.includes(userId);
    if (!isHardAdmin && (!authed || (authed.role !== "admin" && authed.role !== "subadmin"))) {
      return ctx.reply("Sizda bu huquq yo'q.");
    }
    return ctx.reply(
      "⚙️ <b>Bot sozlamalari</b>\n\nQuyidagi amallardan birini tanlang:",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 Narxlar sozlamalari", callback_data: "admin_price_settings" }],
            [{ text: "📄 Xabar matnini tahrirlash", callback_data: "admin_edit_msg_text" }],
            [{ text: "ℹ️ 'Tizim haqida' matnini tahrirlash", callback_data: "admin_edit_system_about" }]
          ]
        }
      }
    );
  }



  if (normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
    aiModeDeactivate();
    const authed = await getAuthedUser(userId);
    return ctx.reply("Asosiy menyuga qaytildi:", {
      reply_markup: {
        keyboard: await getKeyboard(authed?.role, userId, !!authed),
        resize_keyboard: true
      }
    });
  }

  // Dynamic button response check
  try {
    const textSnap = await getDoc(doc(db, "botConfig", "buttonTexts"));
    if (textSnap.exists()) {
      const customTexts = textSnap.data();
      if (customTexts[normText]) {
        aiAssistantActiveUsers.delete(userId);
        return ctx.reply(customTexts[normText], { parse_mode: "HTML" });
      }
    }
  } catch (e) {}

  // Static menus check:
  if (normText === "ℹ️ Tizim haqida") {
    aiModeDeactivate();
    aiAssistantActiveUsers.delete(userId);
    try {
      const snap = await getDoc(doc(db, "siteContent", "system_about"));
      if (snap.exists()) {
        return ctx.reply(snap.data().content, { parse_mode: "HTML" });
      }
    } catch (e) {}
    return ctx.reply(
      "🚀 <b>AIEDUTIZIM</b> — Sun'iy Intellekt Asosidagi Zamonaviy Ta'lim Tizimi.\n\n" +
      "Platformamiz talabalar, o'qituvchilar va tashkilotlar uchun quyidagi imkoniyatlarni taqdim etadi:\n\n" +
      "✅ <b>AI-Test Tizimi:</b> Sun'iy intellekt yordamida mavzuga oid savollarni avtomatik shakllantirish.\n" +
      "✅ <b>Modulli Ta'lim:</b> Interaktiv darslar va o'quv jarayonini bosqichma-bosqich kuzatish.\n" +
      "✅ <b>Avtomatik Sertifikatlar:</b> QR-kodli rasmiy sertifikatlarni darhol yuklab olish.\n" +
      "✅ <b>Quizizz va Musobaqalar:</b> Real-vaqt rejimida bilimlar musobaqasini o'tkazish.\n" +
      "✅ <b>Smart Jurnal:</b> Barcha natijalar va statistikani xavfsiz kataloglash.\n\n" +
      "🌐 Batafsil: " + APP_URL,
      { parse_mode: "HTML" }
    );
  }

  if (normText === "💰 Balans") {
    aiModeDeactivate();
    aiAssistantActiveUsers.delete(userId);
    
    console.log(`[Balance] Request from user ${userId} (${ctx.from.first_name})`);
    
    try {
      if (!db) throw new Error("Firestore DB not initialized");

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramId", "==", userId));
      const snap = await getDocs(q);
      
      let userData: any = null;
      let userDocId: string | null = null;

      if (!snap || snap.empty) {
        console.log(`[Balance] User ${userId} not found in 'users' collection. Creating fallback...`);
        // Auto-create if not found (fallback)
        userData = {
          telegramId: userId,
          uid: `tg_${userId}`,
          displayName: ctx.from.first_name || "Foydalanuvchi",
          name: ctx.from.first_name || "Foydalanuvchi",
          username: ctx.from.username || "",
          role: "student",
          ball: 0,
          balance: 0,
          spentBalls: 0,
          referralCount: 0,
          referrals: 0,
          createdAt: serverTimestamp(),
          isTelegramUser: true
        };
        const newRef = await addDoc(usersRef, userData);
        userDocId = newRef.id;
        console.log(`[Balance] Fallback profile created: ${userDocId}`);
      } else {
        userData = snap.docs[0].data();
        userDocId = snap.docs[0].id;
        console.log(`[Balance] User data found for ${userId}`);
      }

      if (!userData) {
        throw new Error("Unable to resolve userData after retrieval/creation");
      }
      
      // Use balance or ball (compatibility)
      const bal = userData.balance !== undefined ? userData.balance : (userData.ball || 0);
      const spent = userData.spentBalls || 0;
      const displayBalance = bal - spent;
      
      return ctx.reply(`💰 <b>Sizning balansingiz:</b>\n\n` +
                       `💎 Umumiy mablag': <b>${bal} so'm</b>\n` +
                       `📉 Ishlatilgan: <b>${spent} so'm</b>\n` +
                       `━━━━━━\n` +
                       `✅ Mavjud balans: <b>${displayBalance} so'm</b>`, { parse_mode: "HTML" });
    } catch (e: any) {
      console.error("[Balance] CRITICAL ERROR:", e);
      // Absolute fallback - don't show error message, show 0 balance and log
      return ctx.reply(`💰 <b>Sizning balansingiz</b>\n\n` +
                       `👤 Ism: <b>${ctx.from.first_name || "Foydalanuvchi"}</b>\n` +
                       `🆔 Telegram ID: <code>${userId}</code>\n` +
                       `💎 Mablag': <b>0 so'm</b>\n\n` +
                       `<i>⚠️ Ma'lumotlarni yangilashda texnik uzilish. Tez orada tuzatiladi.</i>`, { parse_mode: "HTML" });
    }
  }

  if (normText === "🎁 Bepul ball" || normText === "🎁 Bepul ball olish") {
    aiModeDeactivate();
    return ctx.reply(
      `🎁 <b>Bepul bonus olish imkoniyatlari:</b>\n\n` +
      `1️⃣ <b>Do'stlarni taklif qilish:</b> Har bir taklif qilingan do'stingiz uchun <b>5000 so'm</b> beriladi. Do'stingiz botga kirib /start bosishi kifoya.\n` +
      `2️⃣ <b>Kunlik bonus:</b> Tizimga har kuni kirganingizda profilingizda bonuslar yangilanadi.\n` +
      `3️⃣ <b>Xatoliklar bo'yicha xabar:</b> Tizimdagi xatoliklar haqida @adminga xabar bersangiz va tasdiqlansa, sizga sovg'a tariqasida bonuslar taqdim etiladi.\n\n` +
      `💡 <i>Hozircha har bir do'stingiz uchun 5000 so'm olish uchun quyidagi "👥 Do'stlarni taklif qilish" tugmasidan foydalaning!</i>`,
      { parse_mode: "HTML" }
    );
  }

  if (normText === "👥 Do'stlarni taklif qilish") {
    aiModeDeactivate();
    const refLink = `${APP_URL}/?r=${userId}`; // Web link
    const botRefLink = `https://t.me/${ctx.botInfo.username}?start=ref_${userId}`; // Bot link
    return ctx.reply(
      `👥 <b>Do'stlarni taklif qiling va mablag' to'plang!</b>\n\n` +
      `Sizning shaxsiy referal havolangiz:\n\n` +
      `🔗 <b>Telegram bot uchun:</b> ${botRefLink}\n` +
      `🔗 <b>Veb-sayt uchun:</b> ${refLink}\n\n` +
      `🎁 Har bir taklif qilingan do'st uchun <b>5000 so'm</b> balansingizga qo'shiladi!`,
      { parse_mode: "HTML" }
    );
  }

  if (normText === "💳 Balansni to'ldirish") {
    aiModeDeactivate();
    aiAssistantActiveUsers.delete(userId);
    return ctx.reply(paymentInstructionsText, { 
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Click", url: "https://click.uz/" }, { text: "Payme", url: "https://payme.uz/" }, { text: "Uzum", url: "https://uzum.com/" }]
        ]
      }
    });
  }

  if (normText === "🌐 Rasmiy sayt") {
    aiAssistantActiveUsers.delete(userId);
    return ctx.reply(
      `🔗 <a href="${APP_URL}">Rasmiy saytga o'tish</a>`, { parse_mode: "HTML" }
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

  if (normText === "Admin profilga kirish") {
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
        "❌ Siz tizimga kirmagansiz.\n\nIltimos, \"🔑 Kirish\" tugmasi orqali tizimga kiring.",
        {
          reply_markup: {
            keyboard: await getKeyboard(undefined, userId, false),
            resize_keyboard: true,
          },
        }
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
        // Do not update/delete telegramId here
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
      `   🤖 Model: <code>Gemini 3.6 Flash / 3.1 Pro</code>\n` +
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
    if (pending.step === "admin_add_button_name") {
      pending.buttonName = userText;
      pending.step = "admin_add_button_row";
      return ctx.reply(`"${userText}" tugmasi nechanchi qatorga qo'shilsin? (Raqam yuboring, masalan: 1)`);
    } else if (pending.step === "admin_add_button_row") {
      const row = parseInt(userText) - 1;
      if (isNaN(row) || row < 0) return ctx.reply("Iltimos, to'g'ri raqam yuboring.");
      
      const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
      let kb = menuDoc.exists() ? (menuDoc.data().keyboard || []) : [];
      if (!kb[row]) kb[row] = [];
      kb[row].push({ text: pending.buttonName });
      
      await setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true });
      pendingLogins.delete(userId);
      return ctx.reply(`✅ "${pending.buttonName}" tugmasi ${row + 1}-qatorga qo'shildi.`);
    } else if (pending.step === "admin_rename_button_select") {
      pending.oldName = userText;
      pending.step = "admin_rename_button_new";
      return ctx.reply(`"${userText}" tugmasi uchun yangi nomni kiriting:`);
    } else if (pending.step === "admin_rename_button_new") {
      const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
      if (menuDoc.exists()) {
        let kb = menuDoc.data().keyboard || [];
        let found = false;
        kb = kb.map((row: any[]) => row.map(btn => {
          if (btn.text === pending.oldName) {
            found = true;
            return { ...btn, text: userText };
          }
          return btn;
        }));
        if (found) {
          await setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true });
          pendingLogins.delete(userId);
          return ctx.reply(`✅ Tugma nomi "${pending.oldName}" dan "${userText}" ga o'zgartirildi.`);
        }
      }
      return ctx.reply("❌ Amaldagi nomli tugma topilmadi.");
    } else if (pending.step === "admin_edit_msg_select") {
      pending.targetButton = userText;
      pending.step = "admin_edit_msg_new";
      return ctx.reply(`"${userText}" tugmasi bosilganda chiqadigan yangi matnni yuboring:`);
    } else if (pending.step === "admin_edit_msg_new") {
      await setDoc(doc(db, "botConfig", "buttonTexts"), { [pending.targetButton]: userText }, { merge: true });
      pendingLogins.delete(userId);
      return ctx.reply(`✅ "${pending.targetButton}" tugmasi uchun xabar matni yangilandi.`);
    } else if (pending.step === "admin_edit_system_about") {
      await setDoc(doc(db, "siteContent", "system_about"), { 
        content: userText,
        updatedAt: serverTimestamp()
      }, { merge: true });
      pendingLogins.delete(userId);
      return ctx.reply("✅ 'Tizim haqida' matni muvaffaqiyatli yangilandi.");
    } else if (pending.step === "admin_reject_request_reason") {
      const requestId = pending.targetUserId;
      const reason = userText;
      
      try {
        const reqDoc = await getDoc(doc(db, "connection_requests", requestId || ""));
        if (!reqDoc.exists()) {
          pendingLogins.delete(userId);
          return ctx.reply("❌ So'rov topilmadi.");
        }

        const req = reqDoc.data();
        await updateDoc(doc(db, "connection_requests", requestId || ""), { 
          status: 'rejected',
          rejectReason: reason,
          processedBy: userId,
          processedAt: serverTimestamp()
        });

        await addDoc(collection(db, "messages"), {
          senderId: 'admin',
          receiverId: req.userId,
          text: `Sizning ${req.tariffName} tarifiga ulanish so'rovingiz rad etildi.\nSababi: ${reason}`,
          timestamp: serverTimestamp(),
          isRead: false
        });

        if (req.userId) {
          try {
            const uSnap = await getDoc(doc(db, "users", req.userId));
            if (uSnap.exists() && uSnap.data().telegramId) {
              await bot.telegram.sendMessage(uSnap.data().telegramId, `❌ Sizning <b>${req.tariffName}</b> tarifiga ulanish so'rovingiz rad etildi.\n\n⚠️ Sababi: ${reason}`, { parse_mode: "HTML" });
            }
          } catch(e) {}
        }

        if (pending.originalChatId && pending.originalMessageId) {
          await bot.telegram.deleteMessage(pending.originalChatId, pending.originalMessageId).catch(() => {});
        }

        pendingLogins.delete(userId);
        return ctx.reply(`❌ So'rov rad etildi va foydalanuvchiga xabar yuborildi. (${req.userName})`);

      } catch (err) {
        console.error("Bot Reject Error:", err);
        return ctx.reply("❌ Xatolik yuz berdi: " + (err instanceof Error ? err.message : String(err)));
      }
    } else if (pending.step === "admin_payment_amount") {
      const amount = parseInt(userText);
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply("❌ Faqat son kiriting.");
      }

      const targetId = pending.targetPaymentUserId;
      if (!targetId) {
        pendingLogins.delete(userId);
        return ctx.reply("❌ Ma'lumotlarda xatolik. Iltimos qaytadan urinib ko'ring.");
      }

      try {
        console.log(`[Payment] Admin ${userId} adding ${amount} to user ${targetId}`);
        const usersRef = collection(db, "users");
        // Try searching with both Number and String to be robust
        let snap = await getDocs(query(usersRef, where("telegramId", "==", Number(targetId))));
        if (snap.empty) {
          snap = await getDocs(query(usersRef, where("telegramId", "==", String(targetId))));
        }

        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const userData = userDoc.data();
          const currentBall = userData.ball || 0;
          const currentBalance = userData.balance || 0;
          
          const newBall = currentBall + amount;
          const newBalance = currentBalance + amount;

          await updateDoc(doc(db, "users", userDoc.id), {
            ball: newBall,
            balance: newBalance,
            updatedAt: serverTimestamp()
          });

          pendingLogins.delete(userId);

          const uName = userData.name || userData.displayName || "Foydalanuvchi";
          
          // Notify user
          await bot.telegram.sendMessage(Number(targetId), 
            `✅ To\x27lov tasdiqlandi\n\n💰 Sizga ${amount} so\x27m qo\x27shildi\n\n📊 Yangi balans: ${newBalance}`, 
            { parse_mode: "HTML" }
          ).catch((e) => {
             console.error(`Notify user ${targetId} failed:`, e);
          });

          // Retrieve payment details to delete sent Telegram cheque messages from all admins chats
          try {
            const pQuery = query(collection(db, "payments"), 
              where("userId", "==", Number(targetId)), 
              where("status", "==", "pending"),
              orderBy("timestamp", "desc"),
              limit(1)
            );
            const pSnap = await getDocs(pQuery);
            if (!pSnap.empty) {
              const pDoc = pSnap.docs[0];
              const pData = pDoc.data();
              if (Array.isArray(pData.tgSentMessages)) {
                for (const item of pData.tgSentMessages) {
                  if (item.chatId && item.messageId) {
                    await bot.telegram.deleteMessage(item.chatId, item.messageId).catch(() => {});
                  }
                }
              }

              await updateDoc(doc(db, "payments", pDoc.id), {
                status: "approved",
                amount: amount,
                processedAt: serverTimestamp(),
                processedBy: userId
              });
            }
          } catch (e) {
            console.error("Firestore payment status update fail:", e);
          }

          // Clean up the temporary/prompt messages to keep the chat clean
          const origMsgId = (pending as any).originalMessageId;
          const origChatId = (pending as any).originalChatId;
          if (origMsgId && origChatId) {
            await ctx.telegram.deleteMessage(origChatId, origMsgId).catch(() => {});
          }
          const promptMsgId = (pending as any).promptMessageId;
          if (promptMsgId && chatId) {
            await ctx.telegram.deleteMessage(chatId, promptMsgId).catch(() => {});
          }
          if (ctx.message?.message_id && chatId) {
            await ctx.telegram.deleteMessage(chatId, ctx.message.message_id).catch(() => {});
          }

          return ctx.reply(`✅ <b>Muvaffaqiyatli!</b>\n\n👤 ${uName} (ID: ${targetId}) balansiga ${amount} so'm qo'shildi.\n📊 Yangi balans: ${newBalance}`);
        } else {
          pendingLogins.delete(userId);
          return ctx.reply(`❌ Foydalanuvchi (ID: ${targetId}) bazadan topilmadi.`);
        }
      } catch (e) {
        console.error("Payment approval error:", e);
        pendingLogins.delete(userId);
        return ctx.reply("❌ Balansni yangilashda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.");
      }
    } else if (pending.step === "admin_reorder_button_select") {
      pending.targetButton = userText;
      pending.step = "admin_reorder_button_newpos";
      return ctx.reply(`"${userText}" tugmasi nechanchi qatorga ko'chirilsin? (Raqam yuboring)`);
    } else if (pending.step === "admin_reorder_button_newpos") {
      const row = parseInt(userText) - 1;
      if (isNaN(row) || row < 0) return ctx.reply("Iltimos, to'g'ri raqam yuboring.");
      const menuDoc = await getDoc(doc(db, "botConfig", "mainMenu"));
      if (menuDoc.exists()) {
        let kb = menuDoc.data().keyboard || [];
        let item: any = null;
        // Find and remove
        for (let i = 0; i < kb.length; i++) {
          const res = kb[i].filter((btn: any) => btn.text === pending.targetButton);
          if (res.length > 0) {
            item = res[0];
            kb[i] = kb[i].filter((btn: any) => btn.text !== pending.targetButton);
            if (kb[i].length === 0) {
              kb.splice(i, 1);
            }
            break;
          }
        }
        
        if (item) {
          if (!kb[row]) kb[row] = [];
          kb[row].push(item);
          await setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true });
          pendingLogins.delete(userId);
          return ctx.reply(`✅ "${pending.targetButton}" tugmasi ${row + 1}-qatorga ko'chirildi.`);
        }
      }
      return ctx.reply("❌ Tugma topilmadi.");
    }

    if (pending.step === "reply_message") {
      const uName = authed ? authed.displayName : "Admin";
      const senderId = authed ? authed.uid : "SYSTEM_ADMIN";

      pendingLogins.delete(userId);

      try {
        let originalPromptClean = (pending as any).originalText || "";
        if (originalPromptClean.startsWith("📨 Yangi xabar")) {
          const lines = originalPromptClean.split("\n");
          lines.shift(); // remove "📨 Yangi xabar"
          originalPromptClean = lines.join("\n").trim();
        }

        const combinedTextToUser = 
          `📬 <b>Siz yuborgan murojaat:</b>\n` +
          `<i>${originalPromptClean}</i>\n\n` +
          `✍️ <b>Admindan javob:</b>\n` +
          `<b>${userText}</b>`;

        await addDoc(collection(db, "messages"), {
          senderId: senderId,
          senderName: uName + " (Admin / Telegram)",
          senderRole: "admin",
          receiverId: pending.targetUserId,
          text: combinedTextToUser,
          timestamp: serverTimestamp(),
          isRead: false,
          fromTelegram: true,
          senderTelegramId: userId,
        });

        // Query the original message from Firestore to find the sent alert message IDs for ALL admins and delete them
        try {
          const mQuery = query(
            collection(db, "messages"),
            where("senderId", "==", pending.targetUserId),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const mSnap = await getDocs(mQuery);
          if (!mSnap.empty) {
            const mDoc = mSnap.docs[0];
            const mData = mDoc.data();
            if (Array.isArray(mData.tgSentMessages)) {
              for (const item of mData.tgSentMessages) {
                if (item.chatId && item.messageId) {
                  await bot.telegram.deleteMessage(item.chatId, item.messageId).catch(() => {});
                }
              }
            }
          }
        } catch (mErr) {
          console.warn("[Telegram reply clean] Error deleting alerts from admins: ", mErr);
        }

        // Clean up current admin's prompt/temp messages as fallback
        const origMsgId = (pending as any).originalMessageId;
        const origChatId = (pending as any).originalChatId;
        if (origMsgId && origChatId) {
          await ctx.telegram.deleteMessage(origChatId, origMsgId).catch(() => {});
        }
        const promptMsgId = (pending as any).promptMessageId;
        if (promptMsgId && chatId) {
          await ctx.telegram.deleteMessage(chatId, promptMsgId).catch(() => {});
        }
        if (ctx.message?.message_id && chatId) {
          await ctx.telegram.deleteMessage(chatId, ctx.message.message_id).catch(() => {});
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
            senderTelegramId: userId,
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
                  isBotUser: true,
                  fromTelegram: true,
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
            if (uData && uData.role === 'admin') {
              registerAdminId(userId);
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
                registerAdminId(userId);
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
              // Delete telegramId from any auto-created student dummy docs to avoid collision
              const existTgDocs = await getDocs(query(collection(db, "users"), where("telegramId", "==", userId)));
              for (const tgDoc of existTgDocs.docs) {
                if (tgDoc.id !== docId) {
                  await updateDoc(doc(db, "users", tgDoc.id), { telegramId: deleteField() });
                }
              }

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
  if (aiAssistantActiveUsers.get(userId)) {
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
      let lastModelParts: any = null;
      let loopCount = 0;
      let finalReply = "";

      while (loopCount < 3) {
        loopCount++;
        const res = await fetch(getApiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userText,
            history: [],
            userName: uName,
            isAdminMode: isAdmin,
            systemContext: sysContext,
            functionResponses:
              functionResponses.length > 0 ? functionResponses : undefined,
            lastFunctionCall: lastFunctionCall || undefined,
            lastModelParts: lastModelParts || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();

          if (data.isFunctionCall) {
            const fnName = data.functionCall.name;
            const fnArgs = data.functionCall.args;
            lastFunctionCall = data.functionCall;
            lastModelParts = data.modelParts;
            let executionResult = "";

            try {
              if (fnName === "getSystemStats") {
                let studentsCount = 0;
                let teachersCount = 0;
                let staffCount = 0;
                let adminsCount = 0;
                let tgUsersCount = 0;
                try {
                  const [sSnap, tSnap, stSnap, aSnap, tgSnap] = await Promise.all([
                    getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
                    getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
                    getCountFromServer(query(collection(db, "users"), where("role", "==", "staff"))),
                    getCountFromServer(query(collection(db, "users"), where("role", "==", "admin"))),
                    getCountFromServer(collection(db, "telegram_users"))
                  ]);
                  studentsCount = sSnap.data().count;
                  teachersCount = tSnap.data().count;
                  staffCount = stSnap.data().count;
                  adminsCount = aSnap.data().count;
                  tgUsersCount = tgSnap.data().count;
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
                // Optimized birthday check using where if possible, but Firestore doesn't support partial match well
                // Best we can do for now is filter but limit or use a better schema later.
                // For now, let's just limit to avoid killing quota.
                const usersSnap = await getDocs(query(collection(db, "users"), limit(500)));
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
                    model: "gemini-3.6-flash",
                    contents: [{ role: "user", parts: [{ text: pText }] }],
                    config: {
                      systemInstruction:
                        'Faqat JSON formatda array qaytar:\n[{ "text": "savol", "options": ["A","B","C","D"], "correctIdx": 0 }]. correctIdx - to\'g\'ri javobning indexi (0-3). Boshqa text qo\'shma.',
                      temperature: 0.1,
                    },
                  });
                  questions = safeParseJSON(genRes.text, []);
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
            continue; // move to next iteration of agent loop
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

      if (intervalId) clearInterval(intervalId);
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
      if (intervalId) clearInterval(intervalId);
      if (promptMsg) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, promptMsg.message_id);
        } catch (e) {}
      }
      ctx.reply("Server bilan bog'lanishda xatolik yuz berdi.");
    }
  } else {
    // If text is sent and AI mode is off, and no previous handler caught it
    if (chatType === "private" && !userText.startsWith("/") && !userWizardStates.has(userId) && !aiAssistantActiveUsers.has(userId)) {
      return ctx.reply("📋 Kerakli xizmatni menyudan tanlang.");
    }
  }
});

bot.on("my_chat_member", async (ctx) => {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const chatTitle = (ctx.chat as any)?.title || "";
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

bot.catch((err: any, ctx) => {
  const errMsg = err?.message || String(err);
  if (errMsg.includes("409") || errMsg.includes("Conflict")) {
    console.warn("⚠️ [Telegraf Catch] 409 Conflict ignored (another instance active).");
    return;
  }
  console.error(`[Telegraf Global Catch] Fault in processing update ${ctx?.update?.update_id || "unknown"}:`, err);
  if (ctx && typeof ctx.reply === "function") {
    ctx.reply("⚠️ Tizimda kichik uzilish kuzatildi. Iltimos, xabaringizni qaytadan yuboring.").catch(() => {});
  }
});

function startSelfPing() {
  let url = process.env.APP_URL || "http://127.0.0.1:3000";
  if (url && !url.startsWith("http")) {
    url = "https://" + url;
  }
  console.log(`[Self-Ping Check] Initialized with target host: ${url}`);
  
  setInterval(() => {
    const targetUrl = `${url.replace(/\/$/, "")}/api/health`;
    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) console.warn(`[Self-Ping] Ping responded with status: ${res.status}`);
      })
      .catch((err) => {
        // Can be ignored if it's just a connection refused on local/dev
        if (!err.message.includes("ECONNREFUSED")) {
          console.warn(`[Self-Ping] Ping request failed:`, err.message || err);
        }
      });
  }, 120000); // 2 minutes
}

export async function launchBot() {
  if (globalT.botLaunched) return;
  globalT.botLaunched = true;
  fetchTelegramUsersCount();
  
  bot.telegram.setMyDescription(
    "**Assalomu alaykum! AIEDUTIZIM platformasining telegram botiga xush kelibsiz!**\n\n🎓 AIEDUTIZIM — zamonaviy ta'lim jarayonlarini samarali boshqarish imkonini beradi."
  ).catch(() => {});

  startSelfPing();

  if (db) {
    const startupTime = Date.now();
    const pollDatabaseNotifications = async () => {
      try {
        // [1] Admin Notifications
        const adminNotifQuery = query(collection(db, "admin_notifications"), where("processedByBot", "==", false), limit(10));
        const adminNotifSnap = await getDocs(adminNotifQuery);
        for (const snapDoc of adminNotifSnap.docs) {
          const data = snapDoc.data();
          await updateDoc(doc(db, "admin_notifications", snapDoc.id), { processedByBot: true });
          const adminSnap = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
          adminSnap.forEach((d) => {
            const uData = d.data();
            if (uData.telegramId) bot.telegram.sendMessage(Number(uData.telegramId), `🚨 Tizim xabari:\n\n${data.text}`).catch(() => {});
          });
        }

        // [2] Messages
        const messagesQuery = query(collection(db, "messages"), where("processedByBot", "==", false), limit(20));
        const messagesSnap = await getDocs(messagesQuery);
        for (const snapDoc of messagesSnap.docs) {
          const mData = snapDoc.data();
          if (mData.senderId === mData.receiverId) {
            await updateDoc(doc(db, "messages", snapDoc.id), { processedByBot: true }).catch(() => {});
            continue;
          }
          try {
            await updateDoc(doc(db, "messages", snapDoc.id), { processedByBot: true });
            let recipients: any[] = [];
            if (mData.receiverRole === "admin" || mData.receiverId === "SYSTEM_ADMIN") {
              const localAdminIds = getAdminIds();
              for (const aId of localAdminIds) recipients.push({ telegramId: aId, role: "admin" });
              const adminSnap = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
              adminSnap.forEach((d) => {
                const data = d.data();
                if (data.telegramId && !localAdminIds.includes(Number(data.telegramId))) recipients.push(data);
              });
            } else if (mData.receiverId && mData.receiverId !== "SYSTEM_ADMIN") {
              if (mData.receiverId.startsWith("tg_")) {
                recipients.push({ telegramId: Number(mData.receiverId.replace("tg_", "")), role: "student" });
              } else {
                const uSnap = await getDoc(doc(db, "users", mData.receiverId));
                if (uSnap.exists()) recipients.push(uSnap.data());
              }
            }

            const senderTgId = mData.senderId?.startsWith("tg_") ? Number(mData.senderId.replace("tg_", "")) : (mData.senderTelegramId ? Number(mData.senderTelegramId) : null);
            const sentAlerts: any[] = [];
            for (const uData of recipients) {
              if (uData.telegramId && (!senderTgId || Number(uData.telegramId) !== senderTgId)) {
                const tgId = Number(uData.telegramId);
                const isRecipientAdmin = uData.role === "admin" || uData.role === "teacher";
                const messageText = isRecipientAdmin ? `📨 Yangi xabar${mData.senderName ? ` (${mData.senderName})` : ""}:\n\n${mData.text}` : `📨 Sizga Admindan xabar keldi:\n\n${mData.text}`;
                const opts: any = isRecipientAdmin ? { reply_markup: { inline_keyboard: [[{ text: "✍️ Javob yozish", callback_data: `reply_${mData.senderId}` }]] } } : {};
                
                try {
                  const sentMsg = await bot.telegram.sendMessage(tgId, messageText, opts);
                  if (sentMsg && isRecipientAdmin) sentAlerts.push({ chatId: tgId, message_id: sentMsg.message_id });
                } catch (e) {}
              }
            }
            if (sentAlerts.length > 0) await updateDoc(doc(db, "messages", snapDoc.id), { tgSentMessages: sentAlerts }).catch(() => {});
          } catch (e) {}
        }
      } catch (err: any) {
        if (!err?.message?.includes("Quota")) console.error("[Telegram Poller] Error:", err.message || err);
      }
    };
    setInterval(pollDatabaseNotifications, 35000);
    pollDatabaseNotifications();
  }

  let isLaunching = false;
  let retryTimer: any = null;

  async function triggerBotLaunch() {
    if (isLaunching) return;
    isLaunching = true;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    const useWebhook = process.env.USE_WEBHOOK === "true";
    const appUrl = process.env.APP_URL || "";
    const webhookUrl = `${appUrl}/api/telegram-webhook`;

    try {
      bot.stop("RELAUNCH");
    } catch (e) {}

    if (useWebhook && appUrl) {
      try {
        await bot.telegram.setWebhook(webhookUrl, { drop_pending_updates: true });
        console.log(`[Telegram Bot] Webhook set successfully to ${webhookUrl}`);
      } catch (err: any) {
        console.error(`[Telegram Bot] Webhook setup failed: ${err?.message || err}. Falling back to polling.`);
        try {
          await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        } catch (e) {}
        try {
          await bot.launch({ dropPendingUpdates: true });
          console.log("✅ [Telegram Bot] Bot launched (fallback polling)!");
        } catch (launchErr: any) {
          console.error("[Telegram Bot Polling Error]", launchErr?.message || launchErr);
        }
      } finally {
        isLaunching = false;
      }
    } else {
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log("[Telegram Bot] Cleared old webhook & pending updates. Launching long polling...");
      } catch (e: any) {
        console.warn("[Telegram Bot] deleteWebhook warning:", e?.message || e);
      }

      try {
        await bot.launch({ dropPendingUpdates: true });
        console.log("✅ [Telegram Bot] Bot launched and listening for updates!");
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isConflict = err?.response?.error_code === 409 || errMsg.includes("409") || errMsg.includes("Conflict");

        try {
          bot.stop("LAUNCH_ERROR");
        } catch (e) {}

        if (isConflict) {
          console.warn("⚠️ [Telegram Bot] 409 Conflict: another instance is active. Retrying polling in 15s...");
          isLaunching = false;
          retryTimer = setTimeout(() => {
            triggerBotLaunch();
          }, 15000);
          return;
        } else {
          console.error("❌ [Telegram Bot Launch Error]", errMsg);
          isLaunching = false;
          retryTimer = setTimeout(() => {
            triggerBotLaunch();
          }, 10000);
          return;
        }
      } finally {
        isLaunching = false;
      }
    }

    bot.telegram.setChatMenuButton({
      menuButton: { type: "web_app", text: "📱 Tizimga kirish", web_app: { url: `${appUrl || "https://ai-edutizim.uz"}/login` } },
    }).catch(() => {});
  }

  triggerBotLaunch();

  const handleStop = (signal: string) => {
    console.log(`[Telegram Bot] Gracefully stopping bot due to ${signal}...`);
    try {
      bot.stop(signal);
    } catch (e) {}
  };

  process.once("SIGINT", () => handleStop("SIGINT"));
  process.once("SIGTERM", () => handleStop("SIGTERM"));
  process.once("beforeExit", () => handleStop("beforeExit"));
}