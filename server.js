import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import { JSDOM } from 'jsdom';
import sgMail from '@sendgrid/mail';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors({
  origin: ['https://dec-13-user-test-version.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.post('/api/analyze', async (req, res) => {
  try {
    console.log('Received analyze request');
    const { content, type, prompt } = req.body;
    
    if (!content || !type || !prompt) {
      console.error('Missing required fields:', { content: !!content, type, prompt });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('API key not found in environment');
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    console.log('Processing content of length:', content.length);
    console.log('Analysis type:', type);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `${prompt}\n\n${content}`
        }]
      })
    });

    console.log('Anthropic API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Successfully processed request');
    res.json({ analysis: result.content[0].text });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze content' });
  }
});

app.post('/api/convert-to-pdf', async (req, res) => {
  try {
    console.log('PDF conversion request received');
    const { htmlContent, fileName } = req.body;
    
    if (!htmlContent) {
      console.error('Missing HTML content');
      return res.status(400).json({ error: 'Missing HTML content' });
    }

    // Parse HTML content
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}.pdf`);

    // Pipe the PDF into the response
    doc.pipe(res);

    // Add content to PDF
    const sections = document.querySelectorAll('section');
    let isFirst = true;

    for (const section of sections) {
      if (!isFirst) {
        doc.addPage();
      }
      isFirst = false;

      // Add title
      const title = section.querySelector('h2');
      if (title) {
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(title.textContent.trim(), { align: 'left' });
      }

      // Add description
      const description = section.querySelector('em');
      if (description) {
        doc.moveDown()
           .fontSize(12)
           .font('Helvetica-Oblique')
           .text(description.textContent.trim(), { align: 'left', color: '#666666' });
      }

      // Add content
      const content = section.querySelector('pre');
      if (content) {
        doc.moveDown()
           .fontSize(12)
           .font('Helvetica')
           .text(content.textContent.trim(), {
             align: 'left',
             width: 500,
             lineGap: 4
           });
      }
    }

    // Finalize PDF
    doc.end();
    console.log('PDF generated successfully');

  } catch (error) {
    console.error('PDF conversion error:', error);
    res.status(500).json({ error: 'Failed to convert to PDF', details: error.message });
  }
});

// Helper function to get formatted timestamp
const getFormattedTimestamp = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0];  // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');  // HH-MM-SS
  return `${date} - ${time}`;
};

app.post('/api/share-pdf', async (req, res) => {
  try {
    const { htmlContent, recipientEmail } = req.body;
    
    if (!htmlContent || !recipientEmail) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create PDF
    const pdfDoc = new PDFDocument();
    const chunks = [];
    
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);
      
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Your Customer Research Analysis Report',
        text: 'Please find your Customer Research Analysis Report attached.',
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Customer Research Analysis Report - ${getFormattedTimestamp()}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      try {
        await sgMail.send(msg);
        res.json({ success: true });
      } catch (error) {
        console.error('SendGrid Error:', error);
        res.status(500).json({ error: 'Failed to send email' });
      }
    });

    // Add content to PDF
    pdfDoc.fontSize(12);
    pdfDoc.text(htmlContent);
    pdfDoc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
