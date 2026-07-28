import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { ShieldAlert, CreditCard, ShoppingCart, History, CheckCircle2, Clock, Plus, Minus, X, Upload, Check, ChevronRight, Wallet } from 'lucide-react';
import BalanceTopUpModal from '../../../components/BalanceTopUpModal';

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
    limit_exams: 0
  });

  // Modal details
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState({ number: "9860 2109 4567 8901", owner: "S. O. ELYORBEK", type: "Humo / Uzcard" });

  // Default prices per unit standard (UZS) (fallback if db configurations are not ready)
  const FALLBACK_PRICES: Record<string, number> = {
    limit_departments: 15000,
    limit_groups: 20000,
    limit_students: 5000,
    limit_subjects: 15000,
    limit_tests: 3000,
    limit_quizizz: 4000,
    limit_exams: 20000
  };

  const ITEM_LABELS: Record<string, string> = {
    limit_departments: "Yo'nalishlar (+1 ta)",
    limit_groups: "Guruhlar (+1 ta)",
    limit_students: "Talabalar (+1 ta)",
    limit_subjects: "Mavzular (+1 ta)",
    limit_tests: "Testlar (+1 ta)",
    limit_quizizz: "Quizizz / Savollar (+1 ta)",
    limit_exams: "Imtihonlar (+1 ta)"
  };

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch dynamic tariff plan configurations
      const [tarDoc, cardSnap] = await Promise.all([
        getDoc(doc(db, "settings", "tariffs")),
        getDoc(doc(db, "settings", "payment_card"))
      ]);
      if (tarDoc.exists()) {
        setTariffsConfig(tarDoc.data());
      }
      if (cardSnap.exists()) {
        const data = cardSnap.data();
        setCardSettings({ 
          number: data.number || "9860 2109 4567 8901", 
          owner: data.owner || "S. O. ELYORBEK", 
          type: data.type || "Humo / Uzcard" 
        });
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

  const getUnitPrice = (key: string) => {
    if ((user as any)?.customLimitPrices?.[key] !== undefined && (user as any).customLimitPrices[key] !== null && (user as any).customLimitPrices[key] !== '') {
      return Number((user as any).customLimitPrices[key]);
    }
    const activePlan = tariffsConfig?.["extra"];
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

  const handleBuyLimits = async () => {
    if (totalCost === 0 || !user) {
      alert("Iltimos, kamida bitta limit miqdorini tanlang!");
      return;
    }

    const currentBalance = Number((user as any)?.balance ?? 0);
    if (currentBalance < totalCost) {
      alert(`Balansingiz yetarli emas!\n\nTanlangan limitlar narxi: ${totalCost.toLocaleString('uz-UZ')} so'm\nSizning balansingiz: ${currentBalance.toLocaleString('uz-UZ')} so'm\n\nIltimos, avval balansingizni to'ldirib keyin limit oling.`);
      setIsBalanceModalOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      const newBalance = currentBalance - totalCost;
      const requestedLimits = Object.fromEntries(
        Object.entries(quantities).filter(([_, qty]) => qty > 0)
      );

      const summaryItems = Object.entries(requestedLimits)
        .map(([key, qty]) => `${ITEM_LABELS[key]?.split('(')[0]}: +${qty} ta`)
        .join(', ');

      const txRecord = {
        id: Date.now().toString(),
        type: 'limit_purchase',
        amount: totalCost,
        description: `Limitlar xaridi (${summaryItems})`,
        timestamp: new Date().toISOString()
      };

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: newBalance,
        limit_departments: (user.limit_departments || 0) + (quantities.limit_departments || 0),
        limit_groups: (user.limit_groups || 0) + (quantities.limit_groups || 0),
        limit_students: (user.limit_students || 0) + (quantities.limit_students || 0),
        limit_subjects: (user.limit_subjects || 0) + (quantities.limit_subjects || 0),
        limit_tests: (user.limit_tests || 0) + (quantities.limit_tests || 0),
        limit_quizizz: (user.limit_quizizz || 0) + (quantities.limit_quizizz || 0),
        limit_exams: (user.limit_exams || 0) + (quantities.limit_exams || 0),
        billingHistory: arrayUnion(txRecord)
      });

      await addDoc(collection(db, 'connection_requests'), {
        userId: user.uid,
        userName: `${user.displayName || "Mustaqil O'qituvchi"} (Mustaqil o'qituvchi)`,
        userEmail: user.email || '',
        tariffName: `Limit xaridi (Balansdan: ${summaryItems})`,
        tariffPrice: totalCost,
        totalPrice: totalCost,
        requestedLimits,
        status: 'approved',
        isLimitsRequest: true,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        paymentType: "Balansdan yechish"
      });

      setQuantities({
        limit_departments: 0,
        limit_groups: 0,
        limit_students: 0,
        limit_subjects: 0,
        limit_tests: 0,
        limit_quizizz: 0,
        limit_exams: 0
      });

      alert(`Tabriklaymiz! Tanlangan limitlar balansingizdan yechilgan mablag' (${totalCost.toLocaleString('uz-UZ')} so'm) evaziga avtomatik ravishda hisobingizga qo'shildi.`);
      await loadData();
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
      alert("Limitlarni sotib olishda xatolik yuz berdi.");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Limitlar paneli</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Hozirgi limit ko'rsatkichlaringizni oshirish va yangi resurs limitlarni sotib olish oynasi.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Sizning balansingiz</span>
            <span className="text-xl font-black text-emerald-900">{Number((user as any)?.balance ?? 0).toLocaleString('uz-UZ')} UZS</span>
          </div>
          <button
            onClick={() => setIsBalanceModalOpen(true)}
            className="ml-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Balansni To'ldirish
          </button>
        </div>
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
              <div className="flex justify-between items-center text-xs text-gray-500 font-bold">
                <span>Mavjud balans:</span>
                <span className="text-emerald-600 font-black">
                  {Number((user as any)?.balance ?? 0).toLocaleString('uz-UZ')} so'm
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
              onClick={handleBuyLimits}
              disabled={totalCost === 0 || submitting}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-750 transition-all text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
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
                  <div key={req.id} className="p-3.5 bg-gray-50/40 rounded-2xl border border-gray-100 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">
                        {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString('uz-UZ') : "Kutilmoqda"}
                      </span>
                      {req.status === 'approved' ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[9px] uppercase font-black">
                          <Check className="h-2.5 w-2.5" /> Tasdiqlangan
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span className="flex items-center gap-1 text-red-600 bg-red-50/50 px-2 py-0.5 rounded-full text-[9px] uppercase font-black">
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

      <BalanceTopUpModal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} />
    </div>
  );
}
