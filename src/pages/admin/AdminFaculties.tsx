import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { Plus, Trash2, Building2 } from 'lucide-react';

export default function AdminFaculties() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'faculties'), orderBy('createdAt', 'desc'));
    const unsub = safeOnSnapshot(q, (snap) => {
      setFaculties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, 'faculties'), {
        name: newName.trim(),
        createdAt: serverTimestamp()
      });
      setNewName('');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, 'faculties', id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Fakultetlar</h2>
        <p className="text-gray-500 font-medium mt-1">Tashkilot tarkibidagi fakultetlarni boshqarish</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Yangi fakultet qo'shish</h3>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Fakultet nomi..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        </form>

        <div className="space-y-2">
          {faculties.map(f => (
            <div key={f.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="font-bold text-gray-900">{f.name}</span>
              <button onClick={() => handleDelete(f.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {faculties.length === 0 && !loading && <p className="text-sm text-gray-400 text-center py-4">Fakultetlar mavjud emas</p>}
        </div>
      </div>
    </div>
  );
}
