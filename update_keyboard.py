import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

old_user_header = """  const userHeader = [
    [{ text: "👤 Profil" }, { text: "💬 Adminga murojaat" }],
    [{ text: "🤖 Xizmatlar" }, { text: "💰 Bonus olish" }],
    [{ text: "💰 Balans" }, { text: "🌐 Rasmiy sayt" }]
  ];"""

new_user_header = """  const userHeader = [
    [{ text: "💻 CHIRCHIQ KOMPYUTER XIZMATLARI" }],
    [{ text: "👤 Profil" }, { text: "💬 Adminga murojaat" }],
    [{ text: "🤖 Xizmatlar" }, { text: "💰 Bonus olish" }],
    [{ text: "💰 Balans" }, { text: "🌐 Rasmiy sayt" }]
  ];"""

old_admin_header = """    return [
      [{ text: "👤 Profil" }],
      [{ text: "🤖 Xizmatlar" }, { text: "💬 Savol-javob" }],
      [{ text: "💵 Balans to'ldirish (Admin)" }],
      [{ text: "📢 E'lon yuborish" }, { text: `📊 Statistika (${telegramUsersCount})` }],
      isPrimary 
        ? [{ text: "📥 Javob berilmaganlar" }, { text: "💰 Narxlar sozlamalari" }]
        : [{ text: "📥 Javob berilmaganlar" }],
      [{ text: "🌐 Rasmiy sayt" }]
    ];"""

new_admin_header = """    return [
      [{ text: "💻 CHIRCHIQ KOMPYUTER XIZMATLARI" }],
      [{ text: "👤 Profil" }],
      [{ text: "🤖 Xizmatlar" }, { text: "💬 Savol-javob" }],
      [{ text: "💵 Balans to'ldirish (Admin)" }],
      [{ text: "📢 E'lon yuborish" }, { text: `📊 Statistika (${telegramUsersCount})` }],
      isPrimary 
        ? [{ text: "📥 Javob berilmaganlar" }, { text: "💰 Narxlar sozlamalari" }]
        : [{ text: "📥 Javob berilmaganlar" }],
      [{ text: "🌐 Rasmiy sayt" }]
    ];"""

if old_user_header in content and old_admin_header in content:
    content = content.replace(old_user_header, new_user_header)
    content = content.replace(old_admin_header, new_admin_header)
    with open('telegram.ts', 'w') as f:
        f.write(content)
    print("Keyboard updated successfully")
else:
    print("Failed to find keyboard structures to update")
