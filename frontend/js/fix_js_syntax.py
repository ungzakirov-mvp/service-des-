#!/usr/bin/env python3
"""Fix JS syntax errors in i18n.js - unescaped single quotes in string values."""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/root/servicedesk/frontend/js/i18n.js"

with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# These are actual JS syntax errors - single quotes inside single-quoted strings
# Python writes them correctly as characters, but the JS output is invalid
# Fix: change to double-quoted strings for JS

# UZ: hud_metrics: 'Asosiy ko'rsatkichlar',
old1 = "hud_metrics: 'Asosiy ko'rsatkichlar',"
new1 = 'hud_metrics: "Asosiy ko\'rsatkichlar",'

# UZ: hud_breached: 'Muddat o'tgan',
old2 = "hud_breached: 'Muddat o'tgan',"
new2 = 'hud_breached: "Muddat o\'tgan",'

count = 0
if old1 in c:
    c = c.replace(old1, new1)
    count += 1
    print(f"Fixed: {old1} -> {new1}")
if old2 in c:
    c = c.replace(old2, new2)
    count += 1
    print(f"Fixed: {old2} -> {new2}")

if count == 0:
    # Check current state
    import subprocess
    result = subprocess.run(['grep', '-n', "ko'rsatkichlar\\|o'tgan", path], capture_output=True, text=True)
    print(f"Current state of broken lines:\n{result.stdout}")
    print("Check if lines were already fixed or pattern differs")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print(f"Done. Fixed {count} issues.")
