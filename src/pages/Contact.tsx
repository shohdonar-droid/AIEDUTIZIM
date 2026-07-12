import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, BrainCircuit, Instagram, Youtube } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp, setDoc, query, where, limit, getDocs } from 'firebase/firestore';
import { SiteContent } from '../types';
import { useAuth } from '../hooks/useAuth';

export default function Contact() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<SiteContent | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'siteContent', 'main'));
      if (snap.exists()) {
        setContent(snap.data() as SiteContent);
      }
    }
    load();
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find admin
      let adminId = '';
      try {
        const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), limit(1)));
        adminId = adminsSnap.docs[0]?.id;
      } catch (e) {
        console.warn("Could not query admins:", e);
      }

      if (!adminId) {
        // Fallback: try finding by hardcoded email if we can
        const fallbackSnap = await getDocs(query(collection(db, 'users'), where('email', 'in', ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com']), limit(1)));
        adminId = fallbackSnap.docs[0]?.id || 'SYSTEM_ADMIN';
      }

      let senderId = '';
      if (user) {
        senderId = user.uid;
      } else {
        const savedAnon = localStorage.getItem('ai_anon_id');
        if (savedAnon) {
          senderId = savedAnon;
        } else {
          senderId = 'anon_' + Date.now().toString(36);
          localStorage.setItem('ai_anon_id', senderId);
        }
        await setDoc(doc(db, 'users', senderId), {
          uid: senderId,
          displayName: formData.phone + ' (Saytdan)',
          phone: formData.phone,
          isAnonymousContact: true
        });
      }

      const fullMessage = `Aloqa: ${formData.phone}\nXabar: ${formData.message}`;

      await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId: adminId,
        receiverRole: 'admin',
        text: fullMessage,
        timestamp: Timestamp.now(),
        isRead: false
      });

      alert('Xabaringiz adminlarga muvaffaqiyatli yuborildi!');
      setFormData(prev => ({ ...prev, message: '' }));
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const contactData = content?.contact || {};

  return (
    <div className="py-20 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[60px] shadow-2xl overflow-hidden border border-gray-100 grid grid-cols-1 lg:grid-cols-2">
          {/* Contact Info */}
          <div className="bg-indigo-900 p-12 md:p-20 text-white flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500 mb-10 transform -rotate-6 shadow-xl">
                 <BrainCircuit className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl font-black tracking-tight mb-8">
                {contactData.title || "Biz bilan bog'laning"}
              </h1>
              <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
                {contactData.description || "Savollaringiz bormi? Mutaxassislarimiz sizga yordam berishga tayyor."}
              </p>
            </div>

            <div className="mt-20 space-y-10">
               <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                    <Mail className="h-5 w-5 text-indigo-300 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Email</p>
                    <p className="text-lg font-bold">{contactData.email || 'info@platform.uz'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                    <Phone className="h-5 w-5 text-indigo-300 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Telefon</p>
                    <p className="text-lg font-bold">{contactData.phone || '+998 90 123 45 67'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                    <MapPin className="h-5 w-5 text-indigo-300 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Manzil</p>
                    <p className="text-lg font-bold">{contactData.address || 'Toshkent sh, IT Park'}</p>
                  </div>
               </div>
            </div>

            {(content?.footer?.telegram || content?.footer?.instagram || content?.footer?.youtube) && (
              <div className="mt-12 pt-10 border-t border-indigo-800">
                <p className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">Biz ijtimoiy tarmoqlarda</p>
                <div className="flex gap-4">
                   {content?.footer?.telegram && (
                     <a 
                       href={content.footer.telegram} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white hover:text-indigo-900 flex items-center justify-center transition-all duration-300 group shadow-lg"
                       title="Telegram"
                       id="contact-social-telegram"
                     >
                       <Send className="h-5 w-5 transform group-hover:scale-110 transition-transform" />
                     </a>
                   )}
                   {content?.footer?.instagram && (
                     <a 
                       href={content.footer.instagram} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white hover:text-[#E1306C] flex items-center justify-center transition-all duration-300 group shadow-lg"
                       title="Instagram"
                       id="contact-social-instagram"
                     >
                       <Instagram className="h-5 w-5 transform group-hover:scale-110 transition-transform" />
                     </a>
                   )}
                   {content?.footer?.youtube && (
                     <a 
                       href={content.footer.youtube} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white hover:text-[#FF0000] flex items-center justify-center transition-all duration-300 group shadow-lg"
                       title="YouTube"
                       id="contact-social-youtube"
                     >
                       <Youtube className="h-5 w-5 transform group-hover:scale-110 transition-transform" />
                     </a>
                   )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div className="p-12 md:p-20 bg-white flex flex-col justify-center">
            <h2 className="text-3xl font-black text-gray-900 mb-10">Xabar yo'llash</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Telefon</label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={!!user && !!user.phone} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-indigo-100 font-bold disabled:opacity-50" placeholder="+998 90 123 45 67" />
              </div>
              <div>
                 <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Xabar</label>
                 <textarea required rows={6} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-indigo-100 font-bold leading-relaxed resize-none" placeholder="Xabaringizni yozing..." />
              </div>
              <button
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                XABARNI YUBORISH
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
