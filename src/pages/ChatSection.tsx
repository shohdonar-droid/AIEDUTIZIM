import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, where, Timestamp, limit, getDocs, or, and, writeBatch, doc, getDoc } from 'firebase/firestore';
import { Message, UserProfile } from '../types';
import { Send, Loader2, User as UserIcon, Bell, MessageSquare, X, Reply } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatSection() {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyMsg, setReplyMsg] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, number>>({});
  const [adminTab, setAdminTab] = useState<'teachers' | 'students' | 'staff' | 'inquiries'>('teachers');

  // Load contacts
  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      // Admin sees everyone
      const q = query(collection(db, 'users'));
      const unsub = onSnapshot(q, (snap) => {
        const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
        // Filter out self and only show relevant roles for tabs
        const filtered = users.filter(u => u.uid !== user.uid && (u.role === 'teacher' || u.role === 'student' || u.role === 'staff' || u.isAnonymousContact));
        setContacts(filtered);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat-contacts-admin'));
      return unsub;
    } else {
      // Student contacts
      const fetchStudentContacts = async () => {
         try {
           const newContacts: any[] = [];
           
            // 1. Fetch Admins
            const aSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
            if (!aSnap.empty) {
               const allAdmins = aSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
               allAdmins.forEach(admin => {
                  newContacts.push({ ...admin, displayName: `${admin.displayName || 'Admin'} (Admin)` });
               });
            }

            // 2. Fetch Organization
            if (user.teacherId) {
               const tDoc = await getDoc(doc(db, 'users', user.teacherId));
               if (tDoc.exists()) {
                  newContacts.push({ uid: tDoc.id, ...tDoc.data(), displayName: `🏢 Tashkilot: ${tDoc.data().displayName}` });
               }

               // 3. Fetch Staff of this organization
               const sSnap = await getDocs(query(collection(db, 'users'), where('teacherId', '==', user.teacherId), where('role', '==', 'staff')));
               const staff = sSnap.docs.map(d => ({ uid: d.id, ...d.data(), displayName: `👤 Xodim: ${d.data().displayName}` } as any));
               newContacts.push(...staff);
            }

           // Check for SYSTEM_ADMIN messages
           const sysQ = query(collection(db, 'messages'), where('senderId', '==', 'SYSTEM_ADMIN'), where('receiverId', '==', user.uid), limit(1));
           const sysSnap = await getDocs(sysQ);
           if (!sysSnap.empty) {
              newContacts.unshift({
                 uid: 'SYSTEM_ADMIN',
                 id: 'SYSTEM_ADMIN',
                 displayName: '🔔 Tizim bildirishnomasi',
                 role: 'admin',
                 createdAt: Timestamp.now()
              } as any);
           }
           
           setContacts(newContacts);
         } catch (e) {
            console.error("List Fetch Error:", e);
            // If some fail, at least show what we have or a meaningful error context
            handleFirestoreError(e, OperationType.LIST, 'student-chat-contacts');
         }
      }
      fetchStudentContacts();
    }
  }, [user, isAdmin]);

  // Combine contacts with any missing senders from messages
  const [completeContacts, setCompleteContacts] = useState<UserProfile[]>([]);

  useEffect(() => {
     let newContacts = [...contacts];
     const existingIds = new Set(contacts.map(c => c.uid));
     
     if (isAdmin) {
        Object.keys(lastMessageTimes).forEach(senderId => {
           if (senderId && senderId !== 'undefined' && !existingIds.has(senderId) && senderId !== user?.uid && senderId !== 'SYSTEM_ADMIN') {
              newContacts.push({
                 uid: senderId,
                 id: senderId,
                 displayName: senderId.startsWith('anon_') ? 'Mehmon ' + senderId.slice(-4) : 'Noma\'lum Foydalanuvchi',
                 role: 'inquiry',
                 isAnonymousContact: true,
                 createdAt: Timestamp.now()
              } as any);
              existingIds.add(senderId);
           }
        });
     }
     setCompleteContacts(newContacts);
  }, [contacts, lastMessageTimes, isAdmin, user?.uid]);

  const filteredContacts = isAdmin 
    ? completeContacts.filter(c => {
        if (adminTab === 'inquiries') return c.isAnonymousContact || (!c.role && !c.isAnonymousContact);
        if (adminTab === 'teachers') return c.role === 'teacher' && !c.isAnonymousContact;
        if (adminTab === 'students') return c.role === 'student' && !c.isAnonymousContact;
        if (adminTab === 'staff') return c.role === 'staff' && !c.isAnonymousContact;
        return false;
      })
    : completeContacts;

  const adminUnreadCounts = {
    teachers: completeContacts.filter(c => c.role === 'teacher' && !c.isAnonymousContact).reduce((acc, c) => acc + (unreadCounts[c.uid] || 0), 0),
    students: completeContacts.filter(c => c.role === 'student' && !c.isAnonymousContact).reduce((acc, c) => acc + (unreadCounts[c.uid] || 0), 0),
    staff: completeContacts.filter(c => c.role === 'staff' && !c.isAnonymousContact).reduce((acc, c) => acc + (unreadCounts[c.uid] || 0), 0),
    inquiries: completeContacts.filter(c => c.isAnonymousContact || (!c.role && !c.isAnonymousContact)).reduce((acc, c) => acc + (unreadCounts[c.uid] || 0), 0),
  };

  // unread listener and message times
  useEffect(() => {
    if (user) {
      let counts1: Record<string, number> = {};
      let counts2: Record<string, number> = {};
      
      let times1: Record<string, number> = {};
      let times2: Record<string, number> = {};
      let times3: Record<string, number> = {};

      const updateAllCountsAndTimes = () => {
        const merged: Record<string, number> = { ...counts1 };
        Object.keys(counts2).forEach(key => {
          merged[key] = (merged[key] || 0) + counts2[key];
        });
        setUnreadCounts(merged);
        
        const mergedTimes: Record<string, number> = {};
        const allKeys = new Set([...Object.keys(times1), ...Object.keys(times2), ...Object.keys(times3)]);
        allKeys.forEach(k => {
           mergedTimes[k] = Math.max(times1[k] || 0, times2[k] || 0, times3[k] || 0);
        });
        setLastMessageTimes(mergedTimes);
      };

      const q1 = query(
        collection(db, 'messages'),
        where('receiverId', '==', user.uid)
      );

      const q2 = isAdmin ? query(
        collection(db, 'messages'),
        where('receiverRole', '==', 'admin')
      ) : null;

      const q3 = query(
        collection(db, 'messages'),
        where('senderId', '==', user.uid)
      );

      const extractTime = (d: any) => d.timestamp?.toMillis ? d.timestamp.toMillis() : (d.timestamp?.seconds ? d.timestamp.seconds * 1000 : 0);

      const unsub1 = onSnapshot(q1, (snap) => {
        const counts: Record<string, number> = {};
        const t: Record<string, number> = {};
        snap.docs.forEach(doc => {
          const d = doc.data();
          const senderId = d.senderId;
          const time = extractTime(d);
          t[senderId] = Math.max(t[senderId] || 0, time);
          if (!d.isRead) {
             counts[senderId] = (counts[senderId] || 0) + 1;
          }
        });
        counts1 = counts;
        times1 = t;
        updateAllCountsAndTimes();
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat-counts-times-1'));

      let unsub2 = () => {};
      if (q2) {
         unsub2 = onSnapshot(q2, (snap) => {
           const counts: Record<string, number> = {};
           const t: Record<string, number> = {};
           snap.docs.forEach(doc => {
             const d = doc.data();
             const senderId = d.senderId;
             const time = extractTime(d);
             t[senderId] = Math.max(t[senderId] || 0, time);
             if (!d.isRead) {
                counts[senderId] = (counts[senderId] || 0) + 1;
             }
           });
           counts2 = counts;
           times2 = t;
           updateAllCountsAndTimes();
         }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat-counts-times-2'));
      }

      const unsub3 = onSnapshot(q3, (snap) => {
         const t: Record<string, number> = {};
         snap.docs.forEach(doc => {
            const d = doc.data();
            const recId = d.receiverId;
            const time = extractTime(d);
            t[recId] = Math.max(t[recId] || 0, time);
         });
         times3 = t;
         updateAllCountsAndTimes();
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat-counts-times-3'));

      return () => {
        unsub1();
        unsub2();
        unsub3();
      };
    }
  }, [user, isAdmin]);

  // Messages listener
  useEffect(() => {
    if (!user || !selectedContactId) {
       setMessages([]);
       return;
    }

    // Use a single map to track messages to prevent duplication and simplify logic
    const messagesMap = new Map<string, Message>();

    const updateMessages = (newMsgs: Message[]) => {
      newMsgs.forEach(m => messagesMap.set(m.id, m));
      const sorted = Array.from(messagesMap.values()).sort((a, b) => {
        const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return t1 - t2;
      });
      setMessages(sorted);
      
      if (sorted.length > 0) {
        setTimeout(() => {
           if (scrollRef.current) {
              const container = scrollRef.current.parentElement;
              if (container) {
                 container.scrollTop = container.scrollHeight;
              }
           }
        }, 100);
      }

      // Mark unread messages as read
      const unreadMsgs = sorted.filter(m => (m.receiverId === user.uid || (isAdmin && m.receiverRole === 'admin')) && !m.isRead);
      if (unreadMsgs.length > 0) {
        const batch = writeBatch(db);
        unreadMsgs.forEach(m => {
          batch.update(doc(db, 'messages', m.id), { isRead: true });
        });
        batch.commit().catch(e => console.error("Mark read error:", e));
      }
    };

    // Query 1: Messages sent by this contact
    const q1 = query(
      collection(db, 'messages'),
      where('senderId', '==', selectedContactId)
    );

    // Query 2: Messages sent TO this contact
    const q2 = query(
      collection(db, 'messages'),
      where('receiverId', '==', selectedContactId)
    );

    const unsub1 = onSnapshot(q1, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      // For non-admins, filter to only show messages where we are the receiver
      // For admins, show messages where they are the receiver or it's an admin message
      const filtered = (isAdmin) 
        ? msgs.filter(m => m.receiverId === user.uid || m.receiverRole === 'admin') 
        : msgs.filter(m => m.receiverId === user.uid);
      updateMessages(filtered);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat-messages-1'));

    const unsub2 = onSnapshot(q2, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      // For non-admins, filter to only show messages where we are the sender
      // For admins, show messages sent by ANY admin if it's a conversation with this contact
      const filtered = (isAdmin) ? msgs : msgs.filter(m => m.senderId === user.uid);
      updateMessages(filtered);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat-messages-2'));

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, selectedContactId, isAdmin]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !selectedContactId) return;

    setLoading(true);
    try {
      const recipientDoc = await getDoc(doc(db, 'users', selectedContactId));
      const recipientData = recipientDoc.data();
      const receiverRole = recipientData?.role === 'admin' ? 'admin' : (selectedContactId === 'SYSTEM_ADMIN' ? 'admin' : null);

      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: selectedContactId,
        receiverRole: receiverRole,
        text: text.trim(),
        timestamp: Timestamp.now(),
        isRead: false,
        replyTo: replyMsg ? {
          id: replyMsg.id,
          text: replyMsg.text,
          senderId: replyMsg.senderId,
        } : null
      });
      setText('');
      setReplyMsg(null);
    } catch (err: any) {
      console.error("Send Error:", err);
      alert("Xabar yuborishda xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedFilteredContacts = [...filteredContacts].sort((a, b) => {
    const tA = lastMessageTimes[a.uid] || 0;
    const tB = lastMessageTimes[b.uid] || 0;
    return tB - tA; // latest first
  });

  const currentContact = completeContacts.find(c => (c.uid) === selectedContactId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-6">
      <header className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-white z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {isAdmin ? "Admin Chat" : "Chat"}
            </h2>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Onlayn
            </p>
          </div>
        </div>
        {window.innerWidth < 768 && selectedContactId ? (
          <button onClick={() => setSelectedContactId(null)} className="text-xs text-blue-600 font-bold hover:underline md:hidden">
            Ortga
          </button>
        ) : null}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={`w-full md:w-1/3 border-r border-gray-50 flex flex-col h-full bg-white ${selectedContactId ? 'hidden md:flex' : 'flex'}`}>
          {isAdmin && (
             <div className="p-2 flex gap-1 border-b border-gray-50 bg-gray-50/50 shrink-0">
                <button
                   onClick={() => setAdminTab('teachers')}
                   className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                      adminTab === 'teachers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                   }`}
                >
                   Tashkilotlar
                   {adminUnreadCounts.teachers > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full">
                         {adminUnreadCounts.teachers}
                      </span>
                   )}
                </button>
                <button
                   onClick={() => setAdminTab('students')}
                   className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                      adminTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                   }`}
                >
                   Talabalar
                   {adminUnreadCounts.students > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full">
                         {adminUnreadCounts.students}
                      </span>
                   )}
                </button>
                <button
                   onClick={() => setAdminTab('staff')}
                   className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                      adminTab === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                   }`}
                >
                   Xodimlar
                   {adminUnreadCounts.staff > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full">
                         {adminUnreadCounts.staff}
                      </span>
                   )}
                </button>
                <button
                   onClick={() => setAdminTab('inquiries')}
                   className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                      adminTab === 'inquiries' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                   }`}
                >
                   Murojaatlar
                   {adminUnreadCounts.inquiries > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full">
                         {adminUnreadCounts.inquiries}
                      </span>
                   )}
                </button>
             </div>
          )}
          <div className="p-4 border-b border-gray-50 flex items-center justify-between shrink-0">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Suhbatdoshlar</span>
             <div className="flex items-center gap-2">
                {isAdmin && (
                   <button 
                      onClick={async () => {
                         if (!confirm("Barcha xabarlar o'chirilsinmi?")) return;
                         const q = query(collection(db, 'messages'));
                         const snap = await getDocs(q);
                         const batch = writeBatch(db);
                         snap.docs.forEach(d => batch.delete(d.ref));
                         await batch.commit();
                         alert("Barcha xabarlar o'chirildi.");
                      }}
                      className="text-[10px] text-red-600 font-bold hover:underline border border-red-100 px-2 py-1 rounded-lg"
                   >
                      Tozalash
                   </button>
                )}
                <button
                   onClick={async () => {
                      if (!user) return;
                      const q = query(collection(db, 'messages'), where('receiverId', '==', user.uid), where('isRead', '==', false));
                      const snap = await getDocs(q);
                      if (snap.empty) return;
                      const batch = writeBatch(db);
                      snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
                      await batch.commit();
                   }}
                   className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                   O'qilgan qilish
                </button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sortedFilteredContacts.map(c => {
              const cid = c.uid || '';
              const unread = unreadCounts[cid] || 0;
              const isSelected = selectedContactId === cid;
              return (
                <button
                  key={cid}
                  onClick={() => setSelectedContactId(cid)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 transition-all border ${
                    isSelected ? 'bg-blue-50 border-blue-100' : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="font-bold text-gray-800 text-sm truncate">{c.displayName || 'Ismsiz'}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        {c.role === 'teacher' ? 'Tashkilot' : c.role === 'admin' ? 'Admin' : c.role === 'staff' ? 'Xodim' : (c.isAnonymousContact ? 'Saytdan xabar' : 'Talaba')}
                      </p>
                    </div>
                  </div>
                  {unread > 0 && (
                     <span className="min-w-[24px] h-[24px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`flex-1 flex flex-col min-w-0 h-full ${!selectedContactId ? 'hidden md:flex' : 'flex'}`}>
          {selectedContactId ? (
            <>
              <div className="p-4 border-b border-gray-50 bg-white flex items-center gap-3 shrink-0">
                 <button onClick={() => setSelectedContactId(null)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg shrink-0">
                    <X className="h-5 w-5" />
                 </button>
                 <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 truncate">{currentContact?.displayName || 'Ismsiz'}</h3>
                    <p className="text-xs text-gray-400">{currentContact?.role === 'admin' ? 'Tizim administratori' : currentContact?.role === 'teacher' ? 'Tashkilot profili' : 'Foydalanuvchi'}</p>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {messages.length > 0 ? messages.map((m) => {
                  const isMe = m.senderId === user?.uid;
                  return (
                    <div key={m.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`max-w-[85%] md:max-w-[80%] px-5 py-3.5 rounded-2xl shadow-sm ${
                          isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-50 text-gray-900 rounded-tl-none border border-gray-100'
                        }`}>
                          {m.replyTo && (
                             <div className={`text-xs pl-3 mb-2 py-1 border-l-2 ${isMe ? 'border-white/50 text-white/80 bg-white/10' : 'border-gray-300 text-gray-500 bg-gray-100'} rounded-r italic break-words`}>
                               {m.replyTo.text}
                             </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        </div>
                        <button onClick={() => setReplyMsg(m)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                           <Reply className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase tracking-tighter">
                        {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'HH:mm') : ''}
                      </span>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium italic">Xabarlar mavjud emas. Birinchi bo'lib yozing!</p>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              <footer className="p-4 md:p-6 border-t border-gray-50 bg-white shrink-0">
                {replyMsg && (
                   <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-t-2xl border border-blue-100 border-b-0">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Javob qaytarilmoqda</span>
                        <p className="text-sm text-gray-600 truncate">{replyMsg.text}</p>
                      </div>
                      <button type="button" onClick={() => setReplyMsg(null)} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                   </div>
                )}
                <form onSubmit={handleSend} className={`flex gap-3 ${replyMsg ? 'rounded-b-2xl border border-blue-100 border-t-0 p-3 bg-white' : ''}`}>
                  <input
                    type="text"
                    className="flex-1 px-5 py-3.5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-100 transition-all text-sm font-medium"
                    placeholder="Xabar yozing..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button
                    disabled={loading || !text.trim()}
                    type="submit"
                    className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10 text-center">
              <MessageSquare className="h-16 w-16 mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">Chapdan suhbatdoshni tanlang</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
