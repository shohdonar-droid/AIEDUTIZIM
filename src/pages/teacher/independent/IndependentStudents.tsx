import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { GraduationCap, Plus, Trash2, Edit2, Save, X, Search, Users, Phone, Key, HelpCircle } from 'lucide-react';

export default function IndependentStudents() {
  const { user } = useAuth();
  
  // Data lists
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterGrp, setFilterGrp] = useState("");

  // Modals visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Create Form fields
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newLogin, setNewLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Edit Form fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [editLogin, setEditLogin] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const limit = (user as any)?.limit_students ?? 5;
  const currentCount = students.length;

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch groups
      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      const grps = grpSnap.docs.map(g => ({ id: g.id, ...g.data() }));
      setGroups(grps);

      // Fetch departments
      const deptQ = query(collection(db, 'departments'), where('teacherId', '==', user.uid));
      const deptSnap = await getDocs(deptQ);
      setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch students
      const studQ = query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', user.uid));
      const studSnap = await getDocs(studQ);
      const list = studSnap.docs.map(s => ({ uid: s.id, ...s.data() }));
      setStudents(list);
    } catch (err) {
      console.error("Error loading independent students data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Create Student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newName.trim() || !newGroupId) {
      alert("Iltimos, talaba ismi va guruhni kiriting!");
      return;
    }

    if (currentCount >= limit) {
      alert(`Sizning talabalar limiti tugagan (${currentCount} / ${limit}). Iltimos, limitlar bo'limida yangi limit sotib oling.`);
      return;
    }

    try {
      setSubmitting(true);
      const groupData = groups.find(g => g.id === newGroupId);
      const newStudentRef = doc(collection(db, 'users'));

      const autoLogin = newLogin.trim() || `std_${Math.floor(Math.random() * 900000 + 100000)}`;
      const autoPassword = newPassword.trim() || '123456';
      const emailVal = newEmail.trim() || `${autoLogin}@student.uz`;

      await setDoc(newStudentRef, {
        uid: newStudentRef.id,
        displayName: newName.trim(),
        phone: newPhone.trim() || "-",
        email: emailVal,
        login: autoLogin,
        password: autoPassword,
        role: 'student',
        groupId: newGroupId,
        departmentId: groupData?.departmentId || '',
        teacherId: user.uid,
        organizationId: (user as any).teacherId || "UY", // Associate independent teacher's student to UY organization
        createdAt: serverTimestamp(),
        balls: 0
      });

      // Clear form
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewGroupId("");
      setNewLogin("");
      setNewPassword("");
      setIsCreateModalOpen(false);

      alert("Talaba muvaffaqiyatli saqlandi.");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Talaba yaratishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Click
  const handleEditClick = (student: any) => {
    setSelectedStudent(student);
    setEditName(student.displayName || "");
    setEditPhone(student.phone || "");
    setEditEmail(student.email || "");
    setEditGroupId(student.groupId || "");
    setEditLogin(student.login || "");
    setEditPassword(student.password || "123456");
    setIsEditModalOpen(true);
  };

  // Handle Update Student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!editName.trim() || !editGroupId) {
      alert("Talaba ismi va guruhni hammasini to'ldiring!");
      return;
    }

    try {
      setSubmitting(true);
      const groupData = groups.find(g => g.id === editGroupId);
      await updateDoc(doc(db, 'users', selectedStudent.uid), {
        displayName: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || `${editLogin.trim()}@student.uz`,
        groupId: editGroupId,
        departmentId: groupData?.departmentId || '',
        login: editLogin.trim(),
        password: editPassword.trim()
      });

      setIsEditModalOpen(false);
      setSelectedStudent(null);
      alert("Talaba ma'lumotlari yangilandi.");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Ma'lumotlarni saqlashda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (uid: string) => {
    if (!confirm("Talabani o'chirishni tasdiqlaysizmi?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'users', uid));
      alert("Talaba muvaffaqiyatli o'chirildi.");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Talaba o'chirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  // Filter students helper
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.login?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm);
    const matchesDept = !filterDept || s.departmentId === filterDept;
    const matchesGrp = !filterGrp || s.groupId === filterGrp;

    return matchesSearch && matchesDept && matchesGrp;
  });

  // Get filtered groups for group filter dropdown based on selected department
  const visibleGroupsForFilter = groups.filter((g) => {
    return !filterDept || g.departmentId === filterDept;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Talabalar boshqaruvi</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Talabalarni ro'yxatga olish, guruhlarga biriktirish va sozlamalarini boshqarish.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl border border-indigo-100 flex items-center gap-1.5 shadow-sm">
            <span>Talabalar limiti:</span>
            <span className={currentCount >= limit ? "text-red-600 font-extrabold" : "text-indigo-800"}>
              {currentCount} / {limit}
            </span>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all text-xs tracking-wider shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" /> TALABA YARATISH
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 items-center w-full">
          <div className="relative w-full md:w-80 flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-11 pr-5 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold text-gray-800"
              placeholder="Qidirish (Ism, login, telefon)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setFilterGrp("");
            }}
            className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-blue-600 w-full md:w-auto outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Barcha yo'nalishlar</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <select
            value={filterGrp}
            onChange={(e) => setFilterGrp(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-blue-600 w-full md:w-auto outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Barcha guruhlar</option>
            {visibleGroupsForFilter.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Data Table View */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold text-sm">
              Tizimda talabalar topilmadi.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                    №
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                    FISH (Talaba)
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase">
                    Tel raqami / Email
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                    Yo'nalish
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                    Guruh
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                    Login
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase">
                    Parol
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase whitespace-nowrap">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s, idx) => {
                  const grp = groups.find((g) => g.id === s.groupId);
                  const dept = departments.find((d) => d.id === s.departmentId);
                  return (
                    <tr key={s.uid} className="hover:bg-gray-50/30 transition-all">
                      <td className="px-6 py-4 font-bold text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 text-sm uppercase">
                        {s.displayName}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-500">
                        <div>{s.phone || "-"}</div>
                        <div className="text-gray-400 mt-0.5">{s.email || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-black uppercase">
                          {dept?.name || "Yo'nalishsiz"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-black uppercase whitespace-nowrap">
                          {grp?.name || "Guruhsiz"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-indigo-600 bg-indigo-50/50">
                        {s.login}
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-mono text-gray-400">
                        {s.password}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditClick(s)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Tahrirlash"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.uid)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Creation Modal Box */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-3xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-600" /> Talaba Yaratish
            </h3>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">F.I.SH (To'liq Ism)</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Aziz Rahimov"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Yo'nalish va Guruh</label>
                <select
                  required
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-sm transition-all"
                >
                  <option value="">Guruhni tanlang...</option>
                  {groups.map((g) => {
                    const dept = departments.find((d) => d.id === g.departmentId);
                    return (
                      <option key={g.id} value={g.id}>
                        {g.name} {dept ? `(${dept.name})` : ""}
                      </option>
                    );
                  })}
                </select>
                {groups.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-bold pl-1 mt-1">
                    * Sizda hali guruhlar yo'q. Iltimos, oldin Guruhlar sahifasida guruh yarating.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tel Raqami</label>
                  <input
                    type="text"
                    placeholder="+998901234567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email (Ixtiyoriy)</label>
                  <input
                    type="email"
                    placeholder="student@tizim.uz"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-blue-600 focus:bg-white outline-none font-bold text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Login (Avto: std_random)</label>
                  <input
                    type="text"
                    placeholder="Aziz_12"
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Parol (Avto: 123456)</label>
                  <input
                    type="text"
                    placeholder="kamida 6 ta belgi"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting || groups.length === 0}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Modal Box */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-3xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-indigo-600" /> Talabani Tahrirlash
            </h3>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">F.I.SH (To'liq Ism)</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Guruhni O'zgartirish</label>
                <select
                  required
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm"
                >
                  {groups.map((g) => {
                    const dept = departments.find((d) => d.id === g.departmentId);
                    return (
                      <option key={g.id} value={g.id}>
                        {g.name} {dept ? `(${dept.name})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tel Raqami</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Login</label>
                  <input
                    type="text"
                    required
                    value={editLogin}
                    onChange={(e) => setEditLogin(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Parol</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50 rounded-2xl border-2 border-gray-50 focus:border-indigo-600 focus:bg-white outline-none font-bold text-sm text-indigo-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
