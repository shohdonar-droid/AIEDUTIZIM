import { User, Phone, Mail, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { makeDirectImageUrl } from '../../../lib/helpers';

export function ProfileHeader({ user }: { user: any }) {
  const avatarUrl = user?.photoURL ? makeDirectImageUrl(user.photoURL) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Admin')}&background=0061ff&color=fff`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex flex-col items-center shrink-0">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner">
              <img 
                src={avatarUrl || ""} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm"></div>
          </div>
          <div className="mt-3 text-center space-y-1">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {user?.role === 'subadmin' ? 'Kichik administrator' : 'Tizim administratori'}
            </p>
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-extrabold text-xs font-mono shadow-sm">
                <span className="text-amber-600 font-black">ID:</span>
                <span>{user?.systemId || user?.uid}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-black text-xs font-mono shadow-sm">
                <span className="text-emerald-600 font-black">💳 Balans:</span>
                <span>{((user as any)?.balance || 0).toLocaleString()} UZS</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{user?.displayName || 'Admin'}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
             <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
               <User size={14} className="text-blue-600" /> 
               <span>ID: {user?.systemId || user?.uid}</span>
             </div>
             <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
               <Phone size={14} className="text-blue-600" /> 
               <span>{user?.phone || '+998 -- --- -- --'}</span>
             </div>
             <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
               <Mail size={14} className="text-blue-600" /> 
               <span>{user?.email || 'admin@aiedutizim.uz'}</span>
             </div>
             {user?.address && (
               <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                 <MapPin size={14} className="text-blue-600" /> 
                 <span>{user.address}</span>
               </div>
             )}
          </div>
        </div>
        <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl px-6 py-4 text-center md:text-right">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Status</p>
          <p className="text-blue-600 font-black text-xs uppercase tracking-wider">
            {user?.role === 'subadmin' ? 'Kichik administrator' : 'Tizim administratori'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
