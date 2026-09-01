import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db, auth } from '../../lib/firebase';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { doc, setDoc, getDocs, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Camera, Save, Loader2, Mail, Phone, Calendar, User as UserIcon, Building, Users, Key } from 'lucide-react';
import { Department, Group } from '../../types';

export default function StudentProfile() {
  
  const { user, refreshUser } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = safeOnSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setLocalUser({ uid: snap.id, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const [loading, setLoading] = useState(false);

  const [linkingTg, setLinkingTg] = useState(false);

  const handleLinkTelegram = async () => {
    if (!user?.uid) return;
    setLinkingTg(true);
    try {
      const token = Math.random().toString(36).substring(2, 10);
      await setDoc(doc(db, 'users', user.uid), {
        telegramToken: token,
      }, { merge: true });
      window.open(`https://t.me/aiedutizim_bot?start=link_${token}`, '_blank');
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
    } finally {
      setLinkingTg(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!user?.uid) return;
    if (!confirm("Telegram akkauntini uzishni xohlaysizmi?")) return;
    setLinkingTg(true);
    try {
      const currentTgId = localUser?.telegramId || (user as any)?.telegramId;
      await setDoc(doc(db, 'users', user.uid), {
        telegramId: null,
        telegramLinked: false,
        telegramToken: null
      }, { merge: true });
      
      if (currentTgId) {
        try {
          await fetch('/api/telegram/unlink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: currentTgId, studentUid: user.uid })
          });
        } catch(err) {
          console.error("Botni ogohlantirishda xatolik", err);
        }
      }
      
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi");
    } finally {
      setLinkingTg(false);
    }
  };

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
      await setDoc(doc(db, 'users', user.uid), {
        ...formData,
        departmentName: deptName,
        groupName: grpName
      }, { merge: true });
      
      try {
         await addDoc(collection(db, 'admin_notifications'), {
            text: `📝 Profil tahrirlandi:\n👤 Talaba: ${formData.displayName}\n🏢 Yo'nalish: ${deptName || 'yoq'}\n👥 Guruh: ${grpName || 'yoq'}`,
            timestamp: serverTimestamp()
         });
      } catch (e) {}
      
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
      <header className="px-4 lg:px-0">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          Shaxsiy profil
        </h1>
        <p className="text-gray-500 mt-2 text-base max-w-lg">
          Platformadagi ma'lumotlaringizni boshqaring.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 lg:px-0">
        {/* Profile Picture Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 overflow-hidden ring-2 ring-white shadow-lg">
                {formData.photoURL ? (
                  <img src={formData.photoURL || null} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-12 w-12" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Profile Name, Role & ID Badge */}
            <div className="mt-4 text-center space-y-1 w-full">
              <h3 className="font-extrabold text-gray-900 text-lg tracking-tight">
                {formData.displayName || user?.displayName || 'O\'quvchi'}
              </h3>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                O'quvchi / Talaba
              </p>
              <div className="pt-2 flex flex-col items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-extrabold text-xs font-mono shadow-sm">
                  <span className="text-amber-600 font-black">ID:</span>
                  <span>{user?.systemId || user?.uid}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-black text-xs font-mono shadow-sm">
                  <span className="text-emerald-600 font-black">💳 Balans:</span>
                  <span>{((user as any)?.balance || 0).toLocaleString()} UZS</span>
                </span>
              </div>
            </div>

            <div className="mt-6 w-full pt-4 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider text-center">Rasm URL</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-center"
                placeholder="https://example.com/avatar.jpg"
                value={formData.photoURL}
                onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">
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

            {/* Login, Parol, E-pochta qatori */}
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
                <div className="px-4 py-3 text-xs bg-gray-100 border border-gray-200 rounded-2xl font-bold text-gray-400 break-all">
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Platforma ID (UID) qatori - Login va Parol qatoridan PASTDA */}
            <div className="pt-6 border-t border-gray-50">
              <label className="flex items-center gap-2 text-xs font-black text-amber-500 mb-2 uppercase tracking-widest">
                <Key className="h-4 w-4" />
                Platforma ID (UID)
              </label>
              <div className="flex items-center gap-2 max-w-xl">
                <div className="flex-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl font-black text-amber-800 select-all font-mono text-sm">
                  {user?.systemId || user?.uid}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const uIdToCopy = user?.systemId || user?.uid;
                    if (uIdToCopy) {
                      navigator.clipboard.writeText(uIdToCopy);
                      alert("UID nusxalandi! To'lov ilovasida ushbu ID orqali to'lov qilishingiz mumkin.");
                    }
                  }}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Nusxalash
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 font-bold">
                💡 Payme, Click yoki Uzum Bank ilovasida ushbu ID raqamingiz orqali to'g'ridan-to'g'ri balansni to'ldirishingiz mumkin.
              </p>
            </div>

            
            {/* Telegram qatori */}
            <div className="pt-6 border-t border-gray-50 mt-6">
              <label className="flex items-center gap-2 text-xs font-black text-blue-500 mb-2 uppercase tracking-widest">
                Telegram
              </label>
              <div className="flex items-center gap-4 max-w-xl">
                {localUser?.telegramLinked ? (
                  <>
                    <div className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl font-black text-emerald-800 text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      🟢 Telegram ulangan
                    </div>
                    <button
                      type="button"
                      disabled={linkingTg}
                      onClick={handleUnlinkTelegram}
                      className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      {linkingTg ? "Kuting..." : "🔓 Telegramni uzish"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-500 text-sm">
                      🔐 Telegram akkauntingiz talaba profiliga ulanmagan
                    </div>
                    <button
                      type="button"
                      disabled={linkingTg}
                      onClick={handleLinkTelegram}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      {linkingTg ? "Kuting..." : "🤖 Telegram botni ulash"}
                    </button>
                  </>
                )}
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
