import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc, runTransaction } from 'firebase/firestore';
import { Course, Enrollment, Module, Test } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ChevronRight, ChevronLeft, Lock, CheckCircle2, Play, Trophy, Loader2, Sparkles, BrainCircuit, LayoutDashboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateDynamicTest } from '../services/geminiService';

export default function CourseView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  
  // Test/Quiz State
  const [showTest, setShowTest] = useState(false);
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [testResult, setTestResult] = useState<{ score: number, passed: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      let currentUser = user;
      if (!currentUser) {
         let guestId = localStorage.getItem('guest_id');
         if (!guestId) {
             guestId = 'GUEST_' + Math.random().toString(36).substring(2, 9);
             localStorage.setItem('guest_id', guestId);
         }
         currentUser = { uid: guestId, displayName: 'Mexmon', role: 'student', teacherId: 'admin' } as any;
      }

      const cSnap = await getDoc(doc(db, 'courses', id));
      if (!cSnap.exists()) return navigate('/courses');
      const cData = { id: cSnap.id, ...cSnap.data() } as Course;
      setCourse(cData);

      const eSnap = await getDocs(query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid), where('courseId', '==', id)));
      if (eSnap.empty) {
        // Create enrollment if not exists
        const newEnrollment: any = {
          userId: currentUser.uid,
          courseId: id,
          teacherId: currentUser.teacherId || 'admin', // Added for Journal filtering
          currentModuleIndex: 0,
          grades: {},
          completed: false,
          lastAccessed: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'enrollments'), newEnrollment);
        const finalSnap = await getDocs(query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid), where('courseId', '==', id)));
        setEnrollment({ id: finalSnap.docs[0].id, ...finalSnap.docs[0].data() } as Enrollment);
      } else {
        const en = { id: eSnap.docs[0].id, ...eSnap.docs[0].data() } as Enrollment;
        setEnrollment(en);
        setActiveModuleIdx(en.currentModuleIndex >= cData.modules.length ? cData.modules.length - 1 : en.currentModuleIndex);
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  const handleStartTest = async () => {
    if (!course) return;
    setGeneratingTest(true);
    try {
      const isFinal = activeModuleIdx === course.modules.length - 1;
      const qCount = isFinal ? 15 : 5;
      
      let context = course.modules[activeModuleIdx].content;
      if (isFinal) {
        context = course.modules.map(m => m.content).join('\n---\n');
      }

      const questions = await generateDynamicTest(course.modules[activeModuleIdx].title, qCount, context);
      
      setCurrentTest({
        id: 'dynamic-test',
        title: course.modules[activeModuleIdx].title + (isFinal ? ' (Yakuniy Imtihon)' : ' (Modul Test)'),
        type: 'module',
        questions: questions
      });

      setAnswers(Array(questions.length).fill(-1));
      setShowTest(true);
    } catch (err: any) { 
      console.error(err);
      alert("Test generatsiyasida xatolik yuz berdi: " + (err?.message || ""));
    }
    finally { setGeneratingTest(false); }
  };

  const submitTest = async () => {
    if (!currentTest || !enrollment || !course) return;
    
    let correct = 0;
    currentTest.questions.forEach((q, i) => {
      if (answers[i] === q.correctIdx) correct++;
    });

    const score = Math.round((correct / currentTest.questions.length) * 100);
    const isFinal = activeModuleIdx === course.modules.length - 1;
    const requiredScore = isFinal ? 70 : 60;
    const passed = score >= requiredScore;

    setTestResult({ score, passed });

    if (passed) {
      const nextIdx = Math.max(enrollment.currentModuleIndex, activeModuleIdx + 1);
      const isCompleted = nextIdx >= course.modules.length;
      
      const updateData: any = {
        [`grades.${activeModuleIdx}`]: score,
        currentModuleIndex: isCompleted ? (course.modules.length - 1) : nextIdx,
        lastAccessed: serverTimestamp()
      };
      
      // Issue certificate on final completion
      if (isFinal && !enrollment.completed) {
         updateData.completed = true;
         
         if (!enrollment.certificateId) {
             const certCounterRef = doc(db, 'counters', 'certificates');
             try {
                const newCertId = await runTransaction(db, async (transaction) => {
                    const certDoc = await transaction.get(certCounterRef);
                    let currentCount = 0;
                    if (certDoc.exists()) {
                        currentCount = certDoc.data().count || 0;
                    }
                    const nextCount = currentCount + 1;
                    transaction.set(certCounterRef, { count: nextCount }, { merge: true });
                    return `YAU-${String(nextCount).padStart(5, '0')}`;
                });
                updateData.certificateId = newCertId;

                // Save to permanent certificates collection
                const certData = {
                  userId: user?.uid,
                  studentName: user?.displayName || 'Talaba',
                  entityId: course.id,
                  entityTitle: course.title,
                  entityType: 'course',
                  score: score,
                  issuedAt: serverTimestamp(),
                  certificateId: newCertId
                };
                await setDoc(doc(db, 'certificates', newCertId), certData);
             } catch (err) {
                console.error("Sertifikat raqamini yaratishda xato, yuz berdi", err);
                const fallbackStr = enrollment.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase();
                const fallbackCertId = `YAU-${fallbackStr}`;
                updateData.certificateId = fallbackCertId;

                // Save to permanent certificates collection with fallback
                const certData = {
                  userId: user?.uid,
                  studentName: user?.displayName || 'Talaba',
                  entityId: course.id,
                  entityTitle: course.title,
                  entityType: 'course',
                  score: score,
                  issuedAt: serverTimestamp(),
                  certificateId: fallbackCertId
                };
                await setDoc(doc(db, 'certificates', fallbackCertId), certData);
             }
         }
      }

      await updateDoc(doc(db, 'enrollments', enrollment.id), updateData);
      setEnrollment({ ...enrollment, ...updateData });

      if (isFinal && !enrollment.completed) {
         try {
            await addDoc(collection(db, 'admin_notifications'), {
               text: `🎉 Kurs yakunlandi:\n👤 Talaba: ${user?.displayName || 'Noma\'lum'}\n📚 Kurs nomi: ${course.title}`,
               timestamp: serverTimestamp()
            });
         } catch (e) {}
      }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  if (!course || !enrollment) return null;

  const currentModule = course.modules[activeModuleIdx];
  const isLocked = activeModuleIdx > enrollment.currentModuleIndex;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-white">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-8 border-b border-gray-100 bg-white">
          <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2">{course.title}</h2>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-widest">
            <LayoutDashboard className="h-4 w-4" />
            Muddatli o'quv dasturi
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
          {course.modules.length > 0 ? course.modules.map((m, i) => {
            const locked = i > enrollment.currentModuleIndex;
            const completed = i < enrollment.currentModuleIndex;
            const active = activeModuleIdx === i;

            return (
              <button
                key={i}
                disabled={locked}
                onClick={() => setActiveModuleIdx(i)}
                className={`w-full flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left group ${
                  active 
                    ? 'bg-white border-blue-600 shadow-xl shadow-blue-100' 
                    : locked 
                      ? 'border-transparent opacity-40 cursor-not-allowed' 
                      : 'border-transparent hover:border-gray-200 hover:bg-white'
                }`}
              >
                <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  completed ? 'bg-green-100 text-green-600' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {completed ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                </div>
                <div className="flex-1 overflow-hidden">
                   <p className={`font-black text-sm uppercase tracking-tight ${active ? 'text-gray-900' : 'text-gray-500'}`}>{m.title}</p>
                   <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                     {locked ? 'Qulflangan' : completed ? 'Tugallangan' : 'Jarayonda'}
                   </p>
                </div>
                {locked && <Lock className="h-4 w-4 text-gray-400" />}
              </button>
            );
          }) : (
            <div className="p-10 text-center opacity-40 border-2 border-dashed border-gray-200 rounded-3xl">
              <BrainCircuit className="h-10 w-10 mx-auto mb-4" />
              <p className="text-xs font-bold uppercase">Modullar yuklanmadi</p>
            </div>
          )}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-white p-6 md:p-16">
        <div className="max-w-4xl mx-auto space-y-12">
           <AnimatePresence mode="wait">
            {!showTest ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <header>
                   <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 ring-1 ring-blue-100">
                     Modul {activeModuleIdx + 1}
                   </span>
                   <h1 className="text-4xl font-black text-gray-900 tracking-tight">{currentModule?.title}</h1>
                </header>

                <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed text-lg">
                   {currentModule?.videoUrl && (
                      <div className="mb-8 aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                         <iframe 
                           src={currentModule.videoUrl} 
                           className="w-full h-full" 
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                           allowFullScreen
                         ></iframe>
                      </div>
                   )}
                   {currentModule?.content}
                   <p className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium">
                     Bu modulni to'liq o'rganib chiqqaningizdan so'ng, AI tomonidan tuzilgan test topshirishingiz kerak bo'ladi.
                   </p>
                </div>

                <div className="pt-10 border-t border-gray-50 flex justify-between items-center">
                   <button 
                    disabled={activeModuleIdx === 0}
                    onClick={() => setActiveModuleIdx(prev => prev - 1)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all"
                   >
                     <ChevronLeft className="h-5 w-5" /> Oldingi
                   </button>
                   <button 
                    onClick={handleStartTest}
                    disabled={generatingTest}
                    className="flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:scale-100"
                   >
                     {generatingTest ? (
                       <>
                         <Loader2 className="h-5 w-5 animate-spin" />
                         AI TEST TUZMOQDA...
                       </>
                     ) : (
                       <>
                         TEST TOPSHIRISH
                         <ChevronRight className="h-5 w-5" />
                       </>
                     )}
                   </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="test"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-50 rounded-[40px] p-8 md:p-16 border border-gray-100 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-32 -mt-32" />
                
                {testResult ? (
                  <div className="text-center py-10 space-y-8 relative z-10">
                     <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
                       testResult.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                     }`}>
                       {testResult.passed ? <Trophy className="h-12 w-12" /> : <X className="h-12 w-12" />}
                     </div>
                     <div>
                       <h2 className="text-4xl font-black text-gray-900 mb-2">
                         {testResult.passed ? 'Tabriklaymiz!' : 'Muvaffaqiyatsiz'}
                       </h2>
                       <p className="text-xl font-bold text-gray-500">
                         Sizning natijangiz: <span className={testResult.passed ? 'text-green-600' : 'text-red-600'}>{testResult.score}%</span>
                       </p>
                     </div>
                     <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                       {testResult.passed 
                         ? 'Modul muvaffaqiyatli topshirildi. Endi keyingi darsga o\'tishingiz mumkin.' 
                         : 'Afsuski, siz yetarli ball to\'play olmadingiz (Kamida 60% kerak). Iltimos, mavzuni qayta ko\'rib chiqing.'}
                     </p>
                     <button 
                       onClick={() => {
                         setShowTest(false);
                         setTestResult(null);
                         if (testResult.passed && activeModuleIdx < 3) setActiveModuleIdx(prev => prev + 1);
                       }}
                       className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all"
                     >
                       {testResult.passed ? 'KEYINGI MODULGA O\'TISH' : 'QAYTA KO\'RISH'}
                     </button>
                  </div>
                ) : (
                  <div className="space-y-10 relative z-10">
                     <header className="flex justify-between items-center">
                        <div>
                          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{currentTest?.title}</h2>
                          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1 italic">Vaqtli emas • 5 Savol</p>
                        </div>
                        <button onClick={() => setShowTest(false)} className="p-2 text-gray-400 hover:text-red-500"><X className="h-6 w-6" /></button>
                     </header>

                     <div className="space-y-12">
                        {currentTest?.questions.map((q, qIdx) => (
                          <div key={qIdx} className="space-y-6">
                             <h4 className="text-xl font-bold text-gray-900 flex gap-4">
                               <span className="text-blue-600 font-black">0{qIdx + 1}</span>
                               {q.text}
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    onClick={() => {
                                      const next = [...answers];
                                      next[qIdx] = oIdx;
                                      setAnswers(next);
                                    }}
                                    className={`p-5 rounded-2xl border-2 transition-all text-left font-bold text-sm ${
                                      answers[qIdx] === oIdx 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                        : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + oIdx)}. {opt}
                                  </button>
                                ))}
                             </div>
                          </div>
                        ))}
                     </div>

                     <div className="pt-10 flex justify-center">
                        <button
                          onClick={submitTest}
                          disabled={answers.includes(-1)}
                          className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-30 disabled:scale-100 hover:scale-105 active:scale-95 transition-all text-lg tracking-wide uppercase"
                        >
                          JAVOBLARNI YUKLASH
                        </button>
                     </div>
                  </div>
                )}
              </motion.div>
            )}
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


