import re

with open('telegram.ts', 'r') as f:
    content = f.read()

# Replace \n} with a newline and }
content = content.replace('\\n}', '\\n}\\n')
# Wait, this is hard. Better approach: if we see an invalid character error at a specific position, we can just replace that specific backslash n with a real newline.
