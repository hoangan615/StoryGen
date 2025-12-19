
/// <reference lib="dom" />

import { generateSRTString, audioBufferToWav, blobToBase64 } from './mediaUtils';

const SERVER_URL = 'http://localhost:3001/render';

export const renderVideoViaServer = async (
  imageUrl: string,
  audioBuffer: AudioBuffer,
  subtitlesText: string | null
): Promise<string> => {
  try {
    // 1. Prepare Audio Base64
    const wavBlob = await audioBufferToWav(audioBuffer);
    const audioBase64 = await blobToBase64(wavBlob);

    // 2. Prepare SRT (if needed)
    let srtContent = null;
    if (subtitlesText) {
      srtContent = generateSRTString(subtitlesText, audioBuffer.duration);
    }

    // 3. Send to Server
    // Note: We use fetch here. If the server isn't running, this throws TypeError: Failed to fetch
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        audio: audioBase64,
        srt: srtContent
      }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error');
    }

    const data = await response.json();
    if (data.success && data.videoData) {
        return data.videoData;
    } else {
        throw new Error("No video data received");
    }

  } catch (error: any) {
    console.error("Server Render Error:", error);
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error("Không thể kết nối đến Server Node.js (cổng 3001).\n\nHãy mở Terminal và chạy lệnh: npm run server");
    }
    throw error;
  }
};
