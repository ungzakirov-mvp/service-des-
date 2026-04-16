import subprocess
import sys

# Build the command as a list to avoid shell escaping issues
cmd = [
    'docker', 'exec', 'backend',
    'curl', '-s', '-X', 'POST',
    'http://localhost:8000/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"email":"admin@novumtech.uz","password":"admin123"}'
]

result = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:", result.stdout[:500])
print("STDERR:", result.stderr[:500])