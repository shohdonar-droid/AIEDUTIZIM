import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Loader2, Mail, Phone, MapPin, Building2, Briefcase } from 'lucide-react';
import { makeDirectImageUrl } from '../lib/helpers';

const DEFAULT_ORG_IMAGE = "https://cdn-icons-png.flaticon.com/512/2830/2830312.png";

export default function Partners() {
  const [partners, setPartners] = useState<UserProfile[]>([]);
  const [independentTeachers, setIndependentTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const [orgSnap, independentSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'mustaqil_o_qituvchi')))
        ]);

        const orgList = orgSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        const indList = independentSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        
        setPartners(orgList.sort((a, b) => 
          (a.displayName || "").localeCompare(b.displayName || "", "uz-UZ")
        ));
        setIndependentTeachers(indList.sort((a, b) => 
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const PartnerCard = ({ org, index, typeLabel = "Tashkilot nomi" }: { org: UserProfile, index: number, typeLabel?: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col sm:flex-row items-center gap-10 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500"
    >
      <div className="w-40 h-40 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-full sm:rounded-3xl overflow-hidden p-6 group-hover:bg-blue-50/50 transition-colors duration-500">
        <img 
          src={org.photoURL ? makeDirectImageUrl(org.photoURL) : DEFAULT_ORG_IMAGE} 
          alt={org.displayName}
          referrerPolicy="no-referrer"
          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700"
        />
      </div>

      <div className="flex-1 w-full flex flex-col justify-center space-y-4">
        <div className="grid grid-cols-[1.5fr_auto_2.5fr] gap-x-4 items-start">
           <div className="flex items-center gap-3 text-blue-600 mt-0.5">
              <Briefcase className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-black text-gray-800">{typeLabel}:</span>
           </div>
           <div className="mx-2" />
           <span className="text-sm font-bold text-gray-900 leading-snug">
             {org.displayName}
           </span>
        </div>

        <div className="grid grid-cols-[1.5fr_auto_2.5fr] gap-x-4 items-center">
           <div className="flex items-center gap-3 text-blue-600">
              <Mail className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-black text-gray-800">Email:</span>
           </div>
           <div className="mx-2" />
           <span className="text-sm font-bold text-gray-600 break-all">{org.email}</span>
        </div>

        <div className="grid grid-cols-[1.5fr_auto_2.5fr] gap-x-4 items-center">
           <div className="flex items-center gap-3 text-blue-600">
              <Phone className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-black text-gray-800">Tel raqami:</span>
           </div>
           <div className="mx-2" />
           <span className="text-sm font-bold text-gray-600">{org.phone || "+998 -- --- -- --"}</span>
        </div>

        <div className="grid grid-cols-[1.5fr_auto_2.5fr] gap-x-4 items-start">
           <div className="flex items-center gap-3 text-blue-600 mt-0.5">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-black text-gray-800">Manzil:</span>
           </div>
           <div className="mx-2" />
           <span className="text-sm font-bold text-gray-600 leading-relaxed font-sans">
              {org.address || "Toshkent shahri, O'zbekiston"}
           </span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-3xl font-black text-[#0f172a] mb-2 tracking-tight">Hamkorlar (Tashkilotlar)</h1>
          <p className="text-sm font-medium text-gray-500">AIEDUTIZIM hamkor tashkilotlari ro'yxati</p>
        </div>

        <div className="space-y-6">
          {partners.map((org, index) => (
            <PartnerCard key={org.uid} org={org} index={index} />
          ))}
          {partners.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <p className="font-bold text-gray-400">Hamkor tashkilotlar topilmadi.</p>
            </div>
          )}
        </div>

        <div className="mt-20 mb-12 border-t pt-20 border-gray-100">
          <h1 className="text-3xl font-black text-[#0f172a] mb-2 tracking-tight uppercase">Hamkor Mustaqil o'qituvchilar</h1>
          <p className="text-sm font-medium text-gray-500">AIEDUTIZIM mustaqil ustozlari ro'yxati</p>
        </div>

        <div className="space-y-6">
          {independentTeachers.map((org, index) => (
            <PartnerCard key={org.uid} org={org} index={index} typeLabel="O'qituvchi F.I.SH" />
          ))}
          {independentTeachers.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <p className="font-bold text-gray-400">Mustaqil o'qituvchilar topilmadi.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
