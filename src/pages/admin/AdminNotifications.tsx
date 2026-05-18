import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Bell, Loader2, Save, Send } from 'lucide-react';

export default function AdminNotifications() {
  const [loading, setLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  
  const [studentMsg, setStudentMsg] = useState('');
  const [staffMsg, setStaffMsg] = useState('');
  const [teacherMsg, setTeacherMsg] = useState('');
  
  const [broadcasting, setBroadcasting] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'siteContent', 'notifications'));
        if (snap.exists()) {
          setContactMessage(snap.data()?.contactMessage || '');
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSaveContact = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'siteContent', 'notifications'), {
        contactMessage: contactMessage,
      }, { merge: true });
      alert('Muvaffaqiyatli saqlandi!');
    } catch (err) {
      console.error(err);
      alert('Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (role: string, roleName: string, text: string, setter: any) => {
    if (!text.trim()) return;
    setBroadcasting(role);
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const snap = await getDocs(q);
      
      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const userDoc of snap.docs) {
        const ref = doc(collection(db, 'messages'));
        batch.set(ref, {
          text: text.trim(),
          senderId: 'SYSTEM_ADMIN',
          receiverId: userDoc.id,
          createdAt: serverTimestamp(),
          isRead: false
        });
        count++;
        batchCount++;

        if (batchCount === 490) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }

      if (count > 0) {
        alert(`Xabar ${count} ta ${roleName}ga yuborildi!`);
        setter('');
      } else {
        alert(`Bunday foydalanuvchilar topilmadi`);
      }
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setBroadcasting('');
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
            <h3 className="font-bold text-gray-900 mb-2">Admindan xabar (Bog'lanish)</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Bu xabar Tashkilot profilining "Asosiy ekran"ida barchaga ko'rinib turadi.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm font-medium"
              placeholder="Assalomu alaykum hurmatli tashkilotlar..."
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
            />
            <button
              onClick={handleSaveContact}
              disabled={loading}
              className="mt-4 w-full px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              Saqlash
            </button>
         </div>

         <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Admindan xabar (Talabalar uchun)</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Yozilgan xabar barcha talabalarning Chat bo'limiga yuboriladi.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm font-medium"
              placeholder="Talabalar uchun xabar matnini kiriting..."
              value={studentMsg}
              onChange={(e) => setStudentMsg(e.target.value)}
            />
            <button
               onClick={() => handleBroadcast('student', 'talaba', studentMsg, setStudentMsg)}
               disabled={broadcasting === 'student' || !studentMsg.trim()}
               className="mt-4 w-full px-6 py-3 bg-indigo-600 text-white flex items-center justify-center rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
               {broadcasting === 'student' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
               Yuborish
            </button>
         </div>

         <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Admindan xabar (Xodim uchun)</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Yozilgan xabar barcha xodimlarning (staff) Chat bo'limiga yuboriladi.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm font-medium"
              placeholder="Xodimlar uchun xabar matnini kiriting..."
              value={staffMsg}
              onChange={(e) => setStaffMsg(e.target.value)}
            />
            <button
               onClick={() => handleBroadcast('staff', 'xodim', staffMsg, setStaffMsg)}
               disabled={broadcasting === 'staff' || !staffMsg.trim()}
               className="mt-4 w-full px-6 py-3 bg-purple-600 text-white flex items-center justify-center rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
               {broadcasting === 'staff' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
               Yuborish
            </button>
         </div>

         <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2">Admindan xabar (Tashkilot uchun)</h3>
            <p className="text-xs text-gray-500 mb-4 whitespace-normal">Yozilgan xabar barcha tashkilotlarning (teacher) Chat bo'limiga yuboriladi.</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm font-medium"
              placeholder="Tashkilotlar uchun xabar matnini kiriting..."
              value={teacherMsg}
              onChange={(e) => setTeacherMsg(e.target.value)}
            />
            <button
               onClick={() => handleBroadcast('teacher', 'tashkilot', teacherMsg, setTeacherMsg)}
               disabled={broadcasting === 'teacher' || !teacherMsg.trim()}
               className="mt-4 w-full px-6 py-3 bg-[#007aff] text-white flex items-center justify-center rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
               {broadcasting === 'teacher' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
               Yuborish
            </button>
         </div>

      </div>
    </div>
  );
}
