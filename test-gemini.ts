import { generateContentWithRotation } from "./src/lib/gemini";
import dotenv from "dotenv";
import { Type } from "@google/genai";

dotenv.config();

const count = 15;
const topicStr = "Mavzu: IT sohasi. Slaydlar soni: 15. Dizayn turi: Zamonaviy. Qo'shimcha talablar: -";
const prompt = `Mavzu: "${topicStr}".
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

generateContentWithRotation({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        template: { type: Type.STRING },
        designPlan: { type: Type.STRING },
        slides: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              layout: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              content: { type: Type.STRING },
              bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              imageKeyword: { type: Type.STRING },
              iconType: { type: Type.STRING },
              chartType: { type: Type.STRING },
              chartData: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.NUMBER }
                  },
                  required: ["label", "value"]
                }
              }
            },
            required: ["layout", "title"]
          }
        }
      },
      required: ["template", "slides"]
    }
  }
}).then(res => {
  console.log("Success:", !!res.text);
}).catch(console.error);
