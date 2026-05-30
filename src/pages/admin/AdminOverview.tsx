import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { Users, BookOpen, Brain, Award, Loader2, Clock, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, courses: 0, tests: 0, certs: 0, teachers: 0, staff: 0, totalBalls: 0, spentBalls: 0 });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        const users = allUsersSnap.docs.map(d => d.data());
        
        const cSnap = await getDocs(collection(db, 'courses'));
        const tSnap = await getDocs(collection(db, 'tests'));
        const eSnap = await getDocs(query(collection(db, 'enrollments'), where('completed', '==', true)));

        let totalActiveBalls = 0;
        let totalSpentBalls = 0;

        users.forEach(data => {
          totalActiveBalls += (data.ball || 0);
          totalSpentBalls += (data.spentBalls || 0);
        });

        const studentsCount = users.filter(u => u.role === 'student').length;
        const teachersCount = users.filter(u => u.role === 'teacher').length;
        const staffCount = users.filter(u => u.role === 'staff').length;

        try {
          const logsSnap = await getDocs(query(collection(db, 'activityLogs'), orderBy('loginTime', 'desc'), limit(500)));
          setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch(e) {
          console.error("Error loading activity logs", e);
        }
        
        setStats({
          users: studentsCount,
          courses: cSnap.size,
          tests: tSnap.size,
          certs: eSnap.size,
          teachers: teachersCount,
          staff: staffCount,
          totalBalls: totalActiveBalls,
          spentBalls: totalSpentBalls
        });
      } catch (err: any) {
        if (err.message && err.message.includes('OperationType')) {
           // It's already handled/thrown by handleFirestoreError somewhere
           console.error("Stats loading error:", err);
        } else {
           handleFirestoreError(err, OperationType.LIST, 'admin-overview-stats');
        }
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Umumiy tizim holati</h1>
          <p className="text-gray-500 mt-2 text-lg">Platformaning asosiy ko'rsatkichlari va sozlamalari.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6">
        {[
          { label: 'Talabalar', value: stats.users, icon: Users, color: 'bg-blue-50 text-blue-600', path: '/admin/users' },
          { label: 'Tashkilotlar', value: stats.teachers, icon: LayoutDashboard, color: 'bg-cyan-50 text-cyan-600', path: '/admin/users' },
          { label: 'Xodimlar', value: stats.staff, icon: Users, color: 'bg-indigo-50 text-indigo-600', path: '/admin/users' },
          { label: 'Kurslar', value: stats.courses, icon: BookOpen, color: 'bg-purple-50 text-purple-600', path: '/admin/courses' },
          { label: 'Testlar', value: stats.tests, icon: Brain, color: 'bg-green-50 text-green-600', path: '/admin/tests' },
          { label: 'Sertifikatlar', value: stats.certs, icon: Award, color: 'bg-orange-50 text-orange-600', path: '/admin/certificates' },
        ].map((stat, i) => (
          <a href={stat.path} key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center text-center group cursor-pointer">
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stat.value.toLocaleString()}</h3>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm flex flex-col h-[400px]">
           <h3 className="text-xl font-black text-gray-900 mb-6 shrink-0">Oxirgi harakatlar</h3>
           <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-4">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="flex justify-between items-start border-b border-gray-50 pb-4">
                  <div>
                    <p className="font-bold text-gray-900">{log.userDisplayName || 'Foydalanuvchi'}</p>
                    <p className="text-xs text-gray-500 font-medium">Kirish: {new Date(log.loginTime).toLocaleString('uz-UZ')}</p>
                    {log.logoutTime ? (
                       <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                         <Clock className="w-3 h-3" /> Saytda bo'ldi: {log.durationMinutes} daqiqa (Chiqdi: {new Date(log.logoutTime).toLocaleTimeString('uz-UZ')})
                       </p>
                    ) : (
                       <p className="text-xs text-green-500 mt-1 font-bold">Hozir tizimda</p>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-bold ${log.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {log.role}
                  </span>
                </div>
              )) : (
                <p className="text-gray-500 italic text-sm">Hozircha harakatlar mavjud emas.</p>
              )}
           </div>
        </div>
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
           <h3 className="text-xl font-black text-gray-900 mb-6">Tizim holati</h3>
           <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                 <span className="font-bold text-gray-600">Database</span>
                 <span className="text-green-600 font-black text-xs uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full italic">Connected</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                 <span className="font-bold text-gray-600">AI Service (Gemini)</span>
                 <span className="text-green-600 font-black text-xs uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full italic">Active</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="font-bold text-gray-600">Storage</span>
                 <span className="text-green-600 font-black text-xs uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full italic">Healthy</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
