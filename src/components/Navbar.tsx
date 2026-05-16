import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { 
  LogOut, 
  User, 
  LayoutDashboard, 
  BrainCircuit, 
  Menu, 
  X, 
  Home, 
  BookOpen, 
  FileText, 
  Gamepad2, 
  MessageCircle, 
  Search,
  Award
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteContent } from '../types';

import { handleFirestoreError, OperationType } from '../lib/firebase';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<SiteContent['header']>({});

  useEffect(() => {
    async function fetchConfig() {
      try {
        const snap = await getDoc(doc(db, 'siteContent', 'main'));
        if (snap.exists()) {
          const data = snap.data() as SiteContent;
          if (data.header) {
            setHeaderConfig(data.header);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'siteContent/main');
      }
    }
    fetchConfig();
  }, []);

  const navLinks = [
    { name: 'Asosiy', path: '/', icon: Home },
    { name: 'Kurslar', path: '/courses', icon: BookOpen },
    { name: 'Testlar', path: '/tests', icon: FileText },
    { name: 'Quizizz', path: '/quizizz', icon: Gamepad2 },
    { name: 'Chat', path: '/contact', icon: MessageCircle },
    { name: 'ID', path: '/search-cert', icon: Award },
  ];

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    const sessionStart = localStorage.getItem('sessionStart');
    
    if (sessionId && sessionStart) {
      const durationMinutes = Math.round((Date.now() - parseInt(sessionStart)) / 60000);
      try {
        await updateDoc(doc(db, 'activityLogs', sessionId), {
          logoutTime: Date.now(),
          durationMinutes: durationMinutes
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `activityLogs/${sessionId}`);
      }
    }
    
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessionStart');
    auth.signOut();
  };

  const isActive = (path: string) => location.pathname === path;
  const isDashboard = location.pathname.startsWith('/student') || 
                      location.pathname.startsWith('/teacher') || 
                      location.pathname.startsWith('/admin');

  const bgClass = headerConfig?.bgClass || 'glass-nav';
  const textClass = headerConfig?.textClass || 'text-gray-900';
  const isWhiteText = textClass.includes('white');

  return (
    <>
      {/* Top Navbar */}
      <nav className={`sticky top-0 z-50 ${bgClass} ${textClass}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                {headerConfig?.logoUrl ? (
                  <img src={headerConfig.logoUrl || null} alt="Logo" className="h-8 object-contain" />
                ) : (
                  <div className="rounded-xl bg-[#007aff] p-1.5 shadow-sm">
                    <BrainCircuit className="h-6 w-6 text-white" />
                  </div>
                )}
                {headerConfig?.siteName ? (
                  <span className={`text-xl font-bold tracking-tight hidden sm:block ${textClass}`}>
                    {headerConfig.siteName}
                  </span>
                ) : (
                  <span className={`text-xl font-bold tracking-tight hidden sm:block ${textClass}`}>
                    EDU<span className="text-[#007aff]">AI</span>
                  </span>
                )}
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.path) 
                      ? (isWhiteText ? 'text-blue-300 font-bold' : 'text-[#007aff]')
                      : (isWhiteText ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#007aff]')
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              {user ? (
                <div className={`flex items-center gap-4 ml-4 border-l pl-6 ${isWhiteText ? 'border-white/20' : 'border-gray-200'}`}>
                  <Link
                    to={isAdmin ? '/admin' : (user.role === 'teacher' || user.role === 'staff' ? '/teacher' : '/student')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all border ${
                      isWhiteText 
                        ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' 
                        : 'bg-gray-100/80 text-gray-700 border-gray-200/50 hover:bg-gray-200'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {isAdmin ? 'Admin' : 'Profil'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`p-2 transition-colors ${isWhiteText ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="mac-btn-primary"
                  >
                    Kirish
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Top actions (just profile/logout if needed, or keeping it clean) */}
            <div className="flex items-center gap-3 md:hidden">
              {user && (
                <Link
                  to={isAdmin ? '/admin' : (user.role === 'teacher' || user.role === 'staff' ? '/teacher' : '/student')}
                  className={`p-2 rounded-xl border ${
                    isWhiteText 
                      ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' 
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <User className="h-5 w-5" />
                </Link>
              )}
              {!user && (
                <Link
                  to="/login"
                  className="px-4 py-1.5 bg-[#007aff] text-white rounded-lg font-bold text-sm shadow-sm"
                >
                  Kirish
                </Link>
              )}
              {user && (
                <button
                  onClick={handleLogout}
                  className={`p-2 transition-colors ${isWhiteText ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Mobile Navigation */}
      {!isDashboard && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex overflow-x-auto scrollbar-hide items-center justify-between px-2 py-1 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex flex-col items-center justify-center min-w-[72px] py-1 transition-all ${
                    active ? 'text-[#007aff]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                    <Icon className={`w-5 h-5 ${active ? 'fill-[#007aff] text-[#007aff]' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-bold mt-0.5 whitespace-nowrap ${active ? 'text-[#007aff]' : 'text-gray-400'}`}>
                    {link.name}
                  </span>
                  {active && (
                     <motion.div 
                       layoutId="mobile-nav-indicator"
                       className="absolute -bottom-1 w-1 h-1 bg-[#007aff] rounded-full" 
                     />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer for bottom nav on mobile */}
      {!isDashboard && <div className="h-16 md:hidden"></div>}
    </>
  );
}
