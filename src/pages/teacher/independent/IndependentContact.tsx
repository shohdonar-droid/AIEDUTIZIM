import React, { useState } from 'react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { Send, MapPin, Phone, Mail, MessageSquare } from 'lucide-react';

export default function IndependentContact() {
  const { user } = useAuth();
  
  // Contact States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'supportMessages'), {
        teacherId: user.uid,
        firstName: firstName.trim() || user.displayName || '',
        lastName: lastName.trim(),
        phone: phone.trim(),
        telegram: telegram.trim(),
        message: message.trim(),
        createdAt: serverTimestamp()
      });

      setFirstName('');
      setLastName('');
      setPhone('');
      setTelegram('');
      setMessage('');
      
      alert("Xabaringiz administratorga yuborildi! Tez orada siz bilan bog'lanamiz.");
    } catch (err) {
      console.error(err);
      alert("Xabar yuborishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Bog'lanish</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          LMS ma'muriyati yoki texnik ko'mak xizmati bilan bog'lanish va qo'llab-quvvatlash so'rovlarini yo'llash.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact info panel */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Aloqa ma'lumotlari</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Telefon</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">+998 (99) 123-4567</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Elektron pochta</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">support@aiedutizim.uz</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Manzil</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">Toshkent shahri, Yunusobod tumani</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl">
            <p className="text-xs text-blue-700 leading-relaxed font-semibold">
              Platformadan foydalanishda yoki to'lovlarda xatolik yuz bergan bo'lsa, xabar maydoni orqali yozib qoldiring. Ma'murlarimiz 24 soat ichida javob berishadi.
            </p>
          </div>
        </div>

        {/* Message form */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" /> Shaxsiy xabar qoldirish
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 ml-1">Ism</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 ml-1">Familiya</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Alimov"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 ml-1">Telefon raqami</label>
                <input
                  type="tel"
                  required
                  placeholder="Masalan: 991234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 ml-1">Telegram username (@)</label>
                <input
                  type="text"
                  placeholder="Masalan: @sardor_dev"
                  value={telegram}
                  onChange={e => setTelegram(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Xabar matni</label>
              <textarea
                required
                placeholder="Murjaatingiz tafsilotlarini to'liq yozing..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium h-32 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all ml-auto text-sm disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Yuborish
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
