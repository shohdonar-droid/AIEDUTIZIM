/**
 * Telegram entry points for the Pro (Claude) services.
 *
 * Kept out of telegram.ts so the integration there stays a handful of lines.
 * Nothing here imports telegram.ts — the bits that need it (the reply keyboard,
 * the refund) arrive as hooks, which keeps the dependency one-directional.
 */

import { proQueue } from "./limiter.js";
import { proIsConfigured } from "./config.js";
import { generateCoursework, generateDeck } from "./generate.js";
import { buildCourseworkDocx } from "./docx.js";
import { buildDeckPptx } from "./pptx.js";
import type { DocLang, OrderSpec } from "./types.js";

export interface ProHooks {
  /** Reply keyboard to restore once the job ends, either way. */
  keyboard: () => Promise<any>;
  /** Give the balance back. Called on every failure path that already charged. */
  refund: () => Promise<void>;
}

/** Wizard answers are free text; anything unrecognised falls back to Uzbek. */
export function docLangOf(input: string | undefined): DocLang {
  const s = (input || "").toLowerCase();
  if (s.includes("rus") || s.includes("рус")) return "ru";
  if (s.includes("ingliz") || s.includes("engl") || s.includes("англ")) return "en";
  return "uz";
}

function safeName(s: string | undefined, fallback: string): string {
  const cleaned = (s || fallback).substring(0, 40).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

/**
 * Edits one status message in place instead of spamming the chat.
 * Throttled: Telegram rejects rapid edits, and a stalled percentage is
 * less alarming than a flood of near-identical messages.
 */
function progressReporter(ctx: any, chatId: number, messageId: number, title: string) {
  let lastEditAt = 0;
  let lastPercent = -1;
  return async (percent: number, stage: string) => {
    const now = Date.now();
    if (percent === lastPercent) return;
    if (now - lastEditAt < 3000 && percent < 100) return;
    lastEditAt = now;
    lastPercent = percent;
    const filled = Math.round(percent / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    try {
      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        `${title}\n\n<code>${bar}</code> ${percent}%\n<i>${stage}</i>\n\nIltimos kuting.`,
        { parse_mode: "HTML" },
      );
    } catch (e) {
      // "message is not modified" and rate limits are both non-fatal here.
    }
  };
}

/** Shared shell: config check, queue admission, progress, refund-on-failure. */
async function runProJob(
  ctx: any,
  hooks: ProHooks,
  opts: {
    title: string;
    errorLabel: string;
    build: (report: (p: number, s: string) => Promise<void>) => Promise<{ buffer: Buffer; filename: string; caption: string }>;
  },
): Promise<any> {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;

  if (!proIsConfigured()) {
    await hooks.refund();
    return ctx.reply(
      "⚠️ <b>Pro xizmati hozircha mavjud emas.</b>\n\nMablag'ingiz qaytarildi. Iltimos keyinroq urinib ko'ring.",
      { parse_mode: "HTML", reply_markup: { keyboard: await hooks.keyboard(), resize_keyboard: true } },
    );
  }

  const ahead = proQueue.queueAhead();
  const queueNote = ahead > 0 ? `\n\n<i>Navbatda: ${ahead} ta buyurtma oldingizda.</i>` : "";
  const loadingMsg = await ctx.reply(`${opts.title}${queueNote}\n\nIltimos kuting.`, { parse_mode: "HTML" });

  let release: (() => void) | null = null;
  try {
    release = await proQueue.acquire(userId);
    const report = progressReporter(ctx, chatId!, loadingMsg.message_id, opts.title);
    const { buffer, filename, caption } = await opts.build(report);

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
    await ctx.replyWithDocument({ source: buffer, filename }, { caption, parse_mode: "HTML" });

    return ctx.reply("🤖 <b>Kerakli xizmatni menyudan tanlang:</b>", {
      parse_mode: "HTML",
      reply_markup: { keyboard: await hooks.keyboard(), resize_keyboard: true },
    });
  } catch (err: any) {
    console.error(`[${opts.errorLabel}]`, err);
    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});
    // The balance was taken before the wizard started, so a failure here has to
    // give it back — otherwise the user pays for nothing.
    await hooks.refund();
    return ctx.reply(
      `❌ <b>${opts.errorLabel} xatolik yuz berdi.</b>\n\n` +
        `<i>${(err?.message || "Noma'lum xato").toString().substring(0, 300)}</i>\n\n` +
        `💰 Mablag'ingiz balansingizga qaytarildi.`,
      { parse_mode: "HTML", reply_markup: { keyboard: await hooks.keyboard(), resize_keyboard: true } },
    );
  } finally {
    release?.();
  }
}

export async function runProCourseWorkGeneration(ctx: any, data: any, hooks: ProHooks) {
  const pages = Math.max(10, Math.min(120, parseInt(String(data.pageCount || "30").replace(/\D/g, ""), 10) || 30));

  return runProJob(ctx, hooks, {
    title: "💎 <b>Pro kurs ishi tayyorlanmoqda</b>",
    errorLabel: "Pro kurs ishi yaratishda",
    build: async (report) => {
      const spec: OrderSpec = {
        type: "coursework",
        topic: data.topic || "Mavzu ko'rsatilmadi",
        subject: data.subject || "",
        pages,
        slides: 0,
        docLang: "uz",
        outline: null,
        meta: {
          university: data.university,
          faculty: data.faculty,
          department: data.department,
          direction: data.direction,
          student: data.studentName,
          supervisor: data.advisor,
          city: data.city || "Toshkent",
          year: data.year || "2026",
        },
      };

      const doc = await generateCoursework(spec, report);
      await report(95, "Word hujjati shakllantirilmoqda");
      const buffer = await buildCourseworkDocx(doc);

      return {
        buffer,
        filename: `Pro_kurs_ishi_${safeName(data.topic, "mavzu")}_${safeName(data.studentName, "talaba")}.docx`,
        caption:
          `💎 <b>PRO KURS ISHI TAYYOR!</b>\n\n` +
          `📌 <b>Mavzu:</b> ${doc.topic}\n` +
          `🎓 <b>Talaba:</b> ${data.studentName || "Ko'rsatilmadi"}\n` +
          `🏛 <b>OTM:</b> ${data.university || "Ko'rsatilmadi"}\n` +
          `📑 <b>Hajmi:</b> ~${pages} sahifa, ${doc.chapters.length} ta bob\n\n` +
          `✨ <i>Claude asosida tayyorlangan kengaytirilgan Pro versiya.</i>`,
      };
    },
  });
}

export async function runProPresentationGeneration(ctx: any, data: any, hooks: ProHooks) {
  const slides = Math.max(5, Math.min(40, parseInt(String(data.slideCount || "15").replace(/\D/g, ""), 10) || 15));
  const docLang = docLangOf(data.language);

  return runProJob(ctx, hooks, {
    title: "💎 <b>Pro slayd tayyorlanmoqda</b>",
    errorLabel: "Pro slayd yaratishda",
    build: async (report) => {
      const spec: OrderSpec = {
        type: "slides",
        topic: data.topic || "Mavzu ko'rsatilmadi",
        subject: "",
        pages: 0,
        slides,
        docLang,
        outline: null,
        meta: { student: data.author },
      };

      const deck = await generateDeck(spec, report);
      await report(95, "PowerPoint fayli shakllantirilmoqda");
      const buffer = await buildDeckPptx(deck);

      return {
        buffer,
        filename: `Pro_slayd_${safeName(data.topic, "mavzu")}.pptx`,
        caption:
          `💎 <b>PRO SLAYD TAYYOR!</b>\n\n` +
          `📌 <b>Mavzu:</b> ${deck.topic}\n` +
          `📊 <b>Slaydlar:</b> ${deck.slides.length} ta\n\n` +
          `✨ <i>Claude asosida tayyorlangan kengaytirilgan Pro versiya.</i>`,
      };
    },
  });
}
