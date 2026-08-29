import sys
content = open('src/pages/admin/AdminBotUsers.tsx', 'r').read()

old_thead = '''          <tr className="bg-gray-100 text-left text-xs text-gray-500 uppercase">
            <th className="p-4">Nomer</th>
            <th className="p-4">Ism</th>
            <th className="p-4">Username</th>
            <th className="p-4">Telegram ID</th>
            <th className="p-4">Amallar</th>
          </tr>'''

new_thead = '''          <tr className="bg-gray-100 text-left text-xs text-gray-500 uppercase">
            <th className="p-4">Nomer</th>
            <th className="p-4">Ism</th>
            <th className="p-4">Username</th>
            <th className="p-4">Telegram ID</th>
            <th className="p-4">Kontakt</th>
            <th className="p-4">Amallar</th>
          </tr>'''

old_tbody = '''            <tr key={`${u.id}_${i}`} className="border-b">
              <td className="p-4">{i + 1}</td>
              <td className="p-4">{u.name || "Noma'lum"}</td>
              <td className="p-4">@{u.username || "yo'q"}</td>
              <td className="p-4">{u.telegramId || u.id}</td>
              <td className="p-4">
                <button onClick={() => handleDelete(u.id)} className="text-red-500"><Trash2 /></button>
              </td>
            </tr>'''

new_tbody = '''            <tr key={`${u.id}_${i}`} className="border-b">
              <td className="p-4">{i + 1}</td>
              <td className="p-4">{u.firstName || u.name || "Noma'lum"} {u.lastName || ""}</td>
              <td className="p-4">@{u.username || "yo'q"}</td>
              <td className="p-4">{u.telegramId || u.id}</td>
              <td className="p-4">{u.phone || "yo'q"}</td>
              <td className="p-4">
                <button onClick={() => handleDelete(u.id)} className="text-red-500"><Trash2 /></button>
              </td>
            </tr>'''

content = content.replace(old_thead, new_thead).replace(old_tbody, new_tbody)
open('src/pages/admin/AdminBotUsers.tsx', 'w').write(content)
print("Done")
