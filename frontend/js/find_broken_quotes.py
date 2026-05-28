#!/usr/bin/env python3
"""Find all JS lines with unescaped single quotes in i18n.js."""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/root/servicedesk/frontend/js/i18n.js"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for lineno, line in enumerate(lines, 1):
    stripped = line.strip()
    if not stripped or stripped.startswith("//"):
        continue
    if ":" not in stripped:
        continue
    sq = stripped.count("'")
    if sq > 2:
        parts = stripped.split(":")
        if len(parts) >= 2:
            val = ":".join(parts[1:]).strip().rstrip(",")
            if val.startswith("'") and val.endswith("'"):
                inner = val[1:-1]
                if "'" in inner:
                    print(f"Line {lineno}: {stripped}")
