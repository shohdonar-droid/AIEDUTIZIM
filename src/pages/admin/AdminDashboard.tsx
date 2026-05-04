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
  Wallet
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth, db } from '../../lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
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
import AdminServices from './AdminServices';
import ChatSection from '../ChatSection';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
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

  const menuItems = [
    { name: 'Umumiy', path: '/admin', icon: LayoutDashboard },
    { name: 'Banner', path: '/admin/banner', icon: ImageIcon },
    { name: 'Info', path: '/admin/info', icon: Info },
    { name: 'Kurslar', path: '/admin/courses', icon: BookOpen },
    { name: 'Testlar', path: '/admin/tests', icon: Brain },
    { name: 'Yo\'nalishlar', path: '/admin/departments', icon: UsersIcon },
    { name: 'Foydalanuvchilar', path: '/admin/users', icon: UsersIcon },
    { name: 'Jurnal', path: '/admin/jurnal', icon: TrendingUp },
    { name: 'Sertifikatlar', path: '/admin/certificates', icon: Award },
    { name: 'Xizmatlar', path: '/admin/services', icon: LayoutDashboard },
    { name: 'Billing', path: '/admin/billing', icon: Wallet },
    { name: 'Tepa va Footer', path: '/admin/footer', icon: Dock },
    { name: 'Bildirishnomalar', path: '/admin/notifications', icon: AlertCircle },
    { name: 'Chat', path: '/admin/chat', icon: MessageSquare, badge: unreadCount },
  ];

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] relative overflow-hidden bg-gray-50 text-gray-900 border-t border-gray-100">
      
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r md:border-b-0 border-gray-200 flex flex-col p-6 shadow-sm z-20">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-gray-900 tracking-tight uppercase text-sm">{user?.displayName || "Admin"}</p>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Administrator</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group border-2 ${
                  active 
                    ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm' 
                    : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
                <span className="font-black text-[10px] uppercase tracking-widest flex-1">{item.name}</span>
                {item.badge && item.badge > 0 && (
                   <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-red-200">
                     {item.badge}
                   </span>
                )}
                {active && !item.badge && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-2 border-t border-gray-100">
          <Link
            to="/"
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <Home className="h-5 w-5" />
            Saytga qaytish
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-widest w-full text-left"
          >
            <LogOut className="h-5 w-5 text-red-400" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto z-10 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<AdminOverview />} />
            <Route path="/banner" element={<AdminBanner />} />
            <Route path="/info" element={<AdminInfo />} />
            <Route path="/courses" element={<AdminCourses />} />
            <Route path="/tests" element={<AdminTests />} />
            <Route path="/departments" element={<AdminDepartments />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/jurnal" element={<AdminJurnal />} />
            <Route path="/certificates" element={<AdminCertificates />} />
            <Route path="/services" element={<AdminServices />} />
            <Route path="/billing" element={<AdminBilling />} />
            <Route path="/footer" element={<AdminFooter />} />
            <Route path="/notifications" element={<AdminNotifications />} />
            <Route path="/chat" element={<ChatSection />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
