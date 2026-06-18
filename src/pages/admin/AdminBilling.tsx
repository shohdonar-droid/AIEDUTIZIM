import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../../lib/firebase";
import { UserProfile } from "../../types";
import {
  Loader2,
  Search,
  Filter,
  Edit,
  Save,
  X,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  LayoutDashboard,
  Users,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Info,
  Globe,
  BookOpen,
  Activity,
  PlusCircle,
  Calculator,
  Check,
  Eye,
  Settings,
  ArrowRight,
  Server,
  Database,
  HardDrive,
  Bot,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";
import * as XLSX from "xlsx";

interface TariffConfig {
  price?: number;
  students?: number;
  staff?: number;
  hasAI?: boolean;
  hasBot?: boolean;
  maxCourses?: number;
  maxTests?: number;
  maxExams?: number;
  maxSubjects?: number;
  maxQuizizz?: number;
  
  // CORPORATE pricing per unit
  basePrice?: number;
  perStudent?: number;
  perStaff?: number;
  aiPrice?: number;
  botPrice?: number;
  perCourse?: number;
  perTest?: number;
  perExam?: number;
  perSubject?: number;
  perQuizizz?: number;

  // Independent Teacher service unit prices
  limit_departments_price?: number;
  limit_groups_price?: number;
  limit_students_price?: number;
  limit_subjects_price?: number;
  limit_tests_price?: number;
  limit_quizizz_price?: number;
  limit_exams_price?: number;
  limit_certificates_price?: number;
}

interface AllTariffsConfig {
  start: TariffConfig;
  standard: TariffConfig;
  professional: TariffConfig;
  corporate: TariffConfig;
  extra: TariffConfig;
}

const defaultTariffs: AllTariffsConfig = {
  start: {
    price: 300000,
    students: 50,
    staff: 2,
    hasAI: false,
    hasBot: false,
    maxCourses: 3,
    maxTests: 10,
    maxExams: 2,
    maxSubjects: 5,
    maxQuizizz: 4,
    limit_departments_price: 15000,
    limit_groups_price: 20000,
    limit_students_price: 5000,
    limit_subjects_price: 15000,
    limit_tests_price: 3000,
    limit_quizizz_price: 4000,
    limit_exams_price: 20000,
    limit_certificates_price: 10000
  },
  standard: {
    price: 700000,
    students: 200,
    staff: 5,
    hasAI: false,
    hasBot: true,
    maxCourses: 10,
    maxTests: 50,
    maxExams: 10,
    maxSubjects: 20,
    maxQuizizz: 15,
    limit_departments_price: 12000,
    limit_groups_price: 15000,
    limit_students_price: 4000,
    limit_subjects_price: 12000,
    limit_tests_price: 2500,
    limit_quizizz_price: 3000,
    limit_exams_price: 15000,
    limit_certificates_price: 8000
  },
  professional: {
    price: 1500000,
    students: 1000,
    staff: 20,
    hasAI: true,
    hasBot: true,
    maxCourses: 50,
    maxTests: 300,
    maxExams: 50,
    maxSubjects: 100,
    maxQuizizz: 100,
    limit_departments_price: 10000,
    limit_groups_price: 12000,
    limit_students_price: 3000,
    limit_subjects_price: 10000,
    limit_tests_price: 2000,
    limit_quizizz_price: 2500,
    limit_exams_price: 12000,
    limit_certificates_price: 6000
  },
  corporate: {
    basePrice: 500000,
    perStudent: 1000,
    perStaff: 10000,
    aiPrice: 300000,
    botPrice: 200000,
    maxCourses: 999,
    maxTests: 9999,
    maxExams: 999,
    maxSubjects: 999,
    maxQuizizz: 999,
    perCourse: 40000,
    perTest: 2000,
    perExam: 15000,
    perSubject: 5000,
    perQuizizz: 5000,
    limit_departments_price: 8000,
    limit_groups_price: 10000,
    limit_students_price: 2000,
    limit_subjects_price: 8000,
    limit_tests_price: 1500,
    limit_quizizz_price: 2000,
    limit_exams_price: 10000,
    limit_certificates_price: 5000
  },
  extra: {
    perStudent: 1500,
    perStaff: 15000,
    aiPrice: 350000,
    botPrice: 250000,
    perCourse: 50000,
    perTest: 3000,
    perExam: 20000,
    perSubject: 6000,
    perQuizizz: 6000,
    limit_departments_price: 15000,
    limit_groups_price: 20000,
    limit_students_price: 5000,
    limit_subjects_price: 15000,
    limit_tests_price: 4000,
    limit_quizizz_price: 4500,
    limit_exams_price: 20000,
    limit_certificates_price: 10000
  }
};

export default function AdminBilling() {
  const [organizations, setOrganizations] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"org" | "student" | "staff">(
    "org",
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Tariff configuration state
  const [tariffsConfig, setTariffsConfig] = useState<AllTariffsConfig>(defaultTariffs);
  const [editingTariffKey, setEditingTariffKey] = useState<keyof AllTariffsConfig | null>(null);
  const [editingTariffForm, setEditingTariffForm] = useState<TariffConfig | null>(null);
  const [savingTariff, setSavingTariff] = useState(false);

  // Card Settings state
  const [cardSettings, setCardSettings] = useState({ number: "9860 0000 0000 0000", owner: "ADMIN NAME", type: "Humo" });
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [cardForm, setCardForm] = useState({ number: "", owner: "", type: "Humo" });

  useEffect(() => {
    async function loadConfigs() {
      try {
        const [tSnap, cSnap] = await Promise.all([
          getDoc(doc(db, "settings", "tariffs")),
          getDoc(doc(db, "settings", "payment_card"))
        ]);
        
        if (tSnap.exists()) {
          setTariffsConfig({ ...defaultTariffs, ...tSnap.data() } as AllTariffsConfig);
        }
        if (cSnap.exists()) {
          const data = cSnap.data();
          setCardSettings({ 
            number: data.number || "9860 0000 0000 0000", 
            owner: data.owner || "ADMIN NAME", 
            type: data.type || "Humo" 
          });
        }
      } catch (err) {
        console.warn("Failed to load configs from Firestore", err);
      }
    }
    loadConfigs();
  }, []);

  const handleSaveCard = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "payment_card"), {
        ...cardForm,
        updatedAt: serverTimestamp()
      });
      setCardSettings(cardForm);
      setIsEditingCard(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Custom Calculators
  const [corpCalc, setCorpCalc] = useState({
    students: 1000,
    staff: 20,
    ai: true,
    bot: true,
    courses: 50,
    tests: 300,
    exams: 50,
    subjects: 100,
    quizizz: 100,
  });
  const [extraCalc, setExtraCalc] = useState({
    students: 0,
    staff: 0,
    ai: false,
    bot: false,
    courses: 0,
    tests: 0,
    exams: 0,
    subjects: 0,
    quizizz: 0,
  });

  // Simulation Office State
  const [simTariffKey, setSimTariffKey] = useState<keyof AllTariffsConfig>("standard");
  const [simOrgCount, setSimOrgCount] = useState(200);
  const [simAiOptimized, setSimAiOptimized] = useState(false);

  const calcCorpPrice = () => {
    const base = tariffsConfig.corporate.basePrice ?? 500000;
    const stdPrice = corpCalc.students * (tariffsConfig.corporate.perStudent ?? 1000);
    const staffPrice = corpCalc.staff * (tariffsConfig.corporate.perStaff ?? 10000);
    const aiPrice = corpCalc.ai ? (tariffsConfig.corporate.aiPrice ?? 300000) : 0;
    const botPrice = corpCalc.bot ? (tariffsConfig.corporate.botPrice ?? 200000) : 0;
    
    const coursesPrice = (corpCalc.courses ?? 0) * (tariffsConfig.corporate.perCourse ?? 40000);
    const testsPrice = (corpCalc.tests ?? 0) * (tariffsConfig.corporate.perTest ?? 2000);
    const examsPrice = (corpCalc.exams ?? 0) * (tariffsConfig.corporate.perExam ?? 15000);
    const subjectsPrice = (corpCalc.subjects ?? 0) * (tariffsConfig.corporate.perSubject ?? 5000);
    const quizizzPrice = (corpCalc.quizizz ?? 0) * (tariffsConfig.corporate.perQuizizz ?? 5000);
    
    return base + stdPrice + staffPrice + aiPrice + botPrice + coursesPrice + testsPrice + examsPrice + subjectsPrice + quizizzPrice;
  };

  const calcExtraPrice = () => {
    const stdPrice = extraCalc.students * (tariffsConfig.extra.perStudent ?? 1500);
    const staffPrice = extraCalc.staff * (tariffsConfig.extra.perStaff ?? 15000);
    const aiPrice = extraCalc.ai ? (tariffsConfig.extra.aiPrice ?? 350000) : 0;
    const botPrice = extraCalc.bot ? (tariffsConfig.extra.botPrice ?? 250000) : 0;
    
    const coursesPrice = (extraCalc.courses ?? 0) * (tariffsConfig.extra.perCourse ?? 50000);
    const testsPrice = (extraCalc.tests ?? 0) * (tariffsConfig.extra.perTest ?? 3000);
    const examsPrice = (extraCalc.exams ?? 0) * (tariffsConfig.extra.perExam ?? 20000);
    const subjectsPrice = (extraCalc.subjects ?? 0) * (tariffsConfig.extra.perSubject ?? 6000);
    const quizizzPrice = (extraCalc.quizizz ?? 0) * (tariffsConfig.extra.perQuizizz ?? 6000);
    
    return stdPrice + staffPrice + aiPrice + botPrice + coursesPrice + testsPrice + examsPrice + subjectsPrice + quizizzPrice;
  };

  // Tariff economics / Cost model under Hybrid Tier (Free Tier -> Paid Monthly)
  const systemCosts = {
    freeTier: {
      monthlyFootprint: 1500000,   // Firebase jami bepul o'qish/yozish operatsiyalari (oylik)
      storageGB: 5,                // Firebase jami bepul saqlash (GB)
      railwayHours: 500,           // Railway bepul oylik soatlar
    },
    paidRates: {
      fixedRailway: 450000,        // Railway Pro/Blaze oylik o'rtacha ushlanishi (bazaviy)
      perResourceOp: 0.15,         // Limitdan oshgan har bir resurs operatsiyasi xarajat birligi
      perStorageGB: 5000,          // Limitdan oshgan har 1GB saqlash uchun
    },
    unitUsage: {
      perStudent: 10,              // Talaba oylik o'rtacha aktivligi (operatsiyalarda)
      perStaff: 100,               // Xodim oylik o'rtacha aktivligi
      perResource: 5,              // Resurs yaratish/o'qish operatsiyalari
    },
    aiUnitCosts: {                 // AI token xarajatlari unit boshiga
      course: 500,
      test: 100,
      subject: 50,
      quizizz: 150,
      exam: 1000,
    },
    botFixed: 10000,               // Bot server yuklamasi (per org)
  };

  const calculateGlobalFootprint = (tariff: TariffConfig, orgCount: number) => {
    const S = (tariff.students || 0) * orgCount;
    const staffPerOrg = tariff.staff || 1;
    const T = staffPerOrg * orgCount;
    
    // Limits are per staff member, so total resources per org is staff count * limits
    const resourcesPerOrg = staffPerOrg * ((tariff.maxCourses || 0) + (tariff.maxTests || 0) + (tariff.maxExams || 0) + (tariff.maxSubjects || 0) + (tariff.maxQuizizz || 0));
    const R = resourcesPerOrg * orgCount;

    // Jami operatsiyalar footprinti (Global Across all orgs)
    const totalOps = (S * systemCosts.unitUsage.perStudent) + (T * systemCosts.unitUsage.perStaff) + (R * systemCosts.unitUsage.perResource);
    const totalStorage = R * 0.005; // Taxminiy 5MB per resource in GB

    // Free Tier Status
    const isExceedingOps = totalOps > systemCosts.freeTier.monthlyFootprint;
    const exceedsByOps = Math.max(0, totalOps - systemCosts.freeTier.monthlyFootprint);
    
    // AI Generation (Per staff member's full usage of limits)
    const optimizationFactor = simAiOptimized ? 0.3 : 1; // 70% reduction in optimized mode
    
    const aiCostPerOrg = tariff.hasAI ? (
      staffPerOrg * (
        ((tariff.maxCourses || 0) * (systemCosts.aiUnitCosts.course * optimizationFactor)) +
        ((tariff.maxTests || 0) * (systemCosts.aiUnitCosts.test * optimizationFactor)) +
        ((tariff.maxExams || 0) * (systemCosts.aiUnitCosts.exam * optimizationFactor)) +
        ((tariff.maxSubjects || 0) * (systemCosts.aiUnitCosts.subject * optimizationFactor)) +
        ((tariff.maxQuizizz || 0) * (systemCosts.aiUnitCosts.quizizz * optimizationFactor))
      )
    ) : 0;
    const aiCostTotal = aiCostPerOrg * orgCount;

    // Paid Calculations
    let maintenanceCost = 0;
    if (isExceedingOps) {
      maintenanceCost = systemCosts.paidRates.fixedRailway + (exceedsByOps * systemCosts.paidRates.perResourceOp);
    }

    const botCost = tariff.hasBot ? systemCosts.botFixed * orgCount : 0;
    const totalCost = maintenanceCost + aiCostTotal + botCost;

    return {
      total: totalCost,
      ai: aiCostTotal,
      system: maintenanceCost + botCost,
      isFree: !isExceedingOps,
      exceedsByOps,
      totalOps,
      freeLimit: systemCosts.freeTier.monthlyFootprint
    };
  };

  const calculatePlanCost = (tariff: TariffConfig, currentOrgCount: number = 200) => {
    // Legacy support for single objects (used in some places)
    const footprint = calculateGlobalFootprint(tariff, 1);
    return {
      total: footprint.total,
      ai: footprint.ai,
      system: footprint.system,
      infra: footprint.system * 0.5 // rough estimation
    };
  };

  const renderEconomics = () => {
    const plans = [
      { id: 'start', name: 'Start', config: tariffsConfig.start },
      { id: 'standard', name: 'Standard', config: tariffsConfig.standard },
      { id: 'professional', name: 'Professional', config: tariffsConfig.professional },
    ];

    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-100">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tariflar Iqtisodiyoti (20 ta Obuna Uchun)</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Har bir tarifda 20 tadan tashkilot obuna bo'lgan holatdagi jami tahlil</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const ORGS_PER_PLAN = 20;
            const singleBreakdown = calculatePlanCost(plan.config);
            const singleCost = singleBreakdown.total;
            const singlePrice = plan.config.price || 0;
            
            const totalCost = singleCost * ORGS_PER_PLAN;
            const totalRevenue = singlePrice * ORGS_PER_PLAN;
            const totalProfit = totalRevenue - totalCost;
            
            const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
            
            const resPerStaff = 
              (plan.config.maxCourses || 0) + 
              (plan.config.maxTests || 0) + 
              (plan.config.maxExams || 0) + 
              (plan.config.maxSubjects || 0) + 
              (plan.config.maxQuizizz || 0);
            
            const totalResPerOrg = (plan.config.staff || 0) * resPerStaff;

            return (
              <div key={plan.id} className="bg-white rounded-[40px] border border-gray-100 p-8 hover:shadow-2xl hover:shadow-indigo-50 transition-all group overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gray-50 rounded-full opacity-50 group-hover:scale-150 transition-transform" />
                
                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{plan.name}</h3>
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">20 ta tashkilot uchun</p>
                    </div>
                    <div className={`px-3 py-1 ${totalProfit > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} rounded-full text-[10px] font-black uppercase tracking-widest`}>
                      {totalProfit > 0 ? `+${margin}% ROI` : `${margin}% Defitsit`}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Jami Tushum</p>
                        <p className="text-2xl font-black text-slate-900 font-mono">{totalRevenue.toLocaleString()} <span className="text-xs text-slate-400 font-bold uppercase">UZS</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Jami Xarajat</p>
                        <p className="text-lg font-black text-red-500 font-mono">-{Math.round(totalCost).toLocaleString()} <span className="text-[10px]">UZS</span></p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Jami talabalar (+20)</span>
                         <span className="text-xs font-black text-indigo-600">{(plan.config.students ? plan.config.students * ORGS_PER_PLAN : 0).toLocaleString()} nafar</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Jami resurslar (+20)</span>
                         <span className="text-xs font-black text-indigo-600">{(totalResPerOrg * ORGS_PER_PLAN).toLocaleString()} ta</span>
                      </div>
                      <p className="text-[9px] font-bold text-center text-slate-400 leading-tight uppercase tracking-tighter pt-2 border-t border-slate-100">
                        Hamma organizatsiyalar limitlardan 100% foydalanmoqda
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Guruh Sof Foydasi (Oylik)</p>
                    <div className={`p-4 rounded-2xl flex items-center justify-between border ${totalProfit > 0 ? 'bg-emerald-50 border-emerald-100/50' : 'bg-red-50 border-red-100/50'}`}>
                       <ShieldAlert className={`w-5 h-5 ${totalProfit > 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                       <span className={`text-xl font-black font-mono ${totalProfit > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{Math.round(totalProfit).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Unit Economics Analysis Card */}
          <div className="bg-slate-900 text-white p-8 rounded-[40px] border border-slate-800 shadow-2xl overflow-hidden relative group">
             <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full" />
             <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="space-y-6">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-500 rounded-lg">
                         <Zap className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-tight">AI & Resurs Xarajati</h3>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">30 ta AI savol tuzish (Tokens)</span>
                         <span className="text-sm font-black font-mono text-emerald-400">~35 UZS</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Firebase Writes (30 savol)</span>
                         <span className="text-sm font-black font-mono text-emerald-400">~5 UZS</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saqlash & Trafik (Oylik)</span>
                         <span className="text-sm font-black font-mono text-indigo-100">{systemCosts.perResource} UZS</span>
                      </div>
                      
                      <div className="pt-4 space-y-2">
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Maksimal yuklamada (Xarajat):</p>
                         <p className="text-[9px] text-slate-300 mb-3 leading-tight font-bold italic lowercase">
                            (yaratish/AI: 40 uzs + oylik saqlash: {systemCosts.perResource} uzs + {systemCosts.interactionUnit} uzs x har bir talaba)
                         </p>
                         <div className="grid grid-cols-1 gap-2">
                            <div className="flex justify-between items-center px-4 py-2.5 bg-white/5 rounded-xl border border-white/5">
                               <span className="text-[9px] font-bold uppercase">START ({tariffsConfig.start.students} talaba)</span>
                               <span className="text-xs font-black text-indigo-300">{(40 + systemCosts.perResource + ((tariffsConfig.start.students || 0) * systemCosts.interactionUnit)).toLocaleString()} UZS</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2.5 bg-white/5 rounded-xl border border-white/5">
                               <span className="text-[9px] font-bold uppercase">STANDARD ({tariffsConfig.standard.students} talaba)</span>
                               <span className="text-xs font-black text-indigo-300">{(40 + systemCosts.perResource + ((tariffsConfig.standard.students || 0) * systemCosts.interactionUnit)).toLocaleString()} UZS</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2.5 bg-white/5 rounded-xl border border-white/5">
                               <span className="text-[9px] font-bold uppercase">PROFESSIONAL ({tariffsConfig.professional.students} talaba)</span>
                               <span className="text-xs font-black text-indigo-300">{(40 + systemCosts.perResource + ((tariffsConfig.professional.students || 0) * systemCosts.interactionUnit)).toLocaleString()} UZS</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
                
                <p className="mt-8 text-[9px] text-slate-500 leading-relaxed italic uppercase tracking-tighter">
                   * RailWay va Firebase oylik to'lovlari "Fixed Costs" bo'lib, ular har bir amaldan qat'iy nazar o'zgarmas qoladi. AI narxi Gemini 1.5 Flash modeli asosida hisoblangan.
                </p>
             </div>
          </div>
        </div>
        
        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4 items-center">
           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100">
             <Info className="w-5 h-5" />
           </div>
           <p className="text-[10px] leading-relaxed font-bold text-indigo-900/70 uppercase">
             Ushbu tahlil tizimning "eng yomon senariy" (worst-case scenario) xarajatlarini ko'rsatadi. Haqiqiy xarajatlar ko'p hollarda interaktivlik 100% dan past bo'lganligi sababli kamroq bo'ladi.
           </p>
        </div>
      </div>
    );
  };

  const renderGlobalProjection = () => {
    const S = 50000;  // Talabalar
    const T = 5000;   // Xodimlar
    const O = 200;    // Tashkilotlar
    const R = 62500;  // Jami resurslar (50k test + 3k kurs + 3k quiz + 3k imtihon + 3.5k mavzu)
    
    // Platform Fixed Fees (Railway, Firebase Subscriptions, Domains)
    const platformFixedFees = 450000; // Oylik Railway + Firebase Pro + Domain xarajatlari
    
    // Xarajatlar
    const infraCost = (S * systemCosts.perStudent) + (T * systemCosts.perStaff);
    const storageCost = R * systemCosts.perResource;
    const aiAndBotCost = O * (systemCosts.aiFixed + systemCosts.botFixed);
    const interactionCost = S * (R / T) * systemCosts.interactionUnit;
    
    const totalGlobalCost = infraCost + storageCost + aiAndBotCost + interactionCost + platformFixedFees;
    
    // Revenue Estimate: 200 Organizations (Mixed Tiers)
    // Avg revenue per org: ~1,500,000 UZS
    const totalGlobalRevenue = O * 1500000; 

    return (
      <div className="mt-16 space-y-8 pb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Global Tizim Proyeksiyasi (Masshtab)</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">200 Tashkilot va 50,000 Talaba uchun To'liq Tahlil</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foydalanuvchilar</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-gray-900">{S.toLocaleString()} talaba</p>
              <p className="text-xs font-bold text-gray-500">{T.toLocaleString()} xodim / {O} org</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resurslar Bazasi</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-gray-900">{R.toLocaleString()} ta</p>
              <p className="text-xs font-bold text-gray-500">Jami faol resurslar</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-black">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Oylik Yuklama</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-gray-900">Maksimal (100%)</p>
              <p className="text-xs font-bold text-gray-500">Eng faol senariy</p>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-2xl space-y-4">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Jami Oylik Xarajat</p>
            <div className="space-y-1">
              <p className="text-2xl font-black text-white font-mono">{Math.round(totalGlobalCost).toLocaleString()} <span className="text-xs">UZS</span></p>
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tight">Taxminiy oylik budget</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
           <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm xl:col-span-2">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Xarajatlar Strukturasi (Breakdown)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                             <Server className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Railway Pro (Fixed Cluster)</span>
                       </div>
                       <span className="text-sm font-black text-gray-900">150,000 UZS</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                             <Database className="w-4 h-4 text-amber-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Firebase Blaze (Fixed Base)</span>
                       </div>
                       <span className="text-sm font-black text-gray-900">300,000 UZS</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                             <Activity className="w-4 h-4 text-emerald-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Real-time Sync (50k active)</span>
                       </div>
                       <span className="text-sm font-black text-gray-900">{infraCost.toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                       <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-600" />
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Traffic & Interaction</span>
                       </div>
                       <span className="text-sm font-black text-indigo-700">{interactionCost.toLocaleString()} UZS</span>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                             <Zap className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Gemini AI API (200 Org)</span>
                       </div>
                       <span className="text-sm font-black text-gray-900">{(O * systemCosts.aiFixed).toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                             <Bot className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Telegram Bots Gateway</span>
                       </div>
                       <span className="text-sm font-black text-gray-900">{(O * systemCosts.botFixed).toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                             <HardDrive className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Resurslar Saqlash (62.5k)</span>
                       </div>
                       <span className="text-sm font-black text-gray-900">{storageCost.toLocaleString()} UZS</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-emerald-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full" />
              <div className="relative z-10 flex flex-col h-full">
                 <h3 className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-6">Masshtabli Foyda Prognozi</h3>
                 <div className="space-y-6 flex-grow">
                    <div>
                       <p className="text-[10px] font-black text-emerald-400/70 uppercase mb-2">Jami Oylik Tushum (200 Org)</p>
                       <p className="text-4xl font-black text-white font-mono tracking-tighter">{totalGlobalRevenue.toLocaleString()} <span className="text-lg">UZS</span></p>
                    </div>
                    <div className="pt-6 border-t border-white/10 uppercase">
                       <p className="text-[10px] font-black text-emerald-400 mb-1">Maksimal yuklamada sof foyda</p>
                       <p className="text-2xl font-black text-white font-mono tracking-tight">{(totalGlobalRevenue - totalGlobalCost).toLocaleString()} UZS</p>
                    </div>
                 </div>
                 
                 <div className="mt-8 p-4 bg-emerald-800/50 rounded-2xl border border-emerald-700/50">
                    <p className="text-[9px] font-bold text-emerald-200/60 leading-relaxed uppercase">
                       * Ushbu proyeksiyada barcha tashkilotlar o'z limitlaridan 100% foydalanishi va barcha talabalar to'liq faol bo'lishi hisobga olingan. {/*
                    </p>
                 </div>
              </div>
           </div>

         */}</p></div></div></div></div> {/* Infratuzilma va Xarajatlar Tushuntirish Bo'limi (FAQ & Capacity) */}
         <div className="bg-slate-50 rounded-[40px] p-8 md:p-12 border border-slate-100 space-y-10 mt-10">
            <div className="space-y-3">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg">
                     <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Infratuzilma Xarajatlari & Tarif Tushuntirishlari</h3>
               </div>
               <p className="text-gray-500 text-sm max-w-3xl font-medium leading-relaxed">
                  Tizimning Firebase & Railway obunalari, hisob-kitob metodologiyasi va turli xil profillar bo'yicha sig'im ko'rsatkichlarining to'liq tahlili.
               </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* 1-blok: Savollarga Javoblar */}
               <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                     <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                        <h4 className="text-sm font-black text-gray-900 uppercase">O'rnatilgan obunada baza nechta resurs ko'taradi va qo'shimcha xarajat qilmaydi?</h4>
                     </div>
                     <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Tizimning <strong>Firebase Blaze & Railway Pro</strong> oylik obunasi (taxminan 450,000 so'm) bir marta to'langanda, masshtabli sig'im quyidagicha bo'ladi:
                     </p>
                     <ul className="text-xs text-gray-500 space-y-2 pl-4 list-disc font-medium">
                        <li><strong>Ma'lumotlar sig'imi:</strong> Bazada <strong>200,000 dan 500,000 gacha</strong> matnli resurslarni mutlaqo qo'shimcha xarajatlarsiz saqlash mumkin.</li>
                        <li><strong>Multimedia:</strong> 5 GB dan 20 GB gacha media (rasmlar) oylik obuna limitiga kiradi. Bu o'rtacha <strong>30,000 - 50,000 ta</strong> test rasmlari degani.</li>
                        <li><strong>Limit oshib ketsa ham xarajat juda arzon:</strong> Agar limitlar oshib kelsa ham, marginal xarajat (qo'shimcha 1 GB uchun) atigi $0.18 - $0.26 ni tashkil etadi.</li>
                     </ul>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <h4 className="text-sm font-black text-gray-900 uppercase">Nega saqlash uchun 200 so'm hisoblanadi?</h4>
                     </div>
                     <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Har bir yaratilgan resurs (test, kurs, imtihon, quizizz, mavzu) shunchaki ma'lumotlar bazasida oddiy matn tarzida qolmaydi. Ularning tarkibida rasmlar, diagrammalar, biriktirilgan hujjatlar va multimedia fayllari joy oladi. Ushbu ma'lumotlar <strong>Google Cloud Storage (Cloud Storage va CDN)</strong> disklarida saqlanadi hamda har oy talabalar tomonidan qayta-qayta yuklanganda egress tarmoq trafigini sarflaydi. 200 so'mlik oylik amortizatsiya bu resurslarning doimiy ochiq, tezkor va barqaror yuklanishini ta'minlaydi.
                     </p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <h4 className="text-sm font-black text-gray-900 uppercase">Nega talaba ishlashi uchun 1 so'm hisoblanadi?</h4>
                     </div>
                     <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Talaba test topshirganda yoki resursdan foydalanganda tizim real-time rejimda ishlaydi (Firestore push-notifications, socket ulanishlar va har bir to'g'ri/noto'g'ri javobni ma'lumotlar bazasiga yozish/yangilash tranzaksiyalari). Google Cloud Firestore 100k yozish uchun ~$0.18 oladi. Ammo, real yuklamada har bir talaba faolligida o'nlab real-time ulanishlar, CPU milisekundlari va xotira RAM hisoblanadi. Shuning uchun o'rtacha 1 so'm (1 UZS) hisobi xavfsiz zaxira bilan eng adolatli operatsion narxdir.
                     </p>
                  </div>
               </div>

               {/* 2-blok: Oylik obunalar va Profile Capacity (Sig'im) */}
               <div className="bg-slate-900 text-white p-8 rounded-[36px] border border-slate-800 shadow-2xl space-y-6">
                  <div>
                     <h4 className="text-base font-black uppercase tracking-tight text-white mb-1">Infratuzilma Limitlari & Sig'imi</h4>
                     <p className="text-slate-400 text-[10px] leading-relaxed uppercase tracking-wider">
                        Oylik standart obuna to'langan holatda (Railway + Firebase Pro / Blaze) tizim bemalol ko'tara oladigan profillar miqdori:
                     </p>
                  </div>

                  <div className="space-y-4 pt-2">
                     <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div>
                           <p className="text-sm font-black text-white">Tashkilotlar (Organizations)</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Yaxlit maktablar / O'quv markazlar</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-black">200 tagacha profil</span>
                     </div>

                     <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div>
                           <p className="text-sm font-black text-white">Xodimlar / O'qituvchilar (Staff)</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tashkilotlar ichidagi ustozlar</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-black">5,000 nafargacha profil</span>
                     </div>

                     <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div>
                           <p className="text-sm font-black text-white">Mustaqil O'qituvchilar (Tutors)</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tashkilotsiz mustaqil repititorlar</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-black">3,500 nafargacha profil</span>
                     </div>

                     <div className="flex justify-between items-center bg-indigo-950/40 p-4 rounded-2xl border border-indigo-800/30">
                        <div>
                           <p className="text-sm font-black text-indigo-200">Talabalar (Students)</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Faol o'quvchilar va natijalar bazasi</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/40 text-indigo-100 rounded-lg text-xs font-black">50,000 nafargacha profil</span>
                     </div>
                  </div>

                  <p className="text-[9px] text-slate-500 leading-relaxed uppercase italic">
                     * Eslatma: Firebase va Railway obunalari to'lansa (taxminan oylik 300,000 - 450,000 so'm o'rtacha yuklamaga asosan), yuqoridagi profillar bemalol qo'shimcha infratuzilma narxisiz ishlash imkoniga ega bo'ladi.
                  </p>
               </div>
            </div>
         </div>
      </div>
    );
  };




  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingHistoryUser, setViewingHistoryUser] =
    useState<UserProfile | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editIncome, setEditIncome] = useState(0);
  const [editExpense, setEditExpense] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalOrgs: 0,
    staffCount: 0,
    totalIncome: 0,
    totalDocs: 0,
    totalSpentAmount: 0,
    tgBotUsers: 0,
  });

  useEffect(() => {
    async function loadData() {
      // Use cached stats if available and fresh (e.g. within last 15 minutes)
      const cachedTime = localStorage.getItem('admin_billing_stats_time');
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
      
      const cachedUsers = localStorage.getItem('admin_billing_users_cache');
      if (cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL) && cachedUsers) {
        try {
          const users = JSON.parse(cachedUsers);
          const orgs = users.filter((u: any) => u.role === "teacher").map((org: any) => ({
              ...org,
              staffCount: users.filter((s: any) => s.role === "staff" && s.teacherId === org.uid).length,
          }));
          setOrganizations(orgs);
          setStudents(users.filter((u: any) => u.role === "student"));
          setStaff(users.filter((u: any) => u.role === "staff"));
          
          const cachedCounts = localStorage.getItem('admin_billing_counts');
          if (cachedCounts) {
             const parsed = JSON.parse(cachedCounts);
             setStats({
                totalOrgs: orgs.length,
                staffCount: users.filter((u: any) => u.role === "staff").length,
                totalIncome: users.reduce((acc: number, u: any) => acc + (u.totalIncome || 0), 0),
                totalDocs: parsed.tests + parsed.courses + parsed.results,
                totalSpentAmount: users.reduce((acc: number, u: any) => acc + (u.totalSpentAmount || 0), 0),
                tgBotUsers: parsed.tgUsers || 0,
             });
             setLoading(false);
             return;
          }
        } catch (e) {
          console.warn("Failed to parse billing cache", e);
        }
      }

      try {
        const uSnap = await getDocs(collection(db, "users"));
        const users = uSnap.docs.map(
          (d) => ({ uid: d.id, ...d.data() }) as UserProfile,
        );
        localStorage.setItem('admin_billing_users_cache', JSON.stringify(users));

        const orgs = users
          .filter((u) => u.role === "teacher")
          .map((org) => ({
            ...org,
            staffCount: users.filter(
              (s) => s.role === "staff" && s.teacherId === org.uid,
            ).length,
          }));
        const stds = users.filter((u) => u.role === "student");
        const stf = users.filter((u) => u.role === "staff");

        setOrganizations(orgs);
        setStudents(stds);
        setStaff(stf);

        // Check if we can use cached counts for others
        let testsCount = 0, coursesCount = 0, resultsCount = 0, tgCount = 0;
        const cachedCounts = localStorage.getItem('admin_billing_counts');
        if (cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL) && cachedCounts) {
           const parsed = JSON.parse(cachedCounts);
           testsCount = parsed.tests;
           coursesCount = parsed.courses;
           resultsCount = parsed.results;
           tgCount = parsed.tgUsers || 0;
        } else {
           const [tSnap, cSnap, rSnap, tgSnap] = await Promise.all([
             getCountFromServer(collection(db, "tests")),
             getCountFromServer(collection(db, "courses")),
             getCountFromServer(collection(db, "testResults")),
             getCountFromServer(collection(db, "telegram_users"))
           ]);
           testsCount = tSnap.data().count;
           coursesCount = cSnap.data().count;
           resultsCount = rSnap.data().count;
           tgCount = tgSnap.data().count;
           localStorage.setItem('admin_billing_counts', JSON.stringify({ tests: testsCount, courses: coursesCount, results: resultsCount, tgUsers: tgCount }));
           localStorage.setItem('admin_billing_stats_time', Date.now().toString());
        }

        setStats({
          totalOrgs: orgs.length,
          staffCount: stf.length,
          totalIncome: users.reduce((acc, u) => acc + (u.totalIncome || 0), 0),
          totalDocs: testsCount + coursesCount + resultsCount,
          totalSpentAmount: users.reduce(
            (acc, u) => acc + (u.totalSpentAmount || 0),
            0,
          ),
          tgBotUsers: tgCount
        });
      } catch (err: any) {
        if (!err?.message?.includes("quota")) {
          handleFirestoreError(err, OperationType.LIST, "admin-billing-loader");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      let totalInc = editingUser.totalIncome || 0;
      let totalSpent = editingUser.totalSpentAmount || 0;
      let transactions = editingUser.billingHistory || [];

      if (Number(editIncome) > 0) {
        totalInc += Number(editIncome);
        const newRecord = {
          type: "kirim",
          amount: Number(editIncome),
          date: new Date().toISOString(),
        };
        transactions = [...transactions, newRecord];
      }

      const expense = Number(editExpense);
      if (Math.abs(expense) > 0) {
        const spentVal = Math.abs(expense);
        totalSpent += spentVal;

        const newRecord = {
          type: "chiqim",
          amount: expense < 0 ? expense : -expense,
          date: new Date().toISOString(),
        };
        transactions = [...transactions, newRecord];
      }

      const updateData: any = {
        totalIncome: totalInc,
        totalSpentAmount: totalSpent,
        billingHistory: transactions,
        updatedAt: serverTimestamp(),
      };

      if (Number(editIncome) > 0) {
        updateData.lastIncomeDate = serverTimestamp();
      }

      await setDoc(doc(db, "users", editingUser.uid), updateData, { merge: true });

      // Update local state
      const updatedUser = { ...editingUser, ...updateData };
      if (activeTab === "org") {
        setOrganizations(
          organizations.map((u) =>
            u.uid === editingUser.uid ? updatedUser : u,
          ),
        );
      } else if (activeTab === "student") {
        setStudents(
          students.map((u) => (u.uid === editingUser.uid ? updatedUser : u)),
        );
      } else {
        setStaff(
          staff.map((u) => (u.uid === editingUser.uid ? updatedUser : u)),
        );
      }

      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTariff = async () => {
    if (!editingTariffKey || !editingTariffForm) return;
    setSavingTariff(true);
    try {
      const updatedConfigs = {
        ...tariffsConfig,
        [editingTariffKey]: editingTariffForm
      };
      await setDoc(doc(db, "settings", "tariffs"), updatedConfigs);
      setTariffsConfig(updatedConfigs);
      setEditingTariffKey(null);
      setEditingTariffForm(null);
    } catch (e) {
      console.error("Failed to save tariff", e);
    } finally {
      setSavingTariff(false);
    }
  };

  const exportExcel = () => {
    const data =
      activeTab === "org"
        ? organizations
        : activeTab === "student"
          ? students
          : staff;
    const exportData = data.map((u, i) => ({
      "№": i + 1,
      "Nomi / F.I.SH": u.displayName,
      "Tushgan To'lov": u.totalIncome || 0,
      "Ishlatilgan Summa": u.totalSpentAmount || 0,
      "Oxirgi To'lov Sanasi": u.lastIncomeDate?.toDate
        ? u.lastIncomeDate.toDate().toLocaleString()
        : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billing");
    XLSX.writeFile(
      wb,
      `Billing_${activeTab === "org" ? "Tashkilotlar" : activeTab === "student" ? "Talabalar" : "Xodimlar"}.xlsx`,
    );
  };

  const currentList =
    activeTab === "org"
      ? organizations
      : activeTab === "student"
        ? students
        : staff;
  const filteredList = currentList.filter((u) =>
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading && !editingUser)
    return (
      <div className="flex h-96 items-center justify-center font-black text-indigo-600">
        Yuklanmoqda...
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Tariflar Sozlamalari (Plan Settings)
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Sotiladigan tarif rejalari, limit qiymatlari va xizmat narxlarini boshqarish.
          </p>
        </div>
      </header>

      {/* Card Info and Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Card Information Component */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">To'lov kartasi</h2>
            <button 
              onClick={() => {
                setCardForm(cardSettings);
                setIsEditingCard(true);
              }}
              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-slate-100"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full aspect-[1.6/1] rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-2xl shadow-indigo-200 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full" />
            
            <div className="h-full flex flex-col justify-between relative z-10">
              <div className="flex justify-between items-start">
                <div className="w-12 h-8 bg-slate-300/20 rounded-md backdrop-blur-sm border border-white/20" />
                <span className="text-xs font-black tracking-widest text-indigo-200 uppercase">{cardSettings.type}</span>
              </div>

              <div className="space-y-4">
                <div className="text-[22px] font-black tracking-[0.2em] font-mono drop-shadow-md">
                  {cardSettings.number}
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1">Karta egasi</p>
                    <p className="text-xs font-black uppercase tracking-wider">{cardSettings.owner}</p>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm" />
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter">
            Ushbu karta ma'lumotlari foydalanuvchilarga to'lov qilish vaqtida ko'rsatiladi.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
           <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col justify-between group hover:border-indigo-100 transition-all">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Users className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tashkilotlar</p>
                 <h4 className="text-2xl font-black text-gray-900 leading-none">{stats.totalOrgs}</h4>
              </div>
           </div>
           
           <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col justify-between group hover:border-emerald-100 transition-all">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <DollarSign className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jami Tushum</p>
                 <h4 className="text-xl font-black text-gray-900 leading-none truncate" title={stats.totalIncome.toLocaleString() + " sum"}>{stats.totalIncome.toLocaleString()}</h4>
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col justify-between group hover:border-blue-100 transition-all">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <FileText className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Materiallar</p>
                 <h4 className="text-2xl font-black text-gray-900 leading-none truncate" title={stats.totalDocs.toLocaleString()}>{stats.totalDocs.toLocaleString()}</h4>
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col justify-between group hover:border-amber-100 transition-all">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bot A'zolari</p>
                 <h4 className="text-2xl font-black text-gray-900 leading-none">{stats.tgBotUsers}</h4>
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col justify-between group hover:border-red-100 transition-all">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ishlatilgan</p>
                 <h4 className="text-xl font-black text-gray-900 leading-none truncate" title={stats.totalSpentAmount.toLocaleString() + " sum"}>{stats.totalSpentAmount.toLocaleString()}</h4>
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col justify-between group hover:border-slate-100 transition-all">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Check className="w-5 h-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Xodimlar</p>
                 <h4 className="text-2xl font-black text-gray-900 leading-none">{stats.staffCount}</h4>
              </div>
           </div>
        </div>
      </div>

      {/* Simulation & Tariffs Dashboard */}
      <div className="space-y-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* LEFT COLUMN: Tariffs Management */}
          <div className="lg:col-span-3 space-y-12">
            {/* 1. Tashkilot Tariflari */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Tashkilot tariflari</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Asosiy obuna rejalari</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* START */}
                <div className="p-6 rounded-[32px] border-2 border-gray-50 bg-gray-50/30 hover:border-orange-200 transition-all group relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-3xl">🥉</span>
                    <button
                      onClick={() => { setEditingTariffKey("start"); setEditingTariffForm(tariffsConfig.start); }}
                      className="p-2 bg-white text-gray-400 hover:text-orange-500 rounded-xl border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">START</h3>
                    <div className="text-xl font-black text-orange-600 mb-4">{(tariffsConfig.start.price || 0).toLocaleString()} <small className="text-[10px] text-gray-400 uppercase font-bold">sum/oy</small></div>
                    <ul className="space-y-1.5 text-[10px] font-bold text-gray-500 mb-6">
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-orange-500" /> {tariffsConfig.start.students} talaba</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-orange-500" /> {tariffsConfig.start.staff} xodim</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-orange-500" /> {tariffsConfig.start.maxTests} ta test</li>
                    </ul>
                  </div>
                  <button className="w-full py-2.5 bg-white border border-orange-100 text-orange-600 rounded-xl font-black hover:bg-orange-600 hover:text-white transition-all text-[10px] uppercase tracking-widest">Tanlash</button>
                </div>

                {/* STANDARD */}
                <div className="p-6 rounded-[32px] border-2 border-indigo-100 bg-white shadow-xl shadow-indigo-50 relative group flex flex-col justify-between">
                  <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Ommabop</div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-3xl">🥈</span>
                    <button
                      onClick={() => { setEditingTariffKey("standard"); setEditingTariffForm(tariffsConfig.standard); }}
                      className="p-2 bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-xl border border-indigo-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">STANDARD</h3>
                    <div className="text-xl font-black text-indigo-600 mb-4">{(tariffsConfig.standard.price || 0).toLocaleString()} <small className="text-[10px] text-gray-400 uppercase font-bold">sum/oy</small></div>
                    <ul className="space-y-1.5 text-[10px] font-bold text-gray-500 mb-6">
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-indigo-500" /> {tariffsConfig.standard.students} talaba</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-indigo-500" /> {tariffsConfig.standard.staff} xodim</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-indigo-500" /> Telegram Bot</li>
                    </ul>
                  </div>
                  <button className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-[10px] uppercase tracking-widest">Tanlash</button>
                </div>

                {/* PROFESSIONAL */}
                <div className="p-6 rounded-[32px] border-2 border-gray-50 bg-gray-50/30 hover:border-amber-200 transition-all group relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-3xl">🥇</span>
                    <button
                      onClick={() => { setEditingTariffKey("professional"); setEditingTariffForm(tariffsConfig.professional); }}
                      className="p-2 bg-white text-gray-400 hover:text-amber-500 rounded-xl border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">PROFESSIONAL</h3>
                    <div className="text-xl font-black text-amber-600 mb-4">{(tariffsConfig.professional.price || 0).toLocaleString()} <small className="text-[10px] text-gray-400 uppercase font-bold">sum/oy</small></div>
                    <ul className="space-y-1.5 text-[10px] font-bold text-gray-500 mb-6">
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-amber-500" /> {tariffsConfig.professional.students} talaba</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-amber-500" /> AI Generator</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-amber-500" /> 300+ Testlar</li>
                    </ul>
                  </div>
                  <button className="w-full py-2.5 bg-white border border-amber-100 text-amber-600 rounded-xl font-black hover:bg-amber-600 hover:text-white transition-all text-[10px] uppercase tracking-widest">Tanlash</button>
                </div>

                {/* CORPORATE */}
                <div className="p-6 rounded-[32px] border-2 border-gray-50 bg-indigo-50/20 hover:border-indigo-200 transition-all group relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-3xl">👑</span>
                    <button
                      onClick={() => { setEditingTariffKey("corporate"); setEditingTariffForm(tariffsConfig.corporate); }}
                      className="p-2 bg-white text-gray-400 hover:text-indigo-500 rounded-xl border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">CORPORATE</h3>
                    <div className="text-xl font-black text-indigo-900 mb-4">Maxsus <small className="text-[10px] text-gray-400 uppercase font-bold">hisob</small></div>
                    <ul className="space-y-1.5 text-[10px] font-bold text-gray-500 mb-6">
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-indigo-600" /> Cheksiz imkoniyat</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-indigo-600" /> Shaxsiy menejer</li>
                      <li className="flex items-center gap-2"><Check className="w-3 h-3 text-indigo-600" /> API Access</li>
                    </ul>
                  </div>
                  <button className="w-full py-2.5 bg-indigo-900 text-white rounded-xl font-black hover:bg-black transition-all text-[10px] uppercase tracking-widest">Bog'lanish</button>
                </div>
              </div>
            </div>

            {/* 2. Extra Limits Section */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Xodim va Mustaqil o'qituvchilar uchun limitlar</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Qo'shimcha limit olish tariflari (Extra)</p>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-[40px] p-8 md:p-12 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <button
                  onClick={() => { setEditingTariffKey("extra"); setEditingTariffForm(tariffsConfig.extra); }}
                  className="absolute top-6 right-6 p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all border border-slate-100 z-20"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <div className="relative z-10 flex flex-col md:flex-row gap-10">
                   <div className="md:w-1/3">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                           <PlusCircle className="w-8 h-8" />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-slate-900">EXTRA LIMITS</h3>
                            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Qo'shimcha resurslar</p>
                         </div>
                      </div>
                      <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                        * Diqqat: Qo'shimcha imkoniyatlar faqat joriy oy uchun amal qiladi. Keyingi oyda tizim o'zining asosiy tarif limitlariga qaytadi.
                      </p>
                   </div>
                   
                   <div className="flex-grow space-y-8">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Talaba", key: "students", icon: Users },
                          { label: "Xodim", key: "staff", icon: Check },
                          { label: "Kurs", key: "courses", icon: BookOpen },
                          { label: "Test", key: "tests", icon: FileText },
                          { label: "Imtihon", key: "exams", icon: Zap },
                          { label: "Mavzu", key: "subjects", icon: LayoutDashboard },
                          { label: "Quizizz", key: "quizizz", icon: HardDrive },
                        ].map((item) => (
                          <div key={item.key} className="space-y-1.5 focus-within:scale-105 transition-transform">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <item.icon className="w-2.5 h-2.5" /> {item.label}
                            </label>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={(extraCalc as any)[item.key] || ""}
                              onChange={(e) => setExtraCalc({...extraCalc, [item.key]: Math.max(0, Number(e.target.value))})}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none font-black text-sm text-slate-800 transition-all shadow-inner"
                            />
                          </div>
                        ))}
                        <div className="flex flex-col justify-center space-y-2">
                           <div className="flex items-center gap-2 p-2 px-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                              <input type="checkbox" id="ex_ai" checked={extraCalc.ai} onChange={(e) => setExtraCalc({...extraCalc, ai: e.target.checked})} className="w-4 h-4 accent-emerald-600 rounded" />
                              <label htmlFor="ex_ai" className="text-[10px] font-black text-slate-600 uppercase cursor-pointer">AI Modul</label>
                           </div>
                           <div className="flex items-center gap-2 p-2 px-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                              <input type="checkbox" id="ex_bot" checked={extraCalc.bot} onChange={(e) => setExtraCalc({...extraCalc, bot: e.target.checked})} className="w-4 h-4 accent-emerald-600 rounded" />
                              <label htmlFor="ex_bot" className="text-[10px] font-black text-slate-600 uppercase cursor-pointer">TG Bot</label>
                           </div>
                        </div>
                     </div>

                     <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-100/50 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="text-center sm:text-left">
                           <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 opacity-70 cursor-default">Jami qo'shimcha to'lov:</p>
                           <div className="text-3xl font-black text-white font-mono tracking-tighter">{calcExtraPrice().toLocaleString()} <span className="text-sm font-bold text-emerald-200">so'm</span></div>
                        </div>
                        <button className="w-full sm:w-auto px-10 py-4 bg-white text-emerald-600 rounded-2xl font-black hover:bg-emerald-50 transition-all uppercase text-xs tracking-widest shadow-xl active:scale-95">SOTIB OLISH</button>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Simulation Office */}
          <div className="lg:col-span-1">
             <div className="sticky top-10 space-y-6">
                <div className="bg-gray-900 rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
                   
                   <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Calculator className="w-5 h-5" />
                         </div>
                         <div>
                            <h3 className="text-lg font-black text-white leading-none">Simulator Dashboard</h3>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Tariflar kalkulyatsiyasi</p>
                         </div>
                      </div>

                      {/* Filters */}
                      <div className="space-y-5">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">Tanlangan tarif</label>
                            <select 
                              value={simTariffKey}
                              onChange={(e) => setSimTariffKey(e.target.value as any)}
                              className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black uppercase text-xs cursor-pointer hover:bg-white/10"
                            >
                               <option value="start" className="bg-gray-900">START</option>
                               <option value="standard" className="bg-gray-900">STANDARD</option>
                               <option value="professional" className="bg-gray-900">PROFESSIONAL</option>
                               <option value="corporate" className="bg-gray-900">CORPORATE</option>
                            </select>
                         </div>

                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">Tashkilotlar soni</label>
                            <div className="relative">
                               <input 
                                 type="number" 
                                 value={simOrgCount}
                                 onChange={(e) => setSimOrgCount(Math.max(1, Number(e.target.value)))}
                                 className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-xl font-mono"
                               />
                               <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest">orgs</span>
                            </div>
                         </div>

                         <div className="pt-2">
                            <button 
                              onClick={() => setSimAiOptimized(!simAiOptimized)}
                              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${simAiOptimized ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
                            >
                               <div className="flex items-center gap-3">
                                  <Sparkles className={`w-5 h-5 ${simAiOptimized ? 'animate-pulse' : ''}`} />
                                  <div className="text-left">
                                     <p className="text-[10px] font-black uppercase tracking-tighter">Intellektual Optimizatsiya</p>
                                     <p className="text-[8px] font-bold opacity-60 uppercase">Gemini 2.0 Flash & Lite</p>
                                  </div>
                               </div>
                               <div className={`w-10 h-5 rounded-full relative transition-colors ${simAiOptimized ? 'bg-emerald-500' : 'bg-white/20'}`}>
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${simAiOptimized ? 'right-1' : 'left-1'}`}></div>
                                </div>
                            </button>
                         </div>
                      </div>

                      {/* Calculation results */}
                      <div className="pt-8 border-t border-white/10 space-y-6">
                         {(() => {
                           const tariff = tariffsConfig[simTariffKey];
                           const footprint = calculateGlobalFootprint(tariff, simOrgCount);
                           
                           const sPrice = (simTariffKey === 'corporate' ? calcCorpPrice() : (tariff.price || 0));
                           const rev = sPrice * simOrgCount;
                           const cost = footprint.total;
                           const profit = rev - cost;
                           const isProfit = profit > 0;

                           return (
                             <>
                                <div className="space-y-1">
                                   <div className="flex justify-between items-end">
                                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Yuklama</p>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${footprint.isFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                         {footprint.isFree ? 'BEPUL LIMIT ICHIDA' : 'LIMITDAN OSHDI'}
                                      </span>
                                   </div>
                                   <div className="text-xl font-black text-white font-mono">{footprint.totalOps.toLocaleString()} <span className="text-[8px] opacity-30 uppercase">ops/oy</span></div>
                                   <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                                      <div 
                                        className={`h-full transition-all duration-1000 ${footprint.isFree ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                        style={{ width: `${Math.min(100, (footprint.totalOps / footprint.freeLimit) * 100)}%` }}
                                      ></div>
                                   </div>
                                </div>

                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Jami oylik tushum</p>
                                   <div className="text-2xl font-black text-white font-mono tracking-tighter">{rev.toLocaleString()} <span className="text-[10px] text-white/30 uppercase">sum</span></div>
                                </div>
                                
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">AI orqali yaratish xarajatlari</p>
                                   <div className="text-sm font-black text-amber-400 font-mono tracking-tight">
                                      {footprint.ai === 0 ? '0' : `-${footprint.ai.toLocaleString()}`} 
                                      <span className="text-[9px] opacity-40 uppercase ml-1">sum</span>
                                   </div>
                                   <p className="text-[8px] text-white/20 italic">(kurs, test, mavzu, quizizz, imtihon)</p>
                                </div>

                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tizim oylik to'lovlari (Paid)</p>
                                   <div className="text-sm font-black text-indigo-400 font-mono tracking-tight">
                                      {(footprint.total - footprint.ai) === 0 ? '0' : `-${(footprint.total - footprint.ai).toLocaleString()}`} 
                                      <span className="text-[9px] opacity-40 uppercase ml-1">sum</span>
                                   </div>
                                   {footprint.isFree ? (
                                     <p className="text-[8px] text-emerald-400/50 italic">Hozirgi yuklama Bepul limit ichida.</p>
                                   ) : (
                                     <p className="text-[8px] text-amber-400/50 italic">Limitdan oshgan {footprint.exceedsByOps.toLocaleString()} operatsiya xarajati.</p>
                                   )}
                                </div>

                                <div className={`p-5 rounded-[28px] border transition-all ${isProfit ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-red-500/10 border-red-500/20'}`}>
                                   <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {isProfit ? 'Sof foyda (oylik)' : 'Zarar (oylik)'}
                                   </p>
                                   <div className={`text-2xl font-black font-mono tracking-tighter ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {isProfit ? "+" : "-"}{Math.abs(profit).toLocaleString()}
                                      <span className="text-[10px] ml-1 opacity-60 uppercase">sum</span>
                                   </div>
                                   {rev > 0 && (
                                     <div className={`text-[10px] font-black mt-1 opacity-50 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                        Rentabellik: {((profit/rev)*100).toFixed(1)}%
                                     </div>
                                   )}
                                </div>
                             </>
                           );
                         })()}
                      </div>
                   </div>
                </div>
                
                <div className="p-8 bg-white border border-gray-100 rounded-[40px] space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">AI Operatsiyasi Narxi (1 dona)</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { label: "Kurs yaratish", price: systemCosts.aiUnitCosts.course, icon: BookOpen },
                      { label: "Test yaratish", price: systemCosts.aiUnitCosts.test, icon: FileText },
                      { label: "Imtihon yaratish", price: systemCosts.aiUnitCosts.exam, icon: Zap },
                      { label: "Quizizz yaratish", price: systemCosts.aiUnitCosts.quizizz, icon: HardDrive },
                      { label: "Mavzu yaratish", price: systemCosts.aiUnitCosts.subject, icon: LayoutDashboard },
                    ].map((unit, idx) => {
                      const finalPrice = simAiOptimized ? Math.ceil(unit.price * 0.3) : unit.price;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-amber-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <unit.icon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{unit.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-amber-600 font-mono tracking-tighter">{finalPrice.toLocaleString()} sum</div>
                            {simAiOptimized && <div className="text-[7px] text-emerald-500 font-black uppercase">Lite Optimized</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 leading-relaxed italic">
                    * Gemini 2.0 Flash va Flash-Lite muhitida o'rtacha iqtisodiy samaradorlik hisobga olingan.
                  </p>
                </div>

                <div className="p-8 bg-gray-50 border border-gray-100 rounded-[40px] space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-900 uppercase">Analysis</h4>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">
                    Tariflar iqtisodiyoti tranzaksiyalar, saqlash va API yuklamalariga asoslangan holda real vaqtda hisoblanadi.
                  </p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-lg w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  Billing sozlamalari
                </h3>
                <p className="text-sm font-bold text-gray-400 mt-1">
                  {editingUser.displayName}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Yangi to'lov summasi (so'mda)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Masalan: 50000"
                    value={editIncome || ""}
                    onChange={(e) => setEditIncome(Number(e.target.value))}
                    className="w-full px-6 py-5 bg-indigo-50/30 rounded-2xl border-2 border-indigo-100 focus:border-indigo-600 focus:bg-white transition-all font-black text-2xl text-indigo-700"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-indigo-300 uppercase tracking-tighter">
                    sum
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 italic mt-1">
                  * Bu summa jami tushumga qo'shiladi.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Chiqim summasi
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Masalan: 5000"
                    value={editExpense || ""}
                    onChange={(e) => setEditExpense(Number(e.target.value))}
                    className="w-full px-6 py-5 bg-red-50/30 rounded-2xl border-2 border-red-100 focus:border-red-600 focus:bg-white transition-all font-black text-2xl text-red-700"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-red-300 uppercase tracking-tighter">
                    sum
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 italic mt-1">
                  * Bu summa ishlatilgan summaga qo'shiladi.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-400">Jami tushum bo'ladi:</span>
                  <span className="text-gray-900">
                    {(
                      (editingUser.totalIncome || 0) + (editIncome || 0)
                    ).toLocaleString()}{" "}
                    so'm
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-400">
                    Ishlatilgan summa bo'ladi:
                  </span>
                  <span className="text-red-500 font-black">
                    {(
                      (editingUser.totalSpentAmount || 0) +
                      Math.abs(editExpense || 0)
                    ).toLocaleString()}{" "}
                    so'm
                  </span>
                </div>
              </div>

              <button
                onClick={handleUpdateUser}
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Save className="w-6 h-6" />
                )}
                SOZLAMALARNI SAQLASH
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingHistoryUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-2xl w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  To'lovlar tarixi
                </h3>
                <p className="text-sm font-bold text-gray-400 mt-1">
                  {viewingHistoryUser.displayName}
                </p>
              </div>
              <button
                onClick={() => setViewingHistoryUser(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 overflow-x-auto max-h-[60vh]">
              {!viewingHistoryUser.billingHistory ||
              viewingHistoryUser.billingHistory.length === 0 ? (
                <p className="text-center font-bold text-gray-400 py-10">
                  Tarix mavjud emas
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Sana
                      </th>
                      <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Turi
                      </th>
                      <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                        Summa
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...viewingHistoryUser.billingHistory]
                      .reverse()
                      .map((record: any, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-white transition-colors"
                        >
                          <td className="py-4 font-bold text-gray-600 text-sm">
                            {new Date(record.date).toLocaleString()}
                          </td>
                          <td className="py-4">
                            <span
                              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${record.type === "kirim" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                            >
                              {record.type}
                            </span>
                          </td>
                          <td
                            className={`py-4 font-black text-right ${record.type === "kirim" ? "text-green-600" : "text-red-600"}`}
                          >
                            {record.description || (
                              <>
                                {record.amount > 0 ? "+" : ""}
                                {record.amount.toLocaleString()} so'm
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Edit Modal */}
      {isEditingCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Karta tahrirlash</h3>
              <button 
                onClick={() => setIsEditingCard(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Karta raqami</label>
                <input
                  type="text"
                  value={cardForm.number}
                  onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })}
                  placeholder="9860 0000 0000 0000"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-black font-mono transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Karta egasi (F.I.SH)</label>
                <input
                  type="text"
                  value={cardForm.owner}
                  onChange={(e) => setCardForm({ ...cardForm, owner: e.target.value })}
                  placeholder="S.O. ELYORBEK"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-black uppercase transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Karta turi (Humo/Uzcard)</label>
                <select
                  value={cardForm.type}
                  onChange={(e) => setCardForm({ ...cardForm, type: e.target.value })}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-black transition-all"
                >
                  <option value="Humo">Humo</option>
                  <option value="Uzcard">Uzcard</option>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                </select>
              </div>

              <button
                onClick={handleSaveCard}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-sm tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Saqlash
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingTariffKey && editingTariffForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-350">
          <div className="bg-white max-w-lg w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-350 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase">
                  {editingTariffKey} sozlamalari
                </h3>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  Tarif limitlari va narxlarini sozlash
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTariffKey(null);
                  setEditingTariffForm(null);
                }}
                className="p-3 hover:bg-gray-100 rounded-2xl"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* For standard tiers */}
              {(editingTariffKey === "start" || editingTariffKey === "standard" || editingTariffKey === "professional") && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Oylik Summa (so'm)
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.price ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, price: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        m ta Talaba
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.students ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, students: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        n ta Xodim
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.staff ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, staff: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 py-2 pl-1">
                    <input
                      type="checkbox"
                      id="edit_hasAI"
                      checked={editingTariffForm.hasAI ?? false}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, hasAI: e.target.checked })}
                      className="w-5 h-5 rounded cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="edit_hasAI" className="text-sm font-bold text-gray-700 cursor-pointer">
                      AI imkoniyatlari kiritilgan
                    </label>
                  </div>
                  <div className="flex items-center gap-4 py-2 pl-1">
                    <input
                      type="checkbox"
                      id="edit_hasBot"
                      checked={editingTariffForm.hasBot ?? false}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, hasBot: e.target.checked })}
                      className="w-5 h-5 rounded cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="edit_hasBot" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Telegram Bot integratsiyasi kiritilgan
                    </label>
                  </div>

                  <div className="border-t border-gray-100 pt-6 space-y-4">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest pl-1">
                      Imkoniyatlar limiti cheklovlari
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta kurs yarata bilishligi
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxCourses ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxCourses: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta test (mavzu & matn)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxTests ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxTests: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta imtihon yarata olishi
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxExams ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxExams: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta mavzu yarata olishi
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxSubjects ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxSubjects: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">
                        Nechta quizizz yarata olishligi
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.maxQuizizz ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxQuizizz: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* For Corporate tier */}
              {editingTariffKey === "corporate" && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Asosiy oylik to'lov (Base Price) - so'm
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.basePrice ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, basePrice: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Talaba narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStudent ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStudent: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Xodim narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStaff ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStaff: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        AI modulu narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.aiPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, aiPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        Telegram Bot narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.botPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, botPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Kurs narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perCourse ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perCourse: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Test narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perTest ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perTest: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Imtihon narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perExam ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perExam: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Mavzu narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perSubject ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perSubject: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      1 ta Quizizz narxi/oy (Corporate)
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.perQuizizz ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perQuizizz: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold shadow-sm"
                    />
                  </div>
                </>
              )}

              {/* For Extra Limits */}
              {editingTariffKey === "extra" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha 1 ta Talaba
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStudent ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStudent: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha 1 ta Xodim
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStaff ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStaff: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha AI (1 oy)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.aiPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, aiPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha TG Bot/Xabarlar
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.botPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, botPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Kurs narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perCourse ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perCourse: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Test narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perTest ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perTest: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Imtihon narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perExam ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perExam: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Mavzu narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perSubject ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perSubject: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                      Qo'shish: 1 ta Quizizz narxi (Extra)
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.perQuizizz ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perQuizizz: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold shadow-sm"
                    />
                  </div>
                  <div className="border-t border-gray-150 pt-6 mt-6 space-y-4">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest pl-1">
                      Mustaqil o'qituvchi 1 birlik limit narxlari (so'm)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Yo'nalish (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_departments_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_departments_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Guruhlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_groups_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_groups_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Talabalar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_students_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_students_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Mavzular (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_subjects_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_subjects_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Testlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_tests_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_tests_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Quizizz (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_quizizz_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_quizizz_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Imtihonlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_exams_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_exams_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Sertifikatlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_certificates_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_certificates_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleSaveTariff}
                disabled={savingTariff}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
              >
                {savingTariff ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Tarif Ma'lumotlarini Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
