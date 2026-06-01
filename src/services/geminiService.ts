import { Question } from "../types";

export async function generateDynamicTest(topic: string, count: number, context?: string): Promise<Question[]> {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateDynamicTest", topic, count, context })
    });
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error in generateDynamicTest proxy:", error);
    return [];
  }
}

export async function generatePresentation(topic: string, count: number): Promise<any[]> {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generatePresentation", topic, count })
    });
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error in generatePresentation proxy:", error);
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
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateDocument", topic, docType, options })
    });
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error in generateDocument proxy:", error);
    return { title: topic, content: 'Xatolik yuz berdi. Iltimos qaytadan urining.' };
  }
}

export async function generateDynamicCourse(topic: string): Promise<any> {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateDynamicCourse", topic })
    });
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error in generateDynamicCourse proxy:", error);
    return null;
  }
}
