#!/usr/bin/env python3
"""Validate i18n.js and dashboard-hud.js syntax."""
import sys, re

base = sys.argv[1] if len(sys.argv) > 1 else "/root/servicedesk/frontend/js"

for fname in ["i18n.js", "dashboard-hud.js"]:
    path = f"{base}/{fname}"
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()
    
    lines = c.splitlines()
    print(f"=== {fname} ===")
    print(f"  Lines: {len(lines)}")
    
    # Count brackets
    for label, op, cl in [("Braces {}", "{", "}"), ("Parens ()", "(", ")"), ("Brackets []", "[", "]")]:
        oc = c.count(op)
        cc = c.count(cl)
        status = "OK" if oc == cc else f"MISMATCH (diff: {oc-cc})"
        print(f"  {label}: open={oc} close={cc} -> {status}")
    
    # Check comments
    for kw in ["HUD Dashboard", "Dashboard extra"]:
        cnt = c.count(f"// {kw}")
        print(f"  '// {kw}' occurrences: {cnt}")

print("Done.")
