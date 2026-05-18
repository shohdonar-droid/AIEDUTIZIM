import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, BrainCircuit } from 'lucide-react';
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
        // Create an anonymous user doc to show up in Admin Chat
        senderId = 'anon_' + Date.now().toString(36);
        await setDoc(doc(db, 'users', senderId), {
          uid: senderId,
          role: 'student', // Hack to show in chat
          displayName: formData.name + ' (Aloqa)',
          phone: formData.phone,
          isAnonymousContact: true
        });
      }

      const fullMessage = `Mavzu: ${formData.subject}\nAloqa: ${formData.phone}\nXabar: ${formData.message}`;

      await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId: adminId,
        receiverRole: 'admin',
        text: fullMessage,
        timestamp: Timestamp.now(),
        isRead: false
      });

      alert('Xabaringiz adminlarga muvaffaqiyatli yuborildi!');
      setFormData(prev => ({ ...prev, subject: '', message: '' }));
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
          <div className="bg-gray-900 p-12 md:p-20 text-white flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-10 transform -rotate-6">
                 <BrainCircuit className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl font-black tracking-tight mb-8">
                {contactData.title || "Biz bilan bog'laning"}
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
                {contactData.description || "Savollaringiz bormi? Mutaxassislarimiz sizga yordam berishga tayyor."}
              </p>
            </div>

            <div className="mt-20 space-y-10">
               <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Mail className="h-5 w-5 text-blue-500 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Email</p>
                    <p className="text-lg font-bold">{contactData.email || 'info@platform.uz'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Phone className="h-5 w-5 text-blue-500 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Telefon</p>
                    <p className="text-lg font-bold">{contactData.phone || '+998 90 123 45 67'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <MapPin className="h-5 w-5 text-blue-500 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Manzil</p>
                    <p className="text-lg font-bold">{contactData.address || 'Toshkent sh, IT Park'}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="p-12 md:p-20 bg-white">
            <h2 className="text-3xl font-black text-gray-900 mb-10">Xabar yo'llash</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Ismingiz</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={!!user} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-bold disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Telefon</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={!!user && !!user.phone} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-bold disabled:opacity-50" />
                </div>
              </div>
              <div>
                 <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Mavzu</label>
                 <input required type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-bold" />
              </div>
              <div>
                 <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Xabar</label>
                 <textarea required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-blue-100 font-bold leading-relaxed" />
              </div>
              <button
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]"
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
