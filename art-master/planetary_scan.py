#!/usr/bin/env python3
"""
Retro-futuristic planetary cross-section terminal animation.
Uses the `art` library for ASCII text rendering.
Run: python planetary_scan.py
"""

import sys
import os
import math
import time
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from art import text2art, art as asc_art
    HAS_ART = True
except ImportError:
    HAS_ART = False

# ── ANSI / terminal ──────────────────────────────────────────────────────────
ESC = '\033'
CLEAR      = f'{ESC}[2J{ESC}[H'
GOTO       = lambda r, c: f'{ESC}[{r};{c}H'
HIDE_CUR   = f'{ESC}[?25l'
SHOW_CUR   = f'{ESC}[?25h'
RESET      = f'{ESC}[0m'
BOLD       = f'{ESC}[1m'
BLACK_BG   = f'{ESC}[40m'

def rgb(r, g, b):   return f'{ESC}[38;2;{r};{g};{b}m'
def bgrgb(r, g, b): return f'{ESC}[48;2;{r};{g};{b}m'

# Neon palette
C_YELLOW  = rgb(255, 220,   0)
C_ORANGE  = rgb(255, 140,   0)
C_RED     = rgb(255,  50,  50)
C_GREEN   = rgb(  0, 255, 100)
C_CYAN    = rgb(  0, 210, 255)
C_PURPLE  = rgb(180,   0, 255)
C_WHITE   = rgb(220, 255, 220)
C_DIM     = rgb(  0,  55,  30)
C_DGRAY   = rgb( 30,  30,  30)
C_MANTLE  = rgb(200, 120,  30)

# ── Planetary layer table ────────────────────────────────────────────────────
# (normalised_max_radius, fg_color, interior_char, exterior_char, name, density)
LAYERS = [
    (0.13, C_YELLOW,  '█', '█', 'INNER CORE',   '14,300 kg/m³',  5200),
    (0.32, C_RED,     '▓', '▓', 'OUTER CORE',   '11,000 kg/m³',  4500),
    (0.55, C_ORANGE,  '▒', '▒', 'LOWER MANTLE', ' 5,500 kg/m³',  2500),
    (0.72, C_MANTLE,  '░', '░', 'UPPER MANTLE', ' 3,400 kg/m³',  1600),
    (0.88, C_GREEN,   '·', '·', 'CRUST',        ' 2,800 kg/m³',   600),
    (1.00, C_CYAN,    ':', ':', 'ATMOSPHERE',   '     1 kg/m³',   250),
]

def layer_at(dist):
    for max_r, clr, ich, ech, *_ in LAYERS:
        if dist <= max_r:
            return clr, ich, ech
    return C_CYAN, ':', ':'


# ── Render helpers ───────────────────────────────────────────────────────────
def scanline_char(ch, row):
    """Dim alternate rows to mimic CRT scanlines."""
    if row % 2 == 0:
        return ch
    table = {'█': '▓', '▓': '▒', '▒': '░', '░': '·', '·': ' ', ':': ' ', '+': '·'}
    return table.get(ch, ch)


def render_frame(angle, frame, W, H):
    # Planet centre and radii (chars are ~2:1 h/w, so widen rx)
    cx = W // 2 - 4
    cy = H // 2
    ry = min(H // 2 - 4, 14)
    rx = ry * 2                    # correct for char aspect ratio

    buf  = [[' '] * W for _ in range(H)]
    clrs = [['']  * W for _ in range(H)]

    def put(row, col, ch, clr=''):
        if 0 <= row < H and 0 <= col < W:
            buf[row][col]  = ch
            clrs[row][col] = clr

    # ── Background dot-grid ──────────────────────────────────────────────────
    for r in range(H):
        for c in range(W):
            if (r * 3 + c) % 25 == 0:
                put(r, c, '·', C_DIM)

    # ── Planet body ─────────────────────────────────────────────────────────
    cos_a, sin_a = math.cos(angle), math.sin(angle)

    for row in range(H):
        ny = (row - cy) / ry
        for col in range(W):
            nx = (col - cx) / rx
            d2 = nx * nx + ny * ny
            if d2 > 1.04:
                continue

            if d2 > 1.0:
                # thin outer ring
                put(row, col, '◌', C_CYAN)
                continue

            nz   = math.sqrt(max(0.0, 1.0 - d2))
            dist = math.sqrt(d2)

            # rotate around Y-axis
            wx = nx * cos_a + nz * sin_a   # X after rotation
            wz = -nx * sin_a + nz * cos_a  # Z after rotation

            clr, ich, ech = layer_at(dist)
            sl_row = row

            if wx <= 0.0:
                # ── Interior cross-section (cut face) ───────────────────────
                ch = scanline_char(ich, sl_row)
                # bright edge where cut meets surface
                if abs(wx) < 0.06:
                    ch  = '│'
                    clr = C_WHITE
                put(row, col, ch, clr)
            else:
                # ── Exterior half: wireframe sphere ─────────────────────────
                lat   = math.asin(max(-1.0, min(1.0, ny)))
                lon   = math.atan2(wx, wz)
                n_lat = 6
                n_lon = 12
                wire  = False
                for i in range(n_lat + 1):
                    target = -math.pi / 2 + i * math.pi / n_lat
                    if abs(lat - target) < (math.pi / n_lat * 0.15):
                        wire = True; break
                if not wire:
                    lon_step = 2 * math.pi / n_lon
                    for i in range(n_lon):
                        target = -math.pi + i * lon_step
                        diff   = abs(((lon - target + math.pi) % (2 * math.pi)) - math.pi)
                        if diff < 0.12:
                            wire = True; break

                if wire:
                    ch = scanline_char('+', sl_row)
                    put(row, col, ch, C_GREEN)
                else:
                    # ghosted fill to give mass
                    if row % 3 != 0:
                        put(row, col, '·', C_DIM)

    # ── Axis rings (equatorial + polar) ─────────────────────────────────────
    for t_deg in range(0, 360, 3):
        t = math.radians(t_deg)
        # equatorial ring
        ec  = cx + int(rx * 1.12 * math.cos(t))
        er  = cy + int(ry * 0.18 * math.sin(t))
        put(er, ec, '─', C_GREEN)
        # polar ring (Y axis)
        pc  = cx + int(rx * 0.35 * math.cos(t + angle))
        pr  = cy + int(ry * 1.12 * math.sin(t))
        put(pr, pc, '│', C_GREEN)

    # ── Layer labels (right side) ────────────────────────────────────────────
    lx    = cx + rx + 4
    n     = len(LAYERS)
    start = cy - (n * 2) // 2
    for i, (_, clr, _, _, name, density, temp) in enumerate(LAYERS):
        lr = start + i * 2
        put(lr,   lx, '─', clr)
        put(lr,   lx + 1, '─', clr)
        put(lr,   lx + 2, '►', clr)
        for j, ch in enumerate(f' {name}'):
            put(lr, lx + 3 + j, ch, clr)
        info = f'  ρ={density}  T≈{temp}K'
        for j, ch in enumerate(info):
            put(lr + 1, lx + 4 + j, ch, C_DIM)

    # ── Telemetry panel (left side) ──────────────────────────────────────────
    deg     = math.degrees(angle) % 360
    depth   = abs(math.sin(angle)) * 6371
    anomaly = 'DETECTED' if random.random() > 0.93 else 'NOMINAL '
    anom_c  = C_RED if anomaly.strip() == 'DETECTED' else C_GREEN

    telemetry = [
        (C_CYAN,   '╔══ GEO SCAN SYSTEM ══╗'),
        (C_GREEN,  f'  SCAN #   {frame:>08d}  '),
        (C_GREEN,  f'  ROTATION {deg:>07.2f} °  '),
        (C_GREEN,  f'  DEPTH    {depth:>7.1f} km '),
        (C_YELLOW, f'  FREQ     14.700 GHz '),
        (C_YELLOW, f'  TEMP     5,200  K   '),
        (C_YELLOW, f'  PRESSURE 360.0  GPa '),
        (anom_c,   f'  ANOMALY  {anomaly}  '),
        (C_GREEN,  f'  CLOCK    {time.strftime("%H:%M:%S")}   '),
        (C_CYAN,   '╚═════════════════════╝'),
    ]
    for i, (clr, text) in enumerate(telemetry):
        r = 2 + i * 2
        for j, ch in enumerate(text):
            put(r, 1 + j, ch, clr)

    # ── Coordinate readout (top-right) ───────────────────────────────────────
    coords = [
        (C_PURPLE, '╔══ COORDINATES ══╗'),
        (C_PURPLE, f'  X {math.sin(angle)*6371:+09.2f} km'),
        (C_PURPLE, f'  Y {math.cos(angle)*3120:+09.2f} km'),
        (C_PURPLE, f'  Z {math.sin(angle*2)*1220:+09.2f} km'),
        (C_GREEN,  f'  LAT {math.degrees(math.sin(angle*0.5))*90:+07.2f} °'),
        (C_GREEN,  f'  LON {deg:07.2f} °'),
        (C_YELLOW, f'  ALT {abs(math.cos(angle*1.3))*400:07.1f} km'),
        (C_CYAN,   '╚══════════════════╝'),
    ]
    rx_panel = W - 22
    for i, (clr, text) in enumerate(coords):
        r = 2 + i * 2
        for j, ch in enumerate(text):
            put(r, rx_panel + j, ch, clr)

    # ── Title header ─────────────────────────────────────────────────────────
    title = '◄◄  PLANETARY GEOLOGICAL SURVEY SYSTEM  ▼  SUBSURFACE TOMOGRAPHIC SCAN  ►►'
    tx = max(0, W // 2 - len(title) // 2)
    for j, ch in enumerate(title):
        if tx + j < W:
            put(0, tx + j, ch, C_CYAN)

    # ── Status bar ───────────────────────────────────────────────────────────
    blink  = '▌' if frame % 8 < 4 else ' '
    status = f' {blink} SYS:OK {blink} CORE:ACTIVE {blink} LAYER-ANALYSIS:RUNNING {blink} FRAME:{frame:06d} {blink} '
    bx = max(0, W // 2 - len(status) // 2)
    for j, ch in enumerate(status):
        if bx + j < W:
            put(H - 1, bx + j, ch, C_GREEN)

    # ── Assemble output ───────────────────────────────────────────────────────
    out = CLEAR + BLACK_BG
    for r in range(H):
        row_str = ''
        prev_clr = None
        for c in range(W):
            clr = clrs[r][c]
            ch  = buf[r][c]
            if clr != prev_clr:
                row_str += (clr if clr else RESET)
                prev_clr = clr
            row_str += ch
        out += row_str + RESET + '\n'
    return out


# ── ASCII art title splash ───────────────────────────────────────────────────
def splash():
    if HAS_ART:
        title = text2art('PLANET SCAN', font='tarty1')
        if not title or title.strip() == 'PLANET SCAN':
            title = text2art('PLANET SCAN', font='block')
    else:
        title = '  PLANET SCAN\n'
    print(BLACK_BG + HIDE_CUR + C_GREEN + title + RESET)
    subtitle = text2art('INITIATING...', font='fancy1') if HAS_ART else 'INITIATING...'
    print(C_CYAN + subtitle + RESET)
    time.sleep(1.5)


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    try:
        ts = os.get_terminal_size()
        W, H = ts.columns, ts.lines - 1
    except OSError:
        W, H = 120, 38

    W = max(W, 80)
    H = max(H, 30)

    splash()

    angle  = 0.0
    frame  = 0
    t_per_frame = 0.045

    sys.stdout.write(HIDE_CUR)
    sys.stdout.flush()

    try:
        while True:
            t0  = time.time()
            out = render_frame(angle, frame, W, H)
            sys.stdout.write(out)
            sys.stdout.flush()

            angle += 0.04
            if angle >= 2 * math.pi:
                angle -= 2 * math.pi
            frame += 1

            elapsed = time.time() - t0
            sleep   = max(0.0, t_per_frame - elapsed)
            if sleep:
                time.sleep(sleep)

    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write(SHOW_CUR + RESET + '\n')
        sys.stdout.flush()
        print('Scan terminated.')


if __name__ == '__main__':
    main()
