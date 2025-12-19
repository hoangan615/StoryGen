
# FableForge AI

FableForge AI is an advanced AI-powered storytelling studio. It leverages the latest Google Gemini models to generate creative stories, visualize them with AI art (or user uploads), narrate them with natural voices, and export complete audiovisual experiences for social media.

## 🚀 Features

### 📝 Creative Storytelling
*   **Multi-Model Support:** Choose between speed (`Gemini 2.5 Flash`) or high intelligence (`Gemini 3 Pro`, `Gemini 2.5 Pro`).
*   **Bilingual:** Native support for **Vietnamese** and **English** story generation.
*   **Customization:** Configure Genre, Tone, Length, and specific story ideas.

### 🎨 Flexible Visuals
*   **AI Generation:** Create cinematic book covers using `Gemini 2.5 Flash Image` or `Gemini 3 Pro Image`.
*   **User Uploads:** Upload your own images to use in the story video (Free of inference cost).
*   **Cost Tracking:** Automatically distinguishes between AI-generated and uploaded images for accurate cost estimation.

### 🎙️ Natural Narration (TTS)
*   **Long-form Audio:** Support for up to **10,000 characters** per generation.
*   **Diverse Voices:** Choose from 5 distinct AI voices (Puck, Charon, Kore, Fenrir, Zephyr).
*   **Downloadable:** Export raw audio as `.wav` files.

### 🎬 Video Production
*   **Veo Animation:** Animate static images into 4K/1080p videos using Google's **Veo** model (Requires paid API key).
*   **Social Export:** Render final videos in vertical format (9:16) or slideshows with:
    *   Synced Audio
    *   Automatic Subtitles (with timing calculation)
    *   Background Music/Atmosphere
*   **Downloadable:** Export final videos as `.webm`.

### 💰 Usage & Analytics
*   **Real-time Cost Estimation:** Tracks prompt and candidate tokens for Story, Audio, and Image generation.
*   **Token Stats:** Detailed breakdown of tokens used per project.

## 🛠 Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **npm** or **yarn**

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
    You have two ways to configure the API Key. Get your key from [Google AI Studio](https://aistudio.google.com/).

    **Option A: Environment File (Recommended)**
    1.  Open the file `.env.local` in the root directory.
    2.  Paste your API key:
        ```env
        API_KEY=AIzaSy...
        ```
    3.  *Note:* Depending on your build tool (Vite/Parcel), you might need to rename this to `.env`.

    **Option B: Direct Config (Quick Start)**
    1.  Open `index.html`.
    2.  Find the `<script>` tag with `window.process`.
    3.  Paste your key directly into the `API_KEY` field.

4.  **Run the application**:
    ```bash
    npm start
    # or
    npm run dev
    ```

5.  **Open in Browser**:
    Navigate to the local server URL shown in your terminal (usually `http://localhost:1234` or `http://localhost:5173`).

## ⚙️ Configuration

You can customize the application settings, available models, and pricing estimates in `settings.ts`.

```typescript
export const APP_SETTINGS = {
  AVAILABLE_MODELS: {
    STORY: [ ... ], // Add or remove text models
    IMAGE: [ ... ], // Add or remove image models
    AUDIO: [ ... ], // Add or remove TTS models
    VEO:   [ ... ]  // Add or remove Video generation models
  },
  LIMITS: {
    MAX_TTS_CHARS: 10000, // Configure text-to-speech character limit
  },
  // ...
};
```

## ⚠️ Important Notes

*   **API Costs:** While many "Preview" models are free within limits, "Pro" and "Veo" models may incur costs on your Google Cloud billing account. The app provides an *estimation* only.
*   **Veo Generation:** This feature specifically requires a billing-enabled project. The app will prompt you to select a paid key via the `window.aistudio` interface if available, or rely on your `.env` key.
*   **Local Storage:** Projects and generated media (base64) are stored in your browser's `localStorage`. Clearing cache will delete your projects. Export your media to save it permanently.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the MIT License.
