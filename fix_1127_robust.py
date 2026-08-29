import subprocess
import re

def run_tsc():
    result = subprocess.run(['npx', 'tsc', '--noEmit', 'telegram.ts'], capture_output=True, text=True)
    return result.stdout

def fix_file():
    with open('telegram.ts', 'r') as f:
        lines = f.readlines()
    
    out = run_tsc()
    matches = list(re.finditer(r'telegram\.ts\((\d+),(\d+)\): error TS1127: Invalid character\.', out))
    if not matches:
        return False
        
    changes_made = False
    matches.sort(key=lambda m: (int(m.group(1)), int(m.group(2))), reverse=True)
    
    for m in matches:
        line_idx = int(m.group(1)) - 1
        col_idx = int(m.group(2)) - 1
        
        line = lines[line_idx]
        
        # Check window around col_idx
        start = max(0, col_idx - 2)
        end = min(len(line), col_idx + 3)
        print(f"Line {line_idx+1} Col {col_idx+1}: window '{line[start:end]}'")
        
        # We just find the nearest \\n or \\ around col_idx
        idx = line.find('\\n', start, end)
        if idx != -1:
            lines[line_idx] = line[:idx] + '\n' + line[idx+2:]
            changes_made = True
            print("Fixed \\n")
        else:
            idx = line.find('\\', start, end)
            if idx != -1:
                lines[line_idx] = line[:idx] + '\n' + line[idx+1:]
                changes_made = True
                print("Fixed \\")

    if changes_made:
        with open('telegram.ts', 'w') as f:
            f.writelines(lines)
        return True
    return False

while fix_file():
    pass

print("Done")
