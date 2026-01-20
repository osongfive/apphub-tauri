# 🚀 AppHub

**AppHub** is a modern, lightweight, and customizable desktop application launcher built with **Tauri** and **React**. It organizes your installed applications into a sleek, searchable library with custom categories and themes.

## 📥 Download & Install

You do not need to build the code to use AppHub. You can simply download the latest version for macOS.

1. Go to the **[Releases Page](https://www.google.com/search?q=https://github.com/YOUR_USERNAME/apphub-tauri/releases)**.
2. Download the `.dmg` file from the latest release assets.
3. Drag the app to your **Applications** folder.

### ⚠️ Important Note for macOS Users

Since this is an open-source app not signed by Apple, you might see a warning saying **"AppHub is damaged"** or **"cannot be opened because the developer cannot be verified."**

To fix this (you only need to do it once):

1. **Right-click** (or Control + Click) the AppHub icon in your Applications folder.
2. Select **Open** from the menu.
3. Click **Open** in the popup dialog.

---

## ✨ Features

* **⚡ Blazing Fast:** Built on Rust (Tauri), ensuring instant startup and low memory usage.
* **🎨 Dynamic Themes:** Choose from 4 built-in themes: *Cyber Blue, Sakura Pink, Forest Green, and Nebula Purple*.
* **📂 Custom Categories:** Right-click any app to edit its category (e.g., "Work", "Games", "Tools") for better organization.
* **🔍 Instant Search:** Filter through your apps in real-time.
* **🌗 Dark Mode:** A polished dark interface designed to reduce eye strain.

---

## 👨‍💻 For Developers (Build from Source)

If you want to contribute to the code or build it yourself, follow these steps.

### Prerequisites

* [Node.js](https://nodejs.org/)
* [Rust](https://www.rust-lang.org/tools/install)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/apphub-tauri.git
cd apphub-tauri

```

### 2. Install dependencies

```bash
npm install

```

### 3. Run Development Server

Starts the frontend and Tauri window with hot-reloading.

```bash
npm run tauri dev

```

### 4. Build for Production

Creates the optimized executable in `src-tauri/target/release/bundle`.

```bash
npm run tauri build

```

---

## 🛠️ Tech Stack

* **Core:** [Rust](https://www.rust-lang.org/) & [Tauri](https://tauri.app/)
* **Frontend:** [React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ using Tauri and React.*
