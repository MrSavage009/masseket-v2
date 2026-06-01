<div align="center">

# 🧶 Masseket v2

**Visual loop compiler & verifier with decidable equality**

Turn slow, nested Python tensor loops into verified, vectorized `einops` code — with a live thread loom diagram.

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.2.0-blue)](https://github.com/MrSavage009/masseket-v2/releases)

</div>

---

## The Problem

You write a slow, readable loop to make sure the math is correct:

```python
for n in range(N):
    for h in range(H):
        for w in range(W):
            for c in range(C):
                output[n, c, h, w] = input_tensor[n, h, w, c]
```

Then you spend **20 minutes** sketching dimensions on a notepad, fighting `.transpose().reshape().permute()` chains, and praying you don't hit:

```
RuntimeError: shape mismatch
```

---

## The Solution

**Masseket v2** does it in **one second**.

| Before | After |
|--------|-------|
| 6-line nested loop | `output = rearrange(input_tensor, 'n h w c -> n c h w')` |
| Manual dimension tracking | Verified by symbolic solver |
| Trial-and-error crashes | Mathematically guaranteed correct |

---

## ✨ Features

### 🖱️ Hover — Instant Preview
Mouse over any tensor loop. A compact SVG thread diagram pops up showing exactly how your dimensions weave together.

![Hover Demo](docs/hover.png)

### 💡 Lightbulb — One-Click Refactor
Click the yellow lightbulb → **"Replace loop with vectorized einops"**. The entire loop collapses to a single optimized line.

### 🧶 Full Loom Panel — Deep Inspection
Click the sparkle icon in your status bar (`$(sparkle) Masseket`) or run `Masseket: Visualize Tensor Loop` from the command palette.

![Panel Demo](docs/panel.png)

The full panel shows:
- ✅ **Verified badge** — green if the transformation is mathematically sound
- 🚀 **Speedup estimate** — predicted performance gain
- 🧵 **Large thread diagram** — full-size SVG with all weave crossings visible
- 💻 **Generated code** — the exact `einops` line ready to copy

### 🔴 Diagnostics — Catch Errors Before Runtime
Save your file. Masseket analyzes every loop and draws red/yellow squiggles under invalid transformations — before you ever run on GPU.

---

## 🚀 Quick Start

### Install

**From VSIX (now):**
1. Download [`masseket-v2-0.2.0.vsix`](https://github.com/MrSavage009/masseket-v2/releases/latest)
2. VS Code → Extensions → `...` → **Install from VSIX...**

**From Marketplace (soon):**
```
Search: "Masseket" in VS Code Extensions
```

### Configure Python Path

If `python3` is not found (common on Windows), set it in VS Code settings (`Ctrl+,`):

```json
{
    "masseket.pythonPath": "python"
}
```

Or use the full path:
```json
{
    "masseket.pythonPath": "C:\Users\you\AppData\Local\Programs\Python\Python311\python.exe"
}
```

### Try It

Create `test.py` and paste:

```python
# NHWC → NCHW (channels-last to channels-first)
for n in range(N):
    for h in range(H):
        for w in range(W):
            for c in range(C):
                output[n, c, h, w] = input_tensor[n, h, w, c]
```

- **Hover** over the loop → see thread diagram
- **Click** 💡 → replace with `rearrange(...)`
- **Save** → diagnostics validate correctness

---

## 🏗️ How It Works

```
┌─────────────────┐     spawn     ┌─────────────────────────────┐
│  VS Code (TS)   │ ◄───────────► │  Python Backend (AST)       │
│                 │    JSON-RPC   │  • Loop parser (ast)        │
│  • Hover        │               │  • SVG generator            │
│  • Code actions │               │  • Einops codegen           │
│  • Diagnostics  │               │  • Decidable verifier       │
│  • Webview panel│               │                             │
└─────────────────┘               └─────────────────────────────┘
```

**No models. No GPU. Pure symbolic math.**

### The Verification Engine

1. Parse loop AST → extract index mappings
2. Represent as **finite read-map** on tensor positions
3. Reduce to **canonical normal form**
4. Compare: if match → **verified** ✓

This guarantees the generated `einops` code is mathematically identical to your loop. No silent bugs. No shape mismatches.

---

## 📸 Screenshots

| Hover Tooltip | Full Loom Panel |
|:-------------:|:---------------:|
| ![Hover](docs/hover.png) | ![Panel](docs/panel.png) |
| Compact, instant, no scrolling | Full-size with code output |

---

## 🧪 Real-World Use Cases

| Pattern | Loop | Generated Code |
|---------|------|---------------|
| **NHWC → NCHW** | `output[n,c,h,w] = input[n,h,w,c]` | `rearrange(input, 'n h w c -> n c h w')` |
| **Transpose** | `output[h,w] = input[w,h]` | `rearrange(input, 'w h -> h w')` |
| **Flatten** | `output[b,(h w),c] = input[b,h,w,c]` | `rearrange(input, 'b h w c -> b (h w) c')` |
| **Unflatten** | `output[b,h,w,c] = input[b,(h w),c]` | `rearrange(input, 'b (h w) c -> b h w c')` |

---

## 📦 Build from Source

```bash
git clone https://github.com/MrSavage009/masseket-v2.git
cd masseket-v2
npm install
npm run compile
# F5 in VS Code to debug
vsce package    # builds .vsix
```

---

## 🗺️ Roadmap

- [x] Hover tooltip with compact SVG
- [x] Full webview panel
- [x] Code action (lightbulb refactor)
- [x] Diagnostics on save
- [ ] Split/merge axes (`(h w)` notation)
- [ ] Reduction loops (`sum`, `mean`, `max`)
- [ ] `einsum` codegen
- [ ] GitHub Copilot shield (verify AI suggestions)
- [ ] PyPI package for Jupyter/Colab

---

## 🤝 Contributing

PRs welcome. Open an issue for bugs or feature requests.

---

## 📄 License

[MIT](LICENSE) © 2026 MrSavage009

---

<div align="center">

*"Masseket" (מַסֶּכֶת) — Biblical Hebrew for "warp/web of a loom."*

*Tensor dimensions as woven threads.*

</div>
