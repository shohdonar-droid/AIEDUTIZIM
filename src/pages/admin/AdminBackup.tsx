import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { RotateCcw, Trash2, Database, History, Search } from 'lucide-react';

export default function AdminBackup() {
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Assuming we have a 'trash_bin' collection that stores o'chirilgan ma'lumotlar
    const q = query(collection(db, 'trash_bin'), orderBy('deletedAt', 'desc'), limit(100));
    const unsub = safeOnSnapshot(q, (snap) => {
      setDeletedItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleRestore = async (item: any) => {
    if (!confirm(`"${item.itemName}" elementini tiklashni xohlaysizmi?`)) return;
    try {
      // 1. Restore to original collection
      await addDoc(collection(db, item.originalCollection), {
        ...item.data,
        restoredAt: serverTimestamp()
      });
      // 2. Remove from trash bin
      await deleteDoc(doc(db, 'trash_bin', item.id));
      alert('Muvaffaqiyatli tiklandi');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Rostdan ham butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.")) return;
    try {
      await deleteDoc(doc(db, 'trash_bin', id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Zaxira nusxa</h2>
          <p className="text-gray-500 font-medium mt-1">O'chirilgan ma'lumotlarni tiklash va boshqarish</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
          <Database className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Jami: {deletedItems.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="O'chirilgan elementlardan qidirish..." 
            className="bg-transparent border-none outline-none text-sm font-medium w-full"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Element nomi</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Toifa</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">O'chirgan shaxs</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">O'chirilgan vaqt</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deletedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{item.itemName}</div>
                    <div className="text-[10px] font-mono text-gray-400">{item.originalId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase tracking-widest">
                      {item.originalCollection}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-600">{item.deletedBy || 'Admin'}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                      <History className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">{item.deletedAt?.toDate().toLocaleString('uz-UZ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRestore(item)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                        title="Tiklash"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePermanentDelete(item.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                        title="Butunlay o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deletedItems.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <Database className="w-8 h-8" />
                      </div>
                      <p className="text-gray-400 font-medium italic">O'chirilgan ma'lumotlar mavjud emas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
