import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { ShieldAlert, CreditCard, ShoppingCart, History, CheckCircle2, Clock, Plus, Minus, X, Upload, Check, ChevronRight } from 'lucide-react';

export default function IndependentLimits() {
  const { user, refreshUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tariffsConfig, setTariffsConfig] = useState<any>(null);

  // Selector quantities to buy
  const [quantities, setQuantities] = useState<Record<string, number>>({
    limit_departments: 0,
    limit_groups: 0,
    limit_students: 0,
    limit_subjects: 0,
    limit_tests: 0,
    limit_quizizz: 0,
    limit_exams: 0,
    limit_certificates: 0
  });

  // Modal details
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");

  // Default prices per unit standard (UZS) (fallback if db configurations are not ready)
  const FALLBACK_PRICES: Record<string, number> = {
    limit_departments: 15000,
    limit_groups: 20000,
    limit_students: 5000,
    limit_subjects: 15000,
    limit_tests: 3000,
    limit_quizizz: 4000,
    limit_exams: 20000,
    limit_certificates: 10000
  };

  const ITEM_LABELS: Record<string, string> = {
    limit_departments: "Yo'nalishlar (+1 ta)",
    limit_groups: "Guruhlar (+1 ta)",
    limit_students: "Talabalar (+1 ta)",
    limit_subjects: "Mavzular (+1 ta)",
    limit_tests: "Testlar (+1 ta)",
    limit_quizizz: "Quizizz / Savollar (+1 ta)",
    limit_exams: "Imtihonlar (+1 ta)",
    limit_certificates: "Sertifikatlar (+1 ta)"
  };

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch dynamic tariff plan configurations
      const tarDoc = await getDoc(doc(db, "settings", "tariffs"));
      if (tarDoc.exists()) {
        setTariffsConfig(tarDoc.data());
      }

      // 2. Load connection requests history for this user
      const q = query(
        collection(db, 'connection_requests'), 
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setHistory(list);
    } catch (e) {
      console.error("Failed to load independent limit data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Determine pricing dynamically based on current user plan, fallback to "start" or fallback static list
  const activePlanKey = (user as any)?.tariff || "start";
  const getUnitPrice = (key: string) => {
    const activePlan = tariffsConfig?.[activePlanKey] || tariffsConfig?.["start"];
    // Check if the price field exists in the plan, e.g. "limit_departments_price"
    const priceField = `${key}_price`;
    if (activePlan && activePlan[priceField] !== undefined) {
      return Number(activePlan[priceField]);
    }
    return FALLBACK_PRICES[key] || 5000;
  };

  const handleAdjustQty = (key: string, direction: 'up' | 'down') => {
    setQuantities(prev => {
      const val = prev[key] || 0;
      const nextVal = direction === 'up' ? val + 1 : Math.max(0, val - 1);
      return {
        ...prev,
        [key]: nextVal
      };
    });
  };

  const calculateTotal = () => {
    return Object.entries(quantities).reduce((acc, [key, qty]) => {
      return acc + (qty * getUnitPrice(key));
    }, 0);
  };

  const totalCost = calculateTotal();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCost === 0 || !user) {
      alert("Iltimos, kamida bitta limit miqdorini tanlang!");
      return;
    }
    if (!receiptBase64) {
      alert("Iltimos, to'lov chekini yuklang!");
      return;
    }

    try {
      setSubmitting(true);
      
      const requestedLimits = Object.fromEntries(
        Object.entries(quantities).filter(([_, qty]) => qty > 0)
      );

      // Create detailed description string of requested limits
      const summaryItems = Object.entries(requestedLimits)
        .map(([key, qty]) => `${ITEM_LABELS[key]?.split('(')[0]}: +${qty} ta`)
        .join(', ');

      const reqPayload = {
        userId: user.uid,
        userName: `${user.displayName || "Mustaqil O'qituvchi"} (Mustaqil o'qituvchi)`,
        userEmail: user.email || '',
        tariffName: `Limit qo'shish (${summaryItems})`,
        tariffPrice: totalCost,
        totalPrice: totalCost,
        requestedLimits,
        receiptUrl: receiptBase64,
        status: 'pending',
        isLimitsRequest: true,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        paymentType: "Chek (Karta orqali)"
      };

      await addDoc(collection(db, 'connection_requests'), reqPayload);

      // Success cleanup
      setQuantities({
        limit_departments: 0,
        limit_groups: 0,
        limit_students: 0,
        limit_subjects: 0,
        limit_tests: 0,
        limit_quizizz: 0,
        limit_exams: 0,
        limit_certificates: 0
      });
      setReceiptBase64("");
      setReceiptFileName("");
      setIsModalOpen(false);

      alert("Limitni olish uchun to'lov so'rovingiz adminga yuborildi! Tasdiqlangach limitga qo'shiladi.");
      await loadData();
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
      alert("So'rov yuborishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Limitlar paneli</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Hozirgi limit ko'rsatkichlaringizni oshirish va yangi resurs limitlarni sotib olish oynasi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quantity Selectors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-600" /> Yangi limitlar qo'shish
            </h3>

            <div className="divide-y divide-gray-100">
              {Object.keys(FALLBACK_PRICES).map(key => {
                const qty = quantities[key] || 0;
                const unitPrice = getUnitPrice(key);
                return (
                  <div key={key} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{ITEM_LABELS[key]}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {unitPrice.toLocaleString('uz-UZ')} so'm / donasi
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAdjustQty(key, 'down')}
                        className="w-10 h-10 rounded-xl border border-gray-150 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-extrabold transition-all"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-gray-900">{qty}</span>
                      <button
                        onClick={() => handleAdjustQty(key, 'up')}
                        className="w-10 h-10 rounded-xl border border-gray-150 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-extrabold transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Total checkout card & Request History */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" /> To'lov umumiy varaqasi
            </h3>

            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-xs text-gray-500 font-bold">
                <span>Tanlanganlar jami:</span>
                <span className="text-gray-900">
                  {Object.values(quantities).reduce((a, b) => a + b, 0)} ta limit
                </span>
              </div>
              <div className="border-t border-gray-200 my-2"></div>
              <div className="flex justify-between items-center text-sm font-black text-gray-800">
                <span>To'lov summasi:</span>
                <span className="text-indigo-600 text-lg">
                  {totalCost.toLocaleString('uz-UZ')} so'm
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={totalCost === 0}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-750 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
              Limitni olish
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs uppercase font-black text-gray-400 tracking-wider flex items-center gap-2">
              <History className="h-4 w-4" /> So'rovlar tarixi
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold text-center py-4">Sizda hali limit so'rovlari mavjud emas.</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {history.map((req) => (
                  <div key={req.id} className="p-3.5 bg-gray-55/40 rounded-2xl border border-gray-100 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">
                        {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString('uz-UZ') : "Kutilmoqda"}
                      </span>
                      {req.status === 'approved' ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[9px] uppercase font-black">
                          <Check className="h-2.5 w-2.5" /> Tasdiqlangan
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span className="flex items-center gap-1 text-red-650 bg-red-50/50 px-2 py-0.5 rounded-full text-[9px] uppercase font-black">
                          <X className="h-2.5 w-2.5" /> Rad etilgan
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[9px] uppercase font-black">
                          <Clock className="h-2.5 w-2.5" /> Kutilmoqda
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-black text-gray-900">
                      Summa: {req.totalPrice?.toLocaleString() || req.tariffPrice?.toLocaleString()} so'm
                    </p>
                    
                    <div className="text-[10px] text-gray-500 font-semibold space-y-0.5 border-t border-dashed border-gray-100 pt-1">
                      {Object.entries(req.requestedLimits || req.requestedItems || {}).map(([key, qty]: any) => (
                        <div key={key} className="flex justify-between">
                          <span>{ITEM_LABELS[key]?.split('(')[0]}</span>
                          <span className="font-bold">+{qty} ta</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Popup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-150/50 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-indigo-600" /> Limit To'lov Oynasi
            </h3>

            {/* Stylized credit card mockup */}
            <div className="bg-gradient-to-tr from-indigo-700 via-indigo-900 to-purple-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden h-44 flex flex-col justify-between mb-6">
              {/* Card Chips & Branding */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[8px] font-black tracking-widest text-indigo-200 uppercase"> MUSTAQIL O'QITUVCHI BILlING </p>
                  <p className="text-[10px] font-bold text-indigo-100 mt-0.5">Admin orqali tasdiqlash uchun</p>
                </div>
                <span className="text-lg font-black italic tracking-tighter text-indigo-300">HUMO</span>
              </div>
              
              {/* Card number */}
              <div>
                <p className="text-[10px] text-indigo-200 font-bold tracking-wider">Karta raqami (To'lov uchun):</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-base font-mono font-bold tracking-widest text-white">9860 2109 4567 8901</p>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("9860210945678901");
                      alert("Karta raqami nusxalandi!");
                    }}
                    className="px-2 py-1 bg-white/20 hover:bg-white/30 text-[9px] font-bold rounded-lg transition-colors border border-white/10"
                  >
                    Nusxalash
                  </button>
                </div>
              </div>

              {/* Card Holder name & chip */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-mono tracking-widest text-indigo-200">KARTA EGASI</p>
                  <p className="text-xs font-mono font-bold mt-0.5 uppercase tracking-wide">AIEDUTIZIM BILlING SERVICE</p>
                </div>
                <div className="w-8 h-6 bg-yellow-400/90 rounded-md"></div>
              </div>
            </div>

            {/* Price review instruction */}
            <div className="bg-indigo-50/50 rounded-2xl p-4 mb-6 border border-indigo-100 space-y-1">
              <p className="text-xs font-semibold text-gray-500">To'lanadigan summa:</p>
              <p className="text-lg font-black text-indigo-600">{totalCost.toLocaleString('uz-UZ')} so'm</p>
              <p className="text-[10px] text-gray-400 font-bold leading-normal">
                Yuqoridagi karta raqamiga to'lov qiling va bank ilovasidagi to'lov chekini (skrinshot yoki rasmini) quyidagi joyga yuklang.
              </p>
            </div>

            {/* Receipt Upload Box */}
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">To'lov chekini yuklash</label>
              
              <div className="border-2 border-dashed border-gray-200 hover:border-indigo-500 rounded-2xl p-6.5 text-center transition-all bg-gray-50/50 cursor-pointer relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2.5">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto text-gray-400 border border-gray-100">
                    <Upload className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">Chek rasmini yuklang</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG formatlar (Maks 10MB)</p>
                  </div>
                </div>
              </div>

              {receiptFileName && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{receiptFileName}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setReceiptBase64("");
                      setReceiptFileName("");
                    }} 
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-150 text-gray-550 rounded-xl font-bold font-semibold text-xs uppercase tracking-wider"
              >
                Bekor qilish
              </button>
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={submitting || !receiptBase64}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                Yuborish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
