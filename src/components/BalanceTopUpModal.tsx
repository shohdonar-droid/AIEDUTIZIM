import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Copy, Check, Upload, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

interface BalanceTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BalanceTopUpModal({ isOpen, onClose }: BalanceTopUpModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('Click');
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  
  const [cardSettings, setCardSettings] = useState({
    number: "9860 2109 4567 8901",
    owner: "S. O. ELYORBEK",
    type: "Humo / Uzcard"
  });

  const [receiptUrl, setReceiptUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCard() {
      try {
        const snap = await getDoc(doc(db, "settings", "payment_card"));
        if (snap.exists()) {
          const data = snap.data();
          setCardSettings({
            number: data.number || "5614 6812 9015 3646",
            owner: data.owner || "IBODULLAYEVA SH",
            type: data.type || "Humo / Uzcard"
          });
        }
      } catch (e) {
        console.warn("Could not load payment card settings", e);
      }
    }
    if (isOpen) {
      loadCard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardSettings.number.replace(/\s+/g, ''));
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleCopyUid = () => {
    const uidToCopy = user?.platformUid || user?.uid || '';
    if (uidToCopy) {
      navigator.clipboard.writeText(uidToCopy);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      setFileError("Fayl hajmi 800KB dan oshmasligi kerak. Iltimos, kichikroq rasm tanlang.");
      return;
    }

    setFileError('');
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) setReceiptUrl(res);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Iltimos, avval tizimga kiring.");
      return;
    }
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      alert("Iltimos, to'ldirish summasini to'g'ri kiriting.");
      return;
    }
    if (!receiptUrl) {
      alert("Iltimos, to'lov chekini (skrinshotini) yuklang.");
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'connection_requests'), {
        userId: user.uid,
        userName: user.displayName || 'Foydalanuvchi',
        phone: user.phone || '',
        tariffName: `Balans to'ldirish: ${finalAmount.toLocaleString()} UZS`,
        tariffPrice: finalAmount,
        paymentType,
        receiptUrl,
        isBalanceTopUp: true,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Notify telegram admin if possible
      try {
        fetch('/api/notify-connection-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: docRef.id,
            data: {
              userName: user.displayName || 'Foydalanuvchi',
              tariffName: `Balans to'ldirish (${finalAmount.toLocaleString()} UZS)`,
              tariffPrice: finalAmount,
              paymentType,
              receiptUrl,
              phone: user.phone || ''
            }
          })
        });
      } catch (e) {}

      alert("To'lov so'rovingiz muvaffaqiyatli yuborildi! Admin tasdiqlagandan so'ng balansingizga mablag' qo'shiladi.");
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Xatolik yuz berdi: " + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] w-full max-w-xl p-6 sm:p-8 shadow-2xl my-8 relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              💳
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Balansni to'ldirish</h3>
              <p className="text-xs text-slate-500 font-bold">Hisobingizga ball yoki mablag' qo'shish</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-6 overflow-y-auto pr-1 flex-1">
          {/* Amount selection */}
          {paymentType !== 'Karta' && (
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                1. To'ldirish summasini tanlang
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[10000, 25000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmount(val);
                      setCustomAmount('');
                    }}
                    className={`py-3 rounded-xl border-2 font-black text-sm transition-all ${
                      amount === val && !customAmount
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-gray-100 text-slate-700 hover:border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    {val.toLocaleString()} UZS
                  </button>
                ))}
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Yoki o'zingiz summa kiriting (UZS)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-emerald-500 focus:outline-none font-bold text-sm text-slate-800 bg-gray-50/30"
                />
              </div>
            </div>
          )}

          {/* Payment Type */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
              2. To'lov tizimini tanlang
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Click', 'Payme', 'Uzum Bank', 'Paynet', 'Karta'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPaymentType(type)}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs transition-all ${
                    paymentType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-100 text-slate-600 hover:border-gray-200 bg-gray-50/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Card Details (Only if 'Karta') */}
          {paymentType === 'Karta' && (
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">Admin Karta Ma'lumotlari</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  {cardSettings.type}
                </span>
              </div>

              <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl backdrop-blur-md">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Karta raqami</p>
                  <p className="text-base sm:text-lg font-black font-mono tracking-wider text-emerald-300">{cardSettings.number}</p>
                  <p className="text-[11px] text-slate-300 font-bold uppercase mt-0.5">{cardSettings.owner}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCard}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shrink-0"
                >
                  {copiedCard ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedCard ? "Nusxalandi" : "Nusxalash"}
                </button>
              </div>

              {user && (
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sizning Platforma ID (UID):</p>
                    <p className="text-sm font-black font-mono text-amber-300">{user.platformUid || user.uid}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm shrink-0"
                  >
                    {copiedUid ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUid ? "Nusxalandi" : "UID"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Direct online payment button */}
          {paymentType !== 'Karta' && finalAmount > 0 && user && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  const uId = user.platformUid || user.uid;
                  let payUrl = "#";
                  if (paymentType === 'Click') {
                    payUrl = `https://my.click.uz/services/pay?id=12345&merchant_id=9999&amount=${finalAmount}&transaction_param=${uId}`;
                  } else if (paymentType === 'Payme') {
                    payUrl = `https://checkout.paycom.uz/63a12b3c4d5e6f7a8b9c0d1e?m=63a12b3c4d5e6f7a8b9c0d1e&ac.user_id=${uId}&amount=${finalAmount * 100}`;
                  } else if (paymentType === 'Uzum Bank') {
                    payUrl = `https://uzumbank.uz/pay?merchant_id=platform&account=${uId}&amount=${finalAmount}`;
                  } else if (paymentType === 'Paynet') {
                    alert("Paynet to'lovi uchun tizim administratoriga murojaat qiling.");
                    return;
                  }
                  window.open(payUrl, '_blank');
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {paymentType} orqali onlayn to'lov qilish ({finalAmount.toLocaleString()} so'm)
              </button>
            </div>
          )}

          {/* Receipt Upload (Only if 'Karta') */}
          {paymentType === 'Karta' && (
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                3. To'lov chekini (skrinshotini) yuklang
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-emerald-500 transition-all bg-gray-50/50">
                {receiptUrl ? (
                  <div className="space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white flex items-center justify-center">
                      <img src={receiptUrl} alt="Receipt" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">{fileName || "Chek yuklandi"} ({fileSize})</div>
                    <button
                      type="button"
                      onClick={() => { setReceiptUrl(''); setFileName(''); setFileSize(''); }}
                      className="text-xs font-black text-red-500 hover:underline"
                    >
                      Boshqa rasm yuklash
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Chek rasmini bu yerga tashlang yoki tanlang</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG yoki WEBP (Maks: 800KB)</p>
                    <label className="inline-block mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all">
                      Faylni tanlash
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
              {fileError && <p className="text-xs text-red-500 mt-1 font-bold">{fileError}</p>}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-gray-200 font-bold text-xs text-slate-600 hover:bg-gray-50 transition-all"
          >
            {paymentType === 'Karta' ? 'Bekor qilish' : 'Yopish'}
          </button>
          {paymentType === 'Karta' && (
            <button
              type="button"
              disabled={isSubmitting || !receiptUrl}
              onClick={handleSubmit}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? "Yuborilmoqda..." : "So'rovni yuborish"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
