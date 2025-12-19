/// <reference lib="dom" />

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
 * Estimates subtitle timings.
 */
const createSubtitles = (fullText: string, duration: number): SubtitleChunk[] => {
  const regex = /[^.?!,;\n]+[.?!,;\n]*/g;
  const rawSegments = fullText.match(regex) || [fullText];
  const segments = rawSegments.map(s => s.trim()).filter(s => s.length > 0);
  
  const CHAR_WEIGHT = 1;
  const COMMA_WEIGHT = 6;    
  const END_WEIGHT = 15;     

  const getSegmentWeight = (text: string) => {
    let weight = text.length * CHAR_WEIGHT;
    if (text.match(/[,;]$/)) {
      weight += COMMA_WEIGHT;
    } else if (text.match(/[.?!]$/) || text.includes('\n')) {
      weight += END_WEIGHT;
    }
    return weight;
  };

  const totalWeight = segments.reduce((acc, seg) => acc + getSegmentWeight(seg), 0);
  const secondsPerUnit = duration / totalWeight;

  let currentTime = 0;
  
  return segments.map(text => {
    const weight = getSegmentWeight(text);
    const segmentTotalDuration = weight * secondsPerUnit;
    const start = currentTime;
    let visualEnd = start + segmentTotalDuration;

    if (text.match(/[.?!]$/) || text.includes('\n')) {
        const gapTime = (END_WEIGHT * secondsPerUnit) * 0.4; 
        visualEnd = visualEnd - gapTime;
    } else {
        visualEnd = visualEnd - 0.05; 
    }

    currentTime += segmentTotalDuration;
    return { text, start, end: visualEnd };
  });
};

/**
 * Generates an SRT subtitle file content from text and audio duration.
 */
export const generateSRTString = (fullText: string, duration: number): string => {
  const chunks = createSubtitles(fullText, duration);
  
  const formatTime = (seconds: number) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    const iso = date.toISOString();
    // ISO format: 1970-01-01T00:00:00.000Z
    // SRT format: 00:00:00,000
    return iso.substr(11, 8) + ',' + iso.substr(20, 3);
  };

  return chunks.map((chunk, index) => {
    return `${index + 1}\n${formatTime(chunk.start)} --> ${formatTime(chunk.end)}\n${chunk.text}\n`;
  }).join('\n');
};

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
 * Creates a video from a static image and an audio buffer.
 */
export const generateVideoBlob = async (
  imageUrl: string,
  audioBuffer: AudioBuffer,
  options: VideoOptions
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const width = options.width;
    const height = options.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const subtitles = options.subtitles 
      ? createSubtitles(options.subtitles, audioBuffer.duration) 
      : [];

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      startRecording();
    };

    img.onerror = (err) => reject(new Error("Failed to load image for video"));

    const startRecording = () => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      
      const fps = options.fps || 30;
      const canvasStream = canvas.captureStream(fps);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

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

      const startTime = audioCtx.currentTime;
      let animationFrameId: number;

      // Optimizations: Pre-calculate static layout values
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;
      
      // Font setup
      const fontSize = Math.floor(width * 0.055); 
      const fontStr = `bold ${fontSize}px 'Inter', sans-serif`;
      const lineHeight = fontSize * 1.3;
      const maxTextWidth = width * 0.85;

      const drawFrame = () => {
        const currentTime = audioCtx.currentTime - startTime;
        
        // --- Draw Background ---
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);

        // Gradient overlay
        const gradient = ctx.createLinearGradient(0, height * 0.6, 0, height);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(0.5, "rgba(0,0,0,0.5)");
        gradient.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);

        // --- Draw Subtitles ---
        if (subtitles.length > 0) {
          const activeSubtitle = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
          
          if (activeSubtitle) {
            ctx.font = fontStr;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const lines = wrapText(ctx, activeSubtitle.text, maxTextWidth);
            const startY = height * 0.8 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, index) => {
              const lineY = startY + index * lineHeight;
              
              ctx.strokeStyle = "rgba(0,0,0,0.9)";
              ctx.lineWidth = fontSize * 0.15;
              ctx.lineJoin = "round";
              ctx.strokeText(line, width / 2, lineY);
              
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0,0,0,0.8)";
              ctx.shadowBlur = 8;
              ctx.fillText(line, width / 2, lineY);
              
              ctx.shadowBlur = 0; 
            });
          }
        }

        if (currentTime < audioBuffer.duration + 0.5) { 
           // Throttle frame drawing if FPS is low to save CPU
           // Default requestAnimationFrame is ~60fps.
           // If we want 15fps, we can just let captureStream handle the sampling, 
           // BUT drawing less often saves JS execution time.
           animationFrameId = requestAnimationFrame(drawFrame);
        } else {
             recorder.stop();
        }
      };

      recorder.start();
      source.start(0);
      drawFrame(); 

      source.onended = () => {
        cancelAnimationFrame(animationFrameId);
        if (recorder.state === 'recording') {
            recorder.stop();
        }
      };
    };
  });
};