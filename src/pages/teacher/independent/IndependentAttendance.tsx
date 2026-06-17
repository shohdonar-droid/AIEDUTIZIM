import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { Users, Calendar, Check, X, AlertTriangle, Save } from 'lucide-react';

export default function IndependentAttendance() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Attendance journal state: userId -> 'present' | 'absent' | 'late'
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  const loadInitialData = async () => {
    if (!user) return;
    try {
      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      const grps = grpSnap.docs.map(g => ({ id: g.id, ...g.data() }));
      setGroups(grps);
      if (grps.length > 0) {
        setSelectedGroupId(grps[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndAttendance = async () => {
    if (!selectedGroupId || !user) return;
    try {
      setLoading(true);
      // Fetch students in this group
      const studQ = query(
        collection(db, 'users'), 
        where('role', '==', 'student'), 
        where('groupId', '==', selectedGroupId), 
        where('teacherId', '==', user.uid)
      );
      const studSnap = await getDocs(studQ);
      const list = studSnap.docs.map(s => ({ id: s.id, ...s.data() }));
      setStudents(list);

      // Initialize all to present
      const initial: Record<string, 'present' | 'absent' | 'late'> = {};
      list.forEach(s => {
        initial[s.id] = 'present';
      });
      setAttendance(initial);

      // Load existing attendance if any
      const logQ = query(
        collection(db, 'attendance'),
        where('groupId', '==', selectedGroupId),
        where('date', '==', currentDate)
      );
      const logSnap = await getDocs(logQ);
      if (!logSnap.empty) {
        const docData = logSnap.docs[0].data();
        if (docData.records) {
          setAttendance(docData.records);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
      loadStudentsAndAttendance();
    }
  }, [selectedGroupId, currentDate]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = async () => {
    if (!selectedGroupId || students.length === 0) return;
    try {
      setSaving(true);
      
      const attendanceId = `${selectedGroupId}_${currentDate}`;
      const logRef = doc(db, 'attendance', attendanceId);

      await setDoc(logRef, {
        groupId: selectedGroupId,
        groupName: groups.find(g => g.id === selectedGroupId)?.name || 'Guruh',
        date: currentDate,
        records: attendance,
        teacherId: user?.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert("Bugungi davomat muvaffaqiyatli saqlandi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi.");
    } finally {
      setSaving(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Davomat jurnali</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Talabalarning darsgacha bo'lgan dars ishtiroki monitoringini yuritish.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={currentDate}
            onChange={e => setCurrentDate(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 font-medium">
          Davomat olish uchun dastlab guruh yaratishingiz lozim.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 max-w-xs">
            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Guruhni tanlang:</label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" /> Talabalar ({students.length})
              </h3>
              <p className="text-xs font-bold text-gray-400">{new Date(currentDate).toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Bu guruhda hali biron-bir talaba mavjud emas.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {students.map((student) => {
                  const status = attendance[student.id] || 'present';
                  return (
                    <div key={student.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {student.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{student.displayName}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">ID: {student.id.slice(0, 8)} | login: {student.login}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                            status === 'present' 
                              ? 'bg-green-50 text-green-700 border-green-500/30 font-black' 
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Check className="h-4 w-4" /> Hozir
                        </button>
                        
                        <button
                          onClick={() => handleStatusChange(student.id, 'late')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                            status === 'late' 
                              ? 'bg-amber-50 text-amber-700 border-amber-500/30 font-black' 
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" /> Kechikdi
                        </button>

                        <button
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                            status === 'absent' 
                              ? 'bg-red-50 text-red-700 border-red-500/30 font-black' 
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <X className="h-4 w-4" /> Yo'q
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {students.length > 0 && (
              <div className="p-6 border-t border-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all text-sm shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
