import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = "gemini-2.0-flash-lite";

async function fetchWithRetry(modelParams: any, retries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        ...modelParams,
        model: MODEL_NAME,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`AI attempt ${i + 1} failed:`, error);
      
      const errorCode = error?.code || error?.error?.code || error?.status || error?.error?.status;
      const errorMessage = (error?.message || error?.error?.message || '').toLowerCase();
      
      const isRetryable = errorCode === 500 || 
                         errorMessage.includes('xhr error') ||
                         errorMessage.includes('fetch failed') ||
                         errorMessage.includes('network error') ||
                         errorMessage.includes('rpc failed') ||
                         errorMessage.includes('deadline exceeded');
                         
      if (!isRetryable) throw error;
      if (i < retries - 1) await new Promise(res => setTimeout(res, 3000 * (i + 1)));
    }
  }
  throw lastError;
}

export async function generateTestFromTopic(topic: string, context?: string): Promise<Question[]> {
  return generateDynamicTest(topic, 10, context);
}

export async function generateDynamicTest(topic: string, count: number, context?: string): Promise<Question[]> {
  const prompt = context 
    ? `Berilgan matn: "${context}". 
       Mavzu: "${topic}".
       Ushbu matn ichidan ${count} ta o'zbek tilidagi test savollarini yarating. 
       Savollar faqat berilgan matn asosida bo'lishi shart.
       Har bir savol 4 ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (0-3) ko'rsatilishi kerak.`
    : `Mavzu: "${topic}".
       Ushbu mavzu asosida ${count} ta o'zbek tilidagi umumiy bilimga asoslangan test savollarini yarating. 
       Har bir savol 4 ta variantga ega bo'lishi va bitta to'g'ri javob indeksi (0-3) ko'rsatilishi kerak.`;

  try {
    const response = await fetchWithRetry({
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

    const text = response.text;
    const json = JSON.parse(text || "[]");
    return json;
  } catch (error) {
    console.error("AI test generation failed:", error);
    return [];
  }
}

export async function generatePresentation(topic: string, count: number): Promise<any> {
  const prompt = `Mavzu: "${topic}". 
    Ushbu mavzu bo'yicha ${count} ta slayddan iborat mukammal taqdimot (presentation) rejasini va matnini o'zbek tilida yarating. 
    Malumotlar 100% aniq va ilmiy bo'lishi kerak.
    Har bir slayd uchun: sarlavha (title) va asosiy qism matni (content) bo'lishi kerak.
    MATN UCHUN QOIDALAR:
    1. Matematik formulalar va belgilarni Markdown dagi LaTeX yordamida yozing. In-line formulalar uchun $...$ va alohida qator formulalar uchun $$...$$ foydalaning (masalan, $\\pi$, $r^2$, $E=mc^2$). Kasrlar uchun $\\frac{a}{b}$ ishlating.
    2. Slaydlar ichida mavzuga mos 1 ta AI grafik yoki rasm joylashtiring. Buning uchun Markdown rasm formatidan foydalanib, uning manbasini (URL) quyidagidek bering:
       ![grafik nomi](https://image.pollinations.ai/prompt/{rasm_haqida_inglizcha_promtingiz}?width=800&height=600&nologo=true)
    3. Agar qulay bo'lsa, ma'lumotlarni jadvallar (Markdown tables) ko'rinishida bering. 
    Javob JSON formatida bo'lsin.`;

  try {
    const response = await fetchWithRetry({
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

    const text = response.text;
    const json = JSON.parse(text || "[]");
    return json;
  } catch (error) {
    console.error("AI presentation generation failed:", error);
    return [];
  }
}
export async function generateDocument(
  topic: string, 
  docType: 'kurs_ishi' | 'dars_ishlanma' | 'hisobot' | 'maqola',
  options?: {
    pageCount?: number;
    context?: string;
    journalType?: 'international' | 'uzbekistan';
  }
): Promise<{title: string, content: string}> {
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
    const journalReqs = options?.journalType === 'international' 
      ? "Xalqaro ilmiy jurnallar talablari (Abstract, Keywords, Introduction, Methods, Results, Discussion, References)"
      : "O'zbekiston (OAK) talablari (Annotatsiya, Tayanch so'zlar, Kirish, Asosiy qism, Xulosa, Adabiyotlar)";
    
    prompt = `Mavzu: "${topic}". 
Jurnal turi: ${options?.journalType === 'international' ? 'Xalqaro' : 'O\'zbekiston (OAK)'}.
Ushbu mavzu bo'yicha ilmiy "Maqola" (Article) tayyorlang. O'zbek tilida bo'lishi shart.
Belgalangan jurnal turi uchun barcha standard talablarga (IMRAD va h.k.) javob bersin.
Javob faqat JSON formatida bo'lsin.`;
  }

  try {
    const response = await fetchWithRetry({
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

    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("AI document generation failed:", error);
    return { title: '', content: 'Xatolik yuz berdi. Iltimos qaytadan urining.' };
  }
}

export async function generateDynamicCourse(topic: string): Promise<any> {
    const prompt = `Mavzu: "${topic}".
    Ushbu mavzu bo'yicha to'liq kurs rejasini va mazmunini o'zbek tilida yarating.
    Kurs kamida 4 ta moduldan iborat bo'lsin.
    Har bir modul uchun: sarlavha (title) va to'liq o'quv kontenti (Markdown formatida) bo'lishi kerak.
    Javob JSON formatida bo'lsin.`;

  try {
    const response = await fetchWithRetry({
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

    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("AI course generation failed:", error);
    return null;
  }
}
