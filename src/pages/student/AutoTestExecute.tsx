import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, Award, RefreshCcw, Home } from 'lucide-react';

interface Question {
  text: string;
  options: string[];
  correctIdx: number;
}

interface AutoTest {
  id: string;
  title: string;
  questions: Question[];
  groupName: string;
}

export default function AutoTestExecute() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [test, setTest] = useState<AutoTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  
  // Track state for each question
  // questionIndex -> selectedOptionIndex
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  // questionIndex -> boolean (has the user committed/answered this question)
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, boolean>>({});

  const [isFinished, setIsFinished] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    async function fetchTest() {
      if (!testId) return;
      try {
        const snap = await getDoc(doc(db, 'auto_tests', testId));
        if (snap.exists()) {
          setTest({ id: snap.id, ...snap.data() } as AutoTest);
        } else {
          alert("Test topilmadi.");
          navigate('/student/auto-tests');
        }
      } catch (err) {
        console.error("Error fetching auto test:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [testId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-20 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!test || !test.questions || test.questions.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm mt-10">
        <h3 className="text-xl font-bold text-gray-900">Xatolik</h3>
        <p className="text-gray-500 mt-2">Test ma'lumotlari yuklanmadi yoki test savollari yo'q.</p>
        <Link to="/student/auto-tests" className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
          Ortga qaytish
        </Link>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQIdx];
  const isQuestionAnswered = answeredQuestions[currentQIdx];
  const userSelectedOptionIdx = selectedAnswers[currentQIdx];

  const handleSelectOption = (optionIdx: number) => {
    if (isQuestionAnswered) return; // Prevent changing answer once submitted

    setSelectedAnswers(prev => ({ ...prev, [currentQIdx]: optionIdx }));
    setAnsweredQuestions(prev => ({ ...prev, [currentQIdx]: true }));
  };

  const handleNext = () => {
    if (currentQIdx < test.questions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const calculateCorrectCount = () => {
    let correct = 0;
    test.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIdx) {
        correct++;
      }
    });
    return correct;
  };

  const handleFinish = async () => {
    setIsFinished(true);
    setSavingResult(true);
    try {
      const correctCount = calculateCorrectCount();
      const scorePercentage = Math.round((correctCount / test.questions.length) * 100);

      // Save result to Firestore
      await addDoc(collection(db, 'auto_test_results'), {
        testId: test.id,
        testTitle: test.title,
        studentId: user?.uid || 'GUEST',
        studentName: user?.displayName || 'Talaba',
        studentEmail: user?.email || '',
        groupName: test.groupName || user?.groupName || '',
        score: scorePercentage,
        correctCount,
        totalCount: test.questions.length,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error saving test result:", err);
    } finally {
      setSavingResult(false);
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setAnsweredQuestions({});
    setCurrentQIdx(0);
    setIsFinished(false);
  };

  // Render Result Screen
  if (isFinished) {
    const correctCount = calculateCorrectCount();
    const scorePercentage = Math.round((correctCount / test.questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">{test.title}</h2>
            <p className="text-gray-400 font-medium text-sm">Test muvaffaqiyatli yakunlandi!</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-2xl font-black text-gray-900">{test.questions.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Savollar</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/40">
              <p className="text-2xl font-black text-emerald-600">{correctCount}</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-1">To'g'ri</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-2xl font-black text-blue-600">{scorePercentage}%</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-1">Natija</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
            >
              <RefreshCcw className="w-5 h-5" />
              Qayta urinish
            </button>
            <Link
              to="/student/auto-tests"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md shadow-blue-100"
            >
              <Home className="w-5 h-5" />
              Barcha Avto Testlar
            </Link>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 px-1">Xatolarni ko'rib chiqish</h3>
          
          <div className="space-y-4">
            {test.questions.map((q, idx) => {
              const isCorrect = selectedAnswers[idx] === q.correctIdx;
              return (
                <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-bold text-gray-900 flex-1">{idx + 1}. {q.text}</p>
                    {isCorrect ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> To'g'ri
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold shrink-0">
                        <XCircle className="w-4 h-4" /> Noto'g'ri
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, oIdx) => {
                      const isCorrectOption = oIdx === q.correctIdx;
                      const isSelectedOption = oIdx === selectedAnswers[idx];

                      let cardStyle = 'bg-white border-gray-100 text-gray-600';
                      if (isCorrectOption) {
                        cardStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
                      } else if (isSelectedOption) {
                        cardStyle = 'bg-red-50 border-red-200 text-red-700 font-bold';
                      }

                      return (
                        <div key={oIdx} className={`px-4 py-3 rounded-xl border text-xs flex items-center gap-2.5 ${cardStyle}`}>
                          <span className={`w-2 h-2 rounded-full ${isCorrectOption ? 'bg-emerald-500' : isSelectedOption ? 'bg-red-500' : 'bg-gray-300'}`} />
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active Test Execution Screen
  const percentComplete = Math.round(((currentQIdx) / test.questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center justify-between">
        <Link to="/student/auto-tests" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition font-medium">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>
        <span className="text-xs font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">
          Guruh: {test.groupName}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-gray-400">
            <span>Savol {currentQIdx + 1} / {test.questions.length}</span>
            <span>{percentComplete}% Bajarildi</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${percentComplete}%` }} />
          </div>
        </div>

        {/* Question Area */}
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-snug">
            {currentQuestion.text}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((opt, oIdx) => {
              const isOptionSelected = userSelectedOptionIdx === oIdx;
              const isCorrectOption = oIdx === currentQuestion.correctIdx;

              let cardStyle = 'border-gray-200 hover:border-blue-300 hover:bg-slate-50/50 cursor-pointer text-gray-700';
              let badgeStyle = 'bg-gray-100 text-gray-500';

              if (isQuestionAnswered) {
                // Determine styles after being answered
                const isUserCorrect = userSelectedOptionIdx === currentQuestion.correctIdx;

                if (isUserCorrect) {
                  // User chose correct answer -> Chosen is green, others are red/dimmed
                  if (isCorrectOption) {
                    cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                    badgeStyle = 'bg-emerald-500 text-white';
                  } else {
                    cardStyle = 'border-red-200 bg-red-50/50 text-red-500 opacity-60';
                    badgeStyle = 'bg-red-200 text-red-600';
                  }
                } else {
                  // User chose incorrect answer -> Chosen is red, correct is green, others are red/dimmed
                  if (isCorrectOption) {
                    cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                    badgeStyle = 'bg-emerald-500 text-white';
                  } else if (isOptionSelected) {
                    cardStyle = 'border-red-500 bg-red-50 text-red-800 font-bold';
                    badgeStyle = 'bg-red-500 text-white';
                  } else {
                    cardStyle = 'border-red-200 bg-red-50/50 text-red-500 opacity-60';
                    badgeStyle = 'bg-red-200 text-red-600';
                  }
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  disabled={isQuestionAnswered}
                  onClick={() => handleSelectOption(oIdx)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${cardStyle}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${badgeStyle}`}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="text-sm font-semibold">{opt}</span>
                  </div>

                  {isQuestionAnswered && (isCorrectOption || isOptionSelected) && (
                    <span className="shrink-0">
                      {isCorrectOption ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        {isQuestionAnswered && (
          <div className="flex justify-end pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-lg hover:shadow-xl hover:shadow-blue-100"
            >
              {currentQIdx < test.questions.length - 1 ? (
                <>
                  Keyingi Savol
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Natijani Ko'rish
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
