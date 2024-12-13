import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { content, type, prompt } = await request.json();

    if (!content || !type || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, return a placeholder analysis
    const analysis = `This is a placeholder analysis for type: ${type}\n\nAnalysis of:\n${content}\n\nBased on prompt:\n${prompt}`;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in analysis:', error);
    return new Response(JSON.stringify({ error: 'Failed to analyze content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
