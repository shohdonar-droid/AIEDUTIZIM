import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, Timestamp, setDoc, doc, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export function ChatbotWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chatId, setChatId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string>('SYSTEM_ADMIN');

  useEffect(() => {
    // Find an admin Id
    const findAdmin = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdminId(snap.docs[0].id);
        } else {
          // Fallback
          const fallbackSnap = await getDocs(query(collection(db, 'users'), where('email', 'in', ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com']), limit(1)));
          if (!fallbackSnap.empty) setAdminId(fallbackSnap.docs[0].id);
        }
      } catch (e) {
        console.error("Adminni topishda xatolik:", e);
      }
    };
    findAdmin();
  }, []);

  useEffect(() => {
    let currentChatId = user?.role === 'admin' ? `chatbot_admin_${user.uid}` : user?.uid;
    if (!currentChatId) {
      let savedAnon = localStorage.getItem('ai_anon_id');
      if (savedAnon) {
        currentChatId = savedAnon;
      }
    }
    
    if (currentChatId) {
       setChatId(currentChatId);
    }
  }, [user]);

  useEffect(() => {
    if (!chatId || !isOpen) return;

    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [chatId, adminId]),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => 
          (m.senderId === chatId && m.receiverId === adminId) || 
          (m.senderId === adminId && m.receiverId === chatId)
        );
      
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [chatId, isOpen, adminId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const textToSend = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      let currentId = chatId;

      // Create anon user if needed
      if (!currentId) {
        currentId = 'anon_' + Date.now().toString(36);
        localStorage.setItem('ai_anon_id', currentId);
        setChatId(currentId);
        
        // Register in DB so Admin can see
        await setDoc(doc(db, 'users', currentId), {
          uid: currentId,
          displayName: currentId.startsWith('chatbot_admin_') ? 'ADMIN' : ('Mehmon ' + currentId.slice(-4)),
          role: 'inquiry',
          isAnonymousContact: true,
          createdAt: Timestamp.now()
        });
      }

      // 1. Add user message to Firestore
      await addDoc(collection(db, 'messages'), {
        senderId: currentId,
        receiverId: adminId,
        receiverRole: 'admin',
        text: textToSend,
        timestamp: Timestamp.now(),
        isRead: false
      });

      // Format history for AI
      const historyForAI = messages.map(m => ({
        role: m.senderId === currentId ? 'user' : 'model',
        text: m.text
      }));

      // 2. Query Gemini API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend, history: historyForAI, userName: user?.displayName || 'Mehmon' })
      });
      
      let aiResponseText = "Kechirasiz, sun'iy intellekt xizmatida xatolik yuz berdi.";
      if (response.ok) {
        const data = await response.json();
        if (data.reply) aiResponseText = data.reply;
        if (data.error) aiResponseText = data.error;
      } else {
        const data = await response.json().catch(() => null);
        if (data && data.error) aiResponseText = data.error;
      }

      // 3. Save AI response to DB from "Admin"
      await addDoc(collection(db, 'messages'), {
        senderId: adminId,
        receiverId: currentId,
        receiverRole: user?.role || 'student',
        text: aiResponseText,
        timestamp: Timestamp.now(),
        isRead: false
      });

    } catch (error) {
      console.error("Chat error:", error);
      // Fallback message
      if (chatId) {
         await addDoc(collection(db, 'messages'), {
            senderId: adminId,
            receiverId: chatId,
            text: "Kechirasiz, tizimga ulanishda xatolik.",
            timestamp: Timestamp.now(),
            isRead: false
         });
      }
    } finally {
      setLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50 flex-shrink-0"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                     <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Aqlli Yordamchi</h3>
                    <p className="text-blue-100 text-[10px] uppercase tracking-widest">Doim Onlayn</p>
                  </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
               </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col min-h-0 custom-scrollbar">
               {messages.length === 0 && (
                  <div className="flex-1 flex flex-col justify-center items-center text-center opacity-50">
                     <Bot className="w-12 h-12 mb-3 mt-10" />
                     <p className="text-sm px-4">Salom! Men sizning aqlli yordamchingizman. Sizga qanday yordam bera olaman?</p>
                  </div>
               )}
               {messages.map((msg) => {
                 const isMe = msg.senderId === chatId;
                 return (
                   <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                       {msg.text}
                     </div>
                   </div>
                 );
               })}
               {loading && (
                 <div className="flex justify-start">
                   <div className="max-w-[80%] rounded-2xl p-4 bg-white border border-gray-100 rounded-bl-sm shadow-sm flex items-center gap-2">
                     <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                     <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                     <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                   </div>
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
               <input 
                 type="text" 
                 placeholder="Xabar yozing..." 
                 className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 disabled={loading}
               />
               <button 
                 type="submit" 
                 disabled={!inputText.trim() || loading}
                 className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
               >
                 <Send className="w-5 h-5" />
               </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group overflow-hidden"
      >
        <span className="absolute inset-0 bg-white/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity"></span>
        {isOpen ? <X className="w-6 h-6 relative z-10" /> : <MessageCircle className="w-6 h-6 relative z-10" />}
      </button>
    </>
  );
}
