import type { APIRoute } from 'astro';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // For now, return a placeholder text since we haven't implemented PDF extraction yet
    const text = "This is a placeholder text from the PDF extraction endpoint. Implement actual PDF extraction here.";

    // Cleanup
    await fs.promises.unlink(file.filepath);

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in PDF extraction:', error);
    return new Response(JSON.stringify({ error: 'Failed to extract text from PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
