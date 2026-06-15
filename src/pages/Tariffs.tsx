import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  Zap, 
  Check, 
  Cpu, 
  MessageSquare, 
  Calculator, 
  PlusCircle, 
  Users, 
  TrendingUp,
  ShieldCheck,
  Award,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";

interface TariffConfig {
  price?: number;
  students?: number;
  staff?: number;
  hasAI?: boolean;
  hasBot?: boolean;
  
  // CORPORATE pricing per unit
  basePrice?: number;
  perStudent?: number;
  perStaff?: number;
  aiPrice?: number;
  botPrice?: number;
}

interface AllTariffsConfig {
  start: TariffConfig;
  standard: TariffConfig;
  professional: TariffConfig;
  corporate: TariffConfig;
  extra: TariffConfig;
}

// Default fallbacks matching user pricing requirements
const defaultTariffs: AllTariffsConfig = {
  start: {
    price: 300000,
    students: 50,
    staff: 2,
    hasAI: false,
    hasBot: false
  },
  standard: {
    price: 700000,
    students: 200,
    staff: 5,
    hasAI: false,
    hasBot: true
  },
  professional: {
    price: 1500000,
    students: 1000,
    staff: 20,
    hasAI: true,
    hasBot: true
  },
  corporate: {
    basePrice: 500000,
    perStudent: 1000,
    perStaff: 10000,
    aiPrice: 300000,
    botPrice: 200000
  },
  extra: {
    perStudent: 1500,
    perStaff: 15000,
    aiPrice: 350000,
    botPrice: 250000
  }
};

export default function Tariffs() {
  const [configs, setConfigs] = useState<AllTariffsConfig>(defaultTariffs);
  const [loading, setLoading] = useState(true);

  // Corporate calculator state
  const [corpCalc, setCorpCalc] = useState({
    students: 1000,
    staff: 20,
    ai: true,
    bot: true,
  });

  // Extra limits calculator state
  const [extraCalc, setExtraCalc] = useState({
    students: 100,
    staff: 5,
    ai: true,
    bot: true,
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const snap = await getDoc(doc(db, "settings", "tariffs"));
        if (snap.exists()) {
          setConfigs({ ...defaultTariffs, ...snap.data() } as AllTariffsConfig);
        }
      } catch (err) {
        console.warn("Failed to load tariffs config from Firestore, using defaults", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const calcCorpPrice = () => {
    const base = configs.corporate.basePrice ?? 500000;
    const stdPrice = corpCalc.students * (configs.corporate.perStudent ?? 1000);
    const staffPrice = corpCalc.staff * (configs.corporate.perStaff ?? 10000);
    const aiPrice = corpCalc.ai ? (configs.corporate.aiPrice ?? 300000) : 0;
    const botPrice = corpCalc.bot ? (configs.corporate.botPrice ?? 200000) : 0;
    return base + stdPrice + staffPrice + aiPrice + botPrice;
  };

  const calcExtraPrice = () => {
    const stdPrice = extraCalc.students * (configs.extra.perStudent ?? 1500);
    const staffPrice = extraCalc.staff * (configs.extra.perStaff ?? 15000);
    const aiPrice = extraCalc.ai ? (configs.extra.aiPrice ?? 350000) : 0;
    const botPrice = extraCalc.bot ? (configs.extra.botPrice ?? 250000) : 0;
    return stdPrice + staffPrice + aiPrice + botPrice;
  };

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
      {/* Header section with Centered styling */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <span className="px-4 py-2 rounded-full text-xs font-black bg-blue-50 text-blue-600 tracking-widest uppercase inline-block">
          Biznesingiz uchun eng yaxshi yechim
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
          Tariflar Rejalari & Limitlar
        </h1>
        <p className="text-gray-500 font-bold text-lg leading-relaxed">
          Oʻzingizning tashkilotingiz uchun mos tarifni tanlang. Agarda sizga kattaroq imkoniyatlar kerak boʻlsa, 
          maxsus hisoblagichlarimiz orqali oʻzingiz istagan limitlarni kiriting va narxlarni real vaqtda hisoblatib oling!
        </p>
      </div>

      {/* Grid of Standard Tariffs : START, STANDARD, PROFESSIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* START */}
        <div className="p-8 rounded-[40px] border-2 border-gray-100 hover:border-orange-200 transition-all bg-white relative group flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-4xl">🥉</span>
              <span className="px-3 py-1 bg-orange-50 rounded-full text-[10px] font-black text-orange-500 uppercase tracking-widest border border-orange-100">START</span>
            </div>
            <h3 className="text-2xl font-black text-gray-950 mb-2">START TARIF</h3>
            <div className="text-3xl font-black text-orange-600 mb-6 font-mono">
              {(configs.start.price ?? 300000).toLocaleString()} <span className="text-sm font-black text-gray-400">so'm/oy</span>
            </div>
            
            <p className="text-gray-400 text-sm font-bold mb-6">Kichik guruhlar va individual oʻqituvchilar uchun ideal boshlang'ich paket.</p>
            
            <ul className="space-y-4 mb-8">
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.students ?? 50} ta-talabalar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.staff ?? 2} ta-xodimlar (o'qituvchi)
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> Murakkab testlar va guruhlar boshqaruvi
              </li>
              <li className="text-sm font-bold text-gray-400 flex items-center gap-3 line-through">
                <XIcon /> Telegram guruh va kanallari uchun bot
              </li>
              <li className="text-sm font-bold text-gray-400 flex items-center gap-3 line-through">
                <XIcon /> Sun'iy Intellekt orqali test generatsiyasi
              </li>
            </ul>
          </div>
          <button className="w-full py-4 bg-gray-50 text-gray-800 rounded-2xl font-black hover:bg-orange-600 hover:text-white hover:shadow-lg transition-all uppercase text-sm tracking-wider">Tashkilotga ulash</button>
        </div>

        {/* STANDARD */}
        <div className="p-8 rounded-[40px] border-2 border-blue-600 bg-white relative group flex flex-col justify-between shadow-xl shadow-blue-50">
          <div className="absolute -top-4 right-10 bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">Ommabop</div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-4xl">🥈</span>
              <span className="px-3 py-1 bg-blue-50 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">STANDARD</span>
            </div>
            <h3 className="text-2xl font-black text-gray-950 mb-2">STANDARD TARIF</h3>
            <div className="text-3xl font-black text-blue-600 mb-6 font-mono">
              {(configs.standard.price ?? 700000).toLocaleString()} <span className="text-sm font-black text-gray-400">so'm/oy</span>
            </div>
            
            <p className="text-gray-400 text-sm font-bold mb-6">Oʻrta hajmdagi oʻquv markazlari va guruhlar boshqaruvi uchun keng qamrovli tizim.</p>
            
            <ul className="space-y-4 mb-8">
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.students ?? 200} ta-talabalar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.staff ?? 5} ta-xodimlar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> Excel hisobotlar va tahliliy jadvallar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> Telegram Bot integratsiyasi (+A'zolar boshqaruvi)
              </li>
              <li className="text-sm font-bold text-gray-400 flex items-center gap-3 line-through">
                <XIcon /> Sun'iy Intellekt orqali test generatsiyasi
              </li>
            </ul>
          </div>
          <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all uppercase text-sm tracking-wider">Tashkilotga ulash</button>
        </div>

        {/* PROFESSIONAL */}
        <div className="p-8 rounded-[40px] border-2 border-gray-100 hover:border-amber-200 transition-all bg-white relative group flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-4xl">🥇</span>
              <span className="px-3 py-1 bg-amber-50 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest border border-amber-100">PROFESSIONAL</span>
            </div>
            <h3 className="text-2xl font-black text-gray-950 mb-2">PROFESSIONAL TARIF</h3>
            <div className="text-3xl font-black text-amber-500 mb-6 font-mono">
              {(configs.professional.price ?? 1500000).toLocaleString()} <span className="text-sm font-black text-gray-400">so'm/oy</span>
            </div>
            
            <p className="text-gray-400 text-sm font-bold mb-6">Katta oʻquv maskanlari va ilgʻor AI-innovatsiyalardan foydalanuvchi brendlar uchun.</p>
            
            <ul className="space-y-4 mb-8">
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.students ?? 1000} ta-talabalar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.staff ?? 20} ta-xodimlar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> VIP shaxsiy Telegram Bot boshqaruvi
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> Sun'iy Intellekt (AI) yordamida tezkor testlar va darslar yaratish
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> Shaxsiy sertifikatlar tizimi va QR kodli tekshirishlar
              </li>
            </ul>
          </div>
          <button className="w-full py-4 bg-gray-50 text-gray-800 rounded-2xl font-black hover:bg-amber-500 hover:text-white hover:shadow-lg transition-all uppercase text-sm tracking-wider">Tashkilotga ulash</button>
        </div>

      </div>

      {/* Dynamic Interactive Plans Section */}
      <div className="space-y-12">
        <div className="text-center space-y-2">
           <h2 className="text-3xl font-black text-gray-950">Maxsus Tuziladigan Moslanuvchan Tariflar</h2>
           <p className="text-gray-400 font-bold text-sm">Oʻz limitlaringizni kiriting, kalkulyator qolganini hisobladi!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* 👑 CORPORATE CALCULATOR */}
          <div className="bg-slate-900 text-white rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group border-4 border-slate-800">
             <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-105 transition-transform">
                <Calculator className="w-48 h-48" />
             </div>
             
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4">
                   <span className="text-4xl">👑</span>
                   <div>
                      <h3 className="text-2xl font-black">CORPORATE</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Istagan miqdordagi limitlarni kiriting</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Talabalar sonini kiriting ({configs.corporate.perStudent ?? 1000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.students}
                          onChange={(e) => setCorpCalc({...corpCalc, students: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-slate-400">ta</span>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Xodimlar sonini kiriting ({configs.corporate.perStaff ?? 10000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.staff}
                          onChange={(e) => setCorpCalc({...corpCalc, staff: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-slate-400">ta</span>
                      </div>
                   </div>

                   {/* AI module */}
                   <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                      <span className="text-xs font-bold text-slate-200">AI Test Generator (+{(configs.corporate.aiPrice ?? 300000).toLocaleString()} sum/oy)</span>
                      <input 
                        type="checkbox" 
                        checked={corpCalc.ai}
                        onChange={(e) => setCorpCalc({...corpCalc, ai: e.target.checked})}
                        className="w-6 h-6 rounded-lg accent-blue-500 shrink-0 cursor-pointer" 
                      />
                   </div>

                   {/* Bot module */}
                   <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                      <span className="text-xs font-bold text-slate-200">Shaxsiy Telegram Bot (+{(configs.corporate.botPrice ?? 200000).toLocaleString()} sum/oy)</span>
                      <input 
                        type="checkbox" 
                        checked={corpCalc.bot}
                        onChange={(e) => setCorpCalc({...corpCalc, bot: e.target.checked})}
                        className="w-6 h-6 rounded-lg accent-blue-500 shrink-0 cursor-pointer" 
                      />
                   </div>
                </div>

                <div className="bg-slate-850 p-6 rounded-3xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Jami oylik to'lov:</p>
                      <div className="text-3xl sm:text-4xl font-black text-green-400 font-mono mt-1">
                        {calcCorpPrice().toLocaleString()} <span className="text-sm font-black text-slate-300">sum/oy</span>
                      </div>
                   </div>
                   <button className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg">Shartnoma Tuzish</button>
                </div>
             </div>
          </div>

          {/* ➕ EXTRA LIMITS CALCULATOR */}
          <div className="bg-emerald-950 text-white rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group border-4 border-emerald-900">
             <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-48 h-48" />
             </div>
             
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4">
                   <span className="text-4xl">➕</span>
                   <div>
                      <h3 className="text-2xl font-black">EXTRA LIMITS</h3>
                      <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Joriy oyingizga qoʻshimcha limit sotib oling</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                        Qoʻshimcha talabalar ({configs.extra.perStudent ?? 1500} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-emerald-900 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={extraCalc.students}
                          onChange={(e) => setExtraCalc({...extraCalc, students: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-emerald-400">ta</span>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                        Qoʻshimcha xodimi ({configs.extra.perStaff ?? 15000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-emerald-950 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={extraCalc.staff}
                          onChange={(e) => setExtraCalc({...extraCalc, staff: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-emerald-400">ta</span>
                      </div>
                   </div>

                   <div className="flex items-center justify-between p-4 bg-emerald-900/40 rounded-2xl border border-emerald-800/50 hover:bg-emerald-900 transition-all">
                      <span className="text-xs font-bold text-emerald-200">AI / Darsliklar qoʻshimcha (+{(configs.extra.aiPrice ?? 350000).toLocaleString()} sum/oy)</span>
                      <input 
                        type="checkbox" 
                        checked={extraCalc.ai}
                        onChange={(e) => setExtraCalc({...extraCalc, ai: e.target.checked})}
                        className="w-6 h-6 rounded-lg accent-green-500 shrink-0 cursor-pointer" 
                      />
                   </div>

                   <div className="flex items-center justify-between p-4 bg-emerald-900/40 rounded-2xl border border-emerald-800/50 hover:bg-emerald-900 transition-all">
                      <span className="text-xs font-bold text-emerald-200">Xabar yuborish / Bot (+{(configs.extra.botPrice ?? 250000).toLocaleString()} sum/oy)</span>
                      <input 
                        type="checkbox" 
                        checked={extraCalc.bot}
                        onChange={(e) => setExtraCalc({...extraCalc, bot: e.target.checked})}
                        className="w-6 h-6 rounded-lg accent-green-500 shrink-0 cursor-pointer" 
                      />
                   </div>
                </div>

                <div className="bg-emerald-900/50 p-6 rounded-3xl border border-emerald-800 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">Bir martalik jami summa:</p>
                      <div className="text-3xl sm:text-4xl font-black text-green-400 font-mono mt-1">
                        {calcExtraPrice().toLocaleString()} <span className="text-sm font-black text-emerald-300">sum</span>
                      </div>
                   </div>
                   <button className="w-full md:w-auto px-8 py-4 bg-white text-emerald-950 font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg">Faollashtirish</button>
                </div>
                <p className="text-[10px] font-medium text-emerald-400 leading-normal italic text-center">
                  * Diqqat: Qoʻshimcha sotib olinadigan limitlar xarid qilingan oyda amal qiladi va keyingi hisob-kitob davrida ulangan tarif oʻzining standart qiymatlariga qaytadi.
                </p>
             </div>
          </div>

        </div>
      </div>
      
      {/* Visual divider design */}
      <div className="rounded-[40px] border border-gray-100 bg-gray-50/50 p-8 flex flex-col md:flex-row items-center gap-6 justify-between p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black text-gray-900">100% Kafolat & Xavfsiz tizim</h4>
            <p className="text-xs font-medium text-gray-400">Bizning barcha to'lov shartnomalarimiz rasmiy ravishda yuritiladi.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/contact" className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all uppercase tracking-wide">
            Biz bilan bog'lanish
          </a>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 font-black flex items-center justify-center text-[10px] shrink-0">✕</span>
  );
}
