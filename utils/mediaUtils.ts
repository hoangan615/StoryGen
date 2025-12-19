
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

/**
 * Converts an AudioBuffer to a WAV Blob ready for download.
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // Helper to write string
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // write WAVE header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numOfChan * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * numOfChan * 2, true);

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  offset = 44;
  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      // Scale to 16-bit integer
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([view], { type: 'audio/wav' });
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
  subtitles?: string; // The full text content
}

interface SubtitleChunk {
  text: string;
  start: number;
  end: number;
}

/**
 * Estimates subtitle timings using a Weighted Character approach.
 * Accounts for natural pauses at punctuation.
 */
const createSubtitles = (fullText: string, duration: number): SubtitleChunk[] => {
  // 1. Split text into segments based on punctuation marks for better pacing
  // Keep the punctuation attached to the previous word.
  // Split by: . ? ! ; (Sentence ends) or , (Clauses) or \n (Paragraphs)
  const regex = /[^.?!,;\n]+[.?!,;\n]*/g;
  const rawSegments = fullText.match(regex) || [fullText];
  const segments = rawSegments.map(s => s.trim()).filter(s => s.length > 0);
  
  // 2. Define Weights (Cost in "Character Units")
  // A standard character = 1 unit
  const CHAR_WEIGHT = 1;
  const COMMA_WEIGHT = 6;    // Pause roughly equivalent to reading 6 characters (~300ms)
  const END_WEIGHT = 15;     // Long pause for sentences (~800ms)

  // Calculate weight for a specific segment
  const getSegmentWeight = (text: string) => {
    let weight = text.length * CHAR_WEIGHT;
    
    // Check ending punctuation
    if (text.match(/[,;]$/)) {
      weight += COMMA_WEIGHT;
    } else if (text.match(/[.?!]$/) || text.includes('\n')) {
      weight += END_WEIGHT;
    }
    return weight;
  };

  // 3. Calculate Total Weight of the entire story
  const totalWeight = segments.reduce((acc, seg) => acc + getSegmentWeight(seg), 0);
  
  // 4. Determine how many seconds per "Weight Unit"
  const secondsPerUnit = duration / totalWeight;

  let currentTime = 0;
  
  return segments.map(text => {
    const weight = getSegmentWeight(text);
    const segmentTotalDuration = weight * secondsPerUnit;
    
    const start = currentTime;
    
    // Determine the Visual End time.
    // Ideally, the text should disappear slightly BEFORE the next one starts 
    // if it's a sentence end, to mimic the silence.
    let visualEnd = start + segmentTotalDuration;

    // Create a gap (blank screen) at the end of sentences
    if (text.match(/[.?!]$/) || text.includes('\n')) {
        // Gap size: 40% of the calculated pause time for this punctuation
        const gapTime = (END_WEIGHT * secondsPerUnit) * 0.4; 
        visualEnd = visualEnd - gapTime;
    } else {
        // For commas, just a tiny gap or continuous
        visualEnd = visualEnd - 0.05; // tiny buffer
    }

    // Advance cursor by the full calculated duration (including the invisible pause)
    currentTime += segmentTotalDuration;
    
    return { text, start, end: visualEnd };
  });
};

/**
 * Wraps text to fit within a specific width on the canvas
 */
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

/**
 * Creates a video from a static image and an audio buffer using HTML5 Canvas and MediaRecorder.
 * Supports drawing dynamic subtitles.
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
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency
    
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // 2. Prepare Subtitles if text provided
    const subtitles = options.subtitles 
      ? createSubtitles(options.subtitles, audioBuffer.duration) 
      : [];

    // 3. Load Image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      startRecording();
    };

    img.onerror = (err) => reject(new Error("Failed to load image for video"));

    const startRecording = () => {
      // 4. Setup Audio Processing for Recording
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      
      // We do not connect to audioCtx.destination to avoid hearing it twice (or feedback) during render
      // unless we want the user to hear the render process.

      // 5. Create Combined MediaStream
      const canvasStream = canvas.captureStream(options.fps || 30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // 6. Setup Recorder
      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
          ? 'video/webm; codecs=vp9' 
          : 'video/webm';
        
        recorder = new MediaRecorder(combinedStream, { 
          mimeType, 
          videoBitsPerSecond: options.bitrate || 2500000 
        });
      } catch (e) {
        reject(new Error("MediaRecorder not supported"));
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

      // 7. Animation Loop Function
      const startTime = audioCtx.currentTime;
      let animationFrameId: number;

      const drawFrame = () => {
        const currentTime = audioCtx.currentTime - startTime;
        
        // --- A. Draw Background ---
        // Scale logic (Center Crop)
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);

        // Gradient overlay for text legibility
        const gradient = ctx.createLinearGradient(0, height * 0.6, 0, height);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(0.5, "rgba(0,0,0,0.5)");
        gradient.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);

        // --- B. Draw Subtitles ---
        if (subtitles.length > 0) {
          // Find if there is an active subtitle for this precise moment
          const activeSubtitle = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
          
          if (activeSubtitle) {
            // Font settings - Responsive font size based on width
            const fontSize = Math.floor(width * 0.055); 
            ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const maxTextWidth = width * 0.85;
            const lines = wrapText(ctx, activeSubtitle.text, maxTextWidth);
            const lineHeight = fontSize * 1.3;
            // Position text in the bottom 25% area
            const startY = height * 0.8 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, index) => {
              const lineY = startY + index * lineHeight;
              
              // Text Stroke (Outline) - Thicker for better readability
              ctx.strokeStyle = "rgba(0,0,0,0.9)";
              ctx.lineWidth = fontSize * 0.15;
              ctx.lineJoin = "round";
              ctx.strokeText(line, width / 2, lineY);
              
              // Text Fill
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0,0,0,0.8)";
              ctx.shadowBlur = 8;
              ctx.fillText(line, width / 2, lineY);
              
              // Reset shadow
              ctx.shadowBlur = 0; 
            });
          }
        }

        // Loop if audio is still playing
        if (currentTime < audioBuffer.duration + 0.5) { // Add small buffer to catch end
          animationFrameId = requestAnimationFrame(drawFrame);
        } else {
             // Stop recorder slightly after audio ends
             recorder.stop();
        }
      };

      // 8. Start Everything
      recorder.start();
      source.start(0);
      drawFrame(); // Start animation loop

      source.onended = () => {
        cancelAnimationFrame(animationFrameId);
        // Ensure recorder stops if it hasn't already
        if (recorder.state === 'recording') {
            recorder.stop();
        }
      };
    };
  });
};
