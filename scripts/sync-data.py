#!/usr/bin/env python3
"""Copy data/*.json into index.html.

index.html does not load the data/ files at runtime: it carries its own copy
(the <script id="directory-data"> block), a no-JavaScript listing for
crawlers, and a few entry counts. Run this after editing any data/*.json file:

    python3 scripts/sync-data.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

# category key -> (data file, how to pick the list out of it)
SOURCES = {
    "government_offices": ("directory.json", lambda d: d["categories"]["government_offices"]),
    "schools": ("directory.json", lambda d: d["categories"]["schools"]),
    "colleges": ("directory.json", lambda d: d["categories"]["colleges"]),
    "sightseeing": ("sightseeing.json", lambda d: d["places"]),
    "showrooms": ("showrooms.json", lambda d: d["showrooms"]),
    "hotels": ("hotels.json", lambda d: d["hotels"]),
    "restaurants": ("restaurants.json", lambda d: d["restaurants"]),
}

HEADINGS = {
    "government_offices": "Government Offices",
    "schools": "Schools",
    "colleges": "Colleges",
    "sightseeing": "Places to Visit",
    "showrooms": "Shops &amp; Showrooms",
    "hotels": "Hotels",
    "restaurants": "Restaurants",
}

DATA_BLOCK = re.compile(r'(<script type="application/json" id="directory-data">\n)(.*?)(\n  </script>)', re.S)
NOSCRIPT_BLOCK = re.compile(r'(<h2>Full Dharmapuri directory listing</h2>\n.*?\n)(  <h3>.*?)(  </section>)', re.S)


def esc(s):
    return html.escape(s, quote=True)


def phone_html(phone):
    if not phone:
        return "Phone: not listed"
    tel = re.sub(r"[^\d+]", "", phone)
    return f'Phone: <a href="tel:{tel}">{esc(phone)}</a>'


def entry_html(cat, e):
    name = f"<strong>{esc(e['name'])}</strong>"
    if cat == "sightseeing":
        return f"{name} — {esc(e['description'])} How to reach: {esc(e['howToReach'])}."
    if cat == "colleges":
        label = f" ({esc(e['type'])}) — {esc(e['stream'])}"
    elif cat == "showrooms":
        label = f" ({esc(e['category'])})" + (f" — {esc(e['brand'])}" if e.get("brand") else "")
    elif cat == "hotels":
        label = f" ({esc(e['tier'])})"
    elif cat == "restaurants":
        label = f" ({esc(e['category'])})"
    else:
        label = f" ({esc(e['type'])})"
    return f"{name}{label}. {esc(e['address'])}. {phone_html(e.get('phone'))}"


def noscript_listing(categories):
    lines = []
    for cat, heading in HEADINGS.items():
        entries = categories[cat]
        lines.append(f"  <h3>{heading} ({len(entries)})</h3>")
        for taluk in sorted({e["taluk"] for e in entries}):
            lines.append(f"  <h4>{esc(taluk)} taluk</h4>")
            lines.append("  <ul>")
            lines += [f"  <li>{entry_html(cat, e)}</li>" for e in entries if e["taluk"] == taluk]
            lines.append("  </ul>")
    return "\n".join(lines) + "\n"


def data_json(data):
    """Pretty-print like the hand-written block: one entry per line."""
    def one_line(o):
        if isinstance(o, dict):
            return "{ " + ", ".join(f"{one_line(k)}: {one_line(v)}" for k, v in o.items()) + " }"
        return json.dumps(o, ensure_ascii=False)

    out = ["{"]
    keys = [k for k in data if k != "categories"]
    for k in keys:
        out.append(f"  {one_line(k)}: {one_line(data[k])},")
    out.append('  "categories": {')
    cats = list(data["categories"].items())
    for i, (cat, entries) in enumerate(cats):
        out.append(f"    {one_line(cat)}: [")
        for j, e in enumerate(entries):
            out.append(f"      {one_line(e)}" + ("," if j < len(entries) - 1 else ""))
        out.append("    ]" + ("," if i < len(cats) - 1 else ""))
    out.append("  }")
    out.append("}")
    return "\n".join(out)


def main():
    page = INDEX.read_text(encoding="utf-8")
    data = json.loads(DATA_BLOCK.search(page).group(2))

    loaded = {}
    for cat, (fname, pick) in SOURCES.items():
        if fname not in loaded:
            loaded[fname] = json.loads((ROOT / "data" / fname).read_text(encoding="utf-8"))
        data["categories"][cat] = pick(loaded[fname])
    data["lastUpdated"] = max(d["lastUpdated"] for d in loaded.values())

    old_total = sum(int(n) for n in re.findall(r"<h3>[^<]*\((\d+)\)</h3>", NOSCRIPT_BLOCK.search(page).group(2)))
    total = sum(len(v) for v in data["categories"].values())

    page = DATA_BLOCK.sub(lambda m: m.group(1) + data_json(data) + m.group(3), page)
    page = NOSCRIPT_BLOCK.sub(lambda m: m.group(1) + noscript_listing(data["categories"]) + m.group(3), page)
    if total != old_total:
        page = re.sub(rf"\b{old_total}( verified entries|</strong> verified entries)", rf"{total}\1", page)
        page = page.replace(f'id="faqTotalCount">{old_total}<', f'id="faqTotalCount">{total}<')

    INDEX.write_text(page, encoding="utf-8")
    print(f"index.html updated: {total} entries")
    for cat in HEADINGS:
        print(f"  {cat}: {len(data['categories'][cat])}")


if __name__ == "__main__":
    main()
