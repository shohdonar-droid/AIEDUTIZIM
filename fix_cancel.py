import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

old_block = """  if (normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
    aiModeDeactivate();
    const authed = await getAuthedUser(userId);
    return ctx.reply("Asosiy menyuga qaytildi:", {"""

new_block = """  if (normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
    aiModeDeactivate();
    pendingLogins.delete(userId); // <-- Important fix: clear any pending wizard/admin state
    const authed = await getAuthedUser(userId);
    return ctx.reply("Asosiy menyuga qaytildi:", {"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('telegram.ts', 'w') as f:
        f.write(content)
    print("Fixed pendingLogins.delete on Asosiy Menyu")
else:
    print("Could not find the block")
