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
  const [cardSettings, setCardSettings] = useState({ number: "9860 2109 4567 8901", owner: "S. O. ELYORBEK", type: "Humo / Uzcard" });

  // Connection request state
  const [selectedTariff, setSelectedTariff] = useState<TariffConfig | null>(null);
  const [paymentType, setPaymentType] = useState('Click');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Corporate calculator state
  const [corpCalc, setCorpCalc] = useState({
    students: 1,
    staff: 1,
    ai: true,
    bot: true,
    courses: 1,
    tests: 1,
    exams: 1,
    subjects: 1,
    quizizz: 1,
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

  const handleSubmitRequest = async () => {
    if (!user) return alert('Iltimos, tizimga kiring');
    if (!receiptUrl) return alert('Iltimos, chekni yuklang yoki rasm havolasini kiriting');
    if (receiptUrl.length > 800 * 1024) {
      return alert("Yuklangan chek rasmi hajmi juda katta! Iltimos, boshqa kichikroq o'lchamdagi chek rasmini yuklang.");
    }
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'connection_requests'), {
        userId: user.uid,
        userName: user.displayName || 'Noma\'lum',
        tariffName: selectedTariff?.name || "Noma'lum",
        tariffPrice: selectedTariff?.price || 0,
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
              userName: user.displayName || 'Noma\'lum',
              tariffName: selectedTariff?.name || "Noma'lum",
              tariffPrice: selectedTariff?.price || 0,
              paymentType,
              receiptUrl,
              phone: user.phone || ""
            }
          })
        });
      } catch (e) {}

      alert('Soʻrov yuborildi! Tez orada admin koʻrib chiqadi.');
      setSelectedTariff(null);
      setReceiptUrl('');
      setFileName('');
      setFileSize('');
    } catch (err) {
      console.error(err);
      alert('Soʻrov yuborishda xatolik yuz berdi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
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
        limits: showNewOrgModal.name === 'CORPORATE' ? corpCalc : null,
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
              limits: showNewOrgModal.name === 'CORPORATE' ? corpCalc : null
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

              {/* Payment Gateway UID Info & Direct Payment */}
              {user && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Sizning Platforma ID (UID):</p>
                      <p className="text-sm font-black font-mono text-amber-900 select-all">{user.uid}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(user.uid);
                        alert("UID nusxalandi! " + paymentType + " ilovasiga o'tib ushbu ID orqali to'lov qilishingiz mumkin.");
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                    >
                      Nusxalash
                    </button>
                  </div>
                  <p className="text-[11px] font-bold text-amber-700 leading-tight">
                    💡 <b>{paymentType}</b> ilovasiga kirib, xizmatlar ichidan bizning platformani qidiring va ushbu <b>UID</b> raqamingizni kiriting. Shuningdek, quyidagi tugma orqali to'g'ridan-to'g'ri to'lov sahifasiga o'tishingiz mumkin:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const amount = selectedTariff.price || 0;
                      let payUrl = "#";
                      if (paymentType === 'Click') {
                        payUrl = `https://my.click.uz/services/pay?id=12345&merchant_id=9999&amount=${amount}&transaction_param=${user.uid}`;
                      } else if (paymentType === 'Payme') {
                        payUrl = `https://checkout.paycom.uz/63a12b3c4d5e6f7a8b9c0d1e?m=63a12b3c4d5e6f7a8b9c0d1e&ac.user_id=${user.uid}&amount=${amount * 100}`;
                      } else if (paymentType === 'Uzum Bank') {
                        payUrl = `https://uzumbank.uz/pay?merchant_id=platform&account=${user.uid}&amount=${amount}`;
                      } else {
                        alert(`Karta raqamimiz (${cardSettings.number}) ga o'tkazma qiling.`);
                        return;
                      }
                      window.open(payUrl, '_blank');
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    🚀 {paymentType} orqali onlayn to'lash
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                  To'lov chekini jo'natish usuli
                </label>
                <div className="flex border border-gray-100 rounded-2xl bg-gray-50 p-1 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptTab('upload');
                      setReceiptUrl('');
                      setFileName('');
                      setFileSize('');
                      setFileError('');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      receiptTab === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Fayl yuklash (Chizma/Chek)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptTab('url');
                      setReceiptUrl('');
                      setFileName('');
                      setFileSize('');
                      setFileError('');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      receiptTab === 'url' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    Havola (URL)
                  </button>
                </div>

                {receiptTab === 'upload' ? (
                  <div className="space-y-4">
                    {!receiptUrl ? (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative ${
                          dragActive 
                            ? 'border-blue-600 bg-blue-50 text-blue-600' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 mb-2.5 animate-bounce text-slate-400 group-hover:text-blue-500" />
                        <p className="text-xs font-bold text-slate-600 mb-1">
                          Chek rasmi yoki faylni sudrab o'tkazing
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Yoki ustiga bosib kompyuterdan tanlang (Rasm/PDF formatlarida)
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {receiptUrl.startsWith('data:image') ? (
                            <img 
                              src={receiptUrl} 
                              alt="Chek preview" 
                              className="w-12 h-12 rounded-lg object-cover bg-white border border-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate" title={fileName || 'chek_yuklandi.png'}>
                              {fileName || 'Chek yuklandi'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold font-mono">
                              {fileSize || 'Oʻlchami nomaʻlum'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptUrl('');
                            setFileName('');
                            setFileSize('');
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {fileError && (
                      <p className="text-[10px] font-bold text-red-500 px-1">{fileError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input 
                      type="text" 
                      value={receiptUrl}
                      onChange={e => setReceiptUrl(e.target.value)}
                      placeholder="https://example.com/rasm.png yoki google drive havolasi..."
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
                    />
                  </div>
                )}
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

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">To'lov turini tanlang</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Click', 'Payme', 'Uzum Bank', 'Bank'].map(type => (
                      <button
                        key={type}
                        onClick={() => setPaymentType(type)}
                        className={`py-2 px-3 rounded-xl border-2 font-bold text-xs transition-all ${
                          paymentType === type ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-50 text-gray-400 hover:border-gray-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Karta raqami ({cardSettings.type}):</p>
                  <p className="text-sm font-black font-mono text-gray-800">{cardSettings.number}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{cardSettings.owner}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const amount = showNewOrgModal.price || showNewOrgModal.basePrice || 0;
                      let payUrl = "#";
                      if (paymentType === 'Click') {
                        payUrl = `https://my.click.uz/services/pay?id=12345&merchant_id=9999&amount=${amount}`;
                      } else if (paymentType === 'Payme') {
                        payUrl = `https://checkout.paycom.uz/63a12b3c4d5e6f7a8b9c0d1e?m=63a12b3c4d5e6f7a8b9c0d1e&amount=${amount * 100}`;
                      } else if (paymentType === 'Uzum Bank') {
                        payUrl = `https://uzumbank.uz/pay?merchant_id=platform&amount=${amount}`;
                      } else {
                        alert(`Karta raqamimiz (${cardSettings.number}) ga o'tkazma qiling.`);
                        return;
                      }
                      window.open(payUrl, '_blank');
                    }}
                    className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    🚀 {paymentType} orqali onlayn to'lash
                  </button>
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

        {/* Grid of 4 Tariffs in one row on desktop: START, STANDARD, PROFESSIONAL, CORPORATE */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
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
                   <span className="text-[9px] font-black text-orange-700 uppercase tracking-tighter">Sig'imi: 100-200 nafar talaba</span>
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
                   <span className="text-[9px] font-black text-blue-700 uppercase tracking-tighter">Sig'imi: 250-500 nafar talaba</span>
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
                   <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">Sig'imi: 1000-2000 nafar talaba</span>
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

          {/* CORPORATE */}
          <div className="p-6 rounded-[32px] border-2 border-indigo-100 hover:border-indigo-300 transition-all bg-gradient-to-b from-indigo-50/10 to-indigo-50/40 relative group flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Calculator className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">CORPORATE</span>
              </div>
              <h3 className="text-xl font-black text-gray-950 mb-1">CORPORATE</h3>
              <div className="text-3xl font-black text-indigo-600 mb-6 font-mono">
                {calcCorpPrice().toLocaleString()} <span className="text-sm font-black text-gray-400">sum/oy</span>
              </div>

              <div className="space-y-2 mb-6 bg-white/40 p-3 rounded-2xl border border-indigo-100/50">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.students} 
                        onChange={(e) => setCorpCalc({...corpCalc, students: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">nafar talaba</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.staff} 
                        onChange={(e) => setCorpCalc({...corpCalc, staff: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">nafar xodimlar</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.courses} 
                        onChange={(e) => setCorpCalc({...corpCalc, courses: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ta kurs</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.tests} 
                        onChange={(e) => setCorpCalc({...corpCalc, tests: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ta test</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.exams} 
                        onChange={(e) => setCorpCalc({...corpCalc, exams: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ta imtihon</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.subjects} 
                        onChange={(e) => setCorpCalc({...corpCalc, subjects: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ta mavzu</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <div className="flex items-center gap-2">
                      <input 
                        type="number" min="0" value={corpCalc.quizizz} 
                        onChange={(e) => setCorpCalc({...corpCalc, quizizz: Math.max(0, Number(e.target.value))})}
                        className="w-14 bg-slate-50 rounded-lg text-center font-black text-xs py-1.5 outline-none border border-transparent focus:border-indigo-400"
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ta quizizz</span>
                   </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Sun'iy Intellekt</span>
                   <input 
                      type="checkbox" checked={corpCalc.ai} 
                      onChange={(e) => setCorpCalc({...corpCalc, ai: e.target.checked})}
                      className="w-4 h-4 accent-indigo-600"
                   />
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-indigo-50">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Telegram Bot</span>
                   <input 
                      type="checkbox" checked={corpCalc.bot} 
                      onChange={(e) => setCorpCalc({...corpCalc, bot: e.target.checked})}
                      className="w-4 h-4 accent-indigo-600"
                   />
                </div>
              </div>

              <button 
                onClick={() => user ? setSelectedTariff({...configs.corporate, name: 'CORPORATE', price: calcCorpPrice()}) : setShowNewOrgModal({...configs.corporate, name: 'CORPORATE', price: calcCorpPrice()})}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
              >
                Tanlangan tarifga ulanish
              </button>

              <button 
                 onClick={() => setIsCorpModalOpen(true)}
                 className="w-full mt-3 py-3 bg-white/60 text-indigo-600 border border-indigo-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all"
              >
                 To'liq kalkulyator <ArrowRight className="w-3 h-3 inline ml-1" />
              </button>
            </div>
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

        {/* ➕ EXTRA LIMITS: Beautiful Horizontal Dynamic Card */}
        <div className="bg-white rounded-[40px] border-2 border-emerald-500/80 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left panel: Info about EXTRA LIMITS */}
          <div className="lg:col-span-4 bg-emerald-50/20 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-emerald-100/60 font-sans">
            <div className="space-y-6">
              <div className="flex items-center gap-3.5">
                <span className="text-3xl">➕</span>
                <div>
                  <h3 className="text-2xl font-black text-gray-950">EXTRA LIMITS</h3>
                  <span className="px-2.5 py-1 bg-emerald-100 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-200 block mt-1 w-max">
                    MOSLASHUVCHAN
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-500 text-sm font-bold leading-relaxed">
                  Tashkilotingizning joriy tarifiga qo'shimcha ravishda faqatgina kerakli resurslarni sotib oling.
                </p>
                <div className="p-4 bg-white/80 rounded-2xl border border-emerald-100/70 space-y-2">
                  <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Qo'shimcha Tarifstavkalari</div>
                  <ul className="text-xs font-bold text-gray-600 space-y-1">
                    <li>• Talaba: {(configs.extra.perStudent ?? 1500).toLocaleString()} so'm</li>
                    <li>• Xodim: {(configs.extra.perStaff ?? 15000).toLocaleString()} so'm</li>
                    <li>• Kurs/Darslik: {(configs.extra.perCourse ?? 50000).toLocaleString()} so'm</li>
                    <li>• Test materiallari: {(configs.extra.perTest ?? 3000).toLocaleString()} so'm</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-100/60">
              <p className="text-[10px] font-semibold text-emerald-600 leading-normal italic">
                * Diqqat: Qoʻshimcha sotib olinadigan limitlar faqat xarid qilingan joriy oy ichida amal qiladi. Keyingi oydan tarif standart qiymatiga qaytadi.
              </p>
            </div>
          </div>

          {/* Right panel: Active sliders & Inputs for EXTRA LIMITS */}
          <div className="lg:col-span-8 p-8 space-y-6">
            <div className="text-slate-900 font-bold text-sm border-b border-gray-100 pb-3 flex items-center justify-between">
              <span>Limitlarni qo'shish paneli</span>
              <span className="text-xs text-gray-400 font-semibold font-mono">Real-vaqtda hisoblanadi</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha talabalar ({configs.extra.perStudent ?? 1500} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.students}
                    onChange={(e) => setExtraCalc({...extraCalc, students: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha xodimi ({configs.extra.perStaff ?? 15000} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.staff}
                    onChange={(e) => setExtraCalc({...extraCalc, staff: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha kurslar ({(configs.extra.perCourse ?? 50000).toLocaleString()} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.courses}
                    onChange={(e) => setExtraCalc({...extraCalc, courses: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha testlar ({(configs.extra.perTest ?? 3000).toLocaleString()} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.tests}
                    onChange={(e) => setExtraCalc({...extraCalc, tests: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha imtihonlar ({(configs.extra.perExam ?? 20000).toLocaleString()} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.exams}
                    onChange={(e) => setExtraCalc({...extraCalc, exams: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha mavzular ({(configs.extra.perSubject ?? 6000).toLocaleString()} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.subjects}
                    onChange={(e) => setExtraCalc({...extraCalc, subjects: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 block">
                  Qoʻshimcha quizizzlar ({(configs.extra.perQuizizz ?? 6000).toLocaleString()} soʻm/ta)
                </label>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={extraCalc.quizizz}
                    onChange={(e) => setExtraCalc({...extraCalc, quizizz: Math.max(0, Number(e.target.value))})}
                    className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-150 hover:bg-slate-100/55 transition-all">
                <span className="text-xs font-bold text-slate-700">AI / Darsliklar qoʻshimcha (+{(configs.extra.aiPrice ?? 350000).toLocaleString()} sum/oy)</span>
                <input 
                  type="checkbox" 
                  checked={extraCalc.ai}
                  onChange={(e) => setExtraCalc({...extraCalc, ai: e.target.checked})}
                  className="w-5 h-5 rounded-md accent-emerald-600 shrink-0 cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-150 hover:bg-slate-100/55 transition-all">
                <span className="text-xs font-bold text-slate-700">Xabar yuborish / Bot (+{(configs.extra.botPrice ?? 250000).toLocaleString()} sum/oy)</span>
                <input 
                  type="checkbox" 
                  checked={extraCalc.bot}
                  onChange={(e) => setExtraCalc({...extraCalc, bot: e.target.checked})}
                  className="w-5 h-5 rounded-md accent-emerald-600 shrink-0 cursor-pointer" 
                />
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Bir martalik jami summa:</p>
                <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 mt-0.5">
                  {calcExtraPrice().toLocaleString()} <span className="text-xs font-bold text-slate-400">sum</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTariff({...configs.extra, name: 'EXTRA', price: calcExtraPrice()})}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all uppercase text-xs tracking-wider shadow-sm shadow-emerald-100"
              >
                Faollashtirish
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 👑 SPECIAL MODAL: CORPORATE CALCULATOR DESIGN */}
      {isCorpModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-3xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCorpModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                 <Calculator className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-950">CORPORATE CALCULATOR</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Erkin ravishda istagan limitlarni hisoblang</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5">
                {/* Base price row */}
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Tizimdan foydalanish (Base)</span>
                    <span className="text-xs font-bold text-slate-400">Xizmat ko'rsatish va server xarajatlari</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-700">{(configs.corporate.basePrice ?? 500000).toLocaleString()} UZS</span>
                  </div>
                </div>

                {/* Students */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Talabalar soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perStudent ?? 1000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.students}
                        onChange={(e) => setCorpCalc({...corpCalc, students: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perStudent ?? 1000).toLocaleString()} x {corpCalc.students}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.students * (configs.corporate.perStudent ?? 1000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Staff */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Xodimlar soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perStaff ?? 10000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.staff}
                        onChange={(e) => setCorpCalc({...corpCalc, staff: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perStaff ?? 10000).toLocaleString()} x {corpCalc.staff}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.staff * (configs.corporate.perStaff ?? 10000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Courses */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kurslar soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perCourse ?? 40000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.courses}
                        onChange={(e) => setCorpCalc({...corpCalc, courses: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perCourse ?? 40000).toLocaleString()} x {corpCalc.courses}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.courses * (configs.corporate.perCourse ?? 40000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Tests */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Testlar soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perTest ?? 2000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.tests}
                        onChange={(e) => setCorpCalc({...corpCalc, tests: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perTest ?? 2000).toLocaleString()} x {corpCalc.tests}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.tests * (configs.corporate.perTest ?? 2000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Exams */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Imtihonlar soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perExam ?? 15000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.exams}
                        onChange={(e) => setCorpCalc({...corpCalc, exams: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perExam ?? 15000).toLocaleString()} x {corpCalc.exams}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.exams * (configs.corporate.perExam ?? 15000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mavzular soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perSubject ?? 5000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.subjects}
                        onChange={(e) => setCorpCalc({...corpCalc, subjects: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perSubject ?? 5000).toLocaleString()} x {corpCalc.subjects}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.subjects * (configs.corporate.perSubject ?? 5000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Quizizz */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quizizzlar soni</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Birlik narxi: {(configs.corporate.perQuizizz ?? 5000).toLocaleString()} UZS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="number" 
                        min="0"
                        value={corpCalc.quizizz}
                        onChange={(e) => setCorpCalc({...corpCalc, quizizz: Math.max(0, Number(e.target.value))})}
                        className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0 select-none">ta</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[120px]">
                      <span className="text-[10px] font-bold text-slate-400 block leading-none mb-1">{(configs.corporate.perQuizizz ?? 5000).toLocaleString()} x {corpCalc.quizizz}</span>
                      <span className="text-sm font-black text-slate-700">{(corpCalc.quizizz * (configs.corporate.perQuizizz ?? 5000)).toLocaleString()} UZS</span>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* AI module */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">AI Test Generator</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Narxi: {(configs.corporate.aiPrice ?? 300000).toLocaleString()} sum/oy</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={corpCalc.ai}
                        onChange={(e) => setCorpCalc({...corpCalc, ai: e.target.checked})}
                        className="w-5 h-5 rounded-md accent-indigo-600 shrink-0 cursor-pointer" 
                      />
                      <div className="text-right shrink-0 min-w-[100px]">
                        <span className="text-sm font-black text-slate-700">{corpCalc.ai ? (configs.corporate.aiPrice ?? 300000).toLocaleString() : 0} UZS</span>
                      </div>
                    </div>
                  </div>

                  {/* Bot module */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Shaxsiy Telegram Bot</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Narxi: {(configs.corporate.botPrice ?? 200000).toLocaleString()} sum/oy</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={corpCalc.bot}
                        onChange={(e) => setCorpCalc({...corpCalc, bot: e.target.checked})}
                        className="w-5 h-5 rounded-md accent-indigo-600 shrink-0 cursor-pointer" 
                      />
                      <div className="text-right shrink-0 min-w-[100px]">
                        <span className="text-sm font-black text-slate-700">{corpCalc.bot ? (configs.corporate.botPrice ?? 200000).toLocaleString() : 0} UZS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Jami oylik to'lov:</p>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-indigo-700 mt-0.5">
                    {calcCorpPrice().toLocaleString()} <span className="text-xs font-bold text-slate-400">sum/oy</span>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsCorpModalOpen(false)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl transition-all uppercase text-xs tracking-wider"
                  >
                    Yopish
                  </button>
                  <button 
                    onClick={() => {
                      const finalPrice = calcCorpPrice();
                      if (user) {
                        setSelectedTariff({...configs.corporate, name: 'CORPORATE', price: finalPrice});
                      } else {
                        setShowNewOrgModal({...configs.corporate, name: 'CORPORATE', price: finalPrice});
                      }
                      setIsCorpModalOpen(false);
                    }}
                    className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-wider shadow-sm shadow-indigo-100"
                  >
                    Shartnoma Tuzish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
