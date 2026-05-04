import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, GraduationCap, Award, MessageSquare, LogOut, ChevronRight, Home, LayoutDashboard, Loader2, FileText, BrainCircuit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, onSnapshot, where, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import StudentProfile from './StudentProfile';
import StudentGrades from './StudentGrades';
import StudentCourses from './StudentCourses';
import StudentTests from './StudentTests';
import StudentCertificates from './StudentCertificates';
import StudentServices from './StudentServices';
import ChatSection from '../ChatSection';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('isRead', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages (unread count)'));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const checkBallAndNotify = async () => {
      if (user.ball === 3) {
        const lastNotif = localStorage.getItem(`notif_ball3_${user.uid}`);
        const today = new Date().toDateString();
        if (lastNotif === today) return;

        try {
          await addDoc(collection(db, 'messages'), {
            senderId: 'system',
            senderName: 'Tizim',
            receiverId: user.uid,
            text: "Diqqat! Hisobingizda 3 ta ball qoldi. Iltimos, hisobingizni to'ldiring.",
            isRead: false,
            createdAt: serverTimestamp()
          });
          localStorage.setItem(`notif_ball3_${user.uid}`, today);
        } catch (e) {
          console.error("Notif error:", e);
        }
      }
    };
    checkBallAndNotify();
  }, [user?.ball, user?.uid]);

  const menuItems = [
    { name: 'Profil', path: '/student', icon: User },
    { name: 'Baholar', path: '/student/grades', icon: GraduationCap },
    { name: 'Kurslar', path: '/student/courses', icon: LayoutDashboard },
    { name: 'Testlar', path: '/student/tests', icon: FileText },
    { name: 'Sertifikatlar', path: '/student/certificates', icon: Award },
    { name: 'Xizmatlar', path: '/student/services', icon: BrainCircuit },
    { name: 'Chat', path: '/student/chat', icon: MessageSquare, badge: unreadCount },
  ];

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-gray-50 relative">
      <AnimatePresence />

      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-100 flex flex-col p-6 shadow-sm">
        <div className="flex items-center gap-5 mb-10 pb-6 border-b border-gray-100 bg-gray-50/30 p-4 rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-md border border-indigo-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL || null} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <User className="h-6 w-6 text-indigo-500" />
            )}
          </div>
          <div className="overflow-hidden">
            <p className="font-black text-gray-900 truncate uppercase text-xs tracking-tight">{user?.displayName}</p>
            <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-0.5">Talaba</p>
            <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all ${
              (user?.ball || 0) <= 3 
                ? 'bg-red-50 text-red-600 animate-pulse ring-1 ring-red-100' 
                : 'bg-blue-50 text-blue-600'
            }`}>
              Ball: {user?.ball || 0}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                  active 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-semibold flex-1">{item.name}</span>
                {item.badge && item.badge > 0 ? (
                   <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-md">
                     {item.badge}
                   </span>
                ) : (
                  <>
                    {active && <ChevronRight className="h-4 w-4" />}
                    {!active && <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            <Home className="h-5 w-5" />
            Saytga qaytish
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors font-medium w-full text-left"
          >
            <LogOut className="h-5 w-5" />
            Tizimdan chiqish
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           key={location.pathname}
           className="max-w-5xl mx-auto"
        >
          <Routes>
            <Route path="/" element={<StudentProfile />} />
            <Route path="/grades" element={<StudentGrades />} />
            <Route path="/courses" element={<StudentCourses />} />
            <Route path="/tests" element={<StudentTests />} />
            <Route path="/certificates" element={<StudentCertificates />} />
            <Route path="/services" element={<StudentServices />} />
            <Route path="/chat" element={<ChatSection />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}
