import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Layers, Users, GraduationCap, BookOpen, 
  FileText, Gamepad2, Clock, Award, ShieldAlert 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function IndependentOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    departments: 0,
    groups: 0,
    students: 0,
    subjects: 0,
    tests: 0,
    quizizz: 0,
    exams: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      try {
        const uid = user.uid;
        
        const [
          deptCount, groupCount, studentCount, subjectCount, 
          testCount, quizCount, examCount, certCount
        ] = await Promise.all([
          getCountFromServer(query(collection(db, 'departments'), where('teacherId', '==', uid))),
          getCountFromServer(query(collection(db, 'groups'), where('teacherId', '==', uid))),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', uid))),
          getCountFromServer(query(collection(db, 'subjects'), where('teacherId', '==', uid))),
          getCountFromServer(query(collection(db, 'tests'), where('teacherId', '==', uid), where('type', '==', 'topic'))),
          getCountFromServer(query(collection(db, 'quiz_history'), where('teacherId', '==', uid))),
          getCountFromServer(query(collection(db, 'tests'), where('teacherId', '==', uid), where('type', '==', 'exam'))),
          getCountFromServer(query(collection(db, 'enrollments'), where('completed', '==', true), where('teacherId', '==', uid)))
        ]);

        setStats({
          departments: deptCount.data().count || 0,
          groups: groupCount.data().count || 0,
          students: studentCount.data().count || 0,
          subjects: subjectCount.data().count || 0,
          tests: testCount.data().count || 0,
          quizizz: quizCount.data().count || 0,
          exams: examCount.data().count || 0,
          certificates: certCount.data().count || 0
        });
      } catch (err) {
        console.error("Error loading interactive stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const limits = [
    { title: "Yo'nalishlar", key: "departments", current: stats.departments, max: (user as any)?.limit_departments ?? 1, icon: Layers, color: "bg-blue-500" },
    { title: "Guruhlar", key: "groups", current: stats.groups, max: (user as any)?.limit_groups ?? 1, icon: Users, color: "bg-purple-500" },
    { title: "Talabalar", key: "students", current: stats.students, max: (user as any)?.limit_students ?? 5, icon: GraduationCap, color: "bg-green-500" },
    { title: "Mavzular", key: "subjects", current: stats.subjects, max: (user as any)?.limit_subjects ?? 2, icon: BookOpen, color: "bg-amber-500" },
    { title: "Testlar", key: "tests", current: stats.tests, max: (user as any)?.limit_tests ?? 2, icon: FileText, color: "bg-red-500" },
    { title: "Quizizz", key: "quizizz", current: stats.quizizz, max: (user as any)?.limit_quizizz ?? 1, icon: Gamepad2, color: "bg-pink-500" },
    { title: "Imtihonlar", key: "exams", current: stats.exams, max: (user as any)?.limit_exams ?? 1, icon: Clock, color: "bg-cyan-500" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
          Assalomu alaykum, {user?.displayName}!
        </h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Mustaqil O'qituvchi boshqaruv paneliga xush kelibsiz. Resurslaringiz va limitlaringiz holati.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {limits.map((lim, idx) => {
          const Icon = lim.icon;
          const pct = Math.min(100, Math.round((lim.current / lim.max) * 100)) || 0;
          const remaining = Math.max(0, lim.max - lim.current);
          return (
            <motion.div 
              key={lim.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-2xl ${lim.color} bg-opacity-10 text-${lim.color.split('-')[1]}-600`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-gray-400">Limit: {lim.current} / {lim.max}</span>
              </div>
              
              <div>
                <p className="text-3xl font-black text-gray-900">{lim.current}</p>
                <p className="text-xs font-bold text-gray-500 mt-0.5">{lim.title}</p>
              </div>

              <div className="mt-4 space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${lim.color} transition-all`} style={{ width: `${pct}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-black text-gray-400">
                  <span>Isloh: {pct}%</span>
                  <span>Qolgan: {remaining}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-6 bg-blue-50 border border-blue-100/50 rounded-3xl flex gap-4 items-start">
        <ShieldAlert className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-blue-900 text-sm">Limitlar haqida eslatma</h3>
          <p className="text-blue-700 text-xs mt-1 leading-relaxed">
            Sizda hozirda bepul mustaqil o'qituvchi limitlari faol. Limitlaringiz yetmay qolsa, <strong className="font-semibold">Limitlar</strong> menyusidan qo'shimcha limit sotib olishingiz mumkin. Barcha so'rovlaringiz to'lov tasdiqlangandan so'ng faollashtiriladi.
          </p>
        </div>
      </div>
    </div>
  );
}
