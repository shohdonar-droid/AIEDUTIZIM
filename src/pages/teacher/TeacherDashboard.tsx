import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, FileText, Library, CheckCircle2, MessageSquare, LogOut, ChevronRight, GraduationCap, Home, BrainCircuit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import TeacherProfile from './TeacherProfile';
import TeacherDepartments from './TeacherDepartments';
import TeacherCourses from './TeacherCourses';
import TeacherTests from './TeacherTests';
import TeacherStudents from './TeacherStudents';
import TeacherJurnal from './TeacherJurnal';
import TeacherCertificates from './TeacherCertificates';
import TeacherServices from './TeacherServices';
import TeacherChat from './TeacherChat';
import TeacherOverview from './TeacherOverview';

import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';

export default function TeacherDashboard() {
  const { user, logout, stopImpersonation } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => {
    async function loadNotif() {
      try {
        const snap = await getDoc(doc(db, 'siteContent', 'notifications'));
        if (snap.exists()) {
          setNotificationMsg(snap.data()?.insufficientFundsMessage || '');
        }
      } catch (err) {
        console.warn('Site content notifications could not be fetched:', err);
      }
    }
    loadNotif();
  }, []);

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
    if (!user || user.role === 'admin') return;
    
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
  }, [user?.ball]);

  const navItems = [
    { name: 'Asosiy ekran', path: '/teacher', icon: LayoutDashboard, exact: true },
    { name: 'Profil', path: '/teacher/profile', icon: User, exact: true },
    { name: 'Yo\'nalishlar', path: '/teacher/departments', icon: Users, hidden: user?.role === 'staff' },
    { name: 'Testlar', path: '/teacher/tests', icon: CheckCircle2 },
    { name: 'Kurslar', path: '/teacher/courses', icon: Library, hidden: user?.role === 'staff' },
    { name: 'Talabalar', path: '/teacher/students', icon: Users, hidden: user?.role === 'staff' },
    { name: 'Jurnal', path: '/teacher/jurnal', icon: FileText },
    { name: 'Sertifikatlar', path: '/teacher/certificates', icon: FileText, hidden: user?.role === 'staff' },
    { name: 'Xizmatlar', path: '/teacher/services', icon: BrainCircuit },
    { name: 'Chat', path: '/teacher/chat', icon: MessageSquare, badge: unreadCount },
  ].filter(item => !item.hidden);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-[#f8f9fa]">
      <aside className="w-full md:w-72 bg-white border-r border-gray-100/50 flex flex-col md:sticky md:top-16 md:h-[calc(100vh-64px)] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 transition-all duration-300">
        <div className="p-6 md:p-8 flex items-center gap-5 border-b border-gray-100 relative overflow-hidden group bg-gray-50/30">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-md border border-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL || undefined} alt="Profile" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="w-full h-full bg-blue-50 flex items-center justify-center rounded-xl">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate leading-tight">
              {user?.displayName}
            </h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">
              {user?.role === 'staff' ? 'Xodim' : (user?.role === 'admin' ? 'Administrator' : 'Tashkilot')}
            </p>
            {user?.role !== 'admin' && (
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                (user?.ball || 0) <= 3 
                  ? 'bg-red-50 text-red-600 animate-pulse ring-1 ring-red-200' 
                  : 'bg-blue-50 text-blue-600'
              }`}>
                <span>BALL: {user?.ball || 0}</span>
                {(user?.ball || 0) === 0 && <span className="opacity-70">[TO'LDIRING]</span>}
              </div>
            )}
            {(user?.ball || 0) <= 0 && notificationMsg && user?.role !== 'admin' && (
              <p className="text-[8px] text-red-500 font-bold mt-1 uppercase truncate opacity-80">{notificationMsg}</p>
            )}
          </div>
          {user?.isImpersonated && (
            <button 
              onClick={stopImpersonation} 
              className="absolute -top-1 -right-1 p-2 bg-orange-100 text-orange-700 rounded-bl-xl hover:bg-orange-200 transition-colors z-20"
              title="Panelga qaytish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white group-hover:shadow-sm'}`}>
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-indigo-600'}`} />
                  </div>
                  {item.name}
                </div>
                <div className="flex items-center gap-2">
                  {item.badge !== undefined && item.badge > 0 && (
                     <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                  )}
                  <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'text-white/70 translate-x-1' : 'text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5'}`} />
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50/50 mt-auto bg-gray-50/30 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 w-full px-4 py-3.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-semibold group"
          >
            <div className="p-2 bg-blue-100/50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Home className="h-5 w-5" />
            </div>
            Saytga qaytish
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-semibold group"
          >
            <div className="p-2 bg-red-100/50 rounded-lg group-hover:bg-red-100 transition-colors">
              <LogOut className="h-5 w-5" />
            </div>
            Tizimdan chiqish
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 md:pl-10 w-full overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-[1200px]">
          <Routes>
            <Route path="/" element={<TeacherOverview />} />
            <Route path="/profile" element={<TeacherProfile />} />
            <Route path="/departments" element={<TeacherDepartments />} />
            <Route path="/courses" element={<TeacherCourses />} />
            <Route path="/tests" element={<TeacherTests />} />
            <Route path="/students" element={<TeacherStudents />} />
            <Route path="/jurnal" element={<TeacherJurnal />} />
            <Route path="/certificates" element={<TeacherCertificates />} />
            <Route path="/services" element={<TeacherServices />} />
            <Route path="/chat" element={<TeacherChat />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
