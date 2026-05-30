import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
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

      const systemInstruction = `Siz ushbu o'quv platformasining aqlli yordamchisisiz. Barcha savollarga aniq, to'g'ri va xushmuomalalik bilan o'zbek tilida javob bering. Siz har qanday mavzudagi savollarga (shuningdek ta'lim va tizimga oid bolmagan savollarga ham) batafsil javob bera olasiz.`;
      
      let fullPrompt = "";
      if (history && Array.isArray(history)) {
          for (const msg of history) {
              fullPrompt += `\n${msg.role === 'user' ? 'Foydalanuvchi' : 'Siz'}: ${msg.text}`;
          }
      }
      fullPrompt += `\nFoydalanuvchi: ${prompt}\nSiz:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Gemini API xatosi:", error);
      let errMsg = error.message || "Xatolik yuz berdi";
      if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
        errMsg = "API kaliti yaroqsiz. Iltimos, AI Studio sozlamalari orqali to'g'ri Gemini API kalitini o'rnating.";
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
