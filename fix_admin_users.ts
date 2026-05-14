import fs from 'fs';

let adminUsers = fs.readFileSync('src/pages/admin/AdminUsers.tsx', 'utf8');

adminUsers = adminUsers.replace(
`<th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Tashkilot</th>
                   <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Login</th>
                   <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Parol</th>`,
`<th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Tashkilot</th>
                   <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Tel/Email</th>
                   <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Login</th>
                   <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Parol</th>`
);

adminUsers = adminUsers.replace(
`<td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight">
                          {s.teacherName || teachers.find(t => t.uid === s.teacherId)?.displayName || '-'}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-sm font-bold text-indigo-600 bg-indigo-50/50 text-center">{s.login || '-'}</td>`,
`<td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight">
                          {s.teacherName || teachers.find(t => t.uid === s.teacherId)?.displayName || '-'}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        <div>{s.phone || '-'}</div>
                        <div className="text-gray-400 mt-0.5">{s.email || '-'}</div>
                     </td>
                     <td className="px-6 py-4 text-sm font-bold text-indigo-600 bg-indigo-50/50 text-center">{s.login || '-'}</td>`
);

fs.writeFileSync('src/pages/admin/AdminUsers.tsx', adminUsers);
