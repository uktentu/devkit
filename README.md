
# DevKit

A unified, modern web application gathering essential developer utilities into a single, offline-first interface. Built with **React 19**, **TypeScript**, and **Tailwind CSS**.

## 🚀 Features

This application includes a suite of tools designed to streamline daily development tasks:

### 1. JSON Comparator
- **Side-by-side Diff**: Visual comparison of two JSON objects.
- **Smart Highlighting**: Color-coded differences for added, removed, and modified keys.
- **Collapsible/Expandable**: Navigate deeply nested structures easily.
- **Line Numbers**: Code-editor style view for precise debugging.

### 2. JSON Formatter
- **Prettify**: Format minified JSON with proper indentation.
- **Minify**: Compress JSON for storage or transmission.
- **Validation**: Instant syntax error detection.

### 3. Date & Timestamp Converter
- **Two-way Conversion**: Convert between Unix timestamps (ms/sec) and Human-readable dates.
- **ISO 8601 Support**: Parse and format standard date strings.
- **Local/UTC**: View times in both local and coordinated universal time.

### 4. Base64 Utilities
- **Encoder/Decoder**: Convert text to Base64 and vice versa.
- **Live Preview**: See results instantly as you type.

### 5. Developer Tools Suite
- **Regex Tester**: Test regular expressions against text with live highlighting and capture group support.
- **Case Converter**: Convert text between `camelCase`, `snake_case`, `kebab-case`, `UPPERCASE`, etc.
- **Markdown Preview**: Real-time markdown rendering buffer.

### 6. XML & YAML Tools
- **Converters**: Transform XML to JSON and vice versa.
- **Structure View**: Clean validation and formatting for config files.

### 7. Mongo ↔ SQL Converter
- **Query Translation**: Convert MongoDB `find` queries to SQL `SELECT` statements.
- **Chain Support**: Handles `sort()`, `limit()`, `skip()`, and basic `aggregate()` pipelines.
- **SQL to Mongo**: Experimental support for converting simple SQL queries back to Mongo syntax.

### 8. About & Games
- **Developer Profile**: Interactive profile page.
- **Bug Runner**: An infinite runner game to relax (floating button on About page).
- **Easter Eggs**: There are secrets hidden in the app... 🕵️‍♂️

### 9. Feedback
- **Simple Form**: Submit bug reports, feature requests, or general feedback.
- **Direct Mail**: Generates a pre-filled email to the developer.

---

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Effects**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## 📦 Installation & Usage

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jsoncomp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view the app.

4. **Build for production**
   ```bash
   npm run build
   ```

---

## 🤫 Top Secret Clearance

**Classified Information:**
- The application is protected against casual inspection (DevTools disabled).
- **Konami Code Protocol**: Entering `↑ ↑ ↓ ↓ ← → ← → B A` on your keyboard will unlock the hidden **"Secret Snake"** mission.
- **Party Mode**: Clicking the **DevKit Logo** in the header 5 times rapidly will trigger a celebration.

---

**Developed by Uday Kiran Tentu**
