import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteContent } from '../../types';
import { Save, Loader2, Layout, AlignLeft, Image as ImageIcon, MapPin, Phone, Mail, Clock, Send, Youtube, Instagram, Heading, Navigation } from 'lucide-react';

export default function AdminFooter() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'header' | 'top' | 'links' | 'bottom' | 'contact'>('header');

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'siteContent', 'main'));
      if (snap.exists()) {
        setContent({ header: {}, footer: {}, contact: {}, ...snap.data() } as SiteContent);
      } else {
        setContent({
          header: {},
          hero: { rightImage: '', rightBadge: '', rightText: '' },
          banners: [],
          footer: {},
          contact: {}
        });
      }
    }
    load();
  }, []);

  const handleUpdate = async () => {
    if (!content) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'siteContent', 'main'), { header: content.header, footer: content.footer, contact: content.contact || {} }, { merge: true });
      alert('Ma\'lumotlar yangilandi!');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (!content) return null;

  const f = content.footer || {};
  const h = content.header || {};
  const c = content.contact || {};

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Tepa va Aloqa boshqaruvi</h1>
          <p className="text-gray-500 mt-2 text-lg">Saytning yuqori (header), pastki (footer) va aloqa sahifasi ma'lumotlarini tahrirlang.</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-2xl hover:bg-black transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          SAQLASH
        </button>
      </header>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        <aside className="w-full md:w-64 bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-2">
           <button
             onClick={() => setActiveTab('header')}
             className={`flex justify-start items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all ${
               activeTab === 'header' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400 hover:bg-white/50'
             }`}
           >
             <Navigation className="h-5 w-5" /> Tepa (Header)
           </button>
           <button
             onClick={() => setActiveTab('top')}
             className={`flex justify-start items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all ${
               activeTab === 'top' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400 hover:bg-white/50'
             }`}
           >
             <Layout className="h-5 w-5" /> Footer - Asosiy
           </button>
           <button
             onClick={() => setActiveTab('links')}
             className={`flex justify-start items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all ${
               activeTab === 'links' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400 hover:bg-white/50'
             }`}
           >
             <Phone className="h-5 w-5" /> Footer - Aloqa
           </button>
           <button
             onClick={() => setActiveTab('bottom')}
             className={`flex justify-start items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all ${
               activeTab === 'bottom' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400 hover:bg-white/50'
             }`}
           >
             <AlignLeft className="h-5 w-5" /> Footer - Huquqiy
           </button>
           <button
             onClick={() => setActiveTab('contact')}
             className={`flex justify-start items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all mt-4 border-t border-gray-200 pt-6 rounded-none rounded-b-xl ${
               activeTab === 'contact' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400 hover:bg-white/50'
             }`}
           >
             <Mail className="h-5 w-5" /> Aloqa sahifasi
           </button>
        </aside>

        <main className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[700px]">
          {activeTab === 'header' && (
            <div className="space-y-8">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                  <ImageIcon className="h-4 w-4" /> Header Logo URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                  value={h.logoUrl || ''}
                  onChange={(e) => setContent({ ...content, header: { ...h, logoUrl: e.target.value } })}
                />
                <p className="text-gray-400 text-sm font-medium italic pl-2 mt-2">Agar bo'sh bo'lsa standart miya ikonasi chiqadi.</p>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                  <Heading className="h-4 w-4" /> Sayt Nomi
                </label>
                <input
                  type="text"
                  placeholder="Masalan: EDUAI"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                  value={h.siteName || ''}
                  onChange={(e) => setContent({ ...content, header: { ...h, siteName: e.target.value } })}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                  Tepa panel Orqa Foni (Rang)
                </label>
                <input
                  type="text"
                  placeholder="Masalan: bg-gray-900 yoki bg-blue-600"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-mono text-sm"
                  value={h.bgClass || ''}
                  onChange={(e) => setContent({ ...content, header: { ...h, bgClass: e.target.value } })}
                />
                <p className="text-gray-400 text-sm font-medium italic pl-2 mt-2">Tailwind rang klasslarini yozing (masalan, bg-red-500). Standart: glass-nav (shaffof).</p>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                  Tepa panel Matn Rangi
                </label>
                <input
                  type="text"
                  placeholder="Masalan: text-white yoki text-gray-900"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-mono text-sm"
                  value={h.textClass || ''}
                  onChange={(e) => setContent({ ...content, header: { ...h, textClass: e.target.value } })}
                />
                <p className="text-gray-400 text-sm font-medium italic pl-2 mt-2">Tailwind rang klasslarini yozing. Standart: text-gray-900 (qora).</p>
              </div>
            </div>
          )}
          {activeTab === 'top' && (
            <div className="space-y-8">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                  <ImageIcon className="h-4 w-4" /> Logo URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                  value={f.logoUrl || ''}
                  onChange={(e) => setContent({ ...content, footer: { ...f, logoUrl: e.target.value } })}
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">Asosiy matn (Tavsif)</label>
                <textarea
                  rows={4}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg leading-relaxed"
                  value={f.description || f.top || ''}
                  onChange={(e) => setContent({ ...content, footer: { ...f, description: e.target.value, top: e.target.value } })}
                  placeholder="RAQAMLI TA'LIMDA SUN'IY INTELLEKT..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                       <MapPin className="h-4 w-4" /> Manzil
                    </label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                      value={f.address || ''}
                      placeholder="Toshkent shahri..."
                      onChange={(e) => setContent({ ...content, footer: { ...f, address: e.target.value } })}
                    />
                 </div>
                 <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                       <Clock className="h-4 w-4" /> Ish vaqti
                    </label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                      value={f.workingHours || ''}
                      placeholder="Dushanba-Juma: 9:00 - 18:00"
                      onChange={(e) => setContent({ ...content, footer: { ...f, workingHours: e.target.value } })}
                    />
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                         <Phone className="h-4 w-4" /> Telefon raqam
                      </label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                        value={f.phone || ''}
                        placeholder="+998 90 123 45 67"
                        onChange={(e) => setContent({ ...content, footer: { ...f, phone: e.target.value } })}
                      />
                   </div>
                   <div>
                      <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                         <Mail className="h-4 w-4" /> Email
                      </label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                        value={f.email || ''}
                        placeholder="info@raqamlitalim.uz"
                        onChange={(e) => setContent({ ...content, footer: { ...f, email: e.target.value } })}
                      />
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-8 space-y-6">
                   <h3 className="text-xl font-bold text-gray-900">Ijtimoiy tarmoqlar</h3>
                   
                   <div>
                      <label className="flex items-center gap-2 text-xs font-black text-[#0088cc] uppercase tracking-widest pl-2 mb-3">
                         <Send className="h-4 w-4" /> Telegram
                      </label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                        value={f.telegram || ''}
                        placeholder="https://t.me/..."
                        onChange={(e) => setContent({ ...content, footer: { ...f, telegram: e.target.value } })}
                      />
                   </div>
                   
                   <div>
                      <label className="flex items-center gap-2 text-xs font-black text-[#E1306C] uppercase tracking-widest pl-2 mb-3">
                         <Instagram className="h-4 w-4" /> Instagram
                      </label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                        value={f.instagram || ''}
                        placeholder="https://instagram.com/..."
                        onChange={(e) => setContent({ ...content, footer: { ...f, instagram: e.target.value } })}
                      />
                   </div>

                   <div>
                      <label className="flex items-center gap-2 text-xs font-black text-[#FF0000] uppercase tracking-widest pl-2 mb-3">
                         <Youtube className="h-4 w-4" /> YouTube
                      </label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                        value={f.youtube || ''}
                        placeholder="https://youtube.com/..."
                        onChange={(e) => setContent({ ...content, footer: { ...f, youtube: e.target.value } })}
                      />
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'bottom' && (
            <div className="space-y-6">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">Mualliflik huquqi (Pastki yozuv)</label>
              <input
                type="text"
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-bold text-lg"
                value={f.bottom || ''}
                placeholder="© 2024 Barcha huquqlar himoyalangan."
                onChange={(e) => setContent({ ...content, footer: { ...f, bottom: e.target.value } })}
              />
              <p className="text-gray-400 text-sm font-medium italic pl-2">Bu matn eng pastki qismda chap yoki markazda aks etadi.</p>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-8">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                  <Heading className="h-4 w-4" /> Sarlavha
                </label>
                <input
                  type="text"
                  placeholder="Biz bilan bog'laning"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                  value={c.title || ''}
                  onChange={(e) => setContent({ ...content, contact: { ...c, title: e.target.value } })}
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">Asosiy matn (Tavsif)</label>
                <textarea
                  rows={3}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg leading-relaxed"
                  value={c.description || ''}
                  onChange={(e) => setContent({ ...content, contact: { ...c, description: e.target.value } })}
                  placeholder="Savollaringiz bormi? Mutaxassislarimiz sizga yordam berishga tayyor."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                       <MapPin className="h-4 w-4" /> Manzil
                    </label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                      value={c.address || ''}
                      placeholder="Toshkent sh, IT Park"
                      onChange={(e) => setContent({ ...content, contact: { ...c, address: e.target.value } })}
                    />
                 </div>
                 <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                       <Phone className="h-4 w-4" /> Telefon raqam
                    </label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                      value={c.phone || ''}
                      placeholder="+998 90 123 45 67"
                      onChange={(e) => setContent({ ...content, contact: { ...c, phone: e.target.value } })}
                    />
                 </div>
                 <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">
                       <Mail className="h-4 w-4" /> Email
                    </label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-medium text-lg"
                      value={c.email || ''}
                      placeholder="info@platform.uz"
                      onChange={(e) => setContent({ ...content, contact: { ...c, email: e.target.value } })}
                    />
                 </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

