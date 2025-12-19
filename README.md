
# FableForge AI

FableForge AI is an advanced AI-powered storytelling studio. It leverages the latest Google Gemini models to generate creative stories, visualize them with AI art (or user uploads), narrate them with natural voices, and export complete audiovisual experiences.

## 🚀 Features

### 📝 Creative Storytelling
*   **Multi-Model Support:** Choose between speed (`Gemini 2.5 Flash`) or high intelligence (`Gemini 3 Pro`, `Gemini 2.5 Pro`).
*   **Bilingual:** Native support for **Vietnamese** and **English** story generation.
*   **Customization:** Configure Genre, Tone, Length, and specific story ideas.

### 🎨 Flexible Visuals
*   **AI Generation:** Create cinematic book covers using `Gemini 2.5 Flash Image` or `Gemini 3 Pro Image`.
*   **User Uploads:** Upload your own images to use in the story video.

### 🎙️ Natural Narration (TTS)
*   **Long-form Audio:** Support for up to **10,000 characters** per generation.
*   **Diverse Voices:** Choose from 5 distinct AI voices (Puck, Charon, Kore, Fenrir, Zephyr).
*   **Downloadable:** Export raw audio as `.wav` files.

### 🎬 Video Production
*   **Node.js Rendering Server:** Uses a robust backend server to render videos efficiently using **FFmpeg**.
*   **Social Export:** Render final videos in vertical format (9:16) with:
    *   Synced Audio
    *   **Automatic Subtitles** (with timing calculation)
*   **Downloadable:** Export final videos as `.mp4`.

## 🛠 Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **FFmpeg**: Must be installed on your system and added to your `PATH`.
    *   **Windows**: [Download](https://ffmpeg.org/download.html), extract, and add `bin` folder to environment variables.
    *   **Mac**: `brew install ffmpeg`
    *   **Linux**: `sudo apt install ffmpeg`

## 📦 Setup & Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/fableforge-ai.git
    cd fableforge-ai
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure API Key**:
    Get your key from [Google AI Studio](https://aistudio.google.com/).
    
    *Quick Start:* Open `index.html` and paste your API key into the `window.process` script.

4.  **Run the application**:
    This command starts both the **Web Client** (Vite) and the **Render Server** (Node.js) concurrently.
    ```bash
    npm run dev
    ```

5.  **Open in Browser**:
    Navigate to the local URL (usually `http://localhost:5173`).

## ⚙️ Configuration

You can customize the application settings, available models, and pricing estimates in `settings.ts`.

## ⚠️ Important Notes

*   **FFmpeg Required:** The video rendering feature relies on the `server.js` backend, which executes `ffmpeg` command on your machine. If video rendering fails, verify FFmpeg is installed correctly.
*   **API Costs:** While many "Preview" models are free within limits, "Pro" models may incur costs.
*   **Local Storage:** Projects are stored in your browser's `localStorage`.

## 📄 License

This project is open-source and available under the MIT License.
