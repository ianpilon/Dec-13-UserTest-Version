import sgMail from '@sendgrid/mail';
import PDFDocument from 'pdfkit';

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
    return new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const pdfBase64 = pdfBuffer.toString('base64');

          // Parse sections from HTML content
          const sections = htmlContent.split('<section>').filter(Boolean);

          sections.forEach((section, index) => {
            if (index > 0) doc.addPage();

            // Extract title (between <h2> tags)
            const titleMatch = section.match(/<h2>(.*?)<\/h2>/);
            if (titleMatch) {
              doc.fontSize(20)
                 .font('Helvetica-Bold')
                 .text(titleMatch[1].trim(), { align: 'left' });
            }

            // Extract description (between <em> tags)
            const descMatch = section.match(/<em>(.*?)<\/em>/);
            if (descMatch) {
              doc.moveDown()
                 .fontSize(12)
                 .font('Helvetica-Oblique')
                 .text(descMatch[1].trim(), { align: 'left', color: '#666666' });
            }

            // Extract content (between <pre> tags)
            const contentMatch = section.match(/<pre>(.*?)<\/pre>/s);
            if (contentMatch) {
              doc.moveDown()
                 .fontSize(12)
                 .font('Helvetica')
                 .text(contentMatch[1].trim(), {
                   align: 'left',
                   width: 500,
                   lineGap: 4
                 });
            }
          });

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
          resolve(res.status(200).json({ message: 'Email sent successfully' }));
        } catch (error) {
          reject(error);
        }
      });

      doc.on('error', reject);
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
}
