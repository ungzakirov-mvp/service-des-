#!/usr/bin/env python3
"""Fix remaining unescaped quotes in i18n.js UZ HUD section."""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/root/servicedesk/frontend/js/i18n.js"

with open(path, "r", encoding="utf-8") as f:
    c = f.read()

fixes = {
    "hud_no_critical: 'Kritik arizalar yo'q',": 'hud_no_critical: "Kritik arizalar yo\'q",',
    "hud_no_agents: 'Faol agentlar yo'q',": 'hud_no_agents: "Faol agentlar yo\'q",',
}

count = 0
for old, new in fixes.items():
    if old in c:
        c = c.replace(old, new)
        print(f"Fixed: {old[:50]}...")
        count += 1
    else:
        print(f"Not found: {old[:50]}...")
        # Show what's actually there
        import re
        # Find similar lines
        for line in c.split('\n'):
            if 'hud_no_' in line.lower():
                print(f"  Current: {line.strip()}")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print(f"Done. Fixed {count} issues.")
