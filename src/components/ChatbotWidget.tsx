import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, Timestamp, setDoc, doc, limit, updateDoc } from 'firebase/firestore';
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
  
  const isAdmin = user?.role === 'admin';
  const [adminView, setAdminView] = useState<'list' | 'chat'>('list');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adminChats, setAdminChats] = useState<any[]>([]);
  const [adminUnread, setAdminUnread] = useState(0);

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

  // Automated Birthday Congratulation
  useEffect(() => {
    if (!user || !user.uid || !adminId || adminId === 'SYSTEM_ADMIN') return;
    
    const checkBirthday = async () => {
      if (!user.birthDate) return;
      const [year, month, day] = user.birthDate.split('-');
      const today = new Date();
      if (today.getMonth() + 1 === parseInt(month) && today.getDate() === parseInt(day)) {
        const currentYear = today.getFullYear();
        const bdKey = `birthday_congrats_${currentYear}_${user.uid}`;
        if (localStorage.getItem(bdKey)) return;
        
        await addDoc(collection(db, 'messages'), {
          senderId: adminId,
          receiverId: user.uid,
          receiverRole: user.role || 'student',
          text: `🎉 Tug'ilgan kuningiz bilan, ${user.displayName}! Sizga uzoq umr, sihat-salomatlik va o'qishlaringizda ulkan muvaffaqiyatlar tilaymiz! 🎂`,
          timestamp: Timestamp.now(),
          isRead: false
        });
        
        localStorage.setItem(bdKey, '1');
      }
    };
    checkBirthday();
  }, [user, adminId]);

  // Automated Certificate Congratulation
  useEffect(() => {
    if (!user || !user.uid || !adminId || adminId === 'SYSTEM_ADMIN') return;

    const q = query(collection(db, 'certificates'), where('studentId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
       snap.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
             const cert = change.doc.data();
             const certKey = `cert_congrats_${change.doc.id}`;
             if (!localStorage.getItem(certKey)) {
                const createdTime = cert.createdAt?.toMillis ? cert.createdAt.toMillis() : (cert.createdAt?.seconds ? cert.createdAt.seconds * 1000 : 0);
                const now = Date.now();
                
                // Only congratulate if it was created within the last 15 minutes (or 1 day, let's say 24h just in case)
                // Actually 10 minutes is 600000 ms. We'll use 24 hours: 86400000
                if (now - createdTime < 86400000 && createdTime > 0) {
                   await addDoc(collection(db, 'messages'), {
                     senderId: adminId,
                     receiverId: user.uid,
                     receiverRole: user.role || 'student',
                     text: `🎓 Tabriklaymiz, ${user.displayName}! Siz "${cert.coursePrefix || 'yangi'}" sertifikatni qo'lga kiritdingiz. Keyingi ishlaringizda ham muvaffaqiyatlar tilaymiz! 🌟`,
                     timestamp: Timestamp.now(),
                     isRead: false
                   });
                }
                localStorage.setItem(certKey, '1');
             }
          }
       });
    });
    return () => unsub();
  }, [user, adminId]);

  // Automated Content Notification
  useEffect(() => {
    if (!user || !user.uid || !adminId || adminId === 'SYSTEM_ADMIN') return;
    
    const isForUser = (data: any) => {
        if (data.groupIds?.includes(user.groupId || '')) return true;
        if (data.departmentIds?.includes(user.departmentId || '')) return true;
        if (data.organizationIds?.includes(user.teacherId || '')) return true;
        return false;
    };

    const processAdded = async (change: any, typeName: string) => {
        const data = change.doc.data();
        const key = `notif_content_${change.doc.id}_${user.uid}`;
        if (localStorage.getItem(key)) return;
        
        const createdTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0);
        const now = Date.now();
        // Check if recently created (last 3 days) and not already notified
        if (now - createdTime < 3 * 24 * 3600 * 1000 && createdTime > 0) {
            if (isForUser(data)) {
               let text = `📢 Sizning guruhingiz uchun yangi ${typeName} ("${data.title}") yaratildi.`;
               if (data.endTime) {
                  let endDate = new Date(data.endTime);
                  if (data.endTime.toDate) endDate = data.endTime.toDate();
                  else if (data.endTime.seconds) endDate = new Date(data.endTime.seconds * 1000);
                  
                  if (endDate.getTime() > Date.now()) {
                      text += ` Iltimos, ${endDate.toLocaleString('uz-UZ').slice(0, 16)} gacha ishlashingiz kerak, keyin yopiladi.`;
                  }
               }
               
               await addDoc(collection(db, 'messages'), {
                 senderId: adminId,
                 receiverId: user.uid,
                 receiverRole: user.role || 'student',
                 text,
                 timestamp: Timestamp.now(),
                 isRead: false
               });
            }
        }
        localStorage.setItem(key, '1');
    };

    const unsubC = onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc'), limit(10)), snap => {
       snap.docChanges().forEach(c => { if (c.type === 'added') processAdded(c, 'kurs'); });
    });

    const unsubT = onSnapshot(query(collection(db, 'tests'), orderBy('createdAt', 'desc'), limit(10)), snap => {
       snap.docChanges().forEach(c => { 
           if (c.type === 'added') processAdded(c, c.doc.data().type === 'exam' ? 'imtihon' : 'test'); 
       });
    });

    const unsubS = onSnapshot(query(collection(db, 'subjects'), orderBy('createdAt', 'desc'), limit(10)), snap => {
       snap.docChanges().forEach(c => { if (c.type === 'added') processAdded(c, 'mavzu'); });
    });

    return () => { unsubC(); unsubT(); unsubS(); };
  }, [user, adminId]);

  // Load chats for Admin
  useEffect(() => {
    if (!isAdmin || !adminId || adminId === 'SYSTEM_ADMIN') return;
    
    // We listen to messages where receiver is admin to find all people who texted the admin/bot
    const q1 = query(collection(db, 'messages'), where('receiverId', '==', adminId));
    const unsub = onSnapshot(q1, async (snap) => {
       let unreadCount = 0;
       const senders = new Set<string>();
       const lastTimeMap: Record<string, number> = {};
       
       snap.docs.forEach(d => {
         const m = d.data();
         if (!m.isRead && m.senderId !== adminId) {
            unreadCount++;
         }
         if (m.senderId && m.senderId !== adminId) {
            senders.add(m.senderId);
            const mt = m.timestamp?.toMillis ? m.timestamp.toMillis() : (m.timestamp?.seconds ? m.timestamp.seconds * 1000 : 0);
            if (!lastTimeMap[m.senderId] || mt > lastTimeMap[m.senderId]) {
                 lastTimeMap[m.senderId] = mt;
            }
         }
       });
       
       setAdminUnread(unreadCount);
       
       const uids = Array.from(senders);
       if (uids.length === 0) {
          setAdminChats([]);
          return;
       }
       
       const usersSnap = await getDocs(collection(db, 'users'));
       const usersMap: Record<string, any> = {};
       usersSnap.forEach(d => {
          usersMap[d.id] = d.data();
       });
       
       const chatsList = uids.map(uid => {
          if (usersMap[uid]) {
             return { uid, ...usersMap[uid] };
          } else {
             return { 
                uid, 
                displayName: uid.startsWith('anon_') ? 'Mehmon ' + uid.slice(-4) : "Noma'lum Foydalanuvchi",
                role: 'inquiry'
             };
          }
       });
       chatsList.sort((a, b) => (lastTimeMap[b.uid] || 0) - (lastTimeMap[a.uid] || 0));
       setAdminChats(chatsList);
    });
    return () => unsub();
  }, [isAdmin, adminId]);

  useEffect(() => {
    if (!chatId || !isOpen) return;

    const messagesMap = new Map<string, any>();

    const updateMessages = (newMsgs: any[]) => {
      newMsgs.forEach(m => messagesMap.set(m.id, m));
      const sorted = Array.from(messagesMap.values())
        .filter((m: any) => 
          (m.senderId === chatId && m.receiverId === adminId) || 
          (m.senderId === adminId && m.receiverId === chatId)
        )
        .sort((a, b) => {
          const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
          const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
          return t1 - t2;
        });
      setMessages(sorted);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // Mark unread messages as read
      const unreadMsgs = sorted.filter(m => 
         (m.receiverId === user?.uid || (isAdmin && m.receiverRole === 'admin')) 
         && !m.isRead 
         && m.senderId !== (user?.uid || adminId)
      );
      if (unreadMsgs.length > 0 && isOpen && (!isAdmin || adminView === 'chat')) {
         unreadMsgs.forEach(m => {
            updateDoc(doc(db, 'messages', m.id), { isRead: true }).catch(console.error);
         });
      }
    };

    const q1 = query(collection(db, 'messages'), where('senderId', '==', chatId), where('receiverId', '==', adminId));
    const q2 = query(collection(db, 'messages'), where('senderId', '==', adminId), where('receiverId', '==', chatId));

    const unsub1 = onSnapshot(q1, snap => {
      updateMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsub2 = onSnapshot(q2, snap => {
      updateMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
    };
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

      if (isAdmin && adminView === 'chat' && selectedUser) {
        // Admin replying directly to a user
        await addDoc(collection(db, 'messages'), {
          senderId: adminId,         // Admin sends
          receiverId: selectedUser.uid, // to User
          receiverRole: selectedUser.role || 'inquiry',
          text: textToSend,
          timestamp: Timestamp.now(),
          isRead: false
        });
      } else {
        // Normal user sending to Admin/Bot
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

        // Query Gemini API
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

        // Save AI response to DB from "Admin"
        await addDoc(collection(db, 'messages'), {
          senderId: adminId,
          receiverId: currentId,
          receiverRole: user?.role || 'student',
          text: aiResponseText,
          timestamp: Timestamp.now(),
          isRead: false
        });
      }

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
                  {isAdmin && adminView === 'chat' ? (
                     <button onClick={() => {
                        setAdminView('list');
                        setSelectedUser(null);
                        setChatId(`chatbot_admin_${user.uid}`);
                     }} className="p-2 -ml-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                     </button>
                  ) : (
                     <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Bot className="w-6 h-6 text-white" />
                     </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                       {isAdmin && adminView === 'chat' && selectedUser ? selectedUser.displayName : (isAdmin && adminView === 'list' ? 'Suhbatdoshlar' : 'Aqlli Yordamchi')}
                    </h3>
                    <p className="text-blue-100 text-[10px] uppercase tracking-widest">
                       {isAdmin && adminView === 'chat' ? (selectedUser?.role === 'inquiry' ? 'Mehmon' : 'Foydalanuvchi') : 'Doim Onlayn'}
                    </p>
                  </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
               </button>
            </div>

            {isAdmin && adminView === 'list' ? (
              <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-h-0 custom-scrollbar divide-y divide-gray-100 p-2 space-y-1">
                 <button 
                    onClick={() => {
                       setSelectedUser(null);
                       setChatId(`chatbot_admin_${user.uid}`);
                       setAdminView('chat');
                    }}
                    className="w-full text-left p-3 hover:bg-white bg-blue-50/50 rounded-xl transition-colors flex items-center gap-3 border border-blue-100"
                 >
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shrink-0">
                       <Bot className="w-5 h-5 relative z-10" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-sm text-blue-900 truncate">Aqlli Yordamchi</h4>
                       <p className="text-xs text-blue-600 truncate">Sun'iy intellekt bilan suhbat</p>
                    </div>
                 </button>
                 
                 <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 pt-4 pb-1">Murojaatlar ({adminChats.length})</div>
                 
                {adminChats.length === 0 ? (
                   <div className="flex flex-col justify-center items-center text-center opacity-50 py-10">
                      <MessageCircle className="w-8 h-8 mb-2" />
                      <p className="text-sm">Boshqa suhbatlar yo'q</p>
                   </div>
                ) : (
                   adminChats.map(c => (
                     <button 
                        key={c.uid}
                        onClick={() => {
                           setSelectedUser(c);
                           setChatId(c.uid);
                           setAdminView('chat');
                        }}
                        className="w-full text-left p-3 hover:bg-white bg-gray-50 rounded-xl transition-colors flex items-center gap-3 border border-transparent hover:border-gray-100"
                     >
                        <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center shrink-0">
                           <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-sm text-gray-900 truncate">{c.displayName}</h4>
                           <p className="text-xs text-gray-500 truncate">{c.role === 'inquiry' ? 'Sayt mehmoni' : 'Foydalanuvchi'}</p>
                        </div>
                     </button>
                   ))
                )}
              </div>
            ) : (
               <>
                 {/* Chat Area */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col min-h-0 custom-scrollbar">
                    {messages.length === 0 && (
                       <div className="flex-1 flex flex-col justify-center items-center text-center opacity-50">
                          <Bot className="w-12 h-12 mb-3 mt-10" />
                          <p className="text-sm px-4">Salom! Men sizning aqlli yordamchingizman. Sizga qanday yordam bera olaman?</p>
                       </div>
                    )}
                    {messages.map((msg) => {
                      const isMe = msg.senderId === (isAdmin && adminView === 'chat' && selectedUser ? adminId : chatId);
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
               </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        drag
        dragMomentum={false}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group overflow-hidden ${isAdmin && adminUnread > 0 && !isOpen ? 'animate-bounce' : ''}`}
      >
        <span className="absolute inset-0 bg-white/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity"></span>
        {isAdmin && adminUnread > 0 && !isOpen && (
           <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-20">
              {adminUnread}
           </span>
        )}
        {isOpen ? <X className="w-6 h-6 relative z-10" /> : <MessageCircle className="w-6 h-6 relative z-10" />}
      </motion.button>
    </>
  );
}
