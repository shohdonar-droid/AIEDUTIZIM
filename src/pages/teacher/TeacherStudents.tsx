import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, where, updateDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { UserProfile, Department, Group } from '../../types';
import { Search, Trash2, Filter, Key, Plus, X, Save, Loader2, Download, Edit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as XLSX from 'xlsx';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function TeacherStudents() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teacherDepartments, setTeacherDepartments] = useState<Department[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeptId, setFilterDeptId] = useState<string>('');
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    displayName: '',
    phone: '',
    departmentId: '',
    groupId: ''
  });
  const [newStaff, setNewStaff] = useState({
    displayName: '',
    phone: '',
    login: '',
    password: ''
  });
  const [creating, setCreating] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<UserProfile> | null>(null);
  const [studentSaving, setStudentSaving] = useState(false);

  const getPrefix = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toLowerCase();
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newStudent.displayName || !newStudent.departmentId || !newStudent.groupId) {
      alert("Iltimos, barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    setCreating(true);
    try {
      const orgId = user.role === 'staff' ? user.teacherId : user.uid;
      const prefix = getPrefix(user.displayName || 'user');
      
      // Get current student count for this prefix in the WHOLE organization
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'student'),
        where('teacherId', '==', orgId)
      );
      const snap = await getDocs(q);
      
      // Filter by those that start with prefix and have 5 digits
      const studentsWithPrefix = snap.docs
        .map(d => d.data().login || '')
        .filter(login => login.startsWith(prefix));
      
      let nextNum = 1;
      if (studentsWithPrefix.length > 0) {
        const nums = studentsWithPrefix.map(l => {
          const m = l.match(/\d+$/);
          return m ? parseInt(m[0]) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }

      const paddedNum = nextNum.toString().padStart(5, '0');
      const generatedLogin = `${prefix}${paddedNum}`;
      
      // Generate random 6-char password (letters and numbers)
      const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
      let randomPass = "";
      for (let i = 0; i < 6; i++) {
        randomPass += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      
      const generatedEmail = `${generatedLogin}@student.uz`;

      // Create in Auth via REST
      const signupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: generatedEmail,
          password: randomPass,
          returnSecureToken: false
        })
      });

      if (!signupRes.ok) {
        const errData = await signupRes.json();
        throw new Error(errData.error.message || "Foydalanuvchi yaratishda xato");
      }
      const signupData = await signupRes.json();
      const newUid = signupData.localId;

      const deptName = teacherDepartments.find(d => d.id === newStudent.departmentId)?.name || '';
      const groupName = teacherGroups.find(g => g.id === newStudent.groupId)?.name || '';

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        displayName: newStudent.displayName,
        phone: newStudent.phone,
        login: generatedLogin,
        password: randomPass,
        email: generatedEmail,
        role: 'student',
        teacherId: orgId,
        teacherName: user.displayName,
        departmentId: newStudent.departmentId,
        departmentName: deptName,
        groupId: newStudent.groupId,
        groupName: groupName,
        createdAt: serverTimestamp()
      });

      setShowCreateModal(false);
      setNewStudent({ displayName: '', phone: '', departmentId: '', groupId: '' });
      alert(`Talaba muvaffaqiyatli yaratildi!\nLogin: ${generatedLogin}\nParol: ${randomPass}`);
    } catch (err: any) {
      console.error(err);
      alert("Xatolik: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newStaff.displayName || !newStaff.phone || !newStaff.login || !newStaff.password) {
      alert("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }

    setCreating(true);
    try {
      const orgId = user.role === 'staff' ? user.teacherId : user.uid;
      const gEmail = `${newStaff.login}@teacher.uz`;

      const signupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gEmail,
          password: newStaff.password,
          returnSecureToken: false
        })
      });

      if (!signupRes.ok) {
        const errData = await signupRes.json();
        throw new Error(errData.error.message || "Foydalanuvchi yaratishda xato");
      }
      const signupData = await signupRes.json();
      const newUid = signupData.localId;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        displayName: newStaff.displayName,
        phone: newStaff.phone,
        login: newStaff.login,
        password: newStaff.password,
        email: gEmail,
        role: 'staff',
        teacherId: orgId,
        teacherName: user.displayName,
        spentBalls: 0,
        createdAt: serverTimestamp()
      });

      setShowCreateModal(false);
      setNewStaff({ displayName: '', phone: '', login: '', password: '' });
      alert(`Xodim muvaffaqiyatli yaratildi!`);
    } catch (err: any) {
      console.error(err);
      alert("Xatolik: " + (err.message || 'Noma\'lum xato'));
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const orgId = user.role === 'staff' ? user.teacherId : user.uid;
        if (!orgId) return;

        // Teacher's departments
        const deptSnap = await getDocs(query(collection(db, 'departments'), where('creatorId', '==', orgId)));
        const depts = deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
        setTeacherDepartments(depts);
        
        // Teacher's groups
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('creatorId', '==', orgId)));
        const grps = groupSnap.docs.map(g => ({ id: g.id, ...g.data() } as Group));
        setTeacherGroups(grps);

        const q = query(
          collection(db, 'users'), 
          where('role', '==', activeTab), 
          where('teacherId', '==', orgId)
        );
        const unsub = safeOnSnapshot(q, (snap) => {
          const dbUsers = snap.docs.map(doc => ({ ...doc.data() } as UserProfile));
          dbUsers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'uz-UZ'));
          setUsers(dbUsers);
          setLoading(false);
        }, (err: any) => {
          if (!err?.message?.includes("Quota")) {
            console.error("TeacherStudents Snapshot Error:", err);
            handleFirestoreError(err, OperationType.LIST, `users (activeTab: ${activeTab})`);
          }
          setLoading(false);
        });

        return () => unsub();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    load();
  }, [user, activeTab]);

  const deleteSingleUser = async (uid: string) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error(error);
      alert("O'chirishda xatolik yuz berdi");
    }
  };

  const saveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.uid) return;
    setStudentSaving(true);
    try {
       const deptName = teacherDepartments.find(d => d.id === editingStudent.departmentId)?.name || '';
       const grpName = teacherGroups.find(g => g.id === editingStudent.groupId)?.name || '';
       await updateDoc(doc(db, 'users', editingStudent.uid), {
          departmentId: editingStudent.departmentId || '',
          departmentName: deptName,
          groupId: editingStudent.groupId || '',
          groupName: grpName
       });
       setEditingStudent(null);
    } catch (err: any) { alert(err.message); } finally { setStudentSaving(false); }
  };

  const resetPassword = async (uid: string) => {
    if (!confirm("Talaba parolini '123456' ga reset qilishni xohlaysizmi?")) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        password: '123456'
      });
      alert("Parol muvaffaqiyatli '123456' ga o'zgartirildi!");
    } catch (error) {
      console.error(error);
      alert("Xatolik yuz berdi");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || (u.login && u.login.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDeptId ? u.departmentId === filterDeptId : true;
    const matchesGroup = filterGroupId ? u.groupId === filterGroupId : true;
    return matchesSearch && matchesDept && matchesGroup;
  });

  // Derived groups for the selected department filter
  const displayedGroups = filterDeptId ? teacherGroups.filter(g => g.departmentId === filterDeptId) : teacherGroups;

  const exportToExcel = () => {
    const filename = activeTab === 'student' ? "Talabalar_Ro'yxati.xlsx" : "Xodimlar_Ro'yxati.xlsx";
    const exportData = filteredUsers.map((u, i) => {
      const base = {
        "№": i + 1,
        "F.I.SH": u.displayName,
        "Telefon raqam": u.phone || '-',
        "E-pochta": u.email || '-',
        "Login": u.login || '-',
        "Parol": u.password || '-'
      };
      if (activeTab === 'student') {
        return {
          ...base,
          "Tug'ilgan sana": u.birthDate || '-',
          "Manzil": u.address || '-',
          "Yo'nalish": u.departmentName || '-',
          "Guruh": u.groupName || '-'
        };
      } else {
        return base;
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'student' ? "Talabalar" : "Xodimlar");
    XLSX.writeFile(workbook, filename);
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {activeTab === 'student' ? 'Talabalarim' : 'Xodimlarim'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {activeTab === 'student' 
              ? 'O\'zingiz yaratgan yo\'nalishlarga ro\'yxatdan o\'tganlar.' 
              : 'Tashkilotingiz tomonidan yaratilgan xodimlar ro\'yxati.'}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
          >
            <Download className="w-6 h-6" /> YUKLAB OLISH
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" /> {activeTab === 'student' ? 'TALABA YARATISH' : 'XODIM YARATISH'}
          </button>
        </div>
      </header>

      <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('student')}
          className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Talabalar
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Xodimlar
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900">
                {activeTab === 'student' ? 'Yangi Talaba Qo\'shish' : 'Yangi Xodim Qo\'shish'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-200 rounded-xl transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            {activeTab === 'student' ? (
              <form onSubmit={createStudent} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">F.I.SH (To'liq ism)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                    placeholder="Ism Familiya Sharif"
                    value={newStudent.displayName}
                    onChange={e => setNewStudent({...newStudent, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">Telefon raqam</label>
                  <input 
                    type="tel" 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                    placeholder="+998 90 123 45 67"
                    value={newStudent.phone}
                    onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase ml-1">Yo'nalish</label>
                    <select 
                      required 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                      value={newStudent.departmentId}
                      onChange={e => setNewStudent({...newStudent, departmentId: e.target.value, groupId: ''})}
                    >
                      <option value="">Tanlang</option>
                      {teacherDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase ml-1">Guruh</label>
                    <select 
                      required 
                      disabled={!newStudent.departmentId}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium disabled:opacity-50"
                      value={newStudent.groupId}
                      onChange={e => setNewStudent({...newStudent, groupId: e.target.value})}
                    >
                      <option value="">Tanlang</option>
                      {teacherGroups.filter(g => g.departmentId === newStudent.departmentId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    BEKOR QILISH
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    SAQLASH
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={createStaff} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">F.I.SH (To'liq ism)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                    placeholder="Ism Familiya Sharif"
                    value={newStaff.displayName}
                    onChange={e => setNewStaff({...newStaff, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase ml-1">Telefon raqam</label>
                  <input 
                    type="tel" 
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                    placeholder="+998 90 123 45 67"
                    value={newStaff.phone}
                    onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase ml-1">Login</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                      placeholder="xodim_login"
                      value={newStaff.login}
                      onChange={e => setNewStaff({...newStaff, login: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase ml-1">Parol</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                      placeholder="******"
                      value={newStaff.password}
                      onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    BEKOR QILISH
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    SAQLASH
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-12 pr-6 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-medium"
            placeholder="Qidirish (ism, login)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full max-w-md gap-4">
           {activeTab === 'student' ? (
             <>
               <select 
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-medium"
                  value={filterDeptId}
                  onChange={(e) => {
                    setFilterDeptId(e.target.value);
                    setFilterGroupId(''); // reset group when dept changes
                  }}
               >
                 <option value="">Barcha yo'nalishlar</option>
                 {teacherDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
               </select>
               <select 
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-medium"
                  value={filterGroupId}
                  onChange={(e) => setFilterGroupId(e.target.value)}
               >
                 <option value="">Barcha guruhlar</option>
                 {displayedGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
               </select>
             </>
           ) : (
             <div className="flex-1 py-3 px-4 text-gray-400 font-medium italic">
               Xodimlar uchun filtr yo'q
             </div>
           )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest border-b">
                <th className="px-6 py-4 text-left">№</th>
                <th className="px-6 py-4 text-left">F.I.SH</th>
                <th className="px-6 py-4 text-left">Tel raqam</th>
                {activeTab === 'student' && (
                  <>
                    <th className="px-6 py-4 text-center">Yo'nalish</th>
                    <th className="px-6 py-4 text-center">Guruh</th>
                  </>
                )}
                <th className="px-6 py-4 text-center">Login</th>
                <th className="px-6 py-4 text-center">Parol</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 && (
                 <tr>
                    <td colSpan={activeTab === 'student' ? 8 : 7} className="text-center py-10 text-gray-400 font-bold">
                      {activeTab === 'student' ? 'Talabalar topilmadi.' : 'Xodimlar topilmadi.'}
                    </td>
                 </tr>
              )}
              {filteredUsers.map((u, i) => (
                <tr key={`${u.uid || 'user'}_${i}`} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-6 py-4 font-black">{u.displayName}</td>
                  <td className="px-6 py-4 font-medium text-sm text-gray-500">{u.phone || '-'}</td>
                  {activeTab === 'student' && (
                    <>
                      <td className="px-6 py-4 text-center font-bold text-sm text-indigo-600 bg-indigo-50/50">{u.departmentName || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-sm text-gray-600">{u.groupName || '-'}</td>
                    </>
                  )}
                  <td className="px-6 py-4 text-center font-black text-sm text-blue-700 bg-blue-50/50">{u.login || '-'}</td>
                  <td className="px-6 py-4 text-center font-mono text-sm text-gray-400">{u.password || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {activeTab === 'student' && (
                        <button onClick={() => setEditingStudent(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition shadow-sm" title="Tahrirlash">
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => resetPassword(u.uid)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition shadow-sm" title="Parolni tiklash">
                        <Key className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteSingleUser(u.uid)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">Talabani tahrirlash</h2>
              <button 
                onClick={() => setEditingStudent(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveStudentEdit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">FISH</label>
                  <div className="p-3 bg-gray-50 rounded-xl font-bold text-gray-500 border border-gray-100">{editingStudent.displayName}</div>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Yo'nalish</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
                    value={editingStudent.departmentId || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, departmentId: e.target.value, groupId: '' })}
                  >
                    <option value="">Tanlang...</option>
                    {teacherDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Guruh</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium disabled:opacity-50"
                    value={editingStudent.groupId || ''}
                    disabled={!editingStudent.departmentId}
                    onChange={e => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                  >
                    <option value="">Tanlang...</option>
                    {teacherGroups.filter(g => g.departmentId === editingStudent.departmentId).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={studentSaving}
                  className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {studentSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  SAQLASH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
