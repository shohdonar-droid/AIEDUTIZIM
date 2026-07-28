import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, deleteDoc, doc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { Department, Group } from '../../types';
import { Plus, Trash2, Layers, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { logSystemAction } from '../../lib/logUtils';

export default function AdminDepartments() {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubFaculty = safeOnSnapshot(query(collection(db, 'faculties')), (snap) => {
      setFaculties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const unsubDept = safeOnSnapshot(query(collection(db, 'departments')), (snap) => {
      const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
      d.sort((a, b) => a.name.localeCompare(b.name, 'uz-UZ'));
      setDepartments(d);
    }, (err) => console.error(err));

    const unsubGroup = safeOnSnapshot(query(collection(db, 'groups')), (snap) => {
      const g = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      g.sort((a, b) => a.name.localeCompare(b.name, 'uz-UZ'));
      setGroups(g);
      setLoading(false);
    }, (err) => console.error(err));

    return () => { unsubFaculty(); unsubDept(); unsubGroup(); };
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !selectedFacultyId) {
      alert('Nomi va fakultetni tanlang');
      return;
    }
    try {
      await addDoc(collection(db, 'departments'), {
        name: newDeptName.trim(),
        facultyId: selectedFacultyId,
        createdAt: serverTimestamp()
      });
      await logSystemAction(
        `Yangi yo'nalish yaratildi: ${newDeptName.trim()}`,
        "Yo'nalishlar",
        user?.displayName || "Admin",
        user?.role || "Admin"
      );
      setNewDeptName('');
      setSelectedFacultyId('');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !selectedDeptId) return;
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        departmentId: selectedDeptId,
        createdAt: serverTimestamp()
      });
      await logSystemAction(
        `Yangi guruh yaratildi: ${newGroupName.trim()}`,
        "Guruhlar",
        user?.displayName || "Admin",
        user?.role || "Admin"
      );
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
      await logSystemAction(
        `Yo'nalish o'chirildi: ${departments.find(d => d.id === id)?.name || id}`,
        "Yo'nalishlar",
        user?.displayName || "Admin",
        user?.role || "Admin"
      );
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, 'groups', id));
      await logSystemAction(
        `Guruh o'chirildi: ${groups.find(g => g.id === id)?.name || id}`,
        "Guruhlar",
        user?.displayName || "Admin",
        user?.role || "Admin"
      );
    } catch (err) { console.error(err); }
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Yo'nalishlar va Guruhlar</h2>
        <p className="text-gray-500 font-medium mt-1">Talabalar uchun ta'lim yo'nalishlari va guruhlarni boshqarish</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Yo'nalishlar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Yo'nalishlar</h3>
          </div>

          <form onSubmit={handleAddDept} className="flex flex-col gap-3 mb-6">
            <select
              value={selectedFacultyId}
              onChange={e => setSelectedFacultyId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
            >
              <option value="">Fakultetni tanlang...</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                placeholder="Yangi yo'nalish nomi..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Yaratish
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {departments.map(d => {
              const fac = faculties.find(f => f.id === d.facultyId);
              return (
                <div key={d.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <span className="font-bold text-gray-900">{d.name}</span>
                    <span className="block text-[10px] font-black text-blue-600 uppercase tracking-tighter mt-0.5">{fac?.name || 'Fakultetsiz'}</span>
                  </div>
                  <button onClick={() => handleDeleteDept(d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {departments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Yo'nalishlar mavjud emas</p>}
          </div>
        </div>

        {/* Guruhlar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Guruhlar</h3>
          </div>

          <form onSubmit={handleAddGroup} className="flex flex-col gap-3 mb-6">
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
            >
              <option value="">Yo'nalishni tanlang...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Yangi guruh nomi..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium"
              />
              <button type="submit" className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 transition-colors">
                <Plus className="w-4 h-4" /> Yaratish
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {groups.map(g => {
              const dept = departments.find(d => d.id === g.departmentId);
              return (
                <div key={g.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <span className="block font-bold text-gray-900">{g.name}</span>
                    <span className="block text-xs font-black text-gray-400 uppercase tracking-widest mt-1">{dept?.name || 'Noma\'lum'}</span>
                  </div>
                  <button onClick={() => handleDeleteGroup(g.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Guruhlar mavjud emas</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
