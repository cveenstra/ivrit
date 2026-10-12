"""Write data/tracing.json: simplified block-print stroke guides for each letter shape.

How these were made (also stated in the app's About page and SOURCES.md): the shapes are
drawn by hand for this app, as polylines in a 100 x 100 box (y grows downward, baseline at
y = 78, ascenders above 24, descenders to 98). They follow the usual conventions for writing
print Hebrew by hand: top bars are drawn first and left to right, uprights top to bottom, bases
at the end. There is no single official stroke order for print Hebrew, and these guides do not
come from a dataset, so treat them as one reasonable way to form each letter, not the only one.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SHAPES = {
    'alef': [[(30, 24), (70, 78)], [(72, 24), (72, 36), (50, 47)], [(52, 55), (32, 62), (28, 78)]],
    'bet': [[(26, 24), (68, 24), (72, 30), (72, 78)], [(84, 78), (22, 78)]],
    'gimel': [[(42, 24), (56, 24), (60, 60), (64, 78)], [(58, 58), (44, 78)]],
    'dalet': [[(20, 24), (78, 24)], [(66, 24), (66, 78)]],
    'he': [[(24, 24), (72, 24), (76, 30), (76, 78)], [(32, 46), (32, 78)]],
    'vav': [[(42, 24), (56, 24), (56, 78)]],
    'zayin': [[(36, 24), (66, 24)], [(52, 24), (52, 78)]],
    'het': [[(24, 24), (72, 24), (76, 30), (76, 78)], [(28, 24), (28, 78)]],
    'tet': [[(34, 24), (26, 30), (26, 74), (30, 78), (70, 78), (76, 72), (76, 30), (70, 24), (56, 30), (52, 40)]],
    'yod': [[(44, 24), (56, 24), (54, 44)]],
    'kaf': [[(26, 24), (64, 24), (76, 36), (76, 66), (64, 78), (26, 78)]],
    'kaf-final': [[(24, 24), (68, 24), (74, 30), (74, 98)]],
    'lamed': [[(30, 4), (30, 34), (70, 34), (76, 42), (70, 60), (52, 78)]],
    'mem': [[(28, 24), (24, 78)], [(28, 30), (46, 24), (70, 24), (76, 32), (76, 78), (46, 78)]],
    'mem-final': [[(24, 24), (76, 24), (76, 78), (24, 78), (24, 24)]],
    'nun': [[(44, 24), (56, 24), (58, 30), (58, 78), (28, 78)]],
    'nun-final': [[(46, 24), (56, 24), (56, 98)]],
    'samekh': [[(26, 24), (70, 24), (76, 32), (76, 62), (62, 78), (40, 78), (26, 64), (26, 24)]],
    'ayin': [[(74, 24), (72, 62), (60, 74), (26, 78)], [(34, 24), (58, 66)]],
    'pe': [[(26, 24), (64, 24), (76, 36), (76, 66), (64, 78), (26, 78)], [(30, 24), (30, 46), (48, 46)]],
    'pe-final': [[(24, 24), (68, 24), (74, 30), (74, 98)], [(28, 24), (28, 46), (46, 46)]],
    'tsadi': [[(30, 24), (66, 72), (70, 78), (24, 78)], [(74, 24), (72, 40), (54, 50)]],
    'tsadi-final': [[(30, 24), (46, 48), (46, 98)], [(74, 24), (72, 40), (48, 50)]],
    'qof': [[(24, 24), (72, 24), (76, 30), (76, 78)], [(32, 40), (32, 98)]],
    'resh': [[(22, 24), (64, 24), (74, 32), (74, 78)]],
    'shin': [[(78, 24), (76, 70), (68, 78), (32, 78), (24, 70), (22, 24)], [(46, 24), (56, 64)]],
    'tav': [[(20, 24), (72, 24), (76, 30), (76, 78)], [(34, 24), (34, 70), (26, 78)]],
}

NOTE = ('Simplified block-print stroke guides drawn by hand for this app. They follow common conventions '
        'for print Hebrew (top bars first, uprights top to bottom, bases last), but there is no single '
        'official stroke order and they are not taken from a dataset.')

if __name__ == '__main__':
    out = {'note': NOTE, 'box': [100, 100], 'baseline': 78, 'shapes': {k: [[list(p) for p in s] for s in v] for k, v in SHAPES.items()}}
    json.dump(out, open(os.path.join(ROOT, 'data', 'tracing.json'), 'w'), indent=1)
    print(len(SHAPES), 'shapes')
