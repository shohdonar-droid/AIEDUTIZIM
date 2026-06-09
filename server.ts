import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRotation, getGeminiKeysPool, syncGeminiKeysWithFirestore, clearKeysCache } from "./src/lib/gemini";
import { launchBot } from "./telegram";

function parseJSONResponse(text: string | null | undefined, defaultOutput: any): any {
  if (!text) return defaultOutput;
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error:", e);
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

export const app = express();

async function startServer() {
  const PORT = 3000;

  // Launch the Telegram bot silently in the background
  if (process.env.VERCEL !== "1") {
    launchBot();
  }

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.get("/api/health", (req, res) => {
    // Log for debugging
    const keys = Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("API"));
    res.json({ status: "ok", keysFound: keys, poolSize: getGeminiKeysPool().length });
  });

  // Payment integration placeholder (Click/Payme)
  app.post("/api/payment/prepare", async (req, res) => {
    const { amount, userId, provider } = req.body;
    // This is where you would call Click/Payme API to get a payment link or prepare a transaction
    console.log(`Preparing ${provider} payment for user ${userId}: ${amount} UZS`);
    
    // For now, return a mock success response
    res.json({
      status: "success",
      paymentUrl: `https://aiedutizim.vercel.app/profile`,
      message: "To'lov tayyorlandi. Iltimos, profil sahifasida to'lovni yakunlang."
    });
  });

  app.post("/api/payment/callback/:provider", async (req, res) => {
    const { provider } = req.params;
    const body = req.body;
    console.log(`Received ${provider} payment callback:`, body);
    
    // Verify signature, check transaction status, and update user balance in Firestore
    // This endpoint should be accessible by Click/Payme servers
    
    res.json({ status: "ok" });
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { action, topic, count, context, docType, options } = req.body;
      
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
        const directKey = process.env.GEMINI_API_KEY;
        if (directKey && directKey.length > 5) {
          console.log("[API Gemini] Using direct GEMINI_API_KEY fallback.");
          keysPool = [directKey];
        } else {
          return res.status(500).json({ error: "Gemini API kaliti topilmadi. Iltimos, server sozlamalarini tekshiring." });
        }
      }

      const MODEL_NAME = "gemini-3.5-flash";

      if (action === "generateDynamicTest") {
        const countOptions = options?.optionsCount || 4;
        const prompt = context 
          ? `Mavzu: ${topic}
              Ushbu matn asosida ${count || 10} ta o'zbek tilidagi test savollarini yarating. 
              Savollar faqat berilgan matn asosida bo'lishi shart.
              Natija faqat JSON formatida bo'lsin.
              Har bir savol ${countOptions} ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (correctIdx, 0-${countOptions - 1}) ko'rsatilishi kerak.
              
              Berilgan matn:
              ${context}`
          : `Mavzu: ${topic}
              Ushbu mavzu asosida ${count || 10} ta o'zbek tilidagi umumiy bilimga asoslangan test savollarini yarating. 
              Natija faqat JSON formatida bo'lsin.
              Har bir savol ${countOptions} ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (correctIdx, 0-${countOptions - 1}) ko'rsatilishi kerak.`;

        const response = await generateContentWithRotation({
          model: MODEL_NAME,
          contents: prompt,
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
        });

        const json = parseJSONResponse(response.text, []);
        return res.json(json);

      } else if (action === "generatePresentation") {
        const prompt = `Mavzu: "${topic}".
          Siz o'ta professional, premium darajadagi (Canva Premium, Beautiful.ai kabi) taqdimot (presentation) ustasisiz. 
          Ushbu mavzu bo'yicha ${count || 15} ta slide-dan iborat o'ta vizual, infografikali va mukammal taqdimot rejasini va qisqa, tushunarli matnini o'zbek tilida tayyorlang.
          
          QOIDALAR:
          1. 30% matn, 70% vizual bo'lishi shart. Katta slayd matnga to'lib ketmasin.
          2. Bir slaydda 5 tadan ortiq bullet point bo'lmasin. Muhim fikrlar qisqa yozilsin.
          3. Hech qanday "Rasm uchun joy" degan matn bo'lmasin. 
          4. AI mavzuni chuqur tahlil qilsin va (SWOT, Diagramma, Arxitektura kabi) o'ziga xos vizual bo'limlarni ham mustaqil qo'shib yuborsin.

          TUZILMA:
          Taqdimot quyidagi qoliplarga asoslanishi kerak: Titul, Mundarija, Kirish, Asosiy qism, Tahlil, Diagrammalar, Statistikalar, Xulosa, Rahmat.
          
          DIZAYN VA LAYOUTLAR:
          Mavjud layout turlari:
          - "cover" - Titul sahifasi (Asosiy sarlavha, fon)
          - "agenda" - Mundarija
          - "content" - Qisqa matn va ikonka
          - "image-left" - Rasm chapda, matn o'ngda
          - "image-right" - Rasm o'ngda, matn chapda
          - "cards" - Infografika / SmartArt kartochkalari (maqsadlar, etaplar). 3-4 element.
          - "chart" - QuickChart orqali statistika (Pie, Bar, Line, Radar, Donut).
          - "summary" - Yakuniy xulosa va rahmat.

          Slaydga kiritiladigan Icon nomlari ("iconType") Inglizcha (masalan: mdi:rocket, mdi:chart-bar, mdi:cogs, mdi:account-group) formatda bo'lsin.
          Agar layout "chart" bo'lsa, "chartType" ("pie", "bar", "line", "radar", "doughnut") va "chartData" obyekti berilsin.
          Agar layout vizual rasm bo'lsa, "imageKeyword" qidiruviga aniq inglizcha rasm qidirish tushunchasi berilsin.

          Qaytariladigan JSON tarkibida "template" ("Akademik", "Zamonaviy", "Minimalistik", "Korporativ" - kelganida shulardan asosiy designni yozing) va ${count || 15} ta elementdan iborat "slides" ro'yxati qaytarilsin. Javob faqat JSON formatida bo'lsin yopiq (markdown code block ni ishlatmasdan).`;

        const response = await generateContentWithRotation({
          model: MODEL_NAME,
          contents: prompt,
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
          const pageCount = options?.pageCount || "25-30";

          prompt = `Siz O'zbekiston oliy ta'lim muassasalari standartlari bo'yicha yuqori saviyadagi, mukammal va akademik "Kurs ishi" (Coursework / Term Paper) tayyorlab beruvchi professional ilmiy ekspert-tizimsiz.
          
      Mavzu: "${topic}". 
      Tashkiliy ma'lumotlar:
      - OTM nomi: ${university}
      - Fakultet nomi: ${faculty}
      - Kafedra nomi: ${department}
      - Yo'nalish: ${direction}
      - Talaba: ${studentName}
      - Ilmiy rahbar: ${advisor}
      - Kutilayotgan umumiy hajm: ${pageCount} sahifa

      Ushbu kurs ishi oddiy referat, blog kabi maqolalar yoki sun'iy intellekt tomonidan yuzaki yozilgan umumiy matn ko'rinishida bo'lmasin!

      QUYIDAGI AKADEMIK VA METODIK STANDARTLARGA QAT'IY RIOYA QILING:

      1. ILMIY USLUB:
         - To'liq ilmiy va rasmiy uslubda, muassasalar tomonidan qabul qilingan akademik atamalar va chuqur tahlillar bilan yozilsin.
         - Matnda hech qachon "Menimcha", "Mening fikrimcha", "Ushbu mavzu juda qiziqarli", "Bu yaxshi usul", "Men ko'rib chiqdim" kabi noakademik va shaxsiy qarashlarni bildiruvchi yengil iboralar ishlatilmasin!
         - Buning o'rniga faqat akademik jurnallarga xos iboralardan keng foydalaning:
           * "Tahlillar natijasida aniqlandiki..."
           * "Tadqiqotlar shuni ko'rsatadiki..."
           * "Mazkur yondashuvning afzalligi..."
           * "Ilmiy manbalar asosida..."
           * "Tajribalar va nazariy qarashlar qiyosiy tahlil qilinganda..."
           * "Zaruriy xulosa va hisoblar ko'rsatadiki..."

      2. MUKAMMAL AKADEMIK STRUKTURA (Matn har bir bo'lim va sarlavhalarni o'z ichiga olishi shart):
         - MUNDARIJA: Mavzuga mos mantiqiy boblar va rejani o'z ichiga oladi.
         - KIRISH: Quyidagi elementlar albatta alohida bandlar ko'rinishida chuqur tahlil qilinib keng yoritilsin:
           * Mavzuning dolzarbligi (Dolzarblik qismi kamida 2-3 ta pishiq va uzun paragraf bo'lsin)
           * Tadqiqot maqsadi
           * Tadqiqot vazifalari
           * Tadqiqot obyekti
           * Tadqiqot predmeti
           * Tadqiqot metodlari
           * Tadqiqotning amaliy ahamiyati
         - I BOB: NAZARIY VA METODOLOGIK ASOSLARI. Kamida 2-3 ta paragrafdan iborat bo'lsin. Mavzuning mohiyati, nazariy tushunchalari, ilmiy izohlar va dunyo tajribasi batafsil tahlil qilinsin.
         - II BOB: AMALIY TAHLIL VA EKSPERIMENTAL NATIJALAR. Kamida 2-3 ta paragrafdan iborat bo'lsin. Amaliy sohadagi muammolar, tahlillar va olingan natijalar to'laqonli yoritilsin.
         - III BOB: MAZKUR SOHANING RIVOJLANISH ISTIQBOLLARI. Kamida 2 ta paragraf bo'lib, olingan natijalarning kelajakdagi tatbiqi va takomillashtirish yechimlari yozilsin.
         - XULOSA: Ilmiy jihatdan mustahkam asoslangan, amaliy tavsiyalar bilan pishiq yakunlovchi umumiy xulosa.
         - FOYDALANILGAN ADABIYOTLAR: Kamida 10 tadan 20 tagacha mukammal davlat tili va xorijiy tillardagi kitoblar, OAK jurnallari va rasmiy ilmiy manbalar ro'yxati (GOST yoki OTM me'yoriga to'liq mos: Muallif, kitob nomi, nashriyot, yil, masalan: 'Karimov A.B. Sun'iy intellekt asoslari. - Toshkent: Fan, 2023. - 128 b.').
         - ILOVALAR (agar kerak bo'lsa): Amaliy hisob-kitob, kichik dasturiy kod yoki jadval ko'rinishidagi ilova namunasi.

      3. PLACEHOLDER VA FORMAT CHECK:
         - Matnda "[OTM]", "[Fakultet]", "[Talaba]", "[Shahar]", "[Mavzu]" kabi to'rtburchak qavsli placeholderlar mutlaqo qoldirilmasin! Ularning o'rniga yuqoridagi haqiqiy ma'lumotlarni ishlating.
         - Foydalanuvchi ma'lumotlarini matn tarkibiga to'la integratsiya qiling.

      Matnni nihoyatda pishiq, akademik jihatdan eng yuqori baho oladigan darajada, boy va kengaytiruvchi darsliklar hamda mustaqil nazariyaga asoslangan mukammal ilmiy bo'limlar bilan tayyorlang.`;
        } else if (false) {
          prompt = `Ma'lumotlar: "${topic}". 
     Ushbu ma'lumotlar/mavzu asosida juda mukammal, to'liq, mazmun jihatdan doimiy 25-30 sahifalik ilmiy-tadqiqot darajasidagi "Kurs ishi" (Coursework) tayyorlang. O'zbek tilida, rasmiy akademik uslubda yozilishi shart.
     
     TARKIBIY QISMI QUYIDAGI TARTIBDA BO'LSIN:
     1. TITUL VARAQ (NAMUNA):
        OTM NOMI: [Oliy ta'lim muassasasi nomi]
        FAKULTET: [Fakultet nomi]
        KAFEDRA: [Kafedra nomi]
        KURS ISHI MAVZUSI: "${topic.toUpperCase()}"
        BAJARDI: [Talaba F.I.Sh.]
        ILMIY RAHBAR: [Ilmiy rahbar F.I.Sh., ilmiy darajasi]
        SHAHAR VA YIL: [Shahar] - 2026 (Foydalanuvchi bularni o'zi osongina tahrirlab to'g'irlab olishi mumkin)
     2. MUNDARIJA (Mavzu darsliklariga mos keladigan rejalar)
     3. KIRISH (Mavzuning dolzarbligi, obyekti, predmeti, metodlari, maqsad va vazifalari to'liq va keng yoritilgan)
     4. ASOSIY BOBLAR (Kamida 2-3 ta bob, har bir bobda 1.1, 1.2, 2.1, 2.2 kabi kamida 2 tadan mukammal yozilgan kichik bo'limlar bo'lishi va har biri juda uzun, tahlillar, formulalar, muammolar va yechimlarga boy bo'lishi shart)
     5. XULOSA VA TAVSIYALAR (Tadqiqot natijalari tahlili asosidagi mustaqil xulosalar)
     6. FOYDALANILGAN ADABIYOTLAR RO'YXATI (Kamida 10-15 ta ilmiy, rasmiy va zamonaviy adabiyotlar to'liq bibliografik me'yorlarda ro'yxati)
     
     Har bir bob va bo'limni o'ta batafsil va batafsil tushuntirishlar bilan, doimiy 25-30 listli (sahifali) akademik hajmga to'liq javob beradigan darajada nihoyatda uzun va qiziqarli yozing.`;
        } else if (docType === "tezis") {
          const author = options?.author || "Muallif";
          const university = options?.university || "OTM";
          const direction = options?.direction || "Yo'nalish";
          prompt = `Mavzu: "${topic}". Muallif: ${author}. OTM: ${university}. Yo'nalish: ${direction}.
          Ushbu mavzu asosida mukammal va professional Ilmiy Tezis (Thesis/Abstract) tayyorlang. O'zbek tilida, ilmiy uslubda.
          Tarkibi:
          1. Sarlavha (Mavzu nomi)
          2. Muallif: ${author}
          3. Tashkilot: ${university} (${direction})
          4. Annotatsiya (O'zbek va Ingliz tillarida qisqacha ma'lumot)
          5. Kalit so'zlar (5-8 ta asosiy ilmiy atama)
          6. Kirish va O'rganilganlik darajasi
          7. Asosiy Qism (Metodlar, amaliy natijalar, tahlillar)
          8. Xulosa (Tadqiqot yakuniy natijalari)
          9. Foydalanilgan Adabiyotlar ro'yxati (Kamida 3-5 ta asosiy manba)
          Tezis to'liq va barcha ilmiy me'yorlarga javob beradigan professional darajada yozilsin.`;
      } else if (docType === "maqola") {
          const author = options?.author || "Muallif";
          const org = options?.org || "Tashkilot";
          const lang = options?.language || "O'zbek";

          prompt = `Mavzu: "${topic}". Muallif: ${author}. Tashkilot: ${org}. Til: ${lang}.
          Ushbu mavzu asosida nufuzli ilmiy jurnallar (OAK yoki xalqaro Scopus/Web of Science) talablariga mos keladigan professional darajadagi nufuzli ilmiy Maqola yarating. Til: ${lang}, rasmiy va yuqori ilmiy uslubda.
          Tarkibi (IMRAD standarti asosida):
          1. Maqola Sarlavha (Mavzu nomi)
          2. Muallif(lar) va ishlash/o'qish joyi (Namuna sifatida kiritiladi)
          3. Annotatsiya (O'zbek tilida) va Abstract (Ingliz tilida, mukammal grammatika bilan)
          4. Kalit so'zlar / Keywords
          5. Kirish (Introduction) - Mavzuning dolzarbligi, qo'yilgan masala
          6. Metodologiya (Research Methodology) - Qo'llanilgan ilmiy uslublar
          7. Natijalar (Results) - Tadqiqot davomida olingan yangi ilmiy natijalar
          8. Tahlil va Muhokama (Discussion) - Olingan natijalarning qiyosiy tahlili
          9. Xulosa (Conclusion) - Yakuniy xulosalar va kelajakdagi tadqiqot yo'nalishlari
          10. Foydalanilgan Adabiyotlar (References) - Kamida 10 ta xalqaro va milliy ilmiy manbalar
          Maqola juda batafsil, ilmiy g'oyalarga boy va yuqori saviyada yozilsin.`;
        } else if (docType === "cv") {
          prompt = `Foydalanuvchi ma'lumotlari:
          - Ism Familiya: ${options?.name || "Kiritilmagan"}
          - Tug'ilgan sana: ${options?.birthDate || "Kiritilmagan"}
          - Telefon: ${options?.phone || "Kiritilmagan"}
          - Email: ${options?.email || "Kiritilmagan"}
          - Manzil: ${options?.address || "Kiritilmagan"}
          - Ta'lim: ${options?.edu || "Kiritilmagan"}
          - Ish tajribasi: ${options?.exp || "Kiritilmagan"}
          - Ko'nikmalar: ${options?.skills || "Kiritilmagan"}
          - Tillar: ${options?.languages || "Kiritilmagan"}

          Ushbu ma'lumotlar asosida professional, zamonaviy va ish beruvchini jalb qiladigan mukammal va to'liq "CV / Rezyume" yarating. O'zbek tilida, rasmiy uslubda bo'lishi shart.
          Hujjat tarkibi:
          1. Shaxsiy ma'lumotlar (F.I.Sh., aloqa ma'lumotlari sarlavha qismida)
          2. Objective / Maqsad (Professional maqsad haqida qisqa va pishiq paragraf)
          3. Ta'lim (Batafsil yoritilgan)
          4. Ish tajribasi (Vazifalar va yutuqlar bilan)
          5. Ko'nikmalar (Texnik va yumshoq ko'nikmalar)
          6. Tillar (Bilish darajalari bilan)
          7. Qo'shimcha ma'lumotlar (Sertifikatlar, qiziqishlar bo'lsa)
          Hujjat vizual jihatdan tartibli va professional ko'rinishda bo'lsin.`;
        } else if (docType === "dars_ishlanma") {
          prompt = `Ma'lumotlar: "${topic}". 
          Ushbu ma'lumotlar asosida zamonaviy dars berish metodlari va ilg'or pedagogik texnologiyalar asosida tayyorlangan mukammal va to'liq "Dars ishlanmasi" (Lesson Plan) tayyorlang. O'zbek tilida va pedagogik qoidalarga mos holda yozilishi shart.
          Tarkibi:
          1. Umumiy ma'lumotlar (Fan, Mavzu, Sinf yoki Kurs, Dars turi, Dars davomiyligi - Namuna sifatida to'ldirilgan)
          2. Darsning maqsadi (Ta'limiy, Tarbiyaviy, Rivojlantiruvchi maqsadlar batafsil ko'rsatiladi)
          3. Kompetensiyalar (Mavzuga doir tayanch va fanga oid kompetensiyalar)
          4. Jihozlar va Dars metodlari (Ko'rgazmali qurollar, AKT, interaktiv uslublar)
          5. Darsning borishi / Dars bosqichlari (Tashkiliy qism, o'tilgan mavzuni mustahkamlash, yangi mavzu bayoni - batafsil yondashuv bilan, mustahkamlash bosqichlari)
          6. Mustahkamlash partiyasi (Mavzu yuzasidan interaktiv savollar, topshiriqlar va keyslar)
          7. Baholash va Rag'batlantirish (Mezonlar asosida)
          8. Uyga vazifa (Ijodiy va amaliy topshiriqlar)
          Dars o'qituvchi va talabalar uchun to'liq yo'riqnoma vazifasini o'taydigan darajada batafsil yozilsin.`;
        } else if (docType === "tarjimon") {
          prompt = `Ma'lumotlar: "${topic}".
          Yuqoridagi ma'lumotlarda "Direction" (Tarjima yo'nalishi) berilgan. 
          Iltimos, berilgan matnni xalqaro tarjimonlik darajasida, grammatik qoidalarga rioya qilgan holda faqatgina ko'rsatilgan maqsadli tilga tarjima qiling. Qavslarsiz, to'g'ridan to'g'ri tarjimani bering.`;
        } else if (docType === 'hisobot') {
          prompt = `Mavzu: "${topic}". 
     Birlamchi ma'lumotlar: "${options?.context || ''}".
     Ushbu ma'lumotlar asosida mukammal va kengaytirilgan "Hisobot" (Report) tayyorlang. O'zbek tilida, rasmiy uslubda bo'lishi shart.
     Berilgan qilingan/rejalashtirilgan ishlar haqidagi qisqa matnni professional va ilmiy darajaga ko'taring.
     Javob faqat JSON formatida bo'lsin.`;
        }

        let finalJson: any = {};
        if (docType === "kurs_ishi") {
          let attempts = 0;
          let isFullyValid = false;
          let currentPrompt = prompt;

          while (attempts < 2 && !isFullyValid) {
            console.log(`[Kurs Ishi Generation] Attempt ${attempts + 1} starting...`);
            const response = await generateContentWithRotation({
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
            });

            finalJson = parseJSONResponse(response.text, {});
            const validation = validateKursIshi(
              finalJson.content,
              options?.university,
              options?.faculty,
              options?.studentName,
              options?.advisor,
              topic
            );

            if (validation.isValid) {
              isFullyValid = true;
              finalJson.content = validation.cleanContent;
              console.log("[Kurs Ishi Generation] Successfully validated and cleared placeholders!");
            } else {
              attempts++;
              console.warn(`[Kurs Ishi Generation Failed Validation] Attempt ${attempts}: ${validation.reason}`);
              if (attempts >= 2) {
                finalJson.content = validation.cleanContent;
                break;
              }
              currentPrompt = `${prompt}\n\n⚠️ OLDINGI URINISHDA XATOLAR ANIQLANDI. ILTIMOS QUYIDAGI MUAMMOLARNI TO'LIQ TUZATIB GENERATSIYA QILING:\n${validation.reason}\nSiz taqdim etayotgan kurs ishi barcha talablarga (Mundarija, Kirish, I BOB, II BOB, Xulosa, Foydalanilgan adabiyotlar) javob bersin va hech qanday to'rtburchak qavsli placeholderlar qolib ketmasin!`;
            }
          }
        } else {
          const response = await generateContentWithRotation({
            model: MODEL_NAME,
            contents: prompt,
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
        model: model || "gemini-3.5-flash",
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
               model: "gemini-3.5-flash",
               contents: contents,
               config: {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
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

// Execute startup but catch errors to prevent whole process crash
startServer().catch(err => {
  console.error("Startup error:", err);
});

