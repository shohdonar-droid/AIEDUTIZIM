import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, limit, getDoc } from 'firebase/firestore';
import { Message, UserProfile } from '../../types';
import { Send, User as UserIcon } from 'lucide-react';

export default function TeacherChat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    async function loadContacts() {
      const orgId = user?.role === 'staff' ? user.teacherId : user?.uid;
      if (!orgId) return;

      // Load all admins but only prioritize Elyorbek
      const aSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
      const allAdmins = aSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      const elyorbek = allAdmins.find(a => a.displayName?.toUpperCase().includes('ELYORBEK'));
      const adminToShow = elyorbek || allAdmins[0];
      
      // Load organization owner if I am staff
      let ownerContact: UserProfile[] = [];
      if (user?.role === 'staff') {
        const oSnap = await getDoc(doc(db, 'users', orgId));
        if (oSnap.exists()) {
          ownerContact = [{ ...oSnap.data(), uid: oSnap.id } as UserProfile];
        }
      }

      // Load org students
      const sSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('teacherId', '==', orgId)));
      const students = sSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      
      // Check for SYSTEM_ADMIN messages
      const systemMsgQuery = query(collection(db, 'messages'), where('senderId', '==', 'SYSTEM_ADMIN'), where('receiverId', '==', user.uid), limit(1));
      const sysSnap = await getDocs(systemMsgQuery);
      let sysContact: UserProfile[] = [];
      if (!sysSnap.empty) {
        sysContact = [{
          uid: 'SYSTEM_ADMIN',
          displayName: 'Tizim bildirishnomasi',
          role: 'admin',
          createdAt: new Date()
        } as any];
      }
      
      // Sort students alphabetically by FISH
      students.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'uz-UZ'));

      const finalContacts: UserProfile[] = [...sysContact];
      // Only show ONE admin, prioritizing Elyorbek
      if (adminToShow) {
         finalContacts.push({
            ...adminToShow,
            displayName: adminToShow.displayName?.includes('Elyorbek') ? 'Elyorbek (Admin)' : adminToShow.displayName
         });
      }
      finalContacts.push(...ownerContact);
      finalContacts.push(...students);
      setContacts(finalContacts);
    }
    loadContacts();

    // Listen for unread messages targeting me
    const q = query(collection(db, 'messages'), where('receiverId', '==', user.uid), where('isRead', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const msg = doc.data() as Message;
        if (!counts[msg.senderId]) counts[msg.senderId] = 0;
        counts[msg.senderId]++;
      });
      setUnreadCounts(counts);
    }, (err) => {
      console.error("TeacherChat Unread Snapshot Error:", err);
    });

    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || !selectedContact) return;
    
    // Listen to messages between me and selected contact
    const q1 = query(collection(db, 'messages'), where('senderId', '==', user.uid), where('receiverId', '==', selectedContact.uid));
    const q2 = query(collection(db, 'messages'), where('senderId', '==', selectedContact.uid), where('receiverId', '==', user.uid));
    
    let msgs: Message[] = [];
    
    const unsub1 = onSnapshot(q1, (snap) => {
      const m1 = snap.docs.map(d => ({ ...d.data(), id: d.id } as Message));
      msgs = [...m1, ...msgs.filter(m => m.senderId !== user.uid)];
      msgs.sort((a,b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setMessages([...msgs]);
    }, (err) => {
      console.error("TeacherChat msg1 Snapshot Error:", err);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      const m2 = snap.docs.map(d => ({ ...d.data(), id: d.id } as Message));
      msgs = [...msgs.filter(m => m.senderId !== selectedContact.uid), ...m2];
      msgs.sort((a,b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setMessages([...msgs]);

      // Mark as read
      snap.docs.forEach(d => {
        if (!d.data().isRead) {
          updateDoc(doc(db, 'messages', d.id), { isRead: true });
        }
      });
    }, (err) => {
      console.error("TeacherChat msg2 Snapshot Error:", err);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedContact) return;
    
    const text = newMessage;
    setNewMessage('');
    
    await addDoc(collection(db, 'messages'), {
      senderId: user.uid,
      receiverId: selectedContact.uid,
      text: text,
      timestamp: serverTimestamp(),
      isRead: false
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-[70vh]">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">Chat</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map(c => (
            <button 
              key={c.uid}
              onClick={() => setSelectedContact(c)}
              className={`w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedContact?.uid === c.uid ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center relative flex-shrink-0">
                {c.photoURL ? <img src={c.photoURL || null} alt="" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-500" />}
                {unreadCounts[c.uid] > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCounts[c.uid]}
                  </span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-gray-900 truncate">{c.displayName || 'Ismsiz'}</p>
                <p className="text-xs text-gray-500 capitalize">{c.role === 'admin' ? 'Admin' : 'Talaba'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50/50">
        {selectedContact ? (
          <>
            <div className="h-16 border-b border-gray-100 bg-white flex items-center px-6">
              <span className="font-bold text-lg">{selectedContact.displayName || 'Ismsiz'}</span>
              <span className="ml-2 text-sm text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-lg">{selectedContact.role === 'admin' ? 'Admin' : 'Talaba'}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(m => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'}`}>
                      <p className="text-sm">{m.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Xabar yozish..."
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Suhbatdoshni tanlang
          </div>
        )}
      </div>
    </div>
  );
}
