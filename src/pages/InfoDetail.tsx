import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SiteContent, InfoSection } from '../types';
import { ArrowLeft, FileText, Download, Lock, Check, Layout, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { makeDirectImageUrl } from '../lib/helpers';

const systemAboutSection: InfoSection = {
  id: 'system-about',
  name: 'Tizim haqida',
  content: `AIEDUTIZIM — Zamonaviy Sun'iy Intellekt va EdTech Texnologiyalari Integratsiyasi

Ushbu platforma oliy va o'rta maxsus ta'lim tizimida o'qitish va ilmiy tadqiqotlar sifatini oshirish, o'qituvchilar va talabalarning vaqtini tejash hamda o'quv jarayonlarini to'liq avtomatlashtirish maqsadida yaratilgan keng qamrovli ekotizimdir. Loyiha ikki yirik va bir-birini mukammal to'ldiruvchi komponentdan tashkil topgan: Zamonaviy Veb-Platforma hamda Aqlli AI Yordamchi Telegram Boti.

Ushbu har ikki tizim birgalikda ta'lim va ilmiy faoliyatda inqilobiy yondashuvlarni joriy qilish, vaqtni tejash va akademik sifatni mutlaqo yangi bosqichga olib chiqish maqsadida hamkorlikda ishlaydi.

1. ZAMONAVIY VEB-PLATFORMA (WEB-APPLICATION)
Veb-saytimiz o'qituvchilar, talabalar va ma'muriyat uchun yagona raqamli makon vazifasini o'taydi. Uning asosiy imkoniyatlari quyidagilardan iborat:
• Onlayn Kurslar va Modullar: O'qituvchilar tomonidan yaratilgan interaktiv darsliklar va o'quv modullari multimedia hamda videodarslar bilan boyitilgan.
• Aqlli Test va Baholash Tizimi (Quizizz): Sun'iy intellekt yordamida fanlar va ma'ruzalar bo'yicha avtomatik sifatli test savollari shakllantiriladi hamda talabalarning bilimlari xolis baholanadi.
• QR-Kodli Raqamli Sertifikatlar: Kurs va testlarni muvaffaqiyatli yakunlagan talabalarga tizim tomonidan avtomatlashtirilgan, haqiqiyligi tekshiriladigan xalqaro standartdagi sertifikatlar taqdim etiladi va ularni "Verify Certificate" sahifasida tezkor tekshirish imkoniyati mavjud.
• Shaxsiy Kabinetlar va Chat: Student, Teacher, Staff va Admin rollari uchun alohida moslashtirilgan qulay shaxsiy panellar hamda guruh ichidagi chat muloqoti. Talabalar o'z ballarini kuzatishi, o'qituvchilar esa guruhlar va ma'ruzalarni boshqarishi mumkin.

2. AQLLI AI YORDAMCHI (TELEGRAM BOT)
Bizning maxsus Telegram botimiz (@AIEDUTIZIM_bot) o'quvchi va yosh tadqiqotchilarga ilmiy faoliyatda eng yuqori sifatli va tezkor akademik yordam ko'rsatuvchi professional sun'iy intellekt yordamchisidir. Telegram bot tarkibidagi asosiy xizmatlar:
• Oliy Sifatli Kurs Ishlari (Term Paper): OTM standartlari, OAK va kafedra talablariga mos, doimiy 15 sahifadan 50 sahifagacha bo'lgan, barcha boblari va bo'limlari ilmiy asoslangan mukammal kurs ishlarini avtomatik tayyorlash. Har bir bob kamida 1000-2000 so'zdan iborat bo'lib, o'ta batafsil va jadval hamda diagramma tavsiyalari bilan shakllantiriladi.
• Ilmiy Maqolalar va Tezislar: IMRAD va xalqaro Scopus standartlari darajasidagi professional ilmiy maqolalar hamda ixcham akademik tezislarni o'zbek va xorijiy tillarda mukammal yozib berish.
• Zamonaviy Slaydlar va Taqdimotlar: Kurs ishi yoki maqola himoyalariga moslangan, dizayn rejalashtirilgan, minimal matnli hamda har bir slayd uchun 30-50 soniyalik professional nutq ssenariysi (Speech Note) bilan tushunarli bo'lgan taqdimot loyihalarini yaratish.
• Dars Ishlanmalari (Lesson Plans): Pedagoglar uchun 13 banddan iborat zamonaviy pedagogik texnologiyalarga mos dars rejalari va metodik hujjatlarni taqdim etish.
• Professional CV / Rezyume: Ish beruvchi va HR mutaxassislarini jalb qiladigan zamonaviy dizayn va strukturali rezyumelarni tezkor yaratish.
• Tarjimonlar va Akademik Hisobotlar: Murakkab ilmiy va pedagogik matnlarni o'zbek tiliga yoki xorijiy tillarga professional tarjima qilish va tahliliy hisobotlar tuzish.

TIZIMNING ASOSIY AFZALLIKLARI:
• Vaqt va resurslarni 10 barobargacha tejash: Murakkab ilmiy ishlarni bir necha daqiqada sifatli tayyorlash.
• Ilmiy va innovatsion yondashuv: O'zbekistondagi eng ilg'or generative AI (Sun'iy intellekt) texnologiyalarini ta'limga faol tatbiq qilish.
• Foydalanish uchun qulaylik: Istalgan vaqtda va istalgan qurilmada (mobil, planshet, noutbuk) ishlovchi yagona ekotizim.

AIEDUTIZIM — zamonaviy ilm-fan va innovatsion ta'limning mutlaqo yangi kelajagidir!`
};

export default function InfoDetail() {
  const [content, setContent] = useState<SiteContent['hero'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState<Record<string, boolean>>({});
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  useEffect(() => {
    async function load() {
      let heroData: SiteContent['hero'] | null = null;
      try {
        const snap = await getDoc(doc(db, 'siteContent', 'main'));
        if (snap.exists()) {
          const data = snap.data() as SiteContent;
          if (data.hero) {
            heroData = data.hero;
          }
        }
      } catch (err) {
        console.error('Error fetching siteContent:', err);
      }

      if (!heroData) {
        heroData = {
          rightImage: '',
          rightBadge: 'Yangilik',
          rightText: 'AIEDUTIZIM Tizimi',
          infoSections: []
        };
      }

      const sections = heroData.infoSections || [];
      const hasSystemAbout = sections.some(s => s.id === 'system-about');
      const updatedSections = hasSystemAbout ? sections : [systemAboutSection, ...sections];
      const updatedHero = {
        ...heroData,
        infoSections: updatedSections
      };

      setContent(updatedHero);
      setActiveTab(updatedSections[0].id);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
       </div>
     );
  }

  if (!content) return null;

  const currentSection = content.infoSections?.find(s => s.id === activeTab);

  const handleTabClick = (section: InfoSection) => {
    if (section.isProtected && !isUnlocked[section.id]) {
      setShowPasswordPrompt(true);
      setActiveTab(section.id);
    } else {
      setActiveTab(section.id);
      setShowPasswordPrompt(false);
    }
  };

  const verifyPassword = () => {
    if (password === '11042002aA') {
      setIsUnlocked({ ...isUnlocked, [activeTab!]: true });
      setShowPasswordPrompt(false);
      setPassword('');
    } else {
      alert('Kod xato!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-20 pb-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors">
          <ArrowLeft className="h-5 w-5" /> Bosh sahifaga qaytish
        </Link>

        <div>
           <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Batafsil ma'lumot</h2>
              <p className="text-gray-500 mt-2 font-medium">Kerakli bo'limni tanlang va ma'lumotlar bilan tanishing.</p>
           </div>
           
           <div className="flex flex-wrap justify-center gap-3">
              {content.infoSections?.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleTabClick(s)}
                  className={`px-8 py-4 rounded-2xl font-black transition-all text-sm uppercase tracking-widest ${activeTab === s.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 -translate-y-1' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                  {s.isProtected && !isUnlocked[s.id] && <Lock className="w-4 h-4 inline-block mr-2" />}
                  {s.name}
                </button>
              ))}
           </div>
        </div>

        {/* Section Content */}
        <div className="bg-white rounded-[40px] p-10 md:p-16 border border-gray-100 shadow-xl min-h-[400px]">
           <AnimatePresence mode="wait">
              {showPasswordPrompt ? (
                <motion.div 
                  key="password"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-md mx-auto text-center space-y-8 py-20"
                >
                  <div className="w-20 h-20 bg-yellow-50 rounded-3xl flex items-center justify-center text-yellow-600 mx-auto animate-bounce">
                    <Lock className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Ushbu bo'lim maxfiy</h3>
                    <p className="text-gray-500 mt-2 font-medium">Kirish uchun maxfiy kodni kiriting.</p>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="password"
                      placeholder="Maxfiy kodni yozing..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 text-center text-xl font-black tracking-widest"
                    />
                    <button 
                      onClick={verifyPassword}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-xl"
                    >
                      TASDIQLASH
                    </button>
                  </div>
                </motion.div>
              ) : currentSection ? (
                <motion.div
                  key={currentSection.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-16"
                >
                  <div className="prose prose-2xl max-w-none text-gray-900 font-bold whitespace-pre-wrap leading-[1.6]">
                    {currentSection.content}
                  </div>

                  {currentSection.images && currentSection.images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {currentSection.images.map((img, i) => (
                         <div key={i} className="mac-window rounded-3xl overflow-hidden shadow-2xl hover:scale-[1.02] transition-transform cursor-pointer">
                           <img src={makeDirectImageUrl(img)} referrerPolicy="no-referrer" className="w-full h-auto" onClick={() => window.open(makeDirectImageUrl(img), '_blank')} />
                         </div>
                       ))}
                    </div>
                  )}

                  {currentSection.files && currentSection.files.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentSection.files.map((file, i) => (
                        <a 
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.type !== 'link' ? file.name : undefined}
                          className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-6 hover:bg-white hover:shadow-2xl transition-all group border-b-4 border-b-gray-100 hover:border-b-blue-600"
                        >
                           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                             <FileText className="w-8 h-8" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-xl font-black text-gray-900 truncate tracking-tight">{file.name}</p>
                             <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1 opacity-60">
                               {file.type === 'link' ? "Havolaga o'tish" : "Siz yuklab olishingiz mumkin"}
                             </p>
                           </div>
                           <div className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 group-hover:text-blue-600 transition-colors">
                             {file.type === 'link' ? <ExternalLink className="w-6 h-6" /> : <Download className="w-6 h-6" />}
                           </div>
                        </a>
                      ))}
                    </div>
                  )}
                  
                  {(!currentSection.content && (!currentSection.images || currentSection.images.length === 0) && (!currentSection.files || currentSection.files.length === 0)) && (
                    <div className="text-center py-20 opacity-20 filter grayscale">
                       <Layout className="w-20 h-20 mx-auto mb-4" />
                       <p className="text-xl font-black uppercase tracking-[0.2em]">Malumotlar yo'q</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="text-center py-20 opacity-20 filter grayscale">
                   <h3 className="text-xl font-black uppercase tracking-[0.2em]">Bo'lim tanlanmadi</h3>
                </div>
              )}
           </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
