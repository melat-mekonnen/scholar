from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/applications/page.tsx"
t = p.read_text(encoding="utf-8")
close = "</" + "div>"
old = f"      {close}\n\n      {close}\n    {close}"
new = f"      {close}\n    {close}"
if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding="utf-8", newline="\n")
    print("fixed")
else:
    print("pattern not found")
    print(repr(t.split("        </main>")[-1][:120]))
