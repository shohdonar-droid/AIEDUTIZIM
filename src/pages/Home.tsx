import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, getCountFromServer, query, where } from 'firebase/firestore';
import { Course, SiteContent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, GraduationCap, LayoutGrid, BarChart3, Users, Settings, Award, ArrowRight, BrainCircuit, Database, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { makeDirectImageUrl } from '../lib/helpers';

export default function Home() {
  const { user } = useAuth();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [stats, setStats] = useState({ courses: 7, tests: 12, users: 154, results: 890, teachers: 0 });

  useEffect(() => {
    async function fetchData() {
      const defaultContent: SiteContent = {
        hero: {
          rightImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800",
          rightBadge: "Yangilik",
          rightText: "Zamonaviy AI texnologiyalari ta'lim sifatini tubdan yaxshilaydi."
        },
        banners: [
          { url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200", type: "image" },
          { url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200", type: "image" }
        ],
        footer: {
          description: "Kelajak ta'limiga xush kelibsiz",
          address: "Toshkent, O'zbekiston",
        }
      };

      // Load from cache first
      const cachedContent = localStorage.getItem('cache_site_content');
      const cachedCourses = localStorage.getItem('cache_courses');
      const cachedStats = localStorage.getItem('cache_stats');

      if (cachedContent) setContent(JSON.parse(cachedContent));
      if (cachedCourses) setCourses(JSON.parse(cachedCourses));
      if (cachedStats) setStats(JSON.parse(cachedStats));

      try {
        const contentDoc = await getDoc(doc(db, 'siteContent', 'main'));
        if (contentDoc.exists()) {
          const data = contentDoc.data() as SiteContent;
          const merged = {
            ...defaultContent,
            ...data,
            hero: { ...defaultContent.hero, ...(data.hero || {}) },
            banners: data.banners || defaultContent.banners,
            footer: { ...defaultContent.footer, ...(data.footer || {}) },
          };
          setContent(merged);
          localStorage.setItem('cache_site_content', JSON.stringify(merged));
        } else {
          setContent(defaultContent);
        }
      } catch (err: any) {
        console.error('Content fetch error:', err);
        if (!content) setContent(defaultContent);
      }

      try {
        const coursesSnap = await getDocs(collection(db, 'courses'));
        let coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        // Filter for highlighted courses
        coursesData = coursesData.filter(c => {
           const isAdminCourse = c.creatorRole === 'admin' || !c.creatorRole;
           const isGlobalAdminCourse = isAdminCourse && 
                                      (!c.organizationIds || c.organizationIds.length === 0) &&
                                      (!c.departmentIds || c.departmentIds.length === 0) &&
                                      (!c.groupIds || c.groupIds.length === 0);

           if (!user) {
              return isGlobalAdminCourse && c.isPublic !== false;
           }

           if (user.role === 'admin' || user.role === 'subadmin') return true;
           if (isGlobalAdminCourse) return true;

           if (user.role === 'student') {
              const hasGroupFilter = (c.groupIds?.length || 0) > 0;
              const hasDeptFilter = (c.departmentIds?.length || 0) > 0;
              const hasOrgFilter = (c.organizationIds?.length || 0) > 0;

              if (hasGroupFilter) return c.groupIds?.includes(user.groupId || '') || false;
              if (hasDeptFilter) return c.departmentIds?.includes(user.departmentId || '') || false;
              if (hasOrgFilter) return c.organizationIds?.includes(user.teacherId || '') || false;

              if (c.creatorId === user.teacherId || c.teacherId === user.teacherId) return true;
           }

           if (user.role === 'teacher' && (c.creatorId === user.uid || c.teacherId === user.uid)) return true;
           if (user.role === 'staff' && (c.creatorId === user.teacherId || c.teacherId === user.teacherId)) return true;

           return false;
        });

        const finalCourses = coursesData.length > 0 ? coursesData.slice(0, 6) : [
          { id: '1', title: 'Python Asoslari', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=400', description: 'Sun\'iy intellekt uchun asosiy tilni o\'rganing.', modules: [], createdAt: null },
          { id: '2', title: 'Machine Learning', thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=400', description: 'Ma\'lumotlar tahlili va bashoratlash.', modules: [], createdAt: null },
          { id: '3', title: 'Frontend Development', thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&q=80&w=400', description: 'Zamonaviy web interfeyslar.', modules: [], createdAt: null },
          { id: '4', title: 'Backend Development', thumbnail: 'https://images.unsplash.com/photo-1623479322729-28b25c16b011?auto=format&fit=crop&q=80&w=400', description: 'Node.js va ma\'lumotlar bazalari.', modules: [], createdAt: null },
          { id: '5', title: 'Data Science', thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400', description: 'Katta hajmdagi ma\'lumotlarni ishlash.', modules: [], createdAt: null },
          { id: '6', title: 'Mobile Development', thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=400', description: 'Zamonaviy mobil ilovalar yaratish.', modules: [], createdAt: null }
        ];
        setCourses(finalCourses);
        localStorage.setItem('cache_courses', JSON.stringify(finalCourses));
      } catch (e: any) {
        console.error('Courses fetch error:', e);
      }

      try {
        const cSnap = await getCountFromServer(collection(db, 'courses'));
        const uSnap = await getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student')));
        const tSnap = await getCountFromServer(collection(db, 'tests'));
        const teacherSnap = await getCountFromServer(query(collection(db, 'users'), where('role', '==', 'teacher')));
        const certSnap = await getCountFromServer(query(collection(db, 'enrollments'), where('completed', '==', true)));
        
        const newStats = { 
          courses: cSnap.data().count,
          users: uSnap.data().count,
          tests: tSnap.data().count,
          results: certSnap.data().count,
          teachers: teacherSnap.data().count
        };
        setStats(newStats);
        localStorage.setItem('cache_stats', JSON.stringify(newStats));
      } catch (e: any) {
        console.error('Stats fetch error:', e);
      }
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    if (content?.banners.length) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % content.banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [content]);

  const features = [
    { title: "Interaktiv Quizizz va Test Tizimi", desc: "Tashkilotlar va talabalar uchun real-vaqt rejimida musobaqalar uyushtirish. Bilimlarni geymifikatsiya orqali mustahkamlash.", icon: LayoutGrid, color: "bg-blue-50", iconColor: "text-blue-600" },
    { title: "Sun'iy Intellekt Bilan Test Yaratish", desc: "O'qituvchilar uchun AI orqali mavzuga oid savollarni avtomatik shakllantirish, o'quv jarayonini sezilarli darajada tezlashtirish.", icon: FileText, color: "bg-purple-50", iconColor: "text-purple-600" },
    { title: "Avtomatik Sertifikatlar", desc: "Kurslar yoki testlardan muvaffaqiyatli o'tganlarga real vaqtda QR kodli va himoyalangan sertifikat taqdim etish.", icon: Award, color: "bg-orange-50", iconColor: "text-orange-600" },
    { title: "Zamonaviy Modulli Ta'lim", desc: "Talabalarning kurs doirasidagi barcha qadamlarini interaktiv modullar orqali kuzatish va ilg'or o'zlashtirish statistikasi.", icon: BarChart3, color: "bg-green-50", iconColor: "text-green-600" },
    { title: "Xavfsizlik va Avtomat Jurnal", desc: "Baholar, sertifikatlar haqqoniyligi va ishtirokchilar tarixi mutlaqo xavfsiz va tizimli kataloglanadi.", icon: CheckCircle2, color: "bg-red-50", iconColor: "text-red-600" },
    { title: "Smart Chat va Muloqot", desc: "Tashkilotlar, talabalar va adminlar o'rtasida to'g'ridan-to'g'ri integratsiyalashgan ijtimoiy ta'lim muhiti.", icon: Users, color: "bg-indigo-50", iconColor: "text-indigo-600" },
  ];

  if (!content) return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <BrainCircuit className="h-12 w-12 text-[#007aff] animate-pulse" />
        <p className="text-gray-400 font-medium animate-pulse">Yuklanmoqda...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-16 pb-20 pt-8 bg-[#fbfbfd]">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
           {/* Banner Slider */}
          <div className={`${content.hero.showInfoSection === false ? 'lg:col-span-3' : 'lg:col-span-2'} relative rounded-[2.5rem] overflow-hidden group shadow-2xl shadow-blue-100`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                {content.banners[currentBanner]?.type === 'image' ? (
                  <img 
                    src={makeDirectImageUrl(content.banners[currentBanner].url || null)} 
                    referrerPolicy="no-referrer"
                    alt="Banner" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video 
                    src={content.banners[currentBanner]?.url || null} 
                    autoPlay 
                    muted 
                    loop 
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </motion.div>
            </AnimatePresence>
            
            <button 
              onClick={() => setCurrentBanner(prev => (prev - 1 + content.banners.length) % content.banners.length)}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-white hover:text-gray-900"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button 
              onClick={() => setCurrentBanner(prev => (prev + 1) % content.banners.length)}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-white hover:text-gray-900"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-10 left-10 text-white z-10 max-w-lg">
              <span className="badge bg-white/20 text-white border border-white/30 mb-3 px-3 py-1 drop-shadow-md">
                 {content.banners[currentBanner]?.title || "Yangi Texnologiyalar"}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 drop-shadow-lg">
                {content.banners[currentBanner]?.text ? (
                   <span dangerouslySetInnerHTML={{ __html: content.banners[currentBanner].text!.replace(/\n/g, '<br />') }} />
                ) : (
                   <>
                     Raqamli Ta'limda <br />
                     <span className="text-blue-300">Sun'iy Intellekt</span>
                   </>
                )}
              </h1>
              <p className="text-sm md:text-base text-gray-200 font-medium leading-relaxed drop-shadow-md">
                {content.banners[currentBanner]?.description || "Zamonaviy texnologiyalar bilan o'quv jarayonini inqilobiy darajada o'zgartiring va maqsadlaringizga tezroq erishing."}
              </p>
            </div>
          </div>

          {/* Right Info */}
          {content.hero.showInfoSection !== false && (
            <Link to="/info" className="mac-window overflow-hidden flex flex-col group h-full cursor-pointer hover:shadow-2xl transition-all">
              <div className="h-[75%] w-full overflow-hidden relative border-b border-gray-100">
                <img 
                  src={makeDirectImageUrl(content.hero.rightImage || null)} 
                  referrerPolicy="no-referrer"
                  alt="Info" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-8 flex-1 flex flex-col justify-center bg-white/60 backdrop-blur-md">
                <span className="text-xs font-semibold text-[#007aff] tracking-wide mb-2 inline-block">
                  {content.hero.rightBadge || "Yangilik"}
                </span>
                <p className="text-lg font-bold text-gray-900 leading-snug mb-6">
                  {content.hero.rightText}
                </p>
                <div className="flex items-center gap-2 text-[#007aff] font-semibold text-sm hover:gap-3 transition-all">
                  Batafsil ma'lumot <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Courses Carousel Section */}
      <section className="py-16 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Ommabop kurslar</h2>
              <p className="mt-2 text-gray-500 font-medium text-sm">Mutaxassislar tomonidan tayyorlangan maxsus darsliklar</p>
            </div>
            <Link to="/courses" className="text-[#007aff] font-semibold text-sm hover:underline flex items-center gap-1 hidden sm:flex">
              Hammasini ko'rish <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {courses.map((course) => (
              <motion.div
                key={course.id}
                whileHover={{ y: -5 }}
                className="w-full mac-window overflow-hidden flex flex-col"
              >
                <div className="h-48 overflow-hidden relative">
                  <img src={makeDirectImageUrl(course.thumbnail || null)} referrerPolicy="no-referrer" alt={course.title} className="h-full w-full object-cover" />
                  <div className="absolute top-3 right-3"><span className="badge backdrop-blur-md bg-white/80 text-gray-900">Premium</span></div>
                </div>
                <div className="p-6 flex-1 flex flex-col bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{course.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">{course.description}</p>
                  <Link 
                    to={`/courses/${course.id}`}
                    className="block w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-900 text-center rounded-xl font-medium text-sm hover:border-[#007aff] hover:text-[#007aff] transition-colors"
                  >
                    Batafsil
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Layout shift: moved stats down */}

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">PLATFORMAMIZ IMKONIYATLARI</h2>
          <p className="mt-3 text-gray-500 font-medium text-sm max-w-lg mx-auto">Tizim platformamiz eng so'nggi ta'lim yechimlari bilan boyitilgan imkoniyatlarni taqdim etadi.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 rounded-[2rem] bg-white border border-gray-100 hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 transition-all duration-500 group">
              <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <f.icon className={`h-7 w-7 ${f.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-16">
        <div className="mac-window bg-white overflow-hidden p-12 relative">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <BrainCircuit className="h-64 w-64" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-12">LOYIHA QANDAY ISHLAYDI?</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Ro'yxatdan o'tish", desc: "Tizimda o'z profilingizni yarating va kerakli guruhga a'zo bo'ling." },
                { step: "02", title: "Kursni tanlash", desc: "Sizga yoqqan yo'nalishdagi modulli kursni yoki testni tanlang." },
                { step: "03", title: "Bilim olish", desc: "Interaktiv darslar va AI-testlar yordamida bilimingizni oshiring." },
                { step: "04", title: "Natijani olish", desc: "Sinovlardan o'ting va QR-kodli rasmiy sertifikatga ega bo'ling." }
              ].map((s, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <span className="text-5xl font-black text-gray-100 group-hover:text-blue-50 transition-colors">{s.step}</span>
                  <h4 className="text-lg font-bold text-gray-900">{s.title}</h4>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section / Platform Statistics */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-16 border-t border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">STATISTIKA</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="mac-window bg-white p-8 text-center hover:scale-105 transition-transform duration-300">
            <h4 className="text-5xl font-black text-[#FF3B30] mb-2 drop-shadow-sm">{stats.teachers}</h4>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Tashkilotlar</p>
          </div>
          <div className="mac-window bg-white p-8 text-center hover:scale-105 transition-transform duration-300">
            <h4 className="text-5xl font-black text-[#FF9500] mb-2 drop-shadow-sm">{stats.courses}</h4>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Kurslar</p>
          </div>
          <div className="mac-window bg-white p-8 text-center hover:scale-105 transition-transform duration-300">
            <h4 className="text-5xl font-black text-[#5856D6] mb-2 drop-shadow-sm">{stats.tests}</h4>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Testlar</p>
          </div>
          <div className="mac-window bg-white p-8 text-center hover:scale-105 transition-transform duration-300">
            <h4 className="text-5xl font-black text-[#34C759] mb-2 drop-shadow-sm">{stats.users}</h4>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Foydalanuvchilar</p>
          </div>
          <div className="mac-window bg-white p-8 text-center hover:scale-105 transition-transform duration-300">
            <h4 className="text-5xl font-black text-[#007aff] mb-2 drop-shadow-sm">{stats.results}</h4>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Sertifikatlar</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-nav pt-16 pb-8 mt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-gray-200/50 pb-12 mb-8">
            
            {/* 1. Logo & Description */}
            <div className="col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                {content.footer.logoUrl ? (
                  <img src={makeDirectImageUrl(content.footer.logoUrl || null)} referrerPolicy="no-referrer" alt="Logo" className="h-10 object-contain" />
                ) : (
                  <>
                    <div className="rounded-xl bg-[#007aff] p-2 shadow-sm">
                      <BrainCircuit className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 tracking-tight">
                      EDU<span className="text-[#007aff]">AI</span>
                    </span>
                  </>
                )}
              </Link>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                {content.footer.description || content.footer.top || "Raqamli ta'limda sun'iy intellekt\nZamonaviy texnologiyalar va sun'iy intellekt yordamida ta'lim sifatini oshirishga qaratilgan platforma. Raqamli muhitda bilim olishning eng samarali usullarini taqdim etamiz."}
              </p>
            </div>

            {/* 2. Tezkor havolalar */}
            <div className="col-span-1">
              <h4 className="text-base font-bold text-gray-900 mb-6 tracking-wider">Tezkor havolalar</h4>
              <ul className="space-y-4">
                <li><Link to="/" className="text-gray-500 text-sm font-medium hover:text-[#007aff] transition-colors">Bosh sahifa</Link></li>
                <li><Link to="/courses" className="text-gray-500 text-sm font-medium hover:text-[#007aff] transition-colors">Kurslar</Link></li>
                <li><Link to="/tests" className="text-gray-500 text-sm font-medium hover:text-[#007aff] transition-colors">Testlar</Link></li>
                <li><Link to="/contact" className="text-gray-500 text-sm font-medium hover:text-[#007aff] transition-colors">Aloqa</Link></li>
              </ul>
            </div>

            {/* 3. Aloqa ma'lumotlari */}
            <div className="col-span-1">
              <h4 className="text-base font-bold text-gray-900 mb-6 tracking-wider">Aloqa ma'lumotlari</h4>
              <ul className="space-y-4">
                <li className="text-gray-500 text-sm font-medium leading-relaxed">
                  {content.footer.address || "Toshkent shahri, Chilonzor tumani, Bunyodkor ko'chasi 1-uy"}
                </li>
                <li className="text-gray-500 text-sm font-medium">
                  <a href={`tel:${content.footer.phone || '+998914305676'}`} className="hover:text-[#007aff] transition-colors">
                    {content.footer.phone || "+998 91 430 56 76"}
                  </a>
                </li>
                <li className="text-gray-500 text-sm font-medium">
                  <a href={`mailto:${content.footer.email || 'info@raqamlitalim.uz'}`} className="hover:text-[#007aff] transition-colors">
                    {content.footer.email || "info@raqamlitalim.uz"}
                  </a>
                </li>
                <li className="text-gray-500 text-sm font-medium">
                  {content.footer.workingHours || "Dushanba-Juma: 9:00 - 18:00"}
                </li>
              </ul>
            </div>
            
          </div>
          
          {/* Bottom & Social Icons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-400 font-medium">
            <span>{content.footer.bottom || "© 2024 Raqamli Ta'lim. Barcha huquqlar himoyalangan."}</span>
            <div className="flex gap-6">
               {content.footer.telegram && (
                 <a href={content.footer.telegram} target="_blank" rel="noopener noreferrer" className="hover:text-[#0088cc] transition-colors">
                   Telegram
                 </a>
               )}
               {!content.footer.telegram && (
                 <span className="hover:text-[#0088cc] cursor-pointer transition-colors">Telegram</span>
               )}
               
               {content.footer.instagram && (
                 <a href={content.footer.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#E1306C] transition-colors">
                   Instagram
                 </a>
               )}
               {!content.footer.instagram && (
                 <span className="hover:text-[#E1306C] cursor-pointer transition-colors">Instagram</span>
               )}

               {content.footer.youtube && (
                 <a href={content.footer.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF0000] transition-colors">
                   YouTube
                 </a>
               )}
               {!content.footer.youtube && (
                 <span className="hover:text-[#FF0000] cursor-pointer transition-colors">YouTube</span>
               )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
