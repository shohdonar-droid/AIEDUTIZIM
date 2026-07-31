import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { 
  Zap, 
  Check, 
  ArrowRight, 
  CreditCard, 
  Upload, 
  X, 
  FileText, 
  Trash2,
  Clock,
  ShieldCheck,
  Award,
  Wallet
} from "lucide-react";
import { motion } from "motion/react";
import BalanceTopUpModal from "../../components/BalanceTopUpModal";
import { activateTariffWithBalance } from "../../lib/tariffService";

interface TariffConfig {
  name: string;
  price: number;
  students: number;
  staff: number;
  hasAI: boolean;
  hasBot: boolean;
}

const defaultTariffs: Record<string, TariffConfig> = {
  start: {
    name: "START",
    price: 300000,
    students: 50,
    staff: 2,
    hasAI: false,
    hasBot: false
  },
  standard: {
    name: "STANDARD",
    price: 700000,
    students: 200,
    staff: 5,
    hasAI: false,
    hasBot: true
  },
  professional: {
    name: "PROFESSIONAL",
    price: 1500000,
    students: 1000,
    staff: 20,
    hasAI: true,
    hasBot: true
  },
  corporate: {
    name: "CORPORATE",
    price: 500000, // This is usually a base price
    students: 999,
    staff: 999,
    hasAI: true,
    hasBot: true
  }
};

export default function TeacherBilling() {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<any>(defaultTariffs);
  const [cardSettings, setCardSettings] = useState({ number: "9860 2109 4567 8901", owner: "S. O. ELYORBEK", type: "Humo / Uzcard" });

  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [paymentType, setPaymentType] = useState('Click');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File Upload states
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // Load latest tariffs config
        const [configSnap, cardSnap] = await Promise.all([
          getDoc(doc(db, "settings", "tariffs")),
          getDoc(doc(db, "settings", "payment_card"))
        ]);
        
        if (configSnap.exists()) {
          setConfigs({ ...defaultTariffs, ...configSnap.data() });
        }
        
        if (cardSnap.exists()) {
          const data = cardSnap.data();
          setCardSettings({
            number: data.number || "9860 0000 0000 0000",
            owner: data.owner || "ADMIN NAME",
            type: data.type || "Humo"
          });
        }

        // Load current subscription
        const q = query(
          collection(db, "active_subscriptions"),
          where("userId", "==", user.uid)
        );
        const subSnap = await getDocs(q);
        if (!subSnap.empty) {
          // Sort by start date to get most recent and filter out balance top ups
          const subs = subSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(sub => !(sub.tariffName || "").toLowerCase().includes("balans to'ldirish"));
            
          if (subs.length > 0) {
            subs.sort((a: any, b: any) => (b.startDate?.toMillis?.() || 0) - (a.startDate?.toMillis?.() || 0));
            setCurrentSubscription(subs[0]);
          } else {
            const fallbackTariff = (user as any).tariffName || (user as any).assignedTariff;
            if (fallbackTariff && !fallbackTariff.toLowerCase().includes("balans to'ldirish")) {
              setCurrentSubscription({
                tariffName: fallbackTariff,
                tariffPrice: (user as any).tariffPrice || 0,
                startDate: (user as any).createdAt || new Date()
              });
            }
          }
        } else {
          const fallbackTariff = (user as any).tariffName || (user as any).assignedTariff;
          if (fallbackTariff && !fallbackTariff.toLowerCase().includes("balans to'ldirish")) {
            setCurrentSubscription({
              tariffName: fallbackTariff,
              tariffPrice: (user as any).tariffPrice || 0,
              startDate: (user as any).createdAt || new Date()
            });
          }
        }
      } catch (err) {
        console.error("Billing load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    
    // Simple compression for preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64.startsWith("data:image")) {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 400;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) { h = (h * MAX_DIM) / w; w = MAX_DIM; }
            else { w = (w * MAX_DIM) / h; h = MAX_DIM; }
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          setReceiptUrl(canvas.toDataURL("image/jpeg", 0.4));
        };
      } else {
        setReceiptUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpgradeSubmit = async () => {
    if (!selectedTariff) return alert("Iltimos, tarifni tanlang.");

    const price = selectedTariff.price || selectedTariff.basePrice || 0;
    const currentBalance = Number((user as any)?.balance ?? (user as any)?.ball ?? 0);

    if (currentBalance < price) {
      alert("Sizning joriy balansingiz tarif reja to'loviga yetmaydi, balansingizni to'ldiring.");
      setShowUpgradeModal(false);
      setIsBalanceModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await activateTariffWithBalance(
        user.uid,
        selectedTariff?.name?.toLowerCase() || 'tariff',
        selectedTariff as any
      );

      if (result.success) {
        alert(result.message);
        setShowUpgradeModal(false);
        setSelectedTariff(null);
        // We can reload the page or let the listener handle it (if any).
        window.location.reload();
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter tariffs for upgrade (exclude current)
  const upgradeOptions = Object.entries(configs || defaultTariffs).map(([key, val]: [string, any]) => ({
    ...val,
    name: val.name || key.toUpperCase()
  })).filter((t: any) => {
    const tName = t.name || "";
    const currentName = currentSubscription?.tariffName || "";
    return tName.toLowerCase() !== currentName.toLowerCase() && 
           ["start", "standard", "professional", "corporate"].includes(tName.toLowerCase());
  });

  if (loading) return <div className="p-8 text-center font-black">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tarif Boshqaruvi</h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">Hozirgi tarifingiz va obuna holati bilan tanishing</p>
        </div>
        
        {/* Balance Section */}
        <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joriy balans</p>
            <p className="text-xl font-black text-emerald-600">
              {Number((user as any)?.balance ?? (user as any)?.ball ?? 0).toLocaleString('uz-UZ')} UZS
            </p>
          </div>
          <button 
            onClick={() => setIsBalanceModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[11px] tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Wallet className="w-4 h-4" />
            Balansni to'ldirish
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan Card */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="space-y-2">
                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Amaldagi reja</span>
                <h2 className="text-4xl font-black text-gray-950 uppercase tracking-tight">
                  {currentSubscription?.tariffName || "BEPUL / SINOV"}
                </h2>
                <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  Boshlangan sana: {currentSubscription?.startDate?.toDate().toLocaleDateString('uz-UZ') || "Noma'lum"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-blue-600 font-mono">
                  {(currentSubscription?.tariffPrice || 0).toLocaleString()} <span className="text-sm">sum/oy</span>
                </div>
                <p className="text-gray-400 text-xs font-black uppercase mt-1">To'lov holati: <span className="text-green-500">Faol</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y border-gray-50">
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  Platformaning barcha standart funksiyalari
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  Texnik qo'llab-quvvatlash (24/7)
                </li>
              </ul>
              <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Tarifni yangilash</h4>
                <p className="text-sm text-gray-600 font-medium mb-4">Imkoniyatlaringizni kengaytirish uchun yuqori tarifga o'ting.</p>
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  O'tish <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ad-like Card for Limits */}
        <div className="bg-indigo-600 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between">
           <div className="relative z-10">
              <Award className="w-12 h-12 text-indigo-200 mb-6" />
              <h3 className="text-2xl font-black mb-4">Yana-da ko'proq imkoniyat kerakmi?</h3>
              <p className="text-indigo-100 font-medium leading-relaxed opacity-90">
                Tashkilotingiz o'sib boryaptimi? Bizning professional tariflarimiz orqali yanada ko'proq talabalar va xodimlarni boshqarishingiz mumkin.
              </p>
           </div>
           <div className="relative z-10 pt-10">
              <div className="flex -space-x-3 mb-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-[10px]">
                    {i*250}+
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Har kuni yangi tashkilotlar qo'shilmoqda</p>
           </div>

           {/* Decor */}
           <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
           <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] scrollbar-hide"
           >
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-8 right-8 p-3 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 transition-all"><X /></button>
              
              <div className="text-center mb-10">
                 <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-3xl mb-4">
                    <Zap className="w-8 h-8" />
                 </div>
                 <h3 className="text-3xl font-black text-gray-950 uppercase tracking-tight">Tarif Rejasini O'zgartirish</h3>
                 <p className="text-gray-400 font-bold mt-2">Hozirgi rejangiz: <span className="text-blue-600">{currentSubscription?.tariffName || "Noma'lum"}</span></p>
              </div>

              <div className="space-y-8">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Yangi Tarifni Tanlang</label>
                       <select 
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 appearance-none"
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = upgradeOptions.find((t: any) => t.name === val);
                          setSelectedTariff(found);
                        }}
                        value={selectedTariff?.name || ""}
                      >
                         <option value="" disabled>Tarifni tanlang...</option>
                         {upgradeOptions.map((t: any) => (
                           <option key={t.name} value={t.name}>{t.name} — {(t.price || t.basePrice || 0).toLocaleString()} UZS</option>
                         ))}
                       </select>
                       
                       {selectedTariff && (
                         <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                           <div className="flex justify-between items-center mb-4">
                              <span className="text-sm font-black text-blue-600">{selectedTariff.name}</span>
                              <span className="text-lg font-black text-gray-900">{(selectedTariff.price || selectedTariff.basePrice || 0).toLocaleString()} UZS</span>
                           </div>
                           <ul className="space-y-2">
                              <li className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase"><Check className="w-3 h-3 text-blue-500" /> {selectedTariff.students}+ talabalar</li>
                              <li className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase"><Check className="w-3 h-3 text-blue-500" /> {selectedTariff.staff}+ xodimlar</li>
                           </ul>
                         </div>
                       )}
                    </div>

                 {(() => {
                   const price = selectedTariff ? (selectedTariff.price || selectedTariff.basePrice || 0) : 0;
                   const currentBalance = Number((user as any)?.balance ?? (user as any)?.ball ?? 0);
                   const isEnough = selectedTariff ? currentBalance >= price : true;

                   if (selectedTariff && !isEnough) {
                     return (
                       <div className="space-y-4">
                         <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center">
                           <p className="font-bold text-sm">Sizning joriy balansingiz tarif reja to'loviga yetmaydi.</p>
                           <p className="text-xs mt-1">Yetishmayotgan summa: {(price - currentBalance).toLocaleString()} UZS</p>
                         </div>
                         <button
                          onClick={() => {
                            setShowUpgradeModal(false);
                            setIsBalanceModalOpen(true);
                          }}
                          className="w-full py-4 md:py-6 bg-emerald-600 text-white rounded-3xl font-black text-xs md:text-sm tracking-[0.1em] md:tracking-[0.2em] uppercase shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-4"
                         >
                            Balansni to'ldirish
                            <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                         </button>
                       </div>
                     );
                   }

                   return (
                     <button
                      disabled={isSubmitting || !selectedTariff}
                      onClick={handleUpgradeSubmit}
                      className="w-full py-4 md:py-6 bg-blue-600 text-white rounded-3xl font-black text-xs md:text-sm tracking-[0.1em] md:tracking-[0.2em] uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2 md:gap-4"
                     >
                        {isSubmitting ? "Yuborilmoqda..." : "Balansdan to'lash va faollashtirish"}
                        <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                     </button>
                   );
                 })()}
              </div>
           </motion.div>
        </div>
      )}

      {isBalanceModalOpen && (
        <BalanceTopUpModal 
          isOpen={isBalanceModalOpen}
          onClose={() => setIsBalanceModalOpen(false)}
        />
      )}
    </div>
  );
}
