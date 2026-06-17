import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { ShieldAlert, CreditCard, ShoppingCart, History, CheckCircle2, Clock, Plus, Minus } from 'lucide-react';

export default function IndependentLimits() {
  const { user, refreshUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  // Prices per unit standard (UZS)
  const ITEM_PRICES: Record<string, number> = {
    limit_departments: 5000,
    limit_groups: 10000,
    limit_students: 2000,
    limit_subjects: 4000,
    limit_tests: 4000,
    limit_quizizz: 50 * 100, // 5000
    limit_exams: 15000,
    limit_certificates: 3000
  };

  const ITEM_LABELS: Record<string, string> = {
    limit_departments: "Yo'nalishlar (+1 ta)",
    limit_groups: "Guruhlar (+1 ta)",
    limit_students: "Talabalar (+1 ta)",
    limit_subjects: "Mavzular (+1 ta)",
    limit_tests: "Testlar (+1 ta)",
    limit_quizizz: "Quiz_history / Quizizz (+1 ta)",
    limit_exams: "Imtihonlar (+1 ta)",
    limit_certificates: "Sertifikatlar (+1 ta)"
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'limitRequests'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setHistory(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

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
      return acc + (qty * (ITEM_PRICES[key] || 0));
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = calculateTotal();
    if (total === 0 || !user) {
      alert("Iltimos, kamida bitta limit miqdorini tanlang!");
      return;
    }

    try {
      setSubmitting(true);
      
      const requestedItems = Object.fromEntries(
        Object.entries(quantities).filter(([_, qty]) => qty > 0)
      );

      await addDoc(collection(db, 'limitRequests'), {
        userId: user.uid,
        userDisplayName: user.displayName || 'Xaridor',
        userEmail: user.email || '',
        requestedItems,
        totalPrice: total,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Clear selectors
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

      alert("Limit so'rovi yuborildi! To'lov tasdiqlanganidan so'ng limitlaringiz avtomatik ravishda qo'shiladi.");
      await loadHistory();
    } catch (err) {
      console.error(err);
      alert("So'rov yuborishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = calculateTotal();

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Xizmat limitlari</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Hozirda mavjud limit ko'rsatkichlaringiz va yangi resurs sig'imini sotib olish paneli.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Purchasing Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" /> Yangi limitlar qo'shish
            </h3>

            <div className="divide-y divide-gray-100">
              {Object.keys(ITEM_PRICES).map(key => {
                const qty = quantities[key] || 0;
                const unitPrice = ITEM_PRICES[key] || 0;
                return (
                  <div key={key} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{ITEM_LABELS[key]}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">{unitPrice.toLocaleString('uz-UZ')} so'm / donasi</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAdjustQty(key, 'down')}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold transition-all"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-gray-800">{qty}</span>
                      <button
                        onClick={() => handleAdjustQty(key, 'up')}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-650 font-bold transition-all"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Breakdown and History Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" /> To'lov umumiy varaqasi
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
                <span className="text-blue-600 text-lg">
                  {totalCost.toLocaleString('uz-UZ')} so'm
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || totalCost === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50"
            >
              {submitting ? "Kutilmoqda..." : "So'rov yuborish"}
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs uppercase font-black text-gray-400 tracking-wider flex items-center gap-2">
              <History className="h-4 w-4" /> So'rovlar tarixi
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium text-center py-4">Sizda hali so'rovlar mavjud emas.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {history.map((req) => (
                  <div key={req.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-150 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400">
                        {req.createdAt?.toMillis ? new Date(req.createdAt.toMillis()).toLocaleString() : "Hozirgina"}
                      </span>
                      {req.status === 'approved' ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Tasdiqlangan
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" /> Kutilmoqda
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-black text-gray-850">
                      Summa: {req.totalPrice?.toLocaleString()} so'm
                    </p>
                    
                    <div className="text-[10px] text-gray-500 font-semibold space-y-0.5">
                      {Object.entries(req.requestedItems || {}).map(([key, qty]: any) => (
                        <div key={key} className="flex justify-between">
                          <span>{ITEM_LABELS[key]?.split('(')[0]}</span>
                          <span>+{qty} ta</span>
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
    </div>
  );
}
