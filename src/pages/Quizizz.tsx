import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { Loader2, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Quizizz() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [session, setSession] = useState<any>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Restore session from localStorage if exists
  useEffect(() => {
    const savedPid = localStorage.getItem('quiz_participant_id');
    const savedPin = localStorage.getItem('quiz_pin');
    if (savedPid && savedPin) {
      setPin(savedPin);
      setParticipantId(savedPid);
      joinSession(savedPin, savedPid, true);
    }
  }, []);

  useEffect(() => {
    if (!session || !session.id) return;
    const unsub = onSnapshot(doc(db, 'quiz_sessions', session.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSession({ id: snap.id, ...data });
        
        // Reset selected option when question changes
        if (data.status === 'active' && data.questionStartTime) {
           // We need to know if the question index changed. So we can clear selection.
           // In this simplified version, let's just use question startTime as a trigger
           // If a new question starts, the startTime will change Server side.
           const elapsed = Math.floor((Date.now() - data.questionStartTime) / 1000);
           const remain = Math.max(15 - elapsed, 0);
           setTimeLeft(remain);
        }
      }
    });
    return unsub;
  }, [session?.id]);
  
  // Track previous question index to clear selected options
  useEffect(() => {
     setSelectedOption(null);
  }, [session?.currentQuestionIndex]);

  useEffect(() => {
    if (session?.status === 'active' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(prev - 1, 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [session?.status, timeLeft]);

  const joinSession = async (pinCode: string, pId?: string, isRestore = false) => {
    setLoading(true);
    setError('');
    try {
      const sRef = doc(db, 'quiz_sessions', pinCode.toUpperCase());
      const sSnap = await getDoc(sRef);
      if (!sSnap.exists()) {
        setError('Bunday PIN kodli test topilmadi.');
        setLoading(false);
        return;
      }
      
      const sData = sSnap.data();
      if (sData.status !== 'waiting' && !isRestore) {
        setError('Test allaqachon boshlangan yoki tugallangan.');
        setLoading(false);
        return;
      }

      setSession({ id: sRef.id, ...sData });

      if (pId) {
        const pRef = doc(db, 'quiz_participants', pId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
           setName(pSnap.data().name);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    joinSession(pin.trim());
  };

  const handleRegisterName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !session || !session.id) return;
    setLoading(true);
    
    try {
      const newPid = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, 'quiz_participants', newPid), {
        sessionId: session.id,
        name: name.trim(),
        score: 0,
        answers: {},
        joinedAt: Date.now()
      });
      
      setParticipantId(newPid);
      localStorage.setItem('quiz_participant_id', newPid);
      localStorage.setItem('quiz_pin', session.id);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (option: string) => {
    if (!participantId || !session || timeLeft === 0 || selectedOption) return;
    
    setSelectedOption(option);
    
    const currentQIndex = session.currentQuestionIndex;
    const question = session.questions[currentQIndex];
    const isCorrect = option === question.correctAnswer;
    const timeTaken = 15 - timeLeft;

    try {
      const pRef = doc(db, 'quiz_participants', participantId);
      const updateData = {
        [`answers.${currentQIndex}`]: {
          option,
          isCorrect,
          timeTaken
        }
      };
      
      await updateDoc(pRef, updateData);
    } catch (err) {
      console.error(err);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Quizizz'ga ulanish</h1>
          <p className="text-gray-500 mb-8">Testda qatnashish uchun PIN kodni kiriting.</p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <input 
              type="text" 
              placeholder="PIN KOD" 
              maxLength={8}
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full text-center text-3xl tracking-widest font-black px-4 py-4 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-colors"
            />
            {error && <p className="text-red-500 font-bold">{error}</p>}
            <button 
              type="submit" 
              disabled={loading || pin.length !== 8}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'KIRISH'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!participantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Ism familiyangiz (F.I.SH)</h2>
          <p className="text-gray-500 mb-6">Testda qatnashish uchun ism familiyangizni kiriting.</p>
          
          <form onSubmit={handleRegisterName} className="space-y-4">
            <input 
              type="text" 
              placeholder="Ism Familiya" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-center text-xl font-bold px-4 py-4 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-colors"
            />
            {error && <p className="text-red-500 font-bold">{error}</p>}
            <button 
              type="submit" 
              disabled={loading || !name.trim()}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              QATNASHISH
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (session.status === 'waiting') {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4 text-white text-center">
        <h2 className="text-4xl font-black mb-4">Siz muvaffaqiyatli ulandingiz!</h2>
        <p className="text-xl text-blue-100 mb-12">O'qituvchi testni boshlashini kuting...</p>
        <Loader2 className="w-12 h-12 animate-spin text-white/50 mx-auto" />
      </div>
    );
  }
  
  if (session.status === 'starting') {
     return (
       <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4 text-white text-center">
          <h2 className="text-6xl font-black mb-4 animate-bounce">TAYYORGARLIK...</h2>
          <p className="text-2xl text-blue-100">Test hozir boshlanadi!</p>
       </div>
     );
  }

  if (session.status === 'finished') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Test yakunlandi!</h2>
          <p className="text-gray-500 mb-8">Natijalar o'qituvchi ekranida ko'rsatiladi.</p>
          <button 
            onClick={() => {
              localStorage.removeItem('quiz_participant_id');
              localStorage.removeItem('quiz_pin');
              window.location.reload();
            }}
            className="w-full py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions?.[session.currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-6 py-4 border-b flex justify-between items-center shadow-sm">
        <div className="font-bold text-gray-600">
          Savol {session.currentQuestionIndex + 1} / {session.questions.length}
        </div>
        <div className={`font-black text-3xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl flex-1 flex flex-col justify-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center leading-relaxed">
            {currentQuestion.text}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options?.map((option: string, i: number) => {
            const isSelected = selectedOption === option;
            const colors = [
              'bg-red-500 hover:bg-red-600',
              'bg-blue-500 hover:bg-blue-600',
              'bg-yellow-500 hover:bg-yellow-600',
              'bg-green-500 hover:bg-green-600'
            ];
            const colorClass = colors[i % colors.length];
            const opacityClass = selectedOption && !isSelected ? 'opacity-40 scale-95' : 'hover:scale-105';
            
            return (
              <button
                key={i}
                onClick={() => handleAnswer(option)}
                disabled={!!selectedOption || timeLeft === 0}
                className={`p-6 rounded-3xl text-white font-black text-xl md:text-2xl transition-all shadow-lg flex items-center justify-center min-h-[120px] ${colorClass} ${opacityClass}`}
              >
                {option}
              </button>
            )
          })}
        </div>
        
        {selectedOption && (
          <div className="mt-8 text-center text-gray-500 font-bold animate-pulse">
            Javob qabul qilindi. Boshqalarni kuting...
          </div>
        )}
      </div>
    </div>
  );
}
