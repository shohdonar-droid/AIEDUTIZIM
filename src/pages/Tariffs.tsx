import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
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
  Sparkles,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../hooks/useAuth";

interface TariffConfig {
  name?: string;
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
    name: "START",
    price: 300000,
    students: 50,
    staff: 2,
    hasAI: false,
    hasBot: false,
    maxCourses: 3,
    maxTests: 15,
    maxExams: 2,
    maxSubjects: 5,
    maxQuizizz: 4
  },
  standard: {
    name: "STANDARD",
    price: 700000,
    students: 200,
    staff: 5,
    hasAI: false,
    hasBot: true,
    maxCourses: 10,
    maxTests: 50,
    maxExams: 10,
    maxSubjects: 20,
    maxQuizizz: 15
  },
  professional: {
    name: "PROFESSIONAL",
    price: 1500000,
    students: 1000,
    staff: 20,
    hasAI: true,
    hasBot: true,
    maxCourses: 50,
    maxTests: 300,
    maxExams: 50,
    maxSubjects: 100,
    maxQuizizz: 100
  },
  corporate: {
    name: "CORPORATE",
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
    perQuizizz: 5000
  },
  extra: {
    name: "EXTRA",
    perStudent: 1500,
    perStaff: 15000,
    aiPrice: 350000,
    botPrice: 250000,
    perCourse: 50000,
    perTest: 3000,
    perExam: 20000,
    perSubject: 6000,
    perQuizizz: 6000
  }
};

const XIcon = () => <X className="w-5 h-5 text-gray-300 shrink-0" />;

export default function Tariffs() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<AllTariffsConfig>(defaultTariffs);
  const [loading, setLoading] = useState(true);

  // Connection request state
  const [selectedTariff, setSelectedTariff] = useState<TariffConfig | null>(null);
  const [paymentType, setPaymentType] = useState('Click');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Corporate calculator state
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

  // Extra limits calculator state
  const [extraCalc, setExtraCalc] = useState({
    students: 100,
    staff: 5,
    ai: true,
    bot: true,
    courses: 5,
    tests: 20,
    exams: 5,
    subjects: 10,
    quizizz: 10,
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

  const handleSubmitRequest = async () => {
    if (!user) return alert('Iltimos, tizimga kiring');
    if (!receiptUrl) return alert('Iltimos, chekni yuklang');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'connection_requests'), {
        userId: user.uid,
        userName: user.displayName || 'Noma\'lum',
        tariffName: selectedTariff?.name,
        tariffPrice: selectedTariff?.price,
        paymentType,
        receiptUrl,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      alert('Sorov yuborildi! Tez orada admin ko\'rib chiqadi.');
      setSelectedTariff(null);
      setReceiptUrl('');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcCorpPrice = () => {
    const base = configs.corporate.basePrice ?? 500000;
    const stdPrice = corpCalc.students * (configs.corporate.perStudent ?? 1000);
    const staffPrice = corpCalc.staff * (configs.corporate.perStaff ?? 10000);
    const aiPrice = corpCalc.ai ? (configs.corporate.aiPrice ?? 300000) : 0;
    const botPrice = corpCalc.bot ? (configs.corporate.botPrice ?? 200000) : 0;
    
    const coursesPrice = (corpCalc.courses ?? 0) * (configs.corporate.perCourse ?? 40000);
    const testsPrice = (corpCalc.tests ?? 0) * (configs.corporate.perTest ?? 2000);
    const examsPrice = (corpCalc.exams ?? 0) * (configs.corporate.perExam ?? 15000);
    const subjectsPrice = (corpCalc.subjects ?? 0) * (configs.corporate.perSubject ?? 5000);
    const quizizzPrice = (corpCalc.quizizz ?? 0) * (configs.corporate.perQuizizz ?? 5000);
    
    return base + stdPrice + staffPrice + aiPrice + botPrice + coursesPrice + testsPrice + examsPrice + subjectsPrice + quizizzPrice;
  };

  const calcExtraPrice = () => {
    const stdPrice = extraCalc.students * (configs.extra.perStudent ?? 1500);
    const staffPrice = extraCalc.staff * (configs.extra.perStaff ?? 15000);
    const aiPrice = extraCalc.ai ? (configs.extra.aiPrice ?? 350000) : 0;
    const botPrice = extraCalc.bot ? (configs.extra.botPrice ?? 250000) : 0;
    
    const coursesPrice = (extraCalc.courses ?? 0) * (configs.extra.perCourse ?? 50000);
    const testsPrice = (extraCalc.tests ?? 0) * (configs.extra.perTest ?? 3000);
    const examsPrice = (extraCalc.exams ?? 0) * (configs.extra.perExam ?? 20000);
    const subjectsPrice = (extraCalc.subjects ?? 0) * (configs.extra.perSubject ?? 6000);
    const quizizzPrice = (extraCalc.quizizz ?? 0) * (configs.extra.perQuizizz ?? 6000);
    
    return stdPrice + staffPrice + aiPrice + botPrice + coursesPrice + testsPrice + examsPrice + subjectsPrice + quizizzPrice;
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
      {/* Modal for Connection Request */}
      {selectedTariff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tarifga ulanish so'rovi</h3>
              <button onClick={() => setSelectedTariff(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tanlangan tarif</div>
                <div className="text-lg font-black text-slate-800">{selectedTariff.name} — {(selectedTariff.price || 0).toLocaleString()} UZS / oy</div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">To'lov turini tanlang</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Click', 'Payme', 'Uzum Bank', 'Bank'].map(type => (
                    <button
                      key={type}
                      onClick={() => setPaymentType(type)}
                      className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                        paymentType === type ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">To'lov chekini yuklang (URL)</label>
                <input 
                  type="text" 
                  value={receiptUrl}
                  onChange={e => setReceiptUrl(e.target.value)}
                  placeholder="Rasm havolasini kiriting..."
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
                />
              </div>

              <button 
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="w-full py-5 rounded-3xl bg-blue-600 text-white font-black text-sm tracking-widest uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Yuborilmoqda...' : 'Meni shu tarifga o\'tkazib bering'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header section with Centered styling */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <span className="px-4 py-2 rounded-full text-xs font-black bg-blue-50 text-blue-600 tracking-widest uppercase inline-block">
          Biznesingiz uchun eng yaxshi yechim
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
          Tariflar rejalari & Limitlar
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
            
            <ul className="space-y-3 mb-8 border-t border-gray-50 pt-4">
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.students ?? 50} ta-talabalar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.staff ?? 2} ta-xodimlar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.maxCourses ?? 3} ta kurs
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.maxTests ?? 15} ta test (mavzu va matn asosida)
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.maxExams ?? 2} ta imtihon
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.maxSubjects ?? 5} ta mavzu
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-orange-500 shrink-0" /> {configs.start.maxQuizizz ?? 4} ta quizizz
              </li>
              <li className={`text-sm font-bold flex items-center gap-3 ${configs.start.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                {configs.start.hasAI ? <Check className="w-5 h-5 text-orange-500 shrink-0" /> : <XIcon />} Sun'iy Intellekt orqali test generatsiyasi
              </li>
              <li className={`text-sm font-bold flex items-center gap-3 ${configs.start.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                {configs.start.hasBot ? <Check className="w-5 h-5 text-orange-500 shrink-0" /> : <XIcon />} Telegram Bot integratsiyasi
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTariff(configs.start)}
            className="w-full py-4 bg-gray-50 text-gray-800 rounded-2xl font-black hover:bg-orange-600 hover:text-white hover:shadow-lg transition-all uppercase text-sm tracking-wider"
          >
            Tashkilotga ulash
          </button>
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
            
            <ul className="space-y-3 mb-8 border-t border-gray-50 pt-4">
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.students ?? 200} ta-talabalar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.staff ?? 5} ta-xodimlar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.maxCourses ?? 10} ta kurs
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.maxTests ?? 50} ta test (mavzu va matn asosida)
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.maxExams ?? 10} ta imtihon
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.maxSubjects ?? 20} ta mavzu
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-blue-500 shrink-0" /> {configs.standard.maxQuizizz ?? 15} ta quizizz
              </li>
              <li className={`text-sm font-bold flex items-center gap-3 ${configs.standard.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                {configs.standard.hasAI ? <Check className="w-5 h-5 text-blue-500 shrink-0" /> : <XIcon />} Sun'iy Intellekt orqali test generatsiyasi
              </li>
              <li className={`text-sm font-bold flex items-center gap-3 ${configs.standard.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                {configs.standard.hasBot ? <Check className="w-5 h-5 text-blue-500 shrink-0" /> : <XIcon />} Telegram Bot integratsiyasi
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTariff(configs.standard)}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all uppercase text-sm tracking-wider"
          >
            Tashkilotga ulash
          </button>
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
            
            <ul className="space-y-3 mb-8 border-t border-gray-50 pt-4">
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.students ?? 1000} ta-talabalar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.staff ?? 20} ta-xodimlar
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.maxCourses ?? 50} ta kurs
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.maxTests ?? 300} ta test (mavzu va matn asosida)
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.maxExams ?? 50} ta imtihon
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.maxSubjects ?? 100} ta mavzu
              </li>
              <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                <Check className="w-5 h-5 text-amber-500 shrink-0" /> {configs.professional.maxQuizizz ?? 100} ta quizizz
              </li>
              <li className={`text-sm font-bold flex items-center gap-3 ${configs.professional.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                {configs.professional.hasAI ? <Check className="w-5 h-5 text-amber-500 shrink-0" /> : <XIcon />} Sun'iy Intellekt orqali test generatsiyasi
              </li>
              <li className={`text-sm font-bold flex items-center gap-3 ${configs.professional.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                {configs.professional.hasBot ? <Check className="w-5 h-5 text-amber-500 shrink-0" /> : <XIcon />} Telegram Bot integratsiyasi
              </li>
            </ul>
          </div>
          <button 
            onClick={() => setSelectedTariff(configs.professional)}
            className="w-full py-4 bg-gray-50 text-gray-800 rounded-2xl font-black hover:bg-amber-500 hover:text-white hover:shadow-lg transition-all uppercase text-sm tracking-wider"
          >
            Tashkilotga ulash
          </button>
        </div>

      </div>

      {/* Dynamic Interactive Plans Section */}
      <div className="space-y-12">
        <div className="text-center space-y-2">
           <h2 className="text-3xl font-black text-gray-950">Maxsus tuziladigan moslanuvchan tariflar</h2>
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

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Kurslar sonini kiriting ({configs.corporate.perCourse ?? 40000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.courses}
                          onChange={(e) => setCorpCalc({...corpCalc, courses: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-slate-400">ta</span>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Testlar sonini kiriting ({configs.corporate.perTest ?? 2000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.tests}
                          onChange={(e) => setCorpCalc({...corpCalc, tests: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-slate-400">ta</span>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Imtihonlar sonini kiriting ({configs.corporate.perExam ?? 15000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.exams}
                          onChange={(e) => setCorpCalc({...corpCalc, exams: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-slate-400">ta</span>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Mavzular sonini kiriting ({configs.corporate.perSubject ?? 5000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.subjects}
                          onChange={(e) => setCorpCalc({...corpCalc, subjects: Math.max(0, Number(e.target.value))})}
                          className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                        />
                        <span className="text-xs font-black text-slate-400">ta</span>
                      </div>
                   </div>

                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Quizizzlar sonini kiriting ({configs.corporate.perQuizizz ?? 5000} soʻm/ta)
                      </label>
                      <div className="flex items-center bg-slate-800 rounded-2xl border-2 border-slate-700/60 overflow-hidden pr-3 focus-within:border-white">
                        <input 
                          type="number" 
                          min="0"
                          value={corpCalc.quizizz}
                          onChange={(e) => setCorpCalc({...corpCalc, quizizz: Math.max(0, Number(e.target.value))})}
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
                   <button 
                     onClick={() => setSelectedTariff({...configs.corporate, name: 'CORPORATE', price: calcCorpPrice()})}
                     className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg"
                   >
                     Shartnoma Tuzish
                   </button>
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

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                         Qoʻshimcha kurslar ({(configs.extra.perCourse ?? 50000).toLocaleString()} soʻm/ta)
                       </label>
                       <div className="flex items-center bg-emerald-950 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                         <input 
                           type="number" 
                           min="0"
                           value={extraCalc.courses}
                           onChange={(e) => setExtraCalc({...extraCalc, courses: Math.max(0, Number(e.target.value))})}
                           className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                         />
                         <span className="text-xs font-black text-emerald-400">ta</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                         Qoʻshimcha testlar ({(configs.extra.perTest ?? 3000).toLocaleString()} soʻm/ta)
                       </label>
                       <div className="flex items-center bg-emerald-950 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                         <input 
                           type="number" 
                           min="0"
                           value={extraCalc.tests}
                           onChange={(e) => setExtraCalc({...extraCalc, tests: Math.max(0, Number(e.target.value))})}
                           className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                         />
                         <span className="text-xs font-black text-emerald-400">ta</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                         Qoʻshimcha imtihonlar ({(configs.extra.perExam ?? 20000).toLocaleString()} soʻm/ta)
                       </label>
                       <div className="flex items-center bg-emerald-950 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                         <input 
                           type="number" 
                           min="0"
                           value={extraCalc.exams}
                           onChange={(e) => setExtraCalc({...extraCalc, exams: Math.max(0, Number(e.target.value))})}
                           className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                         />
                         <span className="text-xs font-black text-emerald-400">ta</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                         Qoʻshimcha mavzular ({(configs.extra.perSubject ?? 6000).toLocaleString()} soʻm/ta)
                       </label>
                       <div className="flex items-center bg-emerald-950 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                         <input 
                           type="number" 
                           min="0"
                           value={extraCalc.subjects}
                           onChange={(e) => setExtraCalc({...extraCalc, subjects: Math.max(0, Number(e.target.value))})}
                           className="w-full px-4 py-3 bg-transparent outline-none font-black text-lg text-white"
                         />
                         <span className="text-xs font-black text-emerald-400">ta</span>
                       </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                       <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest pl-1">
                         Qoʻshimcha quizizzlar ({(configs.extra.perQuizizz ?? 6000).toLocaleString()} soʻm/ta)
                       </label>
                       <div className="flex items-center bg-emerald-950 rounded-2xl border-2 border-emerald-800 overflow-hidden pr-3 focus-within:border-white">
                         <input 
                           type="number" 
                           min="0"
                           value={extraCalc.quizizz}
                           onChange={(e) => setExtraCalc({...extraCalc, quizizz: Math.max(0, Number(e.target.value))})}
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
                   <button 
                     onClick={() => setSelectedTariff({...configs.extra, name: 'EXTRA', price: calcExtraPrice()})}
                     className="w-full md:w-auto px-8 py-4 bg-white text-emerald-950 font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg"
                   >
                     Faollashtirish
                   </button>
                </div>
                <p className="text-[10px] font-medium text-emerald-400 leading-normal italic text-center">
                   * Diqqat: Qoʻshimcha sotib olinadigan limitlar xarid qilingan oyda amal qiladi va keyingi hisob-kitob davrida ulangan tarif oʻzining standart qiymatlariga qaytadi.
                </p>
             </div>
          </div>

        </div>
      </div>
      
      {/* Visual divider design */}
      <div className="rounded-[40px] border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center gap-6 justify-between p-8">
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
