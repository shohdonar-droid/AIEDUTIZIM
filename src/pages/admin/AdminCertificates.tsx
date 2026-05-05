import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { Enrollment, UserProfile } from '../../types';
import { Award, FileText, Plus, Loader2, Eye, Download, Settings, Save, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import CertificateViewer from '../../components/CertificateViewer';

interface CertTemplate {
  title: string;
  completionText: string;
  coursePrefix: string;
  courseSuffix: string;
}

export default function AdminCertificates() {
  const [certs, setCerts] = useState<any[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  
  // Template State
  const [template, setTemplate] = useState<CertTemplate>({
    title: 'SERTIFIKAT',
    completionText: "Maxsus ta'lim dasturini yakunlagani uchun",
    coursePrefix: 'Ushbu sertifikat',
    courseSuffix: 'kursini muvaffaqiyatli tugatganligini tasdiqlaydi.'
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Contract/Cert Form
  const [selectedStudent, setSelectedStudent] = useState('');
  const [type, setType] = useState<'certificate' | 'contract'>('certificate');

  useEffect(() => {
    async function load() {
      try {
        // Load template
        const tDoc = await getDoc(doc(db, 'settings', 'certificate_template'));
        if (tDoc.exists()) {
          setTemplate(tDoc.data() as CertTemplate);
        }

        // Load courses map
        const cSnap = await getDocs(collection(db, 'courses'));
        const cMap: Record<string, string> = {};
        cSnap.forEach(d => cMap[d.id] = d.data().title);
        setCourses(cMap);

        const eSnap = await getDocs(query(collection(db, 'enrollments'), where('completed', '==', true)));
        setCerts(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const uSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        setStudents(uSnap.docs.map(doc => doc.data() as UserProfile));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'admin-certificates-loader');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await setDoc(doc(db, 'settings', 'certificate_template'), template);
      setShowTemplateModal(false);
      alert("Sertifikat matnlari saqlandi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setSavingTemplate(false);
    }
  };

  const createDoc = async () => {
    if (!selectedStudent) return;
    setLoading(true);
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
       courseTitle: courses[c.courseId], 
       studentName
    });
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Hujjatlar</h1>
          <p className="text-gray-500 mt-2 text-lg">Sertifikatlar va talabalar bilan shartnomalar boshqaruvi.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black shadow-lg hover:bg-gray-50 transition-all border-2 border-gray-100"
          >
            <Settings className="h-5 w-5 text-gray-400" />
            TAHRIRLASH
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl hover:bg-blue-700 transition-all"
          >
            <Plus className="h-5 w-5" />
            YARATISH
          </button>
        </div>
      </header>

      {/* Template Editor Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl space-y-8"
           >
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                   <Settings className="h-6 w-6 text-blue-600" />
                   <h3 className="text-2xl font-black text-gray-900 uppercase">Sertifikat Matni</h3>
                </div>
                <button onClick={() => setShowTemplateModal(false)} className="p-2 text-gray-400 hover:text-red-500">
                   <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Sertifikat Sarlavhasi</label>
                    <input 
                      type="text" 
                      value={template.title}
                      onChange={e => setTemplate({...template, title: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kurs yakunlash matni</label>
                    <input 
                      type="text" 
                      value={template.completionText}
                      onChange={e => setTemplate({...template, completionText: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kurs oldidan matn</label>
                    <input 
                      type="text" 
                      value={template.coursePrefix}
                      onChange={e => setTemplate({...template, coursePrefix: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kursdan keyingi matn</label>
                    <input 
                      type="text" 
                      value={template.courseSuffix}
                      onChange={e => setTemplate({...template, courseSuffix: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 italic text-sm text-blue-600">
                <p><strong>Eslatma:</strong> Kurs nomi avtomat ravishda "Kurs oldidan matn" va "Kursdan keyingi matn" o'rtasida joylashadi.</p>
              </div>

              <button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all font-serif"
              >
                {savingTemplate ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                SAQLASH VA QO'LLASH
              </button>
           </motion.div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] p-12 max-w-xl w-full shadow-2xl space-y-8">
             <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900">Hujjat shakllantirish</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500">
                   <X className="h-6 w-6" />
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
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100">{c.certificateId || ('CERT-' + c.id.slice(-8).toUpperCase())}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-black text-gray-900">{student?.displayName || "Noma'lum Talaba"}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-gray-600">{courses[c.courseId] || 'Kurs'}</span>
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
                             <div className="flex items-center justify-center gap-2">
                               <button
                                  onClick={() => openCert(c)}
                                  className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                                  title="Sertifikatni ko'rish"
                               >
                                  <Eye className="h-5 w-5" />
                               </button>
                               <button
                                  onClick={() => {
                                    const student = students.find(s => s.uid === c.userId);
                                    setSelectedCert({
                                       ...c, 
                                       courseTitle: courses[c.courseId] || 'Kurs', 
                                       studentName: student?.displayName || "Talaba",
                                       autoDownload: true
                                    } as any);
                                  }}
                                  className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors shadow-sm"
                                  title="PDF Yuklab olish"
                                >
                                  <Download className="h-5 w-5" />
                               </button>
                             </div>
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
