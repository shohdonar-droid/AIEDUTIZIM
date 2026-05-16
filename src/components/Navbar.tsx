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

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg ${isWhiteText ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100/50 text-gray-600'}`}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-t ${isWhiteText ? 'border-white/20 bg-gray-900/90' : 'border-gray-200/50 bg-white/90'} backdrop-blur-xl`}
            >
              <div className="space-y-1 pb-3 pt-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 text-base font-medium ${
                      isActive(link.path) 
                        ? (isWhiteText ? 'bg-white/10 text-blue-300' : 'bg-[#007aff]/10 text-[#007aff]') 
                        : (isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                
                {user ? (
                  <>
                    <Link
                      to={isAdmin ? '/admin' : (user.role === 'teacher' || user.role === 'staff' ? '/teacher' : '/student')}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 text-base font-medium flex items-center gap-2 ${
                        isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-3 text-base font-medium flex items-center gap-2 ${
                        isWhiteText ? 'text-red-400 hover:bg-red-400/10' : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="h-5 w-5" />
                      Chiqish
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 text-base font-medium ${
                      isWhiteText ? 'text-blue-300 hover:bg-white/5' : 'text-[#007aff] hover:bg-blue-50'
                    }`}
                  >
                    Kirish
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
