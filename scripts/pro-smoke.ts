/**
 * Builds a .docx and a .pptx from fixture data — no network, no API keys.
 * Run with:  npm run pro:smoke
 * Output lands in ./data/pro-smoke/ so you can open the files and eyeball formatting.
 */

import fs from "node:fs";
import path from "node:path";
import { buildCourseworkDocx } from "../src/pro/docx";
import { buildDeckPptx } from "../src/pro/pptx";
import type {
  SlideContent,
  SlideLayout,
  WrittenCoursework,
  WrittenDeck,
} from "../src/pro/types";

const para = (n: number): string =>
  Array.from(
    { length: n },
    (_, i) =>
      `Bu ${i + 1}-band matni. Iqtisodiy ko'rsatkichlar tahlili shuni ko'rsatadiki, ` +
      `kichik biznes subyektlarining ulushi **sezilarli darajada** oshgan. ` +
      `Mazkur jarayon bir qator omillar bilan izohlanadi va uzoq muddatli tendensiyani aks ettiradi.`,
  ).join("\n\n");

const coursework: WrittenCoursework = {
  topic: "O'zbekistonda kichik biznesni rivojlantirish yo'llari",
  subject: "Iqtisodiyot nazariyasi",
  docLang: "uz",
  meta: {
    university: "Toshkent davlat iqtisodiyot universiteti",
    faculty: "Iqtisodiyot fakulteti",
    department: "Iqtisodiyot nazariyasi kafedrasi",
    direction: "5230100 — Iqtisodiyot",
    group: "IQT-21-01",
    student: "Malikov B.",
    supervisor: "Karimov A.",
    city: "Toshkent",
  },
  intro: para(3),
  chapters: [
    {
      title: "Kichik biznesning nazariy asoslari",
      sections: [
        { title: "Kichik biznes tushunchasi va mohiyati", body: para(4) },
        {
          title: "Xorijiy tajriba tahlili",
          body: `${para(2)}\n\n- birinchi omil\n- ikkinchi omil\n- uchinchi omil`,
        },
      ],
    },
    {
      title: "Amaldagi holat tahlili",
      sections: [{ title: "Statistik ko'rsatkichlar dinamikasi", body: para(4) }],
    },
  ],
  conclusion: para(2),
  references: [
    "O'zbekiston Respublikasining «Tadbirkorlik faoliyati erkinligining kafolatlari to'g'risida»gi Qonuni.",
    "O'zbekiston Respublikasi Statistika agentligi. Yillik statistik to'plam. — Toshkent.",
    "Porter M. Competitive Strategy. — New York: Free Press.",
  ],
};

/** Every field filled, so the fixture matches what the model is asked to return. */
function slide(partial: Partial<SlideContent> & { layout: SlideLayout; title: string }): SlideContent {
  return {
    subtitle: "",
    items: [],
    itemsRight: [],
    labelLeft: "",
    labelRight: "",
    stats: [],
    chartType: "none",
    chartCategories: [],
    chartValues: [],
    chartUnit: "",
    source: "",
    note: "",
    ...partial,
  };
}

const deck: WrittenDeck = {
  topic: "O'zbekistonda kichik biznesni rivojlantirish yo'llari",
  subject: "Iqtisodiyot nazariyasi",
  docLang: "uz",
  author: "Malikov B.",
  slides: [
    slide({
      layout: "bullets",
      title: "Muammoning qo'yilishi",
      items: [
        "Kichik biznes YaIMning uchdan bir qismini tashkil etadi va o'sishda davom etmoqda",
        "Moliyaviy resurslarga kirish imkoniyati asosiy to'siq bo'lib qolmoqda",
        "Tadqiqot maqsadi — rivojlantirishning amaliy yo'llarini asoslash",
      ],
      note: "Muammoning dolzarbligini bir jumlada ta'kidlang.",
    }),
    slide({
      layout: "section",
      title: "Nazariy asoslar",
      subtitle: "Tushuncha, tasnif va xorijiy tajriba",
    }),
    slide({
      layout: "stats",
      title: "Asosiy ko'rsatkichlar",
      stats: [
        { value: "32%", label: "YaIMdagi ulushi" },
        { value: "1,8 mln", label: "Ro'yxatdan o'tgan subyektlar" },
        { value: "76%", label: "Bandlikdagi ulushi" },
      ],
      source: "Manba: Statistika agentligi ma'lumotlari asosida",
      note: "Uchta raqamni ketma-ket emas, bittasini tanlab urg'ulang.",
    }),
    slide({
      layout: "cards",
      title: "Rivojlanishning to'rt omili",
      items: [
        "Moliyaviy resurslarga arzon va tezkor kirish",
        "Soliq yukining bashoratliligi",
        "Malakali kadrlar tayyorlash tizimi",
        "Eksport bozorlariga chiqish infratuzilmasi",
      ],
      note: "Har bir kartani bir jumla bilan izohlang.",
    }),
    slide({
      layout: "chart",
      title: "Subyektlar soni dinamikasi",
      chartType: "bar",
      chartCategories: ["2020", "2021", "2022", "2023", "2024"],
      chartValues: [1.32, 1.44, 1.58, 1.69, 1.81],
      chartUnit: "mln ta",
      source: "Manba: Statistika agentligi ochiq ma'lumotlari",
      note: "O'sish sur'ati oxirgi ikki yilda sekinlashganiga e'tibor qarating.",
    }),
    slide({
      layout: "chart",
      title: "Tarmoqlar bo'yicha taqsimot",
      chartType: "pie",
      chartCategories: ["Savdo", "Xizmat ko'rsatish", "Sanoat"],
      chartValues: [46, 34, 20],
      chartUnit: "%",
      source: "Manba: tarmoq kesimidagi rasmiy hisobot",
      note: "Savdoning ustunligi tarkibiy muammoni ko'rsatadi.",
    }),
    slide({
      layout: "compare",
      title: "Afzalliklar va cheklovlar",
      labelLeft: "Afzalliklari",
      labelRight: "Cheklovlari",
      items: [
        "Bozor o'zgarishlariga tez moslashuvchanlik",
        "Yangi ish o'rinlarini arzon yaratish",
        "Mahalliy talabga yaqinlik",
      ],
      itemsRight: [
        "Uzoq muddatli kreditlarning yetishmasligi",
        "Menejment malakasining pastligi",
        "Eksport tajribasining cheklanganligi",
      ],
      note: "O'ng ustundagi birinchi bandni asosiy to'siq sifatida ajrating.",
    }),
    slide({
      layout: "process",
      title: "Qo'llab-quvvatlash mexanizmi",
      items: [
        "Biznes g'oyani baholash",
        "Kafolat fondi orqali kredit",
        "Mentorlik va o'qitish",
        "Eksportga chiqish",
      ],
      subtitle: "Har bir bosqich keyingisiga o'tish uchun aniq mezonlarga ega bo'lishi kerak.",
      note: "Bosqichlar orasidagi o'tish mezonlariga urg'u bering.",
    }),
    slide({
      layout: "quote",
      title: "Qonuniy ta'rif",
      items: [
        "Kichik tadbirkorlik subyektlari — xodimlarining o'rtacha yillik soni va yillik aylanmasi qonun hujjatlarida belgilangan me'yorlardan oshmaydigan yuridik va jismoniy shaxslardir.",
      ],
      source: "Tadbirkorlik faoliyati erkinligining kafolatlari to'g'risidagi Qonun",
      note: "Ta'rifni o'qib bermang — asosiy mezonni ayting.",
    }),
  ],
};

async function main(): Promise<void> {
  const outDir = path.resolve("data/pro-smoke");
  fs.mkdirSync(outDir, { recursive: true });

  const files: [string, Buffer][] = [
    ["pro-smoke.docx", await buildCourseworkDocx(coursework)],
    ["pro-smoke.pptx", await buildDeckPptx(deck)],
  ];

  for (const [name, buffer] of files) {
    const target = path.join(outDir, name);
    fs.writeFileSync(target, buffer);
    // Both formats are ZIP containers; "PK" is the cheap validity check.
    const magic = buffer.subarray(0, 2).toString("latin1");
    const verdict = magic === "PK" ? "OK " : "BAD";
    console.log(`${verdict} ${name.padEnd(12)} ${String(buffer.length).padStart(8)} bytes  ${target}`);
    if (magic !== "PK") process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
