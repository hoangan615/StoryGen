/**
 * Decodes Gemini's Raw PCM base64 string into an AudioBuffer.
 * Gemini 2.5 TTS returns raw linear-16 PCM, 24kHz, Mono.
 */
export const decodeAudio = async (base64Data: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Gemini Output Specs:
  const sampleRate = 24000;
  const numChannels = 1;

  // Convert Raw PCM (Int16) to Float32 for Web Audio API
  // Int16Array reads 2 bytes per sample from the Uint8Array buffer
  const int16Data = new Int16Array(bytes.buffer);
  const float32Data = new Float32Array(int16Data.length);

  for (let i = 0; i < int16Data.length; i++) {
    // Normalize 16-bit integer (-32768 to 32767) to floating point (-1.0 to 1.0)
    float32Data[i] = int16Data[i] / 32768.0;
  }

  // Create the AudioBuffer
  const buffer = audioContext.createBuffer(numChannels, float32Data.length, sampleRate);
  
  // Copy data to the buffer's channel 0
  buffer.copyToChannel(float32Data, 0);

  return buffer;
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface VideoOptions {
  width: number;
  height: number;
  fps?: number;
  bitrate?: number;
}

/**
 * Creates a video from a static image and an audio buffer using HTML5 Canvas and MediaRecorder.
 * Returns a Blob.
 */
export const generateVideoBlob = async (
  imageUrl: string,
  audioBuffer: AudioBuffer,
  options: VideoOptions
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // 1. Setup Canvas
    const canvas = document.createElement('canvas');
    const width = options.width;
    const height = options.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // 2. Load Image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      // Draw image to canvas (Center Crop / Object Cover)
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;
      
      // Draw black background first
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      
      // Draw image
      ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);
      
      // Add a gradient overlay for text readability (TikTok style bottom fade)
      const gradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

      startRecording();
    };

    img.onerror = (err) => reject(new Error("Failed to load image for video"));

    const startRecording = () => {
      // 3. Setup Audio Processing
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      // Optional: connect to speakers if you want to hear it while rendering
      // source.connect(audioCtx.destination); 

      // 4. Create MediaStream (Canvas Video + WebAudio Audio)
      const canvasStream = canvas.captureStream(options.fps || 30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // 5. Setup Recorder
      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      
      try {
        // Prefer VP9/WebM, fallback to standard
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
          ? 'video/webm; codecs=vp9' 
          : 'video/webm';
        
        recorder = new MediaRecorder(combinedStream, { 
          mimeType, 
          videoBitsPerSecond: options.bitrate || 2500000 
        });
      } catch (e) {
        reject(new Error("MediaRecorder not supported or mimeType invalid"));
        return;
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        audioCtx.close();
        resolve(blob);
      };

      // 6. Start Sync
      recorder.start();
      source.start(0);

      // Stop recording when audio ends
      source.onended = () => {
        recorder.stop();
      };
    };
  });
};