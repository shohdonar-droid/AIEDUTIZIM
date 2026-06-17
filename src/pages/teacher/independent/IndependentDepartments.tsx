import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { Layers, Plus, Trash2, Edit2, AlertCircle, Save, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function IndependentDepartments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [currentCount, setCurrentCount] = useState(0);
  const limit = (user as any)?.limit_departments ?? 1;

  const loadDepartments = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'departments'), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDepartments(list);
      setCurrentCount(list.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    if (currentCount >= limit) {
      alert(`Sizning yo'nalishlar limiti tugagan (${currentCount} / ${limit}). Iltimos, limitlar bo'limida yangi limit sotib oling.`);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'departments'), {
        name: name.trim(),
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });
      setName('');
      await loadDepartments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (dept: any) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'departments', id), {
        name: editName.trim()
      });
      setEditingId(null);
      await loadDepartments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yo'nalishni o'chirishni tasdiqlaysizmi? Bu yo'nalishga tegishli barcha guruhlar va resurslar ta'sir qilishi mumkin.")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'departments', id));
      await loadDepartments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && departments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Yo'nalishlar</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Yangi ta'lim yo'nalishlarini qo'shish va ularni boshqarish.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Yangi yo'nalish</h3>
          
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Yo'nalishlar limiti:</span>
            <span className={`${currentCount >= limit ? 'text-red-500' : 'text-blue-600'}`}>{currentCount} / {limit}</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Yo'nalish nomi</label>
              <input
                type="text"
                required
                placeholder="Masalan: Axborot texnologiyalari"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || currentCount >= limit}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Yaratish
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Mavjud yo'nalishlar ({departments.length})</h3>
            </div>
            
            {departments.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Sizda hali hech qanday yo'nalishlar yaratilmagan.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {departments.map((dept, idx) => (
                  <div key={dept.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                    {editingId === dept.id ? (
                      <div className="flex-1 flex gap-3 mr-4">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                        />
                        <button 
                          onClick={() => handleUpdate(dept.id)}
                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{dept.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">MUSTAQIL ID: {dept.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    )}

                    {editingId !== dept.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(dept)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
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
