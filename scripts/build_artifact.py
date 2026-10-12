"""Package the app for a claude.ai artifact: the viewer supplies <html>, <head> and <body>,
so the page is index.html's head links plus its body content; css/, js/, data/ and assets/
are published alongside it as files.
Usage: python3 scripts/build_artifact.py <out_dir>"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]
src = open(os.path.join(ROOT, 'index.html')).read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)
keep = [l.strip() for l in head.split('\n') if re.match(r'\s*<(title|link)\b', l)]
keep = [re.sub(r'<title>.*?</title>', '<title>Ivrit</title>', l) for l in keep]
page = '\n'.join(keep) + '\n' + body.strip() + '\n'
os.makedirs(out, exist_ok=True)
for d in ('css', 'js', 'data', 'assets'):
    shutil.rmtree(os.path.join(out, d), ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, d), os.path.join(out, d), ignore=shutil.ignore_patterns('*.png'))
open(os.path.join(out, 'index.html'), 'w').write(page)
files = sorted(os.path.relpath(os.path.join(dp, f), out) for dp, _, fs in os.walk(out) for f in fs if f != 'index.html')
print('\n'.join(files))
