
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export function KPICard({ title, value, icon: Icon, change }: { title: string, value: string, icon: LucideIcon, change: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}                
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between"
    >
      <div>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        <p className="text-green-500 text-xs mt-1 font-bold">{change}</p>
      </div>
      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
        <Icon size={20} />
      </div>
    </motion.div>
  );
}
