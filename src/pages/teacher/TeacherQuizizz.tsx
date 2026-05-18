import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, setDoc, runTransaction } from 'firebase/firestore';
import { Brain, FileUp, Sparkles, Loader2, Save, Trash2, Edit, PlayCircle, Users, CheckCircle, XCircle, Search, Download, BarChart2, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { generateDynamicTest } from '../../services/geminiService';
import * as XLSX from 'xlsx-js-style';

const formatTime = (timeInSecs: number) => {
  const seconds = Math.floor(timeInSecs);
  const ms = Math.floor((timeInSecs % 1) * 100);
  return `${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
};

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
       setActiveSession({ ...quiz, id: sessionPin, status: 'waiting' });
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

  const handleRefreshParticipants = async () => {
    if (!activeSession) return;
    try {
      const pSnap = await getDocs(query(collection(db, 'quiz_participants'), where('sessionId', '==', activeSession.id)));
      const p = pSnap.docs.map(d => ({ pId: d.id, ...d.data() }));
      setParticipants(p);
      if (p.length === 0) {
        alert("Hozircha hech qanday foydalanuvchi ulanmagan.");
      }
    } catch (e: any) {
      console.error("Yangi qatnashuvchilarni yuklashda xatolik:", e);
      alert("Xatolik: " + e.message);
    }
  };

  // Handle Question Timer Logic locally to push next question
  useEffect(() => {
     let timer: any;
     if (activeSession?.status === 'active' && activeSession.questionStartTime) {
       timer = setInterval(() => {
         const elapsedMs = Date.now() - activeSession.questionStartTime;
         const elapsedSec = elapsedMs / 1000;
         if (elapsedSec >= 15) {
            handleNextQuestion();
         } else {
            setQTimer(elapsedSec as any);
         }
       }, 50);
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

  const issueCertificateForWinner = async (session: any, parts: any[]) => {
    if (!parts || parts.length === 0) return;
    const sortedParts = [...parts].sort((a: any, b: any) => {
       const getCorrectCount = (p: any) => Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).length;
       const getTimeTaken = (p: any) => Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number;
       const diff = getCorrectCount(b) - getCorrectCount(a);
       if (diff !== 0) return diff;
       return getTimeTaken(a) - getTimeTaken(b);
    });
    
    const winner = sortedParts[0];
    if (!winner) return;

    try {
      const certRef = doc(collection(db, 'enrollments'));
      const counterRef = doc(db, 'counters', 'certificates');
      
      let newCertId = '';
      try {
        newCertId = await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(counterRef);
          let currentCount = 0;
          if (docSnap.exists()) {
             currentCount = docSnap.data().count || 0;
          }
          const nextCount = currentCount + 1;
          transaction.set(counterRef, { count: nextCount }, { merge: true });
          return `YAU-${String(nextCount).padStart(5, '0')}`;
        });
      } catch (err) {
        newCertId = `YAU-${String(Date.now()).slice(-8).toUpperCase()}`;
      }

      await setDoc(certRef, {
        isQuizizzItem: true,
        completed: true,
        userId: 'quizizz_anonymous',
        studentName: winner.name,
        courseId: session.historyId || session.id,
        courseTitle: session.title,
        creatorId: session.teacherId || user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        certificateId: newCertId
      });

      // Save to permanent certificates collection
      const certData = {
        userId: 'quizizz_anonymous',
        studentName: winner.name,
        entityId: session.historyId || session.id,
        entityTitle: session.title,
        entityType: 'quizizz',
        score: 100, // Winner gets 100 for now
        issuedAt: serverTimestamp(),
        certificateId: newCertId
      };
      await setDoc(doc(db, 'certificates', newCertId), certData);
    } catch (e) {
      console.error(e);
    }
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
      await issueCertificateForWinner(activeSession, participants);
    } else {
      await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
        currentQuestionIndex: nextIdx,
        questionStartTime: Date.now()
      });
    }
  };
  
  const handleStopSession = async () => {
    if (!activeSession || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const isAlreadyFinished = activeSession.status === 'finished';
    try {
      await updateDoc(doc(db, 'quiz_sessions', activeSession.id), {
        status: 'finished'
      });
      await updateDoc(doc(db, 'quiz_history', activeSession.historyId || activeSession.id), {
         participants: participants,
         lastRun: serverTimestamp()
      });
      if (!isAlreadyFinished) {
        await issueCertificateForWinner(activeSession, participants);
      }
      setActiveSession(null);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const exportWord = (quiz: any) => {
    if (!quiz.questions || quiz.questions.length === 0) return alert("Test savollari yo'q");
    let content = `<html><head><meta charset="UTF-8"></head><body><h2>${quiz.title}</h2><br/>`;
    quiz.questions.forEach((q: any) => {
      content += `<div>++++<br/> ${q.text}</div>`;
      q.options.forEach((opt: string, optIdx: number) => {
        const isCorrect = q.correctIdx === optIdx;
        const prefix = isCorrect ? '#' : '';
        content += `<div>====</div><div>${prefix}${opt}</div>`;
      });
      content += '<br/>';
    });
    content += '</body></html>';
    const blob = new Blob(['\ufeff', content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Test_${quiz.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportResults = (quiz: any) => {
    if (!quiz.participants || quiz.participants.length === 0) return alert("Qatnashuvchilar yo'q");
    
    const pData = quiz.participants.map((p: any) => {
      let correctCount = 0;
      let totalTime = 0;
      const row: any = { "F.I.SH": p.name };
      
      quiz.questions.forEach((q: any, i: number) => {
         const ans = p.answers?.[i];
         if (ans?.isCorrect) {
            correctCount++;
            totalTime += Number(ans.timeTaken || 0);
            row[`${i+1}-test`] = 'To\'g\'ri';
         } else if (ans) {
            row[`${i+1}-test`] = 'Xato';
         } else {
            row[`${i+1}-test`] = 'Belgilanmagan';
         }
      });
      row["To'g'ri javoblar"] = correctCount;
      row["Sarflangan vaqt (s)"] = totalTime;
      return row;
    });

    pData.sort((a: any, b: any) => {
      const diff = b["To'g'ri javoblar"] - a["To'g'ri javoblar"];
      if (diff !== 0) return diff;
      return a["Sarflangan vaqt (s)"] - b["Sarflangan vaqt (s)"];
    });

    const worksheet = XLSX.utils.json_to_sheet(pData);
    
    // Add colors to specific cells
    for (const cellAddress in worksheet) {
      if (cellAddress.startsWith('!')) continue;
      
      const cell = worksheet[cellAddress];
      if (cell.v === 'To\'g\'ri') {
        cell.s = {
          fill: { fgColor: { rgb: "C6EFCE" } },
          font: { color: { rgb: "006100" }, bold: true }
        };
      } else if (cell.v === 'Xato') {
        cell.s = {
          fill: { fgColor: { rgb: "FFC7CE" } },
          font: { color: { rgb: "9C0006" }, bold: true }
        };
      } else if (cell.v === 'Belgilanmagan') {
        cell.s = {
          fill: { fgColor: { rgb: "F2F2F2" } },
          font: { color: { rgb: "7F7F7F" }, italic: true }
        };
      }
    }

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
                       <div className="flex items-center justify-center gap-4 mb-2">
                         <h3 className="text-2xl font-bold text-gray-900">Mehmonlar kutilmoqda ({participants.length})</h3>
                         <button onClick={handleRefreshParticipants} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                           <RefreshCw className="w-5 h-5" />
                           Tekshirish
                         </button>
                       </div>
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
                            <div className="text-6xl font-black text-blue-600 mb-8">
                              {typeof qTimer === 'number' ? `${Math.floor(qTimer).toString().padStart(2, '0')}:${Math.floor((qTimer % 1) * 100).toString().padStart(2, '0')}` : qTimer}
                            </div>
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
                       <h2 className="text-3xl font-black text-center text-gray-900 mb-8">Natijalar jadvali</h2>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left bg-white border border-gray-100 rounded-2xl">
                             <thead className="bg-gray-50/50">
                                <tr>
                                   <th className="px-6 py-4 font-black text-gray-500 text-xs uppercase tracking-widest">O'rin</th>
                                   <th className="px-6 py-4 font-black text-gray-500 text-xs uppercase tracking-widest">F.I.SH</th>
                                   {activeSession.questions.map((_: any, i: number) => (
                                      <th key={i} className="px-4 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">{i+1}-T</th>
                                   ))}
                                   <th className="px-6 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">To'g'ri javoblar</th>
                                   <th className="px-6 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">Sarflangan vaqt</th>
                                </tr>
                             </thead>
                             <tbody>
                                {participants.sort((a: any, b: any) => {
                                  const getCorrectCount = (p: any) => Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).length;
                                  const getTimeTaken = (p: any) => Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number;
                                  const diff = getCorrectCount(b) - getCorrectCount(a);
                                  if (diff !== 0) return diff;
                                  return getTimeTaken(a) - getTimeTaken(b);
                                }).map((p: any, idx) => (
                                  <tr key={p.pId} className="border-t border-gray-100">
                                     <td className="px-6 py-4 font-black text-gray-400">{idx + 1}</td>
                                     <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                     {activeSession.questions.map((_: any, i: number) => {
                                        const ans = p.answers?.[i];
                                        return (
                                          <td key={i} className="px-4 py-4 text-center">
                                            {ans?.isCorrect ? (
                                               <div className="flex flex-col items-center justify-center">
                                                 <CheckCircle className="w-5 h-5 text-green-500 mb-1 mx-auto" />
                                                 <span className="text-[10px] text-gray-500 font-bold">{formatTime(ans.timeTaken)}</span>
                                               </div>
                                            ) : ans ? (
                                               <div className="flex flex-col items-center justify-center">
                                                 <XCircle className="w-5 h-5 text-red-500 mb-1 mx-auto" />
                                                 <span className="text-[10px] text-gray-400 font-medium">{formatTime(ans.timeTaken)}</span>
                                               </div>
                                            ) : (
                                               <span className="text-gray-300">-</span>
                                            )}
                                          </td>
                                        )
                                     })}
                                     <td className="px-6 py-4 text-center font-black text-blue-600">
                                       {Object.values(p.answers || {}).reduce((acc: number, ans: any) => acc + (ans.isCorrect ? 1 : 0), 0)} / {activeSession.questions.length}
                                     </td>
                                     <td className="px-6 py-4 text-center font-black text-orange-600">
                                       {formatTime(Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number)}
                                     </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                       <div className="flex justify-center mt-8">
                         <button onClick={handleStopSession} className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                           Chiqish
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
                               onClick={() => exportWord(quiz)}
                               className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center"
                               title="Word"
                             >
                               Word
                             </button>
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
                   <h2 className="text-2xl font-black text-gray-900">{viewedResult.title} - Natijalar jadvali</h2>
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
                              <th className="px-6 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">To'g'ri javoblar</th>
                              <th className="px-6 py-4 text-center font-black text-gray-500 text-xs uppercase tracking-widest">Sarflangan vaqt</th>
                           </tr>
                        </thead>
                        <tbody>
                           {[...viewedResult.participants].sort((a: any,b: any) => {
                             const getCorrectCount = (p: any) => Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).length;
                             const getTimeTaken = (p: any) => Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number;
                             const diff = getCorrectCount(b) - getCorrectCount(a);
                             if (diff !== 0) return diff;
                             return getTimeTaken(a) - getTimeTaken(b);
                           }).map((p: any, idx: number) => (
                             <tr key={p.pId} className="border-t border-gray-100">
                                <td className="px-6 py-4 font-black text-gray-400">{idx + 1}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                {viewedResult.questions.map((_: any, i: number) => {
                                   const ans = p.answers?.[i];
                                   return (
                                     <td key={i} className="px-4 py-4 text-center">
                                       {ans?.isCorrect ? (
                                         <div className="flex flex-col items-center justify-center">
                                           <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
                                           <span className="text-[10px] text-gray-500 font-bold">{formatTime(ans.timeTaken)}</span>
                                         </div>
                                       ) : ans ? (
                                         <div className="flex flex-col items-center justify-center">
                                           <XCircle className="w-5 h-5 text-red-500 mb-1" />
                                           <span className="text-[10px] text-gray-400 font-medium">{formatTime(ans.timeTaken)}</span>
                                         </div>
                                       ) : (
                                          <span className="text-gray-300">-</span>
                                       )}
                                     </td>
                                   )
                                })}
                                <td className="px-6 py-4 text-center font-black text-blue-600">
                                  {Object.values(p.answers || {}).reduce((acc: number, ans: any) => acc + (ans.isCorrect ? 1 : 0), 0)} / {viewedResult.questions.length}
                                </td>
                                <td className="px-6 py-4 text-center font-black text-orange-600">
                                  {formatTime(Object.values(p.answers || {}).filter((ans: any) => ans?.isCorrect).reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number)}
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
