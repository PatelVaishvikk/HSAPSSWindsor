
import sys

file_path = "pages/student-portal.js"
start_line = 125 # 1-indexed (inclusive)
end_line = 186   # 1-indexed (inclusive)

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = lines[:start_line-1] + lines[end_line:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"Successfully removed lines {start_line} to {end_line}.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
