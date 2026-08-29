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
        
    # Process from bottom to top to not mess up line numbers and columns
    # We group by line number, then sort columns in reverse
    changes_made = False
    
    # Sort matches in reverse order of line, then reverse order of column
    matches.sort(key=lambda m: (int(m.group(1)), int(m.group(2))), reverse=True)
    
    for m in matches:
        line_idx = int(m.group(1)) - 1
        col_idx = int(m.group(2)) - 1
        
        line = lines[line_idx]
        
        # Check if there's a '\n' starting at col_idx
        if col_idx < len(line) and line[col_idx:col_idx+2] == '\\n':
            print(f"Fixing invalid character \\n at line {line_idx+1}:{col_idx+1}")
            # Replace '\\n' with an actual newline
            lines[line_idx] = line[:col_idx] + '\n' + line[col_idx+2:]
            changes_made = True
        elif col_idx < len(line) and line[col_idx] == '\\':
            print(f"Fixing invalid character \\ at line {line_idx+1}:{col_idx+1}")
            lines[line_idx] = line[:col_idx] + '\n' + line[col_idx+1:]
            changes_made = True

    if changes_made:
        with open('telegram.ts', 'w') as f:
            f.writelines(lines)
        return True
    return False

while fix_file():
    pass

print("Done fixing all 1127 errors")
