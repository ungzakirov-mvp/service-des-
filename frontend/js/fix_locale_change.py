#!/usr/bin/env python3
"""Fix: add locale change event dispatch and HUD re-render listener."""
import sys

js_dir = sys.argv[1] if len(sys.argv) > 1 else "/root/servicedesk/frontend/js"

# 1. Fix i18n.js - add dispatchEvent after updateActiveFlag()
i18n_path = f"{js_dir}/i18n.js"
with open(i18n_path, "r", encoding="utf-8") as f:
    i18n_content = f.read()

old = """            this.applyTranslations();
            this.updateActiveFlag();
        }"""

new = """            this.applyTranslations();
            this.updateActiveFlag();
            document.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: locale } }));
        }"""

if old not in i18n_content:
    # Try without the closing brace
    print("Pattern not found, trying alternative...")
    old2 = """            this.applyTranslations();
            this.updateActiveFlag();"""
    new2 = """            this.applyTranslations();
            this.updateActiveFlag();
            document.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: locale } }));"""
    if old2 in i18n_content:
        i18n_content = i18n_content.replace(old2, new2)
        print("Fixed i18n.js locale change dispatch (alt pattern)")
    else:
        print("ERROR: Could not find setLocale pattern in i18n.js")
        sys.exit(1)
else:
    i18n_content = i18n_content.replace(old, new)
    print("Fixed i18n.js locale change dispatch")

with open(i18n_path, "w", encoding="utf-8") as f:
    f.write(i18n_content)

# 2. Fix dashboard-hud.js - add locale change listener
hud_path = f"{js_dir}/dashboard-hud.js"
with open(hud_path, "r", encoding="utf-8") as f:
    hud_content = f.read()

listener_code = """
document.addEventListener('localeChanged', function() {
    var container = document.getElementById('hudDashboard');
    if (container && window.getComputedStyle(container).display !== 'none') {
        window.HUD = window.HUD || {};
        renderAll(container);
    }
});
"""

# Find the right insertion point - after the auto-load IIFE
insert_marker = "window.loadHUDDashboard = loadHUDDashboard;"
if insert_marker in hud_content:
    hud_content = hud_content.replace(insert_marker, insert_marker + listener_code)
    print("Added locale change listener to dashboard-hud.js")
else:
    # Try different marker
    insert_marker = "window.HUD = HUD;"
    if insert_marker in hud_content:
        hud_content = hud_content.replace(insert_marker, insert_marker + listener_code)
        print("Added locale change listener to dashboard-hud.js (alt marker)")
    else:
        print("ERROR: Could not find insertion point in dashboard-hud.js")
        sys.exit(1)

with open(hud_path, "w", encoding="utf-8") as f:
    f.write(hud_content)

print("Done. Both files patched.")
