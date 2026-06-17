import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { BookOpen, Plus, Trash2, Edit2, Save, X, Layers, Users, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function IndependentSubjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editGroupId, setEditGroupId] = useState('');

  const [currentCount, setCurrentCount] = useState(0);
  const limit = (user as any)?.limit_subjects ?? 2;

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch departments
      const deptQ = query(collection(db, 'departments'), where('teacherId', '==', user.uid));
      const deptSnap = await getDocs(deptQ);
      const depts = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDepartments(depts);

      // 2. Fetch groups
      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      const grps = grpSnap.docs.map(g => ({ id: g.id, ...g.data() }));
      setGroups(grps);

      // 3. Fetch subjects
      const subQ = query(collection(db, 'subjects'), where('teacherId', '==', user.uid));
      const subSnap = await getDocs(subQ);
      const list = subSnap.docs.map(s => ({ id: s.id, ...s.data() }));
      setSubjects(list);
      setCurrentCount(list.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedDeptId || !selectedGroupId || !user) return;

    if (currentCount >= limit) {
      alert(`Sizning mavzular limiti tugagan (${currentCount} / ${limit}). Iltimos, limitlar bo'limida yangi limit sotib oling.`);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'subjects'), {
        name: name.trim(),
        description: description.trim(),
        departmentId: selectedDeptId,
        groupId: selectedGroupId,
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });
      setName('');
      setDescription('');
      setSelectedDeptId('');
      setSelectedGroupId('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (sub: any) => {
    setEditingId(sub.id);
    setEditName(sub.name || '');
    setEditDesc(sub.description || '');
    setEditDeptId(sub.departmentId || '');
    setEditGroupId(sub.groupId || '');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !editDeptId || !editGroupId) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'subjects', id), {
        name: editName.trim(),
        description: editDesc.trim(),
        departmentId: editDeptId,
        groupId: editGroupId
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Mavzuni o'chirishni tasdiqlaysizmi?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'subjects', id));
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Ta'lim mavzulari</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Dars mavzularini yo'nalish hamda aniq guruhlarga biriktirgan holda yaratish.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Yangi mavzu</h3>
          
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Mavzular limiti:</span>
            <span className={`${currentCount >= limit ? 'text-red-500' : 'text-blue-600'}`}>{currentCount} / {limit}</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Yo'nalish (Majburiy)</label>
              <select
                required
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              >
                <option value="">Yo'nalishni tanlang...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Guruh (Majburiy)</label>
              <select
                required
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              >
                <option value="">Guruhni tanlang...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Mavzu nomi</label>
              <input
                type="text"
                required
                placeholder="Masalan: Web dasturlash asoslari"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Tavsifi</label>
              <textarea
                placeholder="Mavzu mazmuni haqida qisqacha ma'lumot..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all h-24 resize-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || currentCount >= limit || departments.length === 0 || groups.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Yaratish
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Mavzular ro'yxati ({subjects.length})</h3>
            </div>
            
            {subjects.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Mavzular topilmadi. Avval yo'nalish va guruh tanlab mavzu yarating.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {subjects.map((sub, idx) => {
                  const grp = groups.find(g => g.id === sub.groupId);
                  const dept = departments.find(d => d.id === sub.departmentId);
                  return (
                    <div key={sub.id} className="p-6 hover:bg-gray-50/50 transition-all">
                      {editingId === sub.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                          />
                          <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none h-20 resize-none"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={editDeptId}
                              onChange={e => setEditDeptId(e.target.value)}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                            >
                              {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <select
                              value={editGroupId}
                              onChange={e => setEditGroupId(e.target.value)}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                            >
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleUpdate(sub.id)}
                              className="px-3 py-1.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-xs font-bold"
                            >
                              Saqlash
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-xs font-bold"
                            >
                              Bekor qilish
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mt-1">
                              <Book className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{sub.name}</p>
                              {sub.description && (
                                <p className="text-xs text-gray-500 mt-1">{sub.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400 mt-2">
                                <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                  <Layers className="h-3 w-3" /> {dept?.name || "Noma'lum"}
                                </span>
                                <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                                  <Users className="h-3 w-3" /> {grp?.name || "Noma'lum"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(sub)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
