import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, getCountFromServer, query, where } from 'firebase/firestore';
import { Course, SiteContent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, GraduationCap, LayoutGrid, BarChart3, Users, 
  Award, ArrowRight, BrainCircuit, Download, FileText, CheckCircle2, Send, 
  Instagram, Youtube, BookText, Presentation, CheckSquare, Sparkles, 
  Bot, Zap, Layers, Info, X, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { makeDirectImageUrl } from '../lib/helpers';

interface CapabilityFeature {
  id: string;
  category: 'all' | 'documents' | 'tests' | 'lms' | 'certificates' | 'bot';
  title: string;
  badge: string;
  badgeBg: string;
  badgeTextColor: string;
  iconBg: string;
  iconColor: string;
  icon: any;
  shortDesc: string;
  highlights: string[];
  fullDescription: string;
  linkTo?: string;
  actionText?: string;
}

export function formatSocialLink(val: string | undefined, type: 'telegram' | 'instagram' | 'youtube'): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const handle = trimmed.startsWith('@') ? trimmed.substring(1) : trimmed;
  if (type === 'telegram') {
    return `https://t.me/${handle}`;
  } else if (type === 'instagram') {
    return `https://instagram.com/${handle}`;
  } else if (type === 'youtube') {
    if (trimmed.startsWith('@')) {
      return `https://youtube.com/${trimmed}`;
    }
    return `https://youtube.com/@${handle}`;
  }
  return trimmed;
}

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
        if (!err?.message?.includes("Quota")) {
          console.error('Content fetch error:', err);
        }
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
        if (!e?.message?.includes("Quota")) {
          console.error('Courses fetch error:', e);
        }
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
        localStorage.setItem('cache_home_fetch_time', Date.now().toString());
      } catch (e: any) {
        if (!e?.message?.includes("Quota")) {
          console.error('Stats fetch error:', e);
        }
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

  const [activeCategory, setActiveCategory] = useState<'all' | 'documents' | 'tests' | 'lms' | 'certificates' | 'bot'>('all');
  const [selectedFeature, setSelectedFeature] = useState<CapabilityFeature | null>(null);

  const platformFeatures: CapabilityFeature[] = [
    {
      id: 'coursework',
      category: 'documents',
      title: "AI Kurs Ishi, Referat & Mustaqil Ish Generator",
      badge: "OAK Standarti",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: BookText,
      shortDesc: "Sun'iy intellekt yordamida OAK va OTM talablariga mos reja, kirish, boblar va adabiyotlar ro'yxatiga ega tayyor hujjatlar shakllantirish.",
      highlights: [
        "15-50 sahifalik akademik va ilmiy struktura",
        "OTM va kafedra talablariga mos manbalar",
        "Word (.docx) hamda PDF shaklida yuklab olish"
      ],
      fullDescription: "AIEDUTIZIM platformasining ushbu moduli o'qituvchilar va talabalarga har qanday mavzu bo'yicha ilmiy-akademik talablarga mos keluvchi Kurs ishi, Referat, Mustaqil ish hamda Tezislarni sanoqli daqiqalarda shakllantirish imkonini beradi. Generatsiya qilingan hujjatlar reja, kirish qismi, tahliliy boblar, amaliy xulosalar hamda adabiyotlar ro'yxatini qamrab oladi.",
      linkTo: "/tariffs",
      actionText: "Yaratish"
    },
    {
      id: 'presentation',
      category: 'documents',
      title: "AI Taqdimot & Slaydlar Generator (PPTX)",
      badge: "PowerPoint PPTX",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: Presentation,
      shortDesc: "Mavzu bo'yicha slaydlar mazmuni, struktura hamda ma'ruzachining tayyor nutq matni (Speech Note) bilan taqdimotlar.",
      highlights: [
        "PowerPoint (.pptx) va PDF formatlarida shakllantirish",
        "Har bir slayd uchun ma'ruzachi nutq matni",
        "Sodda va tushunarli vizual struktura"
      ],
      fullDescription: "Ushbu imkoniyat ma'ruzachilar va talabalar uchun taqdimot tayyorlash jarayonini tezlashtiradi. AI mavzuni chuqur tahlil qilib, slayd ma'lumotlarini qisqa va tushunarli punktlarga ajratadi va har bir slayd uchun ma'ruzachi nutqini taqdim etadi.",
      linkTo: "/tariffs",
      actionText: "Slayd Tayyorlash"
    },
    {
      id: 'testbuilder',
      category: 'tests',
      title: "AI Test Generator & Quizizz Integratsiyasi",
      badge: "Test & Geymifikatsiya",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: CheckSquare,
      shortDesc: "Mavzu yoki matn asosida 4 variantli testlar hamda real-time Quizizz musobaqalarini o'tkazish.",
      highlights: [
        "Matndan avtomatik test savollari shakllantirish",
        "Quizizz orqali real vaqt rejimida turnirlar",
        "Natijalarni avtomatik hisoblash va jurnalga kiritish"
      ],
      fullDescription: "O'qituvchi ma'ruza matnini kiritib, istalgan darajadagi test topshiriqlarini avtomatik tuzib olishi mumkin. Shuningdek, talabalarning bilimini geymifikatsiya orqali sinash uchun Quizizz musobaqalari o'tkaziladi.",
      linkTo: "/quizizz",
      actionText: "Quizizz / Testlar"
    },
    {
      id: 'lms',
      category: 'lms',
      title: "Modulli LMS va Ta'lim Tizimi",
      badge: "LMS & Boshqaruv",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: GraduationCap,
      shortDesc: "Modulli onlayn darslar, videoma'ruzalar, guruhlar boshqaruvi hamda elektron jurnal va davomat nazorati.",
      highlights: [
        "Guruhlar va kafedralar raqamli strukturasi",
        "Talaba va o'qituvchilar uchun moslashtirilgan panellar",
        "O'zlashtirish statistikasi va baholash jurnali"
      ],
      fullDescription: "AIEDUTIZIM platformasi OTM va ta'lim muassasalari uchun mo'ljallangan LMS tizimidir. O'qituvchilar o'z kurslarini modullarga ajratib joylaydilar, talabalar topshiriqlarni bajaradi va natijalar haqqoniy qayd etiladi.",
      linkTo: "/courses",
      actionText: "Kurslar"
    },
    {
      id: 'certificates',
      category: 'certificates',
      title: "QR-Kodli Sertifikatlar va Reestr",
      badge: "Verifikatsiya",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: Award,
      shortDesc: "Muvaffaqiyatli yakunlangan kurs hamda testlar uchun QR-kodli rasmiy sertifikatlarni taqdim etish.",
      highlights: [
        "Har bir sertifikat uchun unikal seriyali raqam va QR-kod",
        "Onlayn verifikatsiya va haqiqiylikni tekshirish",
        "PDF va rasm ko'rinishida saqlash"
      ],
      fullDescription: "Talaba kursni yakunlaganda yoki musobaqalarda g'olib bo'lganda, tizim avtomatik ravishda rasmiy sertifikat taqdim etadi. Sertifikatlarning haqiqiyligini QR-kodni skanerlash orqali tekshirish mumkin.",
      linkTo: "/search-cert",
      actionText: "Sertifikat Tekshirish"
    },
    {
      id: 'telegrambot',
      category: 'bot',
      title: "Telegram Bot (@aiedutizim_bot)",
      badge: "Mobil Bot",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: Bot,
      shortDesc: "Telegram ilovasi orqali mobil telefonda AI yordamida akademik hujjatlar va konsultatsiya olish.",
      highlights: [
        "Mobil telefondan turib tezkor foydalanish",
        "Veb-platforma bilan yagona balans va akkaunt",
        "24/7 rejimida tezkor javoblar"
      ],
      fullDescription: "Telegram botimiz foydalanuvchilarga istalgan vaqtda va joyda AI imkoniyatlaridan foydalanish imkonini beradi. Telegram orqali ham Kurs ishlari, ma'ruzalar va taqdimotlarni shakllantirishingiz mumkin.",
      linkTo: "https://t.me/aiedutizim_bot",
      actionText: "Telegram Bot"
    },
    {
      id: 'antiplagiarism',
      category: 'documents',
      title: "AI Antiplagiat va Akademik Tahlil",
      badge: "Tahlil Moduli",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: Sparkles,
      shortDesc: "Ilmiy va akademik matnlarning unikalligini tahlil qilish, takrorlanishlarni aniqlash hamda tahrirlash.",
      highlights: [
        "Matn originalligi va unikallik darajasi",
        "Akademik uslub va til xatolarini tuzatish",
        "Tahliliy hisobot va tavsiyalar"
      ],
      fullDescription: "AI Antiplagiat moduli foydalanuvchi yuklagan matnlarni tahlil qiladi hamda akademik standartlarga mosligini baholaydi. Matnning unikal darajasini oshirish bo'yicha tavsiyalar beradi.",
      linkTo: "/tariffs",
      actionText: "Matnni Tahlil Qilish"
    },
    {
      id: 'cv_builder',
      category: 'documents',
      title: "Obektivka va Professional CV Generator",
      badge: "Davlat Standarti",
      badgeBg: "bg-gray-100 border-gray-200",
      badgeTextColor: "text-gray-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: FileText,
      shortDesc: "Davlat xizmati standartlaridagi rasmiy Ma'lumotnoma (Obektivka) va rezyume yaratish.",
      highlights: [
        "Davlat xizmati standartlariga mos shakl",
        "Tartibli va tushunarli struktura",
        "Word (.docx) hamda PDF formatida yuklab olish"
      ],
      fullDescription: "O'qituvchilar va talabalar uchun mehnat faoliyati hamda ma'lumotnomalarni tezkor shakllantirish vositasi. Kiritilgan ma'lumotlar avtomatik ravishda rasmiy Obektivka shabloniga tushadi.",
      linkTo: "/tariffs",
      actionText: "Obektivka Yaratish"
    }
  ];

  const filteredFeatures = activeCategory === 'all' 
    ? platformFeatures 
    : platformFeatures.filter(f => f.category === activeCategory);

  if (!content) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-gray-400">Yuklanmoqda...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-16 pb-20 pt-8">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[450px]">
           {/* Banner Slider */}
          <div className={`${content.hero.showInfoSection === false ? 'lg:col-span-3' : 'lg:col-span-2'} relative mac-window overflow-hidden group`}>
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

      {/* Features / Capabilities Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-16" id="imkoniyatlar">
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold text-xs uppercase tracking-wider mb-3">
            <BrainCircuit className="h-3.5 w-3.5" /> Platforma Imkoniyatlari
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            PLATFORMAMIZ IMKONIYATLARI
          </h2>
          <p className="mt-2 text-gray-500 font-normal text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            AIEDUTIZIM — Ta'lim sifatini oshirish va akademik jarayonlarni raqamlashtirishga qaratilgan ekotizim.
          </p>
        </div>

        {/* High-level Overview Card */}
        <div className="bg-slate-900 text-white p-6 md:p-8 mb-10 rounded-2xl shadow-sm border border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
                <Zap className="h-3.5 w-3.5 text-blue-400" /> Veb-Platforma & Telegram Bot
              </div>
              <h3 className="text-xl md:text-2xl font-bold">
                Ta'lim va Ilmiy Faoliyat uchun Birlashgan Ekotizim
              </h3>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                Tizim Veb-portal va <strong>@aiedutizim_bot</strong> orqali o'qituvchilar hamda talabalarga uzluksiz raqamli xizmat ko'rsatadi.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-center">
              <Link 
                to="/info" 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-center text-xs transition-all flex items-center justify-center gap-2"
              >
                <Info className="h-3.5 w-3.5" /> Batafsil ma'lumot
              </Link>
              <a 
                href="https://t.me/aiedutizim_bot" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-center text-xs transition-all flex items-center justify-center gap-2"
              >
                <Send className="h-3.5 w-3.5 text-sky-400" /> Telegram Bot
              </a>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'documents', label: 'AI Hujjatlar' },
            { id: 'tests', label: 'Test & Quizizz' },
            { id: 'lms', label: 'Modulli LMS' },
            { id: 'certificates', label: 'Sertifikatlar' },
            { id: 'bot', label: 'Telegram Bot' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition-all ${
                activeCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeatures.map((f) => {
            const IconComp = f.icon;
            return (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {f.badge}
                    </span>
                  </div>

                  {/* Title & Short Desc */}
                  <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-4">
                    {f.shortDesc}
                  </p>

                  {/* Bullet Highlights */}
                  <div className="space-y-1.5 mb-5 border-t border-gray-100 pt-3">
                    {f.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedFeature(f)}
                    className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium rounded-lg text-xs transition-colors text-center"
                  >
                    Batafsil
                  </button>
                  {f.linkTo && (
                    f.linkTo.startsWith('http') ? (
                      <a
                        href={f.linkTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        {f.actionText || "O'tish"} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        to={f.linkTo}
                        className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        {f.actionText || "O'tish"} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Feature Details Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 border border-gray-200 shadow-xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedFeature(null)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <selectedFeature.icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200 inline-block mb-1">
                    {selectedFeature.badge}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{selectedFeature.title}</h3>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Tavsif</h4>
                  <p className="text-gray-700 text-xs md:text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {selectedFeature.fullDescription}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Afzalliklari</h4>
                  <div className="space-y-2">
                    {selectedFeature.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-gray-200/70">
                        <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700 font-medium">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex items-center gap-2 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-xs transition-colors"
                  >
                    Yopish
                  </button>
                  {selectedFeature.linkTo && (
                    selectedFeature.linkTo.startsWith('http') ? (
                      <a
                        href={selectedFeature.linkTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        {selectedFeature.actionText || "O'tish"} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link
                        to={selectedFeature.linkTo}
                        onClick={() => setSelectedFeature(null)}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        {selectedFeature.actionText || "O'tish"} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
      <footer className="bg-[#fafafa] border-t border-slate-100/80 pt-12 pb-10 mt-16 text-slate-500">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-8 mb-8 border-b border-slate-200/30">
            
            {/* 1. Logo & Description */}
            <div className="col-span-1 flex flex-col justify-start">
              <Link to="/" className="flex items-center gap-2 mb-3">
                {content?.footer?.logoUrl ? (
                  <img src={makeDirectImageUrl(content.footer.logoUrl || null)} referrerPolicy="no-referrer" alt="Logo" className="h-8 object-contain" />
                ) : (
                  <>
                    <div className="rounded-lg bg-[#007aff] p-1.5 shadow-sm">
                      <BrainCircuit className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-800 tracking-tight">
                      AIEDU<span className="text-[#007aff]">TIZIM</span>
                    </span>
                  </>
                )}
              </Link>
              <p className="text-slate-500 text-xs font-normal leading-relaxed max-w-xs whitespace-pre-line">
                {content?.footer?.description || content?.footer?.top || "Raqamli ta'limda sun'iy intellekt.\nZamonaviy texnologiyalar va sun'iy intellekt yordamida ta'lim sifatini oshirishga qaratilgan platforma."}
              </p>
            </div>

            {/* 2. Tezkor havolalar */}
            <div className="col-span-1 md:pl-10">
              <h4 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-widest">Tezkor havolalar</h4>
              <ul className="space-y-2 text-xs font-medium">
                <li><Link to="/" className="text-slate-500 hover:text-[#007aff] transition-colors">Bosh sahifa</Link></li>
                <li><Link to="/courses" className="text-slate-500 hover:text-[#007aff] transition-colors">Kurslar</Link></li>
                <li><Link to="/tests" className="text-slate-500 hover:text-[#007aff] transition-colors">Testlar</Link></li>
                <li><Link to="/contact" className="text-slate-500 hover:text-[#007aff] transition-colors">Aloqa</Link></li>
              </ul>
            </div>

            {/* 3. Aloqa ma'lumotlari */}
            <div className="col-span-1">
              <h4 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-widest">Aloqa ma'lumotlari</h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-500 leading-relaxed font-normal">
                  {content?.footer?.address || "Toshkent shahri, Chilonzor tumani, Bunyodkor ko'chasi 1-uy"}
                </li>
                <li className="text-slate-500 font-medium">
                  <a href={`tel:${content?.footer?.phone || '+998914305676'}`} className="hover:text-[#007aff] transition-colors">
                    {content?.footer?.phone || "+998 91 430 56 76"}
                  </a>
                </li>
                <li className="text-slate-500 font-medium">
                  <a href={`mailto:${content?.footer?.email || 'info@raqamlitalim.uz'}`} className="hover:text-[#007aff] transition-colors">
                    {content?.footer?.email || "info@raqamlitalim.uz"}
                  </a>
                </li>
                <li className="text-slate-400 font-normal">
                  {content?.footer?.workingHours || "Dushanba-Juma: 9:00 - 18:00"}
                </li>
              </ul>
            </div>
            
          </div>
          
          {/* Bottom & Social Icons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-normal">
            <span>{content?.footer?.bottom || "© 2024 Raqamli Ta'lim. Barcha huquqlar himoyalangan."}</span>
            <div className="flex items-center gap-2.5">
               {content?.footer?.telegram ? (
                 <a 
                   href={formatSocialLink(content.footer.telegram, 'telegram')} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="w-9 h-9 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc] hover:border-[#0088cc] hover:text-white flex items-center justify-center transition-all duration-300 group shadow-sm"
                   title="Telegram"
                   id="footer-social-telegram"
                 >
                   <Send className="h-4 w-4 transform group-hover:scale-105 transition-transform" />
                 </a>
               ) : (
                 <span 
                   className="w-9 h-9 rounded-xl bg-slate-100/50 text-slate-300 flex items-center justify-center border border-slate-200/30 cursor-not-allowed"
                   title="Telegram (kiritilmagan)"
                   id="footer-social-telegram-disabled"
                 >
                   <Send className="h-4 w-4" />
                 </span>
               )}
               
               {content?.footer?.instagram ? (
                 <a 
                   href={formatSocialLink(content.footer.instagram, 'instagram')} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="w-9 h-9 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 text-[#E1306C] hover:bg-[#E1306C] hover:border-[#E1306C] hover:text-white flex items-center justify-center transition-all duration-300 group shadow-sm"
                   title="Instagram"
                   id="footer-social-instagram"
                 >
                   <Instagram className="h-4 w-4 transform group-hover:scale-105 transition-transform" />
                 </a>
               ) : (
                 <span 
                   className="w-9 h-9 rounded-xl bg-slate-100/50 text-slate-300 flex items-center justify-center border border-slate-200/30 cursor-not-allowed"
                   title="Instagram (kiritilmagan)"
                   id="footer-social-instagram-disabled"
                 >
                   <Instagram className="h-4 w-4" />
                 </span>
               )}

               {content?.footer?.youtube ? (
                 <a 
                   href={formatSocialLink(content.footer.youtube, 'youtube')} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="w-9 h-9 rounded-xl bg-[#FF0000]/10 border border-[#FF0000]/20 text-[#FF0000] hover:bg-[#FF0000] hover:border-[#FF0000] hover:text-white flex items-center justify-center transition-all duration-300 group shadow-sm"
                   title="YouTube"
                   id="footer-social-youtube"
                 >
                   <Youtube className="h-4 w-4 transform group-hover:scale-105 transition-transform" />
                 </a>
               ) : (
                 <span 
                   className="w-9 h-9 rounded-xl bg-slate-100/50 text-slate-300 flex items-center justify-center border border-slate-200/30 cursor-not-allowed"
                   title="YouTube (kiritilmagan)"
                   id="footer-social-youtube-disabled"
                 >
                   <Youtube className="h-4 w-4" />
                 </span>
               )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
