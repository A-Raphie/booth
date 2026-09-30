"""Generate showcase overlay art: chrome bar, HUD pills, terminal scene, outro."""
from PIL import Image, ImageDraw, ImageFont

W, CHROME_H = 1920, 78
F = lambda name, s: ImageFont.truetype(f"/System/Library/Fonts/Supplemental/{name}", s)
mono_f = F("Courier New Bold.ttf", 19)
mono_sm = F("Courier New.ttf", 15)
mono_lg = F("Courier New.ttf", 19)
ui_sm = F("Arial.ttf", 14)
ui_f = F("Arial.ttf", 17)

INK = (30, 31, 34); TAB = (43, 45, 48); LIGHT = (227, 227, 227); DIM = (154, 160, 166)


def chrome_bar(route: str) -> Image.Image:
    img = Image.new("RGBA", (W, CHROME_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 38], fill=INK + (255,))
    d.rectangle([0, 38, W, CHROME_H], fill=TAB + (255,))
    d.line([0, CHROME_H - 1, W, CHROME_H - 1], fill=(255, 255, 255, 14), width=1)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([18 + i * 24, 13, 30 + i * 24, 25], fill=c + (255,))
    d.rounded_rectangle([96, 6, 506, 32], 8, fill=TAB + (255,), outline=(255, 255, 255, 18))
    try:
        fav = Image.open("public/icon-192.png").resize((16, 16))
        img.paste(fav, (110, 11), fav)
    except Exception:
        pass
    d.text((134, 11), "Booth — the director is listening", font=ui_sm, fill=LIGHT + (255,))
    d.text((482, 14), "✕", font=ui_sm, fill=DIM + (255,))
    d.text((512, 14), "+", font=ui_f, fill=DIM + (255,))
    # toolbar: nav buttons + wide omnibox + avatar
    d.text((24, 46), "‹", font=F("Arial.ttf", 26), fill=LIGHT + (255,))
    d.text((62, 46), "›", font=F("Arial.ttf", 26), fill=(94, 97, 102, 255))
    d.text((98, 48), "↻", font=F("Arial.ttf", 20), fill=LIGHT + (255,))
    d.rounded_rectangle([150, 44, 1770, 72], 14, fill=INK + (255,), outline=(255, 255, 255, 16))
    d.text((168, 52), "https://", font=mono_sm, fill=DIM + (255,))
    d.text((238, 51), "booth-voice.netlify.app", font=mono_f, fill=(244, 244, 245, 255))
    x = 238 + int(mono_f.getlength("booth-voice.netlify.app"))
    d.text((x, 52), route, font=mono_sm, fill=(161, 161, 170, 255))
    d.ellipse([1848, 48, 1870, 70], fill=(63, 63, 70, 255))
    d.text((1852, 51), "R", font=ui_sm, fill=(228, 228, 231, 255))
    return img


def hud(pill_text, card_title, card_stat, pill_color=(52, 211, 153)) -> Image.Image:
    img = Image.new("RGBA", (W, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pw = int(mono_f.getlength(pill_text)) + 64
    d.rounded_rectangle([36, 1080 - 74, 36 + pw, 1080 - 36], 19, fill=(24, 24, 27, 224), outline=(255, 255, 255, 40))
    d.ellipse([58, 1080 - 55, 66, 1080 - 47], fill=pill_color + (255,))
    d.text((80, 1080 - 63), pill_text, font=mono_f, fill=pill_color + (255,))
    cw = max(int(mono_f.getlength(card_stat)), int(mono_sm.getlength(card_title.upper()))) + 56
    d.rounded_rectangle([W - 36 - cw, 1080 - 114, W - 36, 1080 - 36], 12, fill=(18, 18, 20, 235), outline=(255, 255, 255, 40))
    d.text((W - 36 - cw + 24, 1080 - 100), card_title.upper(), font=mono_sm, fill=(161, 161, 170, 255))
    d.text((W - 36 - cw + 24, 1080 - 74), card_stat, font=mono_f, fill=(244, 244, 245, 255))
    return img


chrome_bar("/").save("overlays/chrome-root.png")
chrome_bar("/booth").save("overlays/chrome-booth.png")
hud("45 min · lost per video, today", "The take loop", "Read · Flub · Scrub").save("overlays/hud-1.png")
hud("Real judge pipeline · live on screen", "Flubs caught", "Lines 03 + 07 · 97% confident").save("overlays/hud-2.png")
hud("Live Voice Agent API · real session", "The director cuts", "call_retake · spoken live", pill_color=(136, 123, 221)).save("overlays/hud-3.png")
hud("Wrap the session · print the master", "Master WAV", "Best read per line · in browser").save("overlays/hud-4.png")

# terminal scene
timg = Image.new("RGB", (W, 1080), (9, 9, 11))
td = ImageDraw.Draw(timg)
for y in range(1080):
    v = int(9 + 9 * max(0, 1 - abs(y - 430) / 700))
    td.line([(0, y), (W, y)], fill=(v, v, v + 2))
frame = Image.new("RGBA", (1480, 700), (0, 0, 0, 0))
fd = ImageDraw.Draw(frame)
fd.rounded_rectangle([0, 0, 1480, 700], 12, fill=(24, 24, 27, 255), outline=(255, 255, 255, 36))
fd.rounded_rectangle([0, 0, 1480, 42], 12, fill=(31, 31, 35, 255))
fd.rectangle([0, 30, 1480, 42], fill=(31, 31, 35, 255))
fd.line([0, 42, 1480, 42], fill=(255, 255, 255, 20))
for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
    fd.ellipse([20 + i * 24, 15, 32 + i * 24, 27], fill=c + (255,))
timg.paste(frame, (220, 180), frame)

d = ImageDraw.Draw(timg)
d.text((440, 190), "booth — live session — agents.assemblyai.com — zsh", font=mono_sm, fill=DIM)
y = 246
for line in open("media/live-session-log.txt").read().split("\n"):
    color = (161, 161, 170)
    if "ALBA" in line:
        color = (103, 173, 130)
    if "tool.call" in line:
        color = (136, 123, 221)
    if line.strip().startswith("$") or "→" in line:
        color = (227, 227, 227)
    d.text((260, y), line[:118], font=mono_lg, fill=color)
    # real captured agent lines can arrive split; mark non-terminal ends so
    # verbatim data doesn't read as a rendering truncation
    if ("ALBA" in line or "transcript" in line) and not line.rstrip().endswith((".", "!", "?", "…", '"')):
        ox = 260 + int(mono_lg.getlength(line[:118]))
        d.text((ox + 8, y), "…", font=mono_lg, fill=color)
    y += 34
d.text((260, y + 16), "talent voice: synthesized bad take · disclosed on camera", font=mono_sm, fill=(110, 112, 118))
timg.save("overlays/terminal-scene.png")

# outro card
o = Image.new("RGB", (W, 1080), (10, 10, 8))
od = ImageDraw.Draw(o)
od.rectangle([28, 28, W - 28, 1080 - 28], outline=(227, 223, 205), width=2)
od.text((120, 300), "Booth", font=F("Arial Bold.ttf", 150), fill=(245, 243, 235))
od.text((124, 500), "The director is listening.", font=F("Arial.ttf", 44), fill=(227, 223, 205))
od.text((124, 620), "booth-voice.netlify.app", font=F("Courier New.ttf", 30), fill=(136, 123, 221))
od.text((124, 672), "github.com/A-Raphie/booth", font=F("Courier New.ttf", 30), fill=(136, 123, 221))
od.text((124, 790), "BUILT ON THE ASSEMBLYAI VOICE AGENT API", font=F("Courier New.ttf", 24), fill=(128, 131, 141))
od.text((124, 838), "demo voice synthesized · bring yours", font=F("Courier New.ttf", 24), fill=(199, 195, 178))
o.save("overlays/outro.png")
print("overlays written")
