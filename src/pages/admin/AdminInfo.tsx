import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteContent, InfoSection } from '../../types';
import { 
  Save, Loader2, Image as ImageIcon, Type, FileText, Plus, Trash2, 
  Globe, Layout, Lock, Unlock, FileUp, TextSelection, CheckCircle2, 
  Link as LinkIcon, X, Download, ExternalLink, AlertCircle 
} from 'lucide-react';
import { makeDirectImageUrl } from '../../lib/helpers';
import { uploadFileToServer, isAllowedDocument, compressImage } from '../../lib/uploadHelper';

export default function AdminInfo() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<null | 'saving' | 'saved'>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [uploadToast, setUploadToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileToStorage = async (file: File, disableProgressCounter = false): Promise<string> => {
    if (!disableProgressCounter) {
      setIsUploading(true);
      setUploadProgress(15);
      setUploadingFileName(file.name);
    }
    try {
      return await uploadFileToServer(file, (p) => {
        if (!disableProgressCounter) {
          setUploadProgress(p);
        }
      });
    } finally {
      if (!disableProgressCounter) {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFileName('');
      }
    }
  };

  const handleUploadSectionItem = async (sectionId: string, itemType: 'image' | 'file', file: File) => {
    if (!content) return;
    
    const fileName = file.name;
    
    if (itemType === 'file') {
      if (!isAllowedDocument(fileName)) {
        console.warn(`Ogohlantirish: Nojo'ya fayl formati: ${fileName}`);
        alert("Faqat PDF, Word, Excel, PowerPoint, Text, Arxiv yoki boshqa standart hujjat formatlarini yuklash mumkin!");
        return;
      }
    } else if (itemType === 'image') {
      const isImg = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(fileName);
      if (!isImg) {
        console.error("Xatolik: Nojo'ya rasm formati:", file.type);
        alert("Faqat rasm fayllarini (JPG, PNG, WEBP, GIF, SVG) yuklash mumkin!");
        return;
      }
    }

    try {
      setIsUploading(true);
      setUploadProgress(15);
      setUploadingFileName(file.name);

      const downloadUrl = await uploadFileToServer(file, (p) => setUploadProgress(p));
      
      const updatedSections = (content.hero.infoSections || []).map(s => {
        if (s.id === sectionId) {
          if (itemType === 'image') {
            const currentImages = s.images || [];
            return { ...s, images: [...currentImages, downloadUrl] };
          } else {
            const currentFiles = s.files || [];
            return { 
              ...s, 
              files: [...currentFiles, { name: file.name, url: downloadUrl, type: file.type || 'application/octet-stream' }] 
            };
          }
        }
        return s;
      });

      const updatedContent = {
        ...content,
        hero: {
          ...content.hero,
          infoSections: updatedSections
        }
      };

      // Write directly to Firestore and local cache
      await setDoc(doc(db, 'siteContent', 'main'), updatedContent, { merge: true });
      
      console.log(`Muvaffaqiyatli saqlandi. Hujjat nomi: ${file.name}`);
      setContent(updatedContent);
      localStorage.setItem('site_content_main_cache', JSON.stringify(updatedContent));
      setUploadToast({ type: 'success', message: `"${file.name}" muvaffaqiyatli yuklandi va saqlandi!` });
      setTimeout(() => setUploadToast(null), 4000);
    } catch (err: any) {
      console.error("Fayl yuklashda xatolik yuz berdi:", err);
      setUploadToast({ type: 'error', message: "Yuklashda xatolik: " + (err.message || 'Nomaʼlum xato') });
      setTimeout(() => setUploadToast(null), 5000);
      alert("Yuklashda xatolik yuz berdi: " + (err.message || "Noma'lum xato"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadingFileName('');
    }
  };

  useEffect(() => {
    // Load from cache first
    const cached = localStorage.getItem('site_content_main_cache');
    if (cached) {
      const data = JSON.parse(cached);
      setContent(data);
      if (data.hero.infoSections?.length > 0) setActiveTab(data.hero.infoSections[0].id);
    }

    async function load() {
      try {
        const snap = await getDoc(doc(db, 'siteContent', 'main'));
        let data: SiteContent;
        if (snap.exists()) {
          data = snap.data() as SiteContent;
        } else {
          data = {
            hero: { rightImage: '', rightText: '', rightBadge: 'Yangilik', detailHtml: '', detailFiles: [], infoSections: [] },
            banners: [],
            footer: { top: '', bottom: '' }
          };
        }

        // Ensure defaults and initial sections
        if (!data.hero.infoSections) data.hero.infoSections = [];
        
        const sections = data.hero.infoSections;
        if (!sections.some(s => s.id === 'system-about')) {
          sections.unshift({
            id: 'system-about',
            name: 'Tizim haqida',
            content: `AIEDUTIZIM — Zamonaviy Sun'iy Intellekt va EdTech Texnologiyalari Integratsiyasi\n\nUshbu platforma oliy va o'rta maxsus ta'lim tizimida o'qitish va ilmiy tadqiqotlar sifatini oshirish, o'qituvchilar va talabalarning vaqtini tejash hamda o'quv jarayonlarini to'liq avtomatlashtirish maqsadida yaratilgan keng qamrovli ekotizimdir. Loyiha ikki yirik va bir-birini mukammal to'ldiruvchi komponentdan tashkil topgan: Zamonaviy Veb-Platforma hamda Aqlli AI Yordamchi Telegram Boti.\n\nUshbu har ikki tizim birgalikda ta'lim va ilmiy faoliyatda inqilobiy yondashuvlarni joriy qilish, vaqtni tejash va akademik sifatni mutlaqo yangi bosqichga olib chiqish maqsadida hamkorlikda ishlaydi.\n\n1. ZAMONAVIY VEB-PLATFORMA (WEB-APPLICATION)\nVeb-saytimiz o'qituvchilar, talabalar va ma'muriyat uchun yagona raqamli makon vazifasini o'taydi. Uning asosiy imkoniyatlari quyidagilardan iborat:\n• Onlayn Kurslar va Modullar: O'qituvchilar tomonidan yaratilgan interaktiv darsliklar va o'quv modullari multimedia hamda videodarslar bilan boyitilgan.\n• Aqlli Test va Baholash Tizimi (Quizizz): Sun'iy intellekt yordamida fanlar va ma'ruzalar bo'yicha avtomatik sifatli test savollari shakllantiriladi hamda talabalarning bilimlari xolis baholanadi.\n• QR-Kodli Raqamli Sertifikatlar: Kurs va testlarni muvaffaqiyatli yakunlagan talabalarga tizim tomonidan avtomatlashtirilgan, haqiqiyligi tekshiriladigan xalqaro standartdagi sertifikatlar taqdim etiladi va ularni "Verify Certificate" sahifasida tezkor tekshirish imkoniyati mavjud.\n• Shaxsiy Kabinetlar va Chat: Student, Teacher, Staff va Admin rollari uchun alohida moslashtirilgan qulay shaxsiy panellar hamda guruh ichidagi chat muloqoti. Talabalar o'z ballarini kuzatishi, o'qituvchilar esa guruhlar va ma'ruzalarni boshqarishi mumkin.\n\n2. AQLLI AI YORDAMCHI (TELEGRAM BOT)\nBizning maxsus Telegram botimiz (@AIEDUTIZIM_bot) o'quvchi va yosh tadqiqotchilarga ilmiy faoliyatda eng yuqori sifatli va tezkor akademik yordam ko'rsatuvchi professional sun'iy intellekt yordamchisidir. Telegram bot tarkibidagi asosiy xizmatlar:\n• Oliy Sifatli Kurs Ishlari (Term Paper): OTM standartlari, OAK va kafedra talablariga mos, doimiy 15 sahifadan 50 sahifagacha bo'lgan, barcha boblari va bo'limlari ilmiy asoslangan mukammal kurs ishlarini avtomatik tayyorlash. Har bir bob kamida 1000-2000 so'zdan iborat bo'lib, o'ta batafsil va jadval hamda diagramma tavsiyalari bilan shakllantiriladi.\n• Ilmiy Maqolalar va Tezislar: IMRAD va xalqaro Scopus standartlari darajasidagi professional ilmiy maqolalar hamda ixcham akademik tezislarni o'zbek va xorijiy tillarda mukammal yozib berish.\n• Zamonaviy Slaydlar va Taqdimotlar: Kurs ishi yoki maqola himoyalariga moslangan, dizayn rejalashtirilgan, minimal matnli hamda har bir slayd uchun 30-50 soniyalik professional nutq ssenariysi (Speech Note) bilan tushunarli bo'lgan taqdimot loyihalarini yaratish.\n• Dars Ishlanmalari (Lesson Plans): Pedagoglar uchun 13 banddan iborat zamonaviy pedagogik texnologiyalarga mos dars rejalari va metodik hujjatlarni taqdim etish.\n• Professional CV / Rezyume: Ish beruvchi va HR mutaxassislarini jalb qiladigan zamonaviy dizayn va strukturali rezyumelarni tezkor yaratish.\n• Tarjimonlar va Akademik Hisobotlar: Murakkab ilmiy va pedagogik matnlarni o'zbek tiliga yoki xorijiy tillarga professional tarjima qilish va tahliliy hisobotlar tuzish.\n\nTIZIMNING ASOSIY AFZALLIKLARI:\n• Vaqt va resurslarni 10 barobargacha tejash: Murakkab ilmiy ishlarni bir necha daqiqada sifatli tayyorlash.\n• Ilmiy va innovatsion yondashuv: O'zbekistondagi eng ilg'or generative AI (Sun'iy intellekt) texnologiyalarini ta'limga faol tatbiq qilish.\n• Foydalanish uchun qulaylik: Istalgan vaqtda va istalgan qurilmada (mobil, planshet, noutbuk) ishlovchi yagona ekotizim.\n\nAIEDUTIZIM — zamonaviy ilm-fan va innovatsion ta'limning mutlaqo yangi kelajagidir!`,
            files: [],
            images: []
          });
        }
        if (!sections.some(s => s.id === 'general')) {
          sections.push({ id: 'general', name: 'Umumiy', content: 'Umumiy ma\'lumotlar...', files: [], images: [] });
        }
        if (!sections.some(s => s.id === 'my_docs')) {
          sections.push({ id: 'my_docs', name: 'Hujjatlarim', isProtected: true, content: 'Maxfiy hujjatlar...', files: [], images: [] });
        }
        
        setContent(data);
        localStorage.setItem('site_content_main_cache', JSON.stringify(data));
        if (sections.length > 0 && !activeTab) setActiveTab(sections[0].id);
      } catch (err: any) {
        console.error("Info load error:", err);
        if (err.message?.includes('Quota')) {
          console.warn("Quota limit hit in AdminInfo. Using cache.");
        }
      }
    }
    load();
  }, []);

  const handleHeroUpdate = async () => {
    if (!content) return;
    setSaveStatus('saving');

    try {
      let finalRightImage = content.hero.rightImage || '';
      if (finalRightImage.startsWith('blob:') || finalRightImage.startsWith('data:')) {
        setIsUploading(true);
        const res = await fetch(finalRightImage);
        const blob = await res.blob();
        const file = new File([blob], 'hero_image.jpg', { type: blob.type });
        finalRightImage = await uploadFileToStorage(file, false);
      }

      await setDoc(doc(db, 'siteContent', 'main'), { 
        hero: { 
          rightImage: finalRightImage, 
          rightText: content.hero.rightText || '', 
          rightBadge: content.hero.rightBadge || '',
          showInfoSection: content.hero.showInfoSection !== false
        } 
      }, { merge: true });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) { 
      console.error(err); 
      setSaveStatus(null);
      alert("Saqlashda xatolik yuz berdi: " + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const [sectionSaveStatus, setSectionSaveStatus] = useState<null | 'saving' | 'saved'>(null);
  const [linkPrompt, setLinkPrompt] = useState<{ type: 'image' | 'file', sectionId: string } | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const handleSectionUpdate = async () => {
    if (!content) return;
    
    setSectionSaveStatus('saving');

    const newSections = JSON.parse(JSON.stringify(content.hero.infoSections || [])) as InfoSection[];
    
    try {
        let totalBlobsToUpload = 0;
        let uploadedBlobsCount = 0;
        
        for (const sec of newSections) {
          for (const imgUrl of (sec.images || [])) {
            if (imgUrl.startsWith('blob:') || imgUrl.startsWith('data:')) totalBlobsToUpload++;
          }
          for (const f of (sec.files || [])) {
            if (f.url.startsWith('blob:') || f.url.startsWith('data:')) totalBlobsToUpload++;
          }
        }

        if (totalBlobsToUpload > 0) {
          setIsUploading(true);
          setUploadProgress(0);

          const uploadBlobUrl = async (blobUrl: string, originalName: string = 'image.jpg') => {
            const res = await fetch(blobUrl);
            const blob = await res.blob();
            const file = new File([blob], originalName, { type: blob.type });
            const realUrl = await uploadFileToStorage(file, totalBlobsToUpload > 1);
            uploadedBlobsCount++;
            if (totalBlobsToUpload > 1) {
              setUploadProgress(Math.round((uploadedBlobsCount / totalBlobsToUpload) * 100));
            }
            return realUrl;
          };

          for (const section of newSections) {
            if (section.images) {
              const newImages: string[] = [];
              for (const img of section.images) {
                if (img.startsWith('blob:') || img.startsWith('data:')) {
                   newImages.push(await uploadBlobUrl(img, 'image.jpg'));
                } else {
                   newImages.push(img);
                }
              }
              section.images = newImages;
            }
            if (section.files) {
              const newFiles = [];
              for (const f of section.files) {
                if (f.url.startsWith('blob:') || f.url.startsWith('data:')) {
                   const newUrl = await uploadBlobUrl(f.url, f.name);
                   newFiles.push({ ...f, url: newUrl });
                } else {
                   newFiles.push(f);
                }
              }
              section.files = newFiles;
            }
          }
        }

        await setDoc(doc(db, 'siteContent', 'main'), { 
          hero: { infoSections: newSections } 
        }, { merge: true });
        
        setContent(prev => {
          if (!prev) return prev;
          return { ...prev, hero: { ...prev.hero, infoSections: newSections } }
        });

        setSectionSaveStatus('saved');
        setTimeout(() => setSectionSaveStatus(null), 3000);
      } catch (err) { 
        console.error(err); 
        setSectionSaveStatus(null);
        alert("Xatolik: " + (err as Error).message);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
  };

  const addSection = () => {
    if (!content) return;
    const id = `sec_${Date.now()}`;
    const newSection: InfoSection = { id, name: 'Yangi bo\'lim', content: '', files: [], images: [] };
    const updated = { ...content, hero: { ...content.hero, infoSections: [...(content.hero.infoSections || []), newSection] } };
    setContent(updated);
    setActiveTab(id);
  };

  const deleteSection = (id: string) => {
    if (!content || !window.confirm("Ushbu bo'limni o'chirishni tasdiqlaysizmi?")) return;
    const filtered = (content.hero.infoSections || []).filter(s => s.id !== id);
    setContent({ ...content, hero: { ...content.hero, infoSections: filtered } });
    if (activeTab === id) setActiveTab(filtered[0]?.id || null);
  };

  const updateSection = (id: string, updates: Partial<InfoSection>) => {
    if (!content) return;
    const sections = (content.hero.infoSections || []).map(s => s.id === id ? { ...s, ...updates } : s);
    setContent({ ...content, hero: { ...content.hero, infoSections: sections } });
  };

  if (!content) return null;

  const currentSection = content.hero.infoSections?.find(s => s.id === activeTab);

  return (
    <div className="space-y-10 pb-20">
      
        {linkPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">
                  {linkPrompt.type === 'image' ? 'Rasm linkini kiritish' : 'Fayl linkini kiritish'}
                </h3>
                <button onClick={() => { setLinkPrompt(null); setLinkUrl(''); setLinkName(''); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {linkPrompt.type === 'file' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fayl nomi (ixtiyoriy)</label>
                    <input 
                      type="text" 
                      value={linkName} 
                      onChange={e => setLinkName(e.target.value)} 
                      placeholder="Masalan: document.pdf" 
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">URL qadar (Link)</label>
                  <input 
                    type="url" 
                    value={linkUrl} 
                    onChange={e => setLinkUrl(e.target.value)} 
                    placeholder="https://" 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>
                <button 
                  onClick={() => {
                    if (linkUrl.trim()) {
                      if (linkPrompt.type === 'image') {
                        const currentImages = content?.hero.infoSections?.find(s => s.id === linkPrompt.sectionId)?.images || [];
                        updateSection(linkPrompt.sectionId, { images: [...currentImages, linkUrl.trim()] });
                      } else {
                        const currentFiles = content?.hero.infoSections?.find(s => s.id === linkPrompt.sectionId)?.files || [];
                        let fName = linkName.trim();
                        if (!fName) {
                          fName = linkUrl.split('/').pop()?.split('?')[0] || 'Link file';
                        }
                        updateSection(linkPrompt.sectionId, { 
                          files: [...currentFiles, { name: fName, url: linkUrl.trim(), type: 'link' }] 
                        });
                      }
                      setLinkPrompt(null);
                      setLinkUrl('');
                      setLinkName('');
                    }
                  }}
                  className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition"
                >
                  QO'SHISH
                </button>
              </div>
            </div>
          </div>
        )}

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Info tahrirlash</h1>
          <p className="text-gray-500 mt-2 text-lg">Yangilik kartasi va Batafsil sahifa mazmuni.</p>
        </div>
        <button
          onClick={handleHeroUpdate}
          disabled={saveStatus === 'saving' || isUploading}
          className={`flex items-center gap-2 px-8 py-4 text-white rounded-2xl font-black shadow-2xl transition-all disabled:opacity-50 ${saveStatus === 'saved' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
        >
          {saveStatus === 'saving' || isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (saveStatus === 'saved' ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />)}
          {saveStatus === 'saving' ? 'SAQLANMOQDA...' : (isUploading ? `YUKLANMOQDA... ${uploadProgress}%` : (saveStatus === 'saved' ? 'SAQLANDI!' : 'SAQLASH'))}
        </button>
      </header>

      {/* Row 1: News Card & Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-8">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            Yangilik kartasi
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Rasm layoqati (Yuklash yoki URL orqali)
              </label>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  className="w-full px-5 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium file:cursor-pointer file:bg-blue-600 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-xl file:mr-4 file:font-semibold"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if(!file) return;
                    
                    setIsUploading(true);
                    setUploadProgress(0);
                    
                    uploadFileToStorage(file, false).then(url => {
                       setContent(prev => {
                          if (!prev) return prev;
                          const updated = {
                             ...prev,
                             hero: {
                               ...prev.hero,
                               rightImage: url
                             }
                          };
                          
                          setDoc(doc(db, 'siteContent', 'main'), updated, { merge: true })
                            .then(() => console.log("News card image saved to Firestore:", url))
                            .catch(err => console.error("Error saving news card image to Firestore:", err));
                          
                          localStorage.setItem('site_content_main_cache', JSON.stringify(updated));
                          return updated;
                       });
                    }).catch(err => {
                       console.error("News card image upload failed:", err);
                       alert("Rasm yuklashda xatolik: " + err.message);
                    }).finally(() => {
                       setIsUploading(false);
                    });
                  }}
                />
                
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-600">
                  <LinkIcon className="w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    placeholder="Yoki URL orqali rasm kiriting (https://...)"
                    className="w-full bg-transparent border-none p-2 font-medium focus:ring-0"
                    value={content.hero.rightImage && !content.hero.rightImage.startsWith('blob:') && !content.hero.rightImage.startsWith('data:') ? content.hero.rightImage : ''}
                    onChange={(e) => setContent({ ...content, hero: { ...content.hero, rightImage: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Globe className="h-4 w-4" /> Ko'k belgi matni
              </label>
              <input
                type="text"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                placeholder="Yangilik, Elon, etc."
                value={content.hero.rightBadge || ''}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, rightBadge: e.target.value } })}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Type className="h-4 w-4" /> Bosh sahifa tavsifi
              </label>
              <textarea
                rows={3}
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium leading-relaxed"
                value={content.hero.rightText}
                onChange={(e) => setContent({ ...content, hero: { ...content.hero, rightText: e.target.value } })}
              />
            </div>

            <div className="space-y-4 flex items-center justify-between bg-gray-50 p-4 rounded-xl">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Info Bo'limni Ko'rsatish
                </label>
                <p className="text-xs text-gray-500 mt-1 font-medium">Bosh sahifada ushbu bo'limni ochiq yoki yopiq holatga keltirish</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={content.hero.showInfoSection !== false} // default true if undefined
                  onChange={(e) => setContent({ ...content, hero: { ...content.hero, showInfoSection: e.target.checked } })}
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Karta ko'rinishi (Preview)</label>
          <div className="bg-white rounded-[40px] border-8 border-gray-100 shadow-2xl overflow-hidden flex flex-col flex-1">
            <img 
              src={makeDirectImageUrl(content.hero.rightImage || null) || 'https://via.placeholder.com/800x600?text=No+Image'} 
              referrerPolicy="no-referrer"
              alt="Preview" 
              className="h-[60%] w-full object-cover"
            />
            <div className="p-10 flex-1 flex flex-col justify-center bg-white relative z-10 -mt-8 rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.08)]">
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 block">{content.hero.rightBadge || 'Yangilik'}</span>
              <p className="text-2xl font-black text-gray-900 leading-snug">
                {content.hero.rightText || 'Yangilik matni bu yerda ko\'rinadi...'}
              </p>
              <div className="mt-8 flex items-center gap-3 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
                Batafsil ma'lumot <div className="w-12 h-[2px] bg-blue-600/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Page Content & Sections */}
      <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-8">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Layout className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Batafsil ma'lumot (Bo'limlar)</h3>
           </div>
           <div className="flex items-center gap-4">
             <button
               onClick={handleSectionUpdate}
               disabled={sectionSaveStatus === 'saving' || isUploading}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 text-white ${sectionSaveStatus === 'saved' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
             >
               {sectionSaveStatus === 'saving' || isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (sectionSaveStatus === 'saved' ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />)}
               {sectionSaveStatus === 'saving' ? 'SAQLANMOQDA...' : (isUploading ? `YUKLANMOQDA... ${uploadProgress}%` : (sectionSaveStatus === 'saved' ? 'SAQLANDI!' : 'SAQLASH'))}
             </button>
             <button 
               onClick={addSection}
               className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all"
             >
               <Plus className="w-5 h-5" /> BO'LIM YARATISH
             </button>
           </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {content.hero.infoSections?.map(s => (
            <div key={s.id} className="relative group">
              <button
                onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border-2 ${activeTab === s.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}`}
              >
                {s.isProtected ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {s.name}
              </button>
              {s.id !== 'general' && s.id !== 'my_docs' && s.id !== 'system-about' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSection(s.id); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              )}
            </div>
          ))}
        </div>

        {currentSection && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Content & Images */}
            <div className="lg:col-span-8 space-y-10">
               <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <Type className="w-4 h-4" /> Bo'lim nomi
                 </label>
                 <input
                   type="text"
                   value={currentSection.name || ''}
                   onChange={(e) => updateSection(currentSection.id, { name: e.target.value })}
                   className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                   placeholder="Bo'lim nomi"
                 />
               </div>

               <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <TextSelection className="w-4 h-4" /> Matnli ma'lumot
                 </label>
                 <textarea
                   rows={15}
                   value={currentSection.content || ''}
                   onChange={(e) => updateSection(currentSection.id, { content: e.target.value })}
                   className="w-full p-8 rounded-3xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium leading-relaxed text-lg"
                   placeholder="Bo'lim mazmunini yozing..."
                 />
                 <div className="flex items-center gap-3">
                   <button 
                     type="button"
                     onClick={() => imageInputRef.current?.click()}
                     className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-black hover:bg-green-600 hover:text-white transition-all shadow-sm cursor-pointer"
                   >
                     <Plus className="w-3.5 h-3.5" /> RASM YUKLASH
                   </button>
                   <button 
                     onClick={() => setLinkPrompt({ type: 'image', sectionId: currentSection.id })}
                     className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                   >
                     <LinkIcon className="w-3.5 h-3.5" /> LINK ORQALI QO'SHISH
                   </button>
                   <span className="text-[10px] text-gray-400 font-bold italic ml-auto">Rasm va fayllarni pastdan boshqaring.</span>
                 </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Galereya (Rasmlar)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(currentSection.images || []).map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <img src={makeDirectImageUrl(img)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => {
                             const filtered = currentSection.images?.filter((_, i) => i !== idx);
                             updateSection(currentSection.id, { images: filtered });
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="aspect-square rounded-2xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/30 transition-all gap-2 cursor-pointer"
                    >
                      <Plus className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Qo'shish</span>
                    </button>
                  </div>
               </div>
            </div>

            {/* Right: Files */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-gray-50 rounded-3xl p-8 space-y-6 border border-gray-100">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                       <FileUp className="w-4 h-4 text-blue-600" />
                       Hujjatlar
                    </h4>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setLinkPrompt({ type: 'file', sectionId: currentSection.id })}
                         className="p-2 bg-gray-100 text-blue-600 rounded-lg hover:bg-gray-200 transition"
                         title="Link orqali qo'shish"
                       >
                         <LinkIcon className="w-4 h-4" />
                       </button>
                       <button 
                         type="button"
                         onClick={() => fileInputRef.current?.click()}
                         className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
                         title="Fayl yuklash"
                       >
                         <Plus className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(currentSection.files || []).map((file, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between group">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                             <FileText className="w-5 h-5" />
                           </div>
                           <div className="flex-1 overflow-hidden">
                             <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                             <p className="text-[10px] font-black text-gray-400 uppercase">{file.type === 'link' ? 'LINK' : (file.type.split('/')[1] || 'Fayl')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.type !== 'link' ? file.name : undefined}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Ko'rish / Yuklab olish"
                          >
                            {file.type === 'link' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          </a>
                          <button 
                            type="button"
                            onClick={() => {
                              const filtered = currentSection.files?.filter((_, i) => i !== idx);
                              updateSection(currentSection.id, { files: filtered });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(currentSection.files || []).length === 0 && (
                      <div className="text-center py-10 opacity-20 filter grayscale">
                        <FileText className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Hujjatlar yo'q</p>
                      </div>
                    )}
                  </div>
               </div>

               <div className="bg-blue-900 rounded-3xl p-8 text-white space-y-4 shadow-2xl shadow-blue-900/20">
                  <div className="flex items-center gap-3">
                    {currentSection.isProtected ? <Lock className="w-6 h-6 text-yellow-400" /> : <Unlock className="w-6 h-6 text-green-400" />}
                    <h4 className="text-lg font-black tracking-tight">Status: {currentSection.isProtected ? 'Maxfiy' : 'Ochiq'}</h4>
                  </div>
                  <p className="text-blue-200 text-xs leading-relaxed font-medium">
                    {currentSection.isProtected 
                      ? "Ushbu bo'lim faqat maxfiy kod (11042002aA) kiritilgandagina foydalanuvchilarga ko'rinadi."
                      : "Ushbu bo'lim barcha foydalanuvchilar uchun ochiq hisoblanadi."}
                  </p>
                  <button 
                    onClick={() => updateSection(currentSection.id, { isProtected: !currentSection.isProtected })}
                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${currentSection.isProtected ? 'bg-yellow-400 text-blue-900 hover:bg-yellow-300' : 'bg-blue-800 text-blue-200 hover:bg-blue-700'}`}
                  >
                    {currentSection.isProtected ? 'ODDIY QILISH' : 'MAXFIY QILISH'}
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Hidden inputs for file/image picking */}
        <input 
          type="file" 
          ref={imageInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && currentSection) {
              handleUploadSectionItem(currentSection.id, 'image', f);
            }
            e.target.value = '';
          }} 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.ods,.odp,.csv,.zip,.rar,application/*" 
          className="hidden" 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && currentSection) {
              handleUploadSectionItem(currentSection.id, 'file', f);
            }
            e.target.value = '';
          }} 
        />

        {/* Floating Upload Progress Notification */}
        {isUploading && (
          <div className="fixed bottom-8 right-8 z-50 bg-gray-900 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md border border-gray-700 animate-in fade-in slide-in-from-bottom-5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-300 truncate max-w-[200px]">{uploadingFileName || 'Fayl yuklanmoqda...'}</span>
                <span className="text-xs font-black text-blue-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload Toast */}
        {uploadToast && (
          <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all animate-in fade-in ${
            uploadToast.type === 'success' 
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
              : 'bg-red-900 text-red-100 border-red-700'
          }`}>
            {uploadToast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <span>{uploadToast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

