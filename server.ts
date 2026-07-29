import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { GoogleGenAI, Type as SDKType } from "@google/genai";

const Type = SDKType;
import { generateContentWithRotation, getGeminiKeysPool, syncGeminiKeysWithFirestore, clearKeysCache } from "./src/lib/gemini.js";

const ACADEMIC_PERSONA = `Sen O'zbekiston oliy ta'lim tizimi standartlariga mos "kurs ishi" (course paper) yozuvchi ilmiy-akademik yordamchisan. Foydalanuvchi kiritgan mavzu, universitet nomi, fakultet, kafedra, yo'nalish, talaba F.I.Sh, ilmiy rahbar F.I.Sh kabi ma'lumotlar asosida to'liq, original, ilmiy jihatdan puxta kurs ishi generatsiya qilishing kerak.

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

6. STRUKTURA:
   - Titul varaq (universitet, fakultet, kafedra, "KURS ISHI", mavzu, fan, F.I.Sh talaba/rahbar, shahar-yil)
   - Mundarija (bir marta)
   - Kirish (dolzarblik, muammo, obyekt, predmet, maqsad, vazifalar, ilmiy yangilik, metodlar, baza)
   - I BOB — nazariy asoslar
   - II BOB — amaliy holat tahlili
   - III BOB — takomillashtirish/tavsiyalar
   - Xulosa
   - Ilmiy-amaliy tavsiyalar
   - Foydalanilgan adabiyotlar ro'yxati (turkumlangan, kamida 15-20 manba)

7. USLUB: rasmiy-ilmiy uslub, birinchi shaxsda emas ("biz" yoki betaraf uchinchi shaxs), ortiqcha reklama iboralarisiz, aniq va tekshirilishi mumkin bo'lgan fikrlar bilan.
8. FORMULALAR: Word (.docx) uchun LaTeX ($...$) ishlatmang, Unicode yoki oddiy matn ko'rinishida yozing.`;

import { query as dbQuery } from "./src/lib/db.js";
import { findUserBySystemId, handleClickRequest, handlePaymeRequest } from "./src/lib/serverPayment.js";

function parseJSONResponse(text: string | null | undefined, defaultOutput: any): any {
  if (!text) return defaultOutput;
  try {
    let cleaned = text.trim();
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim();
    
    // Find first and last brackets/braces to extract core JSON
    const firstBracket = cleaned.indexOf('[');
    const firstBrace = cleaned.indexOf('{');
    let start = -1;
    if (firstBracket !== -1 && firstBrace !== -1) {
      start = Math.min(firstBracket, firstBrace);
    } else if (firstBracket !== -1) {
      start = firstBracket;
    } else if (firstBrace !== -1) {
      start = firstBrace;
    }

    const lastBracket = cleaned.lastIndexOf(']');
    const lastBrace = cleaned.lastIndexOf('}');
    const end = Math.max(lastBracket, lastBrace);
    
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error detail:", e);
    console.error("Offending text snippet:", text?.substring(0, 200) + (text && text.length > 200 ? "..." : ""));
    
    // Attempt to fix truncated array of objects
    if (text && text.trim().startsWith('[')) {
      try {
        let partial = text.trim();
        // Find last complete object }
        const lastCompleteObject = partial.lastIndexOf('}');
        if (lastCompleteObject !== -1) {
           const fixed = partial.substring(0, lastCompleteObject + 1) + ']';
           return JSON.parse(fixed.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim());
        }
      } catch (innerE) {
        // Fallback
      }
    }
    
    return defaultOutput;
  }
}

function validateKursIshi(
  content: string,
  university?: string,
  faculty?: string,
  studentName?: string,
  advisor?: string,
  topic?: string
): { isValid: boolean; reason?: string; cleanContent: string } {
  let text = content || "";

  const universityVal = university || "O'zbekiston Milliy Universiteti";
  const facultyVal = faculty || "Amaliy matematika va intellektual texnologiyalar fakulteti";
  const studentVal = studentName || "Toshpo'latov F.H.";
  const advisorVal = advisor || "Dots. Karimov S.A.";
  const topicVal = topic || "Zamonaviy sun'iy intellekt tizimlari";
  const shaharVal = "Toshkent";

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
  const bracketPlaceholderRegex = /\[([^\]\d]{3,50})\]/g;
  text = text.replace(bracketPlaceholderRegex, (match, p1) => {
    const p1Lower = p1.toLowerCase();
    if (p1Lower.includes("otm") || p1Lower.includes("universitet") || p1Lower.includes("institut") || p1Lower.includes("muassasa")) return universityVal;
    if (p1Lower.includes("fakultet")) return facultyVal;
    if (p1Lower.includes("talaba") || p1Lower.includes("talabasi") || p1Lower.includes("bajaruvchi") || p1Lower.includes("f.i.sh")) return studentVal;
    if (p1Lower.includes("rahbar") || p1Lower.includes("maslahatchi") || p1Lower.includes("advisor")) return advisorVal;
    if (p1Lower.includes("shahar") || p1Lower.includes("manzil")) return shaharVal;
    if (p1Lower.includes("mavzu")) return topicVal;
    if (p1Lower.includes("yil") || p1Lower.includes("sana")) return "2026";
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
  const hasMundarija = /mundarija|reja|content|index/i.test(text);
  const hasKirish = /kirish|introduction/i.test(text);
  const hasXulosa = /xulosa|conclusion/i.test(text);
  const hasAdabiyotlar = /adabiyotlar|adabiyot|bibliography|references|manbalar/i.test(text);
  const hasBoblari = /bob|chapter|1-bob|i bob|i-bob|ii-bob|1\./i.test(text);

  let isValid = true;
  let reason = "";

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

  return { isValid, reason, cleanContent: text };
}

async function generateKursIshiMultiStep(topic: string, options: any) {
    const { university, faculty, studentName, advisor } = options;
    const uni = university || "O'zbekiston Milliy Universiteti";
    const fac = faculty || "Amaliy matematika va intellektual texnologiyalar fakulteti";
    const student = studentName || "Toshpo'latov F.H.";
    const adv = advisor || "Dots. Karimov S.A.";

    console.log(`[Kurs Ishi MultiStep] Starting for: ${topic}`);

    const callAi = async (prompt: string, maxTokens = 16384) => {
        const res = await generateContentWithRotation({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
                maxOutputTokens: maxTokens,
                temperature: 0.8,
                topP: 0.95
            }
        });
        return res.text;
    };

    // Step 1: Plan
    const planPrompt = `${ACADEMIC_PERSONA}
    [TASK: KURS_ISHI_REJA]
    Mavzu: "${topic}".
    Mavzu bo'yicha 3 ta bobdan (har bir bobda 2 tadan paragraf) iborat mukammal kurs ishi rejasini tuzing.
    - Majburiy qismlar: Kirish, I Bob (Nazariy), II Bob (Tahliliy/Amaliy), III Bob (Takliflar), Xulosa, Adabiyotlar ro'yxati.
    
    Faqat mundarijani Markdown formatida qaytaring.`;
    const planText = await callAi(planPrompt, 4096);
    if (!planText || planText.length < 50) {
        throw new Error("Kurs ishi rejasini shakllantirishda xatolik (AI javobi juda qisqa).");
    }
    
    // Step 2-5 & 7: Intro, Chapters and Bibliography in parallel
    const [introText, ch1Text, ch2Text, ch3Text, bibText] = await Promise.all([
        callAi(`${ACADEMIC_PERSONA}\n[TASK: KURS_ISHI_BOB]\nMavzu: "${topic}".\nQism: KIRISH.\nMundarija: ${planText}\n\nKamida 1500 ta so'zdan iborat ilmiy tahlil yozing.`),
        callAi(`${ACADEMIC_PERSONA}\n[TASK: KURS_ISHI_BOB]\nMavzu: "${topic}".\nQism: I BOB.\nReja: ${planText}\n\nKamida 2000 ta so'zdan iborat ilmiy tahlil yozing.`),
        callAi(`${ACADEMIC_PERSONA}\n[TASK: KURS_ISHI_BOB]\nMavzu: "${topic}".\nQism: II BOB.\nReja: ${planText}\n\nKamida 2000 ta so'zdan iborat ilmiy tahlil yozing.`),
        callAi(`${ACADEMIC_PERSONA}\n[TASK: KURS_ISHI_BOB]\nMavzu: "${topic}".\nQism: III BOB.\nReja: ${planText}\n\nKamida 1500 ta so'zdan iborat ilmiy tahlil yozing.`),
        callAi(`${ACADEMIC_PERSONA}\n[TASK: KURS_ISHI_BOB]\nMavzu: "${topic}".\nQism: ADABIYOTLAR RO'YXATI.\n\nOAK va xalqaro standartlara mos 15-20 ta ilmiy manba ro'yxatini shakllantiring.`)
    ]);
    
    // Step 6: Conclusion (needs all previous parts for best quality, but we can do it after parallel parts done)
    const conclusionPrompt = `${ACADEMIC_PERSONA}
    [TASK: KURS_ISHI_BOB]
    Mavzu: "${topic}".
    Qism: XULOSA.
    
    Yozilgan boblar asosida o'ta batafsil ilmiy xulosa yozing.`;
    const conclusionText = await callAi(conclusionPrompt);

    // Step 8: Combine
    let fullContent = `
# MUNDARIJA
${planText}

---

# KIRISH
${introText}

---

${ch1Text}

---

${ch2Text}

---

${ch3Text}

---

# XULOSA
${conclusionText}

---

# FOYDALANILGAN ADABIYOTLAR RO'YXATI
${bibText}
    `;

    // Validate and Clean
    const validation = validateKursIshi(fullContent, uni, fac, student, adv, topic);
    fullContent = validation.cleanContent;

    return {
        title: topic,
        content: fullContent
    };
}

export const app = express();

// Top-level middleware (mounted immediately for Vercel/serverless environments)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/api/health", (req, res) => {
    // Log for debugging
    const keys = Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("API"));
    res.json({ status: "ok", keysFound: keys, poolSize: getGeminiKeysPool().length });
  });

  app.get("/api/db-health", async (req, res) => {
    try {
      const result = await dbQuery("SELECT NOW() as current_time, version()");
      res.json({ 
        status: "ok", 
        databaseTime: result.rows[0].current_time,
        databaseVersion: result.rows[0].version
      });
    } catch (e: any) {
      console.error("[DB Health] Error:", e);
      res.status(500).json({ status: "fail", error: e.message });
    }
  });

  // User detail verification by 7-digit ID (Click / Payme / Billing integration)
  app.get("/api/payment/check-user/:systemId?", async (req, res) => {
    try {
      const systemId = req.params.systemId || (req.query.systemId as string) || (req.query.id as string);
      if (!systemId) {
        return res.status(400).json({ success: false, error: "systemId talab qilinadi" });
      }
      const user = await findUserBySystemId(systemId);
      if (!user) {
        return res.status(404).json({ success: false, error: "Foydalanuvchi topilmadi" });
      }
      res.json({
        success: true,
        user: {
          systemId: user.systemId,
          displayName: user.displayName,
          role: user.role,
          ball: user.ball,
          balance: user.balance,
        },
      });
    } catch (e: any) {
      console.error("[CheckUser API] Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Official Click Merchant API Endpoint
  app.post("/api/payment/click", async (req, res) => {
    try {
      const response = await handleClickRequest(req.body);
      res.json(response);
    } catch (e: any) {
      console.error("[Click API] Exception:", e);
      res.json({ error: -9, error_note: e.message });
    }
  });

  // Official Payme JSON-RPC 2.0 API Endpoint
  app.post("/api/payment/payme", async (req, res) => {
    try {
      const response = await handlePaymeRequest(req.body);
      res.json(response);
    } catch (e: any) {
      console.error("[Payme API] Exception:", e);
      res.json({
        error: { code: -32603, message: { uz: "Tizim xatosi", ru: "Системная ошибка", en: "Internal error" } },
        id: req.body?.id || null,
      });
    }
  });

  // Generic Payment Callback Endpoint
  app.post("/api/payment/callback/:provider", async (req, res) => {
    const { provider } = req.params;
    const providerLower = provider.toLowerCase();
    if (providerLower === "click") {
      const response = await handleClickRequest(req.body);
      return res.json(response);
    }
    if (providerLower === "payme") {
      const response = await handlePaymeRequest(req.body);
      return res.json(response);
    }
    res.json({ status: "ok" });
  });

  app.get("/api/health-ai", async (req, res) => {
    try {
      console.log("[Health AI] Testing Gemini connectivity...");
      const pool = getGeminiKeysPool();
      if (pool.length === 0) {
        return res.status(500).json({ status: "fail", error: "No API keys found in pool." });
      }
      
      const response = await generateContentWithRotation({
        model: "gemini-3.6-flash",
        contents: "Salom, bu test xabari. Iltimos 'OK' deb javob bering."
      });
      
      res.json({ 
        status: "ok", 
        keysInPool: pool.length,
        modelResponse: response.text || "No text property"
      });
    } catch (e: any) {
      console.error("[Health AI] Error:", e);
      res.status(500).json({ status: "fail", error: e.message, stack: e.stack });
    }
  });

  app.get("/api/debug-gemini", (req, res) => {
    const pool = getGeminiKeysPool();
    const envVars = Object.keys(process.env).filter(k => 
      k.includes("GEMINI") || k.includes("GOOGLE") || k.includes("API_KEY") || k.includes("VITE_")
    );
    
    const maskedKeys = pool.map(k => k.substring(0, 6) + "..." + k.substring(k.length - 4));
    
    res.json({
      status: "debug",
      envType: process.env.VERCEL === "1" ? "Vercel" : (process.env.RENDER === "true" ? "Render" : "Other"),
      envVarsFound: envVars,
      poolSize: pool.length,
      maskedKeysInPool: maskedKeys
    });
  });

  // Telegram Webhook endpoint
  app.post("/api/telegram-webhook", async (req, res) => {
    try {
       const { bot } = await import("./telegram.js");
       await (bot as any).handleUpdate(req.body, res);
       if (!res.writableEnded) res.sendStatus(200);
    } catch (err) {
       console.error("Telegram Webhook Error:", err);
       res.sendStatus(500);
    }
  });

  app.post("/api/notify-connection-request", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { requestId, data } = req.body;
      const { notifyNewConnectionRequest } = await import("./telegram.js");
      if (notifyNewConnectionRequest) {
        await notifyNewConnectionRequest(requestId, data);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Notify connection request error:", err);
      res.status(500).json({ error: "Failed to notify admins" });
    }
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { action, topic, count, context, docType, options } = req.body;
      console.log(`[API Gemini] Action: ${action}, Topic: ${topic}`);
      
      syncGeminiKeysWithFirestore().catch(e => console.warn("[API Gemini] Initial sync failed:", e));
      let keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        console.log("[API Gemini] Keys pool is empty. Forcing full reload from environment...");
        clearKeysCache();
        await syncGeminiKeysWithFirestore();
        keysPool = getGeminiKeysPool();
      }
      if (keysPool.length === 0) {
        // Final fallback: try to use GEMINI_API_KEY directly if it's there but wasn't picked up
        const directKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
        if (directKey && directKey.length > 5) {
          console.log("[API Gemini] Using direct GEMINI_API_KEY fallback.");
          keysPool = [directKey];
        } else {
          return res.status(500).json({ error: "Gemini API kaliti topilmadi. Iltimos, server sozlamalarini tekshiring." });
        }
      }

      const MODEL_NAME = "gemini-3.6-flash";

      if (action === "parseTestWithGemini") {
        const { htmlText } = req.body;
        const prompt = `
        Vazifa: Yuklangan matnni (HTML teglar, base64 rasmlar bilan aralashgan) tozalang va standart shablon formatiga o'tkazing.
        
        QOIDALAR (O'TA MUHIM):
        1. Barcha HTML teglarni (<p>, <br />, <em>, <img>, <span>, <div>, <style> va h.k.) BUTUNLAY O'CHIRING.
        2. Matn ichidagi barcha 'data:image/x-wmf;base64,...' kabi teglar va ularning mazmunini O'CHIRING.
        3. Formulalarni tiklash: Agar matnda formula tushib qolgan bo'lsa (bo'sh joy yoki rasm bo'lib qolgan bo'lsa), matn mazmuni va javob variantlaridan kelib chiqib matematik formulani TO'LIQ VA XATOSIZ TIKLANG.
        4. Matematik belgilar (∫, ∑, lim, √, ∃, ∀, ∈, ∉, ≤, ≥, ≠, ±, ∞, →) va indekslarni (x_n, x^2, n_0, f'(x)) toza matn yoki LaTeX ko'rinishida saqlang.
        5. FORMATLASH: Har bir savolni quyidagi tartibda yozing va BARCHA savollarni parselang (hech qaysini tashlab ketmang):
           ++++
           Savol va formulasi
           ====
           # To'g'ri javob
           ====
           Noto'g'ri javob 1
           ====
           Noto'g'ri javob 2
           ====
           Noto'g'ri javob 3
        
        Matn: ${htmlText}
        `;
        
        try {
          const response = await generateContentWithRotation({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              maxOutputTokens: 16384,
              temperature: 0.1
            }
          });
          return res.json({ text: response.text });
        } catch (err: any) {
          console.error(`[API Gemini] Test parsing failed: ${err.message}`);
          const status = err.status || err.statusCode || 500;
          return res.status(status).json({ error: `Parsingda xatolik: ${err.message}` });
        }
      } else if (action === "generateDynamicTest") {
        const countOptions = 4;
        const prompt = `Siz professional pedagog va testolog-ekspertisiz.
          Vazifa: "${topic}" mavzusi bo'yicha ${count || 10} ta professional va akademik test savollarini yaratish.
          
          QOIDALAR:
          - Har bir savolda 4 ta variant bo'lsin.
          - Faqat bitta to'g'ri javob bo'lsin.
          - Savollar takrorlanmasin.
          - Oson, o'rta va murakkab darajalar aralash bo'lsin.
          - Noto'g'ri javoblar ham mantiqiy bo'lsin.
          - O'zbek tilida, grammatik xatolarsiz.
          
          Natija faqat JSON formatida bo'lsin.
          
          ${context ? `Asos: Quyidagi matn tahlil qilinsin:\n${context}` : `Asos: Umumiy akademik bilimlar.`}`;

      console.log(`[API Gemini] Generating test for topic: ${topic}, count: ${count}`);
      try {
        const response = await generateContentWithRotation({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            maxOutputTokens: 8192,
            temperature: 0.1,
            topP: 0.95,
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
        });

        if (!response || !response.text) {
          throw new Error("AI javob bermadi (Bo'sh matn).");
        }

        const json = parseJSONResponse(response.text, []);
        console.log(`[API Gemini] Successfully generated ${json.length} questions.`);
        return res.json(json);
      } catch (err: any) {
        console.error(`[API Gemini] Test generation failed: ${err.message}`);
        return res.status(500).json({ error: `Test yaratishda xatolik: ${err.message}` });
      }

      } else if (action === "generatePresentation") {
        const slideCount = count || 15;
        const opt = options || {};
        const lang = opt.language || "O'zbek";
        const designType = opt.designType || "Zamonaviy";
        const hasImages = opt.addImages !== undefined ? opt.addImages : true;
        const hasCharts = opt.createDiagrams !== undefined ? opt.createDiagrams : true;
        const hasNotes = opt.speakerNotes !== undefined ? opt.speakerNotes : true;

        const prompt = `${ACADEMIC_PERSONA}
          Siz AIEDUTIZIM Telegram botining AI Slayd Yaratish xizmatisiz.
          Sizning yagona vazifangiz foydalanuvchi bergan "${topic}" mavzusi asosida professional, himoya uchun tayyor, zamonaviy va vizual jihatdan jozibador PowerPoint taqdimotini yaratishdir.

          TAQDIMOT PARAMETRLARI:
          - Slaydlar soni: ${slideCount} ta (qat'iyan ${slideCount} ta slayd bo'lsin)
          - Til: ${lang} (Taqdimot matnlari va barcha slayd mazmuni to'liq ushbu tilda bo'lishi shart!)
          - Dizayn uslubi: ${designType} (Dizayn turlari: Academic, Professional, Minimal, Modern, Dark, Light)
          - Rasm qo'shish: ${hasImages ? "HA" : "YO'Q"}
          - Diagrammalar yaratish: ${hasCharts ? "HA" : "YO'Q"}
          - Ma'ruzachi nutqi (Speaker Notes / Himoya matni) kerakligi: ${hasNotes ? "HA (mukammal 100-200 so'zdan iborat nutq)" : "YO'Q (juda qisqa 10-20 so'zdan iborat nutq bo'lsin)"}

          ASOSIY QOIDALAR:
          1. Har doim professional, ilmiy, akademik va biznes taqdimot standartlariga mos taqdimot yarating.
          2. Slaydlarda mantiqiy ketma-ketlik bo'lsin va har bir slayd bitta asosiy g'oyani ifodalasin.
          3. Slaydlarda uzun matn yozmang. White Space ishlating.
          4. Har bir slaydda bitta sarlavha va 3–5 ta asosiy bullet point (qisqa punkt) bo'lsin.
          5. Bir slayddagi matn hajmi 25–40 ta so'zdan oshmasin.
          6. Slaydlar dizayni va turlari bir xil ko'rinishda bo'lmasin, ularni rang-barang layoutlar bilan boyiting:
             - 1-slayd (layout: "cover"): Muqova (katta sarlavha, muallif, tashkilot, sana)
             - 2-slayd (layout: "agenda"): Reja (4-7 ta asosiy bo'lim ikonkalar bilan)
             - Boshqa slaydlar uchun: "content", "image-left", "image-right", "cards", "chart" kabi layoutlarni navbatma-navbat ishlating.
          7. TOZA MATN: Slayd mazmunida "Microsoft PowerPoint Custom Layout Template", "Infografika kartalari" kabi texnik andozalarni mutlaqo ishlatmang.
          8. BELGILAR: Bullet pointlar uchun ★, ✦, 🔴 kabi maxsus belgilarni ishlatmang. Standart Markdown ro'yxatidan foydalaning.
          9. HAQIQIY MA'LUMOT: Placeholderlar o'rniga haqiqiy va mantiqiy statistik ma'lumotlar, foizlar va aniq jadvallarni matn ko'rinishida yozing.
          10. SPEAKER NOTES (Himoya matni): Har bir slayd uchun foydalanuvchi ushbu slaydni himoya qilishda aytishi kerak bo'lgan, tanlangan tildagi professional nutq matnini (speechNote) yarating. Agar foydalanuvchi tanlamagan bo'lsa ham (YO'Q bo'lsa), schema talabi uchun juda qisqa 1 jumlalik nutq yozing.
          11. YAKUNIY SLAYD (layout: "summary"): Har doim Xulosa, Asosiy natijalar, Tavsiyalar va "E'tiboringiz uchun rahmat! Savollar bormi?" yakunlovchi qismini o'z ichiga olsin.

          LAYOUT TURLARI:
          - "cover" - Titul/Muqova
          - "agenda" - Mundarija/Reja
          - "content" - Qisqa matnli slayd
          - "image-left" / "image-right" - Rasm chapda yoki o'ngda joylashgan slayd
          - "cards" - Infografik kartalar ko'rinishidagi punktlar
          - "chart" - Tahliliy diagrammalar (Pie, Bar, Line)
          - "summary" - Xulosa va yakun

          Javob faqat JSON formatida bo'lsin.`;

        const response = await generateContentWithRotation({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            maxOutputTokens: 8192,
            temperature: 0.8,
            topP: 0.95,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                template: { 
                  type: Type.STRING, 
                  description: "Design template (Akademik, Zamonaviy, Minimalistik, Korporativ)" 
                },
                designPlan: { 
                  type: Type.STRING, 
                  description: "Design and color planning brief description for defense" 
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
                      content: { type: Type.STRING, description: "Minimal matnli ilmiy tushuntirish" },
                      bulletPoints: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "3-5 ta qisqa punktlar."
                      },
                      speechNote: {
                        type: Type.STRING,
                        description: "Foydalanuvchi ushbu slaydni himoya qilishda aytishi kerak bo'lgan 30-50 soniyalik nutq matni"
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
                        description: "Statistik malumotlar uchun diagramma ma'lumotlari"
                      },
                      diagramRecommendation: {
                        type: Type.STRING,
                        description: "Ushbu slaydda qanday diagramma bo'lishi kerakligi haqida tavsiya"
                      }
                    },
                    required: ["layout", "title", "speechNote"]
                  }
                }
              },
              required: ["template", "slides"]
            }
          }
        });

        const json = parseJSONResponse(response.text, { template: "Zamonaviy", slides: [] });
        return res.json(json);

      } else if (action === "generateDocument") {
        let prompt = '';
        if (docType === "kurs_ishi") {
          const university = options?.university || "O'zbekiston Milliy Universiteti";
          const faculty = options?.faculty || "Amaliy matematika va intellektual texnologiyalar fakulteti";
          const department = options?.department || "Axborot texnologiyalari kafedrasi";
          const direction = options?.direction || "Sun'iy intellekt va dasturlash yo'nalishi";
          const studentName = options?.studentName || "Toshpo'latov F.H.";
          const advisor = options?.advisor || "Dots. Karimov S.A.";
          const pageCount = options?.pageCount || "25";

          const targetPages = parseInt(String(pageCount), 10) || 25;
          let modeDescription = "";
          let minSources = 20;
          let additionalGuidelines = "";

          if (targetPages <= 15) {
            modeDescription = "15 sahifalik qisqartirilgan kurs ishi";
            minSources = 10;
          } else if (targetPages <= 20) {
            modeDescription = "20 sahifalik standart kurs ishi";
            minSources = 15;
          } else if (targetPages <= 25) {
            modeDescription = "25 sahifalik kengaytirilgan kurs ishi";
            minSources = 20;
          } else if (targetPages <= 30) {
            modeDescription = "30 sahifalik chuqurlashtirilgan kurs ishi";
            minSources = 25;
          } else if (targetPages <= 40) {
            modeDescription = "40 sahifalik batafsil ilmiy kurs ishi";
            minSources = 30;
          } else {
            modeDescription = "50 sahifalik maksimal darajadagi to'liq kurs ishi";
            minSources = 40;
            additionalGuidelines = `
            50 SAHIFALIK REJIM UCHUN ALOHIDA MEZONLAR:
            - Har bir bob kamida 10-15 sahifa hajmida bo'lsin.
            - Har bir bobda kamida 5 ta bo'lim bo'lsin.
            - Natija magistratura darajasiga yaqin sifatda bo'lsin.
            - Zamonaviy ilmiy manbalar, chuqur tahlillar, statistik ma'lumotlar va amaliy misollar juda batafsil keltirilsin.
            - Diagramma va jadvallar uchun tavsiyalar har bir bobda majburiy bo'lsin.
            `;
          }

          prompt = `Sen O'zbekiston oliy ta'lim tizimi standartlariga mos "kurs ishi" (course paper) yozuvchi ilmiy-akademik yordamchisan. Foydalanuvchi kiritgan mavzu, universitet nomi, fakultet, kafedra, yo'nalish, talaba F.I.Sh, ilmiy rahbar F.I.Sh kabi ma'lumotlar asosida to'liq, original, ilmiy jihatdan puxta kurs ishi generatsiya qilishing kerak.

          Mavzu: "${topic}". 
          Tashkiliy ma'lumotlar:
          - OTM nomi: ${university}
          - Fakultet nomi: ${faculty}
          - Kafedra nomi: ${department}
          - Yo'nalish: ${direction}
          - Talaba: ${studentName}
          - Ilmiy rahbar: ${advisor}
          - Tanlangan hajm: ${targetPages} sahifa (${modeDescription})

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
             - Foydalanilgan adabiyotlar ro'yxati (turkumlangan, kamida ${minSources} ta manba)

          7. USLUB: rasmiy-ilmiy uslub, birinchi shaxsda emas ("biz" yoki betaraf uchinchi shaxs), ortiqcha reklama iboralarisiz ("ajoyib", "zo'r" kabi so'zlarsiz), aniq va tekshirilishi mumkin bo'lgan fikrlar bilan.

          ${additionalGuidelines}

          Placeholder ([...]) qoldirmang, talabalik ishi me'yorlari va pedagogik/ilmiy me'yorlarga to'liq amal qiling.`;
        } else if (docType === "tezis") {
          const author = options?.author || "Muallif";
          const university = options?.university || "OTM";
          const direction = options?.direction || "Yo'nalish";
          prompt = `Siz AIEDUTIZIM Telegram Bot ichidagi AI Yordamchi modulida ishlovchi ilmiy ekspertsiz.
          Vazifa: OAK talablariga mos ilmiy uslubda professional Tezis yaratish.
          
          Mavzu: "${topic}". Muallif: ${author}. OTM: ${university}. Yo'nalish: ${direction}.
          
          TIZILISh (OAK STANDARTI):
          - Kirish
          - Dolzarblik (Mavzuning bugungi kundagi ahamiyati)
          - Tadqiqot maqsadi va vazifalari
          - Tadqiqot obyekti va predmeti
          - Ilmiy yangilik
          - I BOB, II BOB, III BOB (Qisqacha mazmuni tezis formatida)
          - Tajriba-sinov ishlari natijalari
          - Xulosa va Tavsiyalar
          - Foydalanilgan adabiyotlar

          MATN: Akademik, professional va darhol nashrga tayyor bo'lsin.`;
        } else if (docType === "maqola") {
          const author = options?.author || "Muallif";
          const org = options?.org || "Tashkilot";
          const lang = options?.language || "O'zbek";

          prompt = `Siz AIEDUTIZIM Telegram Bot ichidagi AI Yordamchi modulida ishlovchi ilmiy ekspertsiz.
          Vazifa: Nufuzli ilmiy jurnallar (OAK, Scopus) talablariga mos nufuzli ilmiy Maqola yaratish.
          
          Mavzu: "${topic}". Muallif: ${author}. Tashkilot: ${org}. Til: ${lang}.
          
          TUZILISH (IMRAD):
          - Annotatsiya (O'zbek va Ingliz tillarida batafsil)
          - Kalit so'zlar (O'zbek va Inglizcha)
          - Kirish (Introduction)
          - Adabiyotlar sharhi (Literature review)
          - Tadqiqot metodologiyasi (Methodology)
          - Natijalar (Results)
          - Muhokama (Discussion)
          - Xulosa (Conclusion)
          - Foydalanilgan adabiyotlar (Kamida 10-15 ta manba)

          Uslub: Qat'iy ilmiy, professional va akademik.`;
        } else if (docType === "cv") {
          prompt = `Siz professional HR ekspertisiz.
          Vazifa: Zamonaviy HR standartlariga mos, professional va jalb qiluvchi CV yaratish.
          
          Ma'lumotlar:
          - F.I.Sh: ${options?.name || "Kiritilmagan"}
          - Telefon: ${options?.phone || "Kiritilmagan"}
          - Email: ${options?.email || "Kiritilmagan"}
          - Maqsad: ${options?.objective || "Professional rivojlanish"}
          - Ta'lim: ${options?.edu || "Kiritilmagan"}
          - Ish tajribasi: ${options?.exp || "Kiritilmagan"}
          - Ko'nikmalar: ${options?.skills || "Kiritilmagan"}
          - Sertifikatlar: ${options?.certs || "Kiritilmagan"}
          - Tillar: ${options?.languages || "Kiritilmagan"}

          BO'LIMLAR:
          1. F.I.Sh va Kontaktlar
          2. Maqsad (Objective)
          3. Ta'lim (Education)
          4. Ish tajribasi (Experience)
          5. Ko'nikmalar (Skills - Hard/Soft)
          6. Sertifikatlar
          7. Tillar
          8. Qo'shimcha ma'lumotlar

          Format: Professional, tartibli va akademik.`;
        } else if (docType === "dars_ishlanma") {
          prompt = `Siz professional pedagog-ekspertsiz.
          Vazifa: Zamonaviy pedagogik texnologiyalar asosida mukammal "Dars ishlanmasi" (Lesson Plan) yaratish.
          
          Mavzu: "${topic}".
          
          TUZILISH (13 punkt):
          1. Dars mavzusi
          2. Dars maqsadi (Ta'limiy, Tarbiyaviy, Rivojlantiruvchi)
          3. Kutilayotgan natijalar
          4. Kompetensiyalar (Tayanch va fanga oid)
          5. Dars turi
          6. Dars metodi
          7. Dars jihozlari
          8. Tashkiliy qism
          9. O'tilgan mavzuni takrorlash
          10. Yangi mavzu bayoni
          11. Mustahkamlash
          12. Baholash
          13. Uy vazifasi

          Natija: Pedagogik hujjat shaklida, professional va amaliy foydalanishga to'liq tayyor bo'lsin.`;
        } else if (docType === "tarjimon") {
          prompt = `${ACADEMIC_PERSONA}
          [TASK: TARJIMON]
          Matn: "${topic}".`;
        } else if (docType === 'hisobot') {
          prompt = `${ACADEMIC_PERSONA}
          [TASK: TARJIMON]
          Mavzu: "${topic}". 
          Birlamchi ma'lumotlar: "${options?.context || ''}".
          Ushbu ma'lumotlar asosida professional hisobot tayyorlang.`;
        }

        let finalJson: any = {};
        if (docType === "kurs_ishi") {
          finalJson = await generateKursIshiMultiStep(topic, options);
        } else {
          const response = await generateContentWithRotation({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
              maxOutputTokens: 16384,
              temperature: 0.9,
              topP: 1,
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
          });
          finalJson = parseJSONResponse(response.text, {});
        }

        return res.json(finalJson);

      } else if (action === "generateDynamicCourse") {
        const prompt = `Mavzu: "${topic}".
        Ushbu mavzu bo'yicha to'liq kurs rejasini va mazmunini o'zbek tilida yarating.
        Kurs kamida 4 ta moduldan iborat bo'lsin.
        Har bir modul uchun: sarlavha (title) va to'liq o'quv kontenti (Markdown formatida) bo'lsin.
        Javob JSON formatida bo'lsin.`;

        const response = await generateContentWithRotation({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            maxOutputTokens: 16384,
            temperature: 0.8,
            topP: 0.95,
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
        });

        const json = parseJSONResponse(response.text, {});
        return res.json(json);
      } else {
        return res.status(400).json({ error: "Noma'lum amal" });
      }

    } catch (error: any) {
      console.error("[Backend Gemini API Error]:", error);
      return res.status(500).json({ error: error.message || "Xatolik yuz berdi" });
    }
  });

  app.post("/api/raw-gemini", async (req, res) => {
    try {
      const { prompt, model } = req.body;
      await syncGeminiKeysWithFirestore();
      const keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        return res.status(500).json({ error: "Gemini API kalitlari topilmadi." });
      }

      const response = await generateContentWithRotation({
        model: model || "gemini-3.6-flash",
        contents: prompt
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("[Backend Raw Gemini API Error]:", error);
      return res.status(500).json({ error: error.message || "Barcha kalitlar limiti tugagan bo'lishi mumkin" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, userName, isAdminMode, systemContext, functionResponses, lastFunctionCall, lastModelParts } = req.body;
      
      await syncGeminiKeysWithFirestore();
      const keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        return res.status(500).json({ error: "Gemini API kaliti topilmadi (Serverda sozlanmagan)." });
      }

      let systemInstruction = `Siz ushbu o'quv platformasining aqlli yordamchisisiz. Siz suhbatlashayotgan foydalanuvchining ismi: ${userName || 'Mehmon'}. Barcha savollarga aniq, to'g'ri va xushmuomalalik bilan o'zbek tilida javob bering, suhbatni boshida uning ismi bilan murojaat qiling.`;

      if (isAdminMode) {
         systemInstruction = `Siz tizim administratorining bosh yordamchisisiz. Administrator ismi: ${userName}. 
Sizda tizimdagi ma'lumotlarni o'qish va ma'lum amallarni bajarish (masalan, foydalanuvchilar sonini bilish, ularning ro'yxatini olish, tug'ilgan kuni bo'lganlarni ko'rish, testlarni faollashtirish, quizlar yaratish) uchun maxsus funksiyalar (tools) mavjud.
Agar admin tizim yoki boshqa har qanday mavzudagi savol bilan yuzlansa, albatta ushbu savollarga AI orqali eng to'g'ri, to'liq va aniq javoblarni taqdim eting. Bundan tashqari tizim ma'lumotlarini taqdim etishda kerakli funksiyalardan va kontekst ma'lumotlaridan foydalaning. Muloqotda erkin va har xil sohalarda savollarga javob bera olasiz.`;
      } else {
         systemInstruction += `\nSiz platformaning aqlli virtual yordamchisisiz. Siz ham AIEDUTIZIM platformasi imkoniyatlari, kurslari va darslari haqidagi savollarga javob bera olasiz, ham foydalanuvchi qiziqqan istalgan boshqa mavzudagi (matematika, dasturlash, fizika, tarix, til o'rganish, umumiy savollar va h.k.) har qanday savollarga juda aqlli va foydali javob qaytara olasiz.

Tizim imkoniyatlari haqida ma'lumot so'ralsa, quyidagilarni aytib o'ting:
1. Kurslar: Foydalanuvchilar turli xil kurslarni ko'rishlari va o'rganishlari mumkin.
2. Testlar va Quizizz: Bilimni sinab ko'rish uchun interaktiv testlar va Quizizz mashqlari mavjud.
3. Jurnal va Baholar: Talabalar o'z baholarini va o'zlashtirishini kuzatib borishlari mumkin.
4. Sertifikatlar: Kurslarni muvaffaqiyatli tugatganlarga sertifikatlar beriladi va ularni tekshirish tizimi mavjud.
5. Chat va Murojaatlar: Foydalanuvchilar adminlar, o'qituvchilar yoki boshqa foydalanuvchilar bilan chat orqali muloqot qilishlari va murojaat qoldirishlari mumkin.
6. Xizmatlar va Ma'lumotlar: Saytdagi qo'shimcha xizmatlar va yangiliklar bilan tanishish imkoniyati bor.
Agar foydalanuvchi ma'muriyat (admin) bilan bevosita bog'lanish istagini bildirsa, unga "Bog'lanish" sahifasiga o'tishni maslahat bering va ushbu linkni yuboring: /contact .`;
      }

      if (systemContext) {
        systemInstruction += `\n\n⚠️ TIZIMDAGI FAQOL VA HAQIQIY MA'LUMOTLAR VA STATISTIKA:\n${systemContext}\n\nFoydalanuvchi/ma'muriyat so'raganda albatta mutlaqo aniqlik va ishonchlilik bilan ushbu ma'lumotlardan foydalanib javob bering.`;
      }
      
      const reqContents = [];
      if (history && Array.isArray(history)) {
          for (const msg of history) {
              if (msg.role === 'user' || msg.role === 'model') {
                 let textVal = "";
                 if (typeof msg.text === 'string' && msg.text.trim()) {
                    textVal = msg.text.trim();
                 } else if (msg.parts && Array.isArray(msg.parts) && msg.parts[0]) {
                    if (typeof msg.parts[0] === 'string') {
                       textVal = msg.parts[0];
                    } else if (msg.parts[0].text) {
                       textVal = msg.parts[0].text;
                    }
                 }
                 if (textVal) {
                    reqContents.push({ role: msg.role, parts: [{ text: textVal }] });
                 }
              }
          }
      }

      if (prompt && prompt.trim()) {
          reqContents.push({ role: "user", parts: [{ text: prompt.trim() }] });
      }

      if (lastModelParts && Array.isArray(lastModelParts)) {
          reqContents.push({ role: "model", parts: lastModelParts });
      } else if (lastFunctionCall) {
          reqContents.push({ role: "model", parts: [{ functionCall: lastFunctionCall }] });
      }

      if (functionResponses && Array.isArray(functionResponses) && functionResponses.length > 0) {
          const fnParts = [];
          functionResponses.forEach(r => {
             fnParts.push({
                 functionResponse: {
                     name: r.name,
                     response: {
                        result: r.response
                     }
                 }
             });
          });
          reqContents.push({ role: "user", parts: fnParts });
      }

      const tools = [];
      if (isAdminMode) {
          tools.push({
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

      const getResponse = async (contents) => {
          try {
             return await generateContentWithRotation({
               model: "gemini-3.6-flash",
               contents: contents,
               config: {
                 maxOutputTokens: 4096,
                 temperature: 0.7,
                 systemInstruction,
                 tools: tools.length > 0 ? tools : undefined
               }
             });
          } catch(err) {
             throw err;
          }
      };

      const response = await getResponse(reqContents);

      // Check if model asks for a function call
      if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          return res.json({ 
              isFunctionCall: true,
              functionCall: { name: call.name, args: call.args },
              modelParts: response.candidates?.[0]?.content?.parts || [{ functionCall: { name: call.name, args: call.args } }]
          });
      }

      let replyText = response.text || "";
      if (!replyText && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        replyText = response.candidates[0].content.parts[0].text;
      }

      if (!replyText) {
        throw new Error("Sun'iy intellektdan bo'sh javob qaytdi. Iltimos, qaytadan urinib ko'ring.");
      }

      res.json({ reply: replyText });
    } catch (error: any) {
      let errMsg = "";
      if (error && error.message) {
        errMsg = error.message;
      } else if (typeof error === 'string') {
        errMsg = error;
      } else {
        errMsg = "Noma'lum xato";
      }
      
      console.error("[Gemini API Endpoint Error]", req.body?.action || 'unknown', errMsg, error);
      
      if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
        errMsg = "API kaliti yaroqsiz. Iltimos, AI Studio sozlamalari orqali to'g'ri Gemini API kalitini o'rnating.";
      } else if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errMsg = "Hozirda aqlli yordamchimiz biroz band yoki tanaffusda ☕️. Iltimos, bir necha daqiqadan so'ng qayta so'rab ko'ring. Tez orada u sizga bajonidil yordam beradi!";
      } else if (errMsg.includes("503") || errMsg.includes("504")) {
        errMsg = "Tarmoq xatosi yoki server o'ta band (API 503). Qayta urinib ko'ring.";
      }
      res.status(500).json({ error: errMsg, rawError: error ? error.toString() : "No details" });
    }
  });

  // Asynchronous startup helper for launching local processes
  async function startServer() {
    const PORT = 3000;

    // Launch the Telegram bot silently in the background (only on local/non-serverless instances)
    if (process.env.VERCEL !== "1") {
      const { launchBot } = await import("./telegram.js");
      launchBot();
    }

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await import("vite");
      const viteServer = await vite.createServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(viteServer.middlewares);
    } else if (process.env.VERCEL !== "1") {
      // Static serving only if NOT on Vercel (Vercel handles static via vercel.json rewrites)
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // Start listening only if not on Vercel
    if (process.env.VERCEL !== "1") {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  // Execute startup only if not on Vercel
  if (process.env.VERCEL !== "1") {
    startServer().catch(err => {
      console.error("Startup error:", err);
    });
  }

