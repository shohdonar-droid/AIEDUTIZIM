import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { Test, Question } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Loader2, BrainCircuit, CheckCircle2, ChevronRight, RefreshCcw, Sparkles } from 'lucide-react';
import { generateDynamicTest } from '../../services/geminiService';

export default function TestExecute() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [test, setTest] = useState<Test | null>(null);
  const [attemptsInfo, setAttemptsInfo] = useState<{ count: number, max: number }>({ count: 0, max: 1 });
  const [loading, setLoading] = useState(true);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const generationTriggered = useRef(false);

  useEffect(() => {
    async function loadTest() {
      if (!testId) return;
      try {
        const docRef = doc(db, 'tests', testId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const t = { id: docSnap.id, ...docSnap.data() } as Test;
          
          // Check attempts
          if (user) {
             const resultId = `${user.uid}_${t.id}`;
             const resSnap = await getDoc(doc(db, 'testResults', resultId));
             const existingResult = resSnap.exists() ? resSnap.data() : null;
             const attemptCount = existingResult?.attempts || 0;
             const max = t.maxAttempts || 1;
             
             if (attemptCount >= max) {
                alert(`Siz ushbu testni ${max} marta ishlash imkoniyatidan foydalanib bo'lgansiz.`);
                navigate('/tests');
                return;
             }
             setAttemptsInfo({ count: attemptCount, max: max });
          }

          if (t.type === 'exam' && t.generationRules && t.generationRules.length > 0 && !generationTriggered.current) {
            generationTriggered.current = true;
            // Generate rules
            setGeneratingMessage("Sun'iy intellekt siz uchun maxsus imtihon savollarini tuzmoqda...");
            let allQuestions: Question[] = [];
            
            for (let i = 0; i < t.generationRules.length; i++) {
               const rule = t.generationRules[i];
               setGeneratingMessage(`AI savollar tuzmoqda: ${rule.subject} (${i+1}/${t.generationRules.length})`);
               const qs = await generateDynamicTest(rule.subject, rule.count, rule.context);
               allQuestions = [...allQuestions, ...qs];
            }
            
            t.questions = allQuestions;
          }

          setTest(t);
        }
      } catch (err) {
        console.error("Testni yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  const handleSelectOption = (qIndex: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const calculateScore = () => {
    if (!test) return 0;
    let correct = 0;
    test.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIdx) correct++;
    });
    return Math.round((correct / test.questions.length) * 100);
  };

  const handleFinish = async () => {
    if (!test) return;
    setSaving(true);
    const finalScore = calculateScore();
    try {
       const uId = user ? user.uid : "GUEST_" + Math.random().toString(36).substring(2, 9);
       const uName = user ? (user.displayName || 'Talaba') : 'Mexmon (Guest)';
       const resultId = `${uId}_${test.id}`;
        await setDoc(doc(db, 'testResults', resultId), {
          testId: test.id,
          testTitle: test.title,
          testType: test.type,
          userId: uId,
          userName: uName,
          teacherId: user?.teacherId || 'admin', // Store student's teacherId for Journal
          creatorId: test.creatorId || 'admin', // Keep track of who created the test
          score: finalScore,
          totalQuestions: test.questions.length,
          attempts: attemptsInfo.count + 1,
          answers: answers,
          questions: test.questions,
          createdAt: serverTimestamp()
        });
       setScore(finalScore);
       setIsFinished(true);
    } catch (err) {
       console.error("Natijani saqlashda xato", err);
       alert("Xatolik yuz berdi. Natija saqlanmadi.");
    } finally {
       setSaving(false);
    }
  };

  if (loading || generatingMessage) return (
     <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-center">
        <Sparkles className="h-12 w-12 text-purple-600 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Imtihon tayyorlanmoqda</h2>
        <p className="text-gray-500 font-medium">{generatingMessage || 'Yuklanmoqda...'}</p>
     </div>
  );
  
  if (!test || test.questions.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-red-500">Test tuzilmadi yoki topilmadi!</div>;

  if (isFinished) {
    const isPassed = score > 60;
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-lg w-full bg-white rounded-3xl p-10 shadow-2xl text-center space-y-6">
           <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <CheckCircle2 className="h-12 w-12" />
           </div>
           <h2 className="text-3xl font-black text-gray-900">Test Yakunlandi!</h2>
           <p className="text-gray-500 text-lg">Sizning natijangiz:</p>
           <div className={`text-6xl font-black ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
              {score}%
           </div>
           <p className="font-bold text-gray-700">
             {isPassed ? 'Tabriklaymiz, siz nazoratdan o\'tdingiz!' : 'Afsuski, yetarlicha ball to\'play olmadingiz.'}
           </p>
           <div className="pt-6 border-t border-gray-100 flex gap-4">
             <button onClick={() => navigate('/tests')} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">Testlarga qaytish</button>
             <button onClick={() => {
                setIsFinished(false);
                setAnswers({});
                setCurrentQ(0);
                setScore(0);
             }} className="flex-1 py-4 bg-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 flex justify-center items-center gap-2">
                <RefreshCcw className="h-4 w-4" /> Qayta ishlash
             </button>
           </div>
        </div>
      </div>
    );
  }

  const question = test.questions[currentQ];
  const isAnswered = answers[currentQ] !== undefined;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:p-8">
       <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
             <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{test.title}</h1>
             <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 font-black rounded-lg text-sm">
                <BrainCircuit className="h-4 w-4" />
                {currentQ + 1} / {test.questions.length}
             </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-gray-200 rounded-full mb-8 overflow-hidden">
             <div 
               className="h-full bg-blue-600 transition-all duration-500" 
               style={{ width: `${((currentQ + 1) / test.questions.length) * 100}%` }}
             />
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-t-4 border-blue-600 mb-8 animate-in fade-in slide-in-from-right-8">
             <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight mb-8">
               {question.text}
             </h2>

             <div className="space-y-4">
               {question.options.map((opt, idx) => (
                 <button
                   key={idx}
                   onClick={() => handleSelectOption(currentQ, idx)}
                   className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-bold ${
                     answers[currentQ] === idx 
                       ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-md transform scale-[1.01]' 
                       : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                   }`}
                 >
                   <span className="inline-block w-8 text-center text-sm text-gray-400 mr-2 uppercase tracking-widest border-r border-gray-200 mr-4 pr-4">
                      {String.fromCharCode(65 + idx)} {/* A, B, C, D */}
                   </span>
                   {opt}
                 </button>
               ))}
             </div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center">
             <button
               onClick={() => setCurrentQ(prev => prev - 1)}
               disabled={currentQ === 0 || saving}
               className="px-6 py-4 rounded-xl font-bold bg-white text-gray-600 shadow-sm disabled:opacity-50"
             >
               Oldingi
             </button>
             
             {currentQ < test.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ(prev => prev + 1)}
                  disabled={!isAnswered}
                  className="px-8 py-4 rounded-xl font-black bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                >
                  Keyingi <ChevronRight className="h-5 w-5" />
                </button>
             ) : (
                <button
                  onClick={handleFinish}
                  disabled={!isAnswered || saving}
                  className="px-8 py-4 rounded-xl font-black bg-green-600 text-white shadow-xl shadow-green-200 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin"/> : null}
                  TESTNI YAKUNLASH
                </button>
             )}
          </div>
       </div>
    </div>
  );
}
