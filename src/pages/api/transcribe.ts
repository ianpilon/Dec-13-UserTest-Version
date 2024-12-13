import type { APIRoute } from 'astro';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

let ffmpeg: FFmpeg | null = null;

async function initFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }
  return ffmpeg;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Initialize FFmpeg
    const ffmpegInstance = await initFFmpeg();

    // Parse the multipart form data
    const form = formidable({});
    const [fields, files] = await form.parse(request);
    const file = files.file?.[0];

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read the file
    const fileData = await fs.promises.readFile(file.filepath);
    
    // Convert to WAV using FFmpeg
    await ffmpegInstance.writeFile('input', new Uint8Array(fileData));
    await ffmpegInstance.exec([
      '-i', 'input',
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      'output.wav'
    ]);

    const wavData = await ffmpegInstance.readFile('output.wav');
    const wavBlob = new Blob([wavData], { type: 'audio/wav' });

    // Use Web Speech API for transcription
    const text = await transcribeAudioWithWebSpeech(wavBlob);

    // Cleanup
    await ffmpegInstance.deleteFile('input');
    await ffmpegInstance.deleteFile('output.wav');
    await fs.promises.unlink(file.filepath);

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in transcription:', error);
    return new Response(JSON.stringify({ error: 'Failed to transcribe media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function transcribeAudioWithWebSpeech(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    let transcript = '';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + ' ';
        }
      }
    };

    recognition.onerror = (event) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.onend = () => {
      resolve(transcript.trim());
    };

    // Convert blob to audio element and start recognition
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.oncanplaythrough = () => {
      recognition.start();
      audio.play();
    };

    audio.onended = () => {
      recognition.stop();
    };
  });
}
