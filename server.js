
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Setup
const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const TEMP_DIR = path.join(__dirname, 'temp_render');

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
}));
// Increase limit for Base64 images/audio
app.use(express.json({ limit: '500mb' }));

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)){
    try {
        fs.mkdirSync(TEMP_DIR);
    } catch (e) {
        console.error("Could not create temp dir:", e);
    }
}

// Health Check Route
app.get('/', (req, res) => {
    res.send('FableForge Video Render Server is Running!');
});

// Helper to write Base64 to file
const writeBase64ToFile = (base64Str, filePath) => {
    const base64Data = base64Str.replace(/^data:.*,/, '');
    fs.writeFileSync(filePath, base64Data, 'base64');
};

app.post('/render', async (req, res) => {
    const jobId = uuidv4();
    const jobDir = path.join(TEMP_DIR, jobId);
    
    console.log(`[${jobId}] Request received. Starting render job...`);

    try {
        const { image, audio, srt } = req.body;

        if (!image || !audio) {
            console.error(`[${jobId}] Missing assets.`);
            return res.status(400).json({ error: "Missing image or audio data" });
        }

        // 1. Create Job Directory
        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
        }

        // 2. Write Assets
        const imagePath = path.join(jobDir, 'input_image.png');
        const audioPath = path.join(jobDir, 'input_audio.wav');
        const srtPath = path.join(jobDir, 'subtitles.srt');
        const outputPath = path.join(jobDir, 'output.mp4');

        writeBase64ToFile(image, imagePath);
        writeBase64ToFile(audio, audioPath);
        
        // 3. Construct FFmpeg Command
        // We use system fonts. 'Arial' is widely available.
        // Force style for subtitles to look good.
        let vfFilter = '';
        if (srt) {
            fs.writeFileSync(srtPath, srt, 'utf8');
            // Note: Windows paths in FFmpeg filter need escaping or forward slashes
            const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
            vfFilter = `-vf "subtitles='${escapedSrtPath}':force_style='Fontname=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=50,Alignment=2'"`;
        }

        // Command: Loop image + Audio + Subtitles (optional) + MP4 Encoding
        // Using -pix_fmt yuv420p for compatibility
        const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" ${vfFilter} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`;

        console.log(`[${jobId}] Executing FFmpeg command...`);
        await execAsync(cmd);

        // 4. Read Output and Send back
        if (fs.existsSync(outputPath)) {
            const videoBuffer = fs.readFileSync(outputPath);
            const base64Video = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
            
            console.log(`[${jobId}] Render success! Sending response.`);
            res.json({ success: true, videoData: base64Video });
        } else {
            throw new Error("Output file not generated");
        }

    } catch (error) {
        console.error(`[${jobId}] Error:`, error);
        res.status(500).json({ error: error.message || "Render failed" });
    } finally {
        // Cleanup (Async) - Runs regardless of success or failure
        setTimeout(() => {
            try {
                if (fs.existsSync(jobDir)) {
                    fs.rmSync(jobDir, { recursive: true, force: true });
                }
            } catch (e) { console.error("Cleanup error", e); }
        }, 2000); // Wait 2s to ensure file handle is released
    }
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Video Render Server running at http://localhost:${PORT}`);
    console.log(`   - Health check: http://localhost:${PORT}/`);
    console.log(`👉 Ensure 'ffmpeg' is installed and in your PATH.`);
    console.log(`=========================================`);
});
