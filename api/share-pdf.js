import sgMail from '@sendgrid/mail';
import PDFDocument from 'pdfkit';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { htmlContent, fileName, recipientEmail } = req.body;

    if (!htmlContent || !fileName || !recipientEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }
    sgMail.setApiKey(apiKey);

    // Create PDF
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Convert to buffer
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Parse HTML content
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const sections = document.querySelectorAll('section');

      for (const section of sections) {
        if (doc.page.content) doc.addPage();

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

      doc.end();

      // Send email with PDF attachment
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Customer Research Analysis Report - ${fileName}`,
        text: 'Please find attached your customer research analysis report.',
        attachments: [
          {
            content: pdfBase64,
            filename: `${fileName}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      await sgMail.send(msg);
      res.status(200).json({ message: 'Email sent successfully' });
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
}
