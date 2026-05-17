import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Test } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Award, PlayCircle, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'tests'),
      where('isPublished', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allTests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));

      // Filter by user department and group
      const filtered = allTests.filter(t => {
        const isAdminTest = t.creatorRole === 'admin' || !t.creatorRole;
        const isGlobalAdminTest = isAdminTest && 
                                 (!t.organizationIds || t.organizationIds.length === 0) &&
                                 (!t.departmentIds || t.departmentIds.length === 0) &&
                                 (!t.groupIds || t.groupIds.length === 0);
        
        if (isGlobalAdminTest) return true;

        const hasGroupFilter = (t.groupIds?.length || 0) > 0;
        const hasDeptFilter = (t.departmentIds?.length || 0) > 0;
        const hasOrgFilter = (t.organizationIds?.length || 0) > 0;

        // If specific groups are set, student MUST be in one of them
        if (hasGroupFilter) {
          return t.groupIds?.includes(user.groupId || '') || false;
        }
        
        // If no group but specific departments are set
        if (hasDeptFilter) {
          return t.departmentIds?.includes(user.departmentId || '') || false;
        }

        // If no group/dept but specific organizations are set
        if (hasOrgFilter) {
          return t.organizationIds?.includes(user.teacherId || '') || false;
        }

        // Fallback for older tests or tests with no filters but created by the user's teacher
        if (t.creatorId === user.teacherId || t.teacherId === user.teacherId) return true;

        return false;
      });

      // Sort by creation down
      filtered.sort((a: any, b: any) => {
        const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return t2 - t1;
      });

      setTests(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Testlar va Imtihonlar</h1>
          <p className="text-gray-500 mt-1">Sizning yo'nalishingiz va guruhingizga tegishli testlar</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => {
           return (
            <div key={test.id} className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col group hover:shadow-2xl hover:shadow-blue-50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                {test.type === 'exam' ? <Clock className="w-7 h-7" /> : <Award className="w-7 h-7" />}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">{test.title}</h3>
              
              <div className="mb-8 space-y-2">
                 <p className="text-sm font-medium text-gray-500">
                   {test.type === 'topic' ? 'Mavzuli Test' : 'Imtihon'}
                 </p>
                 <p className="text-xs font-bold text-gray-400">
                    {(!test.departmentIds && (!test.departmentId || test.departmentId === 'all')) || (test.departmentIds && test.departmentIds.length === 0) ? 'Barcha uchun umumiy' : `Maxsus test`}
                 </p>
              </div>

              <div className="mt-auto">
                <Link
                  to={`/tests/${test.id}`}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                >
                  <PlayCircle className="h-5 w-5" />
                  Boshlash
                </Link>
              </div>
            </div>
           );
        })}

        {tests.length === 0 && (
          <div className="col-span-full py-20 text-center">
             <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
               <Award className="w-10 h-10 text-gray-300" />
             </div>
             <p className="text-gray-500 font-medium">Hozircha sizga biriktirilgan testlar yo'q.</p>
          </div>
        )}
      </div>
    </div>
  );
}
