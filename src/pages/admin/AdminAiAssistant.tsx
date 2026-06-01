import { useState, useRef, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Brain, Send, User, Bot, Loader2, Sparkles, Database, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AdminAiAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Salom, hurmatli administrator ${user?.displayName || 'Admin'}! Men sizning aqlli tizim yordamchingizman. 

Tizimdagi barcha ma'lumotlar, foydalanuvchilar, darslar va sertifikatlar bo'yicha har qanday savolingizga javob berishga har doim tayyorman. Menga quyidagicha murojaat qilishingiz mumkin:
- "Tizimda nechta talaba ro'yxatdan o'tgan?"
- "Tizimdagi yo'nalishlar xulosasini ber"
- "Platforma imkoniyatlarini qisqacha yozib ber"`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    async function loadStatsForContext() {
      try {
        const [usersSnap, coursesSnap, testsSnap, certsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'tests')),
          getDocs(collection(db, 'enrollments'))
        ]);
        
        const counts: Record<string, number> = {};
        usersSnap.forEach(d => {
          const r = d.data().role || 'student';
          counts[r] = (counts[r] || 0) + 1;
        });

        setDbStats({
          totalUsers: usersSnap.size,
          byRole: counts,
          totalCourses: coursesSnap.size,
          totalTests: testsSnap.size,
          totalCerts: certsSnap.size,
        });
      } catch (e) {
        console.error("Failed to load db stats for AI context", e);
      }
    }
    loadStatsForContext();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    setInput('');

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Gather system state into a compact text context block to feed to the model
      let systemContext = `Joriy muloqot vaqti: ${new Date().toLocaleString('uz-UZ')}\n`;
      if (dbStats) {
        systemContext += `Fazo statistikasi:
- Jami joriy ro'yxatdan o'tgan foydalanuvchilar: ${dbStats.totalUsers} ta
  - Tashkilotlar soni: ${dbStats.byRole.teacher || 0} ta
  - Xodimlar soni: ${dbStats.byRole.staff || 0} ta
  - Talabalar soni: ${dbStats.byRole.student || 0} ta
  - Telegram bot foydalanuvchilari soni: ${dbStats.byRole.bot_user || 0} ta
- Jami kurslar soni: ${dbStats.totalCourses} ta
- Jami tizim testlari soni: ${dbStats.totalTests} ta
- Jami muvaffaqiyatli dars yuklanmalar soni: ${dbStats.totalCerts} ta
`;
      }

      // Build chat history for context
      const chatHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userMsgText,
          history: chatHistory,
          userName: user?.displayName || 'Admin',
          isAdminMode: true,
          systemContext
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Serverda AI javob bermadi");
      }

      const aiMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: data.text || "Uzr, menda javob tayyorlashda muammo bo'ldi.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch(err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 2),
          sender: 'ai',
          text: `❌ Xatolik yuz berdi: ${err.message || 'Tarmoq bog\'lanishi yo\'q.'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-130px)]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Brain className="h-10 w-10 text-blue-600 animate-pulse" />
            AI YORDAMCHI
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Tizimdagi ma'lumotlar bilan bog'liq har qanday savolingizni bering.</p>
        </div>
      </header>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col min-h-0">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const isAi = m.sender === 'ai';
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-4 max-w-3xl ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  <div className={`p-3 rounded-2xl flex-shrink-0 flex items-center justify-center ${isAi ? 'bg-blue-50 text-blue-600 h-10 w-10' : 'bg-gray-100 text-gray-700 h-10 w-10'}`}>
                    {isAi ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className={`rounded-3xl p-5 md:p-6 shadow-sm relative ${
                    isAi 
                      ? 'bg-blue-50/50 text-gray-800 border border-blue-50/20' 
                      : 'bg-indigo-600 text-white'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    <span className={`text-[10px] mt-2 block text-right font-bold ${isAi ? 'text-gray-400' : 'text-indigo-200'}`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && (
            <div className="flex gap-4 max-w-3xl mr-auto">
              <div className="p-3 rounded-2xl flex-shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 h-10 w-10">
                <Bot className="h-5 w-5 animate-spin" />
              </div>
              <div className="bg-blue-50/30 rounded-3xl p-5 border border-blue-50/10 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800 font-bold tracking-tight">AI siz uchun ma'lumotlarni saralab javob yozmoqda...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex gap-4 items-center flex-shrink-0">
          <input
            type="text"
            disabled={loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Menga savol bering (masalan: Tizimdagi talabalarni tahlil qilib ber)..."
            className="flex-1 px-6 py-4 rounded-2xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold placeholder-gray-400 shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl shadow-lg transition-all"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
