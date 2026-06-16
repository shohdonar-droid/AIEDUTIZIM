import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Smartphone, 
  Check, 
  X as CloseIcon, 
  AlertTriangle, 
  User, 
  Phone, 
  Send, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Layout, 
  ShieldCheck, 
  Compass, 
  Clock, 
  Users, 
  GraduationCap, 
  Building2, 
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  category: string;
}

export default function InteractivePresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    { id: 1, title: "SKYLEARN", subtitle: "Aqlni oʻstiruvchi smart taʼlim platformasi", category: "KIRISH" },
    { id: 2, title: "Muammo", subtitle: "Anʼanaviy taʼlim tizimidagi asosiy muammolar", category: "MUAMMO" },
    { id: 3, title: "Skylearn AI Yechimlari", subtitle: "Sunʼiy intellekt yordamida taʼlimni shaxsiylashtirish", category: "YECHIM" },
    { id: 4, title: "Foydalanuvchilar Uchun Foyda", subtitle: "Har bir subyekt uchun individual samaradorlik", category: "FOYDA" },
    { id: 5, title: "Raqobatchilar Tahlili", subtitle: "Bozordagi boshqa tizimlar bilan solishtirish", category: "TAHLIL" },
    { id: 6, title: "Amalga Oshirish Bosqichlari", subtitle: "6 oylik strategik harakatlar rejasi", category: "REJA" },
    { id: 7, title: "Moliyaviy Reja", subtitle: "Loyiha xarajatlari va investitsiya taqsimoti", category: "BYUDJET" },
    { id: 8, title: "Kutilayotgan Natijalar", subtitle: "Loyiha muvaffaqiyatining asosiy koʻrsatkichlari", category: "KPI" },
    { id: 9, title: "Loyiha Muallifi & Aloqa", subtitle: "Sirojiddinov Odiljon Ilxomjonovich", category: "ALOQA" }
  ];

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Function to download the presentation as a highly styled standalone HTML file
  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SKYLEARN Taqdimoti – AIEDUTIZIM</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #f8fafc;
    }
    .slide-card {
      page-break-after: always;
      break-after: page;
    }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .slide-card {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 2rem !important;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
    }
  </style>
</head>
<body class="p-4 md:p-8">
  <div class="max-w-4xl mx-auto space-y-12 mb-20">
    
    <!-- PDF Print Header -->
    <div class="no-print bg-blue-600 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight">SKYLEARN TAQDIMOTI (Eksport versiyasi)</h1>
        <p class="text-blue-100 text-sm font-semibold mt-1">Ushbu faylni brauzerning chop etish menyusi (Ctrl + P) orqali PDF formatida saqlashingiz mumkin.</p>
      </div>
      <button onclick="window.print()" class="px-6 py-3.5 bg-white text-blue-600 font-extrabold rounded-2xl flex items-center gap-2 hover:bg-blue-50 transition-all font-mono text-xs uppercase tracking-wider">
        🖨️ PDF-ga Yuklash / Chop etish
      </button>
    </div>

    <!-- Slide 1 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden min-h-[500px] flex flex-col justify-between">
      <div class="absolute -right-24 -top-24 w-80 h-80 bg-blue-50 rounded-full filter blur-3xl opacity-50"></div>
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 01</span>
        <span class="text-xs font-bold text-gray-400 font-mono">SKYLEARN AI</span>
      </div>
      <div class="my-auto py-10 text-center">
        <h2 class="text-6xl font-black text-gray-900 tracking-tight mb-4">SKYLEARN</h2>
        <div class="w-24 h-2 bg-blue-600 mx-auto rounded-full mb-6"></div>
        <p class="text-2xl font-bold text-blue-600 uppercase tracking-widest mb-12">AQLNI O‘STIRUVCHI SMART TA’LIM PLATFORMASI</p>
        <p class="text-lg font-black text-slate-500 uppercase tracking-wide">Loyiha Muallifi: ODILJON SIROJIDDINOV</p>
      </div>
      <div class="border-t border-gray-100 pt-6 flex justify-between text-xs font-bold text-gray-400 uppercase">
        <span>O'zbekistonda sun'iy intellektga asoslangan 1-ta'lim tizimi</span>
        <span>2026</span>
      </div>
    </div>

    <!-- Slide 2 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 02</span>
        <span class="text-xs font-bold text-gray-400 font-mono">MUAMMO</span>
      </div>
      <div class="my-auto py-6">
        <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-8">Anʼanaviy taʼlim tizimidagi asosiy muammolar</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 bg-red-50/50 rounded-3xl border border-red-50">
            <span class="text-sm font-black text-red-500 font-mono uppercase tracking-widest block mb-2">01 / SHAXSIYLASHTIRILMAGAN TA’LIM</span>
            <p class="text-gray-700 font-bold leading-relaxed">Har bir talabaning o‘zlashtirish tezligi va qobiliyati turlicha bo‘lishiga qaramay, darslar va topshiriqlar barcha talabalarga bir xildagi standart shablonlarda taqdim etiladi.</p>
          </div>
          <div class="p-6 bg-red-50/50 rounded-3xl border border-red-50">
            <span class="text-sm font-black text-red-500 font-mono uppercase tracking-widest block mb-2">02 / DAVOMAT VA BAHOLASH</span>
            <p class="text-gray-700 font-bold leading-relaxed">Darslarda talabalar davomatini nazorat qilish, insho va testlarni baholash jarayoni katta mehnat, xatolikka moyillik va ko‘p vaqt yo‘qotilishiga olib keladi.</p>
          </div>
          <div class="p-6 bg-red-50/50 rounded-3xl border border-red-50">
            <span class="text-sm font-black text-red-500 font-mono uppercase tracking-widest block mb-2">03 / CHEKLANGAN TEXNOLOGIYA</span>
            <p class="text-gray-700 font-bold leading-relaxed">Mavjud o‘quv platformalari asosan ma'muriy tizim rolini o‘taydi. Haqiqiy sun'iy intellekt va EdTech texnologiyalaridan yetarli darajada foydalanilmayapti.</p>
          </div>
          <div class="p-6 bg-red-50/50 rounded-3xl border border-red-50">
            <span class="text-sm font-black text-red-500 font-mono uppercase tracking-widest block mb-2">04 / TALABALAR ISHTIROKI PASTLIGI</span>
            <p class="text-gray-700 font-bold leading-relaxed">Interaktiv, qiziqarli o‘yin uslubidagi (gamifikatsiya) o‘quv elementlarining yo‘qligi talabalarda mustaqil o‘rganishga bo‘lgan ishtiyoqni so‘ndiradi.</p>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        An'anaviy tizim talabalarning individual ehtiyojlarini to'liq qoplay olmayapti.
      </div>
    </div>

    <!-- Slide 3 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 03</span>
        <span class="text-xs font-bold text-gray-400 font-mono">YECHIM</span>
      </div>
      <div class="my-auto py-6">
        <h3 class="text-3xl font-black text-emerald-600 tracking-tight mb-2">SKYLEARN — Sun'iy intellekt yordamida ta'limni shaxsiylashtirish!</h3>
        <p class="text-gray-500 font-bold mb-8">Pedagogik jarayonlarni to'liq avtomatlashtirish va shaxsiylashtirish platformasi</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="p-5 bg-slate-50 rounded-2xl">
            <h4 class="text-base font-black text-gray-900 mb-2">🎓 Moslashuvchan Ta’lim</h4>
            <p class="text-xs text-gray-600 font-bold leading-relaxed">Har bir o‘quvchining joriy ko‘rsatkichlarini chuqur tahlil qilib, uning individual o‘zlashtirish darajasiga mos keluvchi shaxsiy o‘quv yo‘nalishi (adaptive path) yaratiladi.</p>
          </div>
          <div class="p-5 bg-slate-50 rounded-2xl">
            <h4 class="text-base font-black text-gray-900 mb-2">💬 AI Chatbot (24/7)</h4>
            <p class="text-xs text-gray-600 font-bold leading-relaxed">Talabalarning topshiriqlar, ilmiy ishlar yoki fanga doir istalgan savollariga real vaqt rejimida o‘zbek va xalqaro tillarda tushuntirish berib boruvchi aqlli yordamchi.</p>
          </div>
          <div class="p-5 bg-slate-50 rounded-2xl">
            <h4 class="text-base font-black text-gray-900 mb-2">📸 Smart Attendance</h4>
            <p class="text-xs text-gray-600 font-bold leading-relaxed">Face ID (Yuzni aniqlash) tizimi orqali dars xonalarida talabalarning davomati avtomatik va 100% ob'ektiv ravishda soniyalar ichida qayd qilinadi.</p>
          </div>
          <div class="p-5 bg-slate-50 rounded-2xl">
            <h4 class="text-base font-black text-gray-900 mb-2">📊 Progress Monitoring</h4>
            <p class="text-xs text-gray-600 font-bold leading-relaxed">Talaba o‘zlashtirish darajasi, fanlarni tamomlash tezligi va zaif nuqtalarini kuzatish uchun o‘ta batafsil grafik datchiklar tizimi o‘rnatiladi.</p>
          </div>
          <div class="p-5 bg-slate-50 rounded-2xl">
            <h4 class="text-base font-black text-gray-900 mb-2">🎮 Gamifikatsiya</h4>
            <p class="text-xs text-gray-600 font-bold leading-relaxed">Baho o‘rniga tajriba ballari (EXP), yutuqlar emblemasi (badges) hamda o‘quv guruhlari reytingi orqali talabaning ishtiroki keskin ortadi.</p>
          </div>
          <div class="p-5 bg-slate-50 rounded-2xl">
            <h4 class="text-base font-black text-gray-900 mb-2">📝 Avtomatik Baholash</h4>
            <p class="text-xs text-gray-600 font-bold leading-relaxed">Yozilgan ilmiy maqola, kurs ishi yoki insholarni sun'iy intellekt orqali imlo, plagiat va ma'no jihatidan soniyalar ichida avtomatik baholab berish.</p>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        SKYLEARN – zamonaviy ta'limni boshqarish tizimlaridan o'n qadam oldindagi texnologiya.
      </div>
    </div>

    <!-- Slide 4 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 04</span>
        <span class="text-xs font-bold text-gray-400 font-mono">FOYDALANUVCHILAR</span>
      </div>
      <div class="my-auto py-6">
        <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-8 text-center">Foydalanuvchilar uchun asosiy afzalliklar</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 bg-slate-50 rounded-3xl border border-gray-100 text-center">
            <div class="w-16 h-16 bg-blue-100 text-blue-600 flex items-center justify-center rounded-2xl mx-auto mb-4 font-black text-2xl">🧑‍🎓</div>
            <h4 class="text-xl font-black text-slate-800 mb-3">Talabalar uchun</h4>
            <ul class="text-xs text-slate-600 font-bold text-left space-y-2.5">
              <li class="flex items-start gap-2">🟢 <span>Shaxsiy fanlar bo'yicha moslashtirilgan trayektoriya.</span></li>
              <li class="flex items-start gap-2">🟢 <span>24/7 tushunarsiz mavzular bo'yicha cheksiz tushuntirish.</span></li>
              <li class="flex items-start gap-2">🟢 <span>Gamifikatsiya tizimi orqali qiziqarli o'quv muhiti.</span></li>
            </ul>
          </div>
          <div class="p-6 bg-slate-50 rounded-3xl border border-gray-100 text-center">
            <div class="w-16 h-16 bg-orange-100 text-orange-600 flex items-center justify-center rounded-2xl mx-auto mb-4 font-black text-2xl">🧑‍🏫</div>
            <h4 class="text-xl font-black text-slate-800 mb-3">Oʻqituvchilar uchun</h4>
            <ul class="text-xs text-slate-600 font-bold text-left space-y-2.5">
              <li class="flex items-start gap-2">🟠 <span>Vaqtning keskin tejalishi (baholash va davomat avtomatlashtiriladi).</span></li>
              <li class="flex items-start gap-2">🟠 <span>Haqiqiy tahliliy ma'lumotlar bazasi orqali dars sifatini o'rganish.</span></li>
              <li class="flex items-start gap-2">🟠 <span>Inson omili sababli kelib chiquvchi xatoliklarning kamayishi.</span></li>
            </ul>
          </div>
          <div class="p-6 bg-slate-50 rounded-3xl border border-gray-100 text-center">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-2xl mx-auto mb-4 font-black text-2xl">🏫</div>
            <h4 class="text-xl font-black text-slate-800 mb-3">OTMlar uchun</h4>
            <ul class="text-xs text-slate-600 font-bold text-left space-y-2.5">
              <li class="flex items-start gap-2">🟢 <span>Barcha ma'muriy va o'quv jarayonlarini optimallashtirish.</span></li>
              <li class="flex items-start gap-2">🟢 <span>Byudjet, qog'ozbozlik va inson resurslarining tejalishi.</span></li>
              <li class="flex items-start gap-2">🟢 <span>OTMning zamonaviy brendi, innovatsion raqobatbardoshligi.</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        Ekotizim barcha ta'lim ishtirokchilarining ish unumdorligini 10 barobargacha oshiradi.
      </div>
    </div>

    <!-- Slide 5 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 05</span>
        <span class="text-xs font-bold text-gray-400 font-mono">SOLISHTIRISH</span>
      </div>
      <div class="my-auto py-6 overflow-x-auto">
        <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-6">Xususiyatlar bo‘yicha raqobat elementlari</h3>
        <table class="w-full text-left text-xs font-bold divide-y divide-gray-100">
          <thead>
            <tr class="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wider">
              <th class="p-3">XUSUSIYATLAR</th>
              <th class="p-3 bg-blue-50 text-blue-600 font-black">SKYLEARN AI</th>
              <th class="p-3">HEMIS</th>
              <th class="p-3">COURSERA</th>
              <th class="p-3">EDUPAGE</th>
              <th class="p-3">DUOLINGO / BOTLAR</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr>
              <td class="p-3">AI shaxsiy tavsiya</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-amber-600">⚠️ Cheklangan</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
            </tr>
            <tr>
              <td class="p-3">Smart Attendance (Face ID)</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
            </tr>
            <tr>
              <td class="p-3">Avtomatik baholash</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-amber-600">⚠️ Qisman</td>
              <td class="p-3 text-amber-600">⚠️ Qisman</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
            </tr>
            <tr>
              <td class="p-3">Plagiat tekshiruvi</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Qo‘shilmagan</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
            </tr>
            <tr>
              <td class="p-3">24/7 Chatbot yordamchisi</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-amber-600">⚠️ Cheklangan</td>
            </tr>
            <tr>
              <td class="p-3">Gamifikatsiya (Ball, badge, reyting)</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-amber-600">🎓 Sertifikat</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-emerald-600">✅ Bor</td>
            </tr>
            <tr>
              <td class="p-3">O‘zbek tilida to‘liq xizmat</td>
              <td class="p-3 bg-blue-50/50 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-red-500">❌ Yo‘q</td>
              <td class="p-3 text-emerald-600">✅ Bor</td>
              <td class="p-3 text-amber-600">⚠️ Cheklangan</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        Skylearn mahalliy bozorda milliy tildagi ilk to'liq integrasiyalashgan sun'iy intellekt tizimidir.
      </div>
    </div>

    <!-- Slide 6 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 06</span>
        <span class="text-xs font-bold text-gray-400 font-mono">BOSQICHLAR</span>
      </div>
      <div class="my-auto py-6">
        <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-8">Amalga oshirish bosqichlari & 6 oylik strategik reja</h3>
        <div class="relative pl-6 border-l-2 border-blue-500 space-y-6">
          <div class="relative">
            <span class="absolute -left-9 top-0.5 bg-blue-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">1</span>
            <h4 class="text-base font-black text-gray-900">MVP (1 oy)</h4>
            <p class="text-xs text-slate-500 font-bold mt-1">Asosiy platformaning dars modullari, foydalanuvchilar shaxsiy kabinetlari va test yaratish funksionalligini o'z ichiga olgan boshlang'ich versiyasini ishlab chiqish.</p>
          </div>
          <div class="relative">
            <span class="absolute -left-9 top-0.5 bg-blue-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">2</span>
            <h4 class="text-base font-black text-gray-900">SINOV (1 oy)</h4>
            <p class="text-xs text-slate-500 font-bold mt-1">Platformani tanlangan OTM yoki pilot o'quv guruhlarida sinovdan o'tkazish, muammolarni yig'ish (Foydanalanuvchilar fikri).</p>
          </div>
          <div class="relative">
            <span class="absolute -left-9 top-0.5 bg-blue-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">3</span>
            <h4 class="text-base font-black text-gray-900">TAKOMILLASHTIRISH (Uzluksiz)</h4>
            <p class="text-xs text-slate-500 font-bold mt-1">AI Chatbot yordamchisiga qo'shimcha tahlili imkoniyatlar, o'zbek tili lug'at bazasi va yangi pedagogik metodik xizmatlar modullarini integratsiya qilish.</p>
          </div>
          <div class="relative">
            <span class="absolute -left-9 top-0.5 bg-blue-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">4</span>
            <h4 class="text-base font-black text-gray-900">JORIY QILISH (2 oy)</h4>
            <p class="text-xs text-slate-500 font-bold mt-1">Tizimni respublikadagi bir nechta yirik universitetlar, o'quv markazlari va maktablarga to'liq integratsiya qilish.</p>
          </div>
          <div class="relative">
            <span class="absolute -left-9 top-0.5 bg-blue-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">5</span>
            <h4 class="text-base font-black text-gray-900">MRK (Davomiy)</h4>
            <p class="text-xs text-slate-500 font-bold mt-1">Taqdimot namoyishlari (Demo-days), ta'lim grantlariga hujjat topshirish, xorijiy akselerator va investitsiya dasturlarida tizimni taqdim etish.</p>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        Tizim aniq va barqaror qadamlar bilan ta'lim bozorini egallab boradi.
      </div>
    </div>

    <!-- Slide 7 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 07</span>
        <span class="text-xs font-bold text-gray-400 font-mono">MOLIYAVIY REJA</span>
      </div>
      <div class="my-auto py-6">
        <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-8">Moliyaviy reja & Xarajatlar taqsimoti</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <span class="font-bold text-gray-800">Dasturiy ta'minot ishlab chiqish</span>
              <span class="font-mono text-blue-600 font-black">$2,500</span>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <span class="font-bold text-gray-800">AI xizmatlari integratsiyasi</span>
              <span class="font-mono text-blue-600 font-black">$1,000</span>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <span class="font-bold text-gray-800">Server va ma’lumotlar bazasi</span>
              <span class="font-mono text-blue-600 font-black">$500</span>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <span class="font-bold text-gray-800">Texnik xizmat va qo‘llab-quvvatlash</span>
              <span class="font-mono text-blue-600 font-black">$500</span>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <span class="font-bold text-gray-800">Marketing va targ‘ibot</span>
              <span class="font-mono text-blue-600 font-black">$500</span>
            </div>
          </div>
          <div class="p-8 bg-blue-600 text-white rounded-[32px] text-center space-y-4">
            <h4 class="text-lg font-black tracking-wider uppercase">JAMI TAYANCH BYUDJET</h4>
            <p class="text-6xl font-black font-mono tracking-tight">$5,000</p>
            <p class="text-blue-100 text-xs font-bold leading-relaxed">Ushbu tayanch moliyaviy sarmoya O'zbekistonda sun'iy intellektga va zamonaviy dars rejalashtirish tizimiga asoslangan birinchi modelni ishga tushirish uchun yo'naltiriladi.</p>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        Resurslar doimiy monitoring qilinadi va sarflanish samaradorligi tekshiriladi.
      </div>
    </div>

    <!-- Slide 8 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 08</span>
        <span class="text-xs font-bold text-gray-400 font-mono">NATIJALAR</span>
      </div>
      <div class="my-auto py-6">
        <h3 class="text-3xl font-black text-gray-900 tracking-tight mb-8 text-center">Kutilayotgan ijobiy natijalar</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="flex gap-4 items-start p-5 bg-indigo-50/20 rounded-2xl">
            <div class="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shrink-0 font-bold">📈</div>
            <div>
              <h4 class="text-base font-black text-slate-800">Ta’lim Sifati O'sishi</h4>
              <p class="text-xs text-slate-500 font-semibold mt-1">Har bir talabaning o'z vaqtida darslarni tushunishi, imtihon ko'rsatkichlarining o'rtacha 25-30% gacha oshishi.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start p-5 bg-indigo-50/20 rounded-2xl">
            <div class="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shrink-0 font-bold">🏢</div>
            <div>
              <h4 class="text-base font-black text-slate-800">OTMlar uchun Transformatsiya</h4>
              <p class="text-xs text-slate-500 font-semibold mt-1">Universitet va ta'lim muassasalarida butun ma'muriy jurnallar va davomat tizimini to'liq raqamlashtirish.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start p-5 bg-indigo-50/20 rounded-2xl">
            <div class="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shrink-0 font-bold">🧠</div>
            <div>
              <h4 class="text-base font-black text-slate-800">AI Savodxonlik Oshishi</h4>
              <p class="text-xs text-slate-500 font-semibold mt-1">O'qituvchilar va o'quvchilar orasida zamonaviy generativ sun'iy intellekt xizmatlaridan foydalanish amaliy darajasini oshirish.</p>
            </div>
          </div>
          <div class="flex gap-4 items-start p-5 bg-indigo-50/20 rounded-2xl">
            <div class="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shrink-0 font-bold">⚡</div>
            <div>
              <h4 class="text-base font-black text-slate-800">Samarali Ish Rejimi</h4>
              <p class="text-xs text-slate-500 font-semibold mt-1">O'qituvchilarning hisobotlar, qaydlar va tekshiruv ishlari uchun sarflaydigan behuda o'rtacha ish vaqtini qisqartirish.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        Innovatsiya ta'lim tizimini butkul yangi samaradorlik darajasiga olib chiqadi.
      </div>
    </div>

    <!-- Slide 9 -->
    <div class="slide-card bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 shadow-xl min-h-[500px] flex flex-col justify-between">
      <div class="flex justify-between items-center">
        <span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">Slayd 09</span>
        <span class="text-xs font-bold text-gray-400 font-mono">BOG'LANISH</span>
      </div>
      <div class="my-auto py-6 text-center max-w-xl mx-auto space-y-6">
        <div class="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">👤</div>
        <h3 class="text-3xl font-black text-slate-900 tracking-tight">Sirojiddinov Odiljon Ilxomjonovich</h3>
        <p class="text-blue-600 font-bold uppercase tracking-wider text-sm">Oʻzbekistonda sunʼiy intellektga asoslangan birinchi shaxsiylashtirilgan taʼlim platformasi muallifi.</p>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <div class="p-4 bg-slate-50 rounded-2xl border border-gray-100 font-mono font-bold text-slate-700">
            📞 +998 (90) 003-49-22
          </div>
          <div class="p-4 bg-slate-50 rounded-2xl border border-gray-100 font-mono font-bold text-slate-700">
            ✈️ @odiljonsirojiddinov
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-6 text-xs font-bold text-gray-400 uppercase text-center">
        Biz bilan bog'laning va ta'lim kelajagini birgalikda barpo eting!
      </div>
    </div>

  </div>
  
  <p class="no-print text-center text-xs font-black text-slate-400 uppercase tracking-widest mt-12 mb-20">© 2026 AIEDUTIZIM / SKYLEARN. BARCHA HUQUQLAR HIMOYaLANGAN.</p>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SKYLEARN_Presentation_AIEDUTIZIM.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 mt-16 border-t border-gray-100 pt-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-4 py-1 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Platforma Taqdimoti
          </span>
          <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">SKYLEARN: Smart Taʼlim Loyihasi</h3>
          <p className="text-gray-400 font-semibold text-xs mt-0.5 uppercase tracking-wider">AIEDUTIZIM Sunʼiy Intellekt Asosidagi Ekoteran Tahlili</p>
        </div>
        
        <button 
          onClick={handleDownloadHTML}
          className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" /> Taqdimotni yuklab olish
        </button>
      </div>

      {/* Slide Player Frame */}
      <div className="bg-slate-900 rounded-[32px] p-4 md:p-8 relative shadow-2xl min-h-[500px] flex flex-col justify-between overflow-hidden text-white border-4 border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30 pointer-events-none"></div>

        {/* Slide Header */}
        <div className="flex justify-between items-center z-10 border-b border-slate-800 pb-4">
          <span className="px-3.5 py-1 bg-slate-800 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono">
            {slides[currentSlide].category}
          </span>
          <span className="text-xs font-bold text-slate-500 font-mono">
            Slayd {String(currentSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
        </div>

        {/* Slide Content Rendering */}
        <div className="my-auto py-8 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Slide 1: Welcome Intro */}
              {currentSlide === 0 && (
                <div className="text-center space-y-4 py-8">
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">
                    SKYLEARN
                  </h1>
                  <div className="w-16 h-1.5 bg-blue-500 mx-auto rounded-full"></div>
                  <p className="text-sm md:text-lg font-black text-blue-400 uppercase tracking-[0.25em] max-w-xl mx-auto leading-relaxed">
                    AQLNI O‘STIRUVCHI SMART TA’LIM PLATFORMASI
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-8">
                    Loyiha Muallifi: Sirojiddinov Odiljon Ilxomjonovich
                  </p>
                </div>
              )}

              {/* Slide 2: Problematika */}
              {currentSlide === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-3xl font-black text-slate-100 tracking-tight">
                    Traditional Education Problems (Asosiy Muammolar)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { num: "01", t: "Shaxsiylashtirilmagan Ta’lim", d: "Har bir talabaning o‘zlashtirish tezligi boshqacha bo'lsa-da, darslar hamma uchun bir xil standartda to'g'ridan-to'g'ri o'tiladi." },
                      { num: "02", t: "O'ta Og'ir Davomat va Baholash", d: "Dars jurnallari, oraliq nazoratlarni baholash texnik qiyinchilik, xatoliklar va katta vaqt yo'qotilishiga olib keladi." },
                      { num: "03", t: "Texnologiyalar Cheklanganligi", d: "Mavjud OTM o'quv dasturlari va HEMIS tizimlari faqat deyarli qog'oz ma'muriyatini almashtiradi xolos, AI imkoniyatlari yo'q." },
                      { num: "04", t: "Talabalar Ishtiroki Pastligi", d: "Interfeys innovatsionlikdan yiroq bo'lgani uchun o'quv jarayoni passiv hisobotga aylanadi, motivatsiya yo'qoladi." }
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 hover:border-red-500/30 transition-all flex gap-4">
                        <span className="font-mono text-xs font-black text-red-500 bg-red-500/10 h-7 w-7 rounded-lg flex items-center justify-center shrink-0">{item.num}</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{item.t}</h4>
                          <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">{item.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slide 3: Smart Yechimlar */}
              {currentSlide === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🚀</span>
                    <div>
                      <h2 className="text-lg md:text-2xl font-black text-emerald-400 tracking-tight">Sun'iy Intellekt Asosidagi Shaxsiylashtirish</h2>
                      <p className="text-xs text-slate-400 font-bold">SKYLEARN – zamonaviy ta'limni eng yuqori darajada raqamlashtiruvchi ekotizim</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                    {[
                      { icon: "🎓", label: "Moslashuvchan Ta’lim", desc: "Individual o'quv yo'nalishi (adaptive path)" },
                      { icon: "💬", label: "AI Chatbot (24/7)", desc: "Akademik muloqot va cheksiz yordamchi" },
                      { icon: "📸", label: "Smart Attendance", desc: "Face ID orqali darslar davomatini yuritish" },
                      { icon: "📝", label: "Avtomatik Baholash", desc: "Insholar va ishlarni avtomatik baholash" },
                      { icon: "📊", label: "Progress Monitoring", desc: "Grafik panellar tahlili va ko'rsatkichlari" },
                      { icon: "🎮", label: "Gamifikatsiya", desc: "Tajriba ballari, emblema va guruh reytingi" }
                    ].map((feat, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-emerald-500/30 transition-colors">
                        <span className="text-lg">{feat.icon}</span>
                        <h4 className="font-black text-xs text-slate-200 mt-2">{feat.label}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{feat.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slide 4: Real Benefits / Foyda */}
              {currentSlide === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-black text-center text-slate-100 tracking-tight">Har bir Ishtirokchi uchun Unumdorlik Kafoalati</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🧑‍🎓</span>
                        <h4 className="font-black text-sm text-blue-400">Talabalar uchun</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Moslashtirilgan trayektoriya va qiziqarli o'yin elementlari bilan har qanday murakkab tushunchalarni yengil o'rganadi. 24/7 shaxsiy akademik ustozga ega bo'ladi.</p>
                    </div>
                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🧑‍🏫</span>
                        <h4 className="font-black text-sm text-orange-400">O'qituvchilar uchun</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Davomat olish, insho va amaliy ishlarni tekshirish kabi mexanik qora ishlardan ozod bo'lib, o'z e'tiborini talabalar bilan bevosita ishlashga va vaqt tejashga qaratadi.</p>
                    </div>
                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏫</span>
                        <h4 className="font-black text-sm text-emerald-400">OTM (Universitet) uchun</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Resurslar tejash, qog'ozbozlik va jurnallar yuritish muammolari qisqarib, yangi raqamli brendga va o'zlashtirish ob'ektiv tahlil ko'rsatkichlariga ega bo'linadi.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide 5: Raqobatchilar tahlili */}
              {currentSlide === 4 && (
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Raqobatchilar bilan solishtirish jadvali</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] divide-y divide-slate-800">
                      <thead>
                        <tr className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="p-2">Tizim Xususiyati</th>
                          <th className="p-2 bg-blue-950/40 text-blue-400 font-black">SKYLEARN AI</th>
                          <th className="p-2">HEMIS</th>
                          <th className="p-2">COURSERA</th>
                          <th className="p-2">EDUPAGE</th>
                          <th className="p-2">DUOLINGO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                        <tr>
                          <td className="p-2">AI orqali tavsiya</td>
                          <td className="p-2 bg-blue-950/20 text-emerald-400 font-black">✔ Bor</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-amber-400">⚠ Cheklangan</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                        </tr>
                        <tr>
                          <td className="p-2">Face ID davomat</td>
                          <td className="p-2 bg-blue-950/20 text-emerald-400 font-black">✔ Bor</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                        </tr>
                        <tr>
                          <td className="p-2">Avtomatik baholash</td>
                          <td className="p-2 bg-blue-950/20 text-emerald-400 font-black">✔ Bor</td>
                          <td className="p-2 text-amber-400">⚠ Qisman</td>
                          <td className="p-2 text-amber-400">⚠ Qisman</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                        </tr>
                        <tr>
                          <td className="p-2">Plagiat tekshiruvi</td>
                          <td className="p-2 bg-blue-950/20 text-emerald-400 font-black">✔ Bor</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo'q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                        </tr>
                        <tr>
                          <td className="p-2">24/7 Chatbot</td>
                          <td className="p-2 bg-blue-950/20 text-emerald-400 font-black">✔ Bor</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-red-405">✖ Yo‘q</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-amber-400">⚠ Cheklangan</td>
                        </tr>
                        <tr>
                          <td className="p-2">O‘zbek tilida to‘liq xizmat</td>
                          <td className="p-2 bg-blue-950/20 text-emerald-400 font-black">✔ Bor</td>
                          <td className="p-2 text-emerald-400">✔ Bor</td>
                          <td className="p-2 text-red-400">✖ Yo‘q</td>
                          <td className="p-2 text-emerald-400">✔ Bor</td>
                          <td className="p-2 text-amber-400">⚠ Cheklangan</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Slide 6: Roadmap Bosqichlar */}
              {currentSlide === 5 && (
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">6 Oylik Strategik Harakatlar Rejasi</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                    {[
                      { t: "MVP", p: "1 Oy", d: "Asosiy modullar va foydalanuvchi interfeysini tugatish." },
                      { t: "Sinov", p: "1 Oy", d: "Platformani tanlangan OTM(lar)da jiddiy testdan o'tkazish." },
                      { t: "Takomillashtir.", p: "Davomiy", d: "AIdagi kamchiliklarni to'g'irlash va funksiyalar qo'shish." },
                      { t: "Joriy qilish", p: "2 Oy", d: "Tizimni bir qator yangi hamkor OTMlarga integratsiya qilish." },
                      { t: "MRK", p: "Uzluksiz", d: "Demo-days, davlat grantlari, investitsiya akseleratorlari." }
                    ].map((step, sIdx) => (
                      <div key={sIdx} className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 relative">
                        <span className="text-[9px] font-black font-mono text-blue-400 absolute right-3 top-3 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase">{step.p}</span>
                        <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">{step.t}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-2.5 leading-relaxed">{step.d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slide 7: Finance Plan */}
              {currentSlide === 6 && (
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Xarajatlar Turlari & Moliyaviy Reja</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-1 gap-2 font-semibold text-xs">
                      {[
                        { name: "Dasturiy ta'minot ishlab chiqish", price: "$2,500" },
                        { name: "AI xizmatlari integratsiyasi", price: "$1,000" },
                        { name: "Server va ma’lumotlar bazasi", price: "$500" },
                        { name: "Texnik xizmat va qo‘llab-quvvatlash", price: "$500" },
                        { name: "Marketing va targ‘ibot", price: "$500" },
                      ].map((item, xIdx) => (
                        <div key={xIdx} className="flex justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                          <span className="text-slate-300">{item.name}</span>
                          <span className="text-blue-400 font-mono font-black">{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-blue-600 rounded-3xl flex flex-col justify-center items-center text-center space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-100">JAMI TALAB QILINADIGAN SARMOYA</span>
                      <h3 className="text-4xl md:text-5xl font-black font-mono text-white">$5,000</h3>
                      <p className="text-[10px] text-blue-100 leading-relaxed font-bold">Ushbu tayanch summasi tizimning minimal ishchi (MVP) modelini yo'lga qo'yib, o'quv yurtlariga barqaror yetkazish xarajatlarini to'liq qoplab beradi.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slide 8: Kutilayotgan natijalar */}
              {currentSlide === 7 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight text-center">Loyiha Muvaffaqiyatining Asosiy Ko'rsatkichlari (KPI)</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: "📉", title: "Samaraling Ish Vaqti", d: "O'qituvchilarning qaydlar, testlar ustida deyarli 40% behuda vaqtini tejash." },
                      { icon: "🏫", title: "Raqamli OTM", d: "Ma'muriy jurnallar va davomat tizimini to'la raqamlashtirish." },
                      { icon: "⚡", title: "AI-Savodxonlik Sifati", d: "Kadr va talabalarning generative AI platformalaridan to'g'ri foydalanish darajasi." },
                      { icon: "📈", title: "Oliy Ta'lim Sifati", d: "Individual moslashuvchan reja evaziga o'rtacha imtihon ko'rsatkichlarining tubdan o'sishi." }
                    ].map((idx, idy) => (
                      <div key={idy} className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex gap-3">
                        <span className="text-xl bg-slate-800 h-9 w-9 rounded-lg flex items-center justify-center shrink-0">{idx.icon}</span>
                        <div>
                          <h4 className="font-black text-xs text-slate-200">{idx.title}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">{idx.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slide 9: Executive Business Card Contact */}
              {currentSlide === 8 && (
                <div className="max-w-xl mx-auto p-6 bg-slate-800/40 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full border border-blue-500/30 flex items-center justify-center font-black text-3xl text-blue-400 shrink-0">
                    👤
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h3 className="text-lg font-black text-white">Sirojiddinov Odiljon Ilxomjonovich</h3>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider">O‘zbekistondagi 1-shaxsiylashtirilgan ta’lim platformasi muallifi</p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 text-[10px] font-mono text-slate-400 font-semibold">
                      <span className="px-3 py-1 bg-slate-800 rounded-lg flex items-center justify-center gap-1"><Phone className="w-3.5 h-3.5 text-blue-400" /> +998 (90) 003-49-22</span>
                      <a href="https://t.me/odiljonsirojiddinov" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-blue-400 rounded-lg flex items-center justify-center gap-1 transition-colors"><Send className="w-3.5 h-3.5 text-blue-400" /> @odiljonsirojiddinov</a>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slide Controls Footer */}
        <div className="flex justify-between items-center z-10 border-t border-slate-850 pt-4 mt-8">
          <button
            onClick={handlePrev}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-wider"
          >
            <ChevronLeft className="w-4 h-4" /> Oldingi
          </button>
          
          {/* Bullets indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-blue-500 w-8' : 'bg-slate-700 w-2 hover:bg-slate-600'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-wider"
          >
            Keyingi <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
