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
  const [loading, setLoading] = useState(true);
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
    return onSnapshot(q, (snap) => {
      setCerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment)));
      setLoading(false);
    }, (err) => console.error(err));
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const getFullName = () => {
    return user?.displayName || "Talaba";
  };

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sertifikatlarim</h1>
        <p className="text-gray-500 mt-2 text-lg">Muvaffaqiyatli yakunlangan kurslar uchun berilgan hujjatlar.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {certs.map((c) => (
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
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">O'quv Sertifikati</p>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{courses[c.courseId] || 'Kurs'}</h3>
                <div className="flex items-center gap-1.5 pt-2">
                   {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />)}
                </div>
             </div>

             <div className="flex gap-4 mt-10 relative z-10">
                <button 
                  onClick={() => setSelectedCert({...c, courseTitle: courses[c.courseId], studentName: getFullName()})}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl active:scale-95 group/btn"
                >
                   <Eye className="h-5 w-5" />
                   KO'RISH
                </button>
                <button 
                  onClick={() => setSelectedCert({...c, courseTitle: courses[c.courseId], studentName: getFullName(), autoDownload: true} as any)}
                  className="w-16 flex items-center justify-center bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl active:scale-95 group/download"
                  title="PDF Yuklab olish"
                >
                   <Download className="h-6 w-6" />
                </button>
             </div>
          </div>
        ))}
        
        {certs.length === 0 && (
          <div className="col-span-full py-32 bg-white rounded-[40px] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                <Award className="h-10 w-10 text-gray-200" />
             </div>
             <h3 className="text-xl font-bold text-gray-900">Sertifikatlar hali mavjud emas</h3>
             <p className="text-gray-400 mt-2 max-w-sm">Kurslarni 100% yakunlash va final testda kamida 70% to'plash orqali sertifikatga ega bo'ling.</p>
          </div>
        )}
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
