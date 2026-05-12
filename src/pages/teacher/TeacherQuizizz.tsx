import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Brain, FileUp, Sparkles, Loader2, Save, Trash2, Edit, PlayCircle, Users, CheckCircle, XCircle, Search, Download, BarChart2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { generateDynamicTest } from '../../services/geminiService';
import * as XLSX from 'xlsx';

export default function TeacherQuizizz() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  
  // Create / Edit State
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [testCount, setTestCount] = useState(10);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  
  // List State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewedResult, setViewedResult] = useState<any>(null);
  
  // Active Running Session State
  const [activeSession, setActiveSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [qTimer, setQTimer] = useState(0);

  useEffect(() => {
    if (!user) return;
    const orgId = user.role === 'staff' ? user.teacherId || user.uid : user.uid;
    
    const unsub = onSnapshot(query(collection(db, 'quiz_history'), where('teacherId', '==', orgId)), (snap) => {
       const qs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       qs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
       setQuizzes(qs);
    });
    return unsub;
  }, [user]);

  // Handle Generate with AI
  const handleGenerate = async () => {
    if (!title) return alert("Iltimos, testning mavzusini/nomini kiriting!");
    setLoading(true);
    try {
      const generated = await generateDynamicTest(title, testCount, context);
      const mapped = generated.map((q: any) => ({
        ...q,
        correctAnswer: q.options[q.correctIdx || 0]
      }));
      setQuestions(mapped);
      setShowEditor(true);
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePin = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for ( let i = 0; i < 8; i++ ) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const checkPinUnique = async (pin: string) => {
    const s = await getDocs(query(collection(db, 'quiz_history'), where('pin', '==', pin)));
    return s.empty;
  };

  const handleSaveTest = async () => {
     if (!title || questions.length === 0) return;
     setLoading(true);
     try {
       const orgId = user?.role === 'staff' ? user.teacherId || user.uid : user?.uid;
       
       let newPin = generatePin();
       while (!(await checkPinUnique(newPin))) {
          newPin = generatePin();
       }

       await addDoc(collection(db, 'quiz_history'), {
         teacherId: orgId,
         pin: newPin,
         title,
         context,
         questions,
         createdAt: serverTimestamp()
       });

       setTitle('');
       setContext('');
       setQuestions([]);
       setShowEditor(false);
       setActiveTab('list');

     } catch(e) {
       console.error(e);
     } finally {
       setLoading(false);
     }
  };

  const handleDeleteTest = async (id: string) => {
    if(!window.confirm("Rostdan ham ushbu testni o'chirishni xohlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, 'quiz_history', id));
    } catch(err: any) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleStartSession = async (quiz: any) => {
     setLoading(true);
     try {
       const sessionPin = (quiz.pin && quiz.pin.length === 8) ? quiz.pin : quiz.id.substring(0, 8).toUpperCase();
       
       // Clear old participants from this session pin
       const oldParticipants = await getDocs(query(collection(db, 'quiz_participants'), where('sessionId', '==', sessionPin)));
       const deletePromises = oldParticipants.docs.map(d => deleteDoc(d.ref));
       await Promise.all(deletePromises);

       const sRef = doc(db, 'quiz_sessions', sessionPin);
       await setDoc(sRef, {
         title: quiz.title || 'Nomsiz',
         teacherId: quiz.teacherId || '',
         status: 'waiting',
         currentQuestionIndex: -1,
         questions: quiz.questions || [],
         createdAt: serverTimestamp(),
         historyId: quiz.id || ''
       });
       setActiveSession({ id: sessionPin, ...quiz, status: 'waiting' });
     } catch (e: any) {
       console.error("Start Session Error:", e);
       alert("Sessiyani boshlashda xatolik: " + e.message);
     } finally {
       setLoading(false);
     }
  };

  // Monitor Active Session
  useEffect(() => {
     if (!activeSession) return;
     const unsubSession = onSnapshot(doc(db, 'quiz_sessions', activeSession.id), (snap) => {
        console.log("Session snapshot fired! exists:", snap.exists(), "data:", snap.data(), "hasPendingWrites:", snap.metadata.hasPendingWrites);
        if (snap.exists()) {
           setActiveSession(prev => ({ ...prev, id: snap.id, ...snap.data() }));
        }
     }, (err) => {
        console.error("Session snapshot error:", err);
     });
     
     const unsubParticipants = onSnapshot(query(collection(db, 'quiz_participants'), where('sessionId', '==', activeSession.id)), (snap) => {
        const p = snap.docs.map(d => ({ pId: d.id, ...d.data() }));
        setParticipants(p);
     }, (err) => {
        console.error("Participants snapshot error:", err);
     });

     return () => { unsubSession(); unsubParticipants(); };
  }, [activeSession?.id]);

  const isTransitioningRef = React.useRef(false);

  useEffect(() => {
     isTransitioningRef.current = false;
  }, [activeSession?.currentQuestionIndex, activeSession?.status]);

  // Handle Question Timer Logic locally to push next question
  useEffect(() => {
     let timer: any;
     if (activeSession?.status === 'active' && activeSession.questionStartTime) {
       timer = setInterval(() => {
         const elapsed = Math.floor((Date.now() - activeSession.questionStartTime) / 1000);
         if (elapsed >= 15) {
            handleNextQuestion();
         } else {
            setQTimer(15 - elapsed);
         }
       }, 500);
     }
     return () => clearInterval(timer);
  }, [activeSession?.status, activeSession?.questionStartTime, activeSession?.currentQuestionIndex]);

  const handleBeginTest = async () => {
    if (!activeSession) return;
    await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
      status: 'starting'
    });
    
    // 3 second delay to let clients know it's starting
    setTimeout(async () => {
       await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
         status: 'active',
         currentQuestionIndex: 0,
         questionStartTime: Date.now()
       });
    }, 3000);
  };

  const handleNextQuestion = async () => {
    if (!activeSession || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const nextIdx = activeSession.currentQuestionIndex + 1;
    
    if (nextIdx >= activeSession.questions.length) {
      // Finish
      await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
        status: 'finished'
      });
      // Save participants history to the original quiz_history doc
      if (activeSession.historyId) {
         await updateDoc(doc(db, 'quiz_history', activeSession.historyId), {
            participants: participants,
            lastRun: serverTimestamp()
         });
      }
    } else {
      await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
        currentQuestionIndex: nextIdx,
        questionStartTime: Date.now()
      });
    }
  };
  
  const handleStopSession = async () => {
    if (activeSession) {
      await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
        status: 'finished'
      });
      await updateDoc(doc(db, 'quiz_history', activeSession.historyId || activeSession.id), {
         participants: participants,
         lastRun: serverTimestamp()
      });
      setActiveSession(null);
    }
  };

  const exportResults = (quiz: any) => {
    if (!quiz.participants || quiz.participants.length === 0) return alert("Qatnashuvchilar yo'q");
    
    const pData = quiz.participants.map((p: any) => {
      let correctCount = 0;
      const row: any = { "F.I.SH": p.name };
      
      quiz.questions.forEach((q: any, i: number) => {
         const ans = p.answers?.[i];
         if (ans?.isCorrect) {
            correctCount++;
            row[`${i+1}-test`] = 'To\'g\'ri';
         } else if (ans) {
            row[`${i+1}-test`] = 'Xato';
         } else {
            row[`${i+1}-test`] = 'Belgilanmagan';
         }
      });
      row["Jami To'g'ri"] = correctCount;
      return row;
    });

    pData.sort((a: any, b: any) => b["Jami To'g'ri"] - a["Jami To'g'ri"]);

    const worksheet = XLSX.utils.json_to_sheet(pData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Natijalar');
    XLSX.writeFile(workbook, `Quiz_Result_${quiz.title.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {!activeSession && (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Quizizz paneli</h1>
            <p className="text-gray-500 mt-1">Interaktiv testlar yaratish va boshqarish.</p>
          </div>
          <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
             <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
               Test Yaratish
             </button>
             <button
                onClick={() => setActiveTab('list')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
               Jurnal
             </button>
          </div>
        </header>
      )}

      {/* ACTIVE SESSION VIEW */}
      {activeSession && (
        <div className="fixed inset-0 z-[100] bg-gray-100 p-4 md:p-8 overflow-y-auto">
           <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[80vh]">
              <div className="bg-blue-600 p-8 text-white flex flex-col items-center justify-center text-center">
                 <h2 className="text-3xl font-black mb-4">{activeSession.title}</h2>
                 <p className="text-blue-100 text-xl font-medium mb-6 whitespace-nowrap">
                   O'quvchilarga ayting: <strong>Quizizz</strong> menyusiga kirib PIN kodni yozishsin.
                 </p>
                 <div className="bg-white text-blue-600 px-10 py-6 rounded-3xl shadow-2xl flex items-center gap-6 border-4 border-blue-500/30">
                    <span className="text-3xl font-black text-gray-400">PIN KOD:</span>
                    <span className="text-6xl md:text-7xl font-black tracking-[0.2em] font-mono">{activeSession.id}</span>
                 </div>
              </div>
              
              <div className="p-8 flex-1">
                 {activeSession.status === 'waiting' && (
                    <div className="text-center py-12">
                       <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                       <h3 className="text-2xl font-bold text-gray-900 mb-2">Mehmonlar kutilmoqda ({participants.length})</h3>
                       <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-3xl mx-auto">
                          {participants.map(p => (
                             <div key={p.pId} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl animate-bounce border border-blue-100">
                                {p.name}
                             </div>
                          ))}
                       </div>
                       <button 
                         onClick={handleBeginTest}
                         disabled={participants.length === 0}
                         className={`mt-12 px-10 py-5 font-black text-2xl rounded-2xl shadow-xl transition-all ${participants.length > 0 ? 'bg-green-500 text-white shadow-green-200 hover:bg-green-600 hover:scale-105' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                       >
                         TESTNI BOSHLASH
                       </button>
                    </div>
                 )}

                 {(activeSession.status === 'starting' || activeSession.status === 'active') && (
                    <div className="text-center py-12">
                       {activeSession.status === 'starting' ? (
                          <h2 className="text-4xl font-black text-blue-600 animate-pulse">Test boshlanyapti...</h2>
                       ) : (
                          <>
                            <div className="text-6xl font-black text-blue-600 mb-8">{qTimer}s</div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                              Savol {activeSession.currentQuestionIndex + 1}: {activeSession.questions[activeSession.currentQuestionIndex]?.text}
                            </h2>
                            <p className="text-gray-500 font-medium">Barcha o'quvchilar javob berishini kuting (Yoki taymer tugashini)</p>
                          </>
                       )}
                    </div>
                 )}

                 {activeSession.status === 'finished' && (
                    <div className="py-8">
                       <h2 className="text-3xl font-black text-center text-gray-900 mb-8">Natijalar Jadvali</h2>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left bg-white border border-gray-100 rounded-2xl">
                             <thead className="bg-gray-50/50">
                                <tr>
                                   <th className="px-6 py-4 font-black text-gray-500 text-xs uppercase tracking-widest">O'rin</th>
                                   <th className="px-6 py-4 font-black text-gray-500 text-xs uppercase tracking-widest">F.I.SH</th>
                                   {activeSession.questions.map((_: any, i: number) => (
                                      <th key={i} className="px-4 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">{i+1}-T</th>
                                   ))}
                                   <th className="px-6 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">Bal</th>
                                </tr>
                             </thead>
                             <tbody>
                                {participants.sort((a,b) => {
                                  const getScore = (p: any): number => (Object.values(p.answers || {}) as any[]).reduce((acc: number, ans: any) => acc + (ans.isCorrect ? 100 - Number(ans.timeTaken || 0) : 0), 0);
                                  return Number(getScore(b)) - Number(getScore(a));
                                }).map((p: any, idx) => (
                                  <tr key={p.pId} className="border-t border-gray-100">
                                     <td className="px-6 py-4 font-black text-gray-400">{idx + 1}</td>
                                     <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                     {activeSession.questions.map((_: any, i: number) => {
                                        const ans = p.answers?.[i];
                                        return (
                                          <td key={i} className="px-4 py-4 text-center">
                                            {ans?.isCorrect ? (
                                               <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                            ) : ans ? (
                                               <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                            ) : (
                                               <span className="text-gray-300">-</span>
                                            )}
                                          </td>
                                        )
                                     })}
                                     <td className="px-6 py-4 text-center font-black text-blue-600">
                                       {Object.values(p.answers || {}).reduce((acc: number, ans: any) => acc + (ans.isCorrect ? 1 : 0), 0)} / {activeSession.questions.length}
                                     </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                       <div className="flex justify-center mt-8">
                         <button onClick={handleStopSession} className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                           Chiqaish
                         </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* CREATE TAB */}
      {!activeSession && activeTab === 'create' && !showEditor && (
        <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto space-y-8">
           <div className="space-y-4">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <FileUp className="w-4 h-4 text-blue-500" />
                 Test Nomi / Mavzusi
              </label>
              <input
                 type="text"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 transition-all font-bold text-lg"
                 placeholder="Masalan: Frontend texnologiyalari..."
              />
           </div>

           <div className="space-y-4">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Brain className="w-4 h-4 text-purple-500" />
                 Qo'shimcha Matn (Ixtiyoriy)
              </label>
              <textarea
                 value={context}
                 onChange={(e) => setContext(e.target.value)}
                 className="w-full min-h-[150px] px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-500 transition-all font-medium text-gray-700"
                 placeholder="AI ga qo'shimcha ma'lumot bering yoki matnni shu yerga qo'ying..."
              />
              <p className="text-sm text-gray-500 font-medium">Bu yerdagi matn asosida testlar generatsiya qilinadi.</p>
           </div>

           <div className="space-y-4">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 Testlar Soni
              </label>
              <input
                 type="number"
                 value={testCount}
                 onChange={(e) => setTestCount(Number(e.target.value))}
                 className="w-full max-w-[200px] px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 transition-all font-bold text-lg"
                 min="1"
                 max="40"
              />
           </div>
           
           <button
             onClick={handleGenerate}
             disabled={loading}
             className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 text-lg"
           >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              AI ORQALI YARATISH
           </button>
        </div>
      )}

      {/* EDITOR */}
      {!activeSession && activeTab === 'create' && showEditor && (
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black text-gray-900">Testlarni Tahrirlash</h2>
               <div className="flex gap-2">
                 <button onClick={() => setShowEditor(false)} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Bekor qilish</button>
                 <button onClick={handleSaveTest} disabled={loading} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Testni Saqlash
                 </button>
               </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
               {questions.map((q, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-4">
                       <textarea 
                          value={q.text}
                          onChange={(e) => {
                             const n = [...questions];
                             n[idx].text = e.target.value;
                             setQuestions(n);
                          }}
                          className="flex-1 px-4 py-3 bg-gray-50 font-bold border border-gray-200 rounded-xl"
                          rows={2}
                       />
                       <button onClick={() => setQuestions(q => q.filter((_, i) => i !== idx))} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       {q.options.map((opt: string, oIdx: number) => {
                           const isCorrect = opt === q.correctAnswer;
                           return (
                             <div key={oIdx} className={`flex items-center gap-2 p-3 rounded-xl border ${isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                {isCorrect && <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
                                <input 
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const n = [...questions];
                                    if (n[idx].correctAnswer === n[idx].options[oIdx]) {
                                       n[idx].correctAnswer = e.target.value;
                                    }
                                    n[idx].options[oIdx] = e.target.value;
                                    setQuestions(n);
                                  }}
                                  className="flex-1 bg-transparent border-none outline-none font-medium w-full"
                                />
                             </div>
                           )
                       })}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      )}

      {/* LIST TAB (JURNAL) */}
      {!activeSession && activeTab === 'list' && (
         <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Test nomini qidiring..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-blue-500 transition-colors font-medium shadow-sm"
              />
            </div>
            
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap">
                   <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-xs">
                     <tr>
                       <th className="px-6 py-4">№</th>
                       <th className="px-6 py-4">Test Nomi</th>
                       <th className="px-6 py-4">PIN KOD</th>
                       <th className="px-6 py-4">Testlar Soni</th>
                       <th className="px-6 py-4">Yaratilgan vaqti</th>
                       <th className="px-6 py-4 text-center">Harakatlar</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-sm">
                     {quizzes.filter(q => q.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((quiz, idx) => (
                       <tr key={quiz.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-black text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                             <div className="font-bold text-gray-900">{quiz.title}</div>
                             <div className="text-gray-500 max-w-xs truncate" title={quiz.context}>{quiz.context || "Qo'shimcha matn mavjud emas"}</div>
                          </td>
                          <td className="px-6 py-4 font-black text-blue-600 tracking-widest">{quiz.pin || 'Yo\'q'}</td>
                          <td className="px-6 py-4 font-bold text-gray-700">{quiz.questions?.length || 0} ta</td>
                          <td className="px-6 py-4 text-gray-500 font-medium font-mono">
                             {quiz.createdAt ? new Date(quiz.createdAt.toMillis()).toLocaleString('uz-UZ') : 'Noma\'lum'}
                          </td>
                          <td className="px-6 py-4 flex items-center justify-center gap-2">
                             {quiz.participants && quiz.participants.length > 0 && (
                                <>
                                  <button
                                    onClick={() => setViewedResult(quiz)}
                                    className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                                  >
                                     <BarChart2 className="w-4 h-4" /> Natija
                                  </button>
                                  <button
                                    onClick={() => exportResults(quiz)}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                                  >
                                     <Download className="w-4 h-4" /> Excel
                                  </button>
                                </>
                             )}
                             <button 
                               onClick={() => handleStartSession(quiz)}
                               className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black shadow-md shadow-blue-200 hover:bg-blue-700 transition-all flex justify-center items-center gap-2"
                             >
                               <PlayCircle className="w-4 h-4" /> START
                             </button>
                             <button
                               onClick={() => handleDeleteTest(quiz.id)}
                               className="px-3 py-2 bg-red-50 text-red-700 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 ml-2"
                               title="O'chirish"
                             >
                               <Trash2 className="w-5 h-5" />
                             </button>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {quizzes.length === 0 && (
                 <div className="py-12 text-center text-gray-500 font-medium">
                   Hali hech qanday test yaratilmagan.
                 </div>
               )}
            </div>
         </div>
      )}

      {/* VIEW RESULTS MODAL */}
      {viewedResult && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
           <div className="bg-white max-w-5xl w-full max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                 <div>
                   <h2 className="text-2xl font-black text-gray-900">{viewedResult.title} - Natijalar</h2>
                   <p className="text-gray-500 font-medium text-sm mt-1">Sana: {viewedResult.lastRun ? new Date(viewedResult.lastRun.toMillis()).toLocaleString('uz-UZ') : 'Noma\'lum'}</p>
                 </div>
                 <button onClick={() => setViewedResult(null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-6 overflow-y-auto">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left bg-white border border-gray-100 rounded-2xl">
                        <thead className="bg-gray-50/50">
                           <tr>
                              <th className="px-6 py-4 font-black text-gray-500 text-xs uppercase tracking-widest">O'rin</th>
                              <th className="px-6 py-4 font-black text-gray-500 text-xs uppercase tracking-widest">F.I.SH</th>
                              {viewedResult.questions.map((_: any, i: number) => (
                                 <th key={i} className="px-4 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">{i+1}-T</th>
                              ))}
                              <th className="px-6 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">Bal</th>
                           </tr>
                        </thead>
                        <tbody>
                           {[...viewedResult.participants].sort((a: any,b: any) => {
                             const getScore = (p: any): number => (Object.values(p.answers || {}) as any[]).reduce((acc: number, ans: any) => acc + (ans.isCorrect ? 100 - Number(ans.timeTaken || 0) : 0), 0);
                             return Number(getScore(b)) - Number(getScore(a));
                           }).map((p: any, idx: number) => (
                             <tr key={p.pId} className="border-t border-gray-100">
                                <td className="px-6 py-4 font-black text-gray-400">{idx + 1}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                {viewedResult.questions.map((_: any, i: number) => {
                                   const ans = p.answers?.[i];
                                   return (
                                     <td key={i} className="px-4 py-4 text-center">
                                       {ans?.isCorrect ? (
                                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                       ) : ans ? (
                                          <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                       ) : (
                                          <span className="text-gray-300">-</span>
                                       )}
                                     </td>
                                   )
                                })}
                                <td className="px-6 py-4 text-center font-black text-blue-600">
                                  {Object.values(p.answers || {}).reduce((acc: number, ans: any) => acc + (ans.isCorrect ? 1 : 0), 0)} / {viewedResult.questions.length}
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
