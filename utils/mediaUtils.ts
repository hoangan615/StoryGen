/**
 * Decodes a base64 string into an AudioBuffer using the Web Audio API.
 */
export const decodeAudio = async (base64Data: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Important: We need to copy the buffer because decodeAudioData detaches it
  const bufferCopy = bytes.buffer.slice(0);
  return await audioContext.decodeAudioData(bufferCopy);
};

/**
 * Creates a video from a static image and an audio buffer using HTML5 Canvas and MediaRecorder.
 * Returns a Blob URL for the generated .webm video.
 */
export const generateVideoBlob = async (
  imageUrl: string,
  audioBuffer: AudioBuffer
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Setup Canvas
    const canvas = document.createElement('canvas');
    const width = 1280;
    const height = 720;
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
      // Draw image to canvas (cover style)
      const ratio = Math.max(width / img.width, height / img.height);
      const x = (width - img.width * ratio) / 2;
      const y = (height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * ratio, img.height * ratio);
      
      // Add a subtle overlay for text readability (optional, purely aesthetic here as we don't draw text)
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0,0, width, height);

      startRecording();
    };

    img.onerror = (err) => reject(new Error("Failed to load image for video"));

    const startRecording = () => {
      // 3. Setup Audio Processing
      // We need an offline context to render the audio-video mix fast, 
      // BUT MediaRecorder works in real-time on a MediaStream.
      // To keep it simple and robust on frontend: We play the audio into a destination node
      // and capture the canvas stream.
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      source.connect(audioCtx.destination); // Optional: hear it while rendering (muted for export usually)

      // 4. Create MediaStream (Canvas Video + WebAudio Audio)
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // 5. Setup Recorder
      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      
      try {
         // Prefer VP9 for better quality/size ratio if available, else standard webm
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
          ? 'video/webm; codecs=vp9' 
          : 'video/webm';
        
        recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 2500000 });
      } catch (e) {
        reject(new Error("MediaRecorder not supported or mimeType invalid"));
        return;
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        audioCtx.close();
        resolve(url);
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
