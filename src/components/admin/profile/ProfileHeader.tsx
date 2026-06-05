
import { User, Phone, Mail, Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export function ProfileHeader({ user }: { user: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-600/20"
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <img src={user?.photoURL || 'https://ui-avatars.com/api/?name=Admin'} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white/20 shadow-lg object-cover" />
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-blue-600"></div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold">{user?.displayName || 'Admin'}</h1>
          <p className="opacity-80 text-lg uppercase tracking-wider text-sm">Administrator</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm opacity-90">
             <div className="flex items-center gap-2"><User size={16} /> ID: {user?.uid.slice(0,8)}</div>
             <div className="flex items-center gap-2"><Phone size={16} /> {user?.phone || '+998 xx xxx xx xx'}</div>
             <div className="flex items-center gap-2"><Mail size={16} /> {user?.email || 'admin@aiedutizim.uz'}</div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center md:text-right text-xs">
          <p className="opacity-70">Oxirgi kirish:</p>
          <p className="font-bold">Bugun 11:05</p>
        </div>
      </div>
    </motion.div>
  );
}
