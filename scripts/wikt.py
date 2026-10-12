"""Fetch English Wiktionary pages and keep only their Hebrew section (cached, gzipped).

    python3 scripts/wikt.py            # prefetch every title in wordlist.py
"""
import gzip
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'source', 'wikt')
UA = 'ivrit-learner-app/1.0 (https://github.com/cveenstra/ivrit; personal study app)'
os.makedirs(CACHE, exist_ok=True)


def _path(title):
    return os.path.join(CACHE, urllib.parse.quote(title, safe='') + '.html.gz')


def hebrew_section(page_html):
    """The Hebrew L2 section of a rendered page, or '' when the page has none."""
    i = page_html.find('id="Hebrew"')
    if i < 0:
        return ''
    j = page_html.find('mw-heading2', i + 20)
    return page_html[i:j if j > 0 else None]


def get(title, fetch=True):
    """Hebrew section HTML for a page title ('' if none / missing). None if not cached and fetch=False."""
    p = _path(title)
    if os.path.exists(p):
        with gzip.open(p, 'rt', encoding='utf-8') as f:
            return f.read()
    if not fetch:
        return None
    url = 'https://en.wiktionary.org/w/index.php?title=' + urllib.parse.quote(title) + '&action=render'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    sec = ''
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                sec = hebrew_section(r.read().decode('utf-8'))
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                sec = ''
                break
            time.sleep(3 * (attempt + 1))
        except Exception:
            time.sleep(3 * (attempt + 1))
    else:
        return ''
    with gzip.open(p, 'wt', encoding='utf-8') as f:
        f.write(sec)
    time.sleep(0.4)
    return sec


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    import wordlist
    titles = [w['title'] for w in wordlist.words()] + [v['title'] for v in wordlist.verbs()]
    todo = [t for t in dict.fromkeys(titles) if get(t, fetch=False) is None]
    print(f'{len(titles)} titles, {len(todo)} to fetch', flush=True)
    for n, t in enumerate(todo, 1):
        sec = get(t)
        if n % 25 == 0:
            print(n, t, len(sec), flush=True)
    print('done', flush=True)
