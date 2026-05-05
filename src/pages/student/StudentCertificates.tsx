import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Enrollment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Award, ShieldCheck, Star, Loader2, Eye, Download } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import CertificateViewer from '../../components/CertificateViewer';

export default function StudentCertificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<(Enrollment & { courseTitle?: string })[]>([]);
  const [subjectCerts, setSubjectCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'subjects'>('courses');
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [selectedCert, setSelectedCert] = useState<(Enrollment & { courseTitle?: string, studentName?: string }) | null>(null);

  useEffect(() => {
    async function loadCourses() {
       const cSnap = await getDocs(collection(db, 'courses'));
       const cMap: Record<string, string> = {};
       cSnap.forEach(d => cMap[d.id] = d.data().title);
       setCourses(cMap);
    }
    loadCourses();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'enrollments'), where('userId', '==', user.uid), where('completed', '==', true));
    const unsubCourse = onSnapshot(q, (snap) => {
      setCerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment)));
      setLoading(false);
    }, (err) => console.error(err));
    
    // subject certs
    const qSub = query(collection(db, 'testResults'), where('userId', '==', user.uid), where('testType', '==', 'subject'));
    const unsubSub = onSnapshot(qSub, (snap) => {
      const allSubResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter >= 90%
      const passed = allSubResults.filter((r: any) => r.score >= 90);
      setSubjectCerts(passed);
    }, (err) => console.error(err));

    return () => { unsubCourse(); unsubSub(); };
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const getFullName = () => {
    return user?.displayName || "Talaba";
  };

  const renderCertificates = (list: any[], isSubject: boolean) => {
    if (list.length === 0) {
      return (
        <div className="col-span-full py-32 bg-white rounded-[40px] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
           <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
              <Award className="h-10 w-10 text-gray-200" />
           </div>
           <h3 className="text-xl font-bold text-gray-900">Sertifikatlar hali mavjud emas</h3>
           <p className="text-gray-400 mt-2 max-w-sm">
             {isSubject 
               ? "Fanlardan testlarda 90% yoki undan yuqori natija ko'rsating va sertifikatga ega bo'ling." 
               : "Kurslarni 100% yakunlash va final testda kamida 70% to'plash orqali sertifikatga ega bo'ling."}
           </p>
        </div>
      );
    }
    
    return list.map((c) => {
      const rawTitle = isSubject ? c.testTitle : (courses[c.courseId] || 'Kurs');
      const title = typeof rawTitle === 'string' ? rawTitle.replace(' (Fanlar/Mavzu)', '') : rawTitle;
      return (
        <div key={c.id} className="relative bg-white rounded-[40px] p-10 border-2 border-blue-50 shadow-xl shadow-blue-50/50 flex flex-col group overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/5 rounded-full -ml-12 -mb-12" />

           <div className="flex justify-between items-start mb-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
                <Award className="h-8 w-8" />
              </div>
              <div className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ring-1 ring-green-100">
                <ShieldCheck className="h-3 w-3" /> Tasdiqlangan
              </div>
           </div>

           <div className="space-y-4 relative z-10">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">
                {isSubject ? "Fan/Mavzu Sertifikati" : "O'quv Sertifikati"}
              </p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">{title}</h3>
              {isSubject && <p className="text-xl font-bold text-blue-600">Natija: {c.score}%</p>}
              <div className="flex items-center gap-1.5 pt-2">
                 {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />)}
              </div>
           </div>

           <div className="flex gap-4 mt-10 relative z-10">
              <button 
                onClick={() => setSelectedCert({...c, isSubjectItem: isSubject, lastAccessed: c.createdAt || c.lastAccessed, courseTitle: title, studentName: getFullName()})}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl active:scale-95 group/btn"
              >
                 <Eye className="h-5 w-5" />
                 KO'RISH
              </button>
              <button 
                onClick={() => setSelectedCert({...c, isSubjectItem: isSubject, lastAccessed: c.createdAt || c.lastAccessed, courseTitle: title, studentName: getFullName(), autoDownload: true} as any)}
                className="w-16 flex items-center justify-center bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl active:scale-95 group/download"
                title="PDF Yuklab olish"
              >
                 <Download className="h-6 w-6" />
              </button>
           </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sertifikatlarim</h1>
          <p className="text-gray-500 mt-2 text-lg">Muvaffaqiyatli yakunlangan kurslar va o'zlashtirilgan fanlar uchun berilgan hujjatlar.</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'courses' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Kurslar bo'yicha
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'subjects' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Fanlar bo'yicha
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeTab === 'courses' ? renderCertificates(certs, false) : renderCertificates(subjectCerts, true)}
      </div>

      <AnimatePresence>
         {selectedCert && (
            <CertificateViewer
               selectedCert={selectedCert}
               onClose={() => setSelectedCert(null)}
            />
         )}
      </AnimatePresence>
    </div>
  );
}
