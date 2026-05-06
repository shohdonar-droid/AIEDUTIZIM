import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, FileText, Library, CheckCircle2, MessageSquare, LogOut, ChevronRight, GraduationCap, Home, BrainCircuit, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
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
import TeacherSubjects from '../../components/SubjectsManager';
import SubjectRead from '../SubjectRead';
import TeacherQuizizz from './TeacherQuizizz';

import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';

export default function TeacherDashboard() {
  const { user, logout, stopImpersonation } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const navItems = [
    { name: 'Asosiy ekran', path: '/teacher', icon: LayoutDashboard, exact: true },
    { name: 'Profil', path: '/teacher/profile', icon: User, exact: true },
    { name: 'Yo\'nalishlar', path: '/teacher/departments', icon: Users, hidden: user?.role === 'staff' },
    { name: 'Testlar', path: '/teacher/tests', icon: CheckCircle2, hidden: user?.role === 'staff' },
    { name: 'Mavzular', path: '/teacher/subjects', icon: BookOpen, hidden: user?.role === 'staff' },
    { name: 'Kurslar', path: '/teacher/courses', icon: Library, hidden: user?.role === 'staff' },
    { name: 'Talabalar', path: '/teacher/students', icon: Users, hidden: user?.role === 'staff' },
    { name: 'Jurnal', path: '/teacher/jurnal', icon: FileText, hidden: user?.role === 'staff' },
    { name: 'Quizizz', path: '/teacher/quizizz', icon: CheckCircle2, hidden: user?.role !== 'staff' },
    { name: 'Sertifikatlar', path: '/teacher/certificates', icon: FileText, hidden: user?.role === 'staff' },
    { name: 'Chat', path: '/teacher/chat', icon: MessageSquare, badge: unreadCount },
  ].filter(item => !item.hidden);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-[#f8f9fa]">
      <aside className={`bg-white border-r border-gray-100 flex flex-col md:sticky md:top-16 md:h-[calc(100vh-64px)] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 transition-all duration-300 relative group/sidebar ${isCollapsed ? 'md:w-24' : 'md:w-72'} w-full`}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-10 w-8 h-8 bg-white border border-gray-100 rounded-full items-center justify-center shadow-lg hover:bg-gray-50 transition-all z-20"
        >
          <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className={`p-4 flex items-center gap-4 border-b border-gray-100 relative overflow-hidden bg-gray-50/30 transition-all ${isCollapsed ? 'justify-center p-3' : ''}`}>
          <div className={`rounded-xl bg-white p-1 shadow-md border border-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden transition-all ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
            {user?.photoURL ? (
              <img src={user.photoURL || undefined} alt="Profile" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="w-full h-full bg-blue-50 flex items-center justify-center rounded-lg">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 min-w-0"
            >
              <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate leading-tight">
                {user?.displayName}
              </h2>
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                {user?.role === 'staff' ? 'Xodim' : (user?.role === 'admin' ? 'Administrator' : 'Tashkilot')}
              </p>
            </motion.div>
          )}
          {user?.isImpersonated && !isCollapsed && (
            <button 
              onClick={stopImpersonation} 
              className="absolute top-0 right-0 p-1.5 bg-orange-100 text-orange-700 rounded-bl-lg hover:bg-orange-200 transition-colors z-20"
              title="Panelga qaytish"
            >
              <LogOut className="w-3 h-3" />
            </button>
          )}
        </div>

        <nav className="flex-1 p-3 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all group relative ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 transition-transform ${!isActive && 'group-hover:scale-110'}`} />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm truncate flex-1"
                  >
                    {item.name}
                  </motion.span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                   <span className={`bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ${isCollapsed ? 'absolute -top-1 -right-1 w-4 h-4' : 'px-2 py-0.5'}`}>
                      {item.badge}
                   </span>
                )}
                {!isCollapsed && !item.badge && (
                  <ChevronRight className={`h-4 w-4 opacity-30 group-hover:opacity-100 transition-all ${isActive ? 'translate-x-1 opacity-100' : ''}`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-50 mt-auto bg-gray-50/30 space-y-1">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Saytga qaytish' : ''}
          >
            <Home className="h-4 w-4" />
            {!isCollapsed && <span>Saytga qaytish</span>}
          </Link>
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? 'Tizimdan chiqish' : ''}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Chiqish</span>}
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
            <Route path="/subjects" element={<TeacherSubjects />} />
            <Route path="/subjects/read/:id" element={<SubjectRead />} />
            <Route path="/students" element={<TeacherStudents />} />
            <Route path="/jurnal" element={<TeacherJurnal />} />
            <Route path="/quizizz" element={<TeacherQuizizz />} />
            <Route path="/certificates" element={<TeacherCertificates />} />
            <Route path="/chat" element={<TeacherChat />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
