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
  X,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Trash2,
  ArrowRight
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { activateTariffWithBalance } from '../lib/tariffService';
import BalanceTopUpModal from '../components/BalanceTopUpModal';


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
  extra: TariffConfig;
}

// Default fallbacks matching user pricing requirements
export const defaultTariffs: AllTariffsConfig = {
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
  const [cardSettings, setCardSettings] = useState({ number: "9860 2109 4567 8901", owner: "S. O. ELYORBEK", type: "Humo / Uzcard" });

  // Connection request state
  const [selectedTariff, setSelectedTariff] = useState<TariffConfig | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState('Click');
  const [receiptUrl, setReceiptUrl] = useState('');

  // New Organization Signup Modal states
  const [showNewOrgModal, setShowNewOrgModal] = useState<TariffConfig | null>(null);
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    phone: '',
    login: '',
    password: ''
  });

  // File Upload states
  const [receiptTab, setReceiptTab] = useState<'upload' | 'url'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileError, setFileError] = useState('');
  const [isCorpModalOpen, setIsCorpModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(false); // Used in some other context? No.

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      // If not an image, resolve as-is
      if (!base64Str.startsWith("data:image")) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 400; // Aggressive compression for Firestore 1MB limits safety
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.4)); // Space optimization
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleFileChange = async (file: File) => {
    setFileError('');
    if (!file) return;

    // Show name and size info
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + " KB");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target?.result as string;
      if (rawBase64) {
        try {
          const compressed = await compressImage(rawBase64);
          setReceiptUrl(compressed);
        } catch (err) {
          setReceiptUrl(rawBase64);
        }
      }
    };
    reader.onerror = () => {
      setFileError("Faylni o'qishda xatolik yuz berdi");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileChange(e.dataTransfer.files[0]);
    }
  };

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
        const [tSnap, cSnap] = await Promise.all([
          getDoc(doc(db, "settings", "tariffs")),
          getDoc(doc(db, "settings", "payment_card"))
        ]);
        
        if (tSnap.exists()) {
          setConfigs({ ...defaultTariffs, ...tSnap.data() } as AllTariffsConfig);
        }
        if (cSnap.exists()) {
          const data = cSnap.data();
          setCardSettings({ 
            number: data.number || "9860 2109 4567 8901", 
            owner: data.owner || "S. O. ELYORBEK", 
            type: data.type || "Humo / Uzcard" 
          });
        }
      } catch (err) {
        console.warn("Failed to load configs from Firestore", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleActivateTariff = async () => {
    if (!user) return alert('Iltimos, tizimga kiring');
    
    // Refresh user balance to be sure
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    const currentBalance = Number(userData?.balance ?? userData?.ball ?? 0);
    const price = selectedTariff?.price || 0;

    if (currentBalance < price) {
      alert("Hisobingizdagi mablag' yetarli emas. Avval hisobingizni to'ldiring.");
      setIsBalanceModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    const result = await activateTariffWithBalance(
      user.uid,
      selectedTariff?.name?.toLowerCase() || 'tariff',
      (selectedTariff || {}) as any
    );

    setIsSubmitting(false);
    if (result.success) {
      alert(result.message);
      setSelectedTariff(null);
    } else {
      alert(result.message);
    }
  };

  const handleNewOrgSignup = async () => {
    if (!showNewOrgModal) return;
    if (!newOrgData.name || !newOrgData.phone || !newOrgData.login || !newOrgData.password || !receiptUrl) {
      return alert("Barcha maydonlarni to'ldiring va chekni yuklang.");
    }
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'connection_requests'), {
        isNewOrgRequest: true,
        userName: newOrgData.name,
        phone: newOrgData.phone,
        login: newOrgData.login,
        password: newOrgData.password,
        tariffName: showNewOrgModal.name,
        tariffPrice: showNewOrgModal.price || showNewOrgModal.basePrice || 0,
        limits: null,
        paymentType,
        receiptUrl,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Notify Telegram Admins
      try {
        fetch('/api/notify-connection-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: docRef.id,
            data: {
              userName: newOrgData.name,
              phone: newOrgData.phone,
              login: newOrgData.login,
              password: newOrgData.password,
              tariffName: showNewOrgModal.name,
              tariffPrice: showNewOrgModal.price || showNewOrgModal.basePrice || 0,
              paymentType,
              receiptUrl,
              isNewOrgRequest: true,
              limits: null
            }
          })
        });
      } catch (e) {}

      alert("Ro'yxatdan o'tish so'rovi yuborildi! Admin tasdiqlagandan so'ng login/parol orqali kirishingiz mumkin.");
      setShowNewOrgModal(null);
      setNewOrgData({ name: '', phone: '', login: '', password: '' });
      setReceiptUrl('');
      setFileName('');
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Joriy balans</h2>
          <p className="text-3xl font-black text-emerald-600 mt-1">
            {Number((user as any)?.balance ?? (user as any)?.ball ?? 0).toLocaleString('uz-UZ')} UZS
          </p>
        </div>
        <button 
          onClick={() => setIsBalanceModalOpen(true)}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase text-xs tracking-widest"
        >
          Hisobni to'ldirish
        </button>
      </div>

      {/* Modal for Connection Request */}
      {selectedTariff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tarifni faollashtirish</h3>
              <button onClick={() => setSelectedTariff(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tanlangan tarif</div>
                <div className="text-lg font-black text-slate-800">{selectedTariff.name} — {(selectedTariff.price || 0).toLocaleString()} UZS / oy</div>
              </div>

              <button 
                onClick={handleActivateTariff}
                disabled={isSubmitting}
                className="w-full py-5 rounded-3xl bg-emerald-600 text-white font-black text-sm tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Faollashtirilmoqda...' : 'Hisobdan yechib olish va faollashtirish'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      <BalanceTopUpModal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} />

      {/* Modal for New Organization Request (Guest) */}
      {showNewOrgModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tashkilot sifatida ro'yxatdan o'tish</h3>
              <button onClick={() => setShowNewOrgModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Tashkilot nomi</label>
                  <input 
                    type="text" 
                    value={newOrgData.name}
                    onChange={e => setNewOrgData({...newOrgData, name: e.target.value})}
                    placeholder="Masalan: Innovatsiya O'quv Markazi"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Tel raqam</label>
                  <input 
                    type="text" 
                    value={newOrgData.phone}
                    onChange={e => setNewOrgData({...newOrgData, phone: e.target.value})}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Login</label>
                  <input 
                    type="text" 
                    value={newOrgData.login}
                    onChange={e => setNewOrgData({...newOrgData, login: e.target.value})}
                    placeholder="shaxsiy_login"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Parol</label>
                  <input 
                    type="password" 
                    value={newOrgData.password}
                    onChange={e => setNewOrgData({...newOrgData, password: e.target.value})}
                    placeholder="******"
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tanlangan tarif</div>
                  <div className="text-sm font-black text-slate-800">{showNewOrgModal.name} — {(showNewOrgModal.price || showNewOrgModal.basePrice || 0).toLocaleString()} UZS</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Karta raqamimiz ({cardSettings.type}):</p>
                  <p className="text-sm font-black font-mono text-gray-800">{cardSettings.number}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{cardSettings.owner}</p>
                  <p className="text-[10px] text-amber-600 font-bold mt-2">
                    💡 Ushbu karta raqamiga to'lov qilib, pastda to'lov cheki (skrinshot) rasmini yuklang.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">To'lov chekini yuklang</label>
              {!receiptUrl ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative ${
                    dragActive ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-600">Chek rasmini yuklang</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={receiptUrl} alt="Receipt" className="w-12 h-12 rounded-lg object-cover" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Chek yuklandi</span>
                  </div>
                  <button onClick={() => setReceiptUrl('')} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            <button 
              onClick={handleNewOrgSignup}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm tracking-widest uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {isSubmitting ? 'Yuborilmoqda...' : 'Yuborish va ro\'yxatdan o\'tish'}
            </button>
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

      {/* SECTION 1: TASHKILOT UCHUN TARIFLAR */}
      <div className="space-y-6 pt-4">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
            🏢 Tashkilot uchun tariflar
          </h2>
          <p className="text-gray-400 text-sm font-semibold mt-1">
            Tashkilotingiz o'lchami va ehtiyojlariga mos keladigan tariflar to'plami.
          </p>
        </div>

        {/* Grid of 3 Tariffs in one row on desktop: START, STANDARD, PROFESSIONAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* START */}
          <div className="p-6 rounded-[32px] border-2 border-gray-100 hover:border-orange-200 transition-all bg-white relative group flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl">🥉</span>
                <span className="px-2.5 py-1 bg-orange-50 rounded-full text-[9px] font-black text-orange-500 uppercase tracking-widest border border-orange-100">START</span>
              </div>
              <h3 className="text-xl font-black text-gray-950 mb-1">START TARIF</h3>
              <div className="text-2xl font-black text-orange-600 mb-4 font-mono">
                {(configs.start.price ?? 300000).toLocaleString()} <span className="text-xs font-black text-gray-400">so'm/oy</span>
              </div>
              
              <p className="text-gray-400 text-xs font-bold mb-4 line-clamp-2">Kichik guruhlar va individual oʻqituvchilar uchun ideal boshlang'ich paket.</p>
              
              <ul className="space-y-2.5 mb-6 border-t border-gray-50 pt-3">
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.students ?? 50} ta-talabalar
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.staff ?? 2} ta-xodimlar
                </li>
                <div className="mx-7 py-1.5 px-3 bg-orange-50 rounded-lg border border-orange-100/50 flex items-center gap-2 mb-2">
                   <Users className="w-3.5 h-3.5 text-orange-600" />
                   <span className="text-[9px] font-black text-orange-700 uppercase tracking-tighter">Har bir xodim uchun limit:</span>
                </div>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.maxCourses ?? 3} ta kurs
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.maxTests ?? 15} ta test
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.maxExams ?? 2} ta imtihon
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.maxSubjects ?? 5} ta mavzu
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> {configs.start.maxQuizizz ?? 4} ta quizizz
                </li>
                <li className={`text-xs font-bold flex items-center gap-2.5 ${configs.start.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                  {configs.start.hasAI ? <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> : <XIcon />} Sun'iy Intellekt
                </li>
                <li className={`text-xs font-bold flex items-center gap-2.5 ${configs.start.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                  {configs.start.hasBot ? <Check className="w-4.5 h-4.5 text-orange-500 shrink-0" /> : <XIcon />} Telegram Bot
                </li>
              </ul>
            </div>
            <button 
              onClick={() => user ? setSelectedTariff(configs.start) : setShowNewOrgModal(configs.start)}
              className="w-full py-3 bg-gray-50 text-gray-800 rounded-xl font-black hover:bg-orange-600 hover:text-white hover:shadow-lg transition-all uppercase text-xs tracking-wider"
            >
              {user ? "Tashkilotga ulash" : "Tanlangan tarifga ulanish"}
            </button>
          </div>

          {/* STANDARD */}
          <div className="p-6 rounded-[32px] border-2 border-blue-600 bg-white relative group flex flex-col justify-between shadow-xl shadow-blue-50">
            <div className="absolute -top-3.5 right-6 bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Ommabop</div>
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl">🥈</span>
                <span className="px-2.5 py-1 bg-blue-50 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">STANDARD</span>
              </div>
              <h3 className="text-xl font-black text-gray-950 mb-1">STANDARD TARIF</h3>
              <div className="text-2xl font-black text-blue-600 mb-4 font-mono">
                {(configs.standard.price ?? 700000).toLocaleString()} <span className="text-xs font-black text-gray-400">so'm/oy</span>
              </div>
              
              <p className="text-gray-400 text-xs font-bold mb-4 line-clamp-2">Oʻrta hajmdagi oʻquv markazlari va guruhlar boshqaruvi uchun keng qamrovli tizim.</p>
              
              <ul className="space-y-2.5 mb-6 border-t border-gray-50 pt-3">
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.students ?? 200} ta-talabalar
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.staff ?? 5} ta-xodimlar
                </li>
                <div className="mx-7 py-1.5 px-3 bg-blue-50 rounded-lg border border-blue-100/50 flex items-center gap-2 mb-2">
                   <Users className="w-3.5 h-3.5 text-blue-600" />
                   <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Har bir xodim uchun limit:</span>
                </div>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.maxCourses ?? 10} ta kurs
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.maxTests ?? 50} ta test
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.maxExams ?? 10} ta imtihon
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.maxSubjects ?? 20} ta mavzu
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> {configs.standard.maxQuizizz ?? 15} ta quizizz
                </li>
                <li className={`text-xs font-bold flex items-center gap-2.5 ${configs.standard.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                  {configs.standard.hasAI ? <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> : <XIcon />} Sun'iy Intellekt
                </li>
                <li className={`text-xs font-bold flex items-center gap-2.5 ${configs.standard.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                  {configs.standard.hasBot ? <Check className="w-4.5 h-4.5 text-blue-500 shrink-0" /> : <XIcon />} Telegram Bot
                </li>
              </ul>
            </div>
            <button 
              onClick={() => user ? setSelectedTariff(configs.standard) : setShowNewOrgModal(configs.standard)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all uppercase text-xs tracking-wider"
            >
              {user ? "Tashkilotga ulash" : "Tanlangan tarifga ulanish"}
            </button>
          </div>

          {/* PROFESSIONAL */}
          <div className="p-6 rounded-[32px] border-2 border-gray-100 hover:border-amber-200 transition-all bg-white relative group flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl">🥇</span>
                <span className="px-2.5 py-1 bg-amber-50 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest border border-amber-100">PROFESSIONAL</span>
              </div>
              <h3 className="text-xl font-black text-gray-950 mb-1">PROFESSIONAL TARIF</h3>
              <div className="text-2xl font-black text-amber-500 mb-4 font-mono">
                {(configs.professional.price ?? 1500000).toLocaleString()} <span className="text-xs font-black text-gray-400">so'm/oy</span>
              </div>
              
              <p className="text-gray-400 text-xs font-bold mb-4 line-clamp-2">Katta oʻquv maskanlari va ilgʻor AI-innovatsiyalardan foydalanuvchi brendlar.</p>
              
              <ul className="space-y-2.5 mb-6 border-t border-gray-50 pt-3">
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.students ?? 1000} ta-talabalar
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.staff ?? 20} ta-xodimlar
                </li>
                <div className="mx-7 py-1.5 px-3 bg-amber-50 rounded-lg border border-amber-100/50 flex items-center gap-2 mb-2">
                   <Users className="w-3.5 h-3.5 text-amber-600" />
                   <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">Har bir xodim uchun limit:</span>
                </div>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.maxCourses ?? 50} ta kurs
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.maxTests ?? 300} ta test
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.maxExams ?? 50} ta imtihon
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.maxSubjects ?? 100} ta mavzu
                </li>
                <li className="text-xs font-bold text-gray-600 flex items-center gap-2.5">
                  <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> {configs.professional.maxQuizizz ?? 100} ta quizizz
                </li>
                <li className={`text-xs font-bold flex items-center gap-2.5 ${configs.professional.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                  {configs.professional.hasAI ? <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> : <XIcon />} Sun'iy Intellekt
                </li>
                <li className={`text-xs font-bold flex items-center gap-2.5 ${configs.professional.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                  {configs.professional.hasBot ? <Check className="w-4.5 h-4.5 text-amber-500 shrink-0" /> : <XIcon />} Telegram Bot
                </li>
              </ul>
            </div>
            <button 
              onClick={() => user ? setSelectedTariff(configs.professional) : setShowNewOrgModal(configs.professional)}
              className="w-full py-3 bg-gray-50 text-gray-800 rounded-xl font-black hover:bg-amber-500 hover:text-white hover:shadow-lg transition-all uppercase text-xs tracking-wider"
            >
              {user ? "Tashkilotga ulash" : "Tanlangan tarifga ulanish"}
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 2: TASHKILOT XODIMLARI VA MUSTAQIL O'QITUVCHILAR UCHUN TARIFLAR */}
      <div className="space-y-6 pt-4">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
            tashkilot xodimlari va mustaqil o'qituvchilar uchun tarif
          </h2>
          <p className="text-gray-400 text-sm font-semibold mt-1">
            Qo'shimcha resursga ehtiyoji bor joriy foydalanuvchilar va mustaqil o'qituvchilar uchun ideal qo'shimcha limitlar.
          </p>
        </div>

        {/* ➕ EXTRA LIMITS: Static Pricing Card */}
        <div className="bg-white rounded-[32px] border border-emerald-100 shadow-sm overflow-hidden flex flex-col md:flex-row max-w-5xl">
          <div className="p-8 bg-emerald-50/50 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-emerald-100">
            <h3 className="text-3xl font-black text-gray-950 flex items-center gap-3">
              ➕ EXTRA LIMITS
            </h3>
            <p className="text-gray-500 text-sm font-semibold mt-4 leading-relaxed">
              Tashkilotingizning joriy tarifiga qo'shimcha ravishda faqatgina kerakli resurslarni sotib oling. Ushbu limitlar har bir birlik uchun maxsus hisoblanadi.
            </p>
          </div>
          
          <div className="p-8 md:w-2/3">
            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Tarifstavkalar (Birlik narxlari)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Talaba qo'shish</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perStudent ?? 1500).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Xodim qo'shish</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perStaff ?? 15000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Kurs / Darslik</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perCourse ?? 50000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Test yaratish</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perTest ?? 3000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Imtihon yaratish</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perExam ?? 20000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Mavzu qo'shish</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perSubject ?? 6000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Quizizz</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.perQuizizz ?? 6000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">AI / Sun'iy Intellekt (oy)</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.aiPrice ?? 350000).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Telegram Bot (oy)</span>
                <span className="text-xs font-black text-emerald-600">{(configs.extra.botPrice ?? 250000).toLocaleString()} UZS</span>
              </div>
            </div>
            
            <p className="text-[10px] font-semibold text-emerald-600 leading-normal italic mt-4 text-right">
              * Ushbu qo'shimcha resurslarni xarid qilish uchun admin botga (Telegram) murojaat qiling yoki platforma orqali administrator bilan bog'laning.
            </p>
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
