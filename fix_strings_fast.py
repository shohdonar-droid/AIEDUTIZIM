import subprocess
import re

def run_tsc():
    result = subprocess.run(['npx', 'tsc', '--noEmit', 'telegram.ts'], capture_output=True, text=True)
    return result.stdout

def fix_file():
    with open('telegram.ts', 'r') as f:
        lines = f.readlines()
    
    out = run_tsc()
    matches = re.finditer(r'telegram\.ts\((\d+),\d+\): error TS1002: Unterminated string literal\.', out)
    
    line_nums = sorted(list(set(int(m.group(1)) - 1 for m in matches)), reverse=True)
    
    for line_num in line_nums:
        print(f"Fixing line {line_num + 1}")
        lines[line_num] = lines[line_num].rstrip('\n') + '\\n' + lines[line_num + 1].lstrip()
        del lines[line_num + 1]
    
    with open('telegram.ts', 'w') as f:
        f.writelines(lines)

for i in range(5):
    fix_file()

print("Done fixing strings fast")
