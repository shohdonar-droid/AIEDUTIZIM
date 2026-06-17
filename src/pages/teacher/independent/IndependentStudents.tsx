import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { GraduationCap, Plus, Trash2, Edit2, Save, X, Users, Mail, Key } from 'lucide-react';
import { motion } from 'motion/react';

export default function IndependentStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [currentCount, setCurrentCount] = useState(0);
  const limit = (user as any)?.limit_students ?? 5;

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch groups and departments
      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      const grps = grpSnap.docs.map(g => ({ id: g.id, ...g.data() }));
      setGroups(grps);

      const deptQ = query(collection(db, 'departments'), where('teacherId', '==', user.uid));
      const deptSnap = await getDocs(deptQ);
      setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch students
      const studQ = query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', user.uid));
      const studSnap = await getDocs(studQ);
      const list = studSnap.docs.map(s => ({ id: s.id, ...s.data() }));
      setStudents(list);
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
    if (!displayName.trim() || !selectedGroupId || !user) return;

    if (currentCount >= limit) {
      alert(`Sizning talabalar limiti tugagan (${currentCount} / ${limit}). Iltimos, limitlar bo'limida yangi limit sotib oling.`);
      return;
    }

    try {
      setLoading(true);
      const groupData = groups.find(g => g.id === selectedGroupId);
      
      // Deterministic user document path - using a generated doc reference
      const newStudentRef = doc(collection(db, 'users'));
      
      const emailVal = email.trim() || `${login.trim() || Date.now()}@student.uz`;
      const loginVal = login.trim() || `std_${Math.floor(Math.random() * 900000 + 100000)}`;
      const passVal = password.trim() || '123456';

      await setDoc(newStudentRef, {
        uid: newStudentRef.id,
        displayName: displayName.trim(),
        email: emailVal,
        login: loginVal,
        password: passVal,
        role: 'student',
        groupId: selectedGroupId,
        departmentId: groupData?.departmentId || '',
        teacherId: user.uid,
        organizationId: (user as any).teacherId || "", // Associate independent teacher's student to UY organization
        createdAt: serverTimestamp(),
        balls: 0
      });

      setDisplayName('');
      setEmail('');
      setLogin('');
      setPassword('');
      setSelectedGroupId('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (student: any) => {
    setEditingId(student.id);
    setEditName(student.displayName || '');
    setEditEmail(student.email || '');
    setEditGroupId(student.groupId || '');
    setEditLogin(student.login || '');
    setEditPassword(student.password || '123456');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !editGroupId) return;
    try {
      setLoading(true);
      const groupData = groups.find(g => g.id === editGroupId);
      await updateDoc(doc(db, 'users', id), {
        displayName: editName.trim(),
        email: editEmail.trim(),
        groupId: editGroupId,
        departmentId: groupData?.departmentId || '',
        login: editLogin.trim(),
        password: editPassword.trim()
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
    if (!confirm("Talabani o'chirishni tasdiqlaysizmi?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'users', id));
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Talabalar</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Yangi talabalarni ro'yxatdan o'tkazish va guruhlarga taqsimlash.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Yangi talaba</h3>
          
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Talabalar limiti:</span>
            <span className={`${currentCount >= limit ? 'text-red-500' : 'text-blue-600'}`}>{currentCount} / {limit}</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">F.I.SH (To'liq ism)</label>
              <input
                type="text"
                required
                placeholder="Masalan: Sardor Alimov"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Guruh</label>
              <select
                required
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              >
                <option value="">Guruhni tanlang...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Email (Ixtiyoriy)</label>
              <input
                type="email"
                placeholder="talaba@xyz.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Login (Tizimga kirish uchun)</label>
              <input
                type="text"
                required
                placeholder="sardor_alimov"
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Parol</label>
              <input
                type="text"
                required
                placeholder="kamida 6 ta belgi"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || currentCount >= limit || groups.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Yaratish
            </button>
            {groups.length === 0 && (
              <p className="text-[10px] text-amber-600 font-bold text-center">Talaba yaratishdan oldin guruh ochgan bo'lishingiz shart.</p>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Talabalar ro'yxati ({students.length})</h3>
            </div>
            
            {students.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Guruhlarda hali hech bir talaba ro'yxatga olinmagan.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {students.map((student, idx) => {
                  const grp = groups.find(g => g.id === student.groupId);
                  const dept = departments.find(d => d.id === student.departmentId);
                  return (
                    <div key={student.id} className="p-6 hover:bg-gray-50/50 transition-all">
                      {editingId === student.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              required
                              placeholder="F.I.SH"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                            />
                            <input
                              type="text"
                              required
                              placeholder="Login"
                              value={editLogin}
                              onChange={e => setEditLogin(e.target.value)}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                            />
                            <input
                              type="text"
                              required
                              placeholder="Parol"
                              value={editPassword}
                              onChange={e => setEditPassword(e.target.value)}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          
                          <select
                            value={editGroupId}
                            onChange={e => setEditGroupId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none"
                          >
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>

                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleUpdate(student.id)}
                              className="px-3 py-1.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-xs font-bold flex items-center gap-1"
                            >
                              <Save className="h-4 w-4" /> Saqlash
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1"
                            >
                              <X className="h-4 w-4" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#007aff]/5 flex items-center justify-center text-[#007aff]">
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{student.displayName}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400 font-bold mt-1">
                                <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                                  <Users className="h-3 w-3" /> {grp?.name || 'Guruhsiz'}
                                </span>
                                {dept && (
                                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                                    {dept.name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {student.email}
                                </span>
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Key className="h-3 w-3" /> login: <strong>{student.login}</strong> | pass: <strong>{student.password}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(student)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
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
