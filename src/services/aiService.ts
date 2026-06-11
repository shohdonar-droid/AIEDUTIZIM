const MODEL_NAME = "gemini-3.5-flash";

export type ServiceType = 'course_work' | 'independent_work' | 'presentation' | 'test_builder' | 'article';

interface GenerateOptions {
  type: ServiceType;
  topic: string;
  pages?: number;
  additionalText?: string;
}

async function fetchWithRetry(prompt: string, retries = 3): Promise<string> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    let response: Response | undefined;
    try {
      response = await fetch('/api/raw-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: MODEL_NAME })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseE) {
        if (response && !response.ok) {
          throw new Error(responseText || "Bo'sh javob qaytdi yoki barcha kalitlar limiti tugagan.");
        }
        throw new Error("Javob formati noto'g'ri shakllandi.");
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Bo'sh javob qaytdi yoki barcha kalitlar limiti tugagan.");
      }
      if (!data.text) {
        throw new Error("Bo'sh javob qaytdi.");
      }
      return data.text;
    } catch (error: any) {
      lastError = error;
      
      const errorMessage = (error?.message || '').toLowerCase();
      
      const isRetryable = response?.status === 500 || 
                         errorMessage.includes('xhr error') ||
                         errorMessage.includes('fetch failed') ||
                         errorMessage.includes('network error') ||
                         errorMessage.includes('rpc failed') ||
                         errorMessage.includes('deadline exceeded');
      
      if (!isRetryable) throw error;
      
      if (i < retries - 1) {
        // Longer wait for retry
        await new Promise(res => setTimeout(res, 3000 * (i + 1))); 
      }
    }
  }
  throw lastError;
}

export async function generateAIDocument({ type, topic, pages = 5, additionalText }: GenerateOptions): Promise<string> {
  let prompt = "";
  const countLabel = type === 'presentation' ? `${pages} ta slayd` : `${pages} varaq`;

  switch (type) {
    case 'course_work':
      prompt = `Mavzu: "${topic}". Ushbu mavzu bo'yicha ilmiy jihatdan juda aniq, mukammal va chuqur tahlil qilingan ${countLabel}li FAQAT BITTA KURS ISHINI (kurs loyihasini) tayyorlang. 
      TUZILISHI:
      1. Mundarija.
      2. Kirish (mavzuning dolzarbligi, maqsadi, vazifalari).
      3. Asosiy boblar (har bir bobda ilmiy tahlil, nazariy va amaliy qismlar).
      4. Xulosa.
      5. Foydalanilgan adabiyotlar (kamida 10 ta haqiqiy manba).
      DIQQAT: Ma'lumotlarni takrorlamang, faqat bir nusxada mukammal qilib tayyorlang. Markdown formatida javob bering.`;
      break;
    case 'independent_work':
      prompt = `Mavzu: "${topic}". Ushbu mavzu bo'yicha ilmiy ${countLabel}li FAQAT BITTA MUSTAQIL ISH tayyorlang. 
      Mazmun boy va qiziqarli bo'lishi, mavzuning mohiyatini to'liq ochib berishi kerak. 
      TUZILISHI: Reja, Kirish, Asosiy qism (tahlil), Xulosa. 
      DIQQAT: Ma'lumotlarni takrorlamang. Markdown formatida javob bering.`;
      break;
    case 'presentation':
      prompt = `Mavzu: "${topic}". Taqdimot uchun ${countLabel}dan iborat mukammal va kontentga boy FAQAT BITTA TAQDIMOT REJASI tayyorlang. 
      Har bir slayd uchun:
      - Sarlavha (Title)
      - Matn (Bullet points, kamida 4-5 ta)
      - [IMAGE_QUERY: mavzuga mos ingliz tilidagi qisqa qidiruv so'zi]
      DIQQAT: Ma'lumotlarni takrorlamang. Markdown formatida javob bering.`;
      break;
    case 'test_builder':
      const qCount = pages; // In test builder context, pages means number of questions
      const contextText = additionalText ? `QUYIDAGI MATN ASOSIDA:\n${additionalText}\n\n` : `Mavzu: "${topic}"\n\n`;
      prompt = `${contextText} Ushbu ma'lumotlar asosida jami ${qCount} ta mukammal va ilmiy aniq test savoli tayyorlang. 
      Javobni quyidagi maxsus formatda bering (bu juda muhim!):
      ++++ Savol matni
      ====
      Noto'g'ri javob 1
      ====
      #To'g'ri javob
      ====
      Noto'g'ri javob 2
      ====
      Noto'g'ri javob 3
      
      Har bir savolni alohida ++++ bilan boshlang. Savollarni takrorlamang.`;
      break;
    case 'article':
      prompt = `Mavzu: "${topic}". Mukammal ilmiy maqola tayyorlang (${countLabel}). 
      TARKIBI: Annotatsiya (o'zbek va ingliz tillarida), Kalit so'zlar, Kirish, Metodologiya, Natijalar, Muhokama va Xulosa. 
      DIQQAT: Ma'lumotlarni takrorlamang. Ma'lumotlar ilmiy jihatdan asoslangan va akademik uslubda faqat bir nusxada bo'lishi shart. Markdown formatida javob bering.`;
      break;
  }

  try {
    return await fetchWithRetry(prompt);
  } catch (error) {
    throw error;
  }
}
