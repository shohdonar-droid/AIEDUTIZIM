import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, auth } from '../../lib/firebase';
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Camera, Save, Loader2, Mail, Phone, Calendar, User as UserIcon, Building, Users, Key } from 'lucide-react';
import { Department, Group } from '../../types';

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate || '',
    photoURL: user?.photoURL || '',
    departmentId: user?.departmentId || '',
    groupId: user?.groupId || '',
    address: user?.address || '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    async function loadDeptsAndGroups() {
      if (!user?.teacherId) return;
      try {
        const dSnap = await getDocs(query(collection(db, 'departments'), where('creatorId', '==', user.teacherId)));
        const depts = dSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
        setDepartments(depts);

        const gSnap = await getDocs(query(collection(db, 'groups'), where('creatorId', '==', user.teacherId)));
        const grps = gSnap.docs.map(g => ({ id: g.id, ...g.data() } as Group));
        setGroups(grps);
      } catch (err) {
        console.error(err);
      }
    }
    loadDeptsAndGroups();
  }, [user]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    const deptName = departments.find(d => d.id === formData.departmentId)?.name || '';
    const grpName = groups.find(g => g.id === formData.groupId)?.name || '';

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        departmentName: deptName,
        groupName: grpName
      });
      await refreshUser();
      alert('Ma\'lumotlar yangilandi!');
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi: ' + (err instanceof Error ? err.message : 'Noma\'lum xato'));
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(g => g.departmentId === formData.departmentId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Shaxsiy profil</h1>
        <p className="text-gray-500 mt-1">Platformadagi ma'lumotlaringizni boshqaring.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Picture Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-40 h-40 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 overflow-hidden ring-4 ring-white shadow-2xl">
                {formData.photoURL ? (
                  <img src={formData.photoURL || null} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-16 w-16" />
                )}
              </div>
              <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-8 w-full">
              <label className="block text-sm font-bold text-gray-700 mb-2 text-center uppercase tracking-wider">Rasm URL</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-center"
                placeholder="https://example.com/avatar.jpg"
                value={formData.photoURL}
                onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
              />
            </div>
            <p className="mt-6 text-xs text-gray-400 text-center leading-relaxed font-medium">
              O'quv sertifikatlarida aynan shu ism va rasm aks etadi.
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <UserIcon className="h-4 w-4" />
                  To'liq ism (FISH)
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <Phone className="h-4 w-4" />
                  Telefon raqam
                </label>
                <input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <Calendar className="h-4 w-4" />
                  Tug'ilgan sana
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <Building className="h-4 w-4" />
                  Yashash manzili
                </label>
                <input
                  type="text"
                  placeholder="Shahar, tuman, ko'cha, uy"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-gray-900"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  <Key className="h-4 w-4" />
                  Login
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-black text-gray-500">
                  {user?.login}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  <Key className="h-4 w-4" />
                  Parol
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-black text-gray-500">
                  {user?.password}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                  <Mail className="h-4 w-4" />
                  E-pochta
                </label>
                <div className="px-4 py-2 text-xs bg-gray-100 border border-gray-200 rounded-2xl font-bold text-gray-400 break-all">
                  {user?.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <Building className="h-4 w-4" />
                  Yo'nalish
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-bold text-gray-500">
                  {user?.departmentName || "Kiritilmagan"}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                  <Users className="h-4 w-4" />
                  Guruh
                </label>
                <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl font-bold text-gray-500">
                  {user?.groupName || "Kiritilmagan"}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50 flex justify-end">
              <button
                disabled={loading}
                type="button"
                onClick={() => handleSave()}
                className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                SAQLASH
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
