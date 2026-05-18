import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { SiteContent, InfoSection } from '../../types';
import { Save, Loader2, Image as ImageIcon, Type, FileText, Plus, Trash2, Globe, Layout, Lock, Unlock, FileUp, TextSelection, CheckCircle2, Link as LinkIcon, X } from 'lucide-react';
import { makeDirectImageUrl } from '../../lib/helpers';

export default function AdminInfo() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<null | 'saving' | 'saved'>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          else if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) { resolve(new File([blob], file.name, { type: 'image/jpeg' })); }
            else { resolve(file); }
          }, 'image/jpeg', 0.6);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const uploadFileToStorage = async (file: File, disableProgressCounter = false): Promise<string> => {
    if (!disableProgressCounter) {
      setIsUploading(true);
      setUploadProgress(0);
    }
    try {
      const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
      const ext = processedFile.name.split('.').pop() || '';
      const storageRef = ref(storage, `siteContent/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`);
      const uploadTask = uploadBytesResumable(storageRef, processedFile);
      
      return await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            if (!disableProgressCounter) {
              const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(prog);
            }
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
    } finally {
      if (!disableProgressCounter) {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  useEffect(() => {
    async function load() {
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
      if (!sections.some(s => s.id === 'general')) {
        sections.push({ id: 'general', name: 'Umumiy', content: 'Umumiy ma\'lumotlar...', files: [], images: [] });
      }
      if (!sections.some(s => s.id === 'my_docs')) {
        sections.push({ id: 'my_docs', name: 'Hujjatlarim', isProtected: true, content: 'Maxfiy hujjatlar...', files: [], images: [] });
      }
      
      setContent(data);
      if (sections.length > 0) setActiveTab(sections[0].id);
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
                    const tempUrl = URL.createObjectURL(file);
                    setContent({ ...content, hero: { ...content.hero, rightImage: tempUrl } });
                    
                    uploadFileToStorage(file, true).then(url => {
                       setContent(prev => {
                          if (!prev) return prev;
                          if (prev.hero.rightImage === tempUrl) {
                             return { ...prev, hero: { ...prev.hero, rightImage: url } };
                          }
                          return prev;
                       });
                    }).catch(() => {});
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
          <div className="bg-white rounded-[40px] border-8 border-gray-100 shadow-2xl overflow-hidden flex flex-col flex-1 min-h-[480px]">
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
              {s.id !== 'general' && s.id !== 'my_docs' && (
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
                     onClick={() => {
                        const file = document.createElement('input');
                        file.type = 'file';
                        file.accept = 'image/*';
                        file.onchange = (e: any) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          
                          const tempUrl = URL.createObjectURL(f);
                          const currentImages = currentSection.images || [];
                          updateSection(currentSection.id, { images: [...currentImages, tempUrl] });

                          uploadFileToStorage(f, true).then(url => {
                             setContent(prev => {
                                if (!prev) return prev;
                                const newSections = prev.hero.infoSections?.map(s => {
                                   if (s.id === currentSection.id) {
                                      return { ...s, images: s.images?.map(img => img === tempUrl ? url : img) };
                                   }
                                   return s;
                                });
                                return { ...prev, hero: { ...prev.hero, infoSections: newSections } };
                             });
                          }).catch(() => {});
                        };
                        file.click();
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-black hover:bg-green-600 hover:text-white transition-all shadow-sm"
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
                      onClick={() => {
                        const file = document.createElement('input');
                        file.type = 'file';
                        file.accept = 'image/*';
                        file.onchange = (e: any) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          
                          const tempUrl = URL.createObjectURL(f);
                          const currentImages = currentSection.images || [];
                          updateSection(currentSection.id, { images: [...currentImages, tempUrl] });

                          uploadFileToStorage(f, true).then(url => {
                             setContent(prev => {
                                if (!prev) return prev;
                                const newSections = prev.hero.infoSections?.map(s => {
                                   if (s.id === currentSection.id) {
                                      return { ...s, images: s.images?.map(img => img === tempUrl ? url : img) };
                                   }
                                   return s;
                                });
                                return { ...prev, hero: { ...prev.hero, infoSections: newSections } };
                             });
                          }).catch(() => {});
                        };
                        file.click();
                      }}
                      className="aspect-square rounded-2xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:border-blue-200 hover:text-blue-400 transition-all gap-2"
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
                         onClick={() => {
                           const file = document.createElement('input');
                           file.type = 'file';
                           file.onchange = (e: any) => {
                             const f = e.target.files?.[0];
                             if (!f) return;
                             
                             const tempUrl = URL.createObjectURL(f);
                             const currentFiles = currentSection.files || [];
                             updateSection(currentSection.id, { 
                               files: [...currentFiles, { name: f.name, url: tempUrl, type: f.type }] 
                             });

                             uploadFileToStorage(f, true).then(url => {
                                setContent(prev => {
                                   if (!prev) return prev;
                                   const newSections = prev.hero.infoSections?.map(s => {
                                      if (s.id === currentSection.id) {
                                         return { ...s, files: s.files?.map(file => file.url === tempUrl ? { ...file, url } : file) };
                                      }
                                      return s;
                                   });
                                   return { ...prev, hero: { ...prev.hero, infoSections: newSections } };
                                });
                             }).catch(() => {});
                           };
                           file.click();
                         }}
                         className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                        <button 
                          onClick={() => {
                            const filtered = currentSection.files?.filter((_, i) => i !== idx);
                            updateSection(currentSection.id, { files: filtered });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
      </div>
    </div>
  );
}

