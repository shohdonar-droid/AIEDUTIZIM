import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteContent, InfoSection } from '../../types';
import { Save, Loader2, Image as ImageIcon, Type, FileText, Plus, Trash2, Globe, Layout, Lock, Unlock, FileUp, TextSelection } from 'lucide-react';

export default function AdminInfo() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

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

  const handleUpdate = async () => {
    if (!content) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'siteContent', 'main'), { hero: content.hero }, { merge: true });
      alert('Ma\'lumotlar saqlandi!');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addSection = () => {
    if (!content) return;
    const name = prompt("Bo'lim nomini kiriting:");
    if (!name) return;
    const id = `sec_${Date.now()}`;
    const newSection: InfoSection = { id, name, content: '', files: [], images: [] };
    const updated = { ...content, hero: { ...content.hero, infoSections: [...(content.hero.infoSections || []), newSection] } };
    setContent(updated);
    setActiveTab(id);
  };

  const deleteSection = (id: string) => {
    if (!content || !confirm("Ushbu bo'limni o'chirishni tasdiqlaysizmi?")) return;
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
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Info tahrirlash</h1>
          <p className="text-gray-500 mt-2 text-lg">Yangilik kartasi va Batafsil sahifa mazmuni.</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          SAQLASH
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
                <ImageIcon className="h-4 w-4" /> Rasm (Yuklash)
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium file:cursor-pointer file:bg-blue-600 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-xl file:mr-4 file:font-semibold"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setContent({ ...content, hero: { ...content.hero, rightImage: reader.result as string } });
                  };
                  reader.readAsDataURL(file);
                }}
              />
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
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Karta ko'rinishi (Preview)</label>
          <div className="bg-white rounded-[40px] border-8 border-gray-100 shadow-2xl overflow-hidden flex flex-col h-[480px]">
            <img 
              src={content.hero.rightImage || 'https://via.placeholder.com/800x600?text=No+Image'} 
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
           <button 
             onClick={addSection}
             className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all"
           >
             <Plus className="w-5 h-5" /> BO'LIM YARATISH
           </button>
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
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const currentImages = currentSection.images || [];
                            updateSection(currentSection.id, { images: [...currentImages, reader.result as string] });
                          };
                          reader.readAsDataURL(f);
                        };
                        file.click();
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-black hover:bg-green-600 hover:text-white transition-all shadow-sm"
                   >
                     <Plus className="w-3.5 h-3.5" /> RASM QO'SHISH
                   </button>
                   <span className="text-[10px] text-gray-400 font-bold italic">Rasm va fayllarni pastdan boshqaring.</span>
                 </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Galereya (Rasmlar)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(currentSection.images || []).map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <img src={img} className="w-full h-full object-cover" />
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
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const currentImages = currentSection.images || [];
                            updateSection(currentSection.id, { images: [...currentImages, reader.result as string] });
                          };
                          reader.readAsDataURL(f);
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
                    <button 
                      onClick={() => {
                        const file = document.createElement('input');
                        file.type = 'file';
                        file.onchange = (e: any) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const currentFiles = currentSection.files || [];
                            updateSection(currentSection.id, { 
                              files: [...currentFiles, { name: f.name, url: reader.result as string, type: f.type }] 
                            });
                          };
                          reader.readAsDataURL(f);
                        };
                        file.click();
                      }}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
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
                             <p className="text-[10px] font-black text-gray-400 uppercase">{file.type.split('/')[1] || 'PDF'}</p>
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

