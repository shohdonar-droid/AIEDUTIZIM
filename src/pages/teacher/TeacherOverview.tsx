import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getCountFromServer, getDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, Users, Folder, LayoutGrid, FileText, Award, Activity, Bell } from 'lucide-react';

export default function TeacherOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    departments: 0,
    groups: 0,
    students: 0,
    tests: 0,
    courses: 0,
    certificates: 0
  });
  const [notificationMsg, setNotificationMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      // Use cached stats if available and fresh (e.g. within last 15 minutes)
      const cachedTime = localStorage.getItem(`teacher_stats_time_${user?.uid}`);
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
      
      if (cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
        const cached = localStorage.getItem(`teacher_stats_${user?.uid}`);
        if (cached) {
          setStats(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }

      try {
        const orgId = user?.role === 'staff' ? user.teacherId : user?.uid;
        if (!orgId) return;

        const [
          deptCount, groupCount, studentCount, testCount, courseCount, certCount
        ] = await Promise.all([
          getCountFromServer(query(collection(db, 'departments'), where('teacherId', '==', orgId))).catch(e => handleFirestoreError(e, OperationType.LIST, 'departments count')),
          getCountFromServer(query(collection(db, 'groups'), where('teacherId', '==', orgId))).catch(e => handleFirestoreError(e, OperationType.LIST, 'groups count')),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', orgId))).catch(e => handleFirestoreError(e, OperationType.LIST, 'students count')),
          getCountFromServer(query(collection(db, 'tests'), where('teacherId', '==', orgId))).catch(e => handleFirestoreError(e, OperationType.LIST, 'tests count')),
          getCountFromServer(query(collection(db, 'courses'), where('teacherId', '==', orgId))).catch(e => handleFirestoreError(e, OperationType.LIST, 'courses count')),
          getCountFromServer(query(collection(db, 'enrollments'), where('completed', '==', true), where('teacherId', '==', orgId))).catch(e => handleFirestoreError(e, OperationType.LIST, 'certs count')),
        ] as any[]);

        const newStats = {
          departments: deptCount?.data?.().count || 0,
          groups: groupCount?.data?.().count || 0,
          students: studentCount?.data?.().count || 0,
          tests: testCount?.data?.().count || 0,
          courses: courseCount?.data?.().count || 0,
          certificates: certCount?.data?.().count || 0,
        };

        setStats(newStats);
        localStorage.setItem(`teacher_stats_${user?.uid}`, JSON.stringify(newStats));
        localStorage.setItem(`teacher_stats_time_${user?.uid}`, Date.now().toString());

        const notifDoc = await getDoc(doc(db, 'siteContent', 'notifications'));
        if (notifDoc.exists()) {
          setNotificationMsg(notifDoc.data().contactMessage || notifDoc.data().insufficientFundsMessage || "Tizim normal ishlamoqda.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 p-1">
      <header>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Umumiy ma'lumotlar</h1>
        <p className="text-gray-500 mt-2 text-sm font-medium">Platforma ko'rsatkichlari va tizim holati</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <Folder className="h-8 w-8 text-blue-500 mb-2" />
          <p className="text-3xl font-black text-gray-900">{stats.departments}</p>
          <p className="text-xs uppercase font-bold text-gray-400 mt-1">Yo'nalishlar</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <LayoutGrid className="h-8 w-8 text-purple-500 mb-2" />
          <p className="text-3xl font-black text-gray-900">{stats.groups}</p>
          <p className="text-xs uppercase font-bold text-gray-400 mt-1">Guruhlar</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <Users className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-3xl font-black text-gray-900">{stats.students}</p>
          <p className="text-xs uppercase font-bold text-gray-400 mt-1">Talabalar</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <FileText className="h-8 w-8 text-orange-500 mb-2" />
          <p className="text-3xl font-black text-gray-900">{stats.tests}</p>
          <p className="text-xs uppercase font-bold text-gray-400 mt-1">Testlar</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <BookOpen className="h-8 w-8 text-indigo-500 mb-2" />
          <p className="text-3xl font-black text-gray-900">{stats.courses}</p>
          <p className="text-xs uppercase font-bold text-gray-400 mt-1">Kurslar</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <Award className="h-8 w-8 text-yellow-500 mb-2" />
          <p className="text-3xl font-black text-gray-900">{stats.certificates}</p>
          <p className="text-xs uppercase font-bold text-gray-400 mt-1">Sertifikatlar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-bold text-gray-900">Tizim holati</h3>
          </div>
          <p className="text-gray-600 leading-relaxed font-medium flex-1">
            Tizim barqaror ishlamoqda. Xizmatlar tezligi: 99.9%. Barcha imkoniyatlardan cheklovlarsiz foydalanishingiz mumkin.
          </p>
        </div>

        <div className="p-8 bg-indigo-600 rounded-3xl border border-indigo-500 shadow-xl flex flex-col text-white">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-6 w-6 text-indigo-200" />
            <h3 className="text-xl font-bold text-white">Admindan xabar</h3>
          </div>
          <p className="text-indigo-100 leading-relaxed font-medium flex-1">
            {notificationMsg || "Hozircha xabarlar yo'q."}
          </p>
        </div>
      </div>
    </div>
  );
}
