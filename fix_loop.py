import sys
content = open('telegram.ts', 'r').read()

old_block = '''      const respData = await res.json();
      fullTranslatedText += (respData.content || "") + "\\n\\n";

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});'''

new_block = '''      const respData = await res.json();
      fullTranslatedText += (respData.content || "") + "\\n\\n";
      stepCount++;
    }

    await ctx.telegram.deleteMessage(chatId!, loadingMsg.message_id).catch(() => {});'''

content = content.replace(old_block, new_block)
open('telegram.ts', 'w').write(content)
print('Done')
