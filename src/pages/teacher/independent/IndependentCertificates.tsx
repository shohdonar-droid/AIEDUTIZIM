import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { Award, Plus, Trash2, Layers, Users, User, ArrowDownCircle, AlertCircle } from 'lucide-react';

export default function IndependentCertificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState(''); // e.g. Web dasturlash kursi sertifikati

  const [currentCount, setCurrentCount] = useState(0);
  const limit = (user as any)?.limit_certificates ?? 5;

  const loadData = async () => {
    if (!user) return;
    try {
      const deptQ = query(collection(db, 'departments'), where('teacherId', '==', user.uid));
      const deptSnap = await getDocs(deptQ);
      setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      setGroups(grpSnap.docs.map(g => ({ id: g.id, ...g.data() })));

      const studQ = query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', user.uid));
      const studSnap = await getDocs(studQ);
      setStudents(studSnap.docs.map(s => ({ id: s.id, ...s.data() })));

      const certQ = query(collection(db, 'enrollments'), where('teacherId', '==', user.uid), where('completed', '==', true));
      const certSnap = await getDocs(certQ);
      const list = certSnap.docs.map(c => ({ id: c.id, ...c.data() }));
      setCerts(list);
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

  const generateCertId = () => {
    return 'CERT-' + Math.floor(Math.random() * 900000 + 100000);
  };

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedGroupId || !selectedStudentId || !title.trim() || !user) return;

    try {
      setLoading(true);
      const studentData = students.find(s => s.id === selectedStudentId);
      const certId = generateCertId();

      await addDoc(collection(db, 'enrollments'), {
        completed: true,
        userId: selectedStudentId,
        studentName: studentData?.displayName || 'Talaba',
        courseName: title.trim(),
        title: title.trim(),
        certificateId: certId,
        teacherId: user.uid,
        departmentId: selectedDeptId,
        groupId: selectedGroupId,
        createdAt: serverTimestamp()
      });

      setSelectedDeptId('');
      setSelectedGroupId('');
      setSelectedStudentId('');
      setTitle('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu sertifikatni bekor qilishni xohlaysizmi?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'enrollments', id));
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && certs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Sertifikatlar</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Muvaffaqiyatli bitirgan o'quvchilarni rasmiy sertifikatlar bilan taqdirlash.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Sertifikat berish</h3>

          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Sertifikatlar limiti:</span>
            <span className={`${currentCount >= limit ? 'text-red-500' : 'text-blue-600'}`}>{currentCount} / {limit}</span>
          </div>

          <form onSubmit={handleAward} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Yo'nalish (Majburiy)</label>
              <select
                required
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tanlang...</option>
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
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tanlang...</option>
                {groups.filter(g => g.departmentId === selectedDeptId).map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Talaba (Majburiy)</label>
              <select
                required
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tanlang...</option>
                {students.filter(s => s.groupId === selectedGroupId).map(s => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Kurs yoki Fan nomi (Sertifikat sarlavhasi)</label>
              <input
                type="text"
                required
                placeholder="Masalan: Web Dasturlash Asoslari"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || currentCount >= limit || students.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Sertifikat yaratish
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Taqdim etilgan sertifikatlar ({certs.length})</h3>
            </div>

            {certs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Sizda hali hech qanday taqdim etilgan sertifikatlar mavjud emas.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {certs.map((cert) => {
                  const s = students.find(user => user.id === cert.userId);
                  const grp = groups.find(g => g.id === cert.groupId);
                  const dept = departments.find(d => d.id === cert.departmentId);
                  return (
                    <div key={cert.id} className="p-6 hover:bg-gray-50/50 transition-all flex justify-between items-center">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{cert.title || cert.courseName}</p>
                            <p className="text-[10px] text-gray-400 font-bold">Talaba: <strong className="text-gray-700">{s?.displayName || cert.studentName || 'Nomalum'}</strong></p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            ID: {cert.certificateId}
                          </span>
                          {dept && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                              {dept.name}
                            </span>
                          )}
                          {grp && (
                            <span className="bg-purple-15 bg-opacity-10 text-purple-600 px-2 py-0.5 rounded-full">
                              {grp.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(cert.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
