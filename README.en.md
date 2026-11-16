# Kids Timer — Visual Countdown

[繁體中文](./README.md) | **English**

A visual countdown timer (PWA) designed for children. Using a shrinking color wedge on a clock face, it helps kids intuitively understand the passage of time. Supports installing as an offline standalone app on both iPhone (Safari) and Android (Chrome).

🔗 **Live Demo**: https://tomroy.github.io/kids-timer/

---

## ✨ Features

- **Three Clock Modes**
  - 🔵 **Blue Clock**: Up to 15 minutes (15-second minor ticks), great for brushing teeth, cleaning up toys, or getting ready to go out.
  - 🔴 **Red Clock**: Up to 60 minutes, ideal for homework, reading, or mealtime.
  - 🎨 **Custom Clock**: Customize the maximum duration (1 – 180 minutes) and choose from 6 color themes (Sky Blue, Bright Red, Forest Green, Sunny Orange, Dreamy Purple, Peach Pink).
- **Intuitive Touch Dial & Elapsed Time Shading**
  - Tap or drag the dial handle to set time, or use `-1m`, `+1m`, and `+5m` quick-adjust buttons.
  - During countdown, a lighter tinted wedge remains behind the shrinking sector to show the originally set total duration at a glance.
- **Task Presets & Long-Press Reordering**
  - Includes built-in daily tasks (`🚀 Go Out` 15m default, `🧸 Clean Up Toys`, `🪥 Brush Teeth`, `📚 Reading`, `✏️ Homework`, `🍽️ Mealtime`, `🎮 Playtime`, `🛁 Bath Time`, `🛏️ Bedtime`).
  - **Long-press any task chip** to drag and reorder tasks horizontally; order is automatically saved.
  - Supports **➕ Add Task** with custom icons, names, and default durations.
- **Bilingual UI (English / Traditional Chinese)**
  - Automatically detects browser locale (defaults to English if unsupported) and lets you manually switch languages in Settings.
- **Offline Audio Alarms & Confetti Celebration**
  - 4 built-in Web Audio synthesized sounds (Xylophone, Chime, Harp, Classic Beep) that work completely offline.
  - Displays a confetti celebration when time is up, with **Done** and **+2 Min** options.
- **Parent-Friendly Controls**
  - 🔒 **Child Lock**: Tap to lock controls against accidental touches; press and hold for 1.2s to unlock.
  - 🔊 **Tick Sound Toggle** and final 1-minute pulsing reminder.
  - 📱 **Screen Wake Lock**: Keeps the screen awake while counting down.

---

## 📲 Install on Mobile (PWA)

- **iPhone (Safari)**: Open the URL, tap the **Share** button ➔ **Add to Home Screen**.
- **Android (Chrome)**: Open the URL, tap the **⋮** menu ➔ **Add to Home screen** ➔ **Install**.

---

## 📁 Project Structure

- `index.html`: Main layout, settings modal, task modal, and alarm overlay
- `styles.css`: Responsive styles and animations
- `app.js`: Timer core, SVG sector rendering, drag-and-drop task reordering, i18n, Web Audio synthesizer, and localStorage persistence
- `manifest.json` / `sw.js` / `icon*.png` / `icon.svg`: PWA manifest, offline Service Worker, and app icons
