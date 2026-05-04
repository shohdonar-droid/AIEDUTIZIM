import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export function MultiSelectDropdown({ 
  label, 
  options,
  selectedIds, 
  onChange,
  placeholder,
  theme = 'blue'
}: { 
  label: string, 
  options: any[], 
  selectedIds: string[], 
  onChange: (id: string, checked: boolean) => void, 
  placeholder: string,
  theme?: 'blue' | 'purple'
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const colorClass = theme === 'purple' ? 'text-purple-600 focus:ring-purple-600' : 'text-blue-600 focus:ring-blue-600';
  const bgColorClass = theme === 'purple' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700';

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2">
         {label}
      </label>
      <div 
        className={`w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 cursor-pointer flex justify-between items-center ${open ? `ring-2 ${theme === 'purple' ? 'ring-purple-600' : 'ring-blue-600'}` : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="font-bold text-gray-700 truncate mr-2">
           {selectedIds.length === 0 ? placeholder : `${selectedIds.length} ta tanlandi`}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
           {options.length === 0 ? (
             <div className="p-4 text-center text-gray-500 font-medium text-sm">Hech narsa topilmadi</div>
           ) : (
             options.map(opt => (
               <label key={opt.id} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                 <input 
                   type="checkbox"
                   checked={selectedIds.includes(opt.id)}
                   onChange={(e) => onChange(opt.id, e.target.checked)}
                   className={`w-5 h-5 rounded border-gray-300 ${colorClass}`}
                 />
                 <span className="ml-3 font-medium text-gray-700">{opt.name || opt.title || `${opt.lastName || ''} ${opt.firstName || ''}` || opt.id}</span>
               </label>
             ))
           )}
        </div>
      )}
    </div>
  );
}
