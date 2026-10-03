#!/usr/bin/env python3
"""Tạo giọng nói tiếng Việt cho mọi câu thoại (giọng máy espeak-ng, miền Nam), mỗi nhân vật một giọng.
Chạy:  python3 tools/voice/gen.py      (cần: pip install espeakng-loader, ffmpeg)
Kết quả: public/voice/<mã>.mp3 và src/data/voiceClips.ts (danh sách mã).
Mã = FNV-1a 32 bit của "<id nhân vật>|<câu>" — src/core/Voice.ts tính y hệt."""
import ctypes, json, os, re, subprocess, sys
import espeakng_loader as L

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "voice")

# (biến thể giọng, cao độ 0–99, tốc độ từ/phút)
VOICES = {
    "player": ("m2", 52, 150), "chutu": ("m7", 28, 128), "coba": ("f2", 52, 140), "mai": ("f3", 66, 152),
    "lan": ("f4", 78, 158), "nam": ("m1", 74, 158), "minh": ("m2", 48, 172), "hoang": ("m3", 40, 148),
    "kh_vp1": ("m3", 42, 152), "kh_vp2": ("f2", 60, 152), "kh_hs1": ("m1", 76, 160), "kh_hs2": ("f4", 82, 160),
    "kh_ship1": ("m2", 46, 172), "kh_ship2": ("m4", 54, 172), "kh_dl1": ("f3", 62, 146), "kh_dl2": ("m7", 32, 134), "kh_dl3": ("f1", 55, 138),
}
STUDENTS = {"kh_hs1", "kh_hs2"}

def key(vid, text):
    h = 0x811C9DC5
    data = (vid + "|" + text).encode("utf-16-le")
    for i in range(0, len(data), 2):
        h ^= data[i] | (data[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "08x")

def lines():
    out = []
    src = open(os.path.join(ROOT, "src/data/dialogues.ts"), encoding="utf-8").read().split("\n")
    cur = None
    bye = None
    for ln in src:
        m = re.match(r"function (\w+)\(", ln)
        if m: cur = {"chuTu": "chutu", "coBa": "coba", "mai": "mai"}.get(m.group(1), None)
        m = re.match(r'\s*(\w+): \[(.*)\],?\s*$', ln)
        strs = re.findall(r'"((?:[^"\\]|\\.)*)"', ln)
        if m and m.group(1) in VOICES:
            out += [(m.group(1), s) for s in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(2))]
        elif 'who: "npc"' in ln and cur:
            out += [(cur, s) for s in strs if " " in s and len(s) > 6]
        elif 'who: "me"' in ln:
            out += [("player", s) for s in strs if " " in s and len(s) > 6]
    out.append(("coba", "Chào con, hôm nay bán đắt nghen!"))
    items = open(os.path.join(ROOT, "src/data/items.ts"), encoding="utf-8").read()
    recipes = re.findall(r'\{ id: "\w+", name: "([^"]+)", price:', items)
    for vid in VOICES:
        if vid.startswith("kh_"):
            for r in recipes:
                out.append((vid, f"Cho {'em' if vid in STUDENTS else 'tôi'} một ly {r} nha!"))
    seen, res = set(), []
    for v, t in out:
        if (v, t) not in seen: seen.add((v, t)); res.append((v, t))
    return res

lib = ctypes.CDLL(L.get_library_path())
buf = bytearray()
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
def _cb(wav, n, ev):
    if wav and n > 0: buf.extend(ctypes.string_at(wav, n * 2))
    return 0
cb = CB(_cb)
RATE = lib.espeak_Initialize(1, 0, L.get_data_path().encode(), 0)  # 1 = AUDIO_OUTPUT_SYNCHRONOUS? (retrieval)
lib.espeak_SetSynthCallback(cb)

def synth(vid, text, path):
    var, pitch, rate = VOICES[vid]
    assert lib.espeak_SetVoiceByName(f"vi-vn-x-south+{var}".encode()) == 0, vid
    lib.espeak_SetParameter(1, rate, 0)   # tốc độ
    lib.espeak_SetParameter(3, pitch, 0)  # cao độ
    lib.espeak_SetParameter(4, 55, 0)     # độ lên xuống
    buf.clear()
    t = text.encode("utf-8")
    lib.espeak_Synth(t, len(t) + 1, 0, 0, 0, 1, None, None)  # 1 = UTF-8
    lib.espeak_Synchronize()
    assert len(buf) > 4000, (vid, text)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                    "-af", "highpass=f=70,lowpass=f=7500,loudnorm=I=-18:TP=-2,afade=t=in:d=0.01",
                    "-ar", "22050", "-c:a", "libmp3lame", "-b:a", "40k", path], input=bytes(buf), check=True)
    return len(buf) / 2 / RATE

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    all_lines = lines()
    keys = {}
    for vid, text in all_lines:
        k = key(vid, text)
        assert k not in keys, "trùng mã"
        keys[k] = round(synth(vid, text, os.path.join(OUT, k + ".mp3")), 2)
    for f in os.listdir(OUT):
        if f.endswith(".mp3") and f[:-4] not in keys: os.remove(os.path.join(OUT, f))
    with open(os.path.join(ROOT, "src/data/voiceClips.ts"), "w") as f:
        f.write("// Tự sinh bởi tools/voice/gen.py — không sửa tay. Mã câu thoại → độ dài (giây).\nexport const VOICE_CLIPS: Record<string, number> = " + json.dumps(keys, separators=(",", ":")) + ";\n")
    print(len(keys), "câu;", round(sum(keys.values())), "giây;", sum(os.path.getsize(os.path.join(OUT, k + ".mp3")) for k in keys) // 1024, "KB")
    if "-v" in sys.argv:
        for v, t in all_lines: print(v, "|", t)
