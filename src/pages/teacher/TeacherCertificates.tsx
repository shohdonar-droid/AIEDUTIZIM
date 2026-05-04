import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { Award, FileText, Plus, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import CertificateViewer from '../../components/CertificateViewer';
import { useAuth } from '../../hooks/useAuth';

export default function TeacherCertificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  
  // Contract/Cert Form
  const [selectedStudent, setSelectedStudent] = useState('');
  const [type, setType] = useState<'certificate' | 'contract'>('certificate');

  useEffect(() => {
    async function load() {
      if (!user) return;
      // Load courses map
      const cSnap = await getDocs(query(collection(db, 'courses'), where('creatorId', '==', user.uid)));
      const cMap: Record<string, string> = {};
      cSnap.forEach(d => cMap[d.id] = d.data().title);
      setCourses(cMap);

      const uSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', user.uid)));
      const myStudents = uSnap.docs.map(doc => doc.data() as UserProfile);
      setStudents(myStudents);
      const studentIds = myStudents.map(s => s.uid);

      if (studentIds.length > 0) {
          const eSnap = await getDocs(query(collection(db, 'enrollments'), where('completed', '==', true)));
          const allCerts = eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setCerts(allCerts.filter(c => studentIds.includes(c.userId)));
      } else {
          setCerts([]);
      }
      
      setLoading(false);
    }
    load();
  }, [user]);

  const createDoc = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    // Simulating creation logic
    setTimeout(() => {
      alert(`${type === 'certificate' ? 'Sertifikat' : 'Shartnoma'} muvaffaqiyatli shakllantirildi!`);
      setShowModal(false);
      setLoading(false);
    }, 1000);
  };

  const openCert = (c: any) => {
    const student = students.find(s => s.uid === c.userId);
    const studentName = student?.displayName || "Talaba";
    setSelectedCert({
       ...c, 
       courseTitle: courses[c.courseId] || 'Kurs', 
       studentName
    });
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Hujjatlar</h1>
          <p className="text-gray-500 mt-2 text-lg">Talabalar uchun sertifikatlar va shartnomalar.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-2xl hover:bg-black transition-all"
        >
          <Plus className="h-5 w-5" />
          YARATISH
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all">
           <div className="bg-white rounded-[40px] p-12 max-w-xl w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900">Hujjat shakllantirish</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500">
                  <Award className="h-6 w-6" />
                </button>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Hujjat turi</label>
                  <div className="flex gap-2">
                    {['certificate', 'contract'].map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t as any)}
                        className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${
                          type === t ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-50 text-gray-400'
                        }`}
                      >
                        {t === 'certificate' ? 'Sertifikat' : 'Shartnoma'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Talabani tanlang</label>
                  <select 
                    className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none font-bold text-gray-700"
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                  >
                    <option value="">Tanlash...</option>
                    {students.map(s => <option key={s.uid} value={s.uid}>{s.displayName}</option>)}
                  </select>
                </div>

                <button
                  onClick={createDoc}
                  disabled={loading || !selectedStudent}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  HUJJATNI SHAKLLANTIRISH
                </button>
             </div>
           </div>
        </div>
      )}

      {loading ? (
         <div className="flex justify-center flex-col items-center py-20 text-blue-600">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p className="font-bold">Yuklanmoqda...</p>
         </div>
      ) : certs.length === 0 ? (
         <div className="py-20 text-center bg-gray-50 border-4 border-dashed border-gray-100 rounded-[40px] opacity-30">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-black italic">Hozircha berilgan sertifikatlar yo'q.</p>
         </div>
      ) : (
         <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b-2 border-gray-100">
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">№</th>
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">ID</th>
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Foydalanuvchi</th>
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Kurs</th>
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Natija</th>
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Sana</th>
                     <th className="py-4 px-6 text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Sertifikat</th>
                  </tr>
               </thead>
               <tbody>
                  {certs.map((c, i) => {
                     const student = students.find(s => s.uid === c.userId);
                     const scores = c.grades ? Object.values(c.grades) as number[] : [];
                     const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
                     const scoreText = `${Math.round(avg)}%`;

                     return (
                       <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-gray-500">{i + 1}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100">{c.certificateId || ('YAU' + c.id.slice(0, 5).toUpperCase())}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-black text-gray-900">{student?.displayName || "Noma'lum Talaba"}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-gray-600">{courses[c.courseId] || 'O\'chirilgan Kurs'}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                              avg >= 90 ? 'bg-green-100 text-green-700' : 
                              avg >= 70 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {scoreText}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-gray-500 whitespace-nowrap">
                            {(() => {
                              const ts = c.lastAccessed;
                              if (!ts) return '';
                              const dateObj = ts?.toMillis ? new Date(ts.toMillis()) : (ts instanceof Date ? ts : new Date());
                              return dateObj.toLocaleDateString('uz-UZ');
                            })()}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                               onClick={() => openCert(c)}
                               className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                            >
                               <Award className="h-4 w-4" />
                               <span>Ko'rish</span>
                            </button>
                          </td>
                       </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      )}

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
