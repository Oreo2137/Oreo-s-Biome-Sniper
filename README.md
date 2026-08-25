<div align="center">

<img src="sniper.png" width="120" alt="Oreo's Biome Sniper">

# Oreo's Biome Sniper

**Fast, lightweight biome sniper for Sol's RNG on Roblox**

[![Version](https://img.shields.io/badge/version-v8.18-cc785c?style=flat-square)](../../releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square&logo=windows)](../../releases)
[![Python](https://img.shields.io/badge/python-3.10+-yellow?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red?style=flat-square)](#license)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/W9yVcZufkE)
[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/oreo2137)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-003087?style=flat-square&logo=paypal)](https://paypal.me/Oreo2137)

> This sniper is in active development — bugs are expected. Report them in the Discord server.

</div>

---

## Screenshots

<div align="center">

<img src="https://raw.githubusercontent.com/Oreo2137/Oreo-s-Biome-Sniper/main/main.png" width="800" alt="Main tab">
<br><br>
<img src="https://raw.githubusercontent.com/Oreo2137/Oreo-s-Biome-Sniper/main/biomes.png" width="800" alt="Biomes tab">
<br><br>
<img src="https://raw.githubusercontent.com/Oreo2137/Oreo-s-Biome-Sniper/main/stats.png" width="800" alt="Stats tab">

</div>

---

## Features

- Instant biome detection via Discord gateway
- Automatic Roblox join via native `roblox://` deeplink
- Priority gate — higher tier wins, drag chips to reorder within the same tier
- Biome verification via roblox logs detects bait automatically
- Lock screen after each snipe with auto-unlock timer
- Automatic update notifications
- Multi webhook support
- Snipe history with reaction time and join latency columns
- Custome biome creation and support 
- Per-biome keywords, custom biomes, keyword blacklist
- Roblox watchdog (auto-relaunches if Roblox closes)
- Autostart timer and idle start reminder
- Quick Settings with pinnable toggles
- Native Windows notifications
- Custom snipe sound (WAV, MP3, OGG) with per-biome support
- Single `.exe` — no Python install needed for end users

---

## Download

Go to [**Releases**](../../releases) and download the latest `Oreo's Biome Sniper.exe`.

Place `sniper.png` in the same folder as the `.exe` to show the app icon in notifications.

---

## Quick Start

1. Paste your **Discord token** in the Main tab
2. Add a **Discord server ID** and click **Fetch**
3. Select the **channels** you want to monitor
4. Enable the **biomes** you want to snipe in the Biomes tab
5. Press **START**

> It is recommended to be in the **Roblox main menu** (not inside a game) for the fastest join times. If you have a fast PC you can try staying in a game, but the sniper may be slightly slower.

---

## Building from Source

**Requirements:**
```
pip install pywebview requests websockets winotify pygame keyboard pyinstaller
```

**Build:**
```
build.bat
```

Output: `dist/Oreo's Biome Sniper.exe`

---

## Biome Priority

When two biomes are detected at the same moment, the sniper picks the highest-tier one. Within the same tier, the **leftmost chip** wins — drag to reorder.

| Tier | Biomes |
|------|--------|
| ⭐ Rare (2) | Glitch, Cyberspace, Dreamspace |
| ◆ Uncommon (1) | Singularity |
| ● Common (0) | Corruption, Rainy, Null, Windy, Snowy, Hell, Heaven, Sandstorm, Starfall |
| ○ Misc (-1) | Rin, VoidCoin, Jester, Oblivion |

Misc-tier biomes do not trigger the lock screen by default.

---

## Hotkeys

| Key | Action |
|-----|--------|
| `F1` | Start / Stop |
| `F2` | Stop |
| `F3` | Unlock |
| `F4` | Pause |

Hotkeys can be rebound in Settings.

---

## License

© 2026 Oreo2137. All rights reserved.

You may use this software for personal, non-commercial purposes.
Redistribution, modification, or reselling is not permitted without explicit written permission from the author.

---

## Support

<div align="center">

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/W9yVcZufkE)
[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/oreo2137)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-003087?style=for-the-badge&logo=paypal)](https://paypal.me/Oreo2137)

*Made by Oreo2137*

</div>
