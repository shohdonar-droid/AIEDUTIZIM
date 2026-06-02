import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, GraduationCap, Award, MessageSquare, LogOut, ChevronRight, Home, LayoutDashboard, Loader2, FileText, BrainCircuit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import StudentProfile from './StudentProfile';
import StudentGrades from './StudentGrades';
import StudentCourses from './StudentCourses';
import StudentTests from './StudentTests';
import StudentCertificates from './StudentCertificates';
import SubjectsManager from '../../components/SubjectsManager';
import SubjectRead from '../SubjectRead';
import ChatSection from '../ChatSection';
import { BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('isRead', '==', false)
    );
    const unsub = safeOnSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages (unread count)'));
    return unsub;
  }, [user]);

  const menuItems = [
    { name: 'Profil', path: '/student', icon: User },
    { name: 'Baholar', path: '/student/grades', icon: GraduationCap },
    { name: 'Kurslar', path: '/student/courses', icon: LayoutDashboard },
    { name: 'Testlar', path: '/student/tests', icon: FileText },
    { name: 'Mavzular', path: '/student/subjects', icon: BookOpen },
    { name: 'Sertifikatlar', path: '/student/certificates', icon: Award },
    { name: 'Chat', path: '/student/chat', icon: MessageSquare, badge: unreadCount },
  ];

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-gray-50 relative pb-16 md:pb-0">
      <AnimatePresence />

      {/* Sidebar - Desktop Only */}
      <aside className={`bg-white border-r border-gray-100 flex-col p-4 shadow-sm transition-all duration-300 relative group/sidebar ${isCollapsed ? 'md:w-24' : 'md:w-72'} hidden md:flex`}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-10 w-8 h-8 bg-white border border-gray-100 rounded-full items-center justify-center shadow-lg hover:bg-gray-50 transition-all z-20"
        >
          <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className={`flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 bg-gray-50/30 p-3 rounded-2xl overflow-hidden transition-all ${isCollapsed ? 'justify-center p-2' : ''}`}>
          <div className={`rounded-xl bg-white p-1 shadow-md border border-indigo-100 flex-shrink-0 flex items-center justify-center overflow-hidden transition-all ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
            {user?.photoURL ? (
              <img src={user.photoURL || null} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
            ) : (
              <User className="h-5 w-5 text-indigo-500" />
            )}
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden"
            >
              <p className="font-black text-gray-900 truncate uppercase text-[10px] tracking-tight">{user?.displayName}</p>
              <p className="text-[8px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-0.5">Talaba</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all group relative ${
                  active 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 transition-transform ${!active && 'group-hover:scale-110'}`} />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-bold text-sm flex-1 truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
                
                {item.badge && item.badge > 0 && (
                   <span className={`rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md ${isCollapsed ? 'absolute -top-1 -right-1 w-4 h-4' : 'w-5 h-5'}`}>
                     {item.badge}
                   </span>
                )}
                
                {!isCollapsed && !item.badge && (
                  <ChevronRight className={`h-4 w-4 transition-all ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-1">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-gray-500 hover:bg-gray-50 transition-all font-bold text-xs ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Saytga qaytish' : ''}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Saytga qaytish</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-xs w-full text-left ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Tizimdan chiqish' : ''}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Tizimdan chiqish</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar for Student Dashboard */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
        <div className="flex overflow-x-auto scrollbar-hide items-center justify-start gap-1 p-2">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-1 rounded-xl transition-all relative ${
                  active ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'fill-blue-600/10' : ''}`} />
                <span className="text-[10px] font-bold mt-1 whitespace-nowrap">{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-4 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

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
            <Route path="/subjects" element={<SubjectsManager />} />
            <Route path="/subjects/read/:id" element={<SubjectRead />} />
            <Route path="/certificates" element={<StudentCertificates />} />
            <Route path="/chat" element={<ChatSection />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}
