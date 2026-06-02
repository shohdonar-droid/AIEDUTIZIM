import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, deleteDoc, doc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { Department, Group } from '../../types';
import { Plus, Trash2, Layers, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function TeacherDepartments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Only fetch departments created by this teacher
    const unsubDept = safeOnSnapshot(query(collection(db, 'departments'), where('creatorId', '==', user.uid)), (snap) => {
      const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
      d.sort((a, b) => a.name.localeCompare(b.name, 'uz-UZ'));
      setDepartments(d);
    }, (err) => console.error(err));

    // Only fetch groups created by this teacher
    const unsubGroup = safeOnSnapshot(query(collection(db, 'groups'), where('creatorId', '==', user.uid)), (snap) => {
      const g = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      g.sort((a, b) => a.name.localeCompare(b.name, 'uz-UZ'));
      setGroups(g);
      setLoading(false);
    }, (err) => console.error(err));

    return () => { unsubDept(); unsubGroup(); };
  }, [user]);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'departments'), {
        name: newDeptName.trim(),
        creatorId: user.uid,
        teacherId: user.role === 'staff' ? user.teacherId : user.uid,
        createdAt: serverTimestamp()
      });
      setNewDeptName('');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !selectedDeptId || !user) return;
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        departmentId: selectedDeptId,
        creatorId: user.uid,
        teacherId: user.role === 'staff' ? user.teacherId : user.uid,
        createdAt: serverTimestamp()
      });
      setNewGroupName('');
      setSelectedDeptId('');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz? Guruhlar ham alohida o'chirilishi kerak bo'lishi mumkin.")) return;
    try {
      await deleteDoc(doc(db, 'departments', id));
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, 'groups', id));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Yo'nalishlar va Guruhlar ({departments.length})</h2>
        <p className="text-gray-500 font-medium mt-1">O'zingiz yaratgan ta'lim yo'nalishlari va guruhlarni boshqarish</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Yo'nalishlar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Yo'nalishlar</h3>
          </div>

          <form onSubmit={handleAddDept} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Yangi yo'nalish nomi"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="space-y-2">
            {departments.length === 0 && <p className="text-gray-400 text-center py-4">Yo'nalishlar yo'q</p>}
            {departments.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition group">
                <span className="font-bold text-gray-700">{d.name}</span>
                <button
                  onClick={() => handleDeleteDept(d.id)}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Guruhlar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Guruhlar</h3>
          </div>

          <form onSubmit={handleAddGroup} className="flex flex-col gap-2 mb-6">
            <select
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
            >
              <option value="">-- Yo'nalishni tanlang --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Yangi guruh nomi"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button
                type="submit"
                className="bg-orange-600 text-white px-4 py-3 rounded-xl hover:bg-orange-700 transition flex justify-center items-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {groups.length === 0 && <p className="text-gray-400 text-center py-4">Guruhlar yo'q</p>}
            {groups.map(g => {
              const deptName = departments.find(d => d.id === g.departmentId)?.name || 'Noma\'lum';
              return (
                <div key={g.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition group">
                  <div>
                    <span className="font-bold text-gray-900">{g.name}</span>
                    <span className="text-xs text-gray-500 ml-2 bg-gray-100 px-2 py-1 rounded">
                      {deptName}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
