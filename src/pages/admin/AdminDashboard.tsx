import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Info, 
  Dock, 
  BookOpen, 
  Brain, 
  Users as UsersIcon, 
  TrendingUp, 
  Award, 
  Settings, 
  LogOut, 
  Home,
  ChevronRight,
  MessageSquare,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth, db } from '../../lib/firebase';
import { collection, query, onSnapshot, where, or, and } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminOverview from './AdminOverview';
import AdminBanner from './AdminBanner';
import AdminInfo from './AdminInfo';
import AdminFooter from './AdminFooter';
import AdminCourses from './AdminCourses';
import AdminDepartments from './AdminDepartments';
import AdminTests from './AdminTests';
import AdminUsers from './AdminUsers';
import AdminJurnal from './AdminJurnal';
import AdminCertificates from './AdminCertificates';
import AdminNotifications from './AdminNotifications';
import AdminBilling from './AdminBilling';
import AdminQuizizz from './AdminQuizizz';
import AdminServices from './AdminServices';
import AdminSubjects from '../../components/SubjectsManager';
import SubjectRead from '../SubjectRead';
import ChatSection from '../ChatSection';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Split into two listeners to avoid complex OR query issues and potential index requirements
    let count1 = 0;
    let count2 = 0;

    const q1 = query(
      collection(db, 'messages'),
      where('isRead', '==', false),
      where('receiverId', '==', user.uid)
    );

    const q2 = query(
      collection(db, 'messages'),
      where('isRead', '==', false),
      where('receiverRole', '==', 'admin')
    );

    const unsub1 = onSnapshot(q1, (snap) => {
      count1 = snap.docs.length;
      setUnreadCount(count1 + count2);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages (unread count 1)'));

    const unsub2 = onSnapshot(q2, (snap) => {
      count2 = snap.docs.length;
      setUnreadCount(count1 + count2);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages (unread count 2)'));

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const menuItems = [
    { name: 'Umumiy', path: '/admin', icon: LayoutDashboard },
    { name: 'Banner', path: '/admin/banner', icon: ImageIcon },
    { name: 'Info', path: '/admin/info', icon: Info },
    { name: 'Kurslar', path: '/admin/courses', icon: BookOpen },
    { name: 'Testlar', path: '/admin/tests', icon: Brain },
    { name: 'Quizizz', path: '/admin/quizizz', icon: CheckCircle2 },
    { name: 'Mavzular', path: '/admin/subjects', icon: BookOpen },
    { name: 'Yo\'nalishlar', path: '/admin/departments', icon: UsersIcon },
    { name: 'Foydalanuvchilar', path: '/admin/users', icon: UsersIcon },
    { name: 'Jurnal', path: '/admin/jurnal', icon: TrendingUp },
    { name: 'Sertifikatlar', path: '/admin/certificates', icon: Award },
    { name: 'FOOTER', path: '/admin/footer', icon: Dock },
    { name: 'Bildirishnomalar', path: '/admin/notifications', icon: AlertCircle },
    { name: 'Billing', path: '/admin/billing', icon: Wallet },
    { name: 'Chat', path: '/admin/chat', icon: MessageSquare, badge: unreadCount },
  ];

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] relative overflow-hidden bg-gray-50 text-gray-900 border-t border-gray-100 pb-16 md:pb-0">
      
      {/* Sidebar - Desktop Only */}
      <aside className={`bg-white border-r border-gray-200 flex-col p-4 shadow-sm z-20 transition-all duration-300 relative group/sidebar ${isCollapsed ? 'md:w-24' : 'md:w-72'} hidden md:flex`}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-lg hover:bg-gray-50 transition-all z-20"
        >
          <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className={`flex items-center gap-4 mb-8 pb-4 border-b border-gray-100 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
          <div className={`rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 transition-all ${isCollapsed ? 'h-10 w-10' : 'h-12 w-12'}`}>
            <LayoutDashboard className={`${isCollapsed ? 'h-5 w-5' : 'h-6 w-6'}`} />
          </div>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <p className="font-black text-gray-900 tracking-tight uppercase text-xs truncate">{user?.displayName || "Admin"}</p>
              <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-none mt-1">Administrator</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-0">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-3.5 py-2.5 rounded-xl transition-all group relative border-2 ${
                  active 
                    ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm' 
                    : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900 text-xs'
                } ${isCollapsed ? 'justify-center border-none p-4' : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'} transition-transform group-hover:scale-110`} />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-black text-[9px] uppercase tracking-widest flex-1 truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
                
                {item.badge && item.badge > 0 && (
                   <span className={`bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-red-200 rounded-full absolute -top-1 -right-1 ${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`}>
                      {item.badge}
                   </span>
                )}
                {!isCollapsed && active && !item.badge && <ChevronRight className="h-3 w-3 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 space-y-1 border-t border-gray-100">
          <Link
            to="/"
            className={`flex items-center gap-4 px-3.5 py-2.5 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all font-black text-[9px] uppercase tracking-widest ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Saytga qaytish' : ''}
          >
            <Home className="h-4 w-4" />
            {!isCollapsed && <span>Saytga qaytish</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-4 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all font-black text-[9px] uppercase tracking-widest w-full text-left ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? 'Chiqish' : ''}
          >
            <LogOut className="h-4 w-4 text-red-400" />
            {!isCollapsed && <span>Chiqish</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar for Admin Dashboard */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
        <div className="flex overflow-x-auto scrollbar-hide items-center justify-start gap-1 p-2">
          {menuItems.map((item) => {
             const active = location.pathname === item.path;
             const Icon = item.icon;
             return (
               <Link
                 key={item.name}
                 to={item.path}
                 className={`flex flex-col items-center justify-center min-w-[80px] px-2 py-2 rounded-xl transition-all relative ${
                   active ? 'text-blue-700 bg-blue-50' : 'text-gray-400'
                 }`}
               >
                 <Icon className={`h-5 w-5 ${active ? 'fill-blue-700/10' : ''}`} />
                 <span className="text-[10px] font-bold mt-1 whitespace-nowrap uppercase tracking-tighter">{item.name}</span>
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto z-10 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<AdminOverview />} />
            <Route path="/banner" element={<AdminBanner />} />
            <Route path="/info" element={<AdminInfo />} />
            <Route path="/courses" element={<AdminCourses />} />
            <Route path="/tests" element={<AdminTests />} />
            <Route path="/subjects" element={<AdminSubjects />} />
            <Route path="/subjects/read/:id" element={<SubjectRead />} />
            <Route path="/departments" element={<AdminDepartments />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/jurnal" element={<AdminJurnal />} />
            <Route path="/certificates" element={<AdminCertificates />} />
            <Route path="/services" element={<AdminServices />} />
            <Route path="/billing" element={<AdminBilling />} />
            <Route path="/footer" element={<AdminFooter />} />
            <Route path="/notifications" element={<AdminNotifications />} />
            <Route path="/quizizz" element={<AdminQuizizz />} />
            <Route path="/chat" element={<ChatSection />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
