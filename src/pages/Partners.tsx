import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Loader2, Mail, Phone, MapPin, Building2, Globe } from 'lucide-react';
import { makeDirectImageUrl } from '../lib/helpers';

const DEFAULT_ORG_IMAGE = "https://cdn-icons-png.flaticon.com/512/2830/2830312.png";

export default function Partners() {
  const [partners, setPartners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'teacher')
        );

        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        
        // Sort by name
        setPartners(list.sort((a, b) => 
          (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ")
        ));
      } catch (err) {
        console.error("Error fetching partners:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="py-12 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4"
          >
            Hamkorlar (Tashkilotlar)
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 font-medium"
          >
            AIEDUTIZIM hamkor tashkilotlari ro'yxati
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {partners.map((org, index) => (
            <motion.div
              key={org.uid}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group border border-gray-100 flex flex-col sm:flex-row h-full min-h-[300px]"
            >
              <div className="w-full sm:w-64 bg-gray-50 flex items-center justify-center p-8 border-r border-gray-50">
                <div className="relative w-full aspect-square max-w-[160px]">
                  <div className="absolute inset-0 bg-blue-600/5 rounded-full scale-110 group-hover:scale-125 transition-transform duration-700" />
                  <img 
                    src={org.photoURL ? makeDirectImageUrl(org.photoURL) : DEFAULT_ORG_IMAGE} 
                    alt={org.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain relative z-10 group-hover:rotate-6 transition-transform duration-500"
                  />
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col justify-center">
                <h3 className="text-2xl font-black text-gray-900 mb-6 group-hover:text-blue-600 transition-colors leading-tight">
                  {org.displayName}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="space-y-1">
                    <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Mail className="w-3 h-3" /> Elektron pochta
                    </span>
                    <p className="font-bold text-sm text-gray-700 break-all">{org.email}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Phone className="w-3 h-3" /> Telefon
                    </span>
                    <p className="font-bold text-sm text-gray-700">{org.phone || "+998 -- --- -- --"}</p>
                  </div>

                  <div className="sm:col-span-2 space-y-1 pt-2 border-t border-gray-50">
                    <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <MapPin className="w-3 h-3" /> Manzil
                    </span>
                    <p className="font-bold text-sm text-gray-700 leading-relaxed">
                      {org.address || "Toshkent shahri, O'zbekiston"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {partners.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Hozircha hamkorlar mavjud emas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
