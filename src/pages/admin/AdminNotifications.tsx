import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Bell, Loader2, Save } from 'lucide-react';

export default function AdminNotifications() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [lowBallChatMessage, setLowBallChatMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'siteContent', 'notifications'));
        if (snap.exists()) {
          setMessage(snap.data()?.insufficientFundsMessage || '');
          setContactMessage(snap.data()?.contactMessage || '');
          setLowBallChatMessage(snap.data()?.lowBallChatMessage || "Hurmatli hamkor sizning ball laringiz yeng past darajaga yaqinlashmoqda...");
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'siteContent', 'notifications'), {
        insufficientFundsMessage: message,
        contactMessage: contactMessage,
        lowBallChatMessage: lowBallChatMessage
      }, { merge: true });
      alert('Muvaffaqiyatli saqlandi!');
    } catch (err) {
      console.error(err);
      alert('Xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-1">
      <header>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          Bildirishnomalar
        </h1>
        <p className="text-gray-500 mt-2 text-sm font-medium">
          Tashkilot profillariga yuboriladigan xabarlar va ogohlantirishlar matni
        </p>
      </header>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-8 max-w-2xl space-y-8">
         <div>
            <h3 className="font-bold text-gray-900 mb-2">Ball yetarli bo'lmagandagi ogohlantirish (Tashkilotlar uchun)</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Bu matn tashkilotlar yangi "Kurs" yoki "Test" yaratish paytida ularning hisobida yetarli ball bo'lmaganda (0 ga teng bo'lsa) qizil rangda ko'rinadi.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm font-medium"
              placeholder="Sizning hisobingizda ball yetarli emas..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
         </div>

         <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Admindan xabar (Bog'lanish)</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Bu xabar Tashkilot profilining "Asosiy ekran"ida barchaga ko'rinib turadi.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm font-medium"
              placeholder="Assalomu alaykum hurmatli tashkilotlar..."
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
            />
         </div>

         <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Ball qolganligi haqida chat xabari</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Tashkilotning qolgan balli 3 ga teng bo'lganda, ularning "Chat" bo'limiga yuboriladigan avtomatik xabar.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm font-medium"
              placeholder="Hurmatli hamkor sizning ball laringiz..."
              value={lowBallChatMessage}
              onChange={(e) => setLowBallChatMessage(e.target.value)}
            />
         </div>

         <button
            onClick={handleSave}
            disabled={loading}
            className="w-full px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
         >
           {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
           Saqlash
         </button>
      </div>
    </div>
  );
}
