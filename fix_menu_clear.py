import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

old_block = """  if (menuButtons.includes(normText) || normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
    if (normText !== "💬 Savol-javob") {
      aiAssistantActiveUsers.delete(userId);
      aiServiceStates.delete(userId);
    }
  }"""

new_block = """  if (menuButtons.includes(normText) || normText === "🔙 Asosiy Menyu" || normText === "⬅️ Asosiy menyu") {
    if (normText !== "💬 Savol-javob") {
      aiAssistantActiveUsers.delete(userId);
      aiServiceStates.delete(userId);
    }
    pendingLogins.delete(userId); // Abort any pending state if user taps a menu button
  }"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('telegram.ts', 'w') as f:
        f.write(content)
    print("Fixed pendingLogins.delete on all menu buttons")
else:
    print("Could not find the menu block")
