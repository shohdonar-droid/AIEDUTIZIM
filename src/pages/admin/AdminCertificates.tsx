import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
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

  const [showSubjectTemplateModal, setShowSubjectTemplateModal] = useState(false);
  const [showRewardTemplateModal, setShowRewardTemplateModal] = useState(false);
  const [subjectTemplate, setSubjectTemplate] = useState<CertTemplate>({
    title: 'SERTIFIKAT',
    completionText: "Mavzuni a'lo darajada o'zlashtirgani uchun",
    coursePrefix: 'Ushbu sertifikat',
    courseSuffix: 'mavzusidan muvaffaqiyatli o\'tganligini tasdiqlaydi.'
  });
  const [rewardTemplate, setRewardTemplate] = useState<CertTemplate>({
    title: 'TIZIMNING FAOL FOYDALANUVCHISI',
    completionText: "MAXSUS MUKOFOT",
    coursePrefix: 'ushbu sertifikat platformadan faol qatnashib kelayotganligi uchun beriladi.',
    courseSuffix: ''
  });

  useEffect(() => {
    async function load() {
      try {
        // Load templates
        const [tDoc, stDoc, rtDoc] = await Promise.all([
           getDoc(doc(db, 'settings', 'certificate_template')),
           getDoc(doc(db, 'settings', 'certificate_subject_template')),
           getDoc(doc(db, 'settings', 'certificate_reward_template'))
        ]);
        if (tDoc.exists()) {
          setTemplate(tDoc.data() as CertTemplate);
        }
        if (stDoc.exists()) {
          setSubjectTemplate(stDoc.data() as CertTemplate);
        }
        if (rtDoc.exists()) {
           setRewardTemplate(rtDoc.data() as CertTemplate);
        }

        // Load courses map
        const cSnap = await getDocs(collection(db, 'courses'));
        const cMap: Record<string, string> = {};
        cSnap.forEach(d => cMap[d.id] = d.data().title);
        setCourses(cMap);

        const eSnap = await getDocs(query(collection(db, 'enrollments'), where('completed', '==', true)));
        const allCerts = eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const sSnap = await getDocs(query(collection(db, 'testResults'), where('testType', '==', 'subject')));
        const allSubs = sSnap.docs.map(doc => ({ id: doc.id, isSubjectItem: true, ...doc.data() } as any));

        const combined = [
          ...allCerts,
          ...allSubs.filter((c: any) => c.score >= 90)
        ];
        
        combined.sort((a, b) => {
           const idA = a.certificateId || '';
           const idB = b.certificateId || '';
           const numA = parseInt(idA.replace(/\D/g, '')) || 0;
           const numB = parseInt(idB.replace(/\D/g, '')) || 0;
           return numA - numB;
        });

        setCerts(combined);

        const uSnap = await getDocs(collection(db, 'users'));
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

  const saveSubjectTemplate = async () => {
    setSavingTemplate(true);
    try {
      await setDoc(doc(db, 'settings', 'certificate_subject_template'), subjectTemplate);
      setShowSubjectTemplateModal(false);
      alert("Mavzu sertifikat matnlari saqlandi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveRewardTemplate = async () => {
    setSavingTemplate(true);
    try {
      await setDoc(doc(db, 'settings', 'certificate_reward_template'), rewardTemplate);
      setShowRewardTemplateModal(false);
      alert("Rag'batlantirish sertifikat matnlari saqlandi!");
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
    try {
      if (type === 'certificate') {
        const student = students.find(s => s.uid === selectedStudent);
        if (!student) return;

        // Give +10 points to student
        const userRef = doc(db, 'users', student.uid);
        const newRecord = {
          type: 'kirim',
          amount: 10,
          description: "Rag'batlantirish +10 ball",
          date: new Date().toISOString()
        };
        const currentBall = student.ball || 0;
        const currentTotalIncome = student.totalIncome || 0;
        const currentHistory = student.billingHistory || [];

        await updateDoc(userRef, {
           ball: currentBall + 10,
           totalIncome: currentTotalIncome + 10,
           billingHistory: [...currentHistory, newRecord]
        });

        // Generate Certificate ID
        const certCounterRef = doc(db, 'counters', 'certificates');
        let certId = `YAU-${Math.floor(Math.random() * 90000) + 10000}`;
        try {
           certId = await runTransaction(db, async (transaction) => {
               const certDoc = await transaction.get(certCounterRef);
               let currentCount = 0;
               if (certDoc.exists()) {
                   currentCount = certDoc.data().count || 0;
               }
               const nextCount = currentCount + 1;
               transaction.set(certCounterRef, { count: nextCount }, { merge: true });
               return `YAU-${String(nextCount).padStart(5, '0')}`;
           });
        } catch (err) {
           console.error(err);
        }

        const newCertData = {
           userId: student.uid,
           studentName: student.displayName || 'Talaba',
           entityId: 'reward',
           entityTitle: 'FAOL FOYDALANUVCHI',
           entityType: 'reward',
           score: 100,
           issuedAt: serverTimestamp(),
           certificateId: certId
        };
        await setDoc(doc(db, 'certificates', certId), newCertData);

        const newCertRef = await addDoc(collection(db, 'enrollments'), {
           userId: student.uid,
           courseId: 'reward',
           completed: true,
           score: 100,
           certificateId: certId,
           assignedAt: serverTimestamp(),
           completedAt: serverTimestamp()
        });

        const newCert = {
           id: newCertRef.id,
           userId: student.uid,
           courseId: 'reward',
           completed: true,
           score: 100,
           certificateId: certId,
           entityTitle: 'FAOL FOYDALANUVCHI'
        };
        
        setCerts(prev => {
          const list = [...prev, newCert];
          list.sort((a, b) => {
             const idA = a.certificateId || '';
             const idB = b.certificateId || '';
             const numA = parseInt(idA.replace(/\D/g, '')) || 0;
             const numB = parseInt(idB.replace(/\D/g, '')) || 0;
             return numA - numB;
          });
          return list;
        });

        setStudents(prev => prev.map(s => {
           if (s.uid === student.uid) {
              return {
                 ...s,
                 ball: currentBall + 10,
                 totalIncome: currentTotalIncome + 10,
                 billingHistory: [...currentHistory, newRecord]
              };
           }
           return s;
        }));
      }

      alert(`${type === 'certificate' ? 'Sertifikat' : 'Shartnoma'} muvaffaqiyatli shakllantirildi!`);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const openCert = (c: any) => {
    const student = students.find(s => s.uid === c.userId);
    const studentName = c.studentName || student?.displayName || "Talaba";
    setSelectedCert({
       ...c, 
       courseTitle: c.courseTitle || courses[c.courseId] || 'Kurs', 
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
            onClick={() => setShowRewardTemplateModal(true)}
            className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black shadow-lg hover:bg-gray-50 transition-all border-2 border-gray-100"
          >
            <Settings className="h-5 w-5 text-gray-400" />
            R-TAHRIRLASH
          </button>
          <button
            onClick={() => setShowSubjectTemplateModal(true)}
            className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black shadow-lg hover:bg-gray-50 transition-all border-2 border-gray-100"
          >
            <Settings className="h-5 w-5 text-gray-400" />
            M-TAHRIRLASH
          </button>
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

      {/* Subject Template Editor Modal */}
      {showSubjectTemplateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl space-y-8"
           >
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                   <Settings className="h-6 w-6 text-blue-600" />
                   <h3 className="text-2xl font-black text-gray-900 uppercase">Mavzular uchun Sertifikat Matni</h3>
                </div>
                <button onClick={() => setShowSubjectTemplateModal(false)} className="p-2 text-gray-400 hover:text-red-500">
                   <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Sertifikat Sarlavhasi</label>
                    <input 
                      type="text" 
                      value={subjectTemplate.title}
                      onChange={e => setSubjectTemplate({...subjectTemplate, title: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kurs yakunlash matni</label>
                    <input 
                      type="text" 
                      value={subjectTemplate.completionText}
                      onChange={e => setSubjectTemplate({...subjectTemplate, completionText: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kurs oldidan matn</label>
                    <input 
                      type="text" 
                      value={subjectTemplate.coursePrefix}
                      onChange={e => setSubjectTemplate({...subjectTemplate, coursePrefix: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kursdan keyingi matn</label>
                    <input 
                      type="text" 
                      value={subjectTemplate.courseSuffix}
                      onChange={e => setSubjectTemplate({...subjectTemplate, courseSuffix: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 italic text-sm text-blue-600">
                <p><strong>Eslatma:</strong> Fan/Mavzu nomi avtomat ravishda "Kurs oldidan matn" va "Kursdan keyingi matn" o'rtasida joylashadi.</p>
              </div>

              <button
                onClick={saveSubjectTemplate}
                disabled={savingTemplate}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all font-serif"
              >
                {savingTemplate ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                SAQLASH VA QO'LLASH
              </button>
           </motion.div>
        </div>
      )}

      {/* Reward Template Editor Modal */}
      {showRewardTemplateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl space-y-8"
           >
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                   <Settings className="h-6 w-6 text-blue-600" />
                   <h3 className="text-2xl font-black text-gray-900 uppercase">Rag'batlantirish Sertifikati Matni</h3>
                </div>
                <button onClick={() => setShowRewardTemplateModal(false)} className="p-2 text-gray-400 hover:text-red-500">
                   <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Sertifikat Sarlavhasi</label>
                    <input 
                      type="text" 
                      value={rewardTemplate.title}
                      onChange={e => setRewardTemplate({...rewardTemplate, title: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Mukofot turi (tag sarlavha)</label>
                    <input 
                      type="text" 
                      value={rewardTemplate.completionText}
                      onChange={e => setRewardTemplate({...rewardTemplate, completionText: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
                 <div className="space-y-2 col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Asosiy matn</label>
                    <textarea 
                      value={rewardTemplate.coursePrefix}
                      onChange={e => setRewardTemplate({...rewardTemplate, coursePrefix: e.target.value})}
                      rows={3}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-100"
                    />
                 </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 italic text-sm text-blue-600">
                <p><strong>Eslatma:</strong> Ushbu matnlar rag'batlantirish (Reward) sertifikatlarida qo'llaniladi.</p>
              </div>

              <button
                onClick={saveRewardTemplate}
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
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Foydalanuvchini tanlang</label>
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
                     let avg = 100;
                     if (!c.isSubjectItem) {
                         const scores = c.grades ? Object.values(c.grades) as number[] : [];
                         avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
                     } else {
                         avg = c.score;
                     }
                     const scoreText = `${Math.round(avg)}%`;
                     let title = c.isSubjectItem ? c.testTitle : (c.courseId === 'reward' ? 'Rag\'batlantirish Sertifikati' : (courses[c.courseId] || 'Kurs'));
                     const certId = c.certificateId || (c.id?.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase());
                     const cleanId = certId.replace(/-/g, '');

                     if (title === 'O\'chirilgan kurs' || !title || title === 'Kurs') {
                       if (cleanId === 'YAU00003') title = 'KOMPYUTER SAVODXONLIGI';
                       if (cleanId === 'YAU00005') title = 'GRAFIK DIZAYN';
                       if (cleanId === 'YAU00006') title = 'FRONTEND DASTURLASH';
                     }

                     if (typeof title === 'string') {
                       title = title.replace(' (Fanlar/Mavzu)', '');
                     }

                     return (
                       <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-gray-500">{i + 1}</span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100">{c.certificateId || ('YAU-' + c.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase())}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-black text-gray-900">{student?.displayName || "Noma'lum Talaba"}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-gray-600">
                                {c.isSubjectItem ? <span className="mr-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs">Fanlar</span> : null}
                                {c.isQuizizzItem ? <span className="mr-2 px-2 py-0.5 bg-pink-100 text-pink-700 rounded-md text-xs">Quizizz</span> : null}
                                {c.courseTitle || title}
                            </span>
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
                               const ts = c.isSubjectItem ? (c.createdAt || c.lastAccessed) : c.createdAt || c.lastAccessed;
                               if (!ts) return '';
                               const dateObj = ts?.toMillis ? new Date(ts.toMillis()) : (ts instanceof Date ? ts : new Date());
                               return dateObj.toLocaleDateString('uz-UZ');
                            })()}
                          </td>
                          <td className="py-4 px-6 text-center">
                             <div className="flex items-center justify-center gap-2">
                               <button
                                  onClick={() => setSelectedCert({
                                     ...c, 
                                     courseTitle: c.courseTitle || title, 
                                     studentName: c.studentName || student?.displayName || "Talaba",
                                     lastAccessed: c.isSubjectItem ? (c.createdAt || c.lastAccessed) : c.lastAccessed
                                  } as any)}
                                  className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                                  title="Sertifikatni ko'rish"
                               >
                                  <Eye className="h-5 w-5" />
                               </button>
                               <button
                                  onClick={() => {
                                    setSelectedCert({
                                       ...c, 
                                       courseTitle: c.courseTitle || title, 
                                       studentName: c.studentName || student?.displayName || "Talaba",
                                       lastAccessed: c.isSubjectItem ? (c.createdAt || c.lastAccessed) : c.lastAccessed,
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
