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
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import { Type as SDKType } from "@google/genai";
var Type = SDKType || {
    STRING: "STRING",
    NUMBER: "NUMBER",
    INTEGER: "INTEGER",
    BOOLEAN: "BOOLEAN",
    ARRAY: "ARRAY",
    OBJECT: "OBJECT",
};
import { generateContentWithRotation, getGeminiKeysPool, syncGeminiKeysWithFirestore, clearKeysCache } from "./src/lib/gemini";
import { launchBot } from "./telegram";
function parseJSONResponse(text, defaultOutput) {
    if (!text)
        return defaultOutput;
    try {
        var cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        return JSON.parse(cleaned);
    }
    catch (e) {
        console.error("JSON parse error:", e);
        return defaultOutput;
    }
}
function validateKursIshi(content, university, faculty, studentName, advisor, topic) {
    var text = content || "";
    var universityVal = university || "O'zbekiston Milliy Universiteti";
    var facultyVal = faculty || "Amaliy matematika va intellektual texnologiyalar fakulteti";
    var studentVal = studentName || "Toshpo'latov F.H.";
    var advisorVal = advisor || "Dots. Karimov S.A.";
    var topicVal = topic || "Zamonaviy sun'iy intellekt tizimlari";
    var shaharVal = "Toshkent";
    // Replace common placeholders
    text = text
        .replace(/\[Oliy ta'lim muassasasi nomi\]/gi, universityVal)
        .replace(/\[OTM nomi\]/gi, universityVal)
        .replace(/\[OTM\]/gi, universityVal)
        .replace(/\[Fakultet nomi\]/gi, facultyVal)
        .replace(/\[Fakultet\]/gi, facultyVal)
        .replace(/\[Kafedra nomi\]/gi, "Axborot texnologiyalari kafedrasi")
        .replace(/\[Kafedra\]/gi, "Axborot texnologiyalari kafedrasi")
        .replace(/\[Talaba F\.I\.Sh\.\]/gi, studentVal)
        .replace(/\[Talaba\]/gi, studentVal)
        .replace(/\[Ilmiy rahbar F\.I\.Sh\., ilmiy darajasi\]/gi, advisorVal)
        .replace(/\[Ilmiy rahbar F\.I\.Sh\.\]/gi, advisorVal)
        .replace(/\[Ilmiy rahbar\]/gi, advisorVal)
        .replace(/\[Shahar\]/gi, shaharVal)
        .replace(/\[Mavzu\]/gi, topicVal)
        .replace(/\[Yil\]/gi, "2026")
        .replace(/\[Ism Sharif\]/gi, studentVal)
        .replace(/\[F\.I\.Sh\.\]/gi, studentVal)
        .replace(/\[Kafedra mudiri F\.I\.Sh\.\]/gi, "Prof. Alimov A.B.");
    // General unresolved bracket regex check for generic words inside square brackets e.g. [Nomi], but not standard markdown literature links [1]
    var bracketPlaceholderRegex = /\[([^\]\d]{3,50})\]/g;
    text = text.replace(bracketPlaceholderRegex, function (match, p1) {
        var p1Lower = p1.toLowerCase();
        if (p1Lower.includes("otm") || p1Lower.includes("universitet") || p1Lower.includes("institut") || p1Lower.includes("muassasa"))
            return universityVal;
        if (p1Lower.includes("fakultet"))
            return facultyVal;
        if (p1Lower.includes("talaba") || p1Lower.includes("talabasi") || p1Lower.includes("bajaruvchi") || p1Lower.includes("f.i.sh"))
            return studentVal;
        if (p1Lower.includes("rahbar") || p1Lower.includes("maslahatchi") || p1Lower.includes("advisor"))
            return advisorVal;
        if (p1Lower.includes("shahar") || p1Lower.includes("manzil"))
            return shaharVal;
        if (p1Lower.includes("mavzu"))
            return topicVal;
        if (p1Lower.includes("yil") || p1Lower.includes("sana"))
            return "2026";
        return p1;
    });
    // Ensure scientific style on certain colloquial expressions if any sneaked in
    text = text
        .replace(/Menimcha /gi, "Tadqiqotlar shuni ko'rsatadiki, ")
        .replace(/Mening fikrimcha /gi, "Tahlillar natijasida aniqlandiki, ")
        .replace(/buning uchun /gi, "mazkur maqsadga erishish uchun ")
        .replace(/Bu juda qiziqarli mavzu/gi, "Mazkur ilmiy mavzu bugungi kunda dolzarb hisoblanadi")
        .replace(/Ushbu mavzu juda qiziqarli/gi, "Mazkur mavzuning dolzarbligi shundaki")
        .replace(/Bu yaxshi usul/gi, "Mazkur yondashuvning samaradorligi yuqori");
    // Structural checks
    var hasMundarija = /mundarija|reja|content|index/i.test(text);
    var hasKirish = /kirish|introduction/i.test(text);
    var hasXulosa = /xulosa|conclusion/i.test(text);
    var hasAdabiyotlar = /adabiyotlar|adabiyot|bibliography|references|manbalar/i.test(text);
    var hasBoblari = /bob|chapter|1-bob|i bob|i-bob|ii-bob|1\./i.test(text);
    var isValid = true;
    var reason = "";
    if (!hasMundarija) {
        isValid = false;
        reason += "Mundarija bo'limi aniqlanmadi (reja yo'q). ";
    }
    if (!hasKirish) {
        isValid = false;
        reason += "Kirish bo'limi aniqlanmadi (dolzarbligi, maqsadi, obyekti, predmeti kerak). ";
    }
    if (!hasXulosa) {
        isValid = false;
        reason += "Xulosa bo'limi aniqlanmadi. ";
    }
    if (!hasAdabiyotlar) {
        isValid = false;
        reason += "Foydalanilgan adabiyotlar ro'yxati topilmadi (kamida 10-20 ta GOST manbalari). ";
    }
    if (!hasBoblari) {
        isValid = false;
        reason += "Asosiy boblar tuzilishi (Boblar va paragraflar) aniqlanmadi. ";
    }
    return { isValid: isValid, reason: reason, cleanContent: text };
}
export var app = express();
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var PORT, vite, viteServer, distPath_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    PORT = 3000;
                    // Launch the Telegram bot silently in the background
                    if (process.env.VERCEL !== "1") {
                        launchBot();
                    }
                    app.use(express.json({ limit: "10mb" }));
                    app.use(express.urlencoded({ limit: "10mb", extended: true }));
                    app.get("/api/health", function (req, res) {
                        // Log for debugging
                        var keys = Object.keys(process.env).filter(function (k) { return k.includes("GEMINI") || k.includes("API"); });
                        res.json({ status: "ok", keysFound: keys, poolSize: getGeminiKeysPool().length });
                    });
                    // Payment integration placeholder (Click/Payme)
                    app.post("/api/payment/prepare", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, amount, userId, provider;
                        return __generator(this, function (_b) {
                            _a = req.body, amount = _a.amount, userId = _a.userId, provider = _a.provider;
                            // This is where you would call Click/Payme API to get a payment link or prepare a transaction
                            console.log("Preparing ".concat(provider, " payment for user ").concat(userId, ": ").concat(amount, " UZS"));
                            // For now, return a mock success response
                            res.json({
                                status: "success",
                                paymentUrl: "https://aiedutizim.vercel.app/profile",
                                message: "To'lov tayyorlandi. Iltimos, profil sahifasida to'lovni yakunlang."
                            });
                            return [2 /*return*/];
                        });
                    }); });
                    app.post("/api/payment/callback/:provider", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var provider, body;
                        return __generator(this, function (_a) {
                            provider = req.params.provider;
                            body = req.body;
                            console.log("Received ".concat(provider, " payment callback:"), body);
                            // Verify signature, check transaction status, and update user balance in Firestore
                            // This endpoint should be accessible by Click/Payme servers
                            res.json({ status: "ok" });
                            return [2 /*return*/];
                        });
                    }); });
                    app.post("/api/gemini", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, action, topic, count, context, docType, options, keysPool, directKey, MODEL_NAME, countOptions, prompt_1, response, json, err_1, prompt_2, response, json, prompt_3, university, faculty, department, direction, studentName, advisor, pageCount, author, university, direction, author, org, lang, finalJson, attempts, isFullyValid, currentPrompt, response, validation, response, prompt_4, response, json, error_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 20, , 21]);
                                    _a = req.body, action = _a.action, topic = _a.topic, count = _a.count, context = _a.context, docType = _a.docType, options = _a.options;
                                    syncGeminiKeysWithFirestore().catch(function (e) { return console.warn("[API Gemini] Initial sync failed:", e); });
                                    keysPool = getGeminiKeysPool();
                                    if (!(keysPool.length === 0)) return [3 /*break*/, 2];
                                    console.log("[API Gemini] Keys pool is empty. Forcing full reload from environment...");
                                    clearKeysCache();
                                    return [4 /*yield*/, syncGeminiKeysWithFirestore()];
                                case 1:
                                    _b.sent();
                                    keysPool = getGeminiKeysPool();
                                    _b.label = 2;
                                case 2:
                                    if (keysPool.length === 0) {
                                        directKey = process.env.GEMINI_API_KEY;
                                        if (directKey && directKey.length > 5) {
                                            console.log("[API Gemini] Using direct GEMINI_API_KEY fallback.");
                                            keysPool = [directKey];
                                        }
                                        else {
                                            return [2 /*return*/, res.status(500).json({ error: "Gemini API kaliti topilmadi. Iltimos, server sozlamalarini tekshiring." })];
                                        }
                                    }
                                    MODEL_NAME = "gemini-2.5-flash";
                                    if (!(action === "generateDynamicTest")) return [3 /*break*/, 7];
                                    countOptions = (options === null || options === void 0 ? void 0 : options.optionsCount) || 4;
                                    prompt_1 = context
                                        ? "Mavzu: ".concat(topic, "\n              Ushbu matn asosida ").concat(count || 10, " ta o'zbek tilidagi test savollarini yarating. \n              Savollar faqat berilgan matn asosida bo'lishi shart.\n              Natija faqat JSON formatida bo'lsin.\n              Har bir savol ").concat(countOptions, " ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (correctIdx, 0-").concat(countOptions - 1, ") ko'rsatilishi kerak.\n              \n              Berilgan matn:\n              ").concat(context)
                                        : "Mavzu: ".concat(topic, "\n              Ushbu mavzu asosida ").concat(count || 10, " ta o'zbek tilidagi umumiy bilimga asoslangan test savollarini yarating. \n              Natija faqat JSON formatida bo'lsin.\n              Har bir savol ").concat(countOptions, " ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (correctIdx, 0-").concat(countOptions - 1, ") ko'rsatilishi kerak.");
                                    console.log("[API Gemini] Generating test for topic: ".concat(topic, ", count: ").concat(count));
                                    _b.label = 3;
                                case 3:
                                    _b.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, generateContentWithRotation({
                                            model: MODEL_NAME,
                                            contents: prompt_1,
                                            config: {
                                                responseMimeType: "application/json",
                                                responseSchema: {
                                                    type: Type.ARRAY,
                                                    items: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            id: { type: Type.STRING },
                                                            text: { type: Type.STRING },
                                                            options: {
                                                                type: Type.ARRAY,
                                                                items: { type: Type.STRING }
                                                            },
                                                            correctIdx: { type: Type.NUMBER }
                                                        },
                                                        required: ["id", "text", "options", "correctIdx"]
                                                    }
                                                }
                                            }
                                        })];
                                case 4:
                                    response = _b.sent();
                                    if (!response || !response.text) {
                                        throw new Error("AI javob bermadi (Bo'sh matn).");
                                    }
                                    json = parseJSONResponse(response.text, []);
                                    console.log("[API Gemini] Successfully generated ".concat(json.length, " questions."));
                                    return [2 /*return*/, res.json(json)];
                                case 5:
                                    err_1 = _b.sent();
                                    console.error("[API Gemini] Test generation failed: ".concat(err_1.message));
                                    return [2 /*return*/, res.status(500).json({ error: "Test yaratishda xatolik: ".concat(err_1.message) })];
                                case 6: return [3 /*break*/, 19];
                                case 7:
                                    if (!(action === "generatePresentation")) return [3 /*break*/, 9];
                                    prompt_2 = "Mavzu: \"".concat(topic, "\".\n          Siz o'ta professional, premium darajadagi (Canva Premium, Beautiful.ai kabi) taqdimot (presentation) ustasisiz. \n          Ushbu mavzu bo'yicha ").concat(count || 15, " ta slide-dan iborat o'ta vizual, infografikali va mukammal taqdimot rejasini va qisqa, tushunarli matnini o'zbek tilida tayyorlang.\n          \n          QOIDALAR:\n          1. 30% matn, 70% vizual bo'lishi shart. Katta slayd matnga to'lib ketmasin.\n          2. Bir slaydda 5 tadan ortiq bullet point bo'lmasin. Muhim fikrlar qisqa yozilsin.\n          3. Hech qanday \"Rasm uchun joy\" degan matn bo'lmasin. \n          4. AI mavzuni chuqur tahlil qilsin va (SWOT, Diagramma, Arxitektura kabi) o'ziga xos vizual bo'limlarni ham mustaqil qo'shib yuborsin.\n\n          TUZILMA:\n          Taqdimot quyidagi qoliplarga asoslanishi kerak: Titul, Mundarija, Kirish, Asosiy qism, Tahlil, Diagrammalar, Statistikalar, Xulosa, Rahmat.\n          \n          DIZAYN VA LAYOUTLAR:\n          Mavjud layout turlari:\n          - \"cover\" - Titul sahifasi (Asosiy sarlavha, fon)\n          - \"agenda\" - Mundarija\n          - \"content\" - Qisqa matn va ikonka\n          - \"image-left\" - Rasm chapda, matn o'ngda\n          - \"image-right\" - Rasm o'ngda, matn chapda\n          - \"cards\" - Infografika / SmartArt kartochkalari (maqsadlar, etaplar). 3-4 element.\n          - \"chart\" - QuickChart orqali statistika (Pie, Bar, Line, Radar, Donut).\n          - \"summary\" - Yakuniy xulosa va rahmat.\n\n          Slaydga kiritiladigan Icon nomlari (\"iconType\") Inglizcha (masalan: mdi:rocket, mdi:chart-bar, mdi:cogs, mdi:account-group) formatda bo'lsin.\n          Agar layout \"chart\" bo'lsa, \"chartType\" (\"pie\", \"bar\", \"line\", \"radar\", \"doughnut\") va \"chartData\" obyekti berilsin.\n          Agar layout vizual rasm bo'lsa, \"imageKeyword\" qidiruviga aniq inglizcha rasm qidirish tushunchasi berilsin.\n\n          Qaytariladigan JSON tarkibida \"template\" (\"Akademik\", \"Zamonaviy\", \"Minimalistik\", \"Korporativ\" - kelganida shulardan asosiy designni yozing) va ").concat(count || 15, " ta elementdan iborat \"slides\" ro'yxati qaytarilsin. Javob faqat JSON formatida bo'lsin yopiq (markdown code block ni ishlatmasdan).");
                                    return [4 /*yield*/, generateContentWithRotation({
                                            model: MODEL_NAME,
                                            contents: prompt_2,
                                            config: {
                                                responseMimeType: "application/json",
                                                responseSchema: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        template: {
                                                            type: Type.STRING,
                                                            description: "Design template"
                                                        },
                                                        designPlan: {
                                                            type: Type.STRING,
                                                            description: "Design and color planning brief description"
                                                        },
                                                        slides: {
                                                            type: Type.ARRAY,
                                                            items: {
                                                                type: Type.OBJECT,
                                                                properties: {
                                                                    layout: {
                                                                        type: Type.STRING,
                                                                        description: "Slide layout: cover, agenda, content, image-left, image-right, cards, chart, summary"
                                                                    },
                                                                    title: { type: Type.STRING },
                                                                    subtitle: { type: Type.STRING },
                                                                    content: { type: Type.STRING, description: "Qisqa, lo'nda 30% matnli ilmiy-ommabop tushuntirish" },
                                                                    bulletPoints: {
                                                                        type: Type.ARRAY,
                                                                        items: { type: Type.STRING },
                                                                        description: "Maksimal 5 ta nuqta."
                                                                    },
                                                                    imageKeyword: {
                                                                        type: Type.STRING,
                                                                        description: "Inglizcha qidiruv so'zi, masalan: 'server architecture 3d rendering'"
                                                                    },
                                                                    iconType: {
                                                                        type: Type.STRING,
                                                                        description: "Slaydga mos keluvchi Iconify icon nomi: masalan 'mdi:rocket', 'mdi:server', 'mdi:brain'"
                                                                    },
                                                                    chartType: {
                                                                        type: Type.STRING,
                                                                        description: "Faqat layout='chart' bo'lganda: 'pie', 'bar', 'line', 'radar', yoki 'doughnut'"
                                                                    },
                                                                    chartData: {
                                                                        type: Type.ARRAY,
                                                                        items: {
                                                                            type: Type.OBJECT,
                                                                            properties: {
                                                                                label: { type: Type.STRING },
                                                                                value: { type: Type.NUMBER }
                                                                            },
                                                                            required: ["label", "value"]
                                                                        },
                                                                        description: "Statistik malumotlar uchun oddiy diagramma ma'lumotlari"
                                                                    }
                                                                },
                                                                required: ["layout", "title"]
                                                            }
                                                        }
                                                    },
                                                    required: ["template", "slides"]
                                                }
                                            }
                                        })];
                                case 8:
                                    response = _b.sent();
                                    json = parseJSONResponse(response.text, { template: "Zamonaviy", slides: [] });
                                    return [2 /*return*/, res.json(json)];
                                case 9:
                                    if (!(action === "generateDocument")) return [3 /*break*/, 16];
                                    prompt_3 = '';
                                    if (docType === "kurs_ishi") {
                                        university = (options === null || options === void 0 ? void 0 : options.university) || "O'zbekiston Milliy Universiteti";
                                        faculty = (options === null || options === void 0 ? void 0 : options.faculty) || "Amaliy matematika va intellektual texnologiyalar fakulteti";
                                        department = (options === null || options === void 0 ? void 0 : options.department) || "Axborot texnologiyalari kafedrasi";
                                        direction = (options === null || options === void 0 ? void 0 : options.direction) || "Sun'iy intellekt va dasturlash yo'nalishi";
                                        studentName = (options === null || options === void 0 ? void 0 : options.studentName) || "Toshpo'latov F.H.";
                                        advisor = (options === null || options === void 0 ? void 0 : options.advisor) || "Dots. Karimov S.A.";
                                        pageCount = (options === null || options === void 0 ? void 0 : options.pageCount) || "25-30";
                                        prompt_3 = "Siz O'zbekiston oliy ta'lim muassasalari standartlari bo'yicha yuqori saviyadagi, mukammal va akademik \"Kurs ishi\" (Coursework / Term Paper) tayyorlab beruvchi professional ilmiy ekspert-tizimsiz.\n          \n      Mavzu: \"".concat(topic, "\". \n      Tashkiliy ma'lumotlar:\n      - OTM nomi: ").concat(university, "\n      - Fakultet nomi: ").concat(faculty, "\n      - Kafedra nomi: ").concat(department, "\n      - Yo'nalish: ").concat(direction, "\n      - Talaba: ").concat(studentName, "\n      - Ilmiy rahbar: ").concat(advisor, "\n      - Kutilayotgan umumiy hajm: ").concat(pageCount, " sahifa\n\n      Ushbu kurs ishi oddiy referat, blog kabi maqolalar yoki sun'iy intellekt tomonidan yuzaki yozilgan umumiy matn ko'rinishida bo'lmasin!\n\n      QUYIDAGI AKADEMIK VA METODIK STANDARTLARGA QAT'IY RIOYA QILING:\n\n      1. ILMIY USLUB:\n         - To'liq ilmiy va rasmiy uslubda, muassasalar tomonidan qabul qilingan akademik atamalar va chuqur tahlillar bilan yozilsin.\n         - Matnda hech qachon \"Menimcha\", \"Mening fikrimcha\", \"Ushbu mavzu juda qiziqarli\", \"Bu yaxshi usul\", \"Men ko'rib chiqdim\" kabi noakademik va shaxsiy qarashlarni bildiruvchi yengil iboralar ishlatilmasin!\n         - Buning o'rniga faqat akademik jurnallarga xos iboralardan keng foydalaning:\n           * \"Tahlillar natijasida aniqlandiki...\"\n           * \"Tadqiqotlar shuni ko'rsatadiki...\"\n           * \"Mazkur yondashuvning afzalligi...\"\n           * \"Ilmiy manbalar asosida...\"\n           * \"Tajribalar va nazariy qarashlar qiyosiy tahlil qilinganda...\"\n           * \"Zaruriy xulosa va hisoblar ko'rsatadiki...\"\n\n      2. MUKAMMAL AKADEMIK STRUKTURA (Matn har bir bo'lim va sarlavhalarni o'z ichiga olishi shart):\n         - MUNDARIJA: Mavzuga mos mantiqiy boblar va rejani o'z ichiga oladi.\n         - KIRISH: Quyidagi elementlar albatta alohida bandlar ko'rinishida chuqur tahlil qilinib keng yoritilsin:\n           * Mavzuning dolzarbligi (Dolzarblik qismi kamida 2-3 ta pishiq va uzun paragraf bo'lsin)\n           * Tadqiqot maqsadi\n           * Tadqiqot vazifalari\n           * Tadqiqot obyekti\n           * Tadqiqot predmeti\n           * Tadqiqot metodlari\n           * Tadqiqotning amaliy ahamiyati\n         - I BOB: NAZARIY VA METODOLOGIK ASOSLARI. Kamida 2-3 ta paragrafdan iborat bo'lsin. Mavzuning mohiyati, nazariy tushunchalari, ilmiy izohlar va dunyo tajribasi batafsil tahlil qilinsin.\n         - II BOB: AMALIY TAHLIL VA EKSPERIMENTAL NATIJALAR. Kamida 2-3 ta paragrafdan iborat bo'lsin. Amaliy sohadagi muammolar, tahlillar va olingan natijalar to'laqonli yoritilsin.\n         - III BOB: MAZKUR SOHANING RIVOJLANISH ISTIQBOLLARI. Kamida 2 ta paragraf bo'lib, olingan natijalarning kelajakdagi tatbiqi va takomillashtirish yechimlari yozilsin.\n         - XULOSA: Ilmiy jihatdan mustahkam asoslangan, amaliy tavsiyalar bilan pishiq yakunlovchi umumiy xulosa.\n         - FOYDALANILGAN ADABIYOTLAR: Kamida 10 tadan 20 tagacha mukammal davlat tili va xorijiy tillardagi kitoblar, OAK jurnallari va rasmiy ilmiy manbalar ro'yxati (GOST yoki OTM me'yoriga to'liq mos: Muallif, kitob nomi, nashriyot, yil, masalan: 'Karimov A.B. Sun'iy intellekt asoslari. - Toshkent: Fan, 2023. - 128 b.').\n         - ILOVALAR (agar kerak bo'lsa): Amaliy hisob-kitob, kichik dasturiy kod yoki jadval ko'rinishidagi ilova namunasi.\n\n      3. PLACEHOLDER VA FORMAT CHECK:\n         - Matnda \"[OTM]\", \"[Fakultet]\", \"[Talaba]\", \"[Shahar]\", \"[Mavzu]\" kabi to'rtburchak qavsli placeholderlar mutlaqo qoldirilmasin! Ularning o'rniga yuqoridagi haqiqiy ma'lumotlarni ishlating.\n         - Foydalanuvchi ma'lumotlarini matn tarkibiga to'la integratsiya qiling.\n\n      Matnni nihoyatda pishiq, akademik jihatdan eng yuqori baho oladigan darajada, boy va kengaytiruvchi darsliklar hamda mustaqil nazariyaga asoslangan mukammal ilmiy bo'limlar bilan tayyorlang.");
                                    }
                                    else if (false) {
                                        prompt_3 = "Ma'lumotlar: \"".concat(topic, "\". \n     Ushbu ma'lumotlar/mavzu asosida juda mukammal, to'liq, mazmun jihatdan doimiy 25-30 sahifalik ilmiy-tadqiqot darajasidagi \"Kurs ishi\" (Coursework) tayyorlang. O'zbek tilida, rasmiy akademik uslubda yozilishi shart.\n     \n     TARKIBIY QISMI QUYIDAGI TARTIBDA BO'LSIN:\n     1. TITUL VARAQ (NAMUNA):\n        OTM NOMI: [Oliy ta'lim muassasasi nomi]\n        FAKULTET: [Fakultet nomi]\n        KAFEDRA: [Kafedra nomi]\n        KURS ISHI MAVZUSI: \"").concat(topic.toUpperCase(), "\"\n        BAJARDI: [Talaba F.I.Sh.]\n        ILMIY RAHBAR: [Ilmiy rahbar F.I.Sh., ilmiy darajasi]\n        SHAHAR VA YIL: [Shahar] - 2026 (Foydalanuvchi bularni o'zi osongina tahrirlab to'g'irlab olishi mumkin)\n     2. MUNDARIJA (Mavzu darsliklariga mos keladigan rejalar)\n     3. KIRISH (Mavzuning dolzarbligi, obyekti, predmeti, metodlari, maqsad va vazifalari to'liq va keng yoritilgan)\n     4. ASOSIY BOBLAR (Kamida 2-3 ta bob, har bir bobda 1.1, 1.2, 2.1, 2.2 kabi kamida 2 tadan mukammal yozilgan kichik bo'limlar bo'lishi va har biri juda uzun, tahlillar, formulalar, muammolar va yechimlarga boy bo'lishi shart)\n     5. XULOSA VA TAVSIYALAR (Tadqiqot natijalari tahlili asosidagi mustaqil xulosalar)\n     6. FOYDALANILGAN ADABIYOTLAR RO'YXATI (Kamida 10-15 ta ilmiy, rasmiy va zamonaviy adabiyotlar to'liq bibliografik me'yorlarda ro'yxati)\n     \n     Har bir bob va bo'limni o'ta batafsil va batafsil tushuntirishlar bilan, doimiy 25-30 listli (sahifali) akademik hajmga to'liq javob beradigan darajada nihoyatda uzun va qiziqarli yozing.");
                                    }
                                    else if (docType === "tezis") {
                                        author = (options === null || options === void 0 ? void 0 : options.author) || "Muallif";
                                        university = (options === null || options === void 0 ? void 0 : options.university) || "OTM";
                                        direction = (options === null || options === void 0 ? void 0 : options.direction) || "Yo'nalish";
                                        prompt_3 = "Mavzu: \"".concat(topic, "\". Muallif: ").concat(author, ". OTM: ").concat(university, ". Yo'nalish: ").concat(direction, ".\n          Ushbu mavzu asosida mukammal va professional Ilmiy Tezis (Thesis/Abstract) tayyorlang. O'zbek tilida, ilmiy uslubda.\n          Tarkibi:\n          1. Sarlavha (Mavzu nomi)\n          2. Muallif: ").concat(author, "\n          3. Tashkilot: ").concat(university, " (").concat(direction, ")\n          4. Annotatsiya (O'zbek va Ingliz tillarida qisqacha ma'lumot)\n          5. Kalit so'zlar (5-8 ta asosiy ilmiy atama)\n          6. Kirish va O'rganilganlik darajasi\n          7. Asosiy Qism (Metodlar, amaliy natijalar, tahlillar)\n          8. Xulosa (Tadqiqot yakuniy natijalari)\n          9. Foydalanilgan Adabiyotlar ro'yxati (Kamida 3-5 ta asosiy manba)\n          Tezis to'liq va barcha ilmiy me'yorlarga javob beradigan professional darajada yozilsin.");
                                    }
                                    else if (docType === "maqola") {
                                        author = (options === null || options === void 0 ? void 0 : options.author) || "Muallif";
                                        org = (options === null || options === void 0 ? void 0 : options.org) || "Tashkilot";
                                        lang = (options === null || options === void 0 ? void 0 : options.language) || "O'zbek";
                                        prompt_3 = "Mavzu: \"".concat(topic, "\". Muallif: ").concat(author, ". Tashkilot: ").concat(org, ". Til: ").concat(lang, ".\n          Ushbu mavzu asosida nufuzli ilmiy jurnallar (OAK yoki xalqaro Scopus/Web of Science) talablariga mos keladigan professional darajadagi nufuzli ilmiy Maqola yarating. Til: ").concat(lang, ", rasmiy va yuqori ilmiy uslubda.\n          Tarkibi (IMRAD standarti asosida):\n          1. Maqola Sarlavha (Mavzu nomi)\n          2. Muallif(lar) va ishlash/o'qish joyi (Namuna sifatida kiritiladi)\n          3. Annotatsiya (O'zbek tilida) va Abstract (Ingliz tilida, mukammal grammatika bilan)\n          4. Kalit so'zlar / Keywords\n          5. Kirish (Introduction) - Mavzuning dolzarbligi, qo'yilgan masala\n          6. Metodologiya (Research Methodology) - Qo'llanilgan ilmiy uslublar\n          7. Natijalar (Results) - Tadqiqot davomida olingan yangi ilmiy natijalar\n          8. Tahlil va Muhokama (Discussion) - Olingan natijalarning qiyosiy tahlili\n          9. Xulosa (Conclusion) - Yakuniy xulosalar va kelajakdagi tadqiqot yo'nalishlari\n          10. Foydalanilgan Adabiyotlar (References) - Kamida 10 ta xalqaro va milliy ilmiy manbalar\n          Maqola juda batafsil, ilmiy g'oyalarga boy va yuqori saviyada yozilsin.");
                                    }
                                    else if (docType === "cv") {
                                        prompt_3 = "Foydalanuvchi ma'lumotlari:\n          - Ism Familiya: ".concat((options === null || options === void 0 ? void 0 : options.name) || "Kiritilmagan", "\n          - Tug'ilgan sana: ").concat((options === null || options === void 0 ? void 0 : options.birthDate) || "Kiritilmagan", "\n          - Telefon: ").concat((options === null || options === void 0 ? void 0 : options.phone) || "Kiritilmagan", "\n          - Email: ").concat((options === null || options === void 0 ? void 0 : options.email) || "Kiritilmagan", "\n          - Manzil: ").concat((options === null || options === void 0 ? void 0 : options.address) || "Kiritilmagan", "\n          - Ta'lim: ").concat((options === null || options === void 0 ? void 0 : options.edu) || "Kiritilmagan", "\n          - Ish tajribasi: ").concat((options === null || options === void 0 ? void 0 : options.exp) || "Kiritilmagan", "\n          - Ko'nikmalar: ").concat((options === null || options === void 0 ? void 0 : options.skills) || "Kiritilmagan", "\n          - Tillar: ").concat((options === null || options === void 0 ? void 0 : options.languages) || "Kiritilmagan", "\n\n          Ushbu ma'lumotlar asosida professional, zamonaviy va ish beruvchini jalb qiladigan mukammal va to'liq \"CV / Rezyume\" yarating. O'zbek tilida, rasmiy uslubda bo'lishi shart.\n          Hujjat tarkibi:\n          1. Shaxsiy ma'lumotlar (F.I.Sh., aloqa ma'lumotlari sarlavha qismida)\n          2. Objective / Maqsad (Professional maqsad haqida qisqa va pishiq paragraf)\n          3. Ta'lim (Batafsil yoritilgan)\n          4. Ish tajribasi (Vazifalar va yutuqlar bilan)\n          5. Ko'nikmalar (Texnik va yumshoq ko'nikmalar)\n          6. Tillar (Bilish darajalari bilan)\n          7. Qo'shimcha ma'lumotlar (Sertifikatlar, qiziqishlar bo'lsa)\n          Hujjat vizual jihatdan tartibli va professional ko'rinishda bo'lsin.");
                                    }
                                    else if (docType === "dars_ishlanma") {
                                        prompt_3 = "Ma'lumotlar: \"".concat(topic, "\". \n          Ushbu ma'lumotlar asosida zamonaviy dars berish metodlari va ilg'or pedagogik texnologiyalar asosida tayyorlangan mukammal va to'liq \"Dars ishlanmasi\" (Lesson Plan) tayyorlang. O'zbek tilida va pedagogik qoidalarga mos holda yozilishi shart.\n          Tarkibi:\n          1. Umumiy ma'lumotlar (Fan, Mavzu, Sinf yoki Kurs, Dars turi, Dars davomiyligi - Namuna sifatida to'ldirilgan)\n          2. Darsning maqsadi (Ta'limiy, Tarbiyaviy, Rivojlantiruvchi maqsadlar batafsil ko'rsatiladi)\n          3. Kompetensiyalar (Mavzuga doir tayanch va fanga oid kompetensiyalar)\n          4. Jihozlar va Dars metodlari (Ko'rgazmali qurollar, AKT, interaktiv uslublar)\n          5. Darsning borishi / Dars bosqichlari (Tashkiliy qism, o'tilgan mavzuni mustahkamlash, yangi mavzu bayoni - batafsil yondashuv bilan, mustahkamlash bosqichlari)\n          6. Mustahkamlash partiyasi (Mavzu yuzasidan interaktiv savollar, topshiriqlar va keyslar)\n          7. Baholash va Rag'batlantirish (Mezonlar asosida)\n          8. Uyga vazifa (Ijodiy va amaliy topshiriqlar)\n          Dars o'qituvchi va talabalar uchun to'liq yo'riqnoma vazifasini o'taydigan darajada batafsil yozilsin.");
                                    }
                                    else if (docType === "tarjimon") {
                                        prompt_3 = "Ma'lumotlar: \"".concat(topic, "\".\n          Yuqoridagi ma'lumotlarda \"Direction\" (Tarjima yo'nalishi) berilgan. \n          Iltimos, berilgan matnni xalqaro tarjimonlik darajasida, grammatik qoidalarga rioya qilgan holda faqatgina ko'rsatilgan maqsadli tilga tarjima qiling. Qavslarsiz, to'g'ridan to'g'ri tarjimani bering.");
                                    }
                                    else if (docType === 'hisobot') {
                                        prompt_3 = "Mavzu: \"".concat(topic, "\". \n     Birlamchi ma'lumotlar: \"").concat((options === null || options === void 0 ? void 0 : options.context) || '', "\".\n     Ushbu ma'lumotlar asosida mukammal va kengaytirilgan \"Hisobot\" (Report) tayyorlang. O'zbek tilida, rasmiy uslubda bo'lishi shart.\n     Berilgan qilingan/rejalashtirilgan ishlar haqidagi qisqa matnni professional va ilmiy darajaga ko'taring.\n     Javob faqat JSON formatida bo'lsin.");
                                    }
                                    finalJson = {};
                                    if (!(docType === "kurs_ishi")) return [3 /*break*/, 13];
                                    attempts = 0;
                                    isFullyValid = false;
                                    currentPrompt = prompt_3;
                                    _b.label = 10;
                                case 10:
                                    if (!(attempts < 2 && !isFullyValid)) return [3 /*break*/, 12];
                                    console.log("[Kurs Ishi Generation] Attempt ".concat(attempts + 1, " starting..."));
                                    return [4 /*yield*/, generateContentWithRotation({
                                            model: "gemini-3.1-pro-preview",
                                            contents: currentPrompt,
                                            config: {
                                                responseMimeType: "application/json",
                                                responseSchema: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        title: { type: Type.STRING },
                                                        content: { type: Type.STRING, description: "Markdown formatida to'liq matn" }
                                                    },
                                                    required: ["title", "content"]
                                                }
                                            }
                                        })];
                                case 11:
                                    response = _b.sent();
                                    finalJson = parseJSONResponse(response.text, {});
                                    validation = validateKursIshi(finalJson.content, options === null || options === void 0 ? void 0 : options.university, options === null || options === void 0 ? void 0 : options.faculty, options === null || options === void 0 ? void 0 : options.studentName, options === null || options === void 0 ? void 0 : options.advisor, topic);
                                    if (validation.isValid) {
                                        isFullyValid = true;
                                        finalJson.content = validation.cleanContent;
                                        console.log("[Kurs Ishi Generation] Successfully validated and cleared placeholders!");
                                    }
                                    else {
                                        attempts++;
                                        console.warn("[Kurs Ishi Generation Failed Validation] Attempt ".concat(attempts, ": ").concat(validation.reason));
                                        if (attempts >= 2) {
                                            finalJson.content = validation.cleanContent;
                                            return [3 /*break*/, 12];
                                        }
                                        currentPrompt = "".concat(prompt_3, "\n\n\u26A0\uFE0F OLDINGI URINISHDA XATOLAR ANIQLANDI. ILTIMOS QUYIDAGI MUAMMOLARNI TO'LIQ TUZATIB GENERATSIYA QILING:\n").concat(validation.reason, "\nSiz taqdim etayotgan kurs ishi barcha talablarga (Mundarija, Kirish, I BOB, II BOB, Xulosa, Foydalanilgan adabiyotlar) javob bersin va hech qanday to'rtburchak qavsli placeholderlar qolib ketmasin!");
                                    }
                                    return [3 /*break*/, 10];
                                case 12: return [3 /*break*/, 15];
                                case 13: return [4 /*yield*/, generateContentWithRotation({
                                        model: "gemini-3.1-pro-preview", // Use Pro model for higher quality documents
                                        contents: prompt_3,
                                        config: {
                                            responseMimeType: "application/json",
                                            responseSchema: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    title: { type: Type.STRING },
                                                    content: { type: Type.STRING, description: "Markdown formatida to'liq matn" }
                                                },
                                                required: ["title", "content"]
                                            }
                                        }
                                    })];
                                case 14:
                                    response = _b.sent();
                                    finalJson = parseJSONResponse(response.text, {});
                                    _b.label = 15;
                                case 15: return [2 /*return*/, res.json(finalJson)];
                                case 16:
                                    if (!(action === "generateDynamicCourse")) return [3 /*break*/, 18];
                                    prompt_4 = "Mavzu: \"".concat(topic, "\".\n        Ushbu mavzu bo'yicha to'liq kurs rejasini va mazmunini o'zbek tilida yarating.\n        Kurs kamida 4 ta moduldan iborat bo'lsin.\n        Har bir modul uchun: sarlavha (title) va to'liq o'quv kontenti (Markdown formatida) bo'lsin.\n        Javob JSON formatida bo'lsin.");
                                    return [4 /*yield*/, generateContentWithRotation({
                                            model: MODEL_NAME,
                                            contents: prompt_4,
                                            config: {
                                                responseMimeType: "application/json",
                                                responseSchema: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        title: { type: Type.STRING },
                                                        description: { type: Type.STRING },
                                                        modules: {
                                                            type: Type.ARRAY,
                                                            items: {
                                                                type: Type.OBJECT,
                                                                properties: {
                                                                    title: { type: Type.STRING },
                                                                    content: { type: Type.STRING }
                                                                },
                                                                required: ["title", "content"]
                                                            }
                                                        }
                                                    },
                                                    required: ["title", "description", "modules"]
                                                }
                                            }
                                        })];
                                case 17:
                                    response = _b.sent();
                                    json = parseJSONResponse(response.text, {});
                                    return [2 /*return*/, res.json(json)];
                                case 18: return [2 /*return*/, res.status(400).json({ error: "Noma'lum amal" })];
                                case 19: return [3 /*break*/, 21];
                                case 20:
                                    error_1 = _b.sent();
                                    console.error("[Backend Gemini API Error]:", error_1);
                                    return [2 /*return*/, res.status(500).json({ error: error_1.message || "Xatolik yuz berdi" })];
                                case 21: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/raw-gemini", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, prompt_5, model, keysPool, response, error_2;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 3, , 4]);
                                    _a = req.body, prompt_5 = _a.prompt, model = _a.model;
                                    return [4 /*yield*/, syncGeminiKeysWithFirestore()];
                                case 1:
                                    _b.sent();
                                    keysPool = getGeminiKeysPool();
                                    if (keysPool.length === 0) {
                                        return [2 /*return*/, res.status(500).json({ error: "Gemini API kalitlari topilmadi." })];
                                    }
                                    return [4 /*yield*/, generateContentWithRotation({
                                            model: model || "gemini-2.5-flash",
                                            contents: prompt_5
                                        })];
                                case 2:
                                    response = _b.sent();
                                    return [2 /*return*/, res.json({ text: response.text })];
                                case 3:
                                    error_2 = _b.sent();
                                    console.error("[Backend Raw Gemini API Error]:", error_2);
                                    return [2 /*return*/, res.status(500).json({ error: error_2.message || "Barcha kalitlar limiti tugagan bo'lishi mumkin" })];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/chat", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, prompt_6, history_2, userName, isAdminMode, systemContext, functionResponses, lastFunctionCall, lastModelParts, keysPool, systemInstruction_1, reqContents, _i, history_1, msg, textVal, fnParts_1, tools_1, getResponse, response, call, replyText, error_3, errMsg;
                        var _this = this;
                        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
                        return __generator(this, function (_l) {
                            switch (_l.label) {
                                case 0:
                                    _l.trys.push([0, 3, , 4]);
                                    _a = req.body, prompt_6 = _a.prompt, history_2 = _a.history, userName = _a.userName, isAdminMode = _a.isAdminMode, systemContext = _a.systemContext, functionResponses = _a.functionResponses, lastFunctionCall = _a.lastFunctionCall, lastModelParts = _a.lastModelParts;
                                    return [4 /*yield*/, syncGeminiKeysWithFirestore()];
                                case 1:
                                    _l.sent();
                                    keysPool = getGeminiKeysPool();
                                    if (keysPool.length === 0) {
                                        return [2 /*return*/, res.status(500).json({ error: "Gemini API kaliti topilmadi (Serverda sozlanmagan)." })];
                                    }
                                    systemInstruction_1 = "Siz ushbu o'quv platformasining aqlli yordamchisisiz. Siz suhbatlashayotgan foydalanuvchining ismi: ".concat(userName || 'Mehmon', ". Barcha savollarga aniq, to'g'ri va xushmuomalalik bilan o'zbek tilida javob bering, suhbatni boshida uning ismi bilan murojaat qiling.");
                                    if (isAdminMode) {
                                        systemInstruction_1 = "Siz tizim administratorining bosh yordamchisisiz. Administrator ismi: ".concat(userName, ". \nSizda tizimdagi ma'lumotlarni o'qish va ma'lum amallarni bajarish (masalan, foydalanuvchilar sonini bilish, ularning ro'yxatini olish, tug'ilgan kuni bo'lganlarni ko'rish, testlarni faollashtirish, quizlar yaratish) uchun maxsus funksiyalar (tools) mavjud.\nAgar admin tizim yoki boshqa har qanday mavzudagi savol bilan yuzlansa, albatta ushbu savollarga AI orqali eng to'g'ri, to'liq va aniq javoblarni taqdim eting. Bundan tashqari tizim ma'lumotlarini taqdim etishda kerakli funksiyalardan va kontekst ma'lumotlaridan foydalaning. Muloqotda erkin va har xil sohalarda savollarga javob bera olasiz.");
                                    }
                                    else {
                                        systemInstruction_1 += "\nSiz platformaning aqlli virtual yordamchisisiz. Siz ham AIEDUTIZIM platformasi imkoniyatlari, kurslari va darslari haqidagi savollarga javob bera olasiz, ham foydalanuvchi qiziqqan istalgan boshqa mavzudagi (matematika, dasturlash, fizika, tarix, til o'rganish, umumiy savollar va h.k.) har qanday savollarga juda aqlli va foydali javob qaytara olasiz.\n\nTizim imkoniyatlari haqida ma'lumot so'ralsa, quyidagilarni aytib o'ting:\n1. Kurslar: Foydalanuvchilar turli xil kurslarni ko'rishlari va o'rganishlari mumkin.\n2. Testlar va Quizizz: Bilimni sinab ko'rish uchun interaktiv testlar va Quizizz mashqlari mavjud.\n3. Jurnal va Baholar: Talabalar o'z baholarini va o'zlashtirishini kuzatib borishlari mumkin.\n4. Sertifikatlar: Kurslarni muvaffaqiyatli tugatganlarga sertifikatlar beriladi va ularni tekshirish tizimi mavjud.\n5. Chat va Murojaatlar: Foydalanuvchilar adminlar, o'qituvchilar yoki boshqa foydalanuvchilar bilan chat orqali muloqot qilishlari va murojaat qoldirishlari mumkin.\n6. Xizmatlar va Ma'lumotlar: Saytdagi qo'shimcha xizmatlar va yangiliklar bilan tanishish imkoniyati bor.\nAgar foydalanuvchi ma'muriyat (admin) bilan bevosita bog'lanish istagini bildirsa, unga \"Bog'lanish\" sahifasiga o'tishni maslahat bering va ushbu linkni yuboring: /contact .";
                                    }
                                    if (systemContext) {
                                        systemInstruction_1 += "\n\n\u26A0\uFE0F TIZIMDAGI FAQOL VA HAQIQIY MA'LUMOTLAR VA STATISTIKA:\n".concat(systemContext, "\n\nFoydalanuvchi/ma'muriyat so'raganda albatta mutlaqo aniqlik va ishonchlilik bilan ushbu ma'lumotlardan foydalanib javob bering.");
                                    }
                                    reqContents = [];
                                    if (history_2 && Array.isArray(history_2)) {
                                        for (_i = 0, history_1 = history_2; _i < history_1.length; _i++) {
                                            msg = history_1[_i];
                                            if (msg.role === 'user' || msg.role === 'model') {
                                                textVal = "";
                                                if (typeof msg.text === 'string' && msg.text.trim()) {
                                                    textVal = msg.text.trim();
                                                }
                                                else if (msg.parts && Array.isArray(msg.parts) && msg.parts[0]) {
                                                    if (typeof msg.parts[0] === 'string') {
                                                        textVal = msg.parts[0];
                                                    }
                                                    else if (msg.parts[0].text) {
                                                        textVal = msg.parts[0].text;
                                                    }
                                                }
                                                if (textVal) {
                                                    reqContents.push({ role: msg.role, parts: [{ text: textVal }] });
                                                }
                                            }
                                        }
                                    }
                                    if (prompt_6 && prompt_6.trim()) {
                                        reqContents.push({ role: "user", parts: [{ text: prompt_6.trim() }] });
                                    }
                                    if (lastModelParts && Array.isArray(lastModelParts)) {
                                        reqContents.push({ role: "model", parts: lastModelParts });
                                    }
                                    else if (lastFunctionCall) {
                                        reqContents.push({ role: "model", parts: [{ functionCall: lastFunctionCall }] });
                                    }
                                    if (functionResponses && Array.isArray(functionResponses) && functionResponses.length > 0) {
                                        fnParts_1 = [];
                                        functionResponses.forEach(function (r) {
                                            fnParts_1.push({
                                                functionResponse: {
                                                    name: r.name,
                                                    response: {
                                                        result: r.response
                                                    }
                                                }
                                            });
                                        });
                                        reqContents.push({ role: "user", parts: fnParts_1 });
                                    }
                                    tools_1 = [];
                                    if (isAdminMode) {
                                        tools_1.push({
                                            functionDeclarations: [
                                                {
                                                    name: "getSystemStats",
                                                    description: "Tizimdagi joriy faol foydalanuvchilar (talabalar) va umumiy statistikani olish.",
                                                    parameters: { type: Type.OBJECT, properties: {} }
                                                },
                                                {
                                                    name: "getUsersList",
                                                    description: "Tizimdagi barcha foydalanuvchilar ro'yxatini olish. Rol (student, teacher, admin) bo'yicha filter qilish mumkin.",
                                                    parameters: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            role: { type: Type.STRING, description: "Foydalanuvchi roli: student, teacher, admin. Bo'sh bo'lsa barcha foydalanuvchilar." }
                                                        }
                                                    }
                                                },
                                                {
                                                    name: "checkBirthdays",
                                                    description: "Tizimda bugun tug'ilgan kuni bo'lgan foydalanuvchilarni qidirib topish va ro'yxatini olish.",
                                                    parameters: { type: Type.OBJECT, properties: {} }
                                                },
                                                {
                                                    name: "publishTest",
                                                    description: "Yaratilib turgan testni (yoki fanni) barcha uchun yoki ko'rsatilgan yo'nalish/tashkilot uchun ishga tushirish (publikatsiya qilish).",
                                                    parameters: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            testTitle: { type: Type.STRING, description: "Ishga tushirilishi kerak bo'lgan testning nomi yoki qisqacha ta'rifi." }
                                                        },
                                                        required: ["testTitle"]
                                                    }
                                                },
                                                {
                                                    name: "createQuizizz",
                                                    description: "Berilgan mavzu bo'yicha yangi Quizizz testi doirasida savollar yaratish va saqlash.",
                                                    parameters: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            title: { type: Type.STRING, description: "Quizning sarlavhasi / mavzusi." },
                                                            context: { type: Type.STRING, description: "Quiz uchun qisqacha izoh yoki ko'rsatma." },
                                                            count: { type: Type.INTEGER, description: "Savollar soni." }
                                                        },
                                                        required: ["title", "count"]
                                                    }
                                                },
                                                {
                                                    name: "createCourse",
                                                    description: "Yangi dars kursini yoki fanni yaratish va tizimga qo'shish.",
                                                    parameters: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            title: { type: Type.STRING, description: "Kursning nomi / sarlavhasi." },
                                                            description: { type: Type.STRING, description: "Kurs haqida batafsil ma'lumot, o'rganiladigan mavzular." },
                                                            category: { type: Type.STRING, description: "Kategoriya nomi: masalan, Dasturlash, Fizika, Matematika va b." }
                                                        },
                                                        required: ["title"]
                                                    }
                                                },
                                                {
                                                    name: "addSystemUser",
                                                    description: "Yangi foydalanuvchini (talaba, o'qituvchi, xodim) tizimga qo'shish.",
                                                    parameters: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            displayName: { type: Type.STRING, description: "Foydalanuvchining to'liq F.I.SH." },
                                                            email: { type: Type.STRING, description: "Kirish emaili (masalan: farrux@student.uz)." },
                                                            password: { type: Type.STRING, description: "Paroli." },
                                                            role: { type: Type.STRING, description: "Roli: student, teacher, staff, admin." }
                                                        },
                                                        required: ["displayName", "email", "password", "role"]
                                                    }
                                                },
                                                {
                                                    name: "createSystemNotification",
                                                    description: "Tizimda barcha uchun yangi e'lon yoki bildirishnoma yaratish (web appdagi foydalanuvchilarga ko'rinadi).",
                                                    parameters: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            text: { type: Type.STRING, description: "E'lon yoki bildirishnomaning to'liq matni." }
                                                        },
                                                        required: ["text"]
                                                    }
                                                },
                                                {
                                                    name: "getCoursesList",
                                                    description: "Tizimdagi barcha kurslar ro'yxatini va ularni qisqacha tavsiflarini olish.",
                                                    parameters: { type: Type.OBJECT, properties: {} }
                                                }
                                            ]
                                        });
                                    }
                                    getResponse = function (contents) { return __awaiter(_this, void 0, void 0, function () {
                                        var err_2;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 2, , 3]);
                                                    return [4 /*yield*/, generateContentWithRotation({
                                                            model: "gemini-2.5-flash",
                                                            contents: contents,
                                                            config: {
                                                                systemInstruction: systemInstruction_1,
                                                                tools: tools_1.length > 0 ? tools_1 : undefined
                                                            }
                                                        })];
                                                case 1: return [2 /*return*/, _a.sent()];
                                                case 2:
                                                    err_2 = _a.sent();
                                                    throw err_2;
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, getResponse(reqContents)];
                                case 2:
                                    response = _l.sent();
                                    // Check if model asks for a function call
                                    if (response.functionCalls && response.functionCalls.length > 0) {
                                        call = response.functionCalls[0];
                                        return [2 /*return*/, res.json({
                                                isFunctionCall: true,
                                                functionCall: { name: call.name, args: call.args },
                                                modelParts: ((_d = (_c = (_b = response.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) || [{ functionCall: { name: call.name, args: call.args } }]
                                            })];
                                    }
                                    replyText = response.text || "";
                                    if (!replyText && ((_j = (_h = (_g = (_f = (_e = response.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.text)) {
                                        replyText = response.candidates[0].content.parts[0].text;
                                    }
                                    if (!replyText) {
                                        throw new Error("Sun'iy intellektdan bo'sh javob qaytdi. Iltimos, qaytadan urinib ko'ring.");
                                    }
                                    res.json({ reply: replyText });
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_3 = _l.sent();
                                    errMsg = "";
                                    if (error_3 && error_3.message) {
                                        errMsg = error_3.message;
                                    }
                                    else if (typeof error_3 === 'string') {
                                        errMsg = error_3;
                                    }
                                    else {
                                        errMsg = "Noma'lum xato";
                                    }
                                    console.error("[Gemini API Endpoint Error]", ((_k = req.body) === null || _k === void 0 ? void 0 : _k.action) || 'unknown', errMsg, error_3);
                                    if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
                                        errMsg = "API kaliti yaroqsiz. Iltimos, AI Studio sozlamalari orqali to'g'ri Gemini API kalitini o'rnating.";
                                    }
                                    else if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
                                        errMsg = "Hozirda aqlli yordamchimiz biroz band yoki tanaffusda ☕️. Iltimos, bir necha daqiqadan so'ng qayta so'rab ko'ring. Tez orada u sizga bajonidil yordam beradi!";
                                    }
                                    else if (errMsg.includes("503") || errMsg.includes("504")) {
                                        errMsg = "Tarmoq xatosi yoki server o'ta band (API 503). Qayta urinib ko'ring.";
                                    }
                                    res.status(500).json({ error: errMsg, rawError: error_3 ? error_3.toString() : "No details" });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    if (!(process.env.NODE_ENV !== "production")) return [3 /*break*/, 3];
                    return [4 /*yield*/, import("vite")];
                case 1:
                    vite = _a.sent();
                    return [4 /*yield*/, vite.createServer({
                            server: { middlewareMode: true },
                            appType: "spa",
                        })];
                case 2:
                    viteServer = _a.sent();
                    app.use(viteServer.middlewares);
                    return [3 /*break*/, 4];
                case 3:
                    distPath_1 = path.join(process.cwd(), 'dist');
                    app.use(express.static(distPath_1));
                    app.get('*', function (req, res) {
                        res.sendFile(path.join(distPath_1, 'index.html'));
                    });
                    _a.label = 4;
                case 4:
                    // Start listening only if not on Vercel
                    if (process.env.VERCEL !== "1") {
                        app.listen(PORT, "0.0.0.0", function () {
                            console.log("Server running on http://localhost:".concat(PORT));
                        });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Execute startup but catch errors to prevent whole process crash
startServer().catch(function (err) {
    console.error("Startup error:", err);
});
