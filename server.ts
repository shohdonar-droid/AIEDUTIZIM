import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, userName } = req.body;
      
      const apiKey = process.env.NEW_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API kaliti topilmadi (Serverda sozlanmagan)." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Simple implementation: send history as text, or just a single prompt.
      // We will map history to the content format Gemini expects if needed, 
      // but the easiest is simply sending a system instruction and the user prompt, 
      // maybe prefixing previous chat context to the prompt if history is small.

      const systemInstruction = `Siz ushbu o'quv platformasining aqlli yordamchisisiz. Siz suhbatlashayotgan foydalanuvchining ismi: ${userName || 'Mehmon'}. Barcha savollarga aniq, to'g'ri va xushmuomalalik bilan o'zbek tilida javob bering, suhbatni boshida uning ismi bilan murojaat qiling (agar ismini ishlatish zarur va mos kelsa).
Siz har qanday mavzudagi savollarga (shuningdek ta'lim va tizimga oid bolmagan savollarga xam) batafsil javob bera olasiz. Har qanday masala bo'yicha boshida qisqa va aniq ma'lumot bering. Agar foydalanuvchi ko'proq tafsilot so'rasa yoki chuqurroq tushuntirish so'rasa, kengroq va to'liqroq ma'lumotli qilib kengaytirib bering.

Tizim haqida va tizim imkoniyatlari haqida ma'lumot so'ralsa, quyidagilarni aytib o'ting (hozirgi o'quv platformasining to'liq mazmuni shulardan iborat, qisqacha ta'riflang):
1. Kurslar: Foydalanuvchilar turli xil kurslarni ko'rishlari va o'rganishlari mumkin.
2. Testlar va Quizizz: Bilimni sinab ko'rish uchun interaktiv testlar va Quizizz mashqlari mavjud.
3. Jurnal va Baholar: Talabalar o'z baholarini va o'zlashtirishini kuzatib borishlari mumkin.
4. Sertifikatlar: Kurslarni muvaffaqiyatli tugatganlarga sertifikatlar beriladi va ularni tekshirish tizimi mavjud.
5. Chat va Murojaatlar: Foydalanuvchilar adminlar, o'qituvchilar yoki boshqa foydalanuvchilar bilan chat orqali muloqot qilishlari va murojaat qoldirishlari mumkin.
6. Xizmatlar va Ma'lumotlar: Saytdagi qo'shimcha xizmatlar va yangiliklar bilan tanishish imkoniyati bor.
Agar foydalanuvchi ma'muriyat (admin) bilan bevosita bog'lanish istagini bildirsa (masalan, "Admin bilan bog'lanmoqchiman", "Admin kerak"), unga "Bog'lanish" sahifasiga o'tishni maslahat bering va ushbu linkni yuboring: /contact . U yerdan to'g'ridan-to'g'ri xabar qoldirishlari mumkinligini ayting.`;
      
      let fullPrompt = "";
      if (history && Array.isArray(history)) {
          for (const msg of history) {
              fullPrompt += `\n${msg.role === 'user' ? (userName || 'Foydalanuvchi') : 'Siz'}: ${msg.text}`;
          }
      }
      fullPrompt += `\n${userName || 'Foydalanuvchi'}: ${prompt}\nSiz:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
        }
      });

      let replyText = response.text || "";
      if (!replyText && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        replyText = response.candidates[0].content.parts[0].text;
      }

      if (!replyText) {
        throw new Error("Sun'iy intellektdan bo'sh javob qaytdi. Iltimos, qaytadan urinib ko'ring yoki boshqa savol berib ko'ring.");
      }

      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Gemini API xatosi:", error);
      let errMsg = error.message || "Xatolik yuz berdi";
      if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
        errMsg = "API kaliti yaroqsiz. Iltimos, AI Studio sozlamalari orqali to'g'ri Gemini API kalitini o'rnating.";
      } else if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errMsg = "Kechirasiz, sun'iy intellekt xizmatiga ayni vaqtda juda ko'p so'rov yuborildi (Kvota tugallangan). Iltimos, birozdan so'ng hisobingiz so'rovlarni yana qabul qilganda qayta urinib ko'ring.";
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
