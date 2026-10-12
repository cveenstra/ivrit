"""Tiny HTML helpers (stdlib only): nested-table-safe table extraction and text cleanup."""
import html
import re
from html.parser import HTMLParser

SKIP = {'style', 'script', 'sup'}


class _Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []      # finished tables: list of rows; row = list of (tag, text, attrs)
        self.stack = []       # open tables
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP:
            self.skip += 1
            return
        if tag == 'table':
            self.stack.append({'cls': a.get('class', ''), 'rows': [], 'row': None, 'cell': None})
        elif not self.stack:
            return
        t = self.stack[-1] if self.stack else None
        if tag == 'tr' and t is not None:
            t['row'] = []
        elif tag in ('td', 'th') and t is not None and t['row'] is not None:
            t['cell'] = {'tag': tag, 'text': [], 'attrs': a}
        elif tag == 'br' and t is not None and t['cell'] is not None:
            t['cell']['text'].append(' | ')

    def handle_endtag(self, tag):
        if tag in SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if not self.stack:
            return
        t = self.stack[-1]
        if tag in ('td', 'th') and t['cell'] is not None and t['row'] is not None:
            c = t['cell']
            t['row'].append((c['tag'], clean(''.join(c['text'])), c['attrs']))
            t['cell'] = None
        elif tag == 'tr' and t['row'] is not None:
            t['rows'].append(t['row'])
            t['row'] = None
        elif tag == 'table':
            done = self.stack.pop()
            self.tables.append(done)

    def handle_data(self, data):
        if self.skip or not self.stack:
            return
        t = self.stack[-1]
        if t['cell'] is not None:
            t['cell']['text'].append(data)


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def tables(src, cls=None):
    p = _Tables()
    p.feed(src)
    out = p.tables
    if cls:
        out = [t for t in out if cls in t['cls']]
    return out


def strip_tags(s):
    s = re.sub(r'<(style|script)\b.*?</\1>', ' ', s, flags=re.S)
    s = re.sub(r'<sup\b.*?</sup>', ' ', s, flags=re.S)
    return clean(re.sub(r'<[^>]+>', ' ', s))
