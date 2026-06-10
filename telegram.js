var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Telegraf } from "telegraf";
import { initializeApp, setLogLevel } from "firebase/app";
import { initializeFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, setDoc, deleteField, onSnapshot, getDoc, runTransaction, limit, orderBy, getCountFromServer, } from "firebase/firestore";
import { Type as SDKType } from "@google/genai";
var Type = SDKType || {
    STRING: "STRING",
    NUMBER: "NUMBER",
    INTEGER: "INTEGER",
    BOOLEAN: "BOOLEAN",
    ARRAY: "ARRAY",
    OBJECT: "OBJECT",
};
import { generateContentWithRotation } from "./src/lib/gemini";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();
setLogLevel("error");
var APP_URL = (process.env.APP_URL || "https://aiedutizim.vercel.app").replace(/\/$/, "");
function getApiUrl(subPath) {
    var port = process.env.PORT || "3000";
    return "http://127.0.0.1:".concat(port).concat(subPath);
}
function mdToHtml(md) {
    if (!md)
        return "";
    return md
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
}
// Simple initialization of Firebase Client outside of React
var rawConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
var db = null;
var firebaseApiKey = "";
var firebaseProjectId = "";
if (fs.existsSync(rawConfigPath)) {
    var firebaseConfigRaw = JSON.parse(fs.readFileSync(rawConfigPath, "utf8"));
    firebaseApiKey = firebaseConfigRaw.apiKey;
    firebaseProjectId = firebaseConfigRaw.projectId;
    var firebaseConfig = {
        apiKey: firebaseConfigRaw.apiKey,
        authDomain: firebaseConfigRaw.authDomain,
        projectId: firebaseConfigRaw.projectId,
        storageBucket: firebaseConfigRaw.storageBucket,
        messagingSenderId: firebaseConfigRaw.messagingSenderId,
        appId: firebaseConfigRaw.appId,
    };
    var app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfigRaw.firestoreDatabaseId);
}
export var botPaused = false;
export var adminTelegramId = null;
export var adminTelegramIds = [];
// Session tracking and broadcast logic for Telegram bot users
export var activeTgSessions = new Map();
export function broadcastBotResumed() {
    return __awaiter(this, void 0, void 0, function () {
        var snap, userDocs, broadcastText, getKeyboard_1, _i, userDocs_1, uDoc, userId, isAuthed, kb, sendErr_1, msg, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!db)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    return [4 /*yield*/, getDocs(collection(db, "telegram_users"))];
                case 2:
                    snap = _a.sent();
                    console.log("[Broadcast Resumed] Broadcasting bot active state to ".concat(snap.size, " users..."));
                    userDocs = snap.docs;
                    broadcastText = "\u26A1\uFE0F <b>TIZIM QAYTA ISHGA TUSHIRILDI!</b>\n\n" +
                        "Assalomu alaykum! Hurmatli foydalanuvchi, <b>AIEDUTIZIM</b> Telegram boti tizimdagi yangilanish ishlaridan so'ng qayta ishga tushirildi.\n\n" +
                        "\uD83E\uDD16 <b>Barcha xizmatlar va buyruqlar to'liq faol:</b>\n" +
                        "\u2022 Sun'iy intellekt (AI) yordamchisidan bemalol foydalanishingiz mumkin.\n" +
                        "\u2022 Profilni tekshirish, savol-javob, tarjimon, tezis hamda maqola tayyorlash xizmatlari ishlamoqda.\n\n" +
                        "\uD83D\uDCA1 <i>Botdan bemalol foydalanishingiz mumkin! Yangi menyuni ko'rish uchun /start buyrug'ini yuboring.</i>";
                    getKeyboard_1 = function (role, uid, authVal) {
                        var buttons = [];
                        if (authVal) {
                            buttons.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
                            buttons.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
                            // buttons.push([{ text: "👥 Do'stlarni taklif qilish" }]);
                        }
                        else {
                            buttons.push([{ text: "🔑 Kirish" }]);
                            buttons.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
                            // buttons.push([{ text: "👥 Do'stlarni taklif qilish" }]);
                        }
                        return buttons;
                    };
                    _i = 0, userDocs_1 = userDocs;
                    _a.label = 3;
                case 3:
                    if (!(_i < userDocs_1.length)) return [3 /*break*/, 10];
                    uDoc = userDocs_1[_i];
                    userId = Number(uDoc.id);
                    if (!(!isNaN(userId) && userId > 0)) return [3 /*break*/, 9];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    isAuthed = authedUsers.get(userId) !== undefined;
                    kb = getKeyboard_1("student", userId, isAuthed);
                    return [4 /*yield*/, bot.telegram.sendMessage(userId, broadcastText, {
                            parse_mode: "HTML"
                        })];
                case 5:
                    _a.sent();
                    console.log("[Broadcast Resumed] Sent notice to ".concat(userId));
                    return [3 /*break*/, 7];
                case 6:
                    sendErr_1 = _a.sent();
                    msg = (sendErr_1 === null || sendErr_1 === void 0 ? void 0 : sendErr_1.message) || "";
                    if (!msg.includes("chat not found") &&
                        !msg.includes("bot was blocked") &&
                        !msg.includes("bot was kicked") &&
                        !msg.includes("user is deactivated")) {
                        console.error("[Broadcast Resumed] Failed to send to ".concat(userId, ":"), sendErr_1);
                    }
                    return [3 /*break*/, 7];
                case 7: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 80); })];
                case 8:
                    _a.sent(); // polite rate limit
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 3];
                case 10: return [3 /*break*/, 12];
                case 11:
                    err_1 = _a.sent();
                    console.error("[Broadcast Resumed] Error reading telegram_users:", err_1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
var lastKnownPaused = null;
if (db) {
    onSnapshot(doc(db, "settings", "bot_settings"), function (snap) {
        if (snap.exists()) {
            var data = snap.data();
            var nextPaused = data.isPaused === true || data.status === "paused";
            var wasPaused = lastKnownPaused;
            lastKnownPaused = nextPaused;
            botPaused = nextPaused;
            if (wasPaused === true && nextPaused === false) {
                console.log("[Telegram] Bot was resumed by admin. Initiating reload/resume union broadcast notifications...");
                broadcastBotResumed().catch(function (e) { return console.error("Broadcast resumed fail: ", e); });
            }
            if (data.adminTelegramId) {
                adminTelegramId = Number(data.adminTelegramId);
            }
            else {
                adminTelegramId = null;
            }
            if (Array.isArray(data.adminTelegramIds)) {
                adminTelegramIds = data.adminTelegramIds.map(Number).filter(function (x) { return !isNaN(x) && x > 0; });
            }
            else if (typeof data.adminTelegramIds === "string") {
                adminTelegramIds = data.adminTelegramIds.split(",")
                    .map(function (x) { return Number(x.trim()); })
                    .filter(function (x) { return !isNaN(x) && x > 0; });
            }
            else {
                adminTelegramIds = adminTelegramId ? [adminTelegramId] : [];
            }
            // Ensure the primary is first
            if (adminTelegramId && !adminTelegramIds.includes(adminTelegramId)) {
                adminTelegramIds.unshift(adminTelegramId);
            }
            console.log("[Telegram Runtime] Paused: ".concat(botPaused, ", Admin ID: ").concat(adminTelegramId, ", Active Admins: ").concat(adminTelegramIds));
        }
        else {
            setDoc(doc(db, "settings", "bot_settings"), { isPaused: false, status: "active", adminTelegramId: "", adminTelegramIds: [] }).catch(function () { });
        }
    }, function (err) {
        var _a;
        if ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))
            return;
        console.error("[Telegram Runtime] Error listening to bot_settings:", err);
    });
}
var rawBotToken = process.env.TELEGRAM_BOT_TOKEN ||
    "8602426313:AAEnX9khyPLZYFWrvvVRJqP5PRANqbD7i-I";
function sanitizeBotToken(raw) {
    var match = raw.match(/\d+:[A-Za-z0-9_-]+/);
    if (match) {
        return match[0];
    }
    return raw.trim();
}
var botToken = sanitizeBotToken(rawBotToken);
var globalT = globalThis;
if (!globalT.bot) {
    globalT.bot = new Telegraf(botToken, { handlerTimeout: 9000000 });
}
export var bot = globalT.bot;
var processedUpdateIds = new Set();
var processingUsers = new Set();
bot.use(function (ctx, next) { return __awaiter(void 0, void 0, void 0, function () {
    var firstId;
    return __generator(this, function (_a) {
        if (ctx.update.update_id && processedUpdateIds.has(ctx.update.update_id)) {
            return [2 /*return*/];
        }
        if (ctx.update.update_id) {
            processedUpdateIds.add(ctx.update.update_id);
            if (processedUpdateIds.size > 2000) {
                firstId = processedUpdateIds.values().next().value;
                if (firstId !== undefined)
                    processedUpdateIds.delete(firstId);
            }
        }
        return [2 /*return*/, next()];
    });
}); });
export var telegramUsersCount = 0;
var adminIdsPath = path.join(process.cwd(), "admin_telegram_ids.json");
export function getAdminIds() {
    var hardcodedAdmins = [1834968503];
    var ids = __spreadArray([], hardcodedAdmins, true);
    if (adminTelegramIds && adminTelegramIds.length > 0) {
        ids = __spreadArray(__spreadArray([], ids, true), adminTelegramIds, true);
    }
    if (adminTelegramId && !ids.includes(adminTelegramId)) {
        ids.push(adminTelegramId);
    }
    try {
        if (fs.existsSync(adminIdsPath)) {
            var stored = JSON.parse(fs.readFileSync(adminIdsPath, "utf8"));
            if (Array.isArray(stored) && stored.length > 0) {
                stored.forEach(function (id) {
                    var num = Number(id);
                    if (!isNaN(num) && num > 0 && !ids.includes(num)) {
                        ids.push(num);
                    }
                });
            }
        }
    }
    catch (e) { }
    return Array.from(new Set(ids));
}
export function registerAdminId(id) {
    try {
        var list = getAdminIds();
        if (!list.includes(id)) {
            list.push(id);
            var contentStr = JSON.stringify(list);
            fs.writeFileSync(adminIdsPath, contentStr, "utf8");
            console.log("[Telegram] Registered admin Telegram ID:", id);
        }
    }
    catch (e) { }
}
export function notifyAdminsDirectly(text_1) {
    return __awaiter(this, arguments, void 0, function (text, options) {
        var ids, _loop_1, _i, ids_1, adminId;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ids = getAdminIds();
                    console.log("[Telegram] Notifying admin Telegram IDs:", ids);
                    _loop_1 = function (adminId) {
                        var kb, fullOptions, e_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, getKeyboard("admin", adminId, true)];
                                case 1:
                                    kb = _b.sent();
                                    fullOptions = __assign({ parse_mode: "HTML", reply_markup: __assign({ keyboard: kb, resize_keyboard: true }, options === null || options === void 0 ? void 0 : options.reply_markup) }, options);
                                    return [4 /*yield*/, bot.telegram.sendMessage(adminId, text, fullOptions).catch(function (err) {
                                            console.error("Direct notification failed for admin ".concat(adminId, ":"), err);
                                        })];
                                case 2:
                                    _b.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _b.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, ids_1 = ids;
                    _a.label = 1;
                case 1:
                    if (!(_i < ids_1.length)) return [3 /*break*/, 4];
                    adminId = ids_1[_i];
                    return [5 /*yield**/, _loop_1(adminId)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
export function isTodayBirthday(birthDateStr) {
    if (!birthDateStr)
        return false;
    try {
        var today = new Date();
        var tDay = today.getDate();
        var tMonth = today.getMonth() + 1;
        var bDay = 0;
        var bMonth = 0;
        if (birthDateStr.includes("-")) {
            var parts = birthDateStr.split("-");
            bDay = parseInt(parts[2], 10);
            bMonth = parseInt(parts[1], 10);
        }
        else if (birthDateStr.includes(".")) {
            var parts = birthDateStr.split(".");
            bDay = parseInt(parts[0], 10);
            bMonth = parseInt(parts[1], 10);
        }
        else if (birthDateStr.includes("/")) {
            var parts = birthDateStr.split("/");
            bDay = parseInt(parts[1], 10);
            bMonth = parseInt(parts[0], 10);
        }
        return bDay === tDay && bMonth === tMonth;
    }
    catch (e) {
        return false;
    }
}
export function formatProfileInfo(uData, role, displayName, email) {
    var profileMsg = "";
    var normRole = (role || "").toLowerCase();
    profileMsg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
    if (normRole === "student") {
        profileMsg += "\u270D\uFE0F <b>F.I.SH:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || displayName || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDEE1\uFE0F <b>Roli:</b> <code>Talaba</code>\n";
        profileMsg += "\uD83C\uDFE2 <b>Yo'nalishi:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.departmentName) || (uData === null || uData === void 0 ? void 0 : uData.direction) || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDC65 <b>Guruhi:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.groupName) || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDCDE <b>Tel raqami:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.phone) || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDCE7 <b>Emaili:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || email || "Kiritilmagan", "</code>\n");
    }
    else if (normRole === "admin") {
        profileMsg += "\u270D\uFE0F <b>F.I.SH:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || displayName || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDEE1\uFE0F <b>Roli:</b> <code>Administrator</code>\n";
        profileMsg += "\uD83D\uDCE7 <b>Emaili:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || email || "Kiritilmagan", "</code>\n");
    }
    else if (normRole === "subadmin") {
        profileMsg += "\u270D\uFE0F <b>F.I.SH:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || displayName || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDEE1\uFE0F <b>Roli:</b> <code>Kichik Administrator</code>\n";
        profileMsg += "\uD83D\uDCE7 <b>Emaili:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || email || "Kiritilmagan", "</code>\n");
        if (uData === null || uData === void 0 ? void 0 : uData.phone)
            profileMsg += "\uD83D\uDCDE <b>Tel raqami:</b> <code>".concat(uData.phone, "</code>\n");
    }
    else if (normRole === "teacher") {
        profileMsg += "\uD83C\uDFEB <b>Tashkilot nomi:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || displayName || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDEE1\uFE0F <b>Roli:</b> <code>Tashkilot</code>\n";
        profileMsg += "\uD83D\uDCDE <b>Tel raqami:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.phone) || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDCE7 <b>Emaili:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || email || "Kiritilmagan", "</code>\n");
    }
    else if (normRole === "staff") {
        profileMsg += "\u270D\uFE0F <b>F.I.SH:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || displayName || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83C\uDFEB <b>Qaysi tashkilotga tegishli:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.teacherName) || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDEE1\uFE0F <b>Roli:</b> <code>Xodim</code>\n";
        profileMsg += "\uD83D\uDCDE <b>Tel raqami:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.phone) || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDCE7 <b>Emaili:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || email || "Kiritilmagan", "</code>\n");
    }
    else {
        profileMsg += "\u270D\uFE0F <b>F.I.SH:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || displayName || "Kiritilmagan", "</code>\n");
        profileMsg += "\uD83D\uDEE1\uFE0F <b>Roli:</b> <code>".concat(normRole.toUpperCase(), "</code>\n");
        profileMsg += "\uD83D\uDCE7 <b>Emaili:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || email || "Kiritilmagan", "</code>\n");
        if (uData === null || uData === void 0 ? void 0 : uData.phone)
            profileMsg += "\uD83D\uDCDE <b>Tel raqami:</b> <code>".concat(uData.phone, "</code>\n");
    }
    profileMsg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501";
    return profileMsg;
}
export function fetchTelegramUsersCount() {
    return __awaiter(this, void 0, void 0, function () {
        var tgUsersListPath, list, snap, contentStr, e_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
                    list = [];
                    try {
                        if (fs.existsSync(tgUsersListPath)) {
                            list = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
                        }
                    }
                    catch (e) { }
                    telegramUsersCount = list.length;
                    if (!db) return [3 /*break*/, 4];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, getDocs(collection(db, "telegram_users"))];
                case 2:
                    snap = _b.sent();
                    snap.forEach(function (d) {
                        var idNum = Number(d.id);
                        if (!isNaN(idNum) && idNum !== 0 && !list.includes(idNum)) {
                            list.push(idNum);
                        }
                    });
                    telegramUsersCount = list.length;
                    try {
                        contentStr = JSON.stringify(list);
                        fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
                    }
                    catch (err) { }
                    console.log("[Telegram] Initialized telegramUsersCount from DB and cache:", telegramUsersCount);
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _b.sent();
                    if ((_a = e_2 === null || e_2 === void 0 ? void 0 : e_2.message) === null || _a === void 0 ? void 0 : _a.includes("Quota")) {
                        console.log("[Telegram] Quota exceeded fetching tg users. Using local count.", telegramUsersCount);
                    }
                    else {
                        console.log("[Telegram] Failed to fetch initial telegram users count from Firestore, using local count:", telegramUsersCount);
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function registerTelegramId(targetRegisterId_1) {
    return __awaiter(this, arguments, void 0, function (targetRegisterId, chatType, chatTitle, fromData) {
        var tgUsersListPath, userList, contentStr, docRef, e_3;
        if (chatType === void 0) { chatType = "private"; }
        if (chatTitle === void 0) { chatTitle = ""; }
        if (fromData === void 0) { fromData = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!targetRegisterId)
                        return [2 /*return*/];
                    tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
                    userList = [];
                    try {
                        if (fs.existsSync(tgUsersListPath)) {
                            userList = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
                        }
                    }
                    catch (e) { }
                    if (!userList.includes(targetRegisterId)) {
                        userList.push(targetRegisterId);
                        try {
                            contentStr = JSON.stringify(userList);
                            fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
                        }
                        catch (err) { }
                        telegramUsersCount = userList.length;
                        console.log("[Telegram] Registered new chat target ID: ".concat(targetRegisterId, ". Total: ").concat(telegramUsersCount));
                    }
                    if (!db) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    docRef = doc(db, "telegram_users", String(targetRegisterId));
                    return [4 /*yield*/, setDoc(docRef, {
                            telegramId: targetRegisterId,
                            firstName: (fromData === null || fromData === void 0 ? void 0 : fromData.first_name) || "",
                            lastName: (fromData === null || fromData === void 0 ? void 0 : fromData.last_name) || "",
                            username: (fromData === null || fromData === void 0 ? void 0 : fromData.username) || "",
                            type: chatType || "private",
                            title: chatTitle || "",
                            lastActive: new Date().toISOString(),
                            isGroup: chatType === "group" || chatType === "supergroup" || targetRegisterId < 0
                        }, { merge: true }).catch(function () { })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_3 = _a.sent();
                    console.error("Failed to auto-register sender in Firestore:", e_3);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var pendingLogins = new Map();
var PersistentMap = /** @class */ (function (_super) {
    __extends(PersistentMap, _super);
    function PersistentMap(filePath, syncToFirestoreKey) {
        var _this = _super.call(this) || this;
        _this.filePath = filePath;
        _this.syncToFirestoreKey = syncToFirestoreKey;
        _this.load();
        return _this;
    }
    PersistentMap.prototype.setLocalOnly = function (key, value) {
        _super.prototype.set.call(this, key, value);
    };
    PersistentMap.prototype.deleteLocalOnly = function (key) {
        _super.prototype.delete.call(this, key);
    };
    PersistentMap.prototype.load = function () {
        try {
            if (fs.existsSync(this.filePath)) {
                var fileContent = fs.readFileSync(this.filePath, "utf8");
                var data = JSON.parse(fileContent);
                if (Array.isArray(data)) {
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var _a = data_1[_i], key = _a[0], val = _a[1];
                        var parsedKey = !isNaN(Number(key)) ? Number(key) : key;
                        _super.prototype.set.call(this, parsedKey, val);
                    }
                }
                console.log("[PersistentMap] Loaded ".concat(this.size, " keys from ").concat(path.basename(this.filePath)));
            }
        }
        catch (err) {
            console.error("[PersistentMap] Failed to load data from ".concat(this.filePath, ":"), err);
        }
    };
    PersistentMap.prototype.save = function (keyToUpdate, valueToUpdate, isDelete) {
        var _this = this;
        if (isDelete === void 0) { isDelete = false; }
        try {
            var data = Array.from(this.entries());
            var contentStr = JSON.stringify(data, null, 2);
            fs.writeFileSync(this.filePath, contentStr, "utf8");
            if (db && this.syncToFirestoreKey && keyToUpdate) {
                var docId_1 = String(keyToUpdate);
                var dataToUpdate = {};
                if (isDelete) {
                    dataToUpdate[this.syncToFirestoreKey] = deleteField();
                }
                else {
                    // Sanitize to remove undefined which Firestore rejects
                    dataToUpdate[this.syncToFirestoreKey] = JSON.parse(JSON.stringify(valueToUpdate));
                }
                setDoc(doc(db, "telegram_user_states", docId_1), dataToUpdate, { merge: true })
                    .catch(function (err) { return console.error("[PersistentMap Firestore Sync] Failed to write ".concat(_this.syncToFirestoreKey, " for ").concat(docId_1, ":"), err); });
            }
        }
        catch (err) {
            console.error("[PersistentMap] Failed to save data to ".concat(this.filePath, ":"), err);
        }
    };
    PersistentMap.prototype.set = function (key, value) {
        _super.prototype.set.call(this, key, value);
        this.save(key, value, false);
        return this;
    };
    PersistentMap.prototype.delete = function (key) {
        var result = _super.prototype.delete.call(this, key);
        this.save(key, undefined, true);
        return result;
    };
    PersistentMap.prototype.clear = function () {
        _super.prototype.clear.call(this);
        try {
            var contentStr = JSON.stringify([], null, 2);
            fs.writeFileSync(this.filePath, contentStr, "utf8");
        }
        catch (e) { }
    };
    return PersistentMap;
}(Map));
var authedUsers = new PersistentMap(path.join(process.cwd(), "telegram_local_cache.json"), "authed");
var aiAssistantActiveUsers = new PersistentMap(path.join(process.cwd(), "telegram_ai_active.json"), "aiActive");
var aiServiceStates = new PersistentMap(path.join(process.cwd(), "telegram_ai_service_states.json"), "aiState");
var customMenuTexts = new PersistentMap(path.join(process.cwd(), "telegram_custom_menus.json"));
var AI_COSTS = {
    "📊 Slayd yaratish": 5,
    "📄 Kurs ishi yaratish": 10,
    "🎓 Tezis yaratish": 7,
    "📑 Maqola yaratish": 5,
    "📝 Dars ishlanma yaratish": 5,
    "🌐 Tarjimon": 2,
    "📋 Test yaratish": 3,
    "📄 CV yaratish": 5,
    "💬 Savol-javob": 1
};
var requestHistory = new Map();
export function trackTelegramUserActivity(userId, from, role) {
    return __awaiter(this, void 0, void 0, function () {
        var now, session, q, snap, d, data, err_2, idleTime, duration, err_3, displayName, docRef, err_4, err_5, displayName, docRef, err_6;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!db)
                        return [2 /*return*/];
                    now = Date.now();
                    session = activeTgSessions.get(userId);
                    if (!!session) return [3 /*break*/, 4];
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    q = query(collection(db, "activityLogs"), where("userId", "==", "tg_".concat(userId)), where("logoutTime", "==", null));
                    return [4 /*yield*/, getDocs(q)];
                case 2:
                    snap = _f.sent();
                    if (!snap.empty) {
                        d = snap.docs[0];
                        data = d.data();
                        session = {
                            sessionId: d.id,
                            lastActive: data.lastActiveTime || now,
                            loginTime: data.loginTime || now
                        };
                        activeTgSessions.set(userId, session);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _f.sent();
                    if ((_a = err_2 === null || err_2 === void 0 ? void 0 : err_2.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))
                        return [2 /*return*/];
                    console.error("Error checking open TG session in DB:", err_2);
                    return [3 /*break*/, 4];
                case 4:
                    if (!session) return [3 /*break*/, 17];
                    idleTime = now - session.lastActive;
                    if (!(idleTime > 120000)) return [3 /*break*/, 12];
                    _f.label = 5;
                case 5:
                    _f.trys.push([5, 7, , 8]);
                    duration = Math.max(1, Math.round((session.lastActive - session.loginTime) / 60000));
                    return [4 /*yield*/, updateDoc(doc(db, "activityLogs", session.sessionId), {
                            logoutTime: session.lastActive,
                            durationMinutes: duration
                        })];
                case 6:
                    _f.sent();
                    console.log("[TG Session] Closed stale session ".concat(session.sessionId, " for tg_").concat(userId));
                    return [3 /*break*/, 8];
                case 7:
                    err_3 = _f.sent();
                    if (!((_b = err_3 === null || err_3 === void 0 ? void 0 : err_3.message) === null || _b === void 0 ? void 0 : _b.includes("Quota")))
                        console.error("Error closing stale TG session:", err_3);
                    return [3 /*break*/, 8];
                case 8:
                    _f.trys.push([8, 10, , 11]);
                    displayName = "".concat((from === null || from === void 0 ? void 0 : from.first_name) || "", " ").concat((from === null || from === void 0 ? void 0 : from.last_name) || "").trim() || "TG_".concat(userId);
                    return [4 /*yield*/, addDoc(collection(db, "activityLogs"), {
                            userId: "tg_".concat(userId),
                            userDisplayName: displayName + " (Bot)",
                            role: role || "student",
                            loginTime: now,
                            logoutTime: null,
                            durationMinutes: 0,
                            lastActiveTime: now,
                            isTelegram: true
                        })];
                case 9:
                    docRef = _f.sent();
                    activeTgSessions.set(userId, {
                        sessionId: docRef.id,
                        lastActive: now,
                        loginTime: now
                    });
                    console.log("[TG Session] Created fresh session ".concat(docRef.id, " for tg_").concat(userId));
                    return [3 /*break*/, 11];
                case 10:
                    err_4 = _f.sent();
                    if (!((_c = err_4 === null || err_4 === void 0 ? void 0 : err_4.message) === null || _c === void 0 ? void 0 : _c.includes("Quota")))
                        console.error("Error creating fresh TG session:", err_4);
                    return [3 /*break*/, 11];
                case 11: return [3 /*break*/, 16];
                case 12:
                    // Within 2 minutes, update heartbeat
                    session.lastActive = now;
                    _f.label = 13;
                case 13:
                    _f.trys.push([13, 15, , 16]);
                    return [4 /*yield*/, updateDoc(doc(db, "activityLogs", session.sessionId), {
                            lastActiveTime: now
                        })];
                case 14:
                    _f.sent();
                    return [3 /*break*/, 16];
                case 15:
                    err_5 = _f.sent();
                    if (!((_d = err_5 === null || err_5 === void 0 ? void 0 : err_5.message) === null || _d === void 0 ? void 0 : _d.includes("Quota")))
                        console.error("Error updating TG session heartbeat:", err_5);
                    return [3 /*break*/, 16];
                case 16: return [3 /*break*/, 20];
                case 17:
                    _f.trys.push([17, 19, , 20]);
                    displayName = "".concat((from === null || from === void 0 ? void 0 : from.first_name) || "", " ").concat((from === null || from === void 0 ? void 0 : from.last_name) || "").trim() || "TG_".concat(userId);
                    return [4 /*yield*/, addDoc(collection(db, "activityLogs"), {
                            userId: "tg_".concat(userId),
                            userDisplayName: displayName + " (Bot)",
                            role: role || "student",
                            loginTime: now,
                            logoutTime: null,
                            durationMinutes: 0,
                            lastActiveTime: now,
                            isTelegram: true
                        })];
                case 18:
                    docRef = _f.sent();
                    activeTgSessions.set(userId, {
                        sessionId: docRef.id,
                        lastActive: now,
                        loginTime: now
                    });
                    console.log("[TG Session] Spawning brand new session ".concat(docRef.id, " for tg_").concat(userId));
                    return [3 /*break*/, 20];
                case 19:
                    err_6 = _f.sent();
                    if (!((_e = err_6 === null || err_6 === void 0 ? void 0 : err_6.message) === null || _e === void 0 ? void 0 : _e.includes("Quota")))
                        console.error("Error spawning brand new TG session:", err_6);
                    return [3 /*break*/, 20];
                case 20: return [2 /*return*/];
            }
        });
    });
}
export function sweepInactiveSessions() {
    return __awaiter(this, void 0, void 0, function () {
        var now, q, snap, _i, _a, d, data, lastActive, idleTime, loginTime, duration, tgId, err_7;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!db)
                        return [2 /*return*/];
                    now = Date.now();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, , 8]);
                    q = query(collection(db, "activityLogs"), where("logoutTime", "==", null));
                    return [4 /*yield*/, getDocs(q)];
                case 2:
                    snap = _c.sent();
                    _i = 0, _a = snap.docs;
                    _c.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    d = _a[_i];
                    data = d.data();
                    lastActive = data.lastActiveTime || data.loginTime || now;
                    idleTime = now - lastActive;
                    if (!(idleTime > 120000)) return [3 /*break*/, 5];
                    loginTime = data.loginTime || now;
                    duration = Math.max(1, Math.round((lastActive - loginTime) / 60000));
                    return [4 /*yield*/, updateDoc(doc(db, "activityLogs", d.id), {
                            logoutTime: lastActive,
                            durationMinutes: duration
                        })];
                case 4:
                    _c.sent();
                    if (data.userId && data.userId.startsWith("tg_")) {
                        tgId = Number(data.userId.replace("tg_", ""));
                        if (!isNaN(tgId)) {
                            activeTgSessions.delete(tgId);
                        }
                    }
                    console.log("[Sweeper] Closed inactive session ".concat(d.id, " for ").concat(data.userId, " (Idle: ").concat(Math.round(idleTime / 1000), "s)"));
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7:
                    err_7 = _c.sent();
                    if ((_b = err_7 === null || err_7 === void 0 ? void 0 : err_7.message) === null || _b === void 0 ? void 0 : _b.includes("Quota"))
                        return [2 /*return*/];
                    console.error("[Sweeper] Error sweeping inactive sessions:", err_7);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// Sweep inactive sessions every 30 seconds
if (typeof clearInterval !== "undefined") {
    setInterval(sweepInactiveSessions, 30000);
}
// Rate limiting middleware: 20 requests per minute per user (exempts admins and teachers)
bot.use(function (ctx, next) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, authed, resolvedRole, adminIds, isAdminUser, text, e_4, now, isStart, timestamps;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    return [2 /*return*/, next()];
                return [4 /*yield*/, getAuthedUser(userId)];
            case 1:
                authed = _b.sent();
                resolvedRole = authed ? authed.role : "student";
                return [4 /*yield*/, trackTelegramUserActivity(userId, ctx.from, resolvedRole)];
            case 2:
                _b.sent();
                if (!botPaused) return [3 /*break*/, 8];
                adminIds = getAdminIds();
                isAdminUser = adminIds.includes(userId) || (authed && (authed.role === "admin" || authed.role === "subadmin"));
                if (isAdminUser) {
                    return [2 /*return*/, next()];
                }
                _b.label = 3;
            case 3:
                _b.trys.push([3, 6, , 7]);
                if (!(ctx.message || ctx.callbackQuery)) return [3 /*break*/, 5];
                text = "\uD83D\uDD27 <b>Botda vaqtinchalik tuzatish ishlari olib borilmoqda!</b>\n\n" +
                    "Assalomu alaykum! Hurmatli foydalanuvchi, ayni vaqtda botda vaqtinchalik tuzatish va yangilash ishlari olib borilayotganligi sababli bot faoliyati vaqtinchalik to'xtatildi.\n\n" +
                    "\uD83D\uDD14 <b>Bot qayta ishga tushganda yoki yangilanganda sizga darhol bildirishnoma yuboriladi.</b>\n\n" +
                    "<i>Keltirilgan noqulayliklar uchun uzr so'raymiz hamda tushunishingiz uchun katta rahmat!</i>";
                return [4 /*yield*/, ctx.reply(text, { parse_mode: "HTML" }).catch(function () { })];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                e_4 = _b.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/]; // Block execution for standard users
            case 8:
                now = Date.now();
                isStart = ctx.message &&
                    "text" in ctx.message &&
                    (ctx.message.text === "/start" || ctx.message.text.startsWith("/start"));
                if (isStart) {
                    requestHistory.set(userId, [now]);
                    return [2 /*return*/, next()];
                }
                if (authed && (authed.role === "admin" || authed.role === "subadmin" || authed.role === "teacher")) {
                    return [2 /*return*/, next()];
                }
                timestamps = requestHistory.get(userId) || [];
                timestamps = timestamps.filter(function (t) { return now - t < 60000; }); // 1 minute window
                if (timestamps.length >= 20) {
                    return [2 /*return*/, ctx.reply("⚠️ Siz juda ko'p so'rov yubordingiz. Bot limitiga ko'ra, har bir foydalanuvchi 1 daqiqada ko'pi bilan 20 ta so'rov yuborishi mumkin. Iltimos, biroz kutib qayta urinib ko'ring.")];
                }
                timestamps.push(now);
                requestHistory.set(userId, timestamps);
                return [2 /*return*/, next()];
        }
    });
}); });
function getKeyboard() {
    return __awaiter(this, arguments, void 0, function (role, userId, isAuthenticated) {
        var authed, userRole, user, adminIds, menuDoc, data, kb, alwaysExclude, excludeForAdmin_1, adminIds, isPrimary, adminHeader, excludeForUser_1, userHeader, excludeForGuest_1, guestHeader, e_5, rows;
        var _a;
        if (role === void 0) { role = "student"; }
        if (isAuthenticated === void 0) { isAuthenticated = false; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    authed = isAuthenticated;
                    userRole = role;
                    if (!(userId && isAuthenticated !== false)) return [3 /*break*/, 2];
                    return [4 /*yield*/, getAuthedUser(userId)];
                case 1:
                    user = _b.sent();
                    adminIds = getAdminIds();
                    if (user) {
                        authed = true;
                        userRole = user.role || role;
                    }
                    else if (adminIds.includes(userId)) {
                        authed = true;
                        userRole = "admin";
                    }
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
                case 3:
                    menuDoc = _b.sent();
                    if (menuDoc.exists()) {
                        data = menuDoc.data();
                        if (data.keyboard) {
                            kb = __spreadArray([], data.keyboard, true);
                            alwaysExclude = ["🤖 AI yordamchi", "🤖 AI Yordamchi"];
                            if (authed && (userRole === "admin" || userRole === "subadmin")) {
                                excludeForAdmin_1 = __spreadArray(["💬 Adminga murojaat", "💰 Balans", "💳 Balansni to'ldirish"], alwaysExclude, true);
                                kb = kb.map(function (row) { return row.filter(function (btn) { return !excludeForAdmin_1.includes(btn.text); }); }).filter(function (row) { return row.length > 0; });
                                adminIds = getAdminIds();
                                isPrimary = adminIds.length === 0 || adminIds[0] === userId;
                                adminHeader = [
                                    [{ text: "👤 Profil" }, { text: "🚪 Chiqish" }],
                                    [{ text: "🤖 AI Yordamchi" }],
                                    [{ text: "📢 E'lon yuborish" }, { text: "\uD83D\uDCCA Statistika (".concat(telegramUsersCount, ")") }],
                                    isPrimary
                                        ? [{ text: "📥 Javob berilmaganlar" }, { text: "⚙️ Menyu sozlamalari" }]
                                        : [{ text: "📥 Javob berilmaganlar" }],
                                    [{ text: "ℹ️ Tizim haqida" }]
                                ];
                                return [2 /*return*/, __spreadArray(__spreadArray([], adminHeader, true), kb, true)];
                            }
                            if (authed) {
                                excludeForUser_1 = __spreadArray(["📢 E'lon yuborish", "📊 Statistika", "📥 Javob berilmaganlar", "⚙️ Menyu sozlamalari", "👤 Profil", "🚪 Chiqish"], alwaysExclude, true);
                                kb = kb.map(function (row) { return row.filter(function (btn) {
                                    var txt = btn.text || "";
                                    return !excludeForUser_1.includes(txt) && !txt.startsWith("📊 Statistika");
                                }); }).filter(function (row) { return row.length > 0; });
                                userHeader = [
                                    [{ text: "👤 Profil" }, { text: "🚪 Chiqish" }],
                                    [{ text: "🤖 AI Yordamchi" }],
                                    [{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }],
                                    [{ text: "👥 Do'stlarni taklif qilish" }, { text: "🎁 Bepul ball" }]
                                ];
                                return [2 /*return*/, __spreadArray(__spreadArray([], userHeader, true), kb, true)];
                            }
                            else {
                                excludeForGuest_1 = __spreadArray(["📢 E'lon yuborish", "📊 Statistika", "📥 Javob berilmaganlar", "⚙️ Menyu sozlamalari", "👤 Profil", "🚪 Chiqish", "🔑 Kirish"], alwaysExclude, true);
                                kb = kb.map(function (row) { return row.filter(function (btn) {
                                    var txt = btn.text || "";
                                    return !excludeForGuest_1.includes(txt) && !txt.startsWith("📊 Statistika");
                                }); }).filter(function (row) { return row.length > 0; });
                                guestHeader = [
                                    [{ text: "🔑 Kirish" }],
                                    [{ text: "🤖 AI Yordamchi" }],
                                    [{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }],
                                    [{ text: "👥 Do'stlarni taklif qilish" }, { text: "🎁 Bepul ball" }]
                                ];
                                return [2 /*return*/, __spreadArray(__spreadArray([], guestHeader, true), kb, true)];
                            }
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_5 = _b.sent();
                    if (!((_a = e_5 === null || e_5 === void 0 ? void 0 : e_5.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))) {
                        console.error("Dynamic menu load error:", e_5);
                    }
                    return [3 /*break*/, 5];
                case 5:
                    rows = [];
                    if (authed) {
                        if (userRole === "admin" || userRole === "subadmin") {
                            rows.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
                            rows.push([{ text: "🤖 AI Yordamchi" }]);
                            rows.push([{ text: "📢 E'lon yuborish" }, { text: "\uD83D\uDCCA Statistika (".concat(telegramUsersCount, ")") }]);
                            rows.push([{ text: "📥 Javob berilmaganlar" }, { text: "⚙️ Menyu sozlamalari" }]);
                            rows.push([{ text: "ℹ️ Tizim haqida" }]);
                            rows.push([{ text: "🌐 Rasmiy sayt" }]);
                            return [2 /*return*/, rows];
                        }
                        rows.push([{ text: "👤 Profil" }, { text: "🚪 Chiqish" }]);
                        rows.push([{ text: "🤖 AI Yordamchi" }]);
                        rows.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
                    }
                    else {
                        rows.push([{ text: "🔑 Kirish" }]);
                        rows.push([{ text: "🤖 AI Yordamchi" }]);
                        rows.push([{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }]);
                    }
                    rows.push([{ text: "ℹ️ Tizim haqida" }]);
                    if (userRole !== "admin" && userRole !== "subadmin") {
                        rows.push([{ text: "💬 Adminga murojaat" }, { text: "🌐 Rasmiy sayt" }]);
                    }
                    else {
                        rows.push([{ text: "🌐 Rasmiy sayt" }]);
                    }
                    return [2 /*return*/, rows];
            }
        });
    });
}
function getAiAssistantKeyboard(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var adminIds, isAdmin, rows;
        return __generator(this, function (_a) {
            adminIds = getAdminIds();
            isAdmin = userId ? adminIds.includes(userId) : false;
            rows = [
                [{ text: "🤖 AI Yordamchi" }],
                [{ text: "📊 Slayd yaratish" }, { text: "📄 Kurs ishi yaratish" }],
                [{ text: "🎓 Tezis yaratish" }, { text: "📑 Maqola yaratish" }],
                [{ text: "📝 Dars ishlanma yaratish" }, { text: "📋 Test yaratish" }],
                [{ text: "🌐 Tarjimon" }, { text: "📄 CV yaratish" }],
                [{ text: "⬅️ Asosiy menyu" }]
            ];
            if (isAdmin) {
                // Admin has no need to replenish balance
            }
            else {
                // Optionally add balance buttons if needed, but the user requested a specific layout
            }
            return [2 /*return*/, rows];
        });
    });
}
function checkAndDeductBalance(userId, cost) {
    return __awaiter(this, void 0, void 0, function () {
        var usersRef, snap, userDoc, _i, _a, d, dt, userData, currentBall, spentBalls, available, e_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, , 6]);
                    usersRef = collection(db, "users");
                    return [4 /*yield*/, getDocs(query(usersRef, where("telegramId", "==", userId)))];
                case 1:
                    snap = _b.sent();
                    if (!snap.empty) return [3 /*break*/, 3];
                    return [4 /*yield*/, getDocs(query(usersRef, where("telegramId", "==", String(userId))))];
                case 2:
                    snap = _b.sent();
                    _b.label = 3;
                case 3:
                    if (snap.empty) {
                        console.warn("[BalanceCheck] No user document found for telegramId: ".concat(userId));
                        return [2 /*return*/, false];
                    }
                    userDoc = snap.docs[0];
                    for (_i = 0, _a = snap.docs; _i < _a.length; _i++) {
                        d = _a[_i];
                        dt = d.data();
                        if (dt.role === "admin" || dt.role === "subadmin" || (dt.uid && !dt.uid.startsWith("tg_"))) {
                            userDoc = d;
                            break;
                        }
                    }
                    userData = userDoc.data();
                    // Admins and subadmins have free access
                    if (userData.role === "admin" || userData.role === "subadmin") {
                        return [2 /*return*/, true];
                    }
                    currentBall = userData.ball || 0;
                    spentBalls = userData.spentBalls || 0;
                    available = currentBall - spentBalls;
                    if (available < cost) {
                        console.log("[BalanceCheck] Insufficient balance for user ".concat(userId, ": available ").concat(available, ", cost ").concat(cost));
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, updateDoc(doc(db, "users", userDoc.id), {
                            spentBalls: spentBalls + cost,
                            updatedAt: serverTimestamp()
                        })];
                case 4:
                    _b.sent();
                    return [2 /*return*/, true];
                case 5:
                    e_6 = _b.sent();
                    console.error("Balance check error:", e_6);
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getAuthedUser(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, authed, queryAttempted, querySuccess, snap, uDoc, _i, _a, d, dt, uData, derivedRole, emailLower, loginLower, e_7, cached;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (authedUsers.has(userId)) {
                        cached = authedUsers.get(userId);
                        if (cached) {
                            if (cached.role === "admin" || cached.role === "subadmin") {
                                registerAdminId(userId);
                            }
                            return [2 /*return*/, cached];
                        }
                    }
                    authed = null;
                    queryAttempted = false;
                    querySuccess = false;
                    if (!db) return [3 /*break*/, 6];
                    queryAttempted = true;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, getDocs(query(collection(db, "users"), where("telegramId", "==", userId)))];
                case 2:
                    snap = _b.sent();
                    if (!snap.empty) return [3 /*break*/, 4];
                    return [4 /*yield*/, getDocs(query(collection(db, "users"), where("telegramId", "==", String(userId))))];
                case 3:
                    snap = _b.sent();
                    _b.label = 4;
                case 4:
                    if (!snap.empty) {
                        uDoc = snap.docs[0];
                        for (_i = 0, _a = snap.docs; _i < _a.length; _i++) {
                            d = _a[_i];
                            dt = d.data();
                            if (dt.role === "admin" || dt.role === "subadmin" || (dt.uid && !dt.uid.startsWith("tg_"))) {
                                uDoc = d;
                                break;
                            }
                        }
                        uData = uDoc.data();
                        derivedRole = uData.role || "student";
                        emailLower = (uData.email || "").toLowerCase().trim();
                        loginLower = (uData.login || "").toLowerCase().trim();
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
                    return [3 /*break*/, 6];
                case 5:
                    e_7 = _b.sent();
                    console.error("DB check auth error:", e_7);
                    // Fallback: If DB query fails (such as quota exceeded), return cached user if we have one
                    if (authedUsers.has(userId)) {
                        cached = authedUsers.get(userId);
                        if (cached && (cached.role === "admin" || cached.role === "subadmin")) {
                            registerAdminId(userId);
                        }
                        return [2 /*return*/, cached];
                    }
                    return [3 /*break*/, 6];
                case 6:
                    if (!queryAttempted || querySuccess) {
                        if (authed) {
                            authedUsers.set(userId, authed);
                            if (authed.role === "admin" || authed.role === "subadmin") {
                                registerAdminId(userId);
                            }
                        }
                        else {
                            authedUsers.delete(userId);
                        }
                    }
                    return [2 /*return*/, authed];
            }
        });
    });
}
var paymentInstructionsText = "\uD83D\uDCB3 <b>Balansni to'ldirish yo'riqnomasi:</b>\n\n" +
    "1. Saytga kiring: https://aiedutizim.vercel.uz\n" +
    "2. \"To'ldirish\" bo'limini tanlang.\n" +
    "3. Click yoki Payme orqali to'lovni amalga oshiring.\n\n" +
    "Yoki quyidagi karta raqamiga o'tkazma qiling va adminga skrinshot yuboring:\n" +
    "\uD83D\uDCB3 <code>5614 6812 9015 3646</code>\n" +
    "Ibodullayeva SH";
bot.start(function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, startPayload, usersRef, q, snap, e_8, errMsg, isNewUser, tgUsersListPath, userList, contentStr, referrerId, referrerDocRef, referrerSnap, referrerData, currentRefs, usersRef, rq, rSnap, rDoc, rData, newRefCount, updates, e_9, textDesc, docRef, e_10, authed, role, greeting, _a, _b, _c;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                userId = ctx.from.id;
                startPayload = ctx.startPayload;
                // Clear any pending actions to "reload" bot state cleanly
                pendingLogins.delete(userId);
                aiAssistantActiveUsers.delete(userId);
                aiServiceStates.delete(userId);
                if (!db) return [3 /*break*/, 6];
                _f.label = 1;
            case 1:
                _f.trys.push([1, 5, , 6]);
                usersRef = collection(db, "users");
                q = query(usersRef, where("telegramId", "==", userId));
                return [4 /*yield*/, getDocs(q)];
            case 2:
                snap = _f.sent();
                if (!snap.empty) return [3 /*break*/, 4];
                // Create new user if not exists
                return [4 /*yield*/, addDoc(usersRef, {
                        telegramId: userId,
                        uid: "tg_".concat(userId),
                        displayName: "".concat(ctx.from.first_name || "", " ").concat(ctx.from.last_name || "").trim(),
                        name: ctx.from.first_name || "Foydalanuvchi",
                        username: ctx.from.username || "",
                        role: "student",
                        departmentName: "foydalanuvchi",
                        groupName: "bot",
                        ball: 0,
                        balance: 0,
                        spentBalls: 0,
                        referralCount: 0,
                        referrals: 0,
                        createdAt: serverTimestamp(),
                        isTelegramUser: true,
                        isBotUser: true
                    })];
            case 3:
                // Create new user if not exists
                _f.sent();
                console.log("[Telegram] Auto-created user profile for ".concat(userId));
                _f.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                e_8 = _f.sent();
                errMsg = String((e_8 === null || e_8 === void 0 ? void 0 : e_8.message) || "").toLowerCase();
                if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
                    console.warn("[Telegram] Quota exceeded on auto-registration for ".concat(userId, ". Skipping."));
                }
                else {
                    console.error("Auto-registration error:", e_8);
                }
                return [3 /*break*/, 6];
            case 6:
                isNewUser = false;
                tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
                userList = [];
                try {
                    if (fs.existsSync(tgUsersListPath)) {
                        userList = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
                    }
                }
                catch (e) { }
                if (!!userList.includes(userId)) return [3 /*break*/, 14];
                userList.push(userId);
                isNewUser = true;
                try {
                    contentStr = JSON.stringify(userList);
                    fs.writeFileSync(tgUsersListPath, contentStr, "utf8");
                }
                catch (err) { }
                if (!(startPayload && startPayload.startsWith("ref_"))) return [3 /*break*/, 14];
                referrerId = startPayload.replace("ref_", "");
                if (!(referrerId !== String(userId))) return [3 /*break*/, 14];
                _f.label = 7;
            case 7:
                _f.trys.push([7, 13, , 14]);
                referrerDocRef = doc(db, "telegram_users", referrerId);
                return [4 /*yield*/, getDoc(referrerDocRef)];
            case 8:
                referrerSnap = _f.sent();
                if (!referrerSnap.exists()) return [3 /*break*/, 12];
                referrerData = referrerSnap.data();
                currentRefs = (referrerData.referrals || []).concat(userId);
                // Increment referral list in bot-specific collection
                return [4 /*yield*/, updateDoc(referrerDocRef, {
                        referrals: currentRefs,
                        referralCount: currentRefs.length
                    })];
            case 9:
                // Increment referral list in bot-specific collection
                _f.sent();
                usersRef = collection(db, "users");
                rq = query(usersRef, where("telegramId", "==", Number(referrerId)));
                return [4 /*yield*/, getDocs(rq)];
            case 10:
                rSnap = _f.sent();
                if (!!rSnap.empty) return [3 /*break*/, 12];
                rDoc = rSnap.docs[0];
                rData = rDoc.data();
                newRefCount = (rData.referralCount || 0) + 1;
                updates = {
                    referralCount: newRefCount,
                    referrals: (rData.referrals || 0) + 1
                };
                return [4 /*yield*/, updateDoc(doc(db, "users", rDoc.id), updates)];
            case 11:
                _f.sent();
                _f.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13:
                e_9 = _f.sent();
                console.error("Referral process error:", e_9);
                return [3 /*break*/, 14];
            case 14:
                telegramUsersCount = userList.length;
                if (!isNewUser) return [3 /*break*/, 16];
                textDesc = "\uD83C\uDF89 <b>Yangi a'zo qo'shildi!</b>\n" +
                    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                    "\uD83D\uDC64 Ism: <b>".concat(ctx.from.first_name || "", " ").concat(ctx.from.last_name || "", "</b>\n") +
                    "\uD83D\uDD17 Username: @".concat(ctx.from.username || "yo'q", "\n") +
                    "\uD83C\uDD94 Telegram ID: <code>".concat(userId, "</code>");
                return [4 /*yield*/, notifyAdminsDirectly(textDesc)];
            case 15:
                _f.sent();
                _f.label = 16;
            case 16:
                if (!db) return [3 /*break*/, 20];
                _f.label = 17;
            case 17:
                _f.trys.push([17, 19, , 20]);
                docRef = doc(db, "telegram_users", String(userId));
                return [4 /*yield*/, setDoc(docRef, {
                        telegramId: userId,
                        firstName: ctx.from.first_name || "",
                        lastName: ctx.from.last_name || "",
                        username: ctx.from.username || "",
                        lastActive: new Date().toISOString(),
                    }, { merge: true }).catch(function () { })];
            case 18:
                _f.sent();
                return [3 /*break*/, 20];
            case 19:
                e_10 = _f.sent();
                console.error("Failed to save telegram user doc:", e_10);
                return [3 /*break*/, 20];
            case 20: return [4 /*yield*/, getAuthedUser(userId)];
            case 21:
                authed = _f.sent();
                role = authed ? authed.role : "student";
                greeting = "\uD83E\uDD16 <b>Assalomu alaykum! AIEDUTIZIM Telegram botiga xush kelibsiz.</b>\n\n" +
                    "\uD83C\uDF93 <b>AIEDUTIZIM</b> \u2014 Sun'iy Intellekt Asosidagi Ta'lim Tizimi bo\u2018lib, talabalar, o\u2018qituvchilar va tashkilotlar uchun mo\u2018ljallangan zamonaviy raqamli ta'lim platformasidir.\n\n" +
                    "Kerakli bo\u2018limni tanlang.";
                _b = (_a = ctx).reply;
                _c = [greeting];
                _d = {
                    parse_mode: "HTML"
                };
                _e = {};
                return [4 /*yield*/, getKeyboard(role, userId, !!authed)];
            case 22:
                _b.apply(_a, _c.concat([(_d.reply_markup = (_e.keyboard = _f.sent(),
                        _e.resize_keyboard = true,
                        _e),
                        _d)]));
                return [2 /*return*/];
        }
    });
}); });
bot.command("unanswered", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, handleUnansweredRequest(ctx)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
bot.command("addbalance", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, authed, args, targetTgId, amount, usersRef, q, snap, userDoc, userData, currentBall, currentBalance, e_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = ctx.from.id;
                return [4 /*yield*/, getAuthedUser(userId)];
            case 1:
                authed = _a.sent();
                if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
                    return [2 /*return*/, ctx.reply("Sizda bu huquq yo'q.")];
                }
                args = ctx.message.text.split(" ");
                if (args.length < 3) {
                    return [2 /*return*/, ctx.reply("Format: /addbalance <telegramId> <amount>")];
                }
                targetTgId = Number(args[1]);
                amount = Number(args[2]);
                if (isNaN(targetTgId) || isNaN(amount)) {
                    return [2 /*return*/, ctx.reply("Iltimos, to'g'ri ID va miqdorni kiriting.")];
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 9, , 10]);
                usersRef = collection(db, "users");
                q = query(usersRef, where("telegramId", "==", targetTgId));
                return [4 /*yield*/, getDocs(q)];
            case 3:
                snap = _a.sent();
                if (!!snap.empty) return [3 /*break*/, 7];
                userDoc = snap.docs[0];
                userData = userDoc.data();
                currentBall = userData.ball || 0;
                currentBalance = userData.balance || 0;
                return [4 /*yield*/, updateDoc(doc(db, "users", userDoc.id), {
                        ball: currentBall + amount,
                        balance: currentBalance + amount,
                        updatedAt: serverTimestamp()
                    })];
            case 4:
                _a.sent();
                return [4 /*yield*/, ctx.reply("\u2705 Foydalanuvchi (ID: ".concat(targetTgId, ") balansiga ").concat(amount, " ball qo'shildi."))];
            case 5:
                _a.sent();
                return [4 /*yield*/, bot.telegram.sendMessage(targetTgId, "\uD83D\uDCB0 <b>Sizning balansingizga ".concat(amount, " ball qo'shildi!</b>"), { parse_mode: "HTML" }).catch(function () { })];
            case 6:
                _a.sent();
                return [3 /*break*/, 8];
            case 7: return [2 /*return*/, ctx.reply("❌ Bunday ID ga ega foydalanuvchi topilmadi.")];
            case 8: return [3 /*break*/, 10];
            case 9:
                e_11 = _a.sent();
                console.error("Add balance error:", e_11);
                return [2 /*return*/, ctx.reply("❌ Xatolik yuz berdi.")];
            case 10: return [2 /*return*/];
        }
    });
}); });
bot.command("javobsiz", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, handleUnansweredRequest(ctx)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
function handleUnansweredRequest(ctx) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, authed, loadingMsg, qMessages, msgSnap, rawMsgs, latestConvMessage, partnerNames, isAdminMsg, _i, rawMsgs_1, m, partnerId, partnerName, unansweredList, _a, _b, _c, partnerId, lastMsg, partnerName, date, timeStr, text, i, item, inline_keyboard, _d, _e, item, err_8;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    userId = ctx.from.id;
                    return [4 /*yield*/, getAuthedUser(userId)];
                case 1:
                    authed = _g.sent();
                    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
                        return [2 /*return*/, ctx.reply("Sizda bu huquq yo'q.")];
                    }
                    return [4 /*yield*/, ctx.reply("🔍 Javob berilmagan murojaatlar qidirilmoqda...")];
                case 2:
                    loadingMsg = _g.sent();
                    _g.label = 3;
                case 3:
                    _g.trys.push([3, 6, , 9]);
                    qMessages = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(300));
                    return [4 /*yield*/, getDocs(qMessages)];
                case 4:
                    msgSnap = _g.sent();
                    rawMsgs = msgSnap.docs.map(function (doc) { return (__assign(__assign({}, doc.data()), { id: doc.id })); });
                    rawMsgs.sort(function (a, b) {
                        var _a, _b;
                        var tA = ((_a = a.timestamp) === null || _a === void 0 ? void 0 : _a.toMillis) ? a.timestamp.toMillis() : 0;
                        var tB = ((_b = b.timestamp) === null || _b === void 0 ? void 0 : _b.toMillis) ? b.timestamp.toMillis() : 0;
                        return tA - tB;
                    });
                    latestConvMessage = new Map();
                    partnerNames = new Map();
                    isAdminMsg = function (m) {
                        return m.senderId === "SYSTEM_ADMIN" ||
                            m.senderRole === "admin" ||
                            m.senderRole === "subadmin";
                    };
                    for (_i = 0, rawMsgs_1 = rawMsgs; _i < rawMsgs_1.length; _i++) {
                        m = rawMsgs_1[_i];
                        partnerId = "";
                        partnerName = "";
                        if (isAdminMsg(m)) {
                            partnerId = m.receiverId;
                            partnerName = m.receiverName || "Foydalanuvchi";
                        }
                        else {
                            partnerId = m.senderId;
                            partnerName = m.senderName || "Foydalanuvchi";
                        }
                        if (partnerId && partnerId !== "SYSTEM_ADMIN") {
                            latestConvMessage.set(partnerId, m);
                            if (!isAdminMsg(m)) {
                                partnerNames.set(partnerId, partnerName);
                            }
                            else if (partnerName && partnerName !== "Foydalanuvchi") {
                                partnerNames.set(partnerId, partnerName);
                            }
                        }
                    }
                    unansweredList = [];
                    for (_a = 0, _b = latestConvMessage.entries(); _a < _b.length; _a++) {
                        _c = _b[_a], partnerId = _c[0], lastMsg = _c[1];
                        if (!isAdminMsg(lastMsg)) {
                            partnerName = partnerNames.get(partnerId) || "Foydalanuvchi";
                            date = ((_f = lastMsg.timestamp) === null || _f === void 0 ? void 0 : _f.toDate) ? lastMsg.timestamp.toDate() : new Date();
                            timeStr = date.toLocaleDateString("uz-UZ") + " " + date.toLocaleTimeString("uz-UZ", { hour: '2-digit', minute: '2-digit' });
                            unansweredList.push({
                                partnerId: partnerId,
                                partnerName: partnerName,
                                text: lastMsg.text || "(Matnsiz)",
                                timeStr: timeStr
                            });
                        }
                    }
                    return [4 /*yield*/, ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(function () { })];
                case 5:
                    _g.sent();
                    if (unansweredList.length === 0) {
                        return [2 /*return*/, ctx.reply("🎉 <b>Ajoyib! Barcha murojaatlarga javob berilgan!</b>\n\nHech qanday javob berilmagan xabarlar topilmadi.", { parse_mode: "HTML" })];
                    }
                    text = "\uD83D\uDCE5 <b>Javob berilmagan murojaatlar ro'yxati (".concat(unansweredList.length, " ta):</b>\n\n");
                    for (i = 0; i < unansweredList.length; i++) {
                        item = unansweredList[i];
                        text += "".concat(i + 1, ". \uD83D\uDC64 <b>").concat(item.partnerName, "</b> (ID: <code>").concat(item.partnerId, "</code>)\n");
                        text += "\uD83D\uDD52 <code>".concat(item.timeStr, "</code>\n");
                        text += "\uD83D\uDCAC <i>\"".concat(item.text.substring(0, 100)).concat(item.text.length > 100 ? '...' : '', "\"</i>\n");
                        text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
                    }
                    text += "\n\u270D\uFE0F Javob yozish uchun quyidagi ro'yxatdan foydalanuvchini tanlang:";
                    inline_keyboard = [];
                    for (_d = 0, _e = unansweredList.slice(0, 10); _d < _e.length; _d++) {
                        item = _e[_d];
                        inline_keyboard.push([
                            {
                                text: "\u270D\uFE0F ".concat(item.partnerName.substring(0, 25)),
                                callback_data: "reply_".concat(item.partnerId),
                            }
                        ]);
                    }
                    if (unansweredList.length > 10) {
                        text += "\n\n\uD83D\uDCCC <i>Yana ".concat(unansweredList.length - 10, " ta javobsiz xabar bor, birinchi 10 tasi yuqorida ko'rsatilgan. To'liq ro'yxatni ko'rish yoki boshqa foydalanuvchi bilan yozishmalarni ko'rish uchun <code>/viewmsg_ID</code> ko'rinishida yuboring.</i>");
                    }
                    return [2 /*return*/, ctx.reply(text, {
                            parse_mode: "HTML",
                            reply_markup: {
                                inline_keyboard: inline_keyboard
                            }
                        })];
                case 6:
                    err_8 = _g.sent();
                    if (!(loadingMsg === null || loadingMsg === void 0 ? void 0 : loadingMsg.message_id)) return [3 /*break*/, 8];
                    return [4 /*yield*/, ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(function () { })];
                case 7:
                    _g.sent();
                    _g.label = 8;
                case 8:
                    console.error("Unanswered messages error:", err_8);
                    return [2 /*return*/, ctx.reply("Xatolik yuz berdi: " + err_8.message)];
                case 9: return [2 /*return*/];
            }
        });
    });
}
bot.command("login", function (ctx) {
    if (!db)
        return ctx.reply("Ma'lumotlar bazasi ulanmagan.");
    pendingLogins.set(ctx.from.id, { step: "email" });
    ctx.reply("Profilga kirish uchun loginingizni yoki emailingizni kiriting:");
});
bot.command("tizimhaqida", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, authed, text, e_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = ctx.from.id;
                return [4 /*yield*/, getAuthedUser(userId)];
            case 1:
                authed = _a.sent();
                if (!authed || (authed.role !== "admin" && authed.role !== "subadmin")) {
                    return [2 /*return*/, ctx.reply("❌ Bu buyruq faqat adminlar uchun.")];
                }
                text = ctx.message.text.replace("/tizimhaqida", "").trim();
                if (!text) {
                    return [2 /*return*/, ctx.reply("✍️ Tizim haqida matnni yangilash uchun: \n`/tizimhaqida MATN` ko'rinishida yuboring.", { parse_mode: "Markdown" })];
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, setDoc(doc(db, "siteContent", "system_about"), {
                        content: text,
                        updatedAt: serverTimestamp(),
                        updatedBy: authed.displayName || userId
                    }, { merge: true })];
            case 3:
                _a.sent();
                return [2 /*return*/, ctx.reply("✅ Tizim haqida matni muvaffaqiyatli yangilandi!")];
            case 4:
                e_12 = _a.sent();
                console.error("Update systemInfo error:", e_12);
                return [2 /*return*/, ctx.reply("❌ Matnni saqlashda xatolik yuz berdi.")];
            case 5: return [2 /*return*/];
        }
    });
}); });
bot.command("app", function (ctx) {
    ctx.reply("AI Edu platformasini Telegram ichidan chiqmasdan to'liq ishlatish uchun quyidagi tugmani bosing va Miniapp-ga kiring:", {
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
    });
});
bot.action("admin_edit_menu_main", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, menuDoc, kb, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = ctx.from.id;
                return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
            case 1:
                menuDoc = _a.sent();
                kb = [];
                if (menuDoc.exists())
                    kb = menuDoc.data().keyboard || [];
                msg = "📝 <b>Joriy asosiy menyu:</b>\n\n";
                if (kb.length === 0)
                    msg += "<i>Standart menyu ishlatilmoqda.</i>";
                else {
                    kb.forEach(function (row, i) {
                        msg += "".concat(i + 1, "-qator: ").concat(row.map(function (b) { return "[".concat(b.text, "]"); }).join(" "), "\n");
                    });
                }
                return [4 /*yield*/, ctx.reply(msg, { parse_mode: "HTML" })];
            case 2:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("admin_add_button", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pendingLogins.set(ctx.from.id, { step: "admin_add_button_name" });
                return [4 /*yield*/, ctx.reply("➕ Yangi tugma nomini kiriting:")];
            case 1:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("admin_delete_button", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var menuDoc, kb, buttons;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
            case 1:
                menuDoc = _a.sent();
                kb = [];
                if (menuDoc.exists())
                    kb = menuDoc.data().keyboard || [];
                if (kb.length === 0)
                    return [2 /*return*/, ctx.reply("O'chirish uchun tugmalar topilmadi (standart menyu ishlatilmoqda).")];
                buttons = [];
                kb.forEach(function (row, rIdx) {
                    row.forEach(function (btn, bIdx) {
                        buttons.push([{ text: "\u274C ".concat(btn.text), callback_data: "admin_delbtn_".concat(rIdx, "_").concat(bIdx) }]);
                    });
                });
                return [4 /*yield*/, ctx.reply("O'chirmoqchi bo'lgan tugmani tanlang:", {
                        reply_markup: { inline_keyboard: buttons }
                    })];
            case 2:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action(/admin_delbtn_(\d+)_(\d+)/, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var rIdx, bIdx, menuDoc, kb, deleted;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                rIdx = parseInt(ctx.match[1]);
                bIdx = parseInt(ctx.match[2]);
                return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
            case 1:
                menuDoc = _a.sent();
                if (!menuDoc.exists()) return [3 /*break*/, 4];
                kb = menuDoc.data().keyboard || [];
                if (!kb[rIdx]) return [3 /*break*/, 4];
                deleted = kb[rIdx].splice(bIdx, 1);
                if (kb[rIdx].length === 0)
                    kb.splice(rIdx, 1);
                return [4 /*yield*/, setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true })];
            case 2:
                _a.sent();
                return [4 /*yield*/, ctx.reply("\u2705 \"".concat(deleted[0].text, "\" tugmasi o'chirildi."))];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("admin_rename_button", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pendingLogins.set(ctx.from.id, { step: "admin_rename_button_select" });
                return [4 /*yield*/, ctx.reply("✏️ Nomini o'zgartirmoqchi bo'lgan tugmaning AMALDAGI nomini kiriting:")];
            case 1:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("admin_edit_msg_text", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pendingLogins.set(ctx.from.id, { step: "admin_edit_msg_select" });
                return [4 /*yield*/, ctx.reply("📄 Qaysi tugma bosilganda chiqadigan matnni o'zgartirmoqchisiz? Tugma nomini kiriting:")];
            case 1:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("admin_edit_system_about", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pendingLogins.set(ctx.from.id, { step: "admin_edit_system_about" });
                return [4 /*yield*/, ctx.reply("ℹ️ 'Tizim haqida' bo'limi uchun yangi matnni yuboring:")];
            case 1:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("admin_reorder_button", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pendingLogins.set(ctx.from.id, { step: "admin_reorder_button_select" });
                return [4 /*yield*/, ctx.reply("🔢 Qaysi tugmaning tartibini o'zgartirmoqchisiz? Tugma nomini kiriting:")];
            case 1:
                _a.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action(/admin_approve_pay_(\d+)/, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var targetId, uName, q, s, e_13, promptMsg;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                targetId = parseInt(ctx.match[1]);
                uName = "Foydalanuvchi";
                _f.label = 1;
            case 1:
                _f.trys.push([1, 3, , 4]);
                q = query(collection(db, "users"), where("telegramId", "==", targetId));
                return [4 /*yield*/, getDocs(q)];
            case 2:
                s = _f.sent();
                if (!s.empty)
                    uName = s.docs[0].data().name || s.docs[0].data().displayName || uName;
                return [3 /*break*/, 4];
            case 3:
                e_13 = _f.sent();
                return [3 /*break*/, 4];
            case 4: return [4 /*yield*/, ctx.reply("\uD83D\uDC64 <b>".concat(uName, "</b> uchun qancha ball qo'shmoqchisiz? Faqat son kiriting:"), { parse_mode: "HTML" })];
            case 5:
                promptMsg = _f.sent();
                pendingLogins.set(ctx.from.id, {
                    step: "admin_payment_amount",
                    targetPaymentUserId: targetId,
                    originalMessageId: (_b = (_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.message_id,
                    originalChatId: (_e = (_d = (_c = ctx.callbackQuery) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.chat) === null || _e === void 0 ? void 0 : _e.id,
                    promptMessageId: promptMsg.message_id
                });
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action(/admin_reject_pay_(\d+)/, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var targetId, userId, pQuery, pSnap, pDoc, pData, _i, _a, item, e_14;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                targetId = parseInt(ctx.match[1]);
                userId = ctx.from.id;
                return [4 /*yield*/, bot.telegram.sendMessage(targetId, "\u274C To'lov chekingiz rad etildi.\n\nIltimos administrator bilan bog'laning.", { parse_mode: "HTML" }).catch(function () { })];
            case 1:
                _b.sent();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 10, , 11]);
                pQuery = query(collection(db, "payments"), where("userId", "==", targetId), where("status", "==", "pending"), orderBy("timestamp", "desc"), limit(1));
                return [4 /*yield*/, getDocs(pQuery)];
            case 3:
                pSnap = _b.sent();
                if (!!pSnap.empty) return [3 /*break*/, 9];
                pDoc = pSnap.docs[0];
                pData = pDoc.data();
                if (!Array.isArray(pData.tgSentMessages)) return [3 /*break*/, 7];
                _i = 0, _a = pData.tgSentMessages;
                _b.label = 4;
            case 4:
                if (!(_i < _a.length)) return [3 /*break*/, 7];
                item = _a[_i];
                if (!(item.chatId && item.messageId)) return [3 /*break*/, 6];
                return [4 /*yield*/, bot.telegram.deleteMessage(item.chatId, item.messageId).catch(function () { })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7: return [4 /*yield*/, updateDoc(doc(db, "payments", pDoc.id), {
                    status: "rejected",
                    processedAt: serverTimestamp(),
                    processedBy: userId
                })];
            case 8:
                _b.sent();
                _b.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                e_14 = _b.sent();
                return [3 /*break*/, 11];
            case 11: return [4 /*yield*/, ctx.reply("❌ To'lov rad etildi va foydalanuvchiga xabar yuborildi.")];
            case 12:
                _b.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action("add_balance", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var e_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, ctx.answerCbQuery()];
            case 1:
                _a.sent();
                return [4 /*yield*/, ctx.reply(paymentInstructionsText, { parse_mode: "HTML" })];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                e_15 = _a.sent();
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
bot.action("logout", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, authed, snap, e_16, _a, _b, _c;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                userId = ctx.from.id;
                return [4 /*yield*/, getAuthedUser(userId)];
            case 1:
                authed = _f.sent();
                pendingLogins.delete(userId);
                if (!(authed && db)) return [3 /*break*/, 7];
                _f.label = 2;
            case 2:
                _f.trys.push([2, 6, , 7]);
                return [4 /*yield*/, getDocs(query(collection(db, "users"), where("telegramId", "==", userId)))];
            case 3:
                snap = _f.sent();
                if (!!snap.empty) return [3 /*break*/, 5];
                return [4 /*yield*/, updateDoc(doc(db, "users", snap.docs[0].id), {
                        telegramId: deleteField(),
                    })];
            case 4:
                _f.sent();
                _f.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                e_16 = _f.sent();
                console.error("Logout error", e_16);
                return [3 /*break*/, 7];
            case 7:
                authedUsers.delete(userId);
                aiAssistantActiveUsers.delete(userId);
                _b = (_a = ctx).reply;
                _c = ["✅ Siz tizimdan muvaffaqiyatli chiqdingiz."];
                _d = {};
                _e = {};
                return [4 /*yield*/, getKeyboard(undefined, userId, false)];
            case 8: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.reply_markup = (_e.keyboard = _f.sent(),
                        _e.resize_keyboard = true,
                        _e),
                        _d)]))];
            case 9:
                _f.sent();
                try {
                    ctx.answerCbQuery();
                }
                catch (e) { }
                return [2 /*return*/];
        }
    });
}); });
bot.action(/reply_(.+)/, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var targetUserId, originalText, promptMsg;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                targetUserId = ctx.match[1];
                originalText = "";
                if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
                    if ("text" in ctx.callbackQuery.message) {
                        originalText = ctx.callbackQuery.message.text;
                    }
                    else if ("caption" in ctx.callbackQuery.message) {
                        originalText = ctx.callbackQuery.message.caption || "";
                    }
                }
                return [4 /*yield*/, ctx.reply("Javob xabarini yuboring (bu unga Telegram va tizim orqali boradi):")];
            case 1:
                promptMsg = _g.sent();
                pendingLogins.set(ctx.from.id, {
                    step: "reply_message",
                    targetUserId: targetUserId,
                    originalMessageId: (_c = (_b = ctx.callbackQuery) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.message_id,
                    originalChatId: (_f = (_e = (_d = ctx.callbackQuery) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.chat) === null || _f === void 0 ? void 0 : _f.id,
                    promptMessageId: promptMsg.message_id,
                    originalText: originalText,
                });
                ctx.answerCbQuery();
                return [2 /*return*/];
        }
    });
}); });
bot.action(/viewmsg_(.+)/, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var targetUserId, adminUid_1, msgs, q1, snap1, q2, snap2, seen_1, text, _i, msgs_1, m, roleName, e_17;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                targetUserId = ctx.match[1];
                ctx.answerCbQuery();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                adminUid_1 = (_a = authedUsers.get(ctx.from.id)) === null || _a === void 0 ? void 0 : _a.uid;
                if (!adminUid_1)
                    return [2 /*return*/, ctx.reply("Sizning profilingiz aniqlanmadi.")];
                msgs = [];
                q1 = query(collection(db, "messages"), where("senderId", "==", targetUserId));
                return [4 /*yield*/, getDocs(q1)];
            case 2:
                snap1 = _b.sent();
                msgs.push.apply(msgs, snap1.docs.map(function (d) { return (__assign(__assign({}, d.data()), { id: d.id })); }));
                q2 = query(collection(db, "messages"), where("receiverId", "==", targetUserId));
                return [4 /*yield*/, getDocs(q2)];
            case 3:
                snap2 = _b.sent();
                msgs.push.apply(msgs, snap2.docs.map(function (d) { return (__assign(__assign({}, d.data()), { id: d.id })); }));
                seen_1 = new Set();
                msgs = msgs
                    .filter(function (d) {
                    if (seen_1.has(d.id))
                        return false;
                    seen_1.add(d.id);
                    return (d.receiverId === adminUid_1 ||
                        d.receiverRole === "admin" ||
                        d.senderId === adminUid_1 ||
                        d.senderRole === "admin");
                })
                    .sort(function (a, b) { var _a, _b; return (((_a = a.timestamp) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0) - (((_b = b.timestamp) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0); });
                if (msgs.length === 0) {
                    return [2 /*return*/, ctx.reply("Xabarlar topilmadi.")];
                }
                msgs = msgs.slice(-20); // last 20
                text = "<b>".concat(msgs[msgs.length - 1].senderName || "Foydalanuvchi", " bilan yozishmalar:</b>\n\n");
                for (_i = 0, msgs_1 = msgs; _i < msgs_1.length; _i++) {
                    m = msgs_1[_i];
                    roleName = m.senderId === adminUid_1 || m.senderRole === "admin"
                        ? "Siz"
                        : m.senderName || "U";
                    text += "\uD83D\uDC64 <b>".concat(roleName, ":</b> ").concat(m.text || "", "\n");
                }
                ctx.reply(text, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✍️ Javob yozish", callback_data: "reply_".concat(targetUserId) }],
                        ],
                    },
                });
                return [3 /*break*/, 5];
            case 4:
                e_17 = _b.sent();
                ctx.reply("Xatolik: " + e_17.message);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Filter deleted handling here
var statsCache = {
    data: "",
    timestamp: 0
};
function getSystemContextInfo() {
    return __awaiter(this, void 0, void 0, function () {
        var now, studentsCount, teachersCount, staffCount, adminsCount, tgUsersCount, coursesListText, _a, sSnap, tSnap, stSnap, aSnap, tgSnap, cSnap, e_18, statsCachePath_1, cachedStats, totalUsers, result, statsCachePath, contentStr;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    now = Date.now();
                    if (statsCache.data && (now - statsCache.timestamp < 1000 * 60 * 10)) { // 10 minute cache
                        return [2 /*return*/, statsCache.data];
                    }
                    studentsCount = 0;
                    teachersCount = 0;
                    staffCount = 0;
                    adminsCount = 0;
                    tgUsersCount = 0;
                    coursesListText = "Hozircha kurslar kiritilmagan.";
                    if (!db) return [3 /*break*/, 5];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.all([
                            getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
                            getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
                            getCountFromServer(query(collection(db, "users"), where("role", "==", "staff"))),
                            getCountFromServer(query(collection(db, "users"), where("role", "==", "admin"))),
                            getCountFromServer(collection(db, "telegram_users"))
                        ])];
                case 2:
                    _a = _b.sent(), sSnap = _a[0], tSnap = _a[1], stSnap = _a[2], aSnap = _a[3], tgSnap = _a[4];
                    studentsCount = sSnap.data().count;
                    teachersCount = tSnap.data().count;
                    staffCount = stSnap.data().count;
                    adminsCount = aSnap.data().count;
                    tgUsersCount = tgSnap.data().count;
                    // Special case for super admin
                    if (adminsCount === 0)
                        adminsCount = 1;
                    return [4 /*yield*/, getDocs(query(collection(db, "courses"), limit(10)))];
                case 3:
                    cSnap = _b.sent();
                    if (!cSnap.empty) {
                        coursesListText = cSnap.docs.map(function (d) {
                            var c = d.data();
                            return "- ".concat(c.title, " (").concat(c.category || "Dasturlash", ")");
                        }).join("\n");
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_18 = _b.sent();
                    console.log("[ContextStats] Error or quota limit in context fetch:", e_18.message);
                    statsCachePath_1 = path.join(process.cwd(), "telegram_stats_cache.json");
                    if (fs.existsSync(statsCachePath_1)) {
                        try {
                            cachedStats = JSON.parse(fs.readFileSync(statsCachePath_1, "utf8"));
                            adminsCount = cachedStats.adminsCount || 1;
                            teachersCount = cachedStats.teachersCount || 0;
                            staffCount = cachedStats.staffCount || 0;
                            studentsCount = cachedStats.studentsCount || 0;
                            tgUsersCount = cachedStats.tgUsersCount || 0;
                        }
                        catch (err) { }
                    }
                    return [3 /*break*/, 5];
                case 5:
                    totalUsers = adminsCount + teachersCount + staffCount + studentsCount;
                    result = "Tizimning joriy haqiqiy statistikasi va ma'lumotlari:\n- Jami ro'yxatdan o'tgan foydalanuvchilar: ".concat(totalUsers, " ta\n- Tizimdagi adminlar (Adminlar): ").concat(adminsCount, " ta (Bosh admin: Elyorbek)\n- Tizimdagi tashkilotlar / o'quv markazlari (Teachers/Organizations): ").concat(teachersCount, " ta\n- Tizimdagi o'qituvchilar va xodimlar (Staff): ").concat(staffCount, " ta\n- Tizimdagi talabalar / o'quvchilar (Students): ").concat(studentsCount, " ta\n- Telegram botimizdan faol foydalanayotgan a'zolar (start yuborganlar): ").concat(tgUsersCount, " ta\n\nPlatformadagi joriy fanlar / dars kurslari ro'yxati:\n").concat(coursesListText);
                    statsCache.data = result;
                    statsCache.timestamp = now;
                    statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
                    try {
                        contentStr = JSON.stringify({
                            adminsCount: adminsCount,
                            teachersCount: teachersCount,
                            staffCount: staffCount,
                            studentsCount: studentsCount,
                            tgUsersCount: tgUsersCount
                        });
                        fs.writeFileSync(statsCachePath, contentStr, "utf8");
                    }
                    catch (err) { }
                    return [2 /*return*/, result];
            }
        });
    });
}
var userWizardStates = new PersistentMap(path.join(process.cwd(), "telegram_wizard_states.json"), "wizard");
function ensureUserStateSynced(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var docRef, snap, data, err_9, errMsg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!db)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    docRef = doc(db, "telegram_user_states", String(userId));
                    return [4 /*yield*/, getDoc(docRef)];
                case 2:
                    snap = _a.sent();
                    if (snap.exists()) {
                        data = snap.data();
                        // sync authedUsers
                        if (data.authed) {
                            authedUsers.setLocalOnly(userId, data.authed);
                        }
                        else {
                            authedUsers.deleteLocalOnly(userId);
                        }
                        // sync aiActive
                        if (data.aiActive !== undefined) {
                            aiAssistantActiveUsers.setLocalOnly(userId, data.aiActive);
                        }
                        else {
                            aiAssistantActiveUsers.deleteLocalOnly(userId);
                        }
                        // sync aiState
                        if (data.aiState !== undefined) {
                            aiServiceStates.setLocalOnly(userId, data.aiState);
                        }
                        else {
                            aiServiceStates.deleteLocalOnly(userId);
                        }
                        // sync wizard
                        if (data.wizard) {
                            userWizardStates.setLocalOnly(userId, data.wizard);
                        }
                        else {
                            userWizardStates.deleteLocalOnly(userId);
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_9 = _a.sent();
                    errMsg = String((err_9 === null || err_9 === void 0 ? void 0 : err_9.message) || "").toLowerCase();
                    if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
                        console.warn("[ensureUserStateSynced] Quota limit exceeded for ".concat(userId, ". Using local cache."));
                    }
                    else {
                        console.error("[ensureUserStateSynced] Error syncing state for ".concat(userId, " from Firestore:"), err_9);
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function runPresentationGeneration(ctx, data) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, loadingMsg, topicStr, res, respData, PptxGenJS_1, pptx_1, templateName, designPlanText, slidesList, stylesMap, selectedStyle_1, getSlideImage_1, getIconUrl_1, getChartUrl_1, pptxBuffer, filename, _a, _b, _c, errText, errMsg, errorJson, e_19, err_10;
        var _d, _e;
        var _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    userId = ctx.from.id;
                    chatId = (_f = ctx.chat) === null || _f === void 0 ? void 0 : _f.id;
                    return [4 /*yield*/, ctx.reply("\u23F3 <b>Taqdimot tayyorlanmoqda...</b>\n\nIltimos kuting, bu biroz vaqt olishi mumkin.", { parse_mode: "HTML" })];
                case 1:
                    loadingMsg = _h.sent();
                    _h.label = 2;
                case 2:
                    _h.trys.push([2, 17, , 18]);
                    topicStr = "Mavzu: ".concat(data.topic, ". Slaydlar soni: ").concat(data.slideCount, ". Dizayn turi: ").concat(data.designType, ". Qo'shimcha talablar: ").concat(data.requirements);
                    return [4 /*yield*/, fetch(getApiUrl("/api/gemini"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                action: "generatePresentation",
                                topic: topicStr,
                                count: Number(data.slideCount) || 15
                            })
                        })];
                case 3:
                    res = _h.sent();
                    return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
                case 4:
                    _h.sent();
                    if (!res.ok) return [3 /*break*/, 10];
                    return [4 /*yield*/, res.json()];
                case 5:
                    respData = _h.sent();
                    return [4 /*yield*/, import("pptxgenjs")];
                case 6:
                    PptxGenJS_1 = (_h.sent()).default;
                    pptx_1 = new PptxGenJS_1();
                    templateName = respData.template || data.designType || "Modern";
                    designPlanText = respData.designPlan || "Professional Design Template";
                    slidesList = Array.isArray(respData.slides) ? respData.slides : (Array.isArray(respData) ? respData : []);
                    stylesMap = {
                        Zamonaviy: {
                            bg: "F8FAFC", coverBg: "0F172A", titleColor: "FFFFFF", contentTitleColor: "0F172A",
                            contentSub: "2563EB", contentBody: "1E293B", primaryAccent: "2563EB", secondaryAccent: "7C3AED",
                            accentLight: "EFF6FF", bannerFill: "0F172A"
                        },
                        Akademik: {
                            bg: "FAF8F5", coverBg: "1E40AF", titleColor: "FFFFFF", contentTitleColor: "1E3A8A",
                            contentSub: "10B981", contentBody: "1F2937", primaryAccent: "1E40AF", secondaryAccent: "F59E0B",
                            accentLight: "EFF6FF", bannerFill: "1E40AF"
                        },
                        Minimalistik: {
                            bg: "FFFFFF", coverBg: "171717", titleColor: "FFFFFF", contentTitleColor: "000000",
                            contentSub: "2563EB", contentBody: "262626", primaryAccent: "000000", secondaryAccent: "7C3AED",
                            accentLight: "F5F5F5", bannerFill: "171717"
                        },
                        Korporativ: {
                            bg: "F1F5F9", coverBg: "0B0F19", titleColor: "FFFFFF", contentTitleColor: "0B0F19",
                            contentSub: "EF4444", contentBody: "334155", primaryAccent: "2563EB", secondaryAccent: "10B981",
                            accentLight: "E2E8F0", bannerFill: "0B0F19"
                        }
                    };
                    selectedStyle_1 = stylesMap[templateName] || stylesMap.Zamonaviy || stylesMap.Modern;
                    getSlideImage_1 = function (queryOrObj) {
                        var query = typeof queryOrObj === "string"
                            ? queryOrObj
                            : ((queryOrObj === null || queryOrObj === void 0 ? void 0 : queryOrObj.imageKeyword) || (queryOrObj === null || queryOrObj === void 0 ? void 0 : queryOrObj.title) || data.topic || "presentation");
                        return "https://image.pollinations.ai/prompt/".concat(encodeURIComponent(query), "?width=800&height=600&nologo=true&seed=").concat(Math.floor(Math.random() * 1000));
                    };
                    getIconUrl_1 = function (iconName) {
                        var cleanName = iconName;
                        if (!cleanName.includes(':'))
                            cleanName = "mdi:".concat(cleanName);
                        return "https://api.iconify.design/".concat(cleanName, ".svg?width=128&height=128&color=%23").concat(selectedStyle_1.primaryAccent);
                    };
                    getChartUrl_1 = function (chartData, chartType) {
                        if (chartType === void 0) { chartType = 'bar'; }
                        var labels = chartData.map(function (d) { return d.label; });
                        var data = chartData.map(function (d) { return Number(d.value); });
                        var chartConfig = {
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
                        return "https://quickchart.io/chart?c=".concat(encodeURIComponent(JSON.stringify(chartConfig)), "&w=600&h=400&bkg=white");
                    };
                    slidesList.forEach(function (s, idx) {
                        var layout = s.layout || (idx === 0 ? "cover" : "content");
                        var slide = pptx_1.addSlide();
                        // @ts-ignore
                        slide.transition = { type: "morph" };
                        if (s.iconType && layout !== "cover" && layout !== "image-left" && layout !== "image-right" && layout !== "chart") {
                            try {
                                slide.addImage({ path: getIconUrl_1(s.iconType), x: 8.5, y: 0.15, w: 0.7, h: 0.7 });
                            }
                            catch (e) { }
                        }
                        if (layout === "cover") {
                            slide.background = { fill: selectedStyle_1.coverBg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 5.625, fill: { color: selectedStyle_1.primaryAccent } });
                            slide.addShape(pptx_1.ShapeType.rect, { x: 8.5, y: 0, w: 1.5, h: 1.5, fill: { color: selectedStyle_1.secondaryAccent, transparency: 80 } });
                            slide.addText(s.title || data.topic, { x: 1.0, y: 1.5, w: 8.0, h: 1.5, fontSize: 38, bold: true, color: selectedStyle_1.titleColor, align: "left", valign: "middle" });
                            slide.addText(s.subtitle || "Premium designed presentation", { x: 1.0, y: 3.1, w: 8.0, h: 0.6, fontSize: 20, color: selectedStyle_1.contentSub, align: "left" });
                            slide.addText(s.content || "Microsoft PowerPoint Custom Layout Template.", { x: 1.0, y: 4.1, w: 8.0, h: 0.8, fontSize: 13, color: "94A3B8", align: "left" });
                        }
                        else if (layout === "agenda" || layout === "summary") {
                            slide.background = { fill: selectedStyle_1.bg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_1.bannerFill } });
                            slide.addText(s.title || "Mundarija", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                            if (s.bulletPoints && s.bulletPoints.length > 0) {
                                s.bulletPoints.forEach(function (bp, i) {
                                    var xOffset = i % 2 === 0 ? 0.8 : 5.2;
                                    var yOffset = 1.3 + Math.floor(i / 2) * 1.3;
                                    if (yOffset + 1.1 <= 5.625) {
                                        slide.addShape(pptx_1.ShapeType.rect, { x: xOffset, y: yOffset, w: 4.0, h: 1.1, fill: { color: "FFFFFF" }, line: { color: selectedStyle_1.secondaryAccent, width: 1 } });
                                        slide.addShape(pptx_1.ShapeType.rect, { x: xOffset, y: yOffset, w: 0.1, h: 1.1, fill: { color: selectedStyle_1.primaryAccent } });
                                        slide.addShape(pptx_1.ShapeType.rect, { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fill: { color: selectedStyle_1.accentLight } });
                                        slide.addText(String(i + 1).padStart(2, '0'), { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: selectedStyle_1.primaryAccent, align: "center", valign: "middle" });
                                        slide.addText(bp, { x: xOffset + 0.8, y: yOffset + 0.1, w: 3.0, h: 0.9, fontSize: 13, bold: true, color: selectedStyle_1.contentBody, valign: "middle" });
                                    }
                                });
                            }
                            else if (layout === "summary") {
                                slide.addShape(pptx_1.ShapeType.rect, { x: 1.5, y: 1.4, w: 7.0, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle_1.primaryAccent, width: 2 } });
                                slide.addText("🏆 XULOSA VA TAQDIMOT YAKUNI", { x: 2.0, y: 1.7, w: 6.0, h: 0.5, fontSize: 22, bold: true, color: selectedStyle_1.contentTitleColor, align: "center" });
                                slide.addText(s.content || "Mavzu yuzasidan barcha zarur xulosalar to'liq shakllantirildi.", { x: 2.0, y: 2.4, w: 6.0, h: 1.2, fontSize: 16, color: selectedStyle_1.contentBody, align: "center" });
                                slide.addText("E'tiboringiz uchun rahmat!", { x: 2.0, y: 3.8, w: 6.0, h: 0.6, fontSize: 20, bold: true, color: selectedStyle_1.contentSub, align: "center" });
                            }
                            else {
                                slide.addText(s.content || "", { x: 0.8, y: 1.5, w: 8.4, h: 3.0, fontSize: 16, color: selectedStyle_1.contentBody });
                            }
                        }
                        else if (layout === "image-left") {
                            slide.background = { fill: selectedStyle_1.bg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_1.bannerFill } });
                            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0.7, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle_1.accentLight } });
                            var imgUrl = getSlideImage_1(s);
                            slide.addImage({ path: imgUrl, x: 0.8, y: 1.3, w: 4.0, h: 3.6 });
                            if (s.chartData) {
                                slide.addImage({ path: getChartUrl_1(s.chartData), x: 5.5, y: 2.0, w: 4, h: 2.5 });
                            }
                            var currY = 1.3;
                            if (s.subtitle) {
                                slide.addText(s.subtitle, { x: 5.1, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle_1.contentSub });
                                currY += 0.6;
                            }
                            if (s.content) {
                                slide.addText(s.content, { x: 5.1, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                                currY += 1.4;
                            }
                            if (s.bulletPoints && s.bulletPoints.length > 0) {
                                var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                                slide.addText(bulletTxt, { x: 5.1, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                            }
                        }
                        else if (layout === "image-right") {
                            slide.background = { fill: selectedStyle_1.bg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_1.bannerFill } });
                            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                            slide.addShape(pptx_1.ShapeType.rect, { x: 5.3, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle_1.accentLight } });
                            var imgUrl = getSlideImage_1(s);
                            slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });
                            var currY = 1.3;
                            if (s.subtitle) {
                                slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle_1.contentSub });
                                currY += 0.6;
                            }
                            if (s.content) {
                                slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                                currY += 1.4;
                            }
                            if (s.bulletPoints && s.bulletPoints.length > 0) {
                                var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                                slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                            }
                        }
                        else if (layout === "cards" && s.bulletPoints && s.bulletPoints.length > 0) {
                            slide.background = { fill: selectedStyle_1.bg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_1.bannerFill } });
                            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                            slide.addText(s.subtitle || s.content || "Infografika kartalari", { x: 0.8, y: 1.1, w: 8.4, h: 0.4, fontSize: 14, color: selectedStyle_1.contentSub, italic: true });
                            var pointsCount = s.bulletPoints.length;
                            if (pointsCount > 4)
                                pointsCount = 4;
                            var cWidth = 8.4 / pointsCount - 0.2;
                            for (var i = 0; i < pointsCount; i++) {
                                var startX = 0.8 + (i * cWidth) + (i * 0.2);
                                slide.addShape(pptx_1.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle_1.secondaryAccent, width: 1 } });
                                slide.addShape(pptx_1.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 0.15, fill: { color: (i % 2 === 0 ? selectedStyle_1.primaryAccent : selectedStyle_1.secondaryAccent) } });
                                slide.addText("★", { x: startX + 0.1, y: 1.9, w: cWidth - 0.2, h: 0.4, fontSize: 18, color: selectedStyle_1.primaryAccent, align: "center" });
                                slide.addText(s.bulletPoints[i], { x: startX + 0.1, y: 2.4, w: cWidth - 0.2, h: 2.4, fontSize: 12, color: selectedStyle_1.contentBody, align: "center", valign: "top" });
                            }
                        }
                        else if (layout === "chart" && s.chartData && s.chartData.length > 0) {
                            slide.background = { fill: selectedStyle_1.bg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_1.bannerFill } });
                            slide.addText(s.title || "Tahliliy Diagramma", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                            try {
                                var cImgUrl = getChartUrl_1(s.chartData, s.chartType || "bar");
                                slide.addImage({ path: cImgUrl, x: 0.5, y: 1.3, w: 5.0, h: 3.6 });
                            }
                            catch (e) {
                                // fallback native chart
                                var labels = s.chartData.map(function (d) { return String(d.label || "A"); });
                                var values = s.chartData.map(function (d) { return Number(d.value || 0); });
                                slide.addChart(pptx_1.ChartType.bar, [{ name: "Ma'lumot", labels: labels, values: values }], { x: 0.5, y: 1.3, w: 5.0, h: 3.6 });
                            }
                            slide.addShape(pptx_1.ShapeType.rect, { x: 5.8, y: 1.3, w: 3.8, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle_1.secondaryAccent, width: 1 } });
                            if (s.subtitle) {
                                slide.addText(s.subtitle, { x: 6.0, y: 1.5, w: 3.4, h: 0.5, fontSize: 16, bold: true, color: selectedStyle_1.contentTitleColor });
                            }
                            if (s.content) {
                                slide.addText(s.content, { x: 6.0, y: 2.1, w: 3.4, h: 1.5, fontSize: 13, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                            }
                            if (s.bulletPoints && s.bulletPoints.length > 0) {
                                var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                                slide.addText(bulletTxt, { x: 6.0, y: 3.0, w: 3.4, h: 1.8, fontSize: 12, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                            }
                        }
                        else {
                            slide.background = { fill: selectedStyle_1.bg };
                            slide.addShape(pptx_1.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_1.bannerFill } });
                            slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                            if (s.chartData && s.chartData.length > 0) {
                                try {
                                    var labels = s.chartData.map(function (d) { return String(d.label || "A"); });
                                    var values = s.chartData.map(function (d) { return Number(d.value || 0); });
                                    slide.addChart(pptx_1.ChartType.bar, [{ name: "Ma'lumot", labels: labels, values: values }], { x: 0.8, y: 1.3, w: 4.4, h: 3.6 });
                                    slide.addShape(pptx_1.ShapeType.rect, { x: 5.4, y: 1.3, w: 3.8, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle_1.secondaryAccent, width: 1 } });
                                    slide.addText(s.content || "Tahliliy ma'lumotlar diagrammasi", { x: 5.6, y: 1.5, w: 3.4, h: 3.2, fontSize: 13, color: selectedStyle_1.contentBody });
                                }
                                catch (chartErr) {
                                    slide.addText(s.content || "", { x: 0.8, y: 1.4, w: 8.4, h: 3.5, fontSize: 14, color: selectedStyle_1.contentBody });
                                }
                            }
                            else {
                                var imgUrl = getSlideImage_1(s);
                                slide.addShape(pptx_1.ShapeType.rect, { x: 5.3, y: 1.4, w: 3.9, h: 3.6, fill: { color: selectedStyle_1.accentLight } });
                                slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });
                                var currY = 1.3;
                                if (s.subtitle) {
                                    slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.4, fontSize: 18, bold: true, color: selectedStyle_1.contentSub });
                                    currY += 0.5;
                                }
                                if (s.content) {
                                    slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                                    currY += 1.4;
                                }
                                if (s.bulletPoints && s.bulletPoints.length > 0) {
                                    var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                                    slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle_1.contentBody, lineSpacing: 18 });
                                }
                            }
                        }
                    });
                    return [4 /*yield*/, pptx_1.write({ outputType: "nodebuffer" })];
                case 7:
                    pptxBuffer = _h.sent();
                    filename = "".concat((_g = data.topic) === null || _g === void 0 ? void 0 : _g.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_taqdimot.pptx");
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, ctx.replyWithDocument({ source: pptxBuffer, filename: filename }, { caption: "\uD83D\uDCCA \"".concat(data.topic, "\" mavzusida premium ").concat(templateName, " taqdimoti tayyor!\n\uD83C\uDFA8 Dizayn uslubi: ").concat(designPlanText) })];
                case 8:
                    _h.sent();
                    _b = (_a = ctx).reply;
                    _c = ["🤖 <b>Kerakli xizmatni menyudan tanlang:</b>"];
                    _d = {
                        parse_mode: "HTML"
                    };
                    _e = {};
                    return [4 /*yield*/, getAiAssistantKeyboard(userId)];
                case 9: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.reply_markup = (_e.keyboard = _h.sent(),
                            _e.resize_keyboard = true,
                            _e),
                            _d)]))];
                case 10:
                    errText = "...";
                    errMsg = "";
                    _h.label = 11;
                case 11:
                    _h.trys.push([11, 13, , 15]);
                    return [4 /*yield*/, res.json()];
                case 12:
                    errorJson = _h.sent();
                    errMsg = errorJson.error || "Noma'lum xato";
                    return [3 /*break*/, 15];
                case 13:
                    e_19 = _h.sent();
                    return [4 /*yield*/, res.text().catch(function () { return "Noma'lum xato"; })];
                case 14:
                    errText = _h.sent();
                    errMsg = errText.substring(0, 100);
                    return [3 /*break*/, 15];
                case 15:
                    console.error("Presentation API Error:", res.status, errMsg);
                    userWizardStates.delete(userId);
                    return [2 /*return*/, ctx.reply("\u274C Taqdimot ma'lumotlarini yuklashda xato yuz berdi:\n\n\uD83D\uDCAC Sabab: ".concat(errMsg, "\n\nIltimos, keyinroq qayta urinib ko'ring yoki Slaydlar sonini biroz kamaytirib tekshiring."))];
                case 16: return [3 /*break*/, 18];
                case 17:
                    err_10 = _h.sent();
                    console.error("Presentation generation err:", err_10);
                    userWizardStates.delete(userId);
                    return [2 /*return*/, ctx.reply("❌ Taqdimot PPTX faylini yaratishda xato yuz berdi: " + err_10.message)];
                case 18: return [2 /*return*/];
            }
        });
    });
}
function runDocumentGeneration(ctx, docType, data) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, loadingMsg, topicStr, res, respData, title, content, _a, Document_1, Packer, Paragraph_1, TextRun_1, AlignmentType_1, HeadingLevel_1, children_1, lines, doc_1, docxBuffer, cleanFileName, _b, _c, _d, err_11;
        var _e, _f;
        var _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    userId = ctx.from.id;
                    chatId = (_g = ctx.chat) === null || _g === void 0 ? void 0 : _g.id;
                    return [4 /*yield*/, ctx.reply("\u23F3 <b>Hujjat tayyorlanmoqda...</b>\n\nIltimos kuting, bu biroz vaqt olishi mumkin.", { parse_mode: "HTML" })];
                case 1:
                    loadingMsg = _h.sent();
                    _h.label = 2;
                case 2:
                    _h.trys.push([2, 12, , 13]);
                    topicStr = data.topic;
                    if (docType === "kurs_ishi") {
                        topicStr = "Mavzu: ".concat(data.topic || "", ". Fan: ").concat(data.subject || "", ". OTM: ").concat(data.university || "", ". Fakultet: ").concat(data.faculty || "", ". Kafedra: ").concat(data.department || "", ". Yo'nalish: ").concat(data.direction || "", ". Talaba: ").concat(data.studentName || "", ". Rahbar: ").concat(data.advisor || "", ". Sahifalar: ").concat(data.pageCount || "");
                    }
                    else if (docType === "tezis") {
                        topicStr = "Mavzu: ".concat(data.topic || "", ". Muallif: ").concat(data.author || "", ". OTM: ").concat(data.university || "", ". Yo'nalish: ").concat(data.direction || "", ".");
                    }
                    else if (docType === "maqola") {
                        topicStr = "Mavzu: ".concat(data.topic || "", ". Muallif: ").concat(data.author || "", ". Tashkilot: ").concat(data.org || "", ". Til: ").concat(data.language || "");
                    }
                    else if (docType === "dars_ishlanma") {
                        topicStr = "Mavzu: ".concat(data.topic || "", ". Fan: ").concat(data.subject || "", ". Sinf/Kurs: ").concat(data.classGroup || "", ". Turi: ").concat(data.lessonType || "");
                    }
                    else if (docType === "test") {
                        topicStr = "Mavzu: ".concat(data.topic || "", ". Fan: ").concat(data.subject || "", ". Soni: ").concat(data.questionCount || "", ". Variant: ").concat(data.optionsCount || "");
                    }
                    else if (docType === "cv") {
                        topicStr = "F.I.Sh: ".concat(data.name || "", ".");
                    }
                    return [4 /*yield*/, fetch(getApiUrl("/api/gemini"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                action: "generateDocument",
                                topic: topicStr,
                                docType: docType,
                                options: data
                            })
                        })];
                case 3:
                    res = _h.sent();
                    return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
                case 4:
                    _h.sent();
                    if (!res.ok) return [3 /*break*/, 10];
                    return [4 /*yield*/, res.json()];
                case 5:
                    respData = _h.sent();
                    title = respData.title || data.topic;
                    content = respData.content || "";
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
                    return [4 /*yield*/, import("docx")];
                case 6:
                    _a = _h.sent(), Document_1 = _a.Document, Packer = _a.Packer, Paragraph_1 = _a.Paragraph, TextRun_1 = _a.TextRun, AlignmentType_1 = _a.AlignmentType, HeadingLevel_1 = _a.HeadingLevel;
                    children_1 = [];
                    // Add a styled Page-1: Beautiful Cover Page for coursework
                    if (docType === "kurs_ishi") {
                        children_1.push(new Paragraph_1({
                            children: [new TextRun_1({ text: data.university.toUpperCase(), bold: true, size: 28, font: "Times New Roman" })],
                            alignment: AlignmentType_1.CENTER,
                            spacing: { after: 120 }
                        }));
                        children_1.push(new Paragraph_1({
                            children: [new TextRun_1({ text: "".concat(data.faculty.toUpperCase(), " \n ").concat(data.department.toUpperCase()), bold: true, size: 24, font: "Times New Roman" })],
                            alignment: AlignmentType_1.CENTER,
                            spacing: { after: 1200 }
                        }));
                        children_1.push(new Paragraph_1({
                            children: [new TextRun_1({ text: "KURS ISHI", bold: true, size: 48, font: "Times New Roman", color: "1E3A8A" })],
                            alignment: AlignmentType_1.CENTER,
                            spacing: { after: 400 }
                        }));
                        children_1.push(new Paragraph_1({
                            children: [new TextRun_1({ text: "MAVZU: \"".concat(data.topic.toUpperCase(), "\""), bold: true, size: 28, font: "Times New Roman" })],
                            alignment: AlignmentType_1.CENTER,
                            spacing: { after: 240 }
                        }));
                        children_1.push(new Paragraph_1({
                            children: [new TextRun_1({ text: "Fan: ".concat(data.subject), italics: true, size: 24, font: "Times New Roman" })],
                            alignment: AlignmentType_1.CENTER,
                            spacing: { after: 1500 }
                        }));
                        children_1.push(new Paragraph_1({
                            children: [
                                new TextRun_1({ text: "Bajardi: ".concat(data.studentName, "\n"), bold: true, size: 26, font: "Times New Roman" }),
                                new TextRun_1({ text: "Yo'nalish: ".concat(data.direction, "\n"), size: 24, font: "Times New Roman" }),
                                new TextRun_1({ text: "Ilmiy rahbar: ".concat(data.advisor), bold: true, size: 26, font: "Times New Roman" })
                            ],
                            alignment: AlignmentType_1.RIGHT,
                            spacing: { after: 1000 }
                        }));
                        children_1.push(new Paragraph_1({
                            children: [new TextRun_1({ text: "TOSHKENT - 2026", bold: true, size: 24, font: "Times New Roman" })],
                            alignment: AlignmentType_1.CENTER,
                            spacing: { after: 400 }
                        }));
                        children_1.push(new Paragraph_1({
                            pageBreakBefore: true,
                            children: []
                        }));
                    }
                    // Title Paragraph
                    children_1.push(new Paragraph_1({
                        children: [
                            new TextRun_1({
                                text: title,
                                bold: true,
                                size: docType === "kurs_ishi" ? 32 : 36, // 16pt / 18pt
                                font: "Times New Roman"
                            })
                        ],
                        alignment: AlignmentType_1.CENTER,
                        spacing: { before: 200, after: 600 }
                    }));
                    lines = content.split("\n");
                    lines.forEach(function (line) {
                        var trimmed = line.trim();
                        if (!trimmed) {
                            children_1.push(new Paragraph_1({ spacing: { after: 200 } }));
                            return;
                        }
                        var p;
                        if (trimmed.startsWith('# ')) {
                            p = new Paragraph_1({
                                children: [new TextRun_1({ text: trimmed.replace('# ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 30, color: "1E3A8A" })],
                                heading: HeadingLevel_1.HEADING_1,
                                alignment: AlignmentType_1.LEFT,
                                spacing: { before: 400, after: 250 }
                            });
                        }
                        else if (trimmed.startsWith('## ')) {
                            p = new Paragraph_1({
                                children: [new TextRun_1({ text: trimmed.replace('## ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 26, color: "2563EB" })],
                                heading: HeadingLevel_1.HEADING_2,
                                spacing: { before: 300, after: 200 }
                            });
                        }
                        else if (trimmed.startsWith('### ')) {
                            p = new Paragraph_1({
                                children: [new TextRun_1({ text: trimmed.replace('### ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 24, color: "4F46E5" })],
                                heading: HeadingLevel_1.HEADING_3,
                                spacing: { before: 200, after: 150 }
                            });
                        }
                        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                            p = new Paragraph_1({
                                children: [new TextRun_1({ text: trimmed.substring(2).replace(/\*\*/g, ''), font: "Times New Roman", size: 26 })],
                                bullet: { level: 0 },
                                spacing: { after: 120 }
                            });
                        }
                        else {
                            var runs = [];
                            var regex = /\*\*(.*?)\*\*/g;
                            var lastIdx = 0;
                            var match = void 0;
                            while ((match = regex.exec(trimmed)) !== null) {
                                if (match.index > lastIdx) {
                                    runs.push(new TextRun_1({ text: trimmed.substring(lastIdx, match.index), font: "Times New Roman", size: 26 }));
                                }
                                runs.push(new TextRun_1({ text: match[1], bold: true, font: "Times New Roman", size: 26 }));
                                lastIdx = regex.lastIndex;
                            }
                            if (lastIdx < trimmed.length) {
                                runs.push(new TextRun_1({ text: trimmed.substring(lastIdx), font: "Times New Roman", size: 26 }));
                            }
                            if (runs.length === 0) {
                                runs.push(new TextRun_1({ text: trimmed, font: "Times New Roman", size: 26 }));
                            }
                            p = new Paragraph_1({
                                children: runs,
                                spacing: { line: 280, before: 0, after: 100 },
                                alignment: AlignmentType_1.JUSTIFIED
                            });
                        }
                        children_1.push(p);
                    });
                    doc_1 = new Document_1({
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
                                children: children_1
                            }]
                    });
                    return [4 /*yield*/, Packer.toBuffer(doc_1)];
                case 7:
                    docxBuffer = _h.sent();
                    if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B) {
                        throw new Error("Docx fayli validatsiya xatoligi: noto'g'ri ZIP formati.");
                    }
                    cleanFileName = "".concat((data.topic || data.name || "hujjat").substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_hujjat.docx");
                    return [4 /*yield*/, ctx.replyWithDocument({ source: docxBuffer, filename: cleanFileName }, { caption: "\u2705 Sarlavha: ".concat(title, "\n\nHaqiqiy Microsoft Word formatidagi fayl muvaffaqiyatli tayyorlandi!") })];
                case 8:
                    _h.sent();
                    _c = (_b = ctx).reply;
                    _d = ["🤖 <b>Kerakli xizmatni menyudan tanlang:</b>"];
                    _e = {
                        parse_mode: "HTML"
                    };
                    _f = {};
                    return [4 /*yield*/, getAiAssistantKeyboard(userId)];
                case 9: return [2 /*return*/, _c.apply(_b, _d.concat([(_e.reply_markup = (_f.keyboard = _h.sent(),
                            _f.resize_keyboard = true,
                            _f),
                            _e)]))];
                case 10: return [2 /*return*/, ctx.reply("❌ Xatolik: Serverdan ma'lumot olish muvaffaqiyatsiz bo'ldi.")];
                case 11: return [3 /*break*/, 13];
                case 12:
                    err_11 = _h.sent();
                    console.error("Document generation error:", err_11);
                    return [2 /*return*/, ctx.reply("\u274C Hujjat yaratishda xato yuz berdi: ".concat(err_11.message || 'Noma\x27lum error'))];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function runTestGeneration(ctx, data) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, loadingMsg, topicStr, res, respData, _a, Document_2, Packer, Paragraph_2, TextRun_2, AlignmentType, children_2, doc_2, docxBuffer, cleanFileName, _b, _c, _d, err_12;
        var _e, _f;
        var _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    userId = ctx.from.id;
                    chatId = (_g = ctx.chat) === null || _g === void 0 ? void 0 : _g.id;
                    return [4 /*yield*/, ctx.reply("\u23F3 <b>Testlar shakllantirilmoqda...</b>\n\nIltimos kuting.", { parse_mode: "HTML" })];
                case 1:
                    loadingMsg = _j.sent();
                    _j.label = 2;
                case 2:
                    _j.trys.push([2, 12, , 13]);
                    topicStr = "Fan: ".concat(data.subject, ". Mavzu: ").concat(data.topic, ". Soni: ").concat(data.questionCount);
                    return [4 /*yield*/, fetch(getApiUrl("/api/gemini"), {
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
                        })];
                case 3:
                    res = _j.sent();
                    return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
                case 4:
                    _j.sent();
                    if (!res.ok) return [3 /*break*/, 10];
                    return [4 /*yield*/, res.json()];
                case 5:
                    respData = _j.sent();
                    return [4 /*yield*/, import("docx")];
                case 6:
                    _a = _j.sent(), Document_2 = _a.Document, Packer = _a.Packer, Paragraph_2 = _a.Paragraph, TextRun_2 = _a.TextRun, AlignmentType = _a.AlignmentType;
                    children_2 = [];
                    children_2.push(new Paragraph_2({
                        children: [
                            new TextRun_2({
                                text: "".concat(data.subject.toUpperCase(), " FANI BO'YICHA TESTLAR"),
                                bold: true,
                                size: 32,
                                font: "Times New Roman"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 100 }
                    }));
                    children_2.push(new Paragraph_2({
                        children: [
                            new TextRun_2({
                                text: "Mavzu: \"".concat(data.topic, "\""),
                                italics: true,
                                size: 24,
                                font: "Times New Roman"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }));
                    respData.forEach(function (t, i) {
                        children_2.push(new Paragraph_2({
                            children: [
                                new TextRun_2({
                                    text: "".concat(i + 1, ". ").concat(t.text),
                                    bold: true,
                                    size: 26,
                                    font: "Times New Roman"
                                })
                            ],
                            spacing: { before: 240, after: 120 }
                        }));
                        if (Array.isArray(t.options)) {
                            t.options.forEach(function (o, j) {
                                var prefix = "".concat(String.fromCharCode(65 + j), ") ");
                                var isCorrect = j === t.correctIdx;
                                children_2.push(new Paragraph_2({
                                    children: __spreadArray([
                                        new TextRun_2({ text: prefix, bold: true, font: "Times New Roman", size: 26 }),
                                        new TextRun_2({ text: o, font: "Times New Roman", size: 26 })
                                    ], (isCorrect ? [
                                        new TextRun_2({ text: "  [To'g'ri javob ✅]", bold: true, color: "15803D", font: "Times New Roman", size: 26 })
                                    ] : []), true),
                                    indent: { left: 720 },
                                    spacing: { after: 100 }
                                }));
                            });
                        }
                    });
                    doc_2 = new Document_2({
                        sections: [{
                                properties: {
                                    page: {
                                        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                                    }
                                },
                                children: children_2
                            }]
                    });
                    return [4 /*yield*/, Packer.toBuffer(doc_2)];
                case 7:
                    docxBuffer = _j.sent();
                    if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B) {
                        throw new Error("Docx file validation failed: ZIP signature error");
                    }
                    cleanFileName = "".concat((_h = data.topic) === null || _h === void 0 ? void 0 : _h.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_testlar.docx");
                    return [4 /*yield*/, ctx.replyWithDocument({ source: docxBuffer, filename: cleanFileName }, { caption: "\uD83D\uDCCB \"".concat(data.topic, "\" mavzusi bo'yicha testlar muvaffaqiyatli shakllantirildi!") })];
                case 8:
                    _j.sent();
                    _c = (_b = ctx).reply;
                    _d = ["🤖 <b>Kerakli xizmatni menyudan tanlang:</b>"];
                    _e = {
                        parse_mode: "HTML"
                    };
                    _f = {};
                    return [4 /*yield*/, getAiAssistantKeyboard(userId)];
                case 9: return [2 /*return*/, _c.apply(_b, _d.concat([(_e.reply_markup = (_f.keyboard = _j.sent(),
                            _f.resize_keyboard = true,
                            _f),
                            _e)]))];
                case 10: return [2 /*return*/, ctx.reply("❌ Test savollarini shakllantirishda xato yuz berdi.")];
                case 11: return [3 /*break*/, 13];
                case 12:
                    err_12 = _j.sent();
                    console.error("Test word generation err:", err_12);
                    return [2 /*return*/, ctx.reply("❌ Test Word faylini yaratishda xato yuz berdi: " + err_12.message)];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function runTranslationGeneration(ctx, data) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, loadingMsg, res, respData, _a, _b, _c, err_13;
        var _d, _e;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    userId = ctx.from.id;
                    chatId = (_f = ctx.chat) === null || _f === void 0 ? void 0 : _f.id;
                    return [4 /*yield*/, ctx.reply("\u23F3 <b>Tarjima qilinmoqda...</b>", { parse_mode: "HTML" })];
                case 1:
                    loadingMsg = _g.sent();
                    _g.label = 2;
                case 2:
                    _g.trys.push([2, 10, , 11]);
                    return [4 /*yield*/, fetch(getApiUrl("/api/gemini"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                action: "generateDocument",
                                topic: "[Direction: ".concat(data.direction || "O'zbek-Ingliz", "]. Text to translate: ").concat(data.text),
                                docType: "tarjimon"
                            })
                        })];
                case 3:
                    res = _g.sent();
                    return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
                case 4:
                    _g.sent();
                    if (!res.ok) return [3 /*break*/, 8];
                    return [4 /*yield*/, res.json()];
                case 5:
                    respData = _g.sent();
                    return [4 /*yield*/, ctx.reply("\uD83C\uDF10 <b>Tarjima xulosasi:</b>\n\n".concat(respData.content || 'Tarjima bo\'sh qaytdi.'), { parse_mode: "HTML" })];
                case 6:
                    _g.sent();
                    _b = (_a = ctx).reply;
                    _c = ["🤖 <b>Kerakli xizmatni menyudan tanlang:</b>"];
                    _d = {
                        parse_mode: "HTML"
                    };
                    _e = {};
                    return [4 /*yield*/, getAiAssistantKeyboard(userId)];
                case 7: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.reply_markup = (_e.keyboard = _g.sent(),
                            _e.resize_keyboard = true,
                            _e),
                            _d)]))];
                case 8: return [2 /*return*/, ctx.reply("❌ Tarjima qilishda xatolik yuz berdi.")];
                case 9: return [3 /*break*/, 11];
                case 10:
                    err_13 = _g.sent();
                    console.error("Translation err:", err_13);
                    return [2 /*return*/, ctx.reply("❌ Tarjima qilishda xato yuz berdi: " + err_13.message)];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function handleWizardStep(ctx, wizard, input) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, service, step, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = ctx.from.id;
                    service = wizard.service;
                    step = wizard.step;
                    data = wizard.data;
                    if (!(service === "📊 Slayd yaratish")) return [3 /*break*/, 6];
                    if (!(step === 1)) return [3 /*break*/, 1];
                    data.topic = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("📊 <b>Slaydlar sonini kiriting:</b>\n<i>Masalan: 10, 15, 20</i>", {
                            parse_mode: "HTML",
                            reply_markup: {
                                keyboard: [[{ text: "10" }, { text: "15" }, { text: "20" }], [{ text: "⬅️ Asosiy menyu" }]],
                                resize_keyboard: true
                            }
                        })];
                case 1:
                    if (!(step === 2)) return [3 /*break*/, 2];
                    data.slideCount = input.replace(/[^0-9]/g, "") || "10";
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("📊 <b>Dizayn turini tanlang:</b>", {
                            parse_mode: "HTML",
                            reply_markup: {
                                keyboard: [
                                    [{ text: "Zamonaviy" }, { text: "Minimalistik" }],
                                    [{ text: "Akademik" }, { text: "Korporativ" }],
                                    [{ text: "⬅️ Asosiy menyu" }]
                                ],
                                resize_keyboard: true
                            }
                        })];
                case 2:
                    if (!(step === 3)) return [3 /*break*/, 3];
                    data.designType = input;
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("📊 <b>Qo'shimcha talablarni kiriting:</b>\n<i>(yoki \"Yo'q\" deb yozing)</i>", {
                            parse_mode: "HTML",
                            reply_markup: {
                                keyboard: [[{ text: "Yo'q" }], [{ text: "⬅️ Asosiy menyu" }]],
                                resize_keyboard: true
                            }
                        })];
                case 3:
                    if (!(step === 4)) return [3 /*break*/, 5];
                    data.requirements = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runPresentationGeneration(ctx, data)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [3 /*break*/, 55];
                case 6:
                    if (!(service === "📄 Kurs ishi yaratish")) return [3 /*break*/, 17];
                    if (!(step === 1)) return [3 /*break*/, 7];
                    data.topic = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Fan nomini kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 7:
                    if (!(step === 2)) return [3 /*break*/, 8];
                    data.subject = input;
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>OTM (Universitet) nomini kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 8:
                    if (!(step === 3)) return [3 /*break*/, 9];
                    data.university = input;
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Fakultetni kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 9:
                    if (!(step === 4)) return [3 /*break*/, 10];
                    data.faculty = input;
                    userWizardStates.set(userId, { service: service, step: 5, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Kafedrani kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 10:
                    if (!(step === 5)) return [3 /*break*/, 11];
                    data.department = input;
                    userWizardStates.set(userId, { service: service, step: 6, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Yo'nalishni kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 11:
                    if (!(step === 6)) return [3 /*break*/, 12];
                    data.direction = input;
                    userWizardStates.set(userId, { service: service, step: 7, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Talaba F.I.Sh. kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 12:
                    if (!(step === 7)) return [3 /*break*/, 13];
                    data.studentName = input;
                    userWizardStates.set(userId, { service: service, step: 8, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Rahbar F.I.Sh. kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 13:
                    if (!(step === 8)) return [3 /*break*/, 14];
                    data.advisor = input;
                    userWizardStates.set(userId, { service: service, step: 9, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Sahifalar sonini kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "15" }, { text: "20" }, { text: "25" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 14:
                    if (!(step === 9)) return [3 /*break*/, 16];
                    data.pageCount = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runDocumentGeneration(ctx, "kurs_ishi", data)];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16: return [3 /*break*/, 55];
                case 17:
                    if (!(service === "🎓 Tezis yaratish")) return [3 /*break*/, 23];
                    if (!(step === 1)) return [3 /*break*/, 18];
                    data.topic = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("🎓 <b>Muallif F.I.Sh.:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 18:
                    if (!(step === 2)) return [3 /*break*/, 19];
                    data.author = input;
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("🎓 <b>OTM nomini kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 19:
                    if (!(step === 3)) return [3 /*break*/, 20];
                    data.university = input;
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("🎓 <b>Yo'nalishni kiriting:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 20:
                    if (!(step === 4)) return [3 /*break*/, 22];
                    data.direction = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runDocumentGeneration(ctx, "tezis", data)];
                case 21:
                    _a.sent();
                    _a.label = 22;
                case 22: return [3 /*break*/, 55];
                case 23:
                    if (!(service === "📑 Maqola yaratish")) return [3 /*break*/, 29];
                    if (!(step === 1)) return [3 /*break*/, 24];
                    data.topic = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("📑 <b>Muallif F.I.Sh.:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 24:
                    if (!(step === 2)) return [3 /*break*/, 25];
                    data.author = input;
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("📑 <b>Tashkilot (ish yoki o'qish joyi):</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 25:
                    if (!(step === 3)) return [3 /*break*/, 26];
                    data.org = input;
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("📑 <b>Maqola tili (O'zbek, Ingliz, Rus):</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "O'zbek" }, { text: "Ingliz" }, { text: "Rus" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 26:
                    if (!(step === 4)) return [3 /*break*/, 28];
                    data.language = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runDocumentGeneration(ctx, "maqola", data)];
                case 27:
                    _a.sent();
                    _a.label = 28;
                case 28: return [3 /*break*/, 55];
                case 29:
                    if (!(service === "📝 Dars ishlanma yaratish")) return [3 /*break*/, 35];
                    if (!(step === 1)) return [3 /*break*/, 30];
                    data.subject = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("📝 <b>Mavzu:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 30:
                    if (!(step === 2)) return [3 /*break*/, 31];
                    data.topic = input;
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("📝 <b>Sinf yoki kurs:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 31:
                    if (!(step === 3)) return [3 /*break*/, 32];
                    data.classGroup = input;
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("📝 <b>Dars turi (Nazariy, Amaliy, Seminar):</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "Nazariy" }, { text: "Amaliy" }], [{ text: "Seminar" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 32:
                    if (!(step === 4)) return [3 /*break*/, 34];
                    data.lessonType = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runDocumentGeneration(ctx, "dars_ishlanma", data)];
                case 33:
                    _a.sent();
                    _a.label = 34;
                case 34: return [3 /*break*/, 55];
                case 35:
                    if (!(service === "📋 Test yaratish")) return [3 /*break*/, 41];
                    if (!(step === 1)) return [3 /*break*/, 36];
                    data.subject = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("📋 <b>Mavzu:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 36:
                    if (!(step === 2)) return [3 /*break*/, 37];
                    data.topic = input;
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("📋 <b>Savollar soni:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "5" }, { text: "10" }, { text: "20" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 37:
                    if (!(step === 3)) return [3 /*break*/, 38];
                    data.questionCount = input.replace(/[^0-9]/g, "") || "10";
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("📋 <b>Variantlar soni (masalan: 4):</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "2" }, { text: "4" }], [{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 38:
                    if (!(step === 4)) return [3 /*break*/, 40];
                    data.optionsCount = input.replace(/[^0-9]/g, "") || "4";
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runTestGeneration(ctx, data)];
                case 39:
                    _a.sent();
                    _a.label = 40;
                case 40: return [3 /*break*/, 55];
                case 41:
                    if (!(service === "🌐 Tarjimon")) return [3 /*break*/, 45];
                    if (!(step === 1)) return [3 /*break*/, 42];
                    data.direction = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("🌐 <b>Tarjima qilinadigan matnni yuboring:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 42:
                    if (!(step === 2)) return [3 /*break*/, 44];
                    data.text = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runTranslationGeneration(ctx, data)];
                case 43:
                    _a.sent();
                    _a.label = 44;
                case 44: return [3 /*break*/, 55];
                case 45:
                    if (!(service === "📄 CV yaratish")) return [3 /*break*/, 55];
                    if (!(step === 1)) return [3 /*break*/, 46];
                    data.name = input;
                    userWizardStates.set(userId, { service: service, step: 2, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Tug'ilgan sana (masalan: 01.01.1990):</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 46:
                    if (!(step === 2)) return [3 /*break*/, 47];
                    data.birthDate = input;
                    userWizardStates.set(userId, { service: service, step: 3, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Telefon raqami:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 47:
                    if (!(step === 3)) return [3 /*break*/, 48];
                    data.phone = input;
                    userWizardStates.set(userId, { service: service, step: 4, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Email manzili:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 48:
                    if (!(step === 4)) return [3 /*break*/, 49];
                    data.email = input;
                    userWizardStates.set(userId, { service: service, step: 5, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Yashash manzili:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 49:
                    if (!(step === 5)) return [3 /*break*/, 50];
                    data.address = input;
                    userWizardStates.set(userId, { service: service, step: 6, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Ta'lim (Qayerda o'qigan):</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 50:
                    if (!(step === 6)) return [3 /*break*/, 51];
                    data.edu = input;
                    userWizardStates.set(userId, { service: service, step: 7, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Ish tajribasi:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 51:
                    if (!(step === 7)) return [3 /*break*/, 52];
                    data.exp = input;
                    userWizardStates.set(userId, { service: service, step: 8, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Ko'nikmalar:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 52:
                    if (!(step === 8)) return [3 /*break*/, 53];
                    data.skills = input;
                    userWizardStates.set(userId, { service: service, step: 9, data: data });
                    return [2 /*return*/, ctx.reply("📄 <b>Tillar:</b>", {
                            parse_mode: "HTML",
                            reply_markup: { keyboard: [[{ text: "⬅️ Asosiy menyu" }]], resize_keyboard: true }
                        })];
                case 53:
                    if (!(step === 9)) return [3 /*break*/, 55];
                    data.languages = input;
                    userWizardStates.delete(userId);
                    return [4 /*yield*/, runDocumentGeneration(ctx, "cv", data)];
                case 54:
                    _a.sent();
                    _a.label = 55;
                case 55: return [2 /*return*/];
            }
        });
    });
}
bot.on("message", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    function aiModeDeactivate() {
        aiAssistantActiveUsers.delete(userId);
        aiServiceStates.delete(userId);
    }
    var userId, chatId, chatType, pending, authed, userText, normText, targetRegisterId, menuButtons, wizard, _a, _b, _c, cost, isAdmin, hasBalance, _d, promptText, isCheque, adminIds, usersRef, adminQuery, adminSnap, resolvedIds, _i, _e, doc_3, data, tgId, adminHealErr_1, caption, keyboard, sentAlerts, _f, adminIds_1, aId, photo, sentMsg, err_14, sentMsg, err_15, e_20, m_1, tgUsersSnap_1, e_21, currentState, loadingMsg, action, docType, apiTopic, res, data, PptxGenJS_2, pptx_2, templateName, designPlanText, slidesList, stylesMap, selectedStyle_2, getSlideImage_2, pptxBuffer, err_16, text_1, fallbackSlides, htmlContent, _g, Document_3, Packer, Paragraph_3, TextRun_3, AlignmentType, children_3, doc_4, docxBuffer, e_22, _h, Document_4, Packer, Paragraph_4, TextRun_4, AlignmentType_2, HeadingLevel_2, children_4, rawTitle, contentText, lines, doc_5, docxBuffer, e_23, errorData, err_17, e_24, loadingMsg, prompt_1, imagePart, photo, link, response, buffer, systemAboutText, aboutSnap, aboutErr_1, systemCtx, systemInstructionText, aiResponse, replyText, cleanResponseText, markdownErr_1, htmlErr_1, err_18, errMsg, _j, _k, _l, loadingMsg, totalDBUsers, rolesCount, _m, sSnap, tSnap, stSnap, aSnap, e_25, statsMsg, err_19, adminIds, isHardAdmin, authed_1, _o, _p, _q, textSnap, customTexts, e_26, snap, e_27, usersRef, q, snap, userData, userDocId, newRef, bal, spent, displayBalance, e_28, refLink, botRefLink, customText, _r, _s, _t, dbDoc, res, e_29, res, e_30, q, qSnap, e_31, uData, roleText, roleDisplay, profileMsg, snap, e_32, _u, _v, _w, uptimeSec, hours, minutes, seconds, botStatus, row, menuDoc, kb, menuDoc, kb, found_1, amount, targetId_1, usersRef, snap, userDoc, userData, currentBall, currentBalance, newBall, newBalance, uName, pQuery, pSnap, pDoc, pData, _x, _y, item, e_33, origMsgId, origChatId, promptMsgId, e_34, row, menuDoc, kb, item, i, res, uName, senderId, originalPromptClean, lines, combinedTextToUser, mQuery, mSnap, mDoc, mData, _z, _0, item, mErr_1, origMsgId, origChatId, promptMsgId, e_35, emailInput, ADMIN_LOGIN, ADMIN_EMAIL, queryLogin, loginQuery, snap, e_36, uName_1, senderId_1, senderRole_1, e_37, targetMenu, _1, _2, _3, email, password, authRes, authData, teacherFallbackEmail, retryRes, retryData, retryErr_1, signUpRes, signUpData, signUpErr_1, uid, displayName, role, departmentName, groupName, docId, uData, mainDocSnap, e_38, uQuery, snap, e_39, emailQuery, snapEmail, e_40, parts, loginVal, loginQuery, snapLogin, e_41, uQuery, snap, docRef, docSnap, e_42, adminDocParams, err_20, existTgDocs, _4, _5, tgDoc, e_43, encodedCreds, autoLoginUrl, replyMsg, userBirthDate, bdayGreetings, _6, _7, _8, e_44, encodedCreds, autoLoginUrl, derivedRole, _9, _10, _11, err_21, lowered, promptMsg_1, intervalId, e_45, dotCount_1, uName, isAdmin, sysContext, functionResponses, lastFunctionCall, lastModelParts, loopCount, finalReply, _loop_2, state_1, e_46, borderReply, e_47, e_48;
    var _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28;
    var _29, _30, _31, _32, _33, _34;
    return __generator(this, function (_35) {
        switch (_35.label) {
            case 0:
                userId = ctx.from.id;
                return [4 /*yield*/, ensureUserStateSynced(userId)];
            case 1:
                _35.sent();
                chatId = (_29 = ctx.chat) === null || _29 === void 0 ? void 0 : _29.id;
                chatType = (_30 = ctx.chat) === null || _30 === void 0 ? void 0 : _30.type;
                pending = pendingLogins.get(userId);
                return [4 /*yield*/, getAuthedUser(userId)];
            case 2:
                authed = _35.sent();
                userText = "";
                if ("text" in ctx.message) {
                    userText = ctx.message.text;
                }
                else if ("caption" in ctx.message) {
                    userText = ctx.message.caption || "[Media yuborildi]";
                }
                else {
                    userText = "[Media yuborildi]";
                }
                normText = userText.trim();
                // If user directly clicked Savol-javob, ensure their AI mode is active
                if (normText === "💬 Savol-javob") {
                    aiAssistantActiveUsers.set(userId, true);
                }
                targetRegisterId = chatId || userId;
                if (!targetRegisterId) return [3 /*break*/, 4];
                return [4 /*yield*/, registerTelegramId(targetRegisterId, chatType || "private", ((_31 = ctx.chat) === null || _31 === void 0 ? void 0 : _31.title) || "", ctx.from || {})];
            case 3:
                _35.sent();
                _35.label = 4;
            case 4:
                menuButtons = [
                    "ℹ️ Tizim haqida", "💰 Balans", "💳 Balansni to'ldirish",
                    "💬 Adminga murojaat", "🌐 Rasmiy sayt",
                    "🔙 Asosiy Menyu", "⬅️ Asosiy menyu", "🚪 Chiqish", "👤 Profil", "🔑 Kirish",
                    "🤖 AI Yordamchi"
                ];
                if (menuButtons.includes(normText) || normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
                    aiAssistantActiveUsers.delete(userId);
                    aiServiceStates.delete(userId);
                }
                wizard = userWizardStates.get(userId);
                if (!(wizard && !pending)) return [3 /*break*/, 7];
                if (!(menuButtons.includes(normText) || normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu" || AI_COSTS[normText])) return [3 /*break*/, 5];
                userWizardStates.delete(userId);
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, handleWizardStep(ctx, wizard, normText)];
            case 6:
                _35.sent();
                return [2 /*return*/];
            case 7:
                if (!(normText === "🤖 AI Yordamchi")) return [3 /*break*/, 9];
                _b = (_a = ctx).reply;
                _c = ["🤖 <b>AI Yordamchi xizmatlari menyusiga xush kelibsiz!</b>\n\nKerakli xizmatni tanlang:"];
                _12 = {
                    parse_mode: "HTML"
                };
                _13 = {};
                return [4 /*yield*/, getAiAssistantKeyboard(userId)];
            case 8: return [2 /*return*/, _b.apply(_a, _c.concat([(_12.reply_markup = (_13.keyboard = _35.sent(),
                        _13.resize_keyboard = true,
                        _13),
                        _12)]))];
            case 9:
                if (!(AI_COSTS[normText] && !pending)) return [3 /*break*/, 12];
                cost = AI_COSTS[normText];
                isAdmin = getAdminIds().includes(userId);
                _d = isAdmin;
                if (_d) return [3 /*break*/, 11];
                return [4 /*yield*/, checkAndDeductBalance(userId, cost)];
            case 10:
                _d = (_35.sent());
                _35.label = 11;
            case 11:
                hasBalance = _d;
                if (!hasBalance) {
                    return [2 /*return*/, ctx.reply("\u274C <b>Balansingiz yetarli emas!</b>\n\nUshbu xizmat narxi: ".concat(cost, " ball.\nSizning balansingizda mablag' yetarli emas."), {
                            parse_mode: "HTML",
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "💰 Balansni to'ldirish", callback_data: "add_balance" }]
                                ]
                            }
                        })];
                }
                // For services, disable open AI chat mode to prevent it from interfering with the wizard
                aiAssistantActiveUsers.delete(userId);
                aiServiceStates.delete(userId);
                promptText = "Mavzuni kiriting:";
                if (normText === "📊 Slayd yaratish") {
                    promptText = "📊 <b>Taqdimot mavzusini kiriting:</b>";
                }
                else if (normText === "📄 Kurs ishi yaratish") {
                    promptText = "📄 <b>Kurs ishi mavzusini kiriting:</b>";
                }
                else if (normText === "🎓 Tezis yaratish") {
                    promptText = "🎓 <b>Tezis mavzusini kiriting:</b>";
                }
                else if (normText === "📑 Maqola yaratish") {
                    promptText = "📑 <b>Maqola mavzusini kiriting:</b>";
                }
                else if (normText === "📝 Dars ishlanma yaratish") {
                    promptText = "📝 <b>Fan nomini kiriting:</b>";
                }
                else if (normText === "📋 Test yaratish") {
                    promptText = "📋 <b>Fan nomini kiriting:</b>";
                }
                else if (normText === "🌐 Tarjimon") {
                    promptText = "🌐 <b>Tarjima yo'nalishini kiriting (masalan: O'zbekcha-Inglizcha):</b>";
                }
                else if (normText === "📄 CV yaratish") {
                    promptText = "📄 <b>Foydalanuvchi F.I.Sh. kiriting:</b>";
                }
                userWizardStates.set(userId, { service: normText, step: 1, data: {} });
                return [2 /*return*/, ctx.reply(promptText, {
                        parse_mode: "HTML",
                        reply_markup: {
                            keyboard: [[{ text: "⬅️ Asosiy menyu" }]],
                            resize_keyboard: true
                        }
                    })];
            case 12:
                isCheque = (ctx.message && "photo" in ctx.message) ||
                    (userText.length > 15 && (userText.includes("8600") || userText.includes("9860") || userText.includes("4444") || userText.toLowerCase().includes("payme") || userText.toLowerCase().includes("click") || userText.toLowerCase().includes("uzcard") || userText.toLowerCase().includes("humo")));
                if (!isCheque) return [3 /*break*/, 32];
                adminIds = getAdminIds();
                if (!(adminIds.length === 0 && db)) return [3 /*break*/, 16];
                _35.label = 13;
            case 13:
                _35.trys.push([13, 15, , 16]);
                usersRef = collection(db, "users");
                adminQuery = query(usersRef, where("role", "in", ["admin", "subadmin"]));
                return [4 /*yield*/, getDocs(adminQuery)];
            case 14:
                adminSnap = _35.sent();
                resolvedIds = [];
                for (_i = 0, _e = adminSnap.docs; _i < _e.length; _i++) {
                    doc_3 = _e[_i];
                    data = doc_3.data();
                    tgId = Number(data.telegramId);
                    if (tgId && !isNaN(tgId)) {
                        resolvedIds.push(tgId);
                        registerAdminId(tgId); // Write to file
                    }
                }
                if (resolvedIds.length > 0) {
                    adminIds = resolvedIds;
                    console.log("[Telegram Cheque] Dynamically healed admin List:", adminIds);
                }
                return [3 /*break*/, 16];
            case 15:
                adminHealErr_1 = _35.sent();
                console.error("[Telegram Cheque] Admin healing failed:", adminHealErr_1);
                return [3 /*break*/, 16];
            case 16:
                if (!(adminIds.length > 0)) return [3 /*break*/, 30];
                caption = "\uD83E\uDDFE Yangi to'lov cheki\n\n\uD83D\uDC64 Ism: ".concat(ctx.from.first_name || "", " ").concat(ctx.from.last_name || "", "\n\uD83C\uDD94 ID: ").concat(userId, "\n\uD83D\uDD17 Username: @").concat(ctx.from.username || "yo\x27q", "\n\n\uD83D\uDCB0 Status: Tekshiruvda");
                keyboard = {
                    inline_keyboard: [
                        [
                            { text: "➕ Ball qo'shish", callback_data: "admin_approve_pay_".concat(userId) },
                            { text: "❌ Rad etish", callback_data: "admin_reject_pay_".concat(userId) }
                        ]
                    ]
                };
                sentAlerts = [];
                _f = 0, adminIds_1 = adminIds;
                _35.label = 17;
            case 17:
                if (!(_f < adminIds_1.length)) return [3 /*break*/, 26];
                aId = adminIds_1[_f];
                if (!(ctx.message && "photo" in ctx.message)) return [3 /*break*/, 22];
                photo = ctx.message.photo[ctx.message.photo.length - 1];
                _35.label = 18;
            case 18:
                _35.trys.push([18, 20, , 21]);
                return [4 /*yield*/, bot.telegram.sendPhoto(aId, photo.file_id, {
                        caption: caption,
                        parse_mode: "HTML",
                        reply_markup: keyboard
                    })];
            case 19:
                sentMsg = _35.sent();
                if (sentMsg) {
                    sentAlerts.push({ chatId: aId, messageId: sentMsg.message_id });
                }
                return [3 /*break*/, 21];
            case 20:
                err_14 = _35.sent();
                return [3 /*break*/, 21];
            case 21: return [3 /*break*/, 25];
            case 22:
                _35.trys.push([22, 24, , 25]);
                return [4 /*yield*/, bot.telegram.sendMessage(aId, caption + "\n\n\uD83D\uDCDD <b>Chek matni:</b>\n".concat(userText), {
                        parse_mode: "HTML",
                        reply_markup: keyboard
                    })];
            case 23:
                sentMsg = _35.sent();
                if (sentMsg) {
                    sentAlerts.push({ chatId: aId, messageId: sentMsg.message_id });
                }
                return [3 /*break*/, 25];
            case 24:
                err_15 = _35.sent();
                return [3 /*break*/, 25];
            case 25:
                _f++;
                return [3 /*break*/, 17];
            case 26:
                _35.trys.push([26, 28, , 29]);
                return [4 /*yield*/, addDoc(collection(db, "payments"), {
                        userId: userId,
                        userName: "".concat(ctx.from.first_name || "", " ").concat(ctx.from.last_name || "").trim(),
                        status: "pending",
                        timestamp: serverTimestamp(),
                        type: (ctx.message && "photo" in ctx.message) ? "image" : "text",
                        content: (ctx.message && "photo" in ctx.message) ? ctx.message.photo[ctx.message.photo.length - 1].file_id : userText,
                        tgSentMessages: sentAlerts
                    })];
            case 27:
                _35.sent();
                return [3 /*break*/, 29];
            case 28:
                e_20 = _35.sent();
                return [3 /*break*/, 29];
            case 29: return [3 /*break*/, 31];
            case 30:
                console.warn("[Telegram Cheque] No admins found to notify about cheque submission of user id:", userId);
                _35.label = 31;
            case 31: return [2 /*return*/, ctx.reply("✅ Chekingiz adminga yuborildi. Tez orada tekshirilib, javobi yuboriladi. Muammolar yuzaga kelsa, support bilan bog'lanishingiz mumkin.")];
            case 32:
                if (!(pending && pending.step === "broadcast_message")) return [3 /*break*/, 36];
                pendingLogins.delete(userId);
                m_1 = ctx.message;
                ctx.reply("E'lon tarqatish boshlandi (Guruhlar va shaxsiy foydalanuvchilarga)... Iltimos kuting.");
                _35.label = 33;
            case 33:
                _35.trys.push([33, 35, , 36]);
                return [4 /*yield*/, getDocs(query(collection(db, "telegram_users")))];
            case 34:
                tgUsersSnap_1 = _35.sent();
                (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var count, uniqueIds, _i, _a, uDoc, uData, docIdNum, tgId, tgUsersListPath, localList, _b, uniqueIds_1, tgId, copyErr_1, msg;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                count = 0;
                                uniqueIds = new Set();
                                for (_i = 0, _a = tgUsersSnap_1.docs; _i < _a.length; _i++) {
                                    uDoc = _a[_i];
                                    uData = uDoc.data();
                                    docIdNum = Number(uDoc.id);
                                    tgId = uData.telegramId ? Number(uData.telegramId) : (!isNaN(docIdNum) && docIdNum !== 0 ? docIdNum : null);
                                    if (tgId) {
                                        uniqueIds.add(tgId);
                                    }
                                }
                                try {
                                    tgUsersListPath = path.join(process.cwd(), "telegram_users_list.json");
                                    if (fs.existsSync(tgUsersListPath)) {
                                        localList = JSON.parse(fs.readFileSync(tgUsersListPath, "utf8"));
                                        if (Array.isArray(localList)) {
                                            localList.forEach(function (id) {
                                                if (id)
                                                    uniqueIds.add(Number(id));
                                            });
                                        }
                                    }
                                }
                                catch (e) {
                                    console.error("[Broadcast] Local file fallback reading error:", e);
                                }
                                _b = 0, uniqueIds_1 = uniqueIds;
                                _c.label = 1;
                            case 1:
                                if (!(_b < uniqueIds_1.length)) return [3 /*break*/, 9];
                                tgId = uniqueIds_1[_b];
                                if (!(tgId && tgId !== userId)) return [3 /*break*/, 8];
                                _c.label = 2;
                            case 2:
                                _c.trys.push([2, 5, , 6]);
                                if (!(m_1 && m_1.message_id)) return [3 /*break*/, 4];
                                return [4 /*yield*/, bot.telegram.copyMessage(tgId, ctx.chat.id, m_1.message_id)];
                            case 3:
                                _c.sent();
                                count++;
                                _c.label = 4;
                            case 4: return [3 /*break*/, 6];
                            case 5:
                                copyErr_1 = _c.sent();
                                msg = (copyErr_1 === null || copyErr_1 === void 0 ? void 0 : copyErr_1.message) || "";
                                if (!msg.includes("chat not found") &&
                                    !msg.includes("bot was blocked") &&
                                    !msg.includes("bot was kicked") &&
                                    !msg.includes("user is deactivated")) {
                                    console.error("[Broadcast] Failed to send message to ".concat(tgId, ":"), (copyErr_1 === null || copyErr_1 === void 0 ? void 0 : copyErr_1.message) || copyErr_1);
                                }
                                return [3 /*break*/, 6];
                            case 6: 
                            // Delay to prevent being throttled by Telegram rate limits
                            return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 65); })];
                            case 7:
                                // Delay to prevent being throttled by Telegram rate limits
                                _c.sent();
                                _c.label = 8;
                            case 8:
                                _b++;
                                return [3 /*break*/, 1];
                            case 9:
                                bot.telegram
                                    .sendMessage(userId, "\uD83D\uDCE2 E'lon muvaffaqiyatli tarqatildi:\n\nJami ".concat(count, " ta foydalanuvchi/guruhga yuborildi."))
                                    .catch(function (e) { return console.error(e); });
                                return [2 /*return*/];
                        }
                    });
                }); })();
                return [2 /*return*/];
            case 35:
                e_21 = _35.sent();
                return [2 /*return*/, ctx.reply("E'lon yuborishda xatolik yuz berdi.")];
            case 36:
                if (!aiAssistantActiveUsers.get(userId)) return [3 /*break*/, 101];
                currentState = aiServiceStates.get(userId);
                if (!(false && currentState && currentState !== "chat")) return [3 /*break*/, 63];
                return [4 /*yield*/, ctx.reply("\u23F3 <b>".concat(currentState, " tayyorlanmoqda...</b>\n\nIltimos kuting, bu biroz vaqt olishi mumkin."), { parse_mode: "HTML" })];
            case 37:
                loadingMsg = _35.sent();
                _35.label = 38;
            case 38:
                _35.trys.push([38, 61, , 63]);
                action = "generateDocument";
                docType = "";
                apiTopic = userText;
                if (currentState === "📊 Slayd yaratish") {
                    action = "generatePresentation";
                }
                else if (currentState === "📄 Kurs ishi yaratish") {
                    docType = "kurs_ishi";
                }
                else if (currentState === "🎓 Tezis yaratish") {
                    docType = "tezis";
                }
                else if (currentState === "📑 Maqola yaratish") {
                    docType = "maqola";
                }
                else if (currentState === "📝 Dars ishlanma yaratish") {
                    docType = "dars_ishlanma";
                }
                else if (currentState === "🌐 Tarjimon") {
                    docType = "tarjimon";
                }
                else if (currentState === "📋 Test yaratish") {
                    action = "generateDynamicTest";
                }
                return [4 /*yield*/, fetch(getApiUrl("/api/gemini"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: action,
                            topic: apiTopic,
                            docType: docType,
                            count: action === "generatePresentation" ? 15 : 10
                        })
                    })];
            case 39:
                res = _35.sent();
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
            case 40:
                _35.sent();
                if (!res.ok) return [3 /*break*/, 58];
                return [4 /*yield*/, res.json()];
            case 41:
                data = _35.sent();
                aiServiceStates.delete(userId);
                if (!(action === "generatePresentation")) return [3 /*break*/, 47];
                _35.label = 42;
            case 42:
                _35.trys.push([42, 45, , 46]);
                return [4 /*yield*/, import("pptxgenjs")];
            case 43:
                PptxGenJS_2 = (_35.sent()).default;
                pptx_2 = new PptxGenJS_2();
                templateName = data.template || "Modern";
                designPlanText = data.designPlan || "Professional Design Template";
                slidesList = Array.isArray(data.slides) ? data.slides : (Array.isArray(data) ? data : []);
                stylesMap = {
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
                selectedStyle_2 = stylesMap[templateName] || stylesMap.Modern;
                getSlideImage_2 = function (point) {
                    var query = point.imageKeyword || point.title || "abstract digital background abstract";
                    return "https://image.pollinations.ai/prompt/".concat(encodeURIComponent(query), "?width=800&height=600&nologo=true&seed=").concat(Math.floor(Math.random() * 1000));
                };
                slidesList.forEach(function (s, idx) {
                    var layout = s.layout || (idx === 0 ? "cover" : "content");
                    var slide = pptx_2.addSlide();
                    if (layout === "cover") {
                        slide.background = { fill: selectedStyle_2.coverBg };
                        // Draw geometric panels on cover page
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 5.625, fill: { color: selectedStyle_2.primaryAccent } });
                        slide.addShape(pptx_2.ShapeType.rect, { x: 8.5, y: 0, w: 1.5, h: 1.5, fill: { color: selectedStyle_2.secondaryAccent, transparency: 80 } });
                        // Main Titles
                        slide.addText(s.title || "Mavzuli Taqdimot", { x: 1.0, y: 1.5, w: 8.0, h: 1.5, fontSize: 38, bold: true, color: selectedStyle_2.titleColor, align: "left", valign: "middle" });
                        slide.addText(s.subtitle || "Oliy darajadagi zamonaviy taqdimot dizayni", { x: 1.0, y: 3.1, w: 8.0, h: 0.6, fontSize: 20, color: selectedStyle_2.contentSub, align: "left" });
                        slide.addText(s.content || "Microsoft PowerPoint Professional Template talablariga muvofiq.", { x: 1.0, y: 4.1, w: 8.0, h: 0.8, fontSize: 13, color: "94A3B8", align: "left" });
                    }
                    else if (layout === "agenda" || layout === "summary") {
                        slide.background = { fill: selectedStyle_2.bg };
                        // Header Area
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_2.bannerFill } });
                        slide.addText(s.title || "Mundarija", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                        if (s.bulletPoints && s.bulletPoints.length > 0) {
                            s.bulletPoints.forEach(function (bp, i) {
                                var xOffset = i % 2 === 0 ? 0.8 : 5.2;
                                var yOffset = 1.3 + Math.floor(i / 2) * 1.3;
                                if (yOffset + 1.1 <= 5.625) {
                                    // Card container
                                    slide.addShape(pptx_2.ShapeType.rect, { x: xOffset, y: yOffset, w: 4.0, h: 1.1, fill: { color: "FFFFFF" }, line: { color: selectedStyle_2.secondaryAccent, width: 1 } });
                                    slide.addShape(pptx_2.ShapeType.rect, { x: xOffset, y: yOffset, w: 0.1, h: 1.1, fill: { color: selectedStyle_2.primaryAccent } });
                                    // Index Badge
                                    slide.addShape(pptx_2.ShapeType.rect, { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fill: { color: selectedStyle_2.accentLight } });
                                    slide.addText(String(i + 1).padStart(2, '0'), { x: xOffset + 0.2, y: yOffset + 0.2, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: selectedStyle_2.primaryAccent, align: "center", valign: "middle" });
                                    // Card Content
                                    slide.addText(bp, { x: xOffset + 0.8, y: yOffset + 0.1, w: 3.0, h: 0.9, fontSize: 13, bold: true, color: selectedStyle_2.contentBody, valign: "middle" });
                                }
                            });
                        }
                        else if (layout === "summary") {
                            // Custom vector-like visual block for summary
                            slide.addShape(pptx_2.ShapeType.rect, { x: 1.5, y: 1.4, w: 7.0, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle_2.primaryAccent, width: 2 } });
                            slide.addText("🏆 XULOSA VA TAQDIMOT YAKUNI", { x: 2.0, y: 1.7, w: 6.0, h: 0.5, fontSize: 22, bold: true, color: selectedStyle_2.contentTitleColor, align: "center" });
                            slide.addText(s.content || "Mavzu yuzasidan barcha zarur xulosalar va dalillar to'liq shakllantirildi.", { x: 2.0, y: 2.4, w: 6.0, h: 1.2, fontSize: 16, color: selectedStyle_2.contentBody, align: "center" });
                            slide.addText("E'tiboringiz uchun rahmat!", { x: 2.0, y: 3.8, w: 6.0, h: 0.6, fontSize: 20, bold: true, color: selectedStyle_2.contentSub, align: "center" });
                        }
                        else {
                            slide.addText(s.content || "", { x: 0.8, y: 1.5, w: 8.4, h: 3.0, fontSize: 16, color: selectedStyle_2.contentBody });
                        }
                    }
                    else if (layout === "image-left") {
                        slide.background = { fill: selectedStyle_2.bg };
                        // Header Title Bar
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_2.bannerFill } });
                        slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                        // Draw decorative background card shadow
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0.7, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle_2.accentLight } });
                        var imgUrl = getSlideImage_2(s);
                        slide.addImage({ path: imgUrl, x: 0.8, y: 1.3, w: 4.0, h: 3.6 });
                        var currY = 1.3;
                        if (s.subtitle) {
                            slide.addText(s.subtitle, { x: 5.1, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle_2.contentSub });
                            currY += 0.6;
                        }
                        if (s.content) {
                            slide.addText(s.content, { x: 5.1, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle_2.contentBody, lineSpacing: 18 });
                            currY += 1.4;
                        }
                        if (s.bulletPoints && s.bulletPoints.length > 0) {
                            var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                            slide.addText(bulletTxt, { x: 5.1, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle_2.contentBody, lineSpacing: 18 });
                        }
                    }
                    else if (layout === "image-right") {
                        slide.background = { fill: selectedStyle_2.bg };
                        // Header Title Bar
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_2.bannerFill } });
                        slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                        // Draw decorative shadow box behind photo
                        slide.addShape(pptx_2.ShapeType.rect, { x: 5.3, y: 1.4, w: 4.0, h: 3.6, fill: { color: selectedStyle_2.accentLight } });
                        var imgUrl = getSlideImage_2(s);
                        slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });
                        var currY = 1.3;
                        if (s.subtitle) {
                            slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.5, fontSize: 18, bold: true, color: selectedStyle_2.contentSub });
                            currY += 0.6;
                        }
                        if (s.content) {
                            slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle_2.contentBody, lineSpacing: 18 });
                            currY += 1.4;
                        }
                        if (s.bulletPoints && s.bulletPoints.length > 0) {
                            var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                            slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle_2.contentBody, lineSpacing: 18 });
                        }
                    }
                    else if (layout === "cards" && s.bulletPoints && s.bulletPoints.length > 0) {
                        slide.background = { fill: selectedStyle_2.bg };
                        // Header Title Bar
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_2.bannerFill } });
                        slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                        slide.addText(s.subtitle || s.content || "Infografika kartalari", { x: 0.8, y: 1.1, w: 8.4, h: 0.4, fontSize: 14, color: selectedStyle_2.contentSub, italic: true });
                        var pointsCount = s.bulletPoints.length;
                        if (pointsCount > 4)
                            pointsCount = 4;
                        var cWidth = 8.4 / pointsCount - 0.2;
                        for (var i = 0; i < pointsCount; i++) {
                            var startX = 0.8 + (i * cWidth) + (i * 0.2);
                            // Card
                            slide.addShape(pptx_2.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 3.4, fill: { color: "FFFFFF" }, line: { color: selectedStyle_2.secondaryAccent, width: 1 } });
                            // Gradient Strip Accent top of inside card
                            slide.addShape(pptx_2.ShapeType.rect, { x: startX, y: 1.6, w: cWidth, h: 0.15, fill: { color: (i % 2 === 0 ? selectedStyle_2.primaryAccent : selectedStyle_2.secondaryAccent) } });
                            // Dynamic graphic icon label
                            slide.addText("★", { x: startX + 0.1, y: 1.9, w: cWidth - 0.2, h: 0.4, fontSize: 18, color: selectedStyle_2.primaryAccent, align: "center" });
                            // Inner text
                            slide.addText(s.bulletPoints[i], { x: startX + 0.1, y: 2.4, w: cWidth - 0.2, h: 2.4, fontSize: 12, color: selectedStyle_2.contentBody, align: "center", valign: "top" });
                        }
                    }
                    else {
                        slide.background = { fill: selectedStyle_2.bg };
                        // Header Title Bar
                        slide.addShape(pptx_2.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: selectedStyle_2.bannerFill } });
                        slide.addText(s.title || "Taqdimot", { x: 0.8, y: 0.1, w: 8.4, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", valign: "middle" });
                        if (s.chartData && s.chartData.length > 0) {
                            try {
                                var labels = s.chartData.map(function (d) { return String(d.label || "A"); });
                                var values = s.chartData.map(function (d) { return Number(d.value || 0); });
                                slide.addChart(pptx_2.ChartType.bar, [{ name: "Ma'lumot", labels: labels, values: values }], { x: 0.8, y: 1.3, w: 4.4, h: 3.6 });
                                slide.addShape(pptx_2.ShapeType.rect, { x: 5.4, y: 1.3, w: 3.8, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle_2.secondaryAccent, width: 1 } });
                                slide.addText(s.content || "Tahliliy ma'lumotlar diagrammasi", { x: 5.6, y: 1.5, w: 3.4, h: 3.2, fontSize: 13, color: selectedStyle_2.contentBody });
                            }
                            catch (chartErr) {
                                slide.addText(s.content || "", { x: 0.8, y: 1.4, w: 8.4, h: 3.5, fontSize: 14, color: selectedStyle_2.contentBody });
                            }
                        }
                        else {
                            // Standard split text and graphic side by side layout
                            var imgUrl = getSlideImage_2(s);
                            slide.addShape(pptx_2.ShapeType.rect, { x: 5.3, y: 1.4, w: 3.9, h: 3.6, fill: { color: "FFFFFF" }, line: { color: selectedStyle_2.secondaryAccent, width: 1 } });
                            slide.addImage({ path: imgUrl, x: 5.2, y: 1.3, w: 4.0, h: 3.6 });
                            var currY = 1.3;
                            if (s.subtitle) {
                                slide.addText(s.subtitle, { x: 0.8, y: currY, w: 4.1, h: 0.4, fontSize: 18, bold: true, color: selectedStyle_2.contentSub });
                                currY += 0.5;
                            }
                            if (s.content) {
                                slide.addText(s.content, { x: 0.8, y: currY, w: 4.1, h: 1.3, fontSize: 13, color: selectedStyle_2.contentBody, lineSpacing: 18 });
                                currY += 1.4;
                            }
                            if (s.bulletPoints && s.bulletPoints.length > 0) {
                                var bulletTxt = s.bulletPoints.map(function (bp) { return "\u2726  ".concat(bp); }).join("\n");
                                slide.addText(bulletTxt, { x: 0.8, y: currY, w: 4.1, h: 1.8, fontSize: 12, color: selectedStyle_2.contentBody, lineSpacing: 18 });
                            }
                        }
                    }
                });
                return [4 /*yield*/, pptx_2.write({ outputType: "nodebuffer" })];
            case 44:
                pptxBuffer = _35.sent();
                return [2 /*return*/, ctx.replyWithDocument({ source: pptxBuffer, filename: "".concat(apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_taqdimot.pptx") }, { caption: "\uD83D\uDCCA ".concat(apiTopic, " mavzusida premium ").concat(templateName, " taqdimoti tayyor!\n\uD83C\uDFA8 Dizayn uslubi: ").concat(designPlanText) })];
            case 45:
                err_16 = _35.sent();
                console.error("PPTX gen error:", err_16);
                text_1 = "\uD83D\uDCCA **".concat(apiTopic, " mavzusida taqdimot rejasi:**\n\n");
                fallbackSlides = Array.isArray(data.slides) ? data.slides : (Array.isArray(data) ? data : []);
                fallbackSlides.forEach(function (s, i) {
                    text_1 += "**".concat(i + 1, "-slayd: ").concat(s.title, "**\n").concat(s.content, "\n\n");
                });
                htmlContent = "<html><head><meta charset=\"utf-8\"></head><body>".concat(mdToHtml(text_1), "</body></html>");
                return [2 /*return*/, ctx.replyWithDocument({ source: Buffer.from(htmlContent, 'utf-8'), filename: "".concat(apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_taqdimot.doc") }, { caption: "\uD83D\uDCCA ".concat(apiTopic, " mavzusida taqdimot rejasi tayyor!") })];
            case 46: return [3 /*break*/, 57];
            case 47:
                if (!(action === "generateDynamicTest")) return [3 /*break*/, 53];
                _35.label = 48;
            case 48:
                _35.trys.push([48, 51, , 52]);
                return [4 /*yield*/, import("docx")];
            case 49:
                _g = _35.sent(), Document_3 = _g.Document, Packer = _g.Packer, Paragraph_3 = _g.Paragraph, TextRun_3 = _g.TextRun, AlignmentType = _g.AlignmentType;
                children_3 = [];
                // Header title paragraph
                children_3.push(new Paragraph_3({
                    children: [
                        new TextRun_3({
                            text: "".concat(apiTopic, " mavzusidagi professional testlar"),
                            bold: true,
                            size: 32, // 16pt (32 half points)
                            font: "Times New Roman"
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 400 }
                }));
                // Process each questions with custom styles
                data.forEach(function (t, i) {
                    children_3.push(new Paragraph_3({
                        children: [
                            new TextRun_3({
                                text: "".concat(i + 1, ". ").concat(t.text),
                                bold: true,
                                size: 28, // 14pt (28 half points)
                                font: "Times New Roman"
                            })
                        ],
                        spacing: { before: 240, after: 120 }
                    }));
                    if (Array.isArray(t.options)) {
                        t.options.forEach(function (o, j) {
                            var prefix = "".concat(String.fromCharCode(65 + j), ") ");
                            var isCorrect = j === t.correctIdx;
                            children_3.push(new Paragraph_3({
                                children: __spreadArray([
                                    new TextRun_3({
                                        text: prefix,
                                        bold: true,
                                        font: "Times New Roman",
                                        size: 28
                                    }),
                                    new TextRun_3({
                                        text: o,
                                        font: "Times New Roman",
                                        size: 28
                                    })
                                ], (isCorrect ? [
                                    new TextRun_3({
                                        text: "  [To'g'ri javob ✅]",
                                        bold: true,
                                        color: "15803D",
                                        font: "Times New Roman",
                                        size: 28
                                    })
                                ] : []), true),
                                indent: { left: 720 },
                                spacing: { after: 100 }
                            }));
                        });
                    }
                });
                doc_4 = new Document_3({
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
                            children: children_3
                        }]
                });
                return [4 /*yield*/, Packer.toBuffer(doc_4)];
            case 50:
                docxBuffer = _35.sent();
                // Validate generated DOCX Buffer
                if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B || docxBuffer[2] !== 0x03 || docxBuffer[3] !== 0x04) {
                    throw new Error("Docx fayli nomi yoki tarkibida validatsiya xatoligi: noto'g'ri ZIP formati.");
                }
                return [2 /*return*/, ctx.replyWithDocument({ source: docxBuffer, filename: "".concat(apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_testlar.docx") }, { caption: "\uD83D\uDCCB ".concat(apiTopic, " mavzusida haqiqiy Microsoft Word formatidagi testlar tayyor!") })];
            case 51:
                e_22 = _35.sent();
                console.error("Test docx error:", e_22);
                return [2 /*return*/, ctx.reply("\u274C <b>Hujjat yaratishda validatsiya xatosi:</b> ".concat(e_22.message || "Fayl yaratish muvaffaqiyatsiz bo'ldi."), { parse_mode: "HTML" })];
            case 52: return [3 /*break*/, 57];
            case 53:
                _35.trys.push([53, 56, , 57]);
                return [4 /*yield*/, import("docx")];
            case 54:
                _h = _35.sent(), Document_4 = _h.Document, Packer = _h.Packer, Paragraph_4 = _h.Paragraph, TextRun_4 = _h.TextRun, AlignmentType_2 = _h.AlignmentType, HeadingLevel_2 = _h.HeadingLevel;
                children_4 = [];
                rawTitle = data.title || apiTopic;
                // Title Paragraph (18pt bold Times New Roman, Centered)
                children_4.push(new Paragraph_4({
                    children: [
                        new TextRun_4({
                            text: rawTitle,
                            bold: true,
                            size: 36, // 18pt
                            font: "Times New Roman"
                        })
                    ],
                    alignment: AlignmentType_2.CENTER,
                    spacing: { before: 200, after: 600 }
                }));
                contentText = data.content || "";
                lines = contentText.split("\n");
                lines.forEach(function (line) {
                    var trimmed = line.trim();
                    if (!trimmed) {
                        children_4.push(new Paragraph_4({ spacing: { after: 200 } }));
                        return;
                    }
                    var p;
                    if (trimmed.startsWith('# ')) {
                        p = new Paragraph_4({
                            children: [new TextRun_4({ text: trimmed.replace('# ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 32 })],
                            heading: HeadingLevel_2.HEADING_1,
                            alignment: AlignmentType_2.CENTER,
                            spacing: { before: 400, after: 200 }
                        });
                    }
                    else if (trimmed.startsWith('## ')) {
                        p = new Paragraph_4({
                            children: [new TextRun_4({ text: trimmed.replace('## ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 28 })],
                            heading: HeadingLevel_2.HEADING_2,
                            spacing: { before: 300, after: 150 }
                        });
                    }
                    else if (trimmed.startsWith('### ')) {
                        p = new Paragraph_4({
                            children: [new TextRun_4({ text: trimmed.replace('### ', '').replace(/\*\*/g, ''), bold: true, font: "Times New Roman", size: 26 })],
                            heading: HeadingLevel_2.HEADING_3,
                            spacing: { before: 200, after: 100 }
                        });
                    }
                    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                        p = new Paragraph_4({
                            children: [new TextRun_4({ text: trimmed.substring(2).replace(/\*\*/g, ''), font: "Times New Roman", size: 28 })],
                            bullet: { level: 0 },
                            spacing: { after: 100 }
                        });
                    }
                    else {
                        // Bold markup inside paragraphs
                        var runs = [];
                        var regex = /\*\*(.*?)\*\*/g;
                        var lastIdx = 0;
                        var match = void 0;
                        while ((match = regex.exec(trimmed)) !== null) {
                            if (match.index > lastIdx) {
                                runs.push(new TextRun_4({ text: trimmed.substring(lastIdx, match.index), font: "Times New Roman", size: 28 }));
                            }
                            runs.push(new TextRun_4({ text: match[1], bold: true, font: "Times New Roman", size: 28 }));
                            lastIdx = regex.lastIndex;
                        }
                        if (lastIdx < trimmed.length) {
                            runs.push(new TextRun_4({ text: trimmed.substring(lastIdx), font: "Times New Roman", size: 28 }));
                        }
                        if (runs.length === 0) {
                            runs.push(new TextRun_4({ text: trimmed, font: "Times New Roman", size: 28 }));
                        }
                        p = new Paragraph_4({
                            children: runs,
                            spacing: { after: 200 },
                            alignment: AlignmentType_2.JUSTIFIED
                        });
                    }
                    children_4.push(p);
                });
                doc_5 = new Document_4({
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
                            children: children_4
                        }]
                });
                return [4 /*yield*/, Packer.toBuffer(doc_5)];
            case 55:
                docxBuffer = _35.sent();
                // Validate generated DOCX Buffer
                if (!docxBuffer || docxBuffer.length < 2000 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4B || docxBuffer[2] !== 0x03 || docxBuffer[3] !== 0x04) {
                    throw new Error("Docx fayli nomi yoki tarkibida validatsiya xatoligi: noto'g'ri ZIP formati.");
                }
                return [2 /*return*/, ctx.replyWithDocument({ source: docxBuffer, filename: "".concat(apiTopic.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'), "_hujjat.docx") }, { caption: "\uD83D\uDCC4 ".concat(rawTitle, " hujjati haqiqiy Microsoft Word (DOCX) formatida muvaffaqiyatli tayyorlandi!") })];
            case 56:
                e_23 = _35.sent();
                console.error("Document docx error:", e_23);
                return [2 /*return*/, ctx.reply("\u274C <b>Hujjat yaratishda validatsiya xatosi:</b> ".concat(e_23.message || "Fayl yaratish muvaffaqiyatsiz bo'ldi."), { parse_mode: "HTML" })];
            case 57: return [3 /*break*/, 60];
            case 58: return [4 /*yield*/, res.json().catch(function () { return ({}); })];
            case 59:
                errorData = _35.sent();
                throw new Error(errorData.error || "API xatosi");
            case 60: return [3 /*break*/, 63];
            case 61:
                err_17 = _35.sent();
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
            case 62:
                _35.sent();
                console.error("AI Service error:", err_17);
                return [2 /*return*/, ctx.reply("\u274C <b>Xatolik yuz berdi:</b> ".concat(err_17.message || "Keyinroq urinib ko'ring."), { parse_mode: "HTML" })];
            case 63:
                if (!(currentState === "chat")) return [3 /*break*/, 100];
                if (processingUsers.has(userId)) {
                    return [2 /*return*/, ctx.reply("⏳ Iltimos kuting, AI hali o'ylamoqda...")];
                }
                processingUsers.add(userId);
                _35.label = 64;
            case 64:
                _35.trys.push([64, , 98, 99]);
                _35.label = 65;
            case 65:
                _35.trys.push([65, 67, , 68]);
                return [4 /*yield*/, ctx.sendChatAction("typing")];
            case 66:
                _35.sent();
                return [3 /*break*/, 68];
            case 67:
                e_24 = _35.sent();
                return [3 /*break*/, 68];
            case 68: return [4 /*yield*/, ctx.reply("🤖 <i>AI o'ylamoqda...</i>", { parse_mode: "HTML" })];
            case 69:
                loadingMsg = _35.sent();
                _35.label = 70;
            case 70:
                _35.trys.push([70, 91, , 97]);
                prompt_1 = userText;
                imagePart = null;
                if (!("photo" in ctx.message)) return [3 /*break*/, 74];
                photo = ctx.message.photo[ctx.message.photo.length - 1];
                return [4 /*yield*/, bot.telegram.getFileLink(photo.file_id)];
            case 71:
                link = _35.sent();
                return [4 /*yield*/, fetch(link.href)];
            case 72:
                response = _35.sent();
                return [4 /*yield*/, response.arrayBuffer()];
            case 73:
                buffer = _35.sent();
                imagePart = {
                    inlineData: {
                        data: Buffer.from(buffer).toString("base64"),
                        mimeType: "image/jpeg"
                    }
                };
                _35.label = 74;
            case 74:
                systemAboutText = "";
                _35.label = 75;
            case 75:
                _35.trys.push([75, 77, , 78]);
                return [4 /*yield*/, getDoc(doc(db, "siteContent", "system_about"))];
            case 76:
                aboutSnap = _35.sent();
                if (aboutSnap.exists()) {
                    systemAboutText = aboutSnap.data().content || "";
                }
                return [3 /*break*/, 78];
            case 77:
                aboutErr_1 = _35.sent();
                console.warn("Failed to fetch system_about for AI context, using static fallback:", aboutErr_1);
                return [3 /*break*/, 78];
            case 78:
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
                return [4 /*yield*/, getSystemContextInfo()];
            case 79:
                systemCtx = _35.sent();
                systemInstructionText = "Siz AIEDUTIZIM botining aqlli yordamchisiz. Foydalanuvchi ismi: ".concat((authed === null || authed === void 0 ? void 0 : authed.displayName) || ((_32 = ctx.from) === null || _32 === void 0 ? void 0 : _32.first_name) || "Foydalanuvchi", ".\n\nAtrof-muhit va joriy statistika (faqat raqamlar bo'yicha savol berilsa foydalaning):\n").concat(systemCtx, "\n\n=== QAT'IY QOIDALAR (AI SAVOL-JAVOB TIZIMI): ===\n1. Siz FAQAT va FAQAT quyidagi \"Tizim haqida\" ma'lumotlar bazasida taqdim etilgan ma'lumotlar asosida javob bera olasiz.\n2. Internetdan mutlaqo foydalanmang! Saytlarni qidirmang!\n3. Umumiy bilimlaringiz asosida javob bermang! O'zingizdan ma'lumot to'qib chiqarmang!\n4. Agar foydalanuvchining so'zi noaniq bo'lsa yoki \"Tizim haqida\"gi ma'lumotlar bazasida topilmasa, aynan quyidagi matnni javob tariqasida qaytaring:\n\u274C Ushbu savol bo'yicha ma'lumot topilmadi.\n\uD83D\uDCDE Administrator bilan bog'lanishingizni tavsiya qilaman.\n\n=== TIZIM HAQIDA MA'LUMOT ===\n").concat(systemAboutText, "\n=============================\n\nFoydalanuvchi xabari: ").concat(prompt_1);
                return [4 /*yield*/, generateContentWithRotation({
                        model: imagePart ? "gemini-2.5-flash" : "gemini-2.5-flash",
                        contents: [
                            { role: "user", parts: __spreadArray([{ text: systemInstructionText }], (imagePart ? [imagePart] : []), true) }
                        ]
                    })];
            case 80:
                aiResponse = _35.sent();
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
            case 81:
                _35.sent();
                replyText = aiResponse.text || "";
                cleanResponseText = replyText.trim().replace(/[*_`]/g, "");
                // Programmatic fallback to guarantee adherence
                if (cleanResponseText.includes("topilmadi") ||
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
                        !cleanResponseText.toLowerCase().includes("balans"))) {
                    replyText = "❌ Ushbu savol bo'yicha ma'lumot topilmadi.\n📞 Administrator bilan bog'lanishingizni tavsiya qilaman.";
                }
                _35.label = 82;
            case 82:
                _35.trys.push([82, 84, , 90]);
                return [4 /*yield*/, ctx.reply(replyText, { parse_mode: "Markdown" })];
            case 83:
                _35.sent();
                return [3 /*break*/, 90];
            case 84:
                markdownErr_1 = _35.sent();
                _35.label = 85;
            case 85:
                _35.trys.push([85, 87, , 89]);
                return [4 /*yield*/, ctx.reply(replyText, { parse_mode: "HTML" })];
            case 86:
                _35.sent();
                return [3 /*break*/, 89];
            case 87:
                htmlErr_1 = _35.sent();
                return [4 /*yield*/, ctx.reply(replyText)];
            case 88:
                _35.sent();
                return [3 /*break*/, 89];
            case 89: return [3 /*break*/, 90];
            case 90: return [3 /*break*/, 97];
            case 91:
                err_18 = _35.sent();
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(function () { })];
            case 92:
                _35.sent();
                console.error("AI Assistant error detail:", err_18);
                errMsg = err_18.message || "";
                if (!(errMsg.includes("Quota") || errMsg.includes("limit"))) return [3 /*break*/, 94];
                return [4 /*yield*/, ctx.reply("⚠️ <b>AI limiti tugadi.</b> Iltimos birozdan so'ng urinib ko'ring yoki boshqa xizmatdan foydalaning.", { parse_mode: "HTML" })];
            case 93:
                _35.sent();
                return [3 /*break*/, 96];
            case 94: return [4 /*yield*/, ctx.reply("\u274C AI bilan bog'lanishda xatolik yuz berdi: ".concat(errMsg.substring(0, 100), "\n\nIltimos keyinroq urinib ko'ring."))];
            case 95:
                _35.sent();
                _35.label = 96;
            case 96: return [3 /*break*/, 97];
            case 97: return [3 /*break*/, 99];
            case 98:
                processingUsers.delete(userId);
                return [7 /*endfinally*/];
            case 99: return [2 /*return*/];
            case 100:
                if (chatType === "private" && !pending && !userWizardStates.has(userId) && !aiAssistantActiveUsers.has(userId) && !userText.startsWith("/")) {
                    return [2 /*return*/, ctx.reply("📋 Kerakli xizmatni menyudan tanlang.")];
                }
                _35.label = 101;
            case 101:
                if (userText.startsWith("/"))
                    return [2 /*return*/]; // Ignore other commands
                if (!(normText === "📥 Javob berilmaganlar" ||
                    normText === "📥 Javob berilmagan murojaatlar" ||
                    normText.toLowerCase().includes("javob berilmaganlar"))) return [3 /*break*/, 103];
                return [4 /*yield*/, handleUnansweredRequest(ctx)];
            case 102:
                _35.sent();
                return [2 /*return*/];
            case 103:
                if (!(normText === "📊 Statistika" ||
                    normText.startsWith("📊 Statistika") ||
                    normText.toLowerCase().includes("statistika"))) return [3 /*break*/, 114];
                if (!(!authed || (authed.role !== "admin" && authed.role !== "subadmin"))) return [3 /*break*/, 105];
                _k = (_j = ctx).reply;
                _l = ["Sizda bu huquq yo'q."];
                _14 = {};
                _15 = {};
                return [4 /*yield*/, getKeyboard(authed === null || authed === void 0 ? void 0 : authed.role, userId, !!authed)];
            case 104: return [2 /*return*/, _k.apply(_j, _l.concat([(_14.reply_markup = (_15.keyboard = _35.sent(),
                        _15.resize_keyboard = true,
                        _15),
                        _14)]))];
            case 105: return [4 /*yield*/, ctx.reply("📊 Statistika yuklanmoqda...")];
            case 106:
                loadingMsg = _35.sent();
                _35.label = 107;
            case 107:
                _35.trys.push([107, 113, , 114]);
                totalDBUsers = 0;
                rolesCount = {
                    admin: 0,
                    subadmin: 0,
                    teacher: 0,
                    student: 0,
                    staff: 0,
                    guest: 0
                };
                if (!db) return [3 /*break*/, 111];
                _35.label = 108;
            case 108:
                _35.trys.push([108, 110, , 111]);
                return [4 /*yield*/, Promise.all([
                        getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
                        getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
                        getCountFromServer(query(collection(db, "users"), where("role", "==", "staff"))),
                        getCountFromServer(query(collection(db, "users"), where("role", "==", "admin")))
                    ])];
            case 109:
                _m = _35.sent(), sSnap = _m[0], tSnap = _m[1], stSnap = _m[2], aSnap = _m[3];
                rolesCount.student = sSnap.data().count;
                rolesCount.teacher = tSnap.data().count;
                rolesCount.staff = stSnap.data().count;
                rolesCount.admin = aSnap.data().count;
                totalDBUsers = rolesCount.student + rolesCount.teacher + rolesCount.staff + rolesCount.admin;
                return [3 /*break*/, 111];
            case 110:
                e_25 = _35.sent();
                return [3 /*break*/, 111];
            case 111: return [4 /*yield*/, ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id)];
            case 112:
                _35.sent();
                statsMsg = "\uD83D\uDCCA <b>Joriy vaqt uchun Bot va Tizim Statistika:</b>\n\n";
                statsMsg += "\uD83D\uDC65 <b>Tizimdagi jami foydalanuvchilar soni:</b> ".concat(totalDBUsers, "\n");
                statsMsg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
                statsMsg += "\uD83D\uDC51 <b>Bosh Adminlar (Super Admin):</b> ".concat(rolesCount.admin, "\n");
                statsMsg += "\uD83D\uDEE1\uFE0F <b>Kichik Adminlar (Sub Admin):</b> ".concat(rolesCount.subadmin, "\n");
                statsMsg += "\uD83C\uDFEB <b>Tashkilotlar (O'qituvchi):</b> ".concat(rolesCount.teacher, "\n");
                statsMsg += "\uD83C\uDF93 <b>Talabalar:</b> ".concat(rolesCount.student, "\n");
                statsMsg += "\uD83D\uDCBC <b>Xodimlar:</b> ".concat(rolesCount.staff, "\n");
                if (rolesCount.guest > 0) {
                    statsMsg += "\uD83D\uDC64 <b>Mehmonlar:</b> ".concat(rolesCount.guest, "\n");
                }
                statsMsg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
                statsMsg += "\uD83E\uDD16 <b>Telegram bot a'zolari:</b> ".concat(telegramUsersCount, "\n");
                statsMsg += "\u2728 <i>Barcha ma'lumotlar real vaqt rejimida ma'lumotlar bazasidan hisoblab chiqildi!</i>";
                return [2 /*return*/, ctx.reply(statsMsg, { parse_mode: "HTML" })];
            case 113:
                err_19 = _35.sent();
                console.error("Statistics error:", err_19);
                return [2 /*return*/, ctx.reply("\uD83D\uDCCA <b>Statistika (Kesh rejimida):</b>\n\nBot foydalanuvchilari soni: ".concat(telegramUsersCount, "\n\nUlanishda xatolik yuz bergani sababli rollar keshdan o'qildi."), { parse_mode: "HTML" })];
            case 114:
                if (normText === "⚙️ Menyu sozlamalari") {
                    adminIds = getAdminIds();
                    isHardAdmin = adminIds.includes(userId);
                    if (!isHardAdmin && (!authed || (authed.role !== "admin" && authed.role !== "subadmin"))) {
                        return [2 /*return*/, ctx.reply("Sizda bu huquq yo'q.")];
                    }
                    return [2 /*return*/, ctx.reply("⚙️ <b>Menyu sozlamalari</b>\n\nQuyidagi amallardan birini tanlang:", {
                            parse_mode: "HTML",
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "📝 Asosiy menyuni tahrirlash", callback_data: "admin_edit_menu_main" }],
                                    [{ text: "➕ Tugma qo'shish", callback_data: "admin_add_button" }, { text: "❌ Tugma o'chirish", callback_data: "admin_delete_button" }],
                                    [{ text: "✏️ Nomini o'zgartirish", callback_data: "admin_rename_button" }, { text: "🔢 Tartibini o'zgartirish", callback_data: "admin_reorder_button" }],
                                    [{ text: "📄 Xabar matnini tahrirlash", callback_data: "admin_edit_msg_text" }],
                                    [{ text: "ℹ️ 'Tizim haqida' matnini tahrirlash", callback_data: "admin_edit_system_about" }]
                                ]
                            }
                        })];
                }
                if (!(normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu")) return [3 /*break*/, 117];
                aiModeDeactivate();
                return [4 /*yield*/, getAuthedUser(userId)];
            case 115:
                authed_1 = _35.sent();
                _p = (_o = ctx).reply;
                _q = ["Asosiy menyuga qaytildi:"];
                _16 = {};
                _17 = {};
                return [4 /*yield*/, getKeyboard(authed_1 === null || authed_1 === void 0 ? void 0 : authed_1.role, userId, !!authed_1)];
            case 116: return [2 /*return*/, _p.apply(_o, _q.concat([(_16.reply_markup = (_17.keyboard = _35.sent(),
                        _17.resize_keyboard = true,
                        _17),
                        _16)]))];
            case 117:
                _35.trys.push([117, 119, , 120]);
                return [4 /*yield*/, getDoc(doc(db, "botConfig", "buttonTexts"))];
            case 118:
                textSnap = _35.sent();
                if (textSnap.exists()) {
                    customTexts = textSnap.data();
                    if (customTexts[normText]) {
                        aiAssistantActiveUsers.delete(userId);
                        return [2 /*return*/, ctx.reply(customTexts[normText], { parse_mode: "HTML" })];
                    }
                }
                return [3 /*break*/, 120];
            case 119:
                e_26 = _35.sent();
                return [3 /*break*/, 120];
            case 120:
                if (!(normText === "ℹ️ Tizim haqida")) return [3 /*break*/, 125];
                aiModeDeactivate();
                aiAssistantActiveUsers.delete(userId);
                _35.label = 121;
            case 121:
                _35.trys.push([121, 123, , 124]);
                return [4 /*yield*/, getDoc(doc(db, "siteContent", "system_about"))];
            case 122:
                snap = _35.sent();
                if (snap.exists()) {
                    return [2 /*return*/, ctx.reply(snap.data().content, { parse_mode: "HTML" })];
                }
                return [3 /*break*/, 124];
            case 123:
                e_27 = _35.sent();
                return [3 /*break*/, 124];
            case 124: return [2 /*return*/, ctx.reply("🚀 <b>AIEDUTIZIM</b> — Sun'iy Intellekt Asosidagi Zamonaviy Ta'lim Tizimi.\n\n" +
                    "Platformamiz talabalar, o'qituvchilar va tashkilotlar uchun quyidagi imkoniyatlarni taqdim etadi:\n\n" +
                    "✅ <b>AI-Test Tizimi:</b> Sun'iy intellekt yordamida mavzuga oid savollarni avtomatik shakllantirish.\n" +
                    "✅ <b>Modulli Ta'lim:</b> Interaktiv darslar va o'quv jarayonini bosqichma-bosqich kuzatish.\n" +
                    "✅ <b>Avtomatik Sertifikatlar:</b> QR-kodli rasmiy sertifikatlarni darhol yuklab olish.\n" +
                    "✅ <b>Quizizz va Musobaqalar:</b> Real-vaqt rejimida bilimlar musobaqasini o'tkazish.\n" +
                    "✅ <b>Smart Jurnal:</b> Barcha natijalar va statistikani xavfsiz kataloglash.\n\n" +
                    "🌐 Batafsil: " + APP_URL, { parse_mode: "HTML" })];
            case 125:
                if (!(normText === "💰 Balans")) return [3 /*break*/, 132];
                aiModeDeactivate();
                aiAssistantActiveUsers.delete(userId);
                console.log("[Balance] Request from user ".concat(userId, " (").concat(ctx.from.first_name, ")"));
                _35.label = 126;
            case 126:
                _35.trys.push([126, 131, , 132]);
                if (!db)
                    throw new Error("Firestore DB not initialized");
                usersRef = collection(db, "users");
                q = query(usersRef, where("telegramId", "==", userId));
                return [4 /*yield*/, getDocs(q)];
            case 127:
                snap = _35.sent();
                userData = null;
                userDocId = null;
                if (!(!snap || snap.empty)) return [3 /*break*/, 129];
                console.log("[Balance] User ".concat(userId, " not found in 'users' collection. Creating fallback..."));
                // Auto-create if not found (fallback)
                userData = {
                    telegramId: userId,
                    uid: "tg_".concat(userId),
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
                return [4 /*yield*/, addDoc(usersRef, userData)];
            case 128:
                newRef = _35.sent();
                userDocId = newRef.id;
                console.log("[Balance] Fallback profile created: ".concat(userDocId));
                return [3 /*break*/, 130];
            case 129:
                userData = snap.docs[0].data();
                userDocId = snap.docs[0].id;
                console.log("[Balance] User data found for ".concat(userId));
                _35.label = 130;
            case 130:
                if (!userData) {
                    throw new Error("Unable to resolve userData after retrieval/creation");
                }
                bal = userData.balance !== undefined ? userData.balance : (userData.ball || 0);
                spent = userData.spentBalls || 0;
                displayBalance = bal - spent;
                return [2 /*return*/, ctx.reply("\uD83D\uDCB0 <b>Sizning balansingiz:</b>\n\n" +
                        "\uD83D\uDC8E Umumiy ballar: <b>".concat(bal, "</b>\n") +
                        "\uD83D\uDCC9 Ishlatilgan: <b>".concat(spent, "</b>\n") +
                        "\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                        "\u2705 Mavjud balans: <b>".concat(displayBalance, " ball</b>"), { parse_mode: "HTML" })];
            case 131:
                e_28 = _35.sent();
                console.error("[Balance] CRITICAL ERROR:", e_28);
                // Absolute fallback - don't show error message, show 0 balance and log
                return [2 /*return*/, ctx.reply("\uD83D\uDCB0 <b>Sizning balansingiz</b>\n\n" +
                        "\uD83D\uDC64 Ism: <b>".concat(ctx.from.first_name || "Foydalanuvchi", "</b>\n") +
                        "\uD83C\uDD94 Telegram ID: <code>".concat(userId, "</code>\n") +
                        "\uD83D\uDC8E Ball: <b>0</b>\n\n" +
                        "<i>\u26A0\uFE0F Ma'lumotlarni yangilashda texnik uzilish. Tez orada tuzatiladi.</i>", { parse_mode: "HTML" })];
            case 132:
                if (normText === "🎁 Bepul ball" || normText === "🎁 Bepul ball olish") {
                    aiModeDeactivate();
                    return [2 /*return*/, ctx.reply("\uD83C\uDF81 <b>Bepul ballar olish imkoniyatlari:</b>\n\n" +
                            "1\uFE0F\u20E3 <b>Do'stlarni taklif qilish:</b> Har bir taklif qilingan do'stingiz uchun <b>5 ball</b> beriladi. Do'stingiz botga kirib /start bosishi kifoya.\n" +
                            "2\uFE0F\u20E3 <b>Kunlik bonus:</b> Tizimga har kuni kirganingizda profilingizda ballar yangilanadi.\n" +
                            "3\uFE0F\u20E3 <b>Xatoliklar bo'yicha xabar:</b> Tizimdagi xatoliklar haqida @adminga xabar bersangiz va tasdiqlansa, sizga sovg'a tariqasida ballar taqdim etiladi.\n\n" +
                            "\uD83D\uDCA1 <i>Hozircha har bir do'stingiz uchun 5 ball olish uchun quyidagi \"\uD83D\uDC65 Do'stlarni taklif qilish\" tugmasidan foydalaning!</i>", { parse_mode: "HTML" })];
                }
                if (normText === "👥 Do'stlarni taklif qilish") {
                    aiModeDeactivate();
                    refLink = "".concat(APP_URL, "/?r=").concat(userId);
                    botRefLink = "https://t.me/".concat(ctx.botInfo.username, "?start=ref_").concat(userId);
                    return [2 /*return*/, ctx.reply("\uD83D\uDC65 <b>Do'stlarni taklif qiling va ballar to'plang!</b>\n\n" +
                            "Sizning shaxsiy referal havolangiz:\n\n" +
                            "\uD83D\uDD17 <b>Telegram bot uchun:</b> ".concat(botRefLink, "\n") +
                            "\uD83D\uDD17 <b>Veb-sayt uchun:</b> ".concat(refLink, "\n\n") +
                            "\uD83C\uDF81 Har bir taklif qilingan do'st uchun <b>5 ball</b> balansingizga qo'shiladi!", { parse_mode: "HTML" })];
                }
                if (normText === "💳 Balansni to'ldirish") {
                    aiModeDeactivate();
                    aiAssistantActiveUsers.delete(userId);
                    return [2 /*return*/, ctx.reply(paymentInstructionsText, { parse_mode: "HTML" })];
                }
                if (normText === "🌐 Rasmiy sayt") {
                    aiAssistantActiveUsers.delete(userId);
                    return [2 /*return*/, ctx.reply("\uD83D\uDD17 <a href=\"".concat(APP_URL, "\">Rasmiy saytga o'tish</a>"), { parse_mode: "HTML" })];
                }
                if (normText === "💬 Adminga murojaat") {
                    aiAssistantActiveUsers.delete(userId);
                    customText = customMenuTexts.get("💬 Adminga murojaat");
                    pendingLogins.set(userId, { step: "admin_message" });
                    return [2 /*return*/, ctx.reply(customText || "Savol, taklif yoki muammolaringiz bo‘lsa xabaringizni yuboring. Administrator siz bilan tez orada bog‘lanadi.")];
                }
                if (normText === "Admin profilga kirish") {
                    aiAssistantActiveUsers.delete(userId);
                    if (!db)
                        return [2 /*return*/, ctx.reply("Ma'lumotlar bazasi ulanmagan.")];
                    pendingLogins.set(userId, { step: "email" });
                    return [2 /*return*/, ctx.reply("Profilga kirish uchun loginingizni yoki emailingizni kiriting:\n\n(Misol uchun: login nomi yoki to'liq email manzilni yuborishingiz mumkin)")];
                }
                if (!(normText === "👤 Profil")) return [3 /*break*/, 147];
                aiAssistantActiveUsers.delete(userId);
                if (!!authed) return [3 /*break*/, 134];
                _s = (_r = ctx).reply;
                _t = ["❌ Siz tizimga kirmagansiz.\n\nIltimos, \"🔑 Kirish\" tugmasi orqali tizimga kiring."];
                _18 = {};
                _19 = {};
                return [4 /*yield*/, getKeyboard(undefined, userId, false)];
            case 133: return [2 /*return*/, _s.apply(_r, _t.concat([(_18.reply_markup = (_19.keyboard = _35.sent(),
                        _19.resize_keyboard = true,
                        _19),
                        _18)]))];
            case 134:
                dbDoc = null;
                if (!authed.docId) return [3 /*break*/, 138];
                _35.label = 135;
            case 135:
                _35.trys.push([135, 137, , 138]);
                return [4 /*yield*/, getDoc(doc(db, "users", authed.docId))];
            case 136:
                res = _35.sent();
                if (res.exists())
                    dbDoc = res;
                return [3 /*break*/, 138];
            case 137:
                e_29 = _35.sent();
                return [3 /*break*/, 138];
            case 138:
                if (!!dbDoc) return [3 /*break*/, 142];
                _35.label = 139;
            case 139:
                _35.trys.push([139, 141, , 142]);
                return [4 /*yield*/, getDoc(doc(db, 'users', authed.uid))];
            case 140:
                res = _35.sent();
                if (res.exists())
                    dbDoc = res;
                return [3 /*break*/, 142];
            case 141:
                e_30 = _35.sent();
                return [3 /*break*/, 142];
            case 142:
                if (!(!dbDoc && db)) return [3 /*break*/, 146];
                _35.label = 143;
            case 143:
                _35.trys.push([143, 145, , 146]);
                q = query(collection(db, "users"), where("uid", "==", authed.uid));
                return [4 /*yield*/, getDocs(q)];
            case 144:
                qSnap = _35.sent();
                if (!qSnap.empty) {
                    dbDoc = qSnap.docs[0];
                }
                return [3 /*break*/, 146];
            case 145:
                e_31 = _35.sent();
                return [3 /*break*/, 146];
            case 146:
                uData = dbDoc ? dbDoc.data() : null;
                roleText = (uData === null || uData === void 0 ? void 0 : uData.role) || authed.role || "student";
                roleDisplay = "Mehmon";
                if (roleText === "admin")
                    roleDisplay = "Administrator";
                else if (roleText === "teacher")
                    roleDisplay = "Tashkilot";
                else if (roleText === "staff")
                    roleDisplay = "Xodim";
                else if (roleText === "student")
                    roleDisplay = "Talaba";
                profileMsg = "\uD83D\uDC64 <b>Profil ma'lumotlari:</b>\n\n";
                profileMsg += "\u2022 <b>F.I.Sh.:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.displayName) || authed.displayName || "Kiritilmagan", "</code>\n");
                profileMsg += "\u2022 <b>Email:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.email) || authed.email || "Kiritilmagan", "</code>\n");
                profileMsg += "\u2022 <b>Telefon:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.phone) || (uData === null || uData === void 0 ? void 0 : uData.phoneNumber) || "Kiritilmagan", "</code>\n");
                profileMsg += "\u2022 <b>Tashkilot:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.teacherName) || (uData === null || uData === void 0 ? void 0 : uData.departmentName) || "Kiritilmagan", "</code>\n");
                profileMsg += "\u2022 <b>Lavozim yoki rol:</b> <code>".concat(roleDisplay, "</code>\n");
                profileMsg += "\u2022 <b>Profil rasmi:</b> <code>".concat((uData === null || uData === void 0 ? void 0 : uData.photoURL) || (uData === null || uData === void 0 ? void 0 : uData.avatar) || "Kiritilmagan", "</code>");
                return [2 /*return*/, ctx.reply(profileMsg, {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "📱 Tizimga kirish", web_app: { url: "https://aiedutizim.vercel.app/login" } }],
                                [{ text: "🚪 Chiqish", callback_data: "logout" }]
                            ]
                        }
                    })];
            case 147:
                if (!(normText === "🚪 Chiqish" || normText === "🚪 Tizimdan chiqish" || normText === "Chiqish")) return [3 /*break*/, 153];
                pendingLogins.delete(userId);
                if (!(authed && db)) return [3 /*break*/, 151];
                _35.label = 148;
            case 148:
                _35.trys.push([148, 150, , 151]);
                return [4 /*yield*/, getDocs(query(collection(db, "users"), where("telegramId", "==", userId)))];
            case 149:
                snap = _35.sent();
                return [3 /*break*/, 151];
            case 150:
                e_32 = _35.sent();
                console.error("Logout error", e_32);
                return [3 /*break*/, 151];
            case 151:
                authedUsers.delete(userId);
                aiAssistantActiveUsers.delete(userId);
                _v = (_u = ctx).reply;
                _w = ["✅ Siz tizimdan muvaffaqiyatli chiqdingiz."];
                _20 = {};
                _21 = {};
                return [4 /*yield*/, getKeyboard(undefined, userId, false)];
            case 152: return [2 /*return*/, _v.apply(_u, _w.concat([(_20.reply_markup = (_21.keyboard = _35.sent(),
                        _21.resize_keyboard = true,
                        _21),
                        _20)]))];
            case 153:
                if (normText === "⚙️ Bot holati") {
                    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin" && authed.role !== "teacher")) {
                        return [2 /*return*/, ctx.reply("Sizda bu huquq yo'q.")];
                    }
                    uptimeSec = Math.floor(process.uptime());
                    hours = Math.floor(uptimeSec / 3600);
                    minutes = Math.floor((uptimeSec % 3600) / 60);
                    seconds = uptimeSec % 60;
                    botStatus = "\u2699\uFE0F <b>BOTN\u0130NG ISHLASH HOLATI</b>\n" +
                        "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                        "\uD83D\uDDA5 <b>Tizim ma'lumotlari:</b>\n" +
                        "   \u26A1\uFE0F Server: <code>Google Cloud Run (Node.js)</code>\n" +
                        "   \u23F3 Ishlash vaqti (Uptime): <code>".concat(hours, "h ").concat(minutes, "m ").concat(seconds, "s</code>\n") +
                        "   \uD83D\uDCE6 Kutubxona: <code>Telegraf v4.16.3</code>\n\n" +
                        "\uD83E\uDDE0 <b>AI Xizmati:</b>\n" +
                        "   \uD83E\uDD16 Model: <code>Gemini 2.0 Flash / 1.5 Pro</code>\n" +
                        "   \uD83D\uDEE1 Rate-Limit: <code>Admin/O'qituvchilar cheksiz, Talabalar daqiqasiga 20 ta so'rov</code>\n\n" +
                        "\uD83D\uDDC4 <b>Baza holati (Firestore):</b>\n" +
                        "   \uD83D\uDD39 ProjectID: <code>".concat(firebaseProjectId || "aiedutizim-default", "</code>\n") +
                        "   \uD83D\uDCF6 Aloqa: <code>Muvaffaqiyatli (Ulandi)</code>\n" +
                        "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                        "\uD83D\uDCA1 <i>Bot holati mukammal ishlamoqda. Yangi so'rovlarni qabul qilishga tayyor!</i>";
                    return [2 /*return*/, ctx.reply(botStatus, { parse_mode: "HTML" })];
                }
                if (normText === "📢 E'lon berish" ||
                    normText === "📢 Umumiy e'lon yuborish" ||
                    normText === "📢 E'lon yuborish" ||
                    normText === "E'lon yuborish") {
                    if (!authed || (authed.role !== "admin" && authed.role !== "subadmin" && authed.role !== "teacher")) {
                        return [2 /*return*/, ctx.reply("Sizda bu huquq yo'q.")];
                    }
                    pendingLogins.set(userId, { step: "broadcast_message" });
                    return [2 /*return*/, ctx.reply("Yuboriladigan e'lon matni, rasm yoki videoni yuboring:")];
                }
                if (!pending) return [3 /*break*/, 292];
                if (!(pending.step === "admin_add_button_name")) return [3 /*break*/, 154];
                pending.buttonName = userText;
                pending.step = "admin_add_button_row";
                return [2 /*return*/, ctx.reply("\"".concat(userText, "\" tugmasi nechanchi qatorga qo'shilsin? (Raqam yuboring, masalan: 1)"))];
            case 154:
                if (!(pending.step === "admin_add_button_row")) return [3 /*break*/, 157];
                row = parseInt(userText) - 1;
                if (isNaN(row) || row < 0)
                    return [2 /*return*/, ctx.reply("Iltimos, to'g'ri raqam yuboring.")];
                return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
            case 155:
                menuDoc = _35.sent();
                kb = menuDoc.exists() ? (menuDoc.data().keyboard || []) : [];
                if (!kb[row])
                    kb[row] = [];
                kb[row].push({ text: pending.buttonName });
                return [4 /*yield*/, setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true })];
            case 156:
                _35.sent();
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("\u2705 \"".concat(pending.buttonName, "\" tugmasi ").concat(row + 1, "-qatorga qo'shildi."))];
            case 157:
                if (!(pending.step === "admin_rename_button_select")) return [3 /*break*/, 158];
                pending.oldName = userText;
                pending.step = "admin_rename_button_new";
                return [2 /*return*/, ctx.reply("\"".concat(userText, "\" tugmasi uchun yangi nomni kiriting:"))];
            case 158:
                if (!(pending.step === "admin_rename_button_new")) return [3 /*break*/, 162];
                return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
            case 159:
                menuDoc = _35.sent();
                if (!menuDoc.exists()) return [3 /*break*/, 161];
                kb = menuDoc.data().keyboard || [];
                found_1 = false;
                kb = kb.map(function (row) { return row.map(function (btn) {
                    if (btn.text === pending.oldName) {
                        found_1 = true;
                        return __assign(__assign({}, btn), { text: userText });
                    }
                    return btn;
                }); });
                if (!found_1) return [3 /*break*/, 161];
                return [4 /*yield*/, setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true })];
            case 160:
                _35.sent();
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("\u2705 Tugma nomi \"".concat(pending.oldName, "\" dan \"").concat(userText, "\" ga o'zgartirildi."))];
            case 161: return [2 /*return*/, ctx.reply("❌ Amaldagi nomli tugma topilmadi.")];
            case 162:
                if (!(pending.step === "admin_edit_msg_select")) return [3 /*break*/, 163];
                pending.targetButton = userText;
                pending.step = "admin_edit_msg_new";
                return [2 /*return*/, ctx.reply("\"".concat(userText, "\" tugmasi bosilganda chiqadigan yangi matnni yuboring:"))];
            case 163:
                if (!(pending.step === "admin_edit_msg_new")) return [3 /*break*/, 165];
                return [4 /*yield*/, setDoc(doc(db, "botConfig", "buttonTexts"), (_22 = {}, _22[pending.targetButton] = userText, _22), { merge: true })];
            case 164:
                _35.sent();
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("\u2705 \"".concat(pending.targetButton, "\" tugmasi uchun xabar matni yangilandi."))];
            case 165:
                if (!(pending.step === "admin_edit_system_about")) return [3 /*break*/, 167];
                return [4 /*yield*/, setDoc(doc(db, "siteContent", "system_about"), {
                        content: userText,
                        updatedAt: serverTimestamp()
                    }, { merge: true })];
            case 166:
                _35.sent();
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("✅ 'Tizim haqida' matni muvaffaqiyatli yangilandi.")];
            case 167:
                if (!(pending.step === "admin_payment_amount")) return [3 /*break*/, 194];
                amount = parseInt(userText);
                if (isNaN(amount) || amount <= 0) {
                    return [2 /*return*/, ctx.reply("❌ Faqat son kiriting.")];
                }
                targetId_1 = pending.targetPaymentUserId;
                if (!targetId_1) {
                    pendingLogins.delete(userId);
                    return [2 /*return*/, ctx.reply("❌ Ma'lumotlarda xatolik. Iltimos qaytadan urinib ko'ring.")];
                }
                _35.label = 168;
            case 168:
                _35.trys.push([168, 192, , 193]);
                console.log("[Payment] Admin ".concat(userId, " adding ").concat(amount, " to user ").concat(targetId_1));
                usersRef = collection(db, "users");
                return [4 /*yield*/, getDocs(query(usersRef, where("telegramId", "==", Number(targetId_1))))];
            case 169:
                snap = _35.sent();
                if (!snap.empty) return [3 /*break*/, 171];
                return [4 /*yield*/, getDocs(query(usersRef, where("telegramId", "==", String(targetId_1))))];
            case 170:
                snap = _35.sent();
                _35.label = 171;
            case 171:
                if (!!snap.empty) return [3 /*break*/, 190];
                userDoc = snap.docs[0];
                userData = userDoc.data();
                currentBall = userData.ball || 0;
                currentBalance = userData.balance || 0;
                newBall = currentBall + amount;
                newBalance = currentBalance + amount;
                return [4 /*yield*/, updateDoc(doc(db, "users", userDoc.id), {
                        ball: newBall,
                        balance: newBalance,
                        updatedAt: serverTimestamp()
                    })];
            case 172:
                _35.sent();
                pendingLogins.delete(userId);
                uName = userData.name || userData.displayName || "Foydalanuvchi";
                // Notify user
                return [4 /*yield*/, bot.telegram.sendMessage(Number(targetId_1), "\u2705 To'lov tasdiqlandi\n\n\uD83D\uDCB0 Sizga ".concat(amount, " ball qo'shildi\n\n\uD83D\uDCCA Yangi balans: ").concat(newBalance), { parse_mode: "HTML" }).catch(function (e) {
                        console.error("Notify user ".concat(targetId_1, " failed:"), e);
                    })];
            case 173:
                // Notify user
                _35.sent();
                _35.label = 174;
            case 174:
                _35.trys.push([174, 182, , 183]);
                pQuery = query(collection(db, "payments"), where("userId", "==", Number(targetId_1)), where("status", "==", "pending"), orderBy("timestamp", "desc"), limit(1));
                return [4 /*yield*/, getDocs(pQuery)];
            case 175:
                pSnap = _35.sent();
                if (!!pSnap.empty) return [3 /*break*/, 181];
                pDoc = pSnap.docs[0];
                pData = pDoc.data();
                if (!Array.isArray(pData.tgSentMessages)) return [3 /*break*/, 179];
                _x = 0, _y = pData.tgSentMessages;
                _35.label = 176;
            case 176:
                if (!(_x < _y.length)) return [3 /*break*/, 179];
                item = _y[_x];
                if (!(item.chatId && item.messageId)) return [3 /*break*/, 178];
                return [4 /*yield*/, bot.telegram.deleteMessage(item.chatId, item.messageId).catch(function () { })];
            case 177:
                _35.sent();
                _35.label = 178;
            case 178:
                _x++;
                return [3 /*break*/, 176];
            case 179: return [4 /*yield*/, updateDoc(doc(db, "payments", pDoc.id), {
                    status: "approved",
                    amount: amount,
                    processedAt: serverTimestamp(),
                    processedBy: userId
                })];
            case 180:
                _35.sent();
                _35.label = 181;
            case 181: return [3 /*break*/, 183];
            case 182:
                e_33 = _35.sent();
                console.error("Firestore payment status update fail:", e_33);
                return [3 /*break*/, 183];
            case 183:
                origMsgId = pending.originalMessageId;
                origChatId = pending.originalChatId;
                if (!(origMsgId && origChatId)) return [3 /*break*/, 185];
                return [4 /*yield*/, ctx.telegram.deleteMessage(origChatId, origMsgId).catch(function () { })];
            case 184:
                _35.sent();
                _35.label = 185;
            case 185:
                promptMsgId = pending.promptMessageId;
                if (!(promptMsgId && chatId)) return [3 /*break*/, 187];
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, promptMsgId).catch(function () { })];
            case 186:
                _35.sent();
                _35.label = 187;
            case 187:
                if (!(((_33 = ctx.message) === null || _33 === void 0 ? void 0 : _33.message_id) && chatId)) return [3 /*break*/, 189];
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, ctx.message.message_id).catch(function () { })];
            case 188:
                _35.sent();
                _35.label = 189;
            case 189: return [2 /*return*/, ctx.reply("\u2705 <b>Muvaffaqiyatli!</b>\n\n\uD83D\uDC64 ".concat(uName, " (ID: ").concat(targetId_1, ") balansiga ").concat(amount, " ball qo'shildi.\n\uD83D\uDCCA Yangi balans: ").concat(newBalance))];
            case 190:
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("\u274C Foydalanuvchi (ID: ".concat(targetId_1, ") bazadan topilmadi."))];
            case 191: return [3 /*break*/, 193];
            case 192:
                e_34 = _35.sent();
                console.error("Payment approval error:", e_34);
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("❌ Balansni yangilashda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.")];
            case 193: return [3 /*break*/, 199];
            case 194:
                if (!(pending.step === "admin_reorder_button_select")) return [3 /*break*/, 195];
                pending.targetButton = userText;
                pending.step = "admin_reorder_button_newpos";
                return [2 /*return*/, ctx.reply("\"".concat(userText, "\" tugmasi nechanchi qatorga ko'chirilsin? (Raqam yuboring)"))];
            case 195:
                if (!(pending.step === "admin_reorder_button_newpos")) return [3 /*break*/, 199];
                row = parseInt(userText) - 1;
                if (isNaN(row) || row < 0)
                    return [2 /*return*/, ctx.reply("Iltimos, to'g'ri raqam yuboring.")];
                return [4 /*yield*/, getDoc(doc(db, "botConfig", "mainMenu"))];
            case 196:
                menuDoc = _35.sent();
                if (!menuDoc.exists()) return [3 /*break*/, 198];
                kb = menuDoc.data().keyboard || [];
                item = null;
                // Find and remove
                for (i = 0; i < kb.length; i++) {
                    res = kb[i].filter(function (btn) { return btn.text === pending.targetButton; });
                    if (res.length > 0) {
                        item = res[0];
                        kb[i] = kb[i].filter(function (btn) { return btn.text !== pending.targetButton; });
                        if (kb[i].length === 0) {
                            kb.splice(i, 1);
                        }
                        break;
                    }
                }
                if (!item) return [3 /*break*/, 198];
                if (!kb[row])
                    kb[row] = [];
                kb[row].push(item);
                return [4 /*yield*/, setDoc(doc(db, "botConfig", "mainMenu"), { keyboard: kb }, { merge: true })];
            case 197:
                _35.sent();
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("\u2705 \"".concat(pending.targetButton, "\" tugmasi ").concat(row + 1, "-qatorga ko'chirildi."))];
            case 198: return [2 /*return*/, ctx.reply("❌ Tugma topilmadi.")];
            case 199:
                if (!(pending.step === "reply_message")) return [3 /*break*/, 218];
                uName = authed ? authed.displayName : "Admin";
                senderId = authed ? authed.uid : "SYSTEM_ADMIN";
                pendingLogins.delete(userId);
                _35.label = 200;
            case 200:
                _35.trys.push([200, 216, , 217]);
                originalPromptClean = pending.originalText || "";
                if (originalPromptClean.startsWith("📨 Yangi xabar")) {
                    lines = originalPromptClean.split("\n");
                    lines.shift(); // remove "📨 Yangi xabar"
                    originalPromptClean = lines.join("\n").trim();
                }
                combinedTextToUser = "\uD83D\uDCEC <b>Siz yuborgan murojaat:</b>\n" +
                    "<i>".concat(originalPromptClean, "</i>\n\n") +
                    "\u270D\uFE0F <b>Admindan javob:</b>\n" +
                    "<b>".concat(userText, "</b>");
                return [4 /*yield*/, addDoc(collection(db, "messages"), {
                        senderId: senderId,
                        senderName: uName + " (Admin / Telegram)",
                        senderRole: "admin",
                        receiverId: pending.targetUserId,
                        text: combinedTextToUser,
                        timestamp: serverTimestamp(),
                        isRead: false,
                        fromTelegram: true,
                        senderTelegramId: userId,
                    })];
            case 201:
                _35.sent();
                _35.label = 202;
            case 202:
                _35.trys.push([202, 208, , 209]);
                mQuery = query(collection(db, "messages"), where("senderId", "==", pending.targetUserId), orderBy("timestamp", "desc"), limit(1));
                return [4 /*yield*/, getDocs(mQuery)];
            case 203:
                mSnap = _35.sent();
                if (!!mSnap.empty) return [3 /*break*/, 207];
                mDoc = mSnap.docs[0];
                mData = mDoc.data();
                if (!Array.isArray(mData.tgSentMessages)) return [3 /*break*/, 207];
                _z = 0, _0 = mData.tgSentMessages;
                _35.label = 204;
            case 204:
                if (!(_z < _0.length)) return [3 /*break*/, 207];
                item = _0[_z];
                if (!(item.chatId && item.messageId)) return [3 /*break*/, 206];
                return [4 /*yield*/, bot.telegram.deleteMessage(item.chatId, item.messageId).catch(function () { })];
            case 205:
                _35.sent();
                _35.label = 206;
            case 206:
                _z++;
                return [3 /*break*/, 204];
            case 207: return [3 /*break*/, 209];
            case 208:
                mErr_1 = _35.sent();
                console.warn("[Telegram reply clean] Error deleting alerts from admins: ", mErr_1);
                return [3 /*break*/, 209];
            case 209:
                origMsgId = pending.originalMessageId;
                origChatId = pending.originalChatId;
                if (!(origMsgId && origChatId)) return [3 /*break*/, 211];
                return [4 /*yield*/, ctx.telegram.deleteMessage(origChatId, origMsgId).catch(function () { })];
            case 210:
                _35.sent();
                _35.label = 211;
            case 211:
                promptMsgId = pending.promptMessageId;
                if (!(promptMsgId && chatId)) return [3 /*break*/, 213];
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, promptMsgId).catch(function () { })];
            case 212:
                _35.sent();
                _35.label = 213;
            case 213:
                if (!(((_34 = ctx.message) === null || _34 === void 0 ? void 0 : _34.message_id) && chatId)) return [3 /*break*/, 215];
                return [4 /*yield*/, ctx.telegram.deleteMessage(chatId, ctx.message.message_id).catch(function () { })];
            case 214:
                _35.sent();
                _35.label = 215;
            case 215: return [2 /*return*/, ctx.reply("Javobingiz muvaffaqiyatli yuborildi.")];
            case 216:
                e_35 = _35.sent();
                return [2 /*return*/, ctx.reply("Xatolik yuz berdi: " + e_35.message)];
            case 217: return [3 /*break*/, 292];
            case 218:
                if (!(pending.step === "email")) return [3 /*break*/, 225];
                emailInput = userText.trim();
                if (!!emailInput.includes("@")) return [3 /*break*/, 224];
                _35.label = 219;
            case 219:
                _35.trys.push([219, 223, , 224]);
                ADMIN_LOGIN = "Elyorbek";
                ADMIN_EMAIL = "elyorbek@admin.uz";
                queryLogin = emailInput.toLowerCase().trim();
                if (!(queryLogin === ADMIN_LOGIN.toLowerCase())) return [3 /*break*/, 220];
                emailInput = ADMIN_EMAIL;
                return [3 /*break*/, 222];
            case 220:
                loginQuery = query(collection(db, "users"), where("login", "==", emailInput));
                return [4 /*yield*/, getDocs(loginQuery)];
            case 221:
                snap = _35.sent();
                if (!snap.empty) {
                    emailInput = snap.docs[0].data().email;
                }
                else {
                    // Fallback to searching common email formats (student, teacher)
                    emailInput = queryLogin + "@student.uz";
                }
                _35.label = 222;
            case 222: return [3 /*break*/, 224];
            case 223:
                e_36 = _35.sent();
                emailInput = emailInput.toLowerCase().trim() + "@student.uz";
                return [3 /*break*/, 224];
            case 224:
                pending.email = emailInput;
                pending.step = "password";
                pendingLogins.set(userId, pending);
                return [2 /*return*/, ctx.reply("Endi parolingizni kiriting:")];
            case 225:
                if (!(pending.step === "admin_message")) return [3 /*break*/, 232];
                uName_1 = authed
                    ? authed.displayName
                    : ctx.from.first_name || "Foydalanuvchi";
                senderId_1 = authed ? authed.uid : "tg_".concat(userId);
                senderRole_1 = authed ? authed.role : "bot_user";
                if (!db) return [3 /*break*/, 231];
                _35.label = 226;
            case 226:
                _35.trys.push([226, 230, , 231]);
                return [4 /*yield*/, addDoc(collection(db, "messages"), {
                        senderId: senderId_1,
                        senderName: uName_1 + " (Telegram)",
                        receiverId: "SYSTEM_ADMIN",
                        receiverRole: "admin",
                        text: userText,
                        timestamp: serverTimestamp(),
                        isRead: false,
                        fromTelegram: true,
                        senderTelegramId: userId,
                    })];
            case 227:
                _35.sent();
                if (!!authed) return [3 /*break*/, 229];
                return [4 /*yield*/, getDocs(query(collection(db, "users"), where("uid", "==", senderId_1))).then(function (snap) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!snap.empty) return [3 /*break*/, 2];
                                    return [4 /*yield*/, setDoc(doc(db, "users", senderId_1), {
                                            uid: senderId_1,
                                            displayName: uName_1 + " (Telegram)",
                                            role: senderRole_1,
                                            telegramId: userId,
                                            isBotUser: true,
                                            fromTelegram: true,
                                        })];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    }); })];
            case 228:
                _35.sent();
                _35.label = 229;
            case 229: return [3 /*break*/, 231];
            case 230:
                e_37 = _35.sent();
                console.error("Failed to add admin message", e_37);
                return [3 /*break*/, 231];
            case 231:
                pendingLogins.delete(userId);
                return [2 /*return*/, ctx.reply("Murojaatingiz imkon qadar tezroq ko‘rib chiqiladi va sizga javob beriladi.")];
            case 232:
                if (!(pending.step === "edit_menu_content")) return [3 /*break*/, 234];
                targetMenu = pending.targetMenu;
                pendingLogins.delete(userId);
                customMenuTexts.set(targetMenu, userText);
                _2 = (_1 = ctx).reply;
                _3 = ["\u2705 <b>\"".concat(targetMenu, "\"</b> menyusi matni muvaffaqiyatli va tezroq yangilandi!\n\nEndi foydalanuvchilar ushbu menyuni bosganda shu ma'lumotni olishadi.")];
                _23 = {
                    parse_mode: "HTML"
                };
                _24 = {};
                return [4 /*yield*/, getKeyboard("admin", userId, true)];
            case 233: return [2 /*return*/, _2.apply(_1, _3.concat([(_23.reply_markup = (_24.keyboard = _35.sent(),
                        _24.resize_keyboard = true,
                        _24),
                        _23)]))];
            case 234:
                if (!(pending.step === "password")) return [3 /*break*/, 292];
                email = pending.email;
                password = userText;
                pendingLogins.delete(userId);
                ctx.reply("Ma'lumotlar tekshirilmoqda, iltimos kuting...");
                _35.label = 235;
            case 235:
                _35.trys.push([235, 290, , 291]);
                return [4 /*yield*/, fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=".concat(firebaseApiKey), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: email, password: password, returnSecureToken: true }),
                    })];
            case 236:
                authRes = _35.sent();
                return [4 /*yield*/, authRes.json()];
            case 237:
                authData = _35.sent();
                if (!(authData.error && email.toLowerCase().endsWith("@student.uz"))) return [3 /*break*/, 242];
                teacherFallbackEmail = email.split("@")[0] + "@teacher.uz";
                _35.label = 238;
            case 238:
                _35.trys.push([238, 241, , 242]);
                return [4 /*yield*/, fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=".concat(firebaseApiKey), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: teacherFallbackEmail, password: password, returnSecureToken: true }),
                    })];
            case 239:
                retryRes = _35.sent();
                return [4 /*yield*/, retryRes.json()];
            case 240:
                retryData = _35.sent();
                if (retryData && !retryData.error) {
                    authData = retryData;
                    email = teacherFallbackEmail;
                }
                return [3 /*break*/, 242];
            case 241:
                retryErr_1 = _35.sent();
                return [3 /*break*/, 242];
            case 242:
                if (!authData.error) return [3 /*break*/, 247];
                if (!(email.toLowerCase() === "elyorbek@admin.uz" && password === "1104aA")) return [3 /*break*/, 247];
                _35.label = 243;
            case 243:
                _35.trys.push([243, 246, , 247]);
                return [4 /*yield*/, fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=".concat(firebaseApiKey), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: email, password: password, returnSecureToken: true }),
                    })];
            case 244:
                signUpRes = _35.sent();
                return [4 /*yield*/, signUpRes.json()];
            case 245:
                signUpData = _35.sent();
                if (signUpData && !signUpData.error) {
                    authData = signUpData;
                }
                return [3 /*break*/, 247];
            case 246:
                signUpErr_1 = _35.sent();
                return [3 /*break*/, 247];
            case 247:
                if (authData.error) {
                    return [2 /*return*/, ctx.reply("Email (Login) yoki parol noto'g'ri. Qaytadan urinish uchun ishchi oynada 🔑 Kirish ni bering.")];
                }
                uid = authData.localId;
                displayName = email;
                role = "student";
                departmentName = "Kiritilmagan";
                groupName = "Kiritilmagan";
                _35.label = 248;
            case 248:
                _35.trys.push([248, 287, , 289]);
                docId = "";
                uData = null;
                _35.label = 249;
            case 249:
                _35.trys.push([249, 251, , 252]);
                return [4 /*yield*/, getDoc(doc(db, "users", uid))];
            case 250:
                mainDocSnap = _35.sent();
                if (mainDocSnap.exists()) {
                    docId = mainDocSnap.id;
                    uData = mainDocSnap.data();
                }
                return [3 /*break*/, 252];
            case 251:
                e_38 = _35.sent();
                return [3 /*break*/, 252];
            case 252:
                if (!!uData) return [3 /*break*/, 256];
                _35.label = 253;
            case 253:
                _35.trys.push([253, 255, , 256]);
                uQuery = query(collection(db, "users"), where("uid", "==", uid));
                return [4 /*yield*/, getDocs(uQuery)];
            case 254:
                snap = _35.sent();
                if (!snap.empty) {
                    docId = snap.docs[0].id;
                    uData = snap.docs[0].data();
                }
                return [3 /*break*/, 256];
            case 255:
                e_39 = _35.sent();
                return [3 /*break*/, 256];
            case 256:
                if (!!uData) return [3 /*break*/, 260];
                _35.label = 257;
            case 257:
                _35.trys.push([257, 259, , 260]);
                emailQuery = query(collection(db, "users"), where("email", "==", email));
                return [4 /*yield*/, getDocs(emailQuery)];
            case 258:
                snapEmail = _35.sent();
                if (!snapEmail.empty) {
                    docId = snapEmail.docs[0].id;
                    uData = snapEmail.docs[0].data();
                }
                return [3 /*break*/, 260];
            case 259:
                e_40 = _35.sent();
                return [3 /*break*/, 260];
            case 260:
                if (!!uData) return [3 /*break*/, 265];
                _35.label = 261;
            case 261:
                _35.trys.push([261, 264, , 265]);
                parts = email.split("@");
                if (!(parts.length > 0)) return [3 /*break*/, 263];
                loginVal = parts[0];
                loginQuery = query(collection(db, "users"), where("login", "==", loginVal));
                return [4 /*yield*/, getDocs(loginQuery)];
            case 262:
                snapLogin = _35.sent();
                if (!snapLogin.empty) {
                    docId = snapLogin.docs[0].id;
                    uData = snapLogin.docs[0].data();
                }
                _35.label = 263;
            case 263: return [3 /*break*/, 265];
            case 264:
                e_41 = _35.sent();
                return [3 /*break*/, 265];
            case 265:
                _35.trys.push([265, 270, , 271]);
                uQuery = query(collection(db, "users"), where("uid", "==", uid));
                return [4 /*yield*/, getDocs(uQuery)];
            case 266:
                snap = _35.sent();
                if (!!snap.empty) return [3 /*break*/, 267];
                docId = snap.docs[0].id;
                uData = snap.docs[0].data();
                return [3 /*break*/, 269];
            case 267:
                docRef = doc(db, "users", uid);
                return [4 /*yield*/, getDoc(docRef)];
            case 268:
                docSnap = _35.sent();
                if (docSnap.exists()) {
                    docId = docSnap.id;
                    uData = docSnap.data();
                }
                _35.label = 269;
            case 269:
                if (uData && uData.role === 'admin') {
                    registerAdminId(userId);
                }
                return [3 /*break*/, 271];
            case 270:
                e_42 = _35.sent();
                return [3 /*break*/, 271];
            case 271:
                if (!!uData) return [3 /*break*/, 275];
                if (!(email.toLowerCase() === "elyorbek@admin.uz")) return [3 /*break*/, 275];
                adminDocParams = {
                    uid: uid,
                    displayName: "Elyorbek (Admin)",
                    firstName: "Elyorbek",
                    lastName: "Admin",
                    email: email,
                    login: "Elyorbek",
                    role: "admin",
                    createdAt: serverTimestamp(),
                    telegramId: userId,
                };
                _35.label = 272;
            case 272:
                _35.trys.push([272, 274, , 275]);
                return [4 /*yield*/, setDoc(doc(db, "users", uid), adminDocParams)];
            case 273:
                _35.sent();
                docId = uid;
                registerAdminId(userId);
                uData = adminDocParams;
                return [3 /*break*/, 275];
            case 274:
                err_20 = _35.sent();
                console.error("Failed to create admin doc:", err_20);
                return [3 /*break*/, 275];
            case 275:
                if (!uData) return [3 /*break*/, 284];
                displayName = uData.displayName || email;
                role = uData.role || "student";
                departmentName = uData.departmentName || "Kiritilmagan";
                groupName = uData.groupName || "Kiritilmagan";
                // Enforce admin privileges for Elyorbek regardless of underlying doc contents
                if (email.toLowerCase().trim() === "elyorbek@admin.uz") {
                    role = "admin";
                }
                _35.label = 276;
            case 276:
                _35.trys.push([276, 283, , 284]);
                return [4 /*yield*/, getDocs(query(collection(db, "users"), where("telegramId", "==", userId)))];
            case 277:
                existTgDocs = _35.sent();
                _4 = 0, _5 = existTgDocs.docs;
                _35.label = 278;
            case 278:
                if (!(_4 < _5.length)) return [3 /*break*/, 281];
                tgDoc = _5[_4];
                if (!(tgDoc.id !== docId)) return [3 /*break*/, 280];
                return [4 /*yield*/, updateDoc(doc(db, "users", tgDoc.id), { telegramId: deleteField() })];
            case 279:
                _35.sent();
                _35.label = 280;
            case 280:
                _4++;
                return [3 /*break*/, 278];
            case 281: return [4 /*yield*/, updateDoc(doc(db, "users", docId), {
                    telegramId: userId,
                    role: role
                })];
            case 282:
                _35.sent();
                return [3 /*break*/, 284];
            case 283:
                e_43 = _35.sent();
                return [3 /*break*/, 284];
            case 284:
                encodedCreds = encodeURIComponent(Buffer.from("".concat(email, ":").concat(password)).toString("base64"));
                autoLoginUrl = "".concat(APP_URL, "/login?auto=").concat(encodedCreds);
                replyMsg = "\u2705 <b>Akkauntingiz muvaffaqiyatli ulandi!</b>\n\n";
                replyMsg += formatProfileInfo(uData, role, displayName, email);
                replyMsg += "\n\nEndi \"Tizimga kirish\" tugmasi orqali o'z profilingizga to'g'ridan to'g'ri o'tishingiz mumkin!";
                authedUsers.set(userId, { uid: uid, displayName: displayName, role: role, email: email, docId: docId });
                userBirthDate = uData ? uData.birthDate : null;
                if (isTodayBirthday(userBirthDate)) {
                    bdayGreetings = "\uD83C\uDF89\u2728 <b>TUG'ILGAN KUNINGIZ BILAN TABRIKLAYMIZ!</b> \u2728\uD83C\uDF89\n" +
                        "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                        "Hurmatli <b>".concat(displayName, "</b>! \uD83C\uDF82\n\n") +
                        "Sizni bugungi tavallud ayomingiz bilan chin qalbimizdan muborakbod etamiz! \uD83C\uDF38\n" +
                        "Sizga sihat-salomatlik, baxt-saodat, uzoq umr va o'qish hamda ish faoliyatingizda ulkan muvaffaqiyatlar tilaymiz! \uD83C\uDF1F\n\n" +
                        "Tizimimiz siz bilan birga ekanligidan mamnun va faxrlanadi! \uD83D\uDE0A\uD83C\uDF88\n" +
                        "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501";
                    ctx.reply(bdayGreetings, { parse_mode: "HTML" }).catch(function () { });
                }
                return [4 /*yield*/, addDoc(collection(db, "admin_notifications"), {
                        text: "Yangi tizimga ulanish (Telegram orqali):\n\uD83D\uDC64 F.I.SH: ".concat(displayName, "\n\uD83D\uDEE1 Profil: ").concat(role.toUpperCase(), "\n\uD83D\uDCE7 Email: ").concat(email),
                        timestamp: serverTimestamp(),
                    })];
            case 285:
                _35.sent();
                ctx.reply(replyMsg, {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📱 Tizimga kirish", web_app: { url: "https://aiedutizim.vercel.app/login" } }],
                        ],
                    },
                });
                _7 = (_6 = ctx).reply;
                _8 = ["Asosiy menyu yangilandi:"];
                _25 = {};
                _26 = {};
                return [4 /*yield*/, getKeyboard(role, userId, true)];
            case 286:
                _7.apply(_6, _8.concat([(_25.reply_markup = (_26.keyboard = _35.sent(),
                        _26.resize_keyboard = true,
                        _26),
                        _25)]));
                return [3 /*break*/, 289];
            case 287:
                e_44 = _35.sent();
                console.error("Login verification post-auth checking error:", e_44);
                encodedCreds = encodeURIComponent(Buffer.from("".concat(email, ":").concat(password)).toString("base64"));
                autoLoginUrl = "".concat(APP_URL, "/login?auto=").concat(encodedCreds);
                derivedRole = "student";
                if (email.toLowerCase().includes("@admin")) {
                    derivedRole = "admin";
                }
                else if (email.toLowerCase().includes("@teacher")) {
                    derivedRole = "teacher";
                }
                authedUsers.set(userId, {
                    uid: uid,
                    displayName: email,
                    role: derivedRole,
                    email: email,
                    docId: "",
                });
                ctx.reply("\u2705 Akkauntingiz muvaffaqiyatli ulandi!\n\n\uD83D\uDC64 Email: ".concat(email, "\n\uD83D\uDEE1 Profil: ").concat(derivedRole.toUpperCase(), "\n\nEndi \"Tizimga kirish\" tugmasi orqali o'z profilingizga to'g'ridan to'g'ri o'tishingiz mumkin!"), {
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
                });
                _10 = (_9 = ctx).reply;
                _11 = ["Asosiy menyu yangilandi:"];
                _27 = {};
                _28 = {};
                return [4 /*yield*/, getKeyboard(derivedRole, userId, true)];
            case 288:
                _10.apply(_9, _11.concat([(_27.reply_markup = (_28.keyboard = _35.sent(),
                        _28.resize_keyboard = true,
                        _28),
                        _27)]));
                return [3 /*break*/, 289];
            case 289: return [3 /*break*/, 291];
            case 290:
                err_21 = _35.sent();
                ctx.reply("Xatolik yuz berdi: " + err_21.message);
                return [3 /*break*/, 291];
            case 291: return [2 /*return*/];
            case 292:
                lowered = userText.toLowerCase().trim();
                if (authed && (authed.role === "admin" || authed.role === "subadmin" || authed.role === "teacher")) {
                    if (lowered === "yordamchi" || lowered === "shogird") {
                        return [2 /*return*/, ctx.reply("Labbay, Ustoz! Sizga qanday yordam bera olaman?")];
                    }
                }
                if (!aiAssistantActiveUsers.get(userId)) return [3 /*break*/, 316];
                promptMsg_1 = null;
                intervalId = null;
                _35.label = 293;
            case 293:
                _35.trys.push([293, 310, , 315]);
                _35.label = 294;
            case 294:
                _35.trys.push([294, 296, , 297]);
                return [4 /*yield*/, ctx.reply("Bajarilmoqda...")];
            case 295:
                promptMsg_1 = _35.sent();
                return [3 /*break*/, 297];
            case 296:
                e_45 = _35.sent();
                return [3 /*break*/, 297];
            case 297:
                dotCount_1 = 3;
                if (promptMsg_1) {
                    intervalId = setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var dots, e_49;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    dotCount_1 = (dotCount_1 % 3) + 1; // 1, 2, 3
                                    dots = ".".repeat(dotCount_1);
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, ctx.telegram.editMessageText(ctx.chat.id, promptMsg_1.message_id, undefined, "Bajarilmoqda".concat(dots))];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_49 = _a.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }, 1000);
                }
                uName = authed
                    ? authed.displayName
                    : ctx.from.first_name || "Foydalanuvchi";
                isAdmin = authed
                    ? authed.role === "admin" || authed.role === "teacher"
                    : false;
                return [4 /*yield*/, getSystemContextInfo()];
            case 298:
                sysContext = _35.sent();
                functionResponses = [];
                lastFunctionCall = null;
                lastModelParts = null;
                loopCount = 0;
                finalReply = "";
                _loop_2 = function () {
                    var res, data, fnName, fnArgs, executionResult, studentsCount, teachersCount, staffCount, adminsCount, tgUsersCount, _36, sSnap, tSnap, stSnap, aSnap, tgSnap, e_50, statsCachePath, cachedStats, totalUsers, q, usersSnap, list, todayStr_1, usersSnap, p, t_1, testsSnap, target, pin, questions, pText, genRes, txt, e_51, courseRef, genUid, uSnap, sentCount, _37, _38, uDoc, cSnap, list, e_52, data;
                    return __generator(this, function (_39) {
                        switch (_39.label) {
                            case 0:
                                loopCount++;
                                return [4 /*yield*/, fetch(getApiUrl("/api/chat"), {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            prompt: userText,
                                            history: [],
                                            userName: uName,
                                            isAdminMode: isAdmin,
                                            systemContext: sysContext,
                                            functionResponses: functionResponses.length > 0 ? functionResponses : undefined,
                                            lastFunctionCall: lastFunctionCall || undefined,
                                            lastModelParts: lastModelParts || undefined,
                                        }),
                                    })];
                            case 1:
                                res = _39.sent();
                                if (!res.ok) return [3 /*break*/, 42];
                                return [4 /*yield*/, res.json()];
                            case 2:
                                data = _39.sent();
                                if (!data.isFunctionCall) return [3 /*break*/, 40];
                                fnName = data.functionCall.name;
                                fnArgs = data.functionCall.args;
                                lastFunctionCall = data.functionCall;
                                lastModelParts = data.modelParts;
                                executionResult = "";
                                _39.label = 3;
                            case 3:
                                _39.trys.push([3, 38, , 39]);
                                if (!(fnName === "getSystemStats")) return [3 /*break*/, 8];
                                studentsCount = 0;
                                teachersCount = 0;
                                staffCount = 0;
                                adminsCount = 0;
                                tgUsersCount = 0;
                                _39.label = 4;
                            case 4:
                                _39.trys.push([4, 6, , 7]);
                                return [4 /*yield*/, Promise.all([
                                        getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
                                        getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
                                        getCountFromServer(query(collection(db, "users"), where("role", "==", "staff"))),
                                        getCountFromServer(query(collection(db, "users"), where("role", "==", "admin"))),
                                        getCountFromServer(collection(db, "telegram_users"))
                                    ])];
                            case 5:
                                _36 = _39.sent(), sSnap = _36[0], tSnap = _36[1], stSnap = _36[2], aSnap = _36[3], tgSnap = _36[4];
                                studentsCount = sSnap.data().count;
                                teachersCount = tSnap.data().count;
                                staffCount = stSnap.data().count;
                                adminsCount = aSnap.data().count;
                                tgUsersCount = tgSnap.data().count;
                                return [3 /*break*/, 7];
                            case 6:
                                e_50 = _39.sent();
                                statsCachePath = path.join(process.cwd(), "telegram_stats_cache.json");
                                if (fs.existsSync(statsCachePath)) {
                                    try {
                                        cachedStats = JSON.parse(fs.readFileSync(statsCachePath, "utf8"));
                                        adminsCount = cachedStats.adminsCount || 0;
                                        teachersCount = cachedStats.teachersCount || 0;
                                        staffCount = cachedStats.staffCount || 0;
                                        studentsCount = cachedStats.studentsCount || 0;
                                        tgUsersCount = cachedStats.tgUsersCount || 0;
                                    }
                                    catch (err) { }
                                }
                                return [3 /*break*/, 7];
                            case 7:
                                totalUsers = adminsCount + teachersCount + staffCount + studentsCount;
                                executionResult = "Tizim foydalanuvchilari statistikasi (Bazada):\n" +
                                    "- Adminlar: ".concat(adminsCount, " ta\n") +
                                    "- Tashkilotlar: ".concat(teachersCount, " ta\n") +
                                    "- Xodimlar: ".concat(staffCount, " ta\n") +
                                    "- Talabalar: ".concat(studentsCount, " ta\n") +
                                    "- Jami foydalanuvchilar: ".concat(totalUsers, " ta\n\n") +
                                    "- Telegram bot faol foydalanuvchilari (start bosganlar): ".concat(tgUsersCount, " ta.");
                                return [3 /*break*/, 37];
                            case 8:
                                if (!(fnName === "getUsersList")) return [3 /*break*/, 10];
                                q = collection(db, "users");
                                if (fnArgs.role) {
                                    q = query(q, where("role", "==", fnArgs.role));
                                }
                                return [4 /*yield*/, getDocs(q)];
                            case 9:
                                usersSnap = _39.sent();
                                list = usersSnap.docs
                                    .map(function (d) {
                                    var dt = d.data();
                                    return dt.displayName + " (" + dt.role + ")";
                                })
                                    .join(", ");
                                executionResult = "Topilgan foydalanuvchilar ro'yxati: ".concat(list || "Topilmadi");
                                return [3 /*break*/, 37];
                            case 10:
                                if (!(fnName === "checkBirthdays")) return [3 /*break*/, 12];
                                todayStr_1 = new Date()
                                    .toISOString()
                                    .split("T")[0]
                                    .substring(5);
                                return [4 /*yield*/, getDocs(query(collection(db, "users"), limit(500)))];
                            case 11:
                                usersSnap = _39.sent();
                                p = usersSnap.docs
                                    .map(function (d) { return d.data(); })
                                    .filter(function (dt) { return dt.birthDate && dt.birthDate.endsWith(todayStr_1); });
                                if (p.length > 0) {
                                    executionResult =
                                        "Bugun tug'ilgan kuni bo'lganlar: " +
                                            p.map(function (dt) { return dt.displayName; }).join(", ");
                                }
                                else {
                                    executionResult =
                                        "Bugun tug'ilgan kuni bo'lgan foydalanuvchilar topilmadi.";
                                }
                                return [3 /*break*/, 37];
                            case 12:
                                if (!(fnName === "publishTest")) return [3 /*break*/, 17];
                                t_1 = (fnArgs.testTitle || "").toLowerCase();
                                return [4 /*yield*/, getDocs(collection(db, "tests"))];
                            case 13:
                                testsSnap = _39.sent();
                                target = testsSnap.docs.find(function (d) {
                                    var ddata = d.data();
                                    return ((ddata.title && ddata.title.toLowerCase().includes(t_1)) ||
                                        (ddata.courseName &&
                                            ddata.courseName.toLowerCase().includes(t_1)));
                                });
                                if (!target) return [3 /*break*/, 15];
                                return [4 /*yield*/, updateDoc(doc(db, "tests", target.id), {
                                        isPublished: true,
                                    })];
                            case 14:
                                _39.sent();
                                executionResult = "\"".concat(target.data().title, "\" nomli test muvaffaqiyatli publish qilindi!");
                                return [3 /*break*/, 16];
                            case 15:
                                executionResult = "\"".concat(fnArgs.testTitle, "\" mavzusidagi test topilmadi.");
                                _39.label = 16;
                            case 16: return [3 /*break*/, 37];
                            case 17:
                                if (!(fnName === "createQuizizz")) return [3 /*break*/, 23];
                                pin = Math.floor(100000 + Math.random() * 900000).toString();
                                questions = [];
                                _39.label = 18;
                            case 18:
                                _39.trys.push([18, 20, , 21]);
                                pText = fnArgs.context
                                    ? "Matn: ".concat(fnArgs.context, ". Mavzu: ").concat(fnArgs.title, ". 5 ta JSON test yarat.")
                                    : "Mavzu: ".concat(fnArgs.title, ". 5 ta JSON test yarat.");
                                return [4 /*yield*/, generateContentWithRotation({
                                        model: "gemini-3.1-flash-lite",
                                        contents: [{ role: "user", parts: [{ text: pText }] }],
                                        config: {
                                            systemInstruction: 'Faqat JSON formatda array qaytar:\n[{ "question": "savol", "options": ["A","B","C","D"], "correctAnswer": "To\'g\'ri javob matni" }]. Boshqa text qo\'shma.',
                                            temperature: 0.7,
                                        },
                                    })];
                            case 19:
                                genRes = _39.sent();
                                try {
                                    txt = genRes.text || "[]";
                                    txt = txt
                                        .replace(/```json/g, "")
                                        .replace(/```/g, "")
                                        .trim();
                                    questions = JSON.parse(txt);
                                }
                                catch (e) { }
                                return [3 /*break*/, 21];
                            case 20:
                                e_51 = _39.sent();
                                return [3 /*break*/, 21];
                            case 21: return [4 /*yield*/, addDoc(collection(db, "quiz_history"), {
                                    teacherId: authed ? authed.uid : "ADMIN",
                                    pin: pin,
                                    title: fnArgs.title,
                                    context: fnArgs.context || "",
                                    questions: questions,
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp(),
                                })];
                            case 22:
                                _39.sent();
                                executionResult = "\"".concat(fnArgs.title, "\" mavzusida PIN: ").concat(pin, " va ").concat(questions.length, " ta savol bo'lgan quiz yaratildi.");
                                return [3 /*break*/, 37];
                            case 23:
                                if (!(fnName === "createCourse")) return [3 /*break*/, 25];
                                return [4 /*yield*/, addDoc(collection(db, "courses"), {
                                        title: fnArgs.title,
                                        description: fnArgs.description || "Ushbu fan bo'yicha darslar va materiallar turkumi.",
                                        category: fnArgs.category || "Dasturlash",
                                        createdAt: serverTimestamp(),
                                        creatorId: authed ? authed.uid : "ADMIN",
                                        lessons: [],
                                        quizzes: []
                                    })];
                            case 24:
                                courseRef = _39.sent();
                                executionResult = "\"".concat(fnArgs.title, "\" nomli yangi kurs/fan muvaffaqiyatli yaratildi. Hujjat ID: ").concat(courseRef.id);
                                return [3 /*break*/, 37];
                            case 25:
                                if (!(fnName === "addSystemUser")) return [3 /*break*/, 27];
                                genUid = "ai_" + Math.floor(100000 + Math.random() * 900000).toString();
                                return [4 /*yield*/, setDoc(doc(db, "users", genUid), {
                                        uid: genUid,
                                        displayName: fnArgs.displayName,
                                        email: fnArgs.email,
                                        password: fnArgs.password,
                                        role: fnArgs.role || "student",
                                        createdAt: serverTimestamp(),
                                    })];
                            case 26:
                                _39.sent();
                                executionResult = "Yangi foydalanuvchi muvaffaqiyatli qo'shildi!\n\uD83D\uDC64 Ismi: ".concat(fnArgs.displayName, "\n\uD83D\uDCE7 Emaili: ").concat(fnArgs.email, "\n\uD83D\uDD11 Paroli: ").concat(fnArgs.password, "\n\uD83D\uDEE1 Roli: ").concat((fnArgs.role || "student").toUpperCase());
                                return [3 /*break*/, 37];
                            case 27:
                                if (!(fnName === "createSystemNotification")) return [3 /*break*/, 34];
                                return [4 /*yield*/, getDocs(collection(db, "users"))];
                            case 28:
                                uSnap = _39.sent();
                                sentCount = 0;
                                _37 = 0, _38 = uSnap.docs;
                                _39.label = 29;
                            case 29:
                                if (!(_37 < _38.length)) return [3 /*break*/, 32];
                                uDoc = _38[_37];
                                return [4 /*yield*/, addDoc(collection(db, "messages"), {
                                        text: fnArgs.text,
                                        senderId: "SYSTEM_ADMIN",
                                        senderName: "Tizim ma'muriyati",
                                        receiverId: uDoc.id,
                                        createdAt: serverTimestamp(),
                                        isRead: false
                                    })];
                            case 30:
                                _39.sent();
                                sentCount++;
                                _39.label = 31;
                            case 31:
                                _37++;
                                return [3 /*break*/, 29];
                            case 32: return [4 /*yield*/, addDoc(collection(db, "admin_notifications"), {
                                    text: "Tizimda e'lon tarqatildi: \"".concat(fnArgs.text, "\" (").concat(sentCount, " ta foydalanuvchiga)"),
                                    timestamp: serverTimestamp()
                                })];
                            case 33:
                                _39.sent();
                                executionResult = "Barcha ".concat(sentCount, " ta foydalanuvchiga \"").concat(fnArgs.text, "\" mavzusidagi e'lon muvaffaqiyatli yuborildi.");
                                return [3 /*break*/, 37];
                            case 34:
                                if (!(fnName === "getCoursesList")) return [3 /*break*/, 36];
                                return [4 /*yield*/, getDocs(collection(db, "courses"))];
                            case 35:
                                cSnap = _39.sent();
                                list = cSnap.docs.map(function (d) {
                                    var c = d.data();
                                    return "- **".concat(c.title, "** (").concat(c.category || "Boshqa", "): ").concat(c.description || "Tavsif yo'q");
                                }).join("\n");
                                executionResult = "Platformadagi darslar/kurslar ro'yxati:\n".concat(list || "Hozircha fanlar kiritilmagan.");
                                return [3 /*break*/, 37];
                            case 36:
                                executionResult = "Noma'lum funksiya chaqirildi.";
                                _39.label = 37;
                            case 37: return [3 /*break*/, 39];
                            case 38:
                                e_52 = _39.sent();
                                executionResult = "Funksiya bajarilishida xatolik: " + e_52.message;
                                return [3 /*break*/, 39];
                            case 39:
                                functionResponses = [{ name: fnName, response: executionResult }];
                                return [2 /*return*/, "continue"];
                            case 40:
                                finalReply = data.reply;
                                return [2 /*return*/, "break"];
                            case 41: return [3 /*break*/, 44];
                            case 42: return [4 /*yield*/, res.json().catch(function () { return null; })];
                            case 43:
                                data = _39.sent();
                                finalReply = (data === null || data === void 0 ? void 0 : data.error) || "AI javob qaytara olmadi.";
                                return [2 /*return*/, "break"];
                            case 44: return [2 /*return*/];
                        }
                    });
                };
                _35.label = 299;
            case 299:
                if (!(loopCount < 3)) return [3 /*break*/, 301];
                return [5 /*yield**/, _loop_2()];
            case 300:
                state_1 = _35.sent();
                if (state_1 === "break")
                    return [3 /*break*/, 301];
                return [3 /*break*/, 299];
            case 301:
                if (intervalId) {
                    clearInterval(intervalId);
                }
                if (!promptMsg_1) return [3 /*break*/, 305];
                _35.label = 302;
            case 302:
                _35.trys.push([302, 304, , 305]);
                return [4 /*yield*/, ctx.telegram.deleteMessage(ctx.chat.id, promptMsg_1.message_id)];
            case 303:
                _35.sent();
                return [3 /*break*/, 305];
            case 304:
                e_46 = _35.sent();
                return [3 /*break*/, 305];
            case 305:
                if (!finalReply) return [3 /*break*/, 309];
                if (!isAdmin) return [3 /*break*/, 307];
                borderReply = "\uD83D\uDC51 <b>USTOZ - ADMIN TIZIMI AI YORDAMCHISI</b>\n" +
                    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                    "".concat(mdToHtml(finalReply), "\n") +
                    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
                    "\uD83D\uDCA1 <i>Tizim administratorlari uchun cheksiz AI xizmati faollashtirilgan.</i>";
                return [4 /*yield*/, ctx.reply(borderReply, { parse_mode: "HTML" })];
            case 306:
                _35.sent();
                return [3 /*break*/, 309];
            case 307: return [4 /*yield*/, ctx.reply(mdToHtml(finalReply), { parse_mode: "HTML" })];
            case 308:
                _35.sent();
                _35.label = 309;
            case 309: return [3 /*break*/, 315];
            case 310:
                e_47 = _35.sent();
                if (intervalId) {
                    clearInterval(intervalId);
                }
                if (!promptMsg_1) return [3 /*break*/, 314];
                _35.label = 311;
            case 311:
                _35.trys.push([311, 313, , 314]);
                return [4 /*yield*/, ctx.telegram.deleteMessage(ctx.chat.id, promptMsg_1.message_id)];
            case 312:
                _35.sent();
                return [3 /*break*/, 314];
            case 313:
                e_48 = _35.sent();
                return [3 /*break*/, 314];
            case 314:
                ctx.reply("Server bilan bog'lanishda xatolik yuz berdi.");
                return [3 /*break*/, 315];
            case 315: return [3 /*break*/, 317];
            case 316:
                // If text is sent and AI mode is off, and no previous handler caught it
                if (chatType === "private" && !userText.startsWith("/") && !userWizardStates.has(userId) && !aiAssistantActiveUsers.has(userId)) {
                    return [2 /*return*/, ctx.reply("📋 Kerakli xizmatni menyudan tanlang.")];
                }
                _35.label = 317;
            case 317: return [2 /*return*/];
        }
    });
}); });
bot.on("my_chat_member", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, chatType, chatTitle;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                chatType = (_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.type;
                chatTitle = ((_c = ctx.chat) === null || _c === void 0 ? void 0 : _c.title) || "";
                console.log("[Telegram] Bot added to/updated in chat ".concat(chatId, " of type ").concat(chatType));
                if (!chatId) return [3 /*break*/, 2];
                return [4 /*yield*/, registerTelegramId(chatId, chatType, chatTitle, {
                        first_name: ((_d = ctx.from) === null || _d === void 0 ? void 0 : _d.first_name) || "",
                        last_name: ((_e = ctx.from) === null || _e === void 0 ? void 0 : _e.last_name) || "",
                        username: ((_f = ctx.from) === null || _f === void 0 ? void 0 : _f.username) || "",
                    })];
            case 1:
                _g.sent();
                _g.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
bot.on("new_chat_members", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, chatType, chatTitle;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                chatType = (_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.type;
                chatTitle = ((_c = ctx.chat) === null || _c === void 0 ? void 0 : _c.title) || "";
                console.log("[Telegram] New members in chat ".concat(chatId));
                if (!chatId) return [3 /*break*/, 2];
                return [4 /*yield*/, registerTelegramId(chatId, chatType, chatTitle, {
                        first_name: ((_d = ctx.from) === null || _d === void 0 ? void 0 : _d.first_name) || "",
                        last_name: ((_e = ctx.from) === null || _e === void 0 ? void 0 : _e.last_name) || "",
                        username: ((_f = ctx.from) === null || _f === void 0 ? void 0 : _f.username) || "",
                    })];
            case 1:
                _g.sent();
                _g.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
bot.on("group_chat_created", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId) return [3 /*break*/, 2];
                return [4 /*yield*/, registerTelegramId(chatId, "group", ((_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.title) || "", {})];
            case 1:
                _c.sent();
                _c.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
bot.on("supergroup_chat_created", function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId) return [3 /*break*/, 2];
                return [4 /*yield*/, registerTelegramId(chatId, "supergroup", ((_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.title) || "", {})];
            case 1:
                _c.sent();
                _c.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
// Global error handler for Telegraf execution pipelines
bot.catch(function (err, ctx) {
    var _a;
    console.error("[Telegraf Global Catch] Fault in processing update ".concat(((_a = ctx.update) === null || _a === void 0 ? void 0 : _a.update_id) || "unknown", ":"), err);
    try {
        ctx.reply("⚠️ Tizimda kichik uzilish kuzatildi. Iltimos, xabaringizni qaytadan yuboring.").catch(function () { });
    }
    catch (replyErr) { }
});
// Active self-referential ping sequence to prevent Cloud Run idle state (scale-to-zero prevention)
function startSelfPing() {
    var url = process.env.APP_URL || "http://127.0.0.1:3000";
    console.log("[Self-Ping Check] Initialized with target host: ".concat(url));
    // Dynamic self-request loop to trick Cloud Run container lifecycles
    setInterval(function () {
        var targetUrl = "".concat(url.replace(/\/$/, ""), "/api/health");
        console.log("[Self-Ping] Triggering HTTP ping to refresh container: ".concat(targetUrl));
        fetch(targetUrl)
            .then(function (res) {
            console.log("[Self-Ping] Ping responded with status: ".concat(res.status));
        })
            .catch(function (err) {
            console.warn("[Self-Ping] Ping request could not connect (can be ignored on local environment):", err.message || err);
        });
    }, 120000); // Trigger every 2 minutes
}
export function launchBot() {
    return __awaiter(this, void 0, void 0, function () {
        // Resilient Telegram bot launcher with automatic self-healing, conflict retry and reconnect loops
        function triggerBotLaunch() {
            var _this = this;
            console.log("[Telegram] Attempting bot startup...");
            bot
                .launch()
                .then(function () {
                console.log("[Telegram] Bot started polling successfully.");
                bot.telegram
                    .setChatMenuButton({
                    menuButton: {
                        type: "web_app",
                        text: "📱 Tizimga kirish",
                        web_app: { url: "https://aiedutizim.vercel.app/login" },
                    },
                })
                    .catch(function (e) { return console.error("Could not set menu button", e); });
                // One-time broadcast of restart & new version info to all registered telegram bot users
                if (db) {
                    var checkFile_1 = path.join(process.cwd(), "telegram_broadcast_restart_done.json");
                    if (!fs.existsSync(checkFile_1)) {
                        getDocs(collection(db, "telegram_users"))
                            .then(function (snap) { return __awaiter(_this, void 0, void 0, function () {
                            var userDocs, broadcastText, i, uDoc, userId, sendErr_2, msg;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.log("[Broadcast] Found ".concat(snap.size, " telegram users to notify about the new restart and version."));
                                        userDocs = snap.docs;
                                        broadcastText = "\uD83D\uDE80 <b>AI YORDAMCHI ISHGA TUSHIRILDI!</b>\n\n" +
                                            "AIEDUTIZIM platformasining Telegram boti yanada aqllashdi! Endilikda menyularingizda yangi <b>\uD83E\uDD16 AI Yordamchi</b> bo'limi paydo bo'ldi.\n\n" +
                                            "\uD83E\uDD16 <b>Yangi imkoniyatlar:</b>\n" +
                                            "\u2022 \uD83D\uDCAC <b>Har qanday savolga javob:</b> Matematika, dasturlash, tarix yoki til o'rganish \u2014 istalgan mavzuda savol bering va AI yordamida aniq javob oling.\n" +
                                            "\u2022 \uD83D\uDDBC <b>Rasm va fayllar tahlili:</b> Menga rasm yoki fayl yuboring, men uni ko'rib chiqaman va savollaringizga javob beraman.\n" +
                                            "\u2022 \uD83C\uDF10 <b>Saytda ham mavjud:</b> Endi platforma saytidagi chat-widget orqali ham ham Admin bilan, ham AI yordamchi bilan alohida muloqot qilishingiz mumkin.\n\n" +
                                            "\uD83D\uDCA1 <i>Yangi menyuni ko'rish uchun /start buyrug'ini yuboring va \"\uD83E\uDD16 AI yordamchi\" tugmasini bosing!</i>";
                                        i = 0;
                                        _a.label = 1;
                                    case 1:
                                        if (!(i < userDocs.length)) return [3 /*break*/, 8];
                                        uDoc = userDocs[i];
                                        userId = Number(uDoc.id);
                                        if (!(!isNaN(userId) && userId > 0)) return [3 /*break*/, 7];
                                        _a.label = 2;
                                    case 2:
                                        _a.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, bot.telegram.sendMessage(userId, broadcastText, {
                                                parse_mode: "HTML"
                                            })];
                                    case 3:
                                        _a.sent();
                                        console.log("[Broadcast] Successfully sent restart notice to user: ".concat(userId));
                                        return [3 /*break*/, 5];
                                    case 4:
                                        sendErr_2 = _a.sent();
                                        msg = (sendErr_2 === null || sendErr_2 === void 0 ? void 0 : sendErr_2.message) || "";
                                        if (!msg.includes("chat not found") &&
                                            !msg.includes("bot was blocked") &&
                                            !msg.includes("bot was kicked") &&
                                            !msg.includes("user is deactivated")) {
                                            console.error("[Broadcast] Failed to send restart notice to ".concat(userId, ":"), sendErr_2);
                                        }
                                        return [3 /*break*/, 5];
                                    case 5: 
                                    // Safe rate limiting delay of 100ms
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                                    case 6:
                                        // Safe rate limiting delay of 100ms
                                        _a.sent();
                                        _a.label = 7;
                                    case 7:
                                        i++;
                                        return [3 /*break*/, 1];
                                    case 8:
                                        fs.writeFileSync(checkFile_1, JSON.stringify({ completedAt: new Date().toISOString() }, null, 2), "utf8");
                                        console.log("[Broadcast] One-time restart notification process completed.");
                                        return [2 /*return*/];
                                }
                            });
                        }); })
                            .catch(function (err) {
                            console.error("[Broadcast] Failed to read telegram_users collection for restart notice:", err);
                        });
                    }
                }
            })
                .catch(function (err) {
                var _a;
                if (((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.error_code) === 409) {
                    console.warn("[Telegram] Conflict (409): Another instance is already polling. Will retry launch in 15 seconds...");
                    setTimeout(triggerBotLaunch, 15000);
                }
                else {
                    console.error("[Telegram] Launch failed with error:", err.message || err, "Retrying in 5 seconds...");
                    setTimeout(triggerBotLaunch, 5000);
                }
            });
        }
        var startupTime_1, isAdminLogsInit_1, isInit_1, testIsInit_1, certIsInit_1, checkBirthdaysTimer;
        var _this = this;
        return __generator(this, function (_a) {
            if (globalT.botLaunched) {
                console.log("[Telegram] Bot already launched on this process. Skipping double launch.");
                return [2 /*return*/];
            }
            globalT.botLaunched = true;
            fetchTelegramUsersCount();
            bot.telegram
                .setMyDescription("**Assalomu alaykum! AIEDUTIZIM platformasining telegram botiga xush kelibsiz!**\n\n🎓 AIEDUTIZIM — tashkilotlar, o‘qituvchilar va talabalar uchun mo‘ljallangan yagona markazlashgan raqamli ta'lim platformasi bo‘lib, zamonaviy ta'lim jarayonlarini samarali boshqarish imkonini beradi.")
                .catch(function (e) { return console.error("Could not set bot description", e); });
            // Initialize scale-to-zero prevention
            startSelfPing();
            if (db) {
                startupTime_1 = Date.now();
                isAdminLogsInit_1 = false;
                onSnapshot(query(collection(db, "admin_notifications"), orderBy("timestamp", "desc"), limit(10)), function (snapshot) { return __awaiter(_this, void 0, void 0, function () {
                    var newChanges, _loop_3, _i, newChanges_1, change;
                    var _this = this;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (!isAdminLogsInit_1) {
                                    isAdminLogsInit_1 = true;
                                    return [2 /*return*/];
                                }
                                newChanges = snapshot
                                    .docChanges()
                                    .filter(function (c) { return c.type === "added"; });
                                _loop_3 = function (change) {
                                    var data, msgTime, alreadyProcessed_1, adminSnap, e_53;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0:
                                                data = change.doc.data();
                                                msgTime = ((_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toMillis)
                                                    ? data.timestamp.toMillis()
                                                    : Date.now();
                                                // Ignore if older than 5s from startup
                                                if (msgTime < startupTime_1 - 5000)
                                                    return [2 /*return*/, "continue"];
                                                _c.label = 1;
                                            case 1:
                                                _c.trys.push([1, 4, , 5]);
                                                alreadyProcessed_1 = false;
                                                return [4 /*yield*/, runTransaction(db, function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                                                        var docRef, s;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    docRef = doc(db, "admin_notifications", change.doc.id);
                                                                    return [4 /*yield*/, transaction.get(docRef)];
                                                                case 1:
                                                                    s = _a.sent();
                                                                    if (!s.exists() || s.data().processedByBot) {
                                                                        alreadyProcessed_1 = true;
                                                                        return [2 /*return*/];
                                                                    }
                                                                    transaction.update(docRef, { processedByBot: true });
                                                                    return [2 /*return*/];
                                                            }
                                                        });
                                                    }); })];
                                            case 2:
                                                _c.sent();
                                                if (alreadyProcessed_1)
                                                    return [2 /*return*/, "continue"];
                                                return [4 /*yield*/, getDocs(query(collection(db, "users"), where("role", "==", "admin")))];
                                            case 3:
                                                adminSnap = _c.sent();
                                                adminSnap.forEach(function (d) {
                                                    var uData = d.data();
                                                    if (uData.telegramId) {
                                                        bot.telegram
                                                            .sendMessage(Number(uData.telegramId), "\uD83D\uDEA8 Tizim xabari:\n\n".concat(data.text))
                                                            .catch(function () { });
                                                    }
                                                });
                                                return [3 /*break*/, 5];
                                            case 4:
                                                e_53 = _c.sent();
                                                return [3 /*break*/, 5];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                };
                                _i = 0, newChanges_1 = newChanges;
                                _b.label = 1;
                            case 1:
                                if (!(_i < newChanges_1.length)) return [3 /*break*/, 4];
                                change = newChanges_1[_i];
                                return [5 /*yield**/, _loop_3(change)];
                            case 2:
                                _b.sent();
                                _b.label = 3;
                            case 3:
                                _i++;
                                return [3 /*break*/, 1];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, function (error) {
                    var _a;
                    if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))
                        return;
                    console.log("[Telegram] admin_notifications snapshot listener error (quota/network):", error.message || error);
                });
                isInit_1 = false;
                onSnapshot(query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(20)), function (snapshot) { return __awaiter(_this, void 0, void 0, function () {
                    var newChanges, _loop_4, _i, newChanges_2, change;
                    var _this = this;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                console.log("TG onSnapshot triggered. isInit:", isInit_1, "docChanges:", snapshot.docChanges().length);
                                if (!isInit_1) {
                                    isInit_1 = true;
                                    return [2 /*return*/];
                                }
                                newChanges = snapshot
                                    .docChanges()
                                    .filter(function (c) { return c.type === "added"; });
                                _loop_4 = function (change) {
                                    var mData, msgTime, alreadyProcessed_2, recipients_2, localAdminIds_2, _d, localAdminIds_1, aId, adminSnap, e_54, tgIdStr, uSnap, senderTgIdStr, senderTgId, sentAlerts, _e, recipients_1, uData, tgId, senderDetails, opts, messageText, isRecipientAdmin, sentMsg, e_55, e_56;
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0:
                                                mData = change.doc.data();
                                                msgTime = ((_a = mData.timestamp) === null || _a === void 0 ? void 0 : _a.toMillis)
                                                    ? mData.timestamp.toMillis()
                                                    : Date.now();
                                                if (msgTime < startupTime_1 - 5000)
                                                    return [2 /*return*/, "continue"]; // safety net for old messages
                                                console.log("New message to process:", mData);
                                                if (!(mData.senderId !== mData.receiverId)) return [3 /*break*/, 22];
                                                _f.label = 1;
                                            case 1:
                                                _f.trys.push([1, 21, , 22]);
                                                alreadyProcessed_2 = false;
                                                return [4 /*yield*/, runTransaction(db, function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                                                        var docRef, s;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    docRef = doc(db, "messages", change.doc.id);
                                                                    return [4 /*yield*/, transaction.get(docRef)];
                                                                case 1:
                                                                    s = _a.sent();
                                                                    if (!s.exists() || s.data().processedByBot) {
                                                                        alreadyProcessed_2 = true;
                                                                        return [2 /*return*/];
                                                                    }
                                                                    transaction.update(docRef, { processedByBot: true });
                                                                    return [2 /*return*/];
                                                            }
                                                        });
                                                    }); })];
                                            case 2:
                                                _f.sent();
                                                if (alreadyProcessed_2)
                                                    return [2 /*return*/, "continue"];
                                                recipients_2 = [];
                                                if (!(mData.receiverRole === "admin" || mData.receiverId === "SYSTEM_ADMIN")) return [3 /*break*/, 7];
                                                localAdminIds_2 = getAdminIds();
                                                for (_d = 0, localAdminIds_1 = localAdminIds_2; _d < localAdminIds_1.length; _d++) {
                                                    aId = localAdminIds_1[_d];
                                                    recipients_2.push({ telegramId: aId, role: "admin" });
                                                }
                                                _f.label = 3;
                                            case 3:
                                                _f.trys.push([3, 5, , 6]);
                                                return [4 /*yield*/, getDocs(query(collection(db, "users"), where("role", "==", "admin")))];
                                            case 4:
                                                adminSnap = _f.sent();
                                                adminSnap.forEach(function (d) {
                                                    var data = d.data();
                                                    if (data.telegramId) {
                                                        var idNum_1 = Number(data.telegramId);
                                                        if (!localAdminIds_2.includes(idNum_1) && !recipients_2.some(function (x) { return x.telegramId === idNum_1; })) {
                                                            recipients_2.push(data);
                                                        }
                                                    }
                                                });
                                                return [3 /*break*/, 6];
                                            case 5:
                                                e_54 = _f.sent();
                                                console.warn("[Telegram] users query error (using local fallback is fine):", e_54);
                                                return [3 /*break*/, 6];
                                            case 6: return [3 /*break*/, 10];
                                            case 7:
                                                if (!(mData.receiverId &&
                                                    mData.receiverId !== "SYSTEM_ADMIN")) return [3 /*break*/, 10];
                                                if (!mData.receiverId.startsWith("tg_")) return [3 /*break*/, 8];
                                                tgIdStr = mData.receiverId.replace("tg_", "");
                                                recipients_2.push({
                                                    telegramId: Number(tgIdStr),
                                                    role: "student",
                                                });
                                                return [3 /*break*/, 10];
                                            case 8: return [4 /*yield*/, getDoc(doc(db, "users", mData.receiverId))];
                                            case 9:
                                                uSnap = _f.sent();
                                                if (uSnap.exists())
                                                    recipients_2.push(uSnap.data());
                                                _f.label = 10;
                                            case 10:
                                                senderTgIdStr = ((_b = mData.senderId) === null || _b === void 0 ? void 0 : _b.startsWith("tg_")) ? mData.senderId.replace("tg_", "") : null;
                                                senderTgId = senderTgIdStr ? Number(senderTgIdStr) : (mData.senderTelegramId ? Number(mData.senderTelegramId) : null);
                                                sentAlerts = [];
                                                _e = 0, recipients_1 = recipients_2;
                                                _f.label = 11;
                                            case 11:
                                                if (!(_e < recipients_1.length)) return [3 /*break*/, 18];
                                                uData = recipients_1[_e];
                                                if (!uData.telegramId) return [3 /*break*/, 17];
                                                tgId = Number(uData.telegramId);
                                                // Do not send notification to the message sender themselves
                                                if (senderTgId && tgId === senderTgId) {
                                                    return [3 /*break*/, 17];
                                                }
                                                senderDetails = "";
                                                if (mData.senderName) {
                                                    senderDetails = " (".concat(mData.senderName, ")");
                                                }
                                                opts = {};
                                                messageText = "";
                                                isRecipientAdmin = uData.role === "admin" || uData.role === "teacher";
                                                if (isRecipientAdmin) {
                                                    opts.reply_markup = {
                                                        inline_keyboard: [
                                                            [
                                                                {
                                                                    text: "✍️ Javob yozish",
                                                                    callback_data: "reply_".concat(mData.senderId),
                                                                },
                                                            ],
                                                        ],
                                                    };
                                                    messageText = "\uD83D\uDCE8 Yangi xabar".concat(senderDetails, ":\n\n").concat(mData.text);
                                                }
                                                else {
                                                    messageText = "\uD83D\uDCE8 Sizga Admindan xabar keldi:\n\n".concat(mData.text);
                                                }
                                                if (!isRecipientAdmin) return [3 /*break*/, 16];
                                                _f.label = 12;
                                            case 12:
                                                _f.trys.push([12, 14, , 15]);
                                                return [4 /*yield*/, bot.telegram.sendMessage(tgId, messageText, opts)];
                                            case 13:
                                                sentMsg = _f.sent();
                                                if (sentMsg) {
                                                    sentAlerts.push({ chatId: tgId, messageId: sentMsg.message_id });
                                                }
                                                return [3 /*break*/, 15];
                                            case 14:
                                                e_55 = _f.sent();
                                                return [3 /*break*/, 15];
                                            case 15: return [3 /*break*/, 17];
                                            case 16:
                                                bot.telegram
                                                    .sendMessage(tgId, messageText, opts)
                                                    .catch(function (e) {
                                                    var msg = e.message || "";
                                                    if (!msg.includes("chat not found") && !msg.includes("bot was blocked") && !msg.includes("bot was kicked") && !msg.includes("user is deactivated")) {
                                                        console.error("TG MSG: ", e);
                                                    }
                                                });
                                                _f.label = 17;
                                            case 17:
                                                _e++;
                                                return [3 /*break*/, 11];
                                            case 18:
                                                if (!(sentAlerts.length > 0)) return [3 /*break*/, 20];
                                                return [4 /*yield*/, updateDoc(doc(db, "messages", change.doc.id), {
                                                        tgSentMessages: sentAlerts
                                                    }).catch(function () { })];
                                            case 19:
                                                _f.sent();
                                                _f.label = 20;
                                            case 20: return [3 /*break*/, 22];
                                            case 21:
                                                e_56 = _f.sent();
                                                console.error("Error sending TG msg", e_56);
                                                return [3 /*break*/, 22];
                                            case 22: return [2 /*return*/];
                                        }
                                    });
                                };
                                _i = 0, newChanges_2 = newChanges;
                                _c.label = 1;
                            case 1:
                                if (!(_i < newChanges_2.length)) return [3 /*break*/, 4];
                                change = newChanges_2[_i];
                                return [5 /*yield**/, _loop_4(change)];
                            case 2:
                                _c.sent();
                                _c.label = 3;
                            case 3:
                                _i++;
                                return [3 /*break*/, 1];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, function (error) {
                    var _a;
                    if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))
                        return;
                    console.log("[Telegram] messages snapshot listener error (quota/network):", error.message || error);
                });
                testIsInit_1 = false;
                onSnapshot(query(collection(db, "tests"), orderBy("createdAt", "desc"), limit(10)), function (snapshot) { return __awaiter(_this, void 0, void 0, function () {
                    var newChanges, _loop_5, _i, newChanges_3, change;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!testIsInit_1) {
                                    testIsInit_1 = true;
                                    return [2 /*return*/];
                                }
                                newChanges = snapshot
                                    .docChanges()
                                    .filter(function (c) { return c.type === "added"; });
                                _loop_5 = function (change) {
                                    var tData, alreadyProcessed_3, uQuery, allStudentsSnap, e_57;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                tData = change.doc.data();
                                                if (!tData.isPublished) return [3 /*break*/, 5];
                                                _b.label = 1;
                                            case 1:
                                                _b.trys.push([1, 4, , 5]);
                                                alreadyProcessed_3 = false;
                                                return [4 /*yield*/, runTransaction(db, function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                                                        var docRef, s;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    docRef = doc(db, "tests", change.doc.id);
                                                                    return [4 /*yield*/, transaction.get(docRef)];
                                                                case 1:
                                                                    s = _a.sent();
                                                                    if (!s.exists() || s.data().processedByBot) {
                                                                        alreadyProcessed_3 = true;
                                                                        return [2 /*return*/];
                                                                    }
                                                                    transaction.update(docRef, { processedByBot: true });
                                                                    return [2 /*return*/];
                                                            }
                                                        });
                                                    }); })];
                                            case 2:
                                                _b.sent();
                                                if (alreadyProcessed_3)
                                                    return [2 /*return*/, "continue"];
                                                uQuery = query(collection(db, "users"), where("role", "==", "student"));
                                                return [4 /*yield*/, getDocs(uQuery)];
                                            case 3:
                                                allStudentsSnap = _b.sent();
                                                allStudentsSnap.forEach(function (userDoc) {
                                                    var uData = userDoc.data();
                                                    if (uData.telegramId) {
                                                        var isMatched = (tData.groupIds && tData.groupIds.includes(uData.groupId)) ||
                                                            (tData.departmentIds &&
                                                                tData.departmentIds.includes(uData.departmentId));
                                                        if (isMatched) {
                                                            bot.telegram
                                                                .sendMessage(Number(uData.telegramId), "\uD83D\uDCDD Sizning guruhingiz/yo'nalishingiz uchun yangi test(topshiriq) yuklandi: \"".concat(tData.title, "\". Tizimga kirib ishlashingiz mumkin!"))
                                                                .catch(function (e) {
                                                                var msg = e.message || "";
                                                                if (!msg.includes("chat not found") && !msg.includes("bot was blocked") && !msg.includes("bot was kicked") && !msg.includes("user is deactivated")) {
                                                                    console.error("TG MSG Test Notif: ", e);
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                                return [3 /*break*/, 5];
                                            case 4:
                                                e_57 = _b.sent();
                                                console.error("Test notification error:", e_57);
                                                return [3 /*break*/, 5];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                };
                                _i = 0, newChanges_3 = newChanges;
                                _a.label = 1;
                            case 1:
                                if (!(_i < newChanges_3.length)) return [3 /*break*/, 4];
                                change = newChanges_3[_i];
                                return [5 /*yield**/, _loop_5(change)];
                            case 2:
                                _a.sent();
                                _a.label = 3;
                            case 3:
                                _i++;
                                return [3 /*break*/, 1];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, function (error) {
                    var _a;
                    if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))
                        return;
                    console.log("[Telegram] tests snapshot listener error (quota/network):", error.message || error);
                });
                certIsInit_1 = false;
                onSnapshot(query(collection(db, "certificates"), orderBy("createdAt", "desc"), limit(10)), function (snapshot) { return __awaiter(_this, void 0, void 0, function () {
                    var newChanges, _loop_6, _i, newChanges_4, change;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!certIsInit_1) {
                                    certIsInit_1 = true;
                                    return [2 /*return*/];
                                }
                                newChanges = snapshot
                                    .docChanges()
                                    .filter(function (c) { return c.type === "added"; });
                                _loop_6 = function (change) {
                                    var cert, alreadyProcessed_4, uSnap, uData, msg, err_22;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                cert = change.doc.data();
                                                if (!(cert.studentId && cert.studentName)) return [3 /*break*/, 5];
                                                _b.label = 1;
                                            case 1:
                                                _b.trys.push([1, 4, , 5]);
                                                alreadyProcessed_4 = false;
                                                return [4 /*yield*/, runTransaction(db, function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                                                        var docRef, s;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    docRef = doc(db, "certificates", change.doc.id);
                                                                    return [4 /*yield*/, transaction.get(docRef)];
                                                                case 1:
                                                                    s = _a.sent();
                                                                    if (!s.exists() || s.data().processedByBot) {
                                                                        alreadyProcessed_4 = true;
                                                                        return [2 /*return*/];
                                                                    }
                                                                    transaction.update(docRef, { processedByBot: true });
                                                                    return [2 /*return*/];
                                                            }
                                                        });
                                                    }); })];
                                            case 2:
                                                _b.sent();
                                                if (alreadyProcessed_4)
                                                    return [2 /*return*/, "continue"];
                                                return [4 /*yield*/, getDoc(doc(db, "users", cert.studentId))];
                                            case 3:
                                                uSnap = _b.sent();
                                                if (uSnap.exists()) {
                                                    uData = uSnap.data();
                                                    if (uData.telegramId) {
                                                        msg = "\uD83C\uDF89 Tabriklaymiz, ".concat(uData.displayName, "!!!\n\nSiz \"").concat(cert.courseName || cert.title, "\" bo'yicha muvaffaqiyatli o'tib, yangi sertifikatni qo'lga kiritdingiz! \uD83C\uDFC6\n\nBu sizning tinimsiz mehnatingiz va izlanishlaringiz samarasidir. Tizimga kirib \"Sertifikatlar\" bo'limidan maxsus sertifikatingizni ko'rib olishingiz mumkin.");
                                                        bot.telegram
                                                            .sendMessage(Number(uData.telegramId), msg)
                                                            .catch(function (e) {
                                                            var errMsg = e.message || "";
                                                            if (!errMsg.includes("chat not found") && !errMsg.includes("bot was blocked") && !errMsg.includes("bot was kicked") && !errMsg.includes("user is deactivated")) {
                                                                console.error("TG MSG Cert Notif: ", e);
                                                            }
                                                        });
                                                    }
                                                }
                                                return [3 /*break*/, 5];
                                            case 4:
                                                err_22 = _b.sent();
                                                return [3 /*break*/, 5];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                };
                                _i = 0, newChanges_4 = newChanges;
                                _a.label = 1;
                            case 1:
                                if (!(_i < newChanges_4.length)) return [3 /*break*/, 4];
                                change = newChanges_4[_i];
                                return [5 /*yield**/, _loop_6(change)];
                            case 2:
                                _a.sent();
                                _a.label = 3;
                            case 3:
                                _i++;
                                return [3 /*break*/, 1];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, function (error) {
                    var _a;
                    if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes("Quota"))
                        return;
                    console.log("[Telegram] certificates snapshot listener error (quota/network):", error.message || error);
                });
                checkBirthdaysTimer = function () {
                    var todayStr = new Date().toISOString().split("T")[0].substring(5); // MM-DD
                    getDocs(query(collection(db, "users"), limit(500)))
                        .then(function (snap) {
                        snap.forEach(function (d) {
                            var dt = d.data();
                            if (dt.telegramId &&
                                dt.birthDate &&
                                dt.birthDate.endsWith(todayStr)) {
                                if (dt.lastBirthdayGreeting !== todayStr) {
                                    updateDoc(doc(db, "users", d.id), {
                                        lastBirthdayGreeting: todayStr,
                                    });
                                    var bMsg = "\uD83C\uDF82 Tug'ilgan kuningiz muborak bo'lsin, ".concat(dt.displayName, "!\n\nAIEDUTIZIM jamoasi sizga mustahkam sog'liq, bitmas-tuganmas g'ayrat va o'quv ishlaringizda ulkan yutuqlar tilaydi! Har doim eng yuqori marralarga erishib yuring! \uD83C\uDF89 Omad yor bo'lsin!");
                                    bot.telegram
                                        .sendMessage(Number(dt.telegramId), bMsg)
                                        .catch(function (e) {
                                        var errMsg = e.message || "";
                                        if (!errMsg.includes("chat not found") && !errMsg.includes("bot was blocked") && !errMsg.includes("bot was kicked") && !errMsg.includes("user is deactivated")) {
                                            console.error("TG MSG BDay: ", e);
                                        }
                                    });
                                }
                            }
                        });
                    })
                        .catch(function () { });
                };
                checkBirthdaysTimer();
                setInterval(checkBirthdaysTimer, 24 * 60 * 60 * 1000); // Check once a day
            }
            // Initial trigger start
            triggerBotLaunch();
            // Enable graceful stop
            process.once("SIGINT", function () { return bot.stop("SIGINT"); });
            process.once("SIGTERM", function () { return bot.stop("SIGTERM"); });
            return [2 /*return*/];
        });
    });
}
