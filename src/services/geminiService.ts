import { Question } from "../types";

async function handleErrorRes(res: Response, fallback: string): Promise<never> {
  let errMsg = fallback;
  try {
    const text = await res.text();
    try {
      const errData = JSON.parse(text);
      if (errData && errData.error) {
        errMsg = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
      }
    } catch (_) {
      // Not JSON, probably Vercel HTML
      errMsg = `Server xatosi: HTTP ${res.status}. ${text.substring(0, 150).replace(/<[^>]*>?/gm, ' ').trim()}`;
    }
  } catch (_) {}
  throw new Error(errMsg);
}

export async function generateDynamicTest(topic: string, count: number, context?: string): Promise<Question[]> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generateDynamicTest", topic, count, context })
  });
  if (!res.ok) {
    await handleErrorRes(res, `Test yaratishda xatolik: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("AI mos keladigan test savollarini yarata olmadi. Iltimos mavzuni aniqroq kiritib yoki keyinroq qayta urinib ko'ring.");
  }
  return data;
}

export async function generatePresentation(topic: string, count: number): Promise<any[]> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generatePresentation", topic, count })
  });
  if (!res.ok) {
    await handleErrorRes(res, `Taqdimot yaratishda xatolik: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data || !data.slides || data.slides.length === 0) {
    throw new Error("AI mos keladigan taqdimot slaydlarini yarata olmadi.");
  }
  return data;
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
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generateDocument", topic, docType, options })
  });
  if (!res.ok) {
    await handleErrorRes(res, `Hujjat yaratishda xatolik: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function generateDynamicCourse(topic: string): Promise<any> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generateDynamicCourse", topic })
  });
  if (!res.ok) {
    await handleErrorRes(res, `Kurs yaratishda xatolik: HTTP ${res.status}`);
  }
  return await res.json();
}

