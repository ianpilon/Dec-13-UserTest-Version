import { createReadStream } from 'fs';
import { Configuration, OpenAIApi } from 'openai';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable();
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const response = await openai.createTranscription(
      createReadStream(file.filepath) as any,
      'whisper-1',
      fields.language?.[0] || 'en',
      'json'
    );

    return res.status(200).json({ text: response.data.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: error.response?.data?.error?.message || 'Failed to transcribe media'
    });
  }
}
