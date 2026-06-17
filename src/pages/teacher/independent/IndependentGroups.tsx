import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { Users, Plus, Trash2, Edit2, Save, X, Layers } from 'lucide-react';
import { motion } from 'motion/react';

export default function IndependentGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDeptId, setEditDeptId] = useState('');

  const [currentCount, setCurrentCount] = useState(0);
  const limit = (user as any)?.limit_groups ?? 1;

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
      setCurrentCount(grps.length);

      // 3. Fetch student counts for each group
      const counts: Record<string, number> = {};
      for (const group of grps) {
        const studQ = query(
          collection(db, 'users'), 
          where('role', '==', 'student'), 
          where('groupId', '==', group.id)
        );
        const countSnap = await getCountFromServer(studQ);
        counts[group.id] = countSnap.data().count;
      }
      setStudentCounts(counts);
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
    if (!name.trim() || !selectedDeptId || !user) return;

    if (currentCount >= limit) {
      alert(`Sizning guruhlar limiti tugagan (${currentCount} / ${limit}). Iltimos, limitlar bo'limida yangi limit sotib oling.`);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        departmentId: selectedDeptId,
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });
      setName('');
      setSelectedDeptId('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (group: any) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditDeptId(group.departmentId || '');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !editDeptId) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'groups', id), {
        name: editName.trim(),
        departmentId: editDeptId
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
    if (!confirm("Guruhni o'chirishni tasdiqlaysizmi? Bu guruhdagi barcha talabalar biriktirilmagan bo'lib qoladi.")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'groups', id));
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Guruhlar</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Yangi guruhlar ochish va ularni tegishli yo'nalishlarga bog'lash.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Yangi guruh</h3>
          
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Guruhlar limiti:</span>
            <span className={`${currentCount >= limit ? 'text-red-500' : 'text-blue-600'}`}>{currentCount} / {limit}</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Yo'nalish</label>
              <select
                required
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              >
                <option value="">Yo'nalishni tanlang...</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Guruh nomi</label>
              <input
                type="text"
                required
                placeholder="Masalan: F-21 yoki 101-guruh"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || currentCount >= limit || departments.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Yaratish
            </button>
            {departments.length === 0 && (
              <p className="text-[10px] text-amber-600 font-bold text-center">Guruh ochishdan oldin yo'nalish yaratishingiz kerak.</p>
            )}
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Mavjud guruhlar ({groups.length})</h3>
            </div>
            
            {groups.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Sizda hali hech qanday guruhlar yaratilmagan.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {groups.map((group, idx) => {
                  const dept = departments.find(d => d.id === group.departmentId);
                  const sCount = studentCounts[group.id] || 0;
                  return (
                    <div key={group.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                      {editingId === group.id ? (
                        <div className="flex-1 flex flex-col gap-3 mr-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                          />
                          <select
                            value={editDeptId}
                            onChange={e => setEditDeptId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                          >
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleUpdate(group.id)}
                              className="px-3 py-1.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1"
                            >
                              <Save className="h-4 w-4" /> Saqlash
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1"
                            >
                              <X className="h-4 w-4" /> Bekor qilish
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900">{group.name}</p>
                              <span className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-0.5 rounded-full">
                                {sCount} talaba
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                              <Layers className="h-3 w-3" /> Yo'nalish: {dept?.name || "Yo'q"}
                            </p>
                          </div>
                        </div>
                      )}

                      {editingId !== group.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(group)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
