import sys

with open('src/pages/admin/AdminUsers.tsx', 'r') as f:
    content = f.read()

old_thead = '''                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                          Telegram ID
                        </th>
                        <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                          Mavjud Balans (Ball)
                        </th>'''

new_thead = '''                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                          Telegram ID
                        </th>
                        <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                          Kontakt
                        </th>
                        <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                          Mavjud Balans (Ball)
                        </th>'''

old_tbody = '''                              <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                {tgId}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-100 text-sm inline-flex items-center gap-1">
                                  💎 {currentBall} ball
                                </span>
                              </td>'''

new_tbody = '''                              <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                {tgId}
                              </td>
                              <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-700">
                                {tu.phone || tu.phoneNumber || "Kiritilmagan"}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-100 text-sm inline-flex items-center gap-1">
                                  💎 {currentBall} ball
                                </span>
                              </td>'''

content = content.replace(old_thead, new_thead).replace(old_tbody, new_tbody)
with open('src/pages/admin/AdminUsers.tsx', 'w') as f:
    f.write(content)
print("Done AdminUsers.tsx")
