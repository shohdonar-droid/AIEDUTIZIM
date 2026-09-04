import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  Cpu,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  Server,
  Activity,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  FileText,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  Users,
  Download,
  CreditCard,
  Layers,
  Bot,
  Globe,
  Sliders,
  Percent,
  Check,
  ExternalLink
} from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";

// Exchange rate constant (1 USD = 12,900 UZS)
const USD_RATE = 12900;

interface ServiceAuditItem {
  id: string;
  name: string;
  category: "doc" | "slide" | "test" | "util" | "service";
  environment: "Bot & Web" | "Faqat Bot" | "Faqat Web";
  model: string;
  modelType: "gemini_pro" | "claude" | "gemini_flash" | "zero_ai";
  queriesCount: number;
  tokensIn: number;
  tokensOut: number;
  userPriceUZS: number;
  adminCostUSD: number;
  notes: string;
}

const AUDIT_SERVICES: ServiceAuditItem[] = [
  {
    id: "kurs_ishi",
    name: "📄 Oddiy Kurs Ishi",
    category: "doc",
    environment: "Bot & Web",
    model: "Google Gemini 1.5 Pro",
    modelType: "gemini_pro",
    queriesCount: 13,
    tokensIn: 18000,
    tokensOut: 12000,
    userPriceUZS: 35000,
    adminCostUSD: 0.080,
    notes: "Titul, mundarija, kirish, 3 bob (6 paragraf), bob xulosalari, xulosa va haqiqiy adabiyotlar. 13 ta ketma-ket so'rov."
  },
  {
    id: "pro_kurs_ishi",
    name: "💎 Pro Kurs Ishi",
    category: "doc",
    environment: "Faqat Bot",
    model: "Anthropic Claude 3.7 / Opus",
    modelType: "claude",
    queriesCount: 12,
    tokensIn: 25000,
    tokensOut: 14000,
    userPriceUZS: 89000,
    adminCostUSD: 0.350,
    notes: "Oliy toifa ilmiy apparat, 3 ta parallel oqimda yozish, prompt kesh (ephemeral caching), rasmiy qonuniy havolalar."
  },
  {
    id: "slayd",
    name: "📊 Oddiy Slayd (Taqdimot)",
    category: "slide",
    environment: "Bot & Web",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 1200,
    tokensOut: 2500,
    userPriceUZS: 10000,
    adminCostUSD: 0.0012,
    notes: "Modern/Akademik dizayn, reja, matnlar, ma'ruzachi nutqi va PPTX in-memory generatsiya."
  },
  {
    id: "pro_slayd",
    name: "💎 Pro Slayd",
    category: "slide",
    environment: "Faqat Bot",
    model: "Anthropic Claude 3.7 / Opus",
    modelType: "claude",
    queriesCount: 1,
    tokensIn: 1500,
    tokensOut: 3000,
    userPriceUZS: 15000,
    adminCostUSD: 0.060,
    notes: "8 xil professional layout (cards, stats, compare, process, chart va h.k.), JSON Schema bilan toza struktura."
  },
  {
    id: "tezis",
    name: "🎓 Ilmiy Tezis",
    category: "doc",
    environment: "Faqat Bot",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 1000,
    tokensOut: 1500,
    userPriceUZS: 10000,
    adminCostUSD: 0.0008,
    notes: "OAK talablariga mos muammo, metod va xulosadan iborat Word fayli."
  },
  {
    id: "maqola",
    name: "📑 Ilmiy Maqola",
    category: "doc",
    environment: "Faqat Bot",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 1200,
    tokensOut: 2500,
    userPriceUZS: 15000,
    adminCostUSD: 0.0012,
    notes: "IMRAD xalqaro standarti (Abstract, Intro, Methods, Results, Discussion, References)."
  },
  {
    id: "dars_ishlanma",
    name: "📝 Dars Ishlanma (Lesson Plan)",
    category: "doc",
    environment: "Faqat Bot",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 1000,
    tokensOut: 2000,
    userPriceUZS: 10000,
    adminCostUSD: 0.0010,
    notes: "13 punktli zamonaviy pedagogik texnologiyalar dars rejasi jadvali."
  },
  {
    id: "test",
    name: "📋 Test Yaratish",
    category: "test",
    environment: "Faqat Bot",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 800,
    tokensOut: 1800,
    userPriceUZS: 3000,
    adminCostUSD: 0.0008,
    notes: "A, B, C, D variantli va to'g'ri javoblar kaliti bilan formatlangan testlar."
  },
  {
    id: "tarjimon_matn",
    name: "🌐 Tarjimon (Matn)",
    category: "util",
    environment: "Faqat Bot",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 1000,
    tokensOut: 1000,
    userPriceUZS: 3000,
    adminCostUSD: 0.0004,
    notes: "Akademik soha va terminologiyaga mos toza professional tarjima."
  },
  {
    id: "tarjimon_fayl",
    name: "📄 Fayl Tarjima Qilish (DOCX)",
    category: "util",
    environment: "Faqat Bot",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 3,
    tokensIn: 4000,
    tokensOut: 4000,
    userPriceUZS: 10000,
    adminCostUSD: 0.0020,
    notes: "Faylni matn bo'laklariga (chunking) ajratib tarjima qilib, qayta DOCX qilib berish."
  },
  {
    id: "obektivka",
    name: "📄 Obektivka (Ma'lumotnoma)",
    category: "doc",
    environment: "Faqat Bot",
    model: "0 AI (Algoritmik Generatsiya)",
    modelType: "zero_ai",
    queriesCount: 0,
    tokensIn: 0,
    tokensOut: 0,
    userPriceUZS: 15000,
    adminCostUSD: 0.000,
    notes: "O'zbekiston davlat standarti bo'yicha 23 bosqichli so'rovnoma, 3x4 rasm va qarindoshlar jadvali. AI ishlatilmaydi, 100% sof marja!"
  },
  {
    id: "chat",
    name: "💬 Savol-Javob (AI Chat)",
    category: "util",
    environment: "Bot & Web",
    model: "Google Gemini 3.6 Flash",
    modelType: "gemini_flash",
    queriesCount: 1,
    tokensIn: 800,
    tokensOut: 600,
    userPriceUZS: 1000,
    adminCostUSD: 0.0003,
    notes: "Talabalar va o'qituvchilar uchun o'quv savollari, rasm tahlili va interaktiv muloqot."
  }
];

export default function AdminTechnicalAudit() {
  const [activeTab, setActiveTab] = useState<
    "ai_services" | "architecture" | "roles" | "budget" | "calculator" | "risks"
  >("ai_services");

  // Real-time stats from Firestore
  const [dbStats, setDbStats] = useState({
    usersCount: 0,
    paymentsCount: 0,
    totalVolumeUZS: 0,
    dynamicPrices: {} as Record<string, number>,
    loading: true,
  });

  // Interactive Calculator State (Monthly volumes)
  const [simVolumes, setSimVolumes] = useState<Record<string, number>>({
    kurs_ishi: 60,
    pro_kurs_ishi: 15,
    slayd: 100,
    pro_slayd: 25,
    test: 80,
    obektivka: 30,
    tarjimon_matn: 50,
    tarjimon_fayl: 20,
    chat: 120,
  });

  useEffect(() => {
    async function loadLiveStats() {
      try {
        const [usersSnap, paymentsSnap, botConfigSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "payments")),
          getDoc(doc(db, "botConfig", "aiCosts"))
        ]);

        const uCount = usersSnap.size;
        const pCount = paymentsSnap.size;
        let totalVal = 0;
        paymentsSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const amt = Number(d.amount || d.sum || 0);
          if (!isNaN(amt)) totalVal += amt;
        });

        let prices: Record<string, number> = {};
        if (botConfigSnap.exists()) {
          prices = botConfigSnap.data() || {};
        }

        // Mapping local IDs to Telegram Config Keys
        const TG_KEYS: Record<string, string> = {
          "kurs_ishi": "📄 Kurs ishi yaratish",
          "pro_kurs_ishi": "💎 Pro kurs ishi",
          "slayd": "📊 Slayd yaratish",
          "pro_slayd": "💎 Pro slayd",
          "test": "📋 Test yaratish",
          "tarjimon_matn": "🌐 Tarjimon",
          "tarjimon_fayl": "📄 Fayl tarjima qilish",
          "chat": "💬 Savol-javob",
          "obektivka": "📄 Obektivka yaratish"
        };
        
        const mappedPrices: Record<string, number> = {};
        for (const [localId, tgKey] of Object.entries(TG_KEYS)) {
          if (prices[tgKey] !== undefined) {
            mappedPrices[localId] = prices[tgKey];
          }
        }

        setDbStats({
          usersCount: uCount,
          paymentsCount: pCount,
          totalVolumeUZS: totalVal,
          dynamicPrices: mappedPrices,
          loading: false,
        });
      } catch (err) {
        console.warn("Firestore live stats load notice:", err);
        setDbStats((prev) => ({ ...prev, loading: false }));
      }
    }
    loadLiveStats();
  }, []);

  // Summary Metrics calculations across all services
  const summaryMetrics = useMemo(() => {
    let totalAdminCostUSD = 0;
    let totalAdminCostUZS = 0;
    let totalUserPriceUZS = 0;

    AUDIT_SERVICES.forEach((s) => {
      const livePrice = dbStats.dynamicPrices[s.id] || s.userPriceUZS;
      const costUZS = s.adminCostUSD * USD_RATE;
      totalAdminCostUSD += s.adminCostUSD;
      totalAdminCostUZS += costUZS;
      totalUserPriceUZS += livePrice;
    });

    const avgMargin =
      totalUserPriceUZS > 0
        ? (((totalUserPriceUZS - totalAdminCostUZS) / totalUserPriceUZS) * 100).toFixed(1)
        : "96.8";

    return {
      avgMargin,
      totalServices: AUDIT_SERVICES.length,
      zeroAiServices: AUDIT_SERVICES.filter((s) => s.modelType === "zero_ai").length,
    };
  }, [dbStats.dynamicPrices]);

  // Dynamic Calculator calculations
  const calcResults = useMemo(() => {
    let totalRev = 0;
    let totalAiCostUSD = 0;
    let totalAiCostUZS = 0;
    let totalOrders = 0;

    AUDIT_SERVICES.forEach((s) => {
      const vol = simVolumes[s.id] || 0;
      if (vol > 0) {
        const livePrice = dbStats.dynamicPrices[s.id] || s.userPriceUZS;
        const rev = vol * livePrice;
        const aiCostUSD = vol * s.adminCostUSD;
        const aiCostUZS = aiCostUSD * USD_RATE;

        totalRev += rev;
        totalAiCostUSD += aiCostUSD;
        totalAiCostUZS += aiCostUZS;
        totalOrders += vol;
      }
    });

    // Infrastructure: Hosting (~$20 = ~260k), Firebase (~$8 = ~100k), Domain (~$2 = ~25k)
    const fixedInfraUZS = 385000;
    const totalExpensesUZS = totalAiCostUZS + fixedInfraUZS;
    const netProfitUZS = totalRev - totalExpensesUZS;
    const profitMargin = totalRev > 0 ? ((netProfitUZS / totalRev) * 100).toFixed(1) : "0";

    return {
      totalRev,
      totalAiCostUSD,
      totalAiCostUZS,
      fixedInfraUZS,
      totalExpensesUZS,
      netProfitUZS,
      profitMargin,
      totalOrders,
    };
  }, [simVolumes, dbStats.dynamicPrices]);

  const handleExportExcel = () => {
    const data = AUDIT_SERVICES.map((s) => {
      const livePrice = dbStats.dynamicPrices[s.id] || s.userPriceUZS;
      const costUZS = Math.round(s.adminCostUSD * USD_RATE);
      const profitUZS = livePrice - costUZS;
      const margin = livePrice > 0 ? (((livePrice - costUZS) / livePrice) * 100).toFixed(1) : "100";
      return {
        "Xizmat Nomi": s.name,
        "Muhit": s.environment,
        "AI Modeli": s.model,
        "So'rovlar Soni": s.queriesCount,
        "Kiruvchi Tokenlar": s.tokensIn,
        "Chiquvchi Tokenlar": s.tokensOut,
        "Foydalanuvchi Narxi (UZS)": livePrice,
        "Admin Tannarxi (USD)": `$${s.adminCostUSD.toFixed(4)}`,
        "Admin Tannarxi (UZS)": `${costUZS} UZS`,
        "Sof Foyda (UZS)": `${profitUZS} UZS`,
        "Rentabellik (Marja %)": `${margin}%`,
        "Izoh": s.notes,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Xizmatlar Auditi");
    XLSX.writeFile(workbook, `AIEDUTIZIM_Texnik_va_Xarajat_Auditi_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[36px] p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[11px] font-black uppercase tracking-widest border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                AIEDUTIZIM Core Architecture
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
                Tizim Texnik va Xarajatlar Auditi
              </h1>
              <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
                Platformadagi barcha AI modellar, so‘rovlar tannarxi, marja hisob-kitoblari, tashqi API integratsiyalari va infratuzilma byudjetining to‘liq audit tahlili.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" />
                Excel Hisobot
              </button>
              <Link
                to="/admin/billing/monitoring"
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all backdrop-blur-md"
              >
                <Activity className="w-4 h-4" />
                Live Monitoring
              </Link>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-700/60">
            <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">O'rtacha Marja</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">+{summaryMetrics.avgMargin}%</span>
              <span className="text-[10px] text-emerald-300/80 block mt-0.5">Yuqori rentabellik</span>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">AI Provayderlar</span>
              <span className="text-xl font-black text-white font-mono">Gemini & Claude</span>
              <span className="text-[10px] text-indigo-300/80 block mt-0.5">Pro & Flash dvigatellar</span>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Xizmatlar Soni</span>
              <span className="text-2xl font-black text-white font-mono">{summaryMetrics.totalServices} ta</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Avtomatlashgan tizim</span>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Obektivka (0% AI)</span>
              <span className="text-2xl font-black text-amber-400 font-mono">100% Foyda</span>
              <span className="text-[10px] text-amber-300/80 block mt-0.5">0 UZS tannarx</span>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valyuta Kursi</span>
              <span className="text-xl font-black text-white font-mono">1$ = {USD_RATE.toLocaleString()} UZS</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Rasmiy hisob standarti</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {[
          { id: "ai_services", label: "🤖 AI Xizmatlar & Tannarx", icon: Cpu },
          { id: "architecture", label: "🏗️ Arxitektura & Stek", icon: Layers },
          { id: "roles", label: "👥 Rollar & Huquqlar", icon: Users },
          { id: "budget", label: "💵 Oylik Byudjet Ssenariylari", icon: TrendingUp },
          { id: "calculator", label: "🧮 Interaktiv Kalkulyator", icon: Calculator },
          { id: "risks", label: "⚠️ Xavflar va Tavsiyalar", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI XIZMATLAR VA TANNARX (UNIT ECONOMICS) */}
      {activeTab === "ai_services" && (
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Barcha AI Xizmatlarining Real Tannarxi va Rentabelligi
                </h3>
                <p className="text-slate-500 text-xs">
                  Har bir generatsiya uchun sarflanadigan tokenlar, model narxlari va foydalanuvchiga sotuv marjasi
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span>Hisob:</span>
                <span className="text-indigo-600 font-mono">1$ = 12,900 UZS</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="p-4 rounded-l-2xl">Xizmat Nomi</th>
                    <th className="p-4">AI Modeli</th>
                    <th className="p-4 text-center">So'rovlar</th>
                    <th className="p-4 text-center">Tokenlar (In/Out)</th>
                    <th className="p-4 text-right">Tannarx ($)</th>
                    <th className="p-4 text-right">Tannarx (UZS)</th>
                    <th className="p-4 text-right">Sotuv Narxi</th>
                    <th className="p-4 text-right">Sof Foyda</th>
                    <th className="p-4 rounded-r-2xl text-center">Marja %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {AUDIT_SERVICES.map((s) => {
                    const livePrice = dbStats.dynamicPrices[s.id] || s.userPriceUZS;
                    const costUZS = Math.round(s.adminCostUSD * USD_RATE);
                    const profitUZS = livePrice - costUZS;
                    const margin = livePrice > 0 ? (((livePrice - costUZS) / livePrice) * 100).toFixed(1) : "100";
                    const isZeroAi = s.modelType === "zero_ai";
                    const isPro = s.modelType === "claude";

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-4 font-bold text-slate-900">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                              {s.name}
                              {isZeroAi && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full">
                                  0 AI
                                </span>
                              )}
                              {isPro && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-full">
                                  PRO
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">{s.environment}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold ${
                            s.modelType === "gemini_pro"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : s.modelType === "claude"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : s.modelType === "zero_ai"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {s.model}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-xs font-bold text-slate-700">
                          {s.queriesCount} ta
                        </td>
                        <td className="p-4 text-center font-mono text-xs text-slate-500">
                          {s.tokensIn > 0 ? `${(s.tokensIn / 1000).toFixed(1)}k / ${(s.tokensOut / 1000).toFixed(1)}k` : "0 / 0"}
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-bold text-slate-700">
                          ${s.adminCostUSD.toFixed(4)}
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-bold text-red-600">
                          ~{costUZS.toLocaleString()} UZS
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-black text-slate-900">
                          {livePrice.toLocaleString()} UZS
                        </td>
                        <td className="p-4 text-right font-mono text-xs font-black text-emerald-600">
                          +{profitUZS.toLocaleString()} UZS
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                            Number(margin) >= 95
                              ? "bg-emerald-100 text-emerald-800"
                              : Number(margin) >= 85
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Takeaways Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Oddiy Kurs Ishi Dvigateli</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                <code>Gemini 1.5 Pro</code> yordamida 13 bosqichda (Titul, Mundarija, Kirish, 3 ta bob, 6 paragraf, bob xulosalari, xulosa, adabiyotlar) tayyorlanadi. Har bir so'rov OAK ilmiy talablariga mos tuzilgan.
              </p>
              <div className="pt-2 flex justify-between text-xs font-mono font-bold text-slate-700 border-t border-slate-100">
                <span>Tannarx: ~1,030 UZS</span>
                <span className="text-emerald-600">Marja: 97.0%</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Pro Anthropic Claude Pipeline</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                <code>src/pro/</code> modulida 3 ta parallel oqimda (concurrency) yoziladi. Tizim promti keshlanishi (ephemeral caching) evaziga kirish tokenlari narxi 90% ga tejaladi va Rate Limitdan himoya qiladi.
              </p>
              <div className="pt-2 flex justify-between text-xs font-mono font-bold text-slate-700 border-t border-slate-100">
                <span>Tannarx: ~4,500 UZS</span>
                <span className="text-purple-600">Marja: 94.9%</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Obektivka (0 AI Xarajat)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                23 bosqichli Telegram Wizard orqali foydalanuvchidan ma'lumotlar yig'iladi va to'g'ridan-to'g'ri <code>docx</code> jadvallari yordamida yaratiladi. AI token umuman sarflanmaydi, tushum 100% sof foyda.
              </p>
              <div className="pt-2 flex justify-between text-xs font-mono font-bold text-slate-700 border-t border-slate-100">
                <span>Tannarx: 0 UZS</span>
                <span className="text-emerald-600">Marja: 100.0%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ARXITEKTURA VA STEK */}
      {activeTab === "architecture" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tech Stack Layers */}
            <div className="bg-white p-8 rounded-[36px] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Full-Stack Arxitektura</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Yagona Node.js dvigatelida gibrid yechim</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    WEB
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Vite + React 18 + Tailwind CSS</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Talabalar, o'qituvchilar va administratorlar uchun 40+ to'liq sahifali SPA interfeysi. Real-vaqt testlar, jurnallar, monitoring va sertifikatlar.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    API
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Express.js Server (Port 3000)</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Barcha backend yo'nalishlari: <code>/api/gemini</code>, <code>/api/chat</code>, <code>/api/payment/*</code> (Click, Payme), <code>/api/db-health</code>.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    BOT
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Telegraf.js (9,000+ qatorlik Bot Dvigateli)</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Barcha AI xizmatlar, billing, referal tizimi, avtomatik xatolikdan himoyalangan mablag' qaytarish (refund) va ma'muriy boshqaruv.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    MEM
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">In-Memory Hujjat Generatsiyasi (DOCX & PPTX)</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Fayllar diskka yozilmaydi, to'g'ridan-to'g'ri xotirada (Buffer) yig'ilib mijozga yuboriladi. Server xotirasi to'lib qolishi 100% oldi olingan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Optimization Pillars */}
            <div className="bg-white p-8 rounded-[36px] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">AI Optimallashtirish Tizimi</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Uzluksizlik va xarajatlarni kamaytirish</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Gemini API Key Rotation Pool</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full">UZLUKSIZ</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kalitlar 3 xil manbadan yig'iladi: <code>.env</code> fayli, vergul bilan ajratilgan kalitlar va Firestore’dagi <code>siteContent/bot_config</code> kalitlari. 429 xatosi kelsa, algoritm avtomatik keyingi kalitga o'tadi.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Claude Semaphore & Concurrency Limiter</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-full">NAVATLI</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <code>PRO_GEN_CONCURRENCY=3</code> (paragraflar 3 ta oqimda parallel yoziladi) va <code>PRO_MAX_PARALLEL_JOBS=1</code> (server bo'yicha bir vaqtda 1 ta buyurtma). Bu Anthropic Rate Limitga tushmaslikni ta'minlaydi.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Ephemeral Prompt Caching</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">90% TEJAMKOR</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pro generatsiyalarda tizim promti va OAK standartlari qoidalari <code>cache_control: &#123; type: "ephemeral" &#125;</code> orqali keshlanadi, bu esa takroriy token xarajatlarini 90% gacha tejaydi.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">Avtomatik Refund Protection</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full">ISHLONCHLI</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Agar AI provayderi vaqtinchalik xato bersa, tizim yechilgan mablag'ni foydalanuvchi balansiga darhol to'liq 100% qaytaradi va xatolik sababini ko'rsatadi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROLLAR VA HUQUQLAR MATRIXI */}
      {activeTab === "roles" && (
        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Foydalanuvchi Rollari & Huquqlari Matrixi</h3>
            <p className="text-slate-500 text-xs">Tizimdagi har bir rolning Web va Telegram platformasidagi huquqiy doirasi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[
              {
                role: "Super Admin / Admin",
                badge: "bg-red-100 text-red-700",
                platform: "Web & Telegram Bot",
                can: [
                  "Barcha foydalanuvchilar va balanslarni boshqarish",
                  "Xizmatlar narxlarini to'g'ridan-to'g'ri o'zgartirish",
                  "AI kalitlarini kiritish va o'chirish",
                  "Ommaviy xabarnoma (broadcast) yuborish",
                  "To'lovlar va Click/Payme tranzaksiyalarini audit qilish",
                  "Fayllar xotirasi (Storage) ni nazorat qilish"
                ]
              },
              {
                role: "Subadmin",
                badge: "bg-amber-100 text-amber-700",
                platform: "Web & Telegram Bot",
                can: [
                  "Talabalar va o'qituvchilar hisobotlarini ko'rish",
                  "Testlar va avtotestlar monitoringi",
                  "Javob berilmagan murojaatlarni ko'rish",
                  "Cheklangan statistik hisobotlar"
                ]
              },
              {
                role: "Teacher (O'qituvchi)",
                badge: "bg-blue-100 text-blue-700",
                platform: "Web Platforma",
                can: [
                  "Kafedra va guruhlar yaratish",
                  "Fanlar va dars modullarini biriktirish",
                  "Talabalarga testlar va imtihonlar tashkil qilish",
                  "Elektron jurnal va davomat yuritish",
                  "Quizizz real-vaqt musobaqalarini o'tkazish"
                ]
              },
              {
                role: "Student (Talaba)",
                badge: "bg-emerald-100 text-emerald-700",
                platform: "Web Platforma",
                can: [
                  "Shaxsiy kabinet va o'quv kurslari",
                  "Test va avtotestlarni topshirish",
                  "Baholar daftarchasini ko'rish",
                  "Avtomatik QR-kodli sertifikatlarni tekshirish va yuklab olish"
                ]
              },
              {
                role: "Telegram Bot Foydalanuvchisi",
                badge: "bg-cyan-100 text-cyan-700",
                platform: "Telegram Bot",
                can: [
                  "Kurs ishi, slayd, tezis, maqola generatsiyasi",
                  "Pro kurs ishi va Pro slayd buyurtma berish",
                  "Click va Payme orqali balans to'ldirish",
                  "Referal dasturi orqali bonus yig'ish (5,000 UZS)",
                  "Shaxsiy 7 xonali ID olish"
                ]
              },
              {
                role: "Kompyuter Xizmatlari Mijozi",
                badge: "bg-indigo-100 text-indigo-700",
                platform: "Telegram Bot",
                can: [
                  "Chirchiq kompyuter xizmatlariga buyurtma yuborish",
                  "Fayllarni chop etish (print/scan) so'rovlari",
                  "Kvitansiya va to'lovlarni yuborish"
                ]
              }
            ].map((r, i) => (
              <div key={i} className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${r.badge}`}>
                    {r.role}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{r.platform}</span>
                </div>
                <div className="space-y-2">
                  {r.can.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OYLIK BYUDJET SSENARIYLARI */}
      {activeTab === "budget" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Scenario A */}
            <div className="bg-white rounded-[36px] p-8 border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Ssenariy A
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black">
                  ~85% Marja
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Startap / Boshlang'ich</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kuniga ~20-30 ta bot so'rovi</p>
              </div>

              <div className="space-y-3 text-xs border-y border-slate-100 py-4">
                <div className="flex justify-between text-slate-600">
                  <span>Server (Cloud Run / VPS):</span>
                  <span className="font-mono font-bold">$5.00 (~65,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Google Gemini API:</span>
                  <span className="font-mono font-bold">$2.00 (~26,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Anthropic Claude API:</span>
                  <span className="font-mono font-bold">$5.00 (~65,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Firebase & Domen:</span>
                  <span className="font-mono font-bold">$2.00 (~26,000 UZS)</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold pt-2 border-t border-slate-100">
                  <span>Jami Xarajat:</span>
                  <span className="font-mono text-sm">~$14 / oy (~180k UZS)</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Kutilayotgan Oylik Tushum</span>
                <p className="text-xl font-black text-emerald-800 font-mono">~1,200,000 UZS</p>
                <p className="text-[11px] text-emerald-600 font-medium">Sof foyda: ~1,020,000 UZS</p>
              </div>
            </div>

            {/* Scenario B */}
            <div className="bg-white rounded-[36px] p-8 border-2 border-indigo-500 shadow-xl shadow-indigo-100 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                TAVSIYA ETILADI
              </div>
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Ssenariy B
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black">
                  ~96% Marja
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">O'rtacha Faol Bosqich</h3>
                <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-0.5">Kuniga 100 ta generatsiya</p>
              </div>

              <div className="space-y-3 text-xs border-y border-slate-100 py-4">
                <div className="flex justify-between text-slate-600">
                  <span>Server (Railway / VPS 4GB):</span>
                  <span className="font-mono font-bold">$20.00 (~260,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Google Gemini API (1.5 Pro & Flash):</span>
                  <span className="font-mono font-bold">$35.00 (~450,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Anthropic Claude API:</span>
                  <span className="font-mono font-bold">$45.00 (~580,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Firebase Blaze & Domen:</span>
                  <span className="font-mono font-bold">$10.00 (~130,000 UZS)</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold pt-2 border-t border-slate-100">
                  <span>Jami Xarajat:</span>
                  <span className="font-mono text-sm">~$110 / oy (~1.42m UZS)</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-1">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Kutilayotgan Oylik Tushum</span>
                <p className="text-xl font-black text-indigo-900 font-mono">~40,000,000 UZS</p>
                <p className="text-[11px] text-indigo-700 font-medium">Sof foyda: ~38,580,000 UZS</p>
              </div>
            </div>

            {/* Scenario C */}
            <div className="bg-white rounded-[36px] p-8 border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Ssenariy C
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black">
                  ~97% Marja
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Yuqori Hajm (Scale)</h3>
                <p className="text-xs text-purple-500 font-bold uppercase tracking-widest mt-0.5">Kuniga 1,000 ta generatsiya</p>
              </div>

              <div className="space-y-3 text-xs border-y border-slate-100 py-4">
                <div className="flex justify-between text-slate-600">
                  <span>Konteynerlar & Load Balancer:</span>
                  <span className="font-mono font-bold">$60.00 (~775,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Google Gemini API (Katta hajm):</span>
                  <span className="font-mono font-bold">$350.00 (~4,515,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Anthropic Claude API:</span>
                  <span className="font-mono font-bold">$450.00 (~5,805,000 UZS)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Firebase & Cloudflare Pro:</span>
                  <span className="font-mono font-bold">$50.00 (~645,000 UZS)</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold pt-2 border-t border-slate-100">
                  <span>Jami Xarajat:</span>
                  <span className="font-mono text-sm">~$910 / oy (~11.7m UZS)</span>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-1">
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block">Kutilayotgan Oylik Tushum</span>
                <p className="text-xl font-black text-purple-900 font-mono">~400,000,000 UZS</p>
                <p className="text-[11px] text-purple-700 font-medium">Sof foyda: ~388,300,000 UZS</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INTERAKTIV RENTABELLIK KALKULYATORI */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <div className="bg-white rounded-[36px] p-6 md:p-8 border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Interaktiv Rentabellik & Foyda Simulyatori
                </h3>
                <p className="text-slate-500 text-xs">
                  Oylik kutilayotgan buyurtmalar sonini o'zgartiring va real vaqtda sof daromad hamda AI xarajatlarini ko'ring
                </p>
              </div>
              <button
                onClick={() =>
                  setSimVolumes({
                    kurs_ishi: 100,
                    pro_kurs_ishi: 20,
                    slayd: 150,
                    pro_slayd: 30,
                    test: 100,
                    obektivka: 50,
                    tarjimon_matn: 50,
                    tarjimon_fayl: 30,
                    chat: 200,
                  })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Katta hajm preset
              </button>
            </div>

            {/* Results Dashboard Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jami Oylik Tushum</span>
                <p className="text-2xl font-black text-slate-900 font-mono">
                  {calcResults.totalRev.toLocaleString()} <span className="text-xs text-slate-400">UZS</span>
                </p>
                <span className="text-[10px] text-slate-500 mt-1 block">{calcResults.totalOrders} ta buyurtma</span>
              </div>

              <div className="bg-red-50/60 p-5 rounded-2xl border border-red-100">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Real AI Xarajati</span>
                <p className="text-2xl font-black text-red-600 font-mono">
                  -${calcResults.totalAiCostUSD.toFixed(2)}
                </p>
                <span className="text-[10px] text-red-500 font-mono mt-1 block">
                  ~{Math.round(calcResults.totalAiCostUZS).toLocaleString()} UZS
                </span>
              </div>

              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Infratuzilma (Server)</span>
                <p className="text-2xl font-black text-blue-600 font-mono">
                  -{calcResults.fixedInfraUZS.toLocaleString()} <span className="text-xs">UZS</span>
                </p>
                <span className="text-[10px] text-blue-500 mt-1 block">Hosting, Firestore & Domen</span>
              </div>

              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Kutilayotgan Sof Foyda</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  +{Math.round(calcResults.netProfitUZS).toLocaleString()} <span className="text-xs">UZS</span>
                </p>
                <span className="text-[10px] font-black text-emerald-700 mt-1 block">
                  Marja: {calcResults.profitMargin}%
                </span>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              {AUDIT_SERVICES.filter((s) => s.id in simVolumes).map((s) => {
                const vol = simVolumes[s.id] || 0;
                const livePrice = dbStats.dynamicPrices[s.id] || s.userPriceUZS;
                const itemRev = vol * livePrice;
                const itemCost = vol * s.adminCostUSD * USD_RATE;
                const itemProfit = itemRev - itemCost;

                return (
                  <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {livePrice.toLocaleString()} UZS / dona
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-white rounded-lg text-xs font-mono font-black text-indigo-600 border border-slate-200">
                        {vol} ta / oy
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="300"
                      step="5"
                      value={vol}
                      onChange={(e) =>
                        setSimVolumes((prev) => ({
                          ...prev,
                          [s.id]: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-indigo-600 cursor-pointer"
                    />

                    <div className="flex justify-between text-[11px] font-mono font-bold pt-1 border-t border-slate-200/50">
                      <span className="text-slate-500">Tushum: {itemRev.toLocaleString()} UZS</span>
                      <span className="text-emerald-600">Foyda: +{Math.round(itemProfit).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: XAVFLAR VA TEXNIK TAVSIYALAR */}
      {activeTab === "risks" && (
        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Texnik Tavsiyalar va Xavflar Auditi</h3>
            <p className="text-slate-500 text-xs">Tizimning barqaror va xavfsiz ishlashini ta'minlash uchun muhim jihatlar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Telegram Bot: Polling vs Webhook
              </div>
              <p className="text-xs text-amber-950/80 leading-relaxed">
                Hozirgi kunda bot standart <code>bot.launch()</code> (Long Polling) rejimida ishlamoqda. Foydalanuvchilar oqimi oshganda xabarlar kechikishi yoki bir vaqtda 2 nusxa ishlab xato berishi mumkin.
              </p>
              <div className="p-3 bg-white/80 rounded-xl text-[11px] text-amber-900 font-medium">
                ✅ <b>Tavsiya:</b> Production serverda <code>USE_WEBHOOK=true</code> va <code>APP_URL</code> ni o'rnatib, rasmiy Webhook orqali ishlashga o'tkazish.
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-blue-50/60 border border-blue-200/80 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                In-Memory Hujjatlar Generatsiyasi
              </div>
              <p className="text-xs text-blue-950/80 leading-relaxed">
                Fayllar (DOCX va PPTX) server qattiq diskida saqlanmaydi, faqat vaqtincha xotirada (RAM Buffer) yig'ilib to'g'ridan-to'g'ri Telegram yoki brauzerga oqim (stream) qilib beriladi.
              </p>
              <div className="p-3 bg-white/80 rounded-xl text-[11px] text-blue-900 font-medium">
                ✅ <b>Afzalligi:</b> Server diskining to'lib qolishi 100% istisno qilingan, xavfsizlik yuqori.
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-purple-50/60 border border-purple-200/80 space-y-3">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-sm">
                <Cpu className="w-5 h-5 text-purple-600" />
                Gemini API Key Hovuzi (Rotation Pool)
              </div>
              <p className="text-xs text-purple-950/80 leading-relaxed">
                Platforma bir nechta API kalitlarni avtomatik aylantiradi. Agar bitta kalit 429 (Limit exceeded) olsa, tizim keyingisiga o'tib generatsiyani yakunlaydi.
              </p>
              <div className="p-3 bg-white/80 rounded-xl text-[11px] text-purple-900 font-medium">
                ✅ <b>Tavsiya:</b> Firestore’dagi <code>siteContent/bot_config</code> ga har doim kamida 2-3 ta zaxira kalit kiritib qo'ying.
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Database className="w-5 h-5 text-slate-600" />
                PostgreSQL vs Firestore Dualligi
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Loyihada <code>pg</code> va PostgreSQL ulanishi mavjud, lekin barcha asosiy ma'lumotlar oqimi Firestore’da saqlanadi. PostgreSQL hozirda faqat salomatlik (health check) tekshiruvida ishlaydi.
              </p>
              <div className="p-3 bg-white rounded-xl text-[11px] text-slate-700 font-medium">
                ✅ <b>Tavsiya:</b> Tizim Firestore’da mukammal ishlamoqda. Agar SQL zarurati bo'lmasa, uni saqlab turish yoki keyingi bosqichda to'liq ko'chirish rejasini belgilash lozim.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
