import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRotation, getGeminiKeysPool } from "./src/lib/gemini";
import dotenv from "dotenv";
import { launchBot } from "./telegram";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Launch the Telegram bot silently in the background
  launchBot();

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { action, topic, count, context, docType, options } = req.body;
      
      const keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        return res.status(500).json({ error: "Gemini API kaliti topilmadi (Serverda sozlanmagan)." });
      }

      const MODEL_NAME = "gemini-3.5-flash";

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

        const json = JSON.parse(response.text || "[]");
        return res.json(json);

      } else if (action === "generatePresentation") {
        const prompt = `Mavzu: "${topic}". 
          Ushbu mavzu bo'yicha ${count || 5} ta slayddan iborat mukammal taqdimot (presentation) rejasini va matnini o'zbek tilida yarating. 
          Malumotlar 100% aniq va ilmiy bo'lishi kerak.
          Har bir slayd uchun: sarlavha (title) va asosiy qism matni (content) bo'lishi kerak.
          MATN UCHUN QOIDALAR:
          1. Matematik formulalar va belgilarni Markdown dagi LaTeX yordamida yozing. In-line formulalar uchun $...$ va alohida qator formulalar uchun $$...$$ foydalaning (masalan, $\\pi$, $r^2$, $E=mc^2$). Kasrlar uchun $\\frac{a}{b}$ ishlating.
          2. Slaydlar ichida mavzuga mos 1 ta AI grafik yoki rasm joylashtiring. Buning uchun Markdown rasm formatidan foydalanib, uning manbasini (URL) quyidagidek bering:
             ![grafik nomi](https://image.pollinations.ai/prompt/{rasm_haqida_inglizcha_promtingiz}?width=800&height=600&nologo=true)
          3. Agar qulay bo'lsa, ma'lumotlarni jadvallar (Markdown tables) ko'rinishida bering. 
          Javob JSON formatida bo'lsin.`;

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
                  title: { type: Type.STRING },
                  content: { type: Type.STRING, description: "Markdown formatida asosiy matn" }
                },
                required: ["title", "content"]
              }
            }
          }
        });

        const json = JSON.parse(response.text || "[]");
        return res.json(json);

      } else if (action === "generateDocument") {
        let prompt = '';
        if (docType === 'kurs_ishi') {
          prompt = `Mavzu: "${topic}". 
     Ushbu mavzu bo'yicha mukammal va to'liq "Kurs ishi" (Coursework) tayyorlang. 
     O'zbek tilida, ilmiy uslubda bo'lishi shart.
     Varaqlar soni (taxminan): ${options?.pageCount || 20} varaq kabi juda keng qamrovli va batafsil bo'lsin.
     Reja: Kirish, bir nechta boblar (har biri bir necha paragraflar bilan), Xulosa va Foydalanilgan adabiyotlar ruyxati bo'lishi kerak.
     Matematik va fizik formulalarni LaTeX yordamida yozing.
     Javob faqat JSON formatida bo'lsin.`;
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

        const json = JSON.parse(response.text || "{}");
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

        const json = JSON.parse(response.text || "{}");
        return res.json(json);
      } else {
        return res.status(400).json({ error: "Noma'lum amal" });
      }

    } catch (error: any) {
      console.error("[Backend Gemini API Error]:", error);
      return res.status(500).json({ error: error.message || "Xatolik yuz berdi" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, userName, isAdminMode, systemContext, functionResponses, lastFunctionCall } = req.body;
      
      const keysPool = getGeminiKeysPool();
      if (keysPool.length === 0) {
        return res.status(500).json({ error: "Gemini API kaliti topilmadi (Serverda sozlanmagan)." });
      }

      let systemInstruction = `Siz ushbu o'quv platformasining aqlli yordamchisisiz. Siz suhbatlashayotgan foydalanuvchining ismi: ${userName || 'Mehmon'}. Barcha savollarga aniq, to'g'ri va xushmuomalalik bilan o'zbek tilida javob bering, suhbatni boshida uning ismi bilan murojaat qiling.`;

      if (isAdminMode) {
         systemInstruction = `Siz tizim administratorining bosh yordamchisisiz. Administrator ismi: ${userName}. 
Sizda tizimdagi ma'lumotlarni o'qish va ma'lum amallarni bajarish (masalan, foydalanuvchilar sonini bilish, ularning ro'yxatini olish, tug'ilgan kuni bo'lganlarni ko'rish, testlarni faollashtirish, quizlar yaratish) uchun maxsus funksiyalar (tools) mavjud.
Agar admin tizim haqida so'rasa, albatta ushbu funksiyalarni chaqiring yoki taqdim etilgan joriy tizim ma'lumotlaridan foydalaning. Funksiya natijasini olgach, o'zbek tilida chiroyli va aniq qilib adminga hisobot bering. Agar funksiya chaqiruvi so'ralsa, uni bajaring.`;
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

      if (lastFunctionCall) {
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
              functionCall: { name: call.name, args: call.args }
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

