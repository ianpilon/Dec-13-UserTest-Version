const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB limit
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'PDF extraction failed' }));
      throw new Error(error.error || 'PDF extraction failed');
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error instanceof Error ? error : new Error('Failed to extract text from PDF');
  }
}

export async function transcribeMedia(file: File): Promise<string> {
  try {
    // Check file size
    if (file.type.startsWith('audio/') && file.size > MAX_AUDIO_SIZE) {
      throw new Error('Audio file size must be less than 25MB');
    }
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
      throw new Error('Video file size must be less than 100MB');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Send to our local transcription API
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Transcription failed' }));
      throw new Error(error.error || 'Transcription failed');
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Error transcribing media:', error);
    throw error instanceof Error ? error : new Error('Failed to transcribe media file');
  }
}
