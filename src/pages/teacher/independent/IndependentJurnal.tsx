import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { GraduationCap, Award, BookOpen, Clock, Activity, BarChart2 } from 'lucide-react';

export default function IndependentJurnal() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active student in the sidebar
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch groups
      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      const grps = grpSnap.docs.map(g => ({ id: g.id, ...g.data() }));
      setGroups(grps);
      if (grps.length > 0) {
        setSelectedGroupId(grps[0].id);
      }

      // 2. Fetch test results
      const resQ = query(collection(db, 'testResults'), where('teacherId', '==', user.uid));
      const resSnap = await getDocs(resQ);
      setTestResults(resSnap.docs.map(r => ({ id: r.id, ...r.data() })));

      // 3. Fetch attendance logs
      const attQ = query(collection(db, 'attendance'), where('teacherId', '==', user.uid));
      const attSnap = await getDocs(attQ);
      setAttendanceLogs(attSnap.docs.map(a => ({ id: a.id, ...a.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedGroupId || !user) return;
    try {
      setLoading(true);
      const studQ = query(
        collection(db, 'users'), 
        where('role', '==', 'student'), 
        where('groupId', '==', selectedGroupId),
        where('teacherId', '==', user.uid)
      );
      const studSnap = await getDocs(studQ);
      const list = studSnap.docs.map(s => ({ id: s.id, ...s.data() }));
      setStudents(list);
      if (list.length > 0) {
        setSelectedStudentId(list[0].id);
      } else {
        setSelectedStudentId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
      loadStudents();
    }
  }, [selectedGroupId]);

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Compute student-specific metrics
  const getStudentMetrics = (studentId: string) => {
    const studentTests = testResults.filter(r => r.userId === studentId);
    
    // Topic tests vs Exam tests
    const topicTests = studentTests.filter(t => t.testType === 'topic' || !t.testType);
    const examTests = studentTests.filter(t => t.testType === 'exam');

    const avgTopicScore = topicTests.length > 0 
      ? Math.round(topicTests.reduce((acc, current) => acc + (current.score || 0), 0) / topicTests.length) 
      : 0;

    // Attendance stats
    let totalClasses = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    attendanceLogs.forEach(log => {
      if (log.records && log.records[studentId]) {
        totalClasses++;
        const stat = log.records[studentId];
        if (stat === 'present') presentCount++;
        else if (stat === 'absent') absentCount++;
        else if (stat === 'late') lateCount++;
      }
    });

    const attendancePct = totalClasses > 0 
      ? Math.round(((presentCount + lateCount) / totalClasses) * 100) 
      : 100;

    return {
      topicTestsCount: topicTests.length,
      avgTopicScore,
      examTests,
      totalClasses,
      presentCount,
      absentCount,
      lateCount,
      attendancePct
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Elektron Jurnal</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Guruh talabalarining darslardagi jami ko'rsatkichlari, natijalari hamda to'liq hisoboti.
        </p>
      </div>

      <div className="flex items-center gap-2 max-w-xs">
        <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Guruh:</label>
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

      {students.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 font-medium">
          Tanlangan guruhda talabalar mavjud emas. Elektron jurnaldan foydalanish uchun biror student qo'shing.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Students Sidebar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit divide-y divide-gray-50">
            <div className="p-4 bg-gray-50 text-xs font-bold text-gray-500">
              TALABALAR RO'YXATI
            </div>
            {students.map((student) => {
              const metrics = getStudentMetrics(student.id);
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full p-4 text-left flex justify-between items-center transition-all ${
                    selectedStudentId === student.id ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${selectedStudentId === student.id ? 'text-blue-900' : 'text-gray-900'}`}>
                      {student.displayName}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">login: {student.login}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-gray-800">{metrics.attendancePct}% davomat</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Student details stats area */}
          <div className="lg:col-span-2 space-y-6">
            {activeStudent ? (
              (() => {
                const metrics = getStudentMetrics(activeStudent.id);
                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-6 bg-white rounded-3xl border border-gray-150 shadow-sm">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                        {activeStudent.displayName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{activeStudent.displayName}</h3>
                        <p className="text-xs text-gray-400 font-medium">Elektron hisobot varaqasi</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <BookOpen className="h-5 w-5 text-blue-600 mb-2" />
                        <div>
                          <p className="text-2xl font-black text-gray-900">{metrics.topicTestsCount}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Topshirilgan testlar</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <Award className="h-5 w-5 text-amber-500 mb-2" />
                        <div>
                          <p className="text-2xl font-black text-gray-900">{metrics.avgTopicScore}%</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Mavzu testlari o'rtacha</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <Activity className="h-5 w-5 text-green-500 mb-2" />
                        <div>
                          <p className="text-2xl font-black text-gray-900">{metrics.attendancePct}%</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dars qatnashishi</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <Clock className="h-5 w-5 text-purple-500 mb-2" />
                        <div>
                          <p className="text-2xl font-black text-gray-900">{metrics.totalClasses}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Jami dars kunlari</p>
                        </div>
                      </div>
                    </div>

                    {/* Exams grid details */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                      <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-blue-600" /> Rasmiy Imtihon Natijalari
                      </h4>

                      {metrics.examTests.length === 0 ? (
                        <p className="text-xs text-gray-400 font-medium py-3 text-center">Ushbu talaba hozircha rasmiy imtihon topshirmagan.</p>
                      ) : (
                        <div className="space-y-3">
                          {metrics.examTests.map((e: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                              <div>
                                <p className="text-xs font-black text-gray-900">{e.examTitle || e.title || "Yakuniy Nazorat"}</p>
                                <p className="text-[10px] text-gray-400 font-bold">Topshirilgan vaqt: {new Date(e.createdAt?.toMillis ? e.createdAt.toMillis() : e.createdAt).toLocaleDateString()}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-xl text-xs font-bold ${e.score >= 55 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {e.score} ball ({e.score >= 55 ? 'Otdi' : 'Yiqildi'})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attendance breakdown cards */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                      <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-blue-600" /> Davomat Tafsiloti
                      </h4>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-gray-500">
                        <div className="p-3 bg-green-50 rounded-2xl">
                          <p className="text-lg font-black text-green-700">{metrics.presentCount} marta</p>
                          <span>Hozir</span>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-2xl">
                          <p className="text-lg font-black text-amber-700">{metrics.lateCount} marta</p>
                          <span>Kechikdi</span>
                        </div>
                        <div className="p-3 bg-red-50 rounded-2xl">
                          <p className="text-lg font-black text-red-700">{metrics.absentCount} marta</p>
                          <span>Kelmagan</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-12 text-center text-gray-400 font-medium">
                Hisobotni yuklash uchun chap tarafdan talabani bosing.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
