# LAMA Cube (Electron App)

This `GEMINI.md` provides context and instructions for working with the **LAMA Cube** project, a Local AI Messaging App built with Electron, React, and the ONE.CORE decentralized stack.

## 1. Project Overview

**LAMA (Local AI Messaging App)** is a secure, decentralized messaging platform that integrates AI assistants directly into conversations. It uses a **Hybrid Architecture** where the Electron Main process and Renderer process run separate ONE.CORE instances, synchronizing via a local WebSocket federation.

### Core Technologies
*   **Runtime**: [Electron](https://www.electronjs.org/)
*   **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **UI Library**: [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
*   **Backend (Main Process)**: Node.js with [ONE.CORE](https://github.com/refinio/one.core) (Decentralized Graph Data)
*   **AI**: Integration with Ollama, LM Studio, Anthropic (Claude), OpenAI, and [MCP](https://modelcontextprotocol.io/) (Model Context Protocol).

### Architectural Key Points
*   **Hybrid Users**: The Node.js process runs a "Node User" (Full Archive), and the Browser window runs a "Browser User" (Sparse Storage). They are *distinct identities*.
*   **Federation**: Data syncs between Node and Browser via local WebSocket (`ws://localhost:8765`) using the **CHUM** protocol.
*   **Internet of Me (IoM)**: The Node process manages connections to external devices (phones, other computers) but *not* the internal Browser-Node link.
*   **AI as Contacts**: AI models are treated as "Persons" in the ONE.CORE graph, allowing them to participate in chats naturally.

## 2. Directory Structure

*   **`/electron-ui/`**: The React Frontend application.
    *   `src/components/`: React components (ChatView, Settings, etc.).
    *   `src/models/`: Frontend data models (AppModel, AI integration).
*   **`/main/`**: The Node.js Backend logic.
    *   `core/`: Core ONE.CORE integration (`node-one-core.js`, `ai-assistant-model.js`).
    *   `services/`: Services like `llm-manager.js` (AI provider handling).
    *   `ipc/`: IPC Controllers for orchestration (commands, not data sync).
    *   `workers/`: Dedicated workers for LLM inference, Crypto, and Sync.
*   **`/adapters/`**: Platform-specific adapters.
*   **`/dist/`**: Build artifacts.

## 3. Development Workflow

### Prerequisites
*   Node.js v18+
*   npm or yarn

### Running in Development
Development requires two terminal processes:

1.  **Start the UI Server (Vite):**
    ```bash
    cd electron-ui
    npm run dev
    ```
    *Waits for localhost:5173 to be ready.*

2.  **Launch Electron (Main Process):**
    ```bash
    # From the project root
    npm run electron
    ```

### Building
*   **Build All**: `npm run build:all` (Compiles Main TS and Frontend Vite).
*   **Build UI Only**: `npm run build:ui` (runs inside `electron-ui`).
*   **Build Main Only**: `npm run build:main`.

### Packaging (Distribution)
*   **Windows**: `npm run dist:win` (NSIS + Portable).
*   **macOS**: `npm run dist:mac` (DMG).
*   **Linux**: `npm run dist:linux` (AppImage + Deb).

## 4. Testing & Quality

*   **Unit/Integration Tests**:
    *   Frontend: `cd electron-ui && npm run test` (Jest).
    *   Backend: Custom test scripts in `test/` and `tests/` (e.g., `test-ai-chat.js`, `test-federation.js`).
*   **Linting**: `cd electron-ui && npm run lint`.
*   **Type Checking**: `npm run typecheck`.

## 5. Common Tasks & Patterns

### Adding an IPC Handler
IPC is for **orchestration only** (e.g., "Reset App", "Open Window"), not data sync.
1.  Define handler in `main/ipc/handlers/`.
2.  Register in `main/ipc/controller.js`.
3.  Expose via `preload.js` (if strictly necessary, but prefer minimal surface).
4.  Consume via `window.electron` in React.

### Modifying AI Logic
*   **Prompt Engineering/Tools**: Check `main/services/llm-manager.js`.
*   **Conversation Flow**: Check `main/core/ai-assistant-model.js`.
*   **MCP Tools**: Registered in `main/services/mcp-manager.js` (or similar).

### Debugging
*   **Main Process**: Console logs appear in the terminal where you ran `npm run electron`.
*   **Renderer Process**: Use the Chrome DevTools (Cmd+Opt+I / Ctrl+Shift+I) in the Electron window.
*   **Data Sync**: Check the "Data Dashboard" in the app UI for CHUM protocol status.

## 6. Important Files

*   `package.json`: Root scripts and dependencies.
*   `electron-ui/package.json`: Frontend dependencies.
*   `README.md`: Detailed project status and features.
*   `ARCHITECTURE.md`: Deep dive into the Hybrid/OneCore architecture.
*   `lama-electron-shadcn.ts`: Main process entry point.
