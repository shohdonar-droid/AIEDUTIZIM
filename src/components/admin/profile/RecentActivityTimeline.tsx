
import { CheckCircle2, Clock } from 'lucide-react';

const activities = [
  { id: 1, action: 'Kurs yangilandi', time: '10:30' },
  { id: 2, action: 'Talaba ro\'yxatdan o\'tdi', time: '09:15' },
  { id: 3, action: 'To\'lov tasdiqlandi', time: '08:45' },
];

export function RecentActivityTimeline() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="font-bold text-gray-900 mb-6">So‘nggi harakatlar</h3>
      <div className="space-y-6">
        {activities.map((act) => (
          <div key={act.id} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">{act.action}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={12} /> {act.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
