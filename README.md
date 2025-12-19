# FableForge AI

FableForge AI is an intelligent storytelling studio that uses Google's Gemini models to generate stories, create cover art, narrate text with natural voices, and export vertical videos for social media.

## Features

*   **Story Generation:** Uses `gemini-3-pro-preview` to write creative stories based on user prompts.
*   **Text-to-Speech:** Uses `gemini-2.5-flash-preview-tts` for natural narration.
*   **Image Generation:** Uses `gemini-2.5-flash-image` for cover art.
*   **Video Animation (Veo):** Uses `veo-3.1-fast-generate-preview` to animate static cover images.
*   **Video Export:** Generates vertical (9:16) videos suitable for TikTok/Reels by combining imagery and audio.

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

## Setup & Installation

1.  **Clone the repository** (or extract the source code).

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure API Key:**
    *   Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
    *   Create a file named `.env` in the root directory of the project.
    *   Add your API key to the file:
        ```env
        API_KEY=your_actual_api_key_here
        ```

    *Note: The application uses `process.env.API_KEY`. Ensure your build tool (Vite/Parcel/Webpack) is configured to expose this environment variable.*

4.  **Run the application:**
    ```bash
    npm start
    # or
    npm run dev
    ```

5.  **Open in Browser:**
    Navigate to `http://localhost:1234` (or the port shown in your terminal).

## Configuration

You can change the AI models used in the application by editing `settings.ts`:

```typescript
export const APP_SETTINGS = {
  MODELS: {
    STORY: "gemini-3-pro-preview",
    IMAGE: "gemini-2.5-flash-image",
    AUDIO: "gemini-2.5-flash-preview-tts",
    VEO: "veo-3.1-fast-generate-preview"
  },
  // ...
};
```

## Troubleshooting

*   **403/401 Errors:** Check that your `API_KEY` in the `.env` file is correct and has credits/billing enabled if required.
*   **Storage Quota Exceeded:** The app stores generated media in `localStorage`. If you see a storage warning, delete old projects or assets using the trash icons in the app.
*   **Veo Generation:** Requires a paid API key and billing enabled on the Google Cloud Project.
