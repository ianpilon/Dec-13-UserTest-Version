import fs from 'fs';
import path from 'path';
import https from 'https';

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';
const MODEL_DIR = path.join(process.cwd(), 'public', 'models');
const MODEL_PATH = path.join(MODEL_DIR, 'ggml-base.bin');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

console.log('Downloading Whisper model...');
https.get(MODEL_URL, (response) => {
  const file = fs.createWriteStream(MODEL_PATH);
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('Model downloaded successfully!');
  });
}).on('error', (err) => {
  console.error('Error downloading model:', err);
  process.exit(1);
});
