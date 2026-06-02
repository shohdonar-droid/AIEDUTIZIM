import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { Enrollment, Course } from '../../types';
import { Trophy, Clock, BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentGrades() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<(Enrollment & { courseTitle?: string })[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'tests'>('courses');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'enrollments'), where('userId', '==', user.uid));
    
    // Subscribe to enrollments
    const unsubE = safeOnSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
      
      const enriched = await Promise.all(data.map(async (en) => {
        let courseTitle = 'Kurs';
        try {
          const courseSnap = await getDoc(doc(db, 'courses', en.courseId));
          if (courseSnap.exists()) {
            courseTitle = courseSnap.data().title;
          }
        } catch(e) {}
        return { ...en, courseTitle };
      }));
      setEnrollments(enriched);
    }, (err) => console.error(err));

    // Fetch test results
    const qT = query(collection(db, 'testResults'), where('userId', '==', user.uid));
    const unsubT = safeOnSnapshot(qT, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort desc by time
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTestResults(data);
    }, (err) => console.error(err));

    return () => { unsubE(); unsubT(); };
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">O'zlashtirish jurnali</h1>
          <p className="text-gray-500 mt-1">Barcha kurslar va testlar bo'yicha baholaringiz.</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'courses' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Kurslar
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'tests' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Testlar
          </button>
        </div>
      </header>

      {activeTab === 'courses' && (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {enrollments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest border-b">
                  <th className="px-6 py-4">№</th>
                  <th className="px-6 py-4">Kurs nomi</th>
                  <th className="px-6 py-4 text-center">Modul 1</th>
                  <th className="px-6 py-4 text-center">Modul 2</th>
                  <th className="px-6 py-4 text-center">Modul 3</th>
                  <th className="px-6 py-4 text-center">Modul 4</th>
                  <th className="px-6 py-4 text-center">Yakuniy</th>
                  <th className="px-6 py-4 text-center">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enrollments.map((en, i) => {
                  return (
                    <tr key={en.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-400">{i + 1}</td>
                      <td className="px-6 py-4 font-black">{en.courseTitle}</td>
                      {[0, 1, 2, 3, 4].map((mIdx) => {
                        const score = en.grades?.[mIdx === 4 ? "m5" : `m${mIdx + 1}`] || en.grades?.[mIdx];
                        return (
                          <td key={mIdx} className="px-6 py-4 text-center font-bold">
                            <span className={score !== undefined ? (score >= 60 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}>
                              {score !== undefined ? `${score}%` : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center">
                        {en.completed ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">Tugallangan</span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">O'qilmoqda</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Siz hali birorta kursga a'zo emassiz</h3>
          </div>
        )}
      </div>
      )}

      {activeTab === 'tests' && (
      <div className="grid grid-cols-1 gap-6">
        {testResults.length > 0 ? (
           <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest border-b">
                   <th className="px-6 py-4">Sana</th>
                   <th className="px-6 py-4">Test mavzusi</th>
                   <th className="px-6 py-4 text-center">Natija</th>
                   <th className="px-6 py-4 text-center">Foiz</th>
                   <th className="px-6 py-4 text-center">Xulosa</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {testResults.map((r) => {
                   const correctCount = r.correctAnswers !== undefined ? r.correctAnswers : Math.round((r.score / 100) * r.totalQuestions);
                   const pct = r.score;
                   return (
                     <tr key={r.id} className="hover:bg-gray-50/50">
                       <td className="px-6 py-4 text-sm font-bold text-gray-500">
                         {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '-'}
                       </td>
                       <td className="px-6 py-4 font-black">{r.testTitle}</td>
                       <td className="px-6 py-4 text-center font-bold text-indigo-600 bg-indigo-50/30">
                         {correctCount}/{r.totalQuestions}
                       </td>
                       <td className="px-6 py-4 text-center font-black">
                         {pct}%
                       </td>
                       <td className="px-6 py-4 text-center">
                          {pct >= 60 ? (
                             <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest">O'tdi</span>
                          ) : (
                             <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest">Yiqildi</span>
                          )}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Siz hali test yechmadingiz</h3>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
