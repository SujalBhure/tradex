# TradeX — Crypto & Derivatives Trading Journal & Live Auto-Logger

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-blueviolet.svg)](https://capacitorjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-emerald.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**TradeX** is an intelligent, high-performance crypto and derivatives trading journal application built for active futures and options traders. It features millisecond-level real-time auto-logging via Delta Exchange India WebSockets, accurate multi-exit P&L reconstruction, Zero-Knowledge End-to-End Encrypted (E2EE) credential storage, and seamless cross-device synchronization between Web and Native Android.

---

## 📱 Download Android APK & Live Web App

| Platform | Access Link | Description |
| :--- | :--- | :--- |
| **Android App (APK)** | [📥 **Download TradeX.apk (v1.0.0)**](https://github.com/SujalBhure/tradex/releases/download/v1.0.0/TradeX.apk) | Direct installable APK for Android phones and tablets |
| **Live Web App** | [🌐 **tradex-journall.netlify.app**](https://tradex-journall.netlify.app) | Live production web application |

---

## ⚡ Core Features

- **⚡ Instant Delta Exchange India Auto-Logging**:
  - Connects to `wss://socket.india.delta.exchange` for sub-second trade fill and position detection.
  - Automatically synchronizes server clock drift (<5s replay tolerance) using Delta's atomic HTTP timestamp.
  - Subscribes to `orders`, `fills`, `positions`, and `margins` private channels with authenticated HMAC-SHA256 signatures.
  - Auto-logs entries, stops, profit targets, partial exits, and full exits without manual input.
  - Tab and native app focus listeners (`visibilitychange`, `window.focus`, `appStateChange`) immediately sync trades upon returning to TradeX.

- **📊 Advanced Trading Analytics & Journaling**:
  - Real-time Win Rate, Profit Factor, Expectancy, Max Drawdown, and Streak tracking.
  - Exact contract lot-size multiplier engine (`XAUTUSD` = 0.001, `BTCUSD`, `ETHUSD`, etc.).
  - Chronological trade group linking with parent/child partial-exit tree visualization.
  - Multi-deposit cumulative trading capital tracking and balance ledger.

- **🔒 Zero-Knowledge Device-Local Encryption (E2EE)**:
  - Delta Exchange API keys and secrets are encrypted client-side using Web Crypto **AES-GCM-256**.
  - Plaintext secrets are never stored unencrypted in local storage or transmitted across networks.
  - Deterministic UUID mapping for secure Supabase cloud storage with strict Row Level Security (RLS).

- **📱 True Native Mobile Experience (Capacitor Android)**:
  - Full-screen native UI with adaptive status bar, splash screen, and smooth hardware-accelerated animations.
  - Works completely offline with automatic sync upon reconnection.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Mobile Engine:** Capacitor 8 (Android)
- **Backend / Database:** Supabase (PostgreSQL with Row Level Security)
- **Security:** Web Crypto API (AES-GCM-256, PBKDF2)
- **Exchange Integration:** Delta Exchange India REST API v2 & WebSocket API

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Android Studio & Android SDK (optional, for compiling Android APK)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SujalBhure/tradex.git
   cd tradex
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```

5. **Run the Automated Test Suite:**
   ```bash
   node tests/tradex_audit.test.cjs
   ```

---

## 📱 Building the Android APK

1. **Build web production bundle and sync Capacitor:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Assemble the Debug APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   cd ..
   ```
   The generated APK will be at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
