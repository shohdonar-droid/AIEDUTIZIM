import re

with open("telegram.ts", "r") as f:
    content = f.read()

content = content.replace('callback_data: "comp_srv_edit_field_', 'callback_data: "comp_srv_fedit_')
content = content.replace('bot.action(/comp_srv_edit_field_(.+)/', 'bot.action(/comp_srv_fedit_(.+)/')

with open("telegram.ts", "w") as f:
    f.write(content)

