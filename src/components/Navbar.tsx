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
  Award,
  ChevronDown,
  Building2,
  Users2,
  CreditCard
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteContent } from '../types';

import { handleFirestoreError, OperationType } from '../lib/firebase';
import { makeDirectImageUrl } from '../lib/helpers';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTuzilmaOpen, setIsTuzilmaOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<SiteContent['header']>({});
  const tuzilmaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTuzilmaEnter = () => {
    if (tuzilmaTimeoutRef.current) clearTimeout(tuzilmaTimeoutRef.current);
    setIsTuzilmaOpen(true);
  };

  const handleTuzilmaLeave = () => {
    tuzilmaTimeoutRef.current = setTimeout(() => {
      setIsTuzilmaOpen(false);
    }, 150);
  };

  useEffect(() => {
    async function fetchConfig() {
      // Load from cache
      const cached = localStorage.getItem('cache_header_config');
      if (cached) setHeaderConfig(JSON.parse(cached));

      try {
        const snap = await getDoc(doc(db, 'siteContent', 'main'));
        if (snap.exists()) {
          const data = snap.data() as SiteContent;
          if (data.header) {
            setHeaderConfig(data.header);
            localStorage.setItem('cache_header_config', JSON.stringify(data.header));
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
    { name: 'Bog\'lanish', path: '/contact', icon: MessageCircle },
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
    localStorage.removeItem('lastActivityTime');
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
                  <img src={makeDirectImageUrl(headerConfig.logoUrl || null)} referrerPolicy="no-referrer" alt="Logo" className="h-8 object-contain" />
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
                    AIEDU<span className="text-[#007aff]">TIZIM</span>
                  </span>
                )}
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? (isWhiteText ? 'text-blue-300 font-bold' : 'text-[#007aff]')
                    : (isWhiteText ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#007aff]')
                }`}
              >
                Asosiy
              </Link>

              {/* Tuzilma Dropdown */}
              <div 
                className="relative"
                onMouseEnter={handleTuzilmaEnter}
                onMouseLeave={handleTuzilmaLeave}
              >
                <button
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    location.pathname === '/leadership' || location.pathname === '/partners'
                      ? (isWhiteText ? 'text-blue-300 font-bold' : 'text-[#007aff]')
                      : (isWhiteText ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#007aff]')
                  }`}
                >
                  Tuzilma
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isTuzilmaOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isTuzilmaOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute left-0 mt-3 w-64 rounded-2xl shadow-2xl border ${
                        isWhiteText ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-gray-100'
                      } backdrop-blur-xl p-2 overflow-hidden`}
                    >
                      <Link
                        to="/leadership"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive('/leadership')
                            ? (isWhiteText ? 'bg-white/10 text-blue-300' : 'bg-blue-50 text-blue-600')
                            : (isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                        }`}
                      >
                        <Users2 className="h-4 w-4" />
                        <span className="font-bold text-sm">Rahbariyat</span>
                      </Link>
                      <Link
                        to="/partners"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive('/partners')
                            ? (isWhiteText ? 'bg-white/10 text-blue-300' : 'bg-blue-50 text-blue-600')
                            : (isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="font-bold text-sm">Hamkorlar (Tashkilotlar)</span>
                      </Link>
                      <Link
                        to="/tariffs"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive('/tariffs')
                            ? (isWhiteText ? 'bg-white/10 text-blue-300' : 'bg-blue-50 text-blue-600')
                            : (isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="font-bold text-sm">Tariflar</span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {navLinks.slice(1).map((link) => (
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
                    to="/search-cert"
                    className={`px-3 py-1.5 font-bold text-sm tracking-wide rounded-xl border-2 transition-all ${
                      isWhiteText ? 'border-white/50 text-white hover:bg-white/10' : 'border-[#007aff] text-[#007aff] hover:bg-blue-50'
                    }`}
                  >
                    ID
                  </Link>
                  <Link
                    to={isAdmin ? '/admin' : (user.role === 'teacher' || user.role === 'staff' || (user.role as string) === 'mustaqil_o_qituvchi' ? '/teacher' : '/student')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all border ${
                      isWhiteText 
                        ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' 
                        : 'bg-gray-100/80 text-gray-700 border-gray-200/50 hover:bg-gray-200'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {user.displayName || 'Profil'}
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
                    to="/search-cert"
                    className={`px-3 py-1.5 font-bold text-sm tracking-wide rounded-xl border-2 transition-all ${
                      isWhiteText ? 'border-white/50 text-white hover:bg-white/10' : 'border-[#007aff] text-[#007aff] hover:bg-blue-50'
                    }`}
                  >
                    ID
                  </Link>
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
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-base font-medium ${
                    isActive('/') 
                      ? (isWhiteText ? 'bg-white/10 text-blue-300' : 'bg-[#007aff]/10 text-[#007aff]') 
                      : (isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  Asosiy
                </Link>

                {/* Mobile Tuzilma */}
                <div className="px-4 py-2">
                  <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isWhiteText ? 'text-gray-500' : 'text-gray-400'}`}>Tuzilma</p>
                  <div className="space-y-1 ml-2 border-l-2 border-gray-100 dark:border-white/10">
                    <Link
                      to="/leadership"
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-2 text-sm font-bold ${
                        isActive('/leadership') ? 'text-[#007aff]' : (isWhiteText ? 'text-gray-400' : 'text-gray-500')
                      }`}
                    >
                      👤 Rahbariyat
                    </Link>
                    <Link
                      to="/partners"
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-2 text-sm font-bold ${
                        isActive('/partners') ? 'text-[#007aff]' : (isWhiteText ? 'text-gray-400' : 'text-gray-500')
                      }`}
                    >
                      🏢 Hamkorlar (Tashkilotlar)
                    </Link>
                    <Link
                      to="/tariffs"
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-2 text-sm font-bold ${
                        isActive('/tariffs') ? 'text-[#007aff]' : (isWhiteText ? 'text-gray-400' : 'text-gray-500')
                      }`}
                    >
                      💳 Tariflar
                    </Link>
                  </div>
                </div>

                {navLinks.slice(1).map((link) => (
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
                
                <Link
                  to="/search-cert"
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-base font-medium ${
                    isActive('/search-cert') 
                      ? (isWhiteText ? 'bg-white/10 text-blue-300' : 'bg-[#007aff]/10 text-[#007aff]') 
                      : (isWhiteText ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  Sertifikat tekshirish (ID)
                </Link>
                
                {user ? (
                  <>
                    <Link
                      to={isAdmin ? '/admin' : (user.role === 'teacher' || user.role === 'staff' || (user.role as string) === 'mustaqil_o_qituvchi' ? '/teacher' : '/student')}
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
