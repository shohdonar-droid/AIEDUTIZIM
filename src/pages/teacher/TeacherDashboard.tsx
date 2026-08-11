import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, FileText, Library, CheckCircle2, MessageSquare, LogOut, ChevronRight, GraduationCap, Home, BrainCircuit, BookOpen, Building2, Phone, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import TeacherProfile from './TeacherProfile';
import TeacherDepartments from './TeacherDepartments';
import TeacherCourses from './TeacherCourses';
import TeacherTests from './TeacherTests';
import TeacherJurnal from './TeacherJurnal';
import TeacherCertificates from './TeacherCertificates';
import TeacherChat from './TeacherChat';
import TeacherOverview from './TeacherOverview';
import TeacherSubjects from '../../components/SubjectsManager';
import SubjectRead from '../SubjectRead';
import TeacherQuizizz from './TeacherQuizizz';
import TeacherBilling from './TeacherBilling';

// Mustaqil O'qituvchi Independent components
import IndependentOverview from './independent/IndependentOverview';
import IndependentDepartments from './independent/IndependentDepartments';
import IndependentGroups from './independent/IndependentGroups';
import IndependentStudents from './independent/IndependentStudents';
import IndependentSubjects from './independent/IndependentSubjects';
import IndependentTests from './independent/IndependentTests';
import IndependentQuizizz from './independent/IndependentQuizizz';
import IndependentExams from './independent/IndependentExams';
import IndependentCertificates from './independent/IndependentCertificates';
import IndependentAttendance from './independent/IndependentAttendance';
import IndependentJurnal from './independent/IndependentJurnal';
import IndependentLimits from './independent/IndependentLimits';
import IndependentContact from './independent/IndependentContact';

import { db } from '../../lib/firebase';
import { collection, query, where, getDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import safeOnSnapshot from '../../lib/safeSnapshot';
import { handleFirestoreError, OperationType } from '../../lib/firebase';

import AdminAcademic from '../admin/AdminAcademic';
import AdminUsers from '../admin/AdminUsers';

export default function TeacherDashboard() {
  const { user, logout, stopImpersonation } = useAuth();
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

  const isIndependent = (user?.role as string) === 'mustaqil_o_qituvchi';

  const menuStructure = isIndependent ? [
    { id: 'general', name: 'Asosiy', path: '/teacher', icon: LayoutDashboard, exact: true },
    { id: 'profile', name: 'Profil', path: '/teacher/profile', icon: User, exact: true },
    { id: 'departments', name: 'Yo\'nalishlar', path: '/teacher/departments', icon: Building2, exact: true },
    { id: 'groups', name: 'Guruhlar', path: '/teacher/groups', icon: Users, exact: true },
    { id: 'students', name: 'Talabalar', path: '/teacher/students', icon: GraduationCap, exact: true },
    { id: 'resources', name: 'Ta\'lim resurslari', icon: BookOpen, subItems: [
        { name: 'Mavzular', path: '/teacher/subjects' },
        { name: 'Testlar', path: '/teacher/tests' },
        { name: 'Quizizz', path: '/teacher/quizizz' },
        { name: 'Sertifikatlar', path: '/teacher/certificates' }
    ]},
    { id: 'monitoring', name: 'Monitoring', icon: FileText, subItems: [
        { name: 'Davomat', path: '/teacher/attendance' },
        { name: 'Jurnal', path: '/teacher/jurnal' },
    ]},
    { id: 'limits', name: 'Limitlar', path: '/teacher/limits', icon: Award, exact: true },
    { id: 'chat', name: 'Chat', path: '/teacher/chat', icon: MessageSquare, badge: unreadCount },
    { id: 'contact', name: 'Bog\'lanish', path: '/teacher/contact', icon: Phone, exact: true }
  ] : [
    { id: 'general', name: 'Umumiy', path: '/teacher', icon: LayoutDashboard, exact: true },
    { id: 'profile', name: 'Profil', path: '/teacher/profile', icon: User, exact: true },
    { id: 'academic', name: 'Akademik tuzilma', path: '/teacher/academic', icon: Building2, hidden: user?.role === 'staff' },
    { id: 'users', name: 'Foydalanuvchilar', icon: Users, hidden: user?.role === 'staff', subItems: [
        { name: 'Xodimlar', path: '/teacher/users/staff' },
        { name: 'Talabalar', path: '/teacher/users/students' },
    ]},
    { id: 'resources', name: 'Ta\'lim resurslari', icon: BookOpen, subItems: [
        { name: 'Kurslar', path: '/teacher/courses', hidden: user?.role === 'staff' },
        { name: 'Mavzular', path: '/teacher/subjects' },
        { name: 'Testlar', path: '/teacher/tests' },
        { name: 'Quizizz', path: '/teacher/quizizz' },
        { name: 'Sertifikatlar', path: '/teacher/certificates' }
    ].filter(s => !s.hidden)},
    { id: 'monitoring', name: 'Monitoring', icon: FileText, subItems: [
        { name: 'Davomat', path: '/teacher/attendance' },
        { name: 'Jurnal', path: '/teacher/jurnal' },
    ]},
    { id: 'chat', name: 'Chat', path: '/teacher/chat', icon: MessageSquare, badge: unreadCount },
    { id: 'billing', name: 'Tarif', path: '/teacher/billing', icon: Award, exact: true },
  ].filter(m => !m.hidden);

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setExpandedMenu(prev => (prev === id ? null : id));
  };

  const renderMenuItem = (item: any, isMobile = false) => {
    const Icon = item.icon;
    const isExpanded = expandedMenu === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isActive = item.exact 
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path);

    if (hasSubItems) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all text-gray-600 hover:bg-gray-50 hover:text-indigo-600 ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isMobile) && (
              <>
                <span className="text-sm truncate flex-1 text-left">{item.name}</span>
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </>
            )}
          </button>
          
          {(isExpanded && (!isCollapsed || isMobile)) && (
            <div className="ml-8 space-y-1 border-l border-gray-100 pl-3 mb-2">
              {item.subItems.map((sub: any) => (
                <Link
                  key={sub.path}
                  to={sub.path}
                  className={`block py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    location.pathname.startsWith(sub.path) ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all group relative ${
          isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
        } ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
        title={isCollapsed && !isMobile ? item.name : ''}
      >
        <Icon className={`h-5 w-5 flex-shrink-0 transition-transform ${!isActive && 'group-hover:scale-110'}`} />
        {(!isCollapsed || isMobile) && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm truncate flex-1"
          >
            {item.name}
          </motion.span>
        )}
        {item.badge !== undefined && item.badge > 0 && (
           <span className={`bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ${isCollapsed && !isMobile ? 'absolute -top-1 -right-1 w-4 h-4' : 'px-2 py-0.5'}`}>
              {item.badge}
           </span>
        )}
        {!isCollapsed && !item.badge && !isMobile && (
          <ChevronRight className={`h-4 w-4 opacity-30 group-hover:opacity-100 transition-all ${isActive ? 'translate-x-1 opacity-100' : ''}`} />
        )}
      </Link>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-[#f8f9fa] pb-16 md:pb-0">
      <aside className={`bg-white border-r border-gray-100 flex-col md:sticky md:top-16 md:h-[calc(100vh-64px)] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 transition-all duration-300 relative group/sidebar ${isCollapsed ? 'md:w-24' : 'md:w-72'} hidden md:flex`}>
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
                {user?.role === 'staff' ? 'Xodim' : (user?.role === 'admin' ? 'Administrator' : ((user?.role as string) === 'mustaqil_o_qituvchi' ? "Mustaqil O'qituvchi" : 'Tashkilot'))}
              </p>
              <p className="text-xs font-black text-amber-600 font-mono tracking-wider mt-1 truncate">
                ID: {user?.systemId || user?.uid}
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
          {menuStructure.map((item) => renderMenuItem(item))}
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

      {/* Mobile Bottom Bar for Teacher Dashboard */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
        <div className="flex overflow-x-auto scrollbar-hide items-center justify-start gap-1 p-2">
          {menuStructure.map((item) => {
             const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
             const Icon = item.icon;
             return (
               <Link
                 key={item.id}
                 to={item.path || (item.subItems && item.subItems[0].path)}
                 className={`flex flex-col items-center justify-center min-w-[80px] px-2 py-2 rounded-xl transition-all relative ${
                   isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'
                 }`}
               >
                 <Icon className={`h-5 w-5 ${isActive ? 'fill-indigo-600/10' : ''}`} />
                 <span className="text-[10px] font-bold mt-1 whitespace-nowrap">{item.name}</span>
                 {item.badge !== undefined && item.badge > 0 && (
                   <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                     {item.badge}
                   </span>
                 )}
               </Link>
             );
          })}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 md:pl-10 w-full overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-[1200px]">
          <Routes>
            {isIndependent ? (
              <>
                <Route path="/" element={<IndependentOverview />} />
                <Route path="/profile" element={<TeacherProfile />} />
                <Route path="/departments" element={<IndependentDepartments />} />
                <Route path="/groups" element={<IndependentGroups />} />
                <Route path="/students" element={<IndependentStudents />} />
                <Route path="/subjects" element={<TeacherSubjects />} />
                <Route path="/subjects/read/:id" element={<SubjectRead />} />
                <Route path="/tests" element={<TeacherTests />} />
                <Route path="/quizizz" element={<TeacherQuizizz />} />
                <Route path="/certificates" element={<TeacherCertificates />} />
                <Route path="/attendance" element={<IndependentAttendance />} />
                <Route path="/jurnal" element={<IndependentJurnal />} />
                <Route path="/limits" element={<IndependentLimits />} />
                <Route path="/chat" element={<TeacherChat />} />
                <Route path="/billing" element={<TeacherBilling />} />
                <Route path="/contact" element={<IndependentContact />} />
              </>
            ) : (
              <>
                <Route path="/" element={<TeacherOverview />} />
                <Route path="/profile" element={<TeacherProfile />} />
                <Route path="/academic" element={<AdminAcademic />} />
                <Route path="/users/:tab" element={<AdminUsers />} />
                <Route path="/departments" element={<TeacherDepartments />} />
                <Route path="/courses" element={<TeacherCourses />} />
                <Route path="/tests" element={<TeacherTests />} />
                <Route path="/subjects" element={<TeacherSubjects />} />
                <Route path="/subjects/read/:id" element={<SubjectRead />} />
                <Route path="/jurnal" element={<TeacherJurnal />} />
                <Route path="/quizizz" element={<TeacherQuizizz />} />
                <Route path="/certificates" element={<TeacherCertificates />} />
                <Route path="/chat" element={<TeacherChat />} />
                <Route path="/billing" element={<TeacherBilling />} />
              </>
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}
