import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRotation, getGeminiKeysPool } from "./src/lib/gemini";
import dotenv from "dotenv";
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

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Launch the Telegram bot silently in the background
  launchBot();

  app.use(express.json());

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
      
      const keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        return res.status(500).json({ error: "Gemini API kaliti topilmadi (Serverda sozlanmagan)." });
      }

      const MODEL_NAME = "gemini-2.5-flash"; // More stable version

      if (action === "generateDynamicTest") {
        const prompt = context 
          ? `Berilgan matn: "${context}". 
             Mavzu: "${topic}".
             Ushbu matn ichidan ${count || 10} ta o'zbek tilidagi test savollarini yarating. 
             Savollar faqat berilgan matn asosida bo'lishi shart.
             Har bir savol 4 ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (0-3) ko'rsatilishi kerak.`
          : `Mavzu: "${topic}".
             Ushbu mavzu asosida ${count || 10} ta o'zbek tilidagi umumiy bilimga asoslangan test savollarini yarating. 
             Har bir savol 4 ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (0-3) ko'rsatilishi kerak.`;

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
          Ushbu mavzu bo'yicha doimiy 15 ta slide-dan iborat o'ta professional, zamonaviy va mukammal taqdimot (presentation) rejasini va matnini o'zbek tilida tayyorlang.
          
          AVVAL TAQDIMOT REJASI VA QAYSIDIR SHABLONGA MOSLIGINI ANIQLAB OLING.
          Siz quyidagi 5 ta Premium taqdimot shablonidan eng mos keladiganini tanlashingiz va buttun taqdimotni shu uslubda yaratishingiz kerak:
          1. "Business" - Chuqur ko'k va tilla tuslar, moliyaviy, biznes va rasmiy taqdimotlar uchun maqbul.
          2. "Education" - Yashil, jigarrang va qum ranglari, ta'lim, darslik, seminar va ilm-fan mavzulari uchun juda mos.
          3. "Minimal" - Oq va to'q kulrang, klassik Shvetsariya (Vite) dizayni, nafislik va chuqur minimalizm shinavandalari uchun.
          4. "Modern" - To'q koinot kuli fonida yaltiroq binafsharang va havorang neon tuslari, IT, SaaS va startaplar uchun.
          5. "Creative" - Shaftoli guli, malina va to'q sarg'ish tuslar, san'at, ijod, marketing va dizayn taqdimotlari uchun.

          AI oddiy matnli slaydlar yaratmasin. Har bir slayd professional dizayn (layouts) bilan turlicha va estetik boy bo'lishi kerak.
          Hech qanday "Rasm uchun joy" yoki placeholder matnlari bo'lmasin. Slaydga mos keladigan yuqori aniqlikdagi rasm yoki infografika uchun Inglizcha so'z turkumlarida qidirish kalit so'zlarini (imageKeyword) bering!

          Slayd turlari (layouts) unumli foydalanilsin:
          - "cover" - Titul sahifasi (Taqdimot boshlanishi, asosan birinchi slayd uchun)
          - "agenda" - Mundarija sahifasi (asosan ikkinchi slayd uchun)
          - "content" - Oddiy ma'lumotli sahifa (sarlovha, subtitli, qisqa paragraflar va bullet points)
          - "image-left" - Chap tomonda rasm/grafik va o'ng tomonda matn
          - "image-right" - O'ng tomonda rasm/grafik va chap tomonda matn
          - "cards" - Infografik kartochkalar (kamida 3-4 ta elementli qisqa kartalar shaklida ma'lumot)
          - "summary" - Xulosa / Yakunlash sahifasi, o'ta tushunarli vizual ko'rinishda.
          
          Statistik ma'lumotlar bo'lsa diagrammalar (chartData) qaytarilsin.
          Qaytariladigan JSON tarkibida "template" (yuqoridagilardan biri), "designPlan" (rang palitrasi va uslub tushuntirishi) va 15 ta elementdan iborat "slides" ro'yxati qaytarilsin. Javob faqat JSON formatida bo'lsin.`;

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
                  description: "Presentation template choice: 'Business', 'Education', 'Minimal', 'Modern', 'Creative'" 
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
                        description: "Slide layout: cover, agenda, content, image-left, image-right, cards, summary" 
                      },
                      title: { type: Type.STRING },
                      subtitle: { type: Type.STRING },
                      content: { type: Type.STRING, description: "Qisqa, aniq va lo'nda tahrirbop ilmiy-ommabop matn" },
                      bulletPoints: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "Asosiy nuqtalar, cards tarkibi yoki timeline etaplari uchun 3-4 ta gap"
                      },
                      imageKeyword: { 
                        type: Type.STRING, 
                        description: "Slayd sarlavhasiga mos vizual Inglizcha qidiruv so'zi (placeholder emas!), masalan: 'abstract financial chart blue background', 'students coding in university classroom'" 
                      },
                      iconType: {
                        type: Type.STRING,
                        description: "Slaydga mos keluvchi mavhum ikonka nomi: 'growth', 'idea', 'connection', 'book', 'globe', 'people', 'team', 'doc', 'trophy'"
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
                        description: "Statistik malumotlar uchun oddiy diagramma ma'lumotlari shakllantirilsa"
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

        const json = parseJSONResponse(response.text, { template: "Modern", slides: [] });
        return res.json(json);

      } else if (action === "generateDocument") {
        let prompt = '';
        if (docType === "kurs_ishi") {
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
          prompt = `Ma'lumotlar: "${topic}". 
          Ushbu mavzu/ma'lumotlar asosida mukammal va professional Ilmiy Tezis (Thesis/Abstract) tayyorlang. O'zbek tilida, ilmiy uslubda.
          Tarkibi:
          1. Sarlavha (Mavzu nomi)
          2. Muallif(lar) va Ilmiy rahbar haqida ma'lumot (namuna sifatida kiritiladi, foydalanuvchi keyinchalik o'zgartirishi mumkin)
          3. Annotatsiya (O'zbek va Ingliz tillarida qisqacha ma'lumot)
          4. Kalit so'zlar (5-8 ta asosiy ilmiy atama)
          5. Kirish va O'rganilganlik darajasi
          6. Asosiy Qism (Metodlar, amaliy natijalar, tahlillar)
          7. Xulosa (Tadqiqot yakuniy natijalari)
          8. Foydalanilgan Adabiyotlar ro'yxati (Kamida 3-5 ta asosiy manba)
          Tezis to'liq va barcha ilmiy me'yorlarga javob beradigan professional darajada yozilsin.`;
        } else if (docType === "maqola") {
          prompt = `Ma'lumotlar: "${topic}". 
          Ushbu mavzu/ma'lumotlar asosida nufuzli ilmiy jurnallar (OAK yoki xalqaro Scopus/Web of Science) talablariga mos keladigan professional darajadagi nufuzli ilmiy Maqola yarating. O'zbek tilida, rasmiy va yuqori ilmiy uslubda.
          Tarkibi:
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
          prompt = `Matn: "${topic}".
          Ushbu matnni xalqaro tarjimonlik darajasida tarjima qilib bering. Matn qay tilida ekanligini o'zingiz aniqlab ushbu matnni O'zbek tiliga erkin tarjima qiling (yoki agar matn O'zbekcha bo'lsa Ingliz tiliga tarjima qilib ber).`;
        } else if (docType === 'dars_ishlanma') {
          prompt = `Mavzu: "${topic}". Ushbu mavzu bo'yicha maktab yoki universitet uchun 1 soatlik (45-80 min) batafsil "Dars ishlanmasi" (Lesson plan) tayyorlang. O'zbek tilida bo'lishi shart.
     Darsning maqsadi, jihozlari, mavzu bayoni, o'qitish metodlari, mashqlar va uy vazifasi to'liq yozilsin.
     Javob faqat JSON formatida bo'lsin.`;
        } else if (docType === 'hisobot') {
          prompt = `Mavzu: "${topic}". 
     Birlamchi ma'lumotlar: "${options?.context || ''}".
     Ushbu ma'lumotlar asosida mukammal va kengaytirilgan "Hisobot" (Report) tayyorlang. O'zbek tilida, rasmiy uslubda bo'lishi shart.
     Berilgan qilingan/rejalashtirilgan ishlar haqidagi qisqa matnni professional va ilmiy darajaga ko'taring.
     Javob faqat JSON formatida bo'lsin.`;
        } else if (docType === 'maqola') {
          prompt = `Mavzu: "${topic}". 
     Jurnal turi: ${options?.journalType === 'international' ? 'Xalqaro' : 'O\'zbekiston (OAK)'}.
     Ushbu mavzu bo'yicha ilmiy "Maqola" (Article) tayyorlang. O'zbek tilida bo'lishi shart.
     Belgalangan jurnal turi uchun barcha standard talablarga (IMRAD va h.k.) javob bersin.
     Javob faqat JSON formatida bo'lsin.`;
        } else if (docType === 'tezis') {
          prompt = `Mavzu: "${topic}". 
     Ushbu mavzu bo'yicha ilmiy "Tezis" (Thesis/Abstract) tayyorlang. O'zbek tilida bo'lishi shart.
     Tezis qisqa, lo'nda va ilmiy bo'lsin (Imlo qoidalari, maqsad, uslublar, natijalar va xulosa).
     Javob faqat JSON formatida bo'lsin.`;
        } else if (docType === 'tarjimon') {
          prompt = `Matn: "${topic}". 
     Ushbu matnni o'zbek tiliga (agar boshqa tilda bo'lsa) yoki o'zbek tilidan ingliz/rus tillariga (agar o'zbekchada bo'lsa) tarjima qiling. 
     Professional tarjima bo'lsin.
     Javob faqat JSON formatida bo'lsin.`;
        }

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

        const json = parseJSONResponse(response.text, {});
        return res.json(json);

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
      const keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        return res.status(500).json({ error: "Gemini API kalitlari topilmadi." });
      }

      const response = await generateContentWithRotation({
        model: model || "gemini-2.5-flash",
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
               model: "gemini-2.5-flash",
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
      let errMsg = error.message || "Xatolik yuz berdi";
      if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
        errMsg = "API kaliti yaroqsiz. Iltimos, AI Studio sozlamalari orqali to'g'ri Gemini API kalitini o'rnating.";
      } else if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errMsg = "Hozirda aqlli yordamchimiz biroz band yoki tanaffusda ☕️. Iltimos, bir necha daqiqadan so'ng qayta so'rab ko'ring. Tez orada u sizga bajonidil yordam beradi!";
      }
      res.status(500).json({ error: errMsg });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

