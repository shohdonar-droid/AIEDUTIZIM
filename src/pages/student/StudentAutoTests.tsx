import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { useAuth } from '../../hooks/useAuth';
import { Award, PlayCircle, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentAutoTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'auto_tests'));

    const unsubscribe = safeOnSnapshot(q, (snap) => {
      const allTests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter tests for this student based on academic structure (supporting both single values and multiple arrays)
      const filtered = allTests.filter((test: any) => {
        // 1. Group check
        const hasGroupArray = Array.isArray(test.groupIds) && test.groupIds.length > 0;
        const matchesGroupArray = hasGroupArray && test.groupIds.includes(user.groupId);
        const matchesGroupSingle = test.groupId && test.groupId === user.groupId;

        if (hasGroupArray || test.groupId) {
          return matchesGroupArray || matchesGroupSingle;
        }

        // 2. Department check
        const hasDeptArray = Array.isArray(test.departmentIds) && test.departmentIds.length > 0;
        const matchesDeptArray = hasDeptArray && test.departmentIds.includes(user.departmentId);
        const matchesDeptSingle = test.departmentId && test.departmentId === user.departmentId;

        if (hasDeptArray || test.departmentId) {
          return matchesDeptArray || matchesDeptSingle;
        }

        // 3. Faculty check
        const hasFacultyArray = Array.isArray(test.facultyIds) && test.facultyIds.length > 0;
        const matchesFacultyArray = hasFacultyArray && test.facultyIds.includes(user.facultyId);
        const matchesFacultySingle = test.facultyId && test.facultyId === user.facultyId;

        if (hasFacultyArray || test.facultyId) {
          return matchesFacultyArray || matchesFacultySingle;
        }

        // 4. Teacher/Organization general check
        if (test.teacherId) {
          return test.teacherId === user.teacherId;
        }

        return false;
      });

      setTests(filtered);
      setLoading(false);
    }, (err) => {
      console.error("Error loading auto tests:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Avto Testlar
          <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />
        </h1>
        <p className="text-gray-500 mt-1 font-medium">Sizning guruhingiz ({user?.groupName || 'Noaniq'}) uchun maxsus tayyorlangan, tezkor natijali testlar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => {
          return (
            <div key={test.id} className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col group hover:shadow-2xl hover:shadow-blue-50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">{test.title}</h3>
              
              <div className="mb-8 space-y-2">
                <p className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold w-fit">
                  {test.questions?.length || 0} ta Savol
                </p>
                <p className="text-xs text-gray-400 font-bold">
                  Yaratuvchi: {test.creatorName || 'O\'qituvchi'}
                </p>
              </div>

              <div className="mt-auto">
                <Link
                  to={`/auto-tests/${test.id}`}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-blue-100"
                >
                  <PlayCircle className="h-5 w-5" />
                  Boshlash
                </Link>
              </div>
            </div>
          );
        })}

        {tests.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-gray-100 p-8">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Award className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Hozircha sizning guruhingiz uchun avto testlar mavjud emas.</p>
            <p className="text-xs text-gray-400 mt-1">O'qituvchingiz tomonidan test biriktirilganda bu yerda paydo bo'ladi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
