import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteContent } from '../../types';
import { Save, Loader2, Image as ImageIcon, Video, Plus, X } from 'lucide-react';

export default function AdminBanner() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'siteContent', 'main'));
      if (snap.exists()) {
        setContent(snap.data() as SiteContent);
      } else {
        setContent({
          hero: { rightImage: '', rightBadge: '', rightText: '' },
          banners: [],
          footer: { top: '', bottom: '' }
        });
      }
    }
    load();
  }, []);

  const handleUpdate = async () => {
    if (!content) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'siteContent', 'main'), { banners: content.banners }, { merge: true });
      alert('Banner yangilandi!');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addBanner = () => {
    if (!newUrl || !content) return;
    setContent({
      ...content,
      banners: [...content.banners, { url: newUrl, type: newType, title: newTitle, text: newText, description: newDescription }]
    });
    setNewUrl('');
    setNewTitle('');
    setNewText('');
    setNewDescription('');
  };

  const removeBanner = (index: number) => {
    if (!content) return;
    setContent({
      ...content,
      banners: content.banners.filter((_, i) => i !== index)
    });
  };

  if (!content) return null;

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Banner boshqaruvi</h1>
          <p className="text-gray-500 mt-2 text-lg">Asosiy sahifadagi slayder (chap tomon) rasm va videolarini tahrirlang.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Current Banners */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.banners.map((b, i) => (
            <div key={i} className="relative group rounded-3xl overflow-hidden border-2 border-gray-100 aspect-video shadow-sm">
              {b.type === 'image' ? (
                <img src={b.url || null} className="w-full h-full object-cover" />
              ) : (
                <video src={b.url || null} className="w-full h-full object-cover" muted />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={() => removeBanner(i)}
                  className="bg-red-500 text-white p-3 rounded-2xl hover:scale-110 transition-transform"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest z-10">
                {b.type}
              </div>
              <div className="absolute top-4 left-4 right-4 pointer-events-none text-white drop-shadow-md">
                 {b.title && <span className="bg-blue-600 px-2 py-1 text-xs font-bold rounded">{b.title}</span>}
                 {b.text && <p className="mt-2 text-sm font-bold leading-tight line-clamp-2">{b.text}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Banner */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl h-fit sticky top-10">
          <h3 className="text-xl font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">Yangi qo'shish</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Resurs turi</label>
              <div className="flex gap-2">
                {(['image', 'video'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold ${
                      newType === t ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'
                    }`}
                  >
                    {t === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {t === 'image' ? 'Rasm' : 'Video'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Qisqa sarlovha (Badge)</label>
              <input
                type="text"
                placeholder="Yangi Texnologiyalar"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Matn (Heading)</label>
              <textarea
                placeholder="Raqamli ta'limda sun'iy intellekt"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                rows={2}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Qo'shimcha Matn (Description)</label>
              <textarea
                placeholder="Zamonaviy texnologiyalar bilan o'quv jarayonini inqilobiy darajada o'zgartiring va maqsadlaringizga tezroq erishing."
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">URL Manzil</label>
              <input
                type="text"
                placeholder="https://..."
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <button
               onClick={addBanner}
               className="w-full py-4 bg-gray-900 text-white rounded-xl font-black hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              ROYXATGA QO'SHISH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
