import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Test } from '../types';
import { BrainCircuit, Search, Play, Loader2, Sparkles, Clock, Target, Calendar, Globe, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Tests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc')));
      setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test)));
      setLoading(false);
    }
    load();
  }, []);

  const filteredTests = tests.filter(t => {
    // Basic search
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    // RULE: On the general list, only show content created by ADMIN
    const isAdminTest = t.creatorRole === 'admin' || !t.creatorRole;
    const isGlobalAdminTest = isAdminTest && 
                             (!t.organizationIds || t.organizationIds.length === 0) &&
                             (!t.departmentIds || t.departmentIds.length === 0) &&
                             (!t.groupIds || t.groupIds.length === 0);

    if (!user) {
      return isGlobalAdminTest && t.isPublished !== false;
    }

    if (user.role === 'admin') {
      return isAdminTest;
    }

    // 2. Students see Admin content + their own organization's content
    if (user.role === 'student') {
       // Admin content
       if (isGlobalAdminTest) return true;

       // Organization content
       const isFromMyOrg = t.organizationIds?.includes(user.teacherId || '') || t.creatorId === user.teacherId;
       const isFromMyDept = t.departmentIds?.includes(user.departmentId || '');
       const isFromMyGroup = t.groupIds?.includes(user.groupId || '');

       if (isFromMyOrg || isFromMyDept || isFromMyGroup) return true;
    }

    // 3. Teachers/Organizations see their own tests
    if (user.role === 'teacher' && t.creatorId === user.uid) return true;

    return false;
  });

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="py-24 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Modern Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <header className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 text-blue-700 text-sm font-bold mb-6 border border-blue-200">
              <Sparkles className="h-4 w-4" /> 
              Avtomatlashtirilgan Testlar
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4">
              Bilimni Sinash
            </h1>
            <p className="text-gray-500 text-xl font-medium leading-relaxed">
              Mavzuli testlar orqali o'z bilimlaringizni real vaqtda tekshirib ko'ring. O'zlashtirish darajangizni oshiring.
            </p>
          </header>

          {/* Search bar */}
          <div className="w-full md:w-96 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Testni qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-900 font-medium transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Tests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <div 
              key={test.id} 
              className="bg-white rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group border border-gray-100 flex flex-col h-full relative overflow-hidden"
            >
               {/* Decorative background circle */}
               <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-50" />
               
               <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10 shadow-sm">
                  <BrainCircuit className="h-8 w-8" />
               </div>
               
               <h3 className="text-2xl font-black text-gray-900 mb-4 line-clamp-2 relative z-10 leading-tight">
                 {test.title}
               </h3>
               
               <div className="space-y-3 mb-10 flex-1 relative z-10">
                 <div className="flex items-center gap-3 text-gray-500 font-medium text-sm">
                   <Target className="h-4 w-4 text-blue-500" />
                   <span>{test.type === 'topic' ? 'Mavzuli Test' : 'Keng qamrovli'}</span>
                 </div>
                 <div className="flex items-center gap-3 text-gray-500 font-medium text-sm">
                   <Clock className="h-4 w-4 text-blue-500" />
                   <span>{test.questions?.length || 0} ta savol</span>
                 </div>
                 {test.createdAt && 'seconds' in test.createdAt && (
                   <div className="flex items-center gap-3 text-gray-500 font-medium text-sm">
                     <Calendar className="h-4 w-4 text-blue-500" />
                     <span>{new Date(test.createdAt.seconds * 1000).toLocaleDateString('uz-UZ')}</span>
                   </div>
                 )}
               </div>

               <button 
                 onClick={() => navigate(`/tests/${test.id}`)} 
                 className="w-full relative z-10 flex items-center justify-between px-6 py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all shadow-sm group-hover:shadow-blue-200"
               >
                 <span>Testni boshlash</span>
                 <Play className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          ))}
          
          {filteredTests.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white/50 backdrop-blur-sm rounded-[3rem] border border-gray-200 border-dashed">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                 <Search className="h-10 w-10 text-gray-400" />
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">Testlar topilmadi</h3>
               <p className="text-gray-500 font-medium max-w-md">Qidiruv so'ziga mos keladigan test mavjud emas. Boshqa so'z bilan izlab ko'ring.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
