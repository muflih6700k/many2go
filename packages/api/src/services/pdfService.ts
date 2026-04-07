import PDFKit from 'pdfkit';
import { prisma } from '../config/prisma';
import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../uploads/pdfs');

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
    throw error;
  }
}

function hexToRGB(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
}

const COLORS = {
  primary: hexToRGB('#6366f1'),
  primaryDark: hexToRGB('#4f46e5'),
  text: hexToRGB('#1f2937'),
  textLight: hexToRGB('#374151'),
  textMuted: hexToRGB('#6b7280'),
  border: hexToRGB('#e5e7eb'),
  background: hexToRGB('#f9fafb'),
  white: hexToRGB('#ffffff'),
};

export async function generateItineraryPDF(itineraryId: string): Promise<string> {
  try {
    await ensureUploadsDir();
    console.log(`Generating PDF for itinerary: ${itineraryId}`);

    // Fetch itinerary with user info
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!itinerary) {
      throw new Error('Itinerary not found');
    }

    if (!itinerary.user) {
      throw new Error('Itinerary has no associated user');
    }

    const days = itinerary.days || [];
    const customerName = itinerary.user.name || itinerary.user.email;
    const tripTitle = itinerary.title || 'Untitled Trip';
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `itinerary-${itineraryId}-${timestamp}.pdf`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Create PDF document
    const doc = new PDFKit({ size: 'A4', margin: 40 });
    const stream = doc.pipe(createWriteStream(filePath));

    // === HEADER ===
    // Gradient-like header box (using solid color for simplicity)
    doc.rect(40, 40, doc.page.width - 80, 70)
      .fill('#6366f1');
    
    doc.fontSize(26)
      .fillColor('white')
      .text('🌍 MANY2GO', 50, 55, { align: 'center' });
    
    doc.fontSize(9)
      .fillColor('rgba(255,255,255,0.85)')
      .text('YOUR PERSONAL TRAVEL ITINERARY', { align: 'center' });

    let y = 135;

    // === TRIP TITLE ===
    doc.fontSize(22)
      .fillColor('#1f2937')
      .text(tripTitle, 40, y, { align: 'center', width: doc.page.width - 80 });
    y += 35;

    // === META INFO ===
    const metaText = `${days.length} ${days.length === 1 ? 'Day' : 'Days'}  •  ${today}`;
    doc.fontSize(10)
      .fillColor('#6b7280')
      .text(metaText, 40, y, { align: 'center', width: doc.page.width - 80 });
    y += 30;

    // === CUSTOMER INFO BOX ===
    doc.rect(40, y, doc.page.width - 80, 55)
      .fill('#f9fafb')
      .stroke('#e5e7eb');
    
    // Customer details
    doc.fontSize(8)
      .fillColor('#6b7280')
      .text('TRAVELER', 50, y + 8);
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica-Bold')
      .text(customerName, 50, y + 20);
    doc.font('Helvetica');

    doc.fontSize(8)
      .fillColor('#6b7280')
      .text('STATUS', 200, y + 8);
    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica-Bold')
      .text(itinerary.status || 'DRAFT', 200, y + 20);
    doc.font('Helvetica');

    const locations = [...new Set(days.map((d: any) => d.destination).filter(Boolean))].join(', ') || 'TBD';
    doc.fontSize(8)
      .fillColor('#6b7280')
      .text('LOCATIONS', 330, y + 8);
    doc.fontSize(9)
      .fillColor('#374151')
      .text(locations.length > 30 ? locations.substring(0, 30) + '...' : locations, 330, y + 20, { width: 200 });
    
    y += 75;

    // === DAYS ===
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      
      // Check if we need a new page
      if (y > doc.page.height - 150) {
        doc.addPage();
        y = 40;
      }

      // Day card
      doc.rect(40, y, doc.page.width - 80, 10)
        .fill('#6366f1');
      
      // Day header
      const dayBoxHeight = 35;
      doc.rect(40, y, doc.page.width - 80, dayBoxHeight)
        .fill('#f3f4f6')
        .stroke('#e5e7eb');
      
      // Day badge
      doc.rect(48, y + 6, 55, 22)
        .fill('#6366f1')
        .roundedRect(48, y + 6, 55, 22, 11);
      
      doc.fontSize(9)
        .fillColor('white')
        .font('Helvetica-Bold')
        .text(`DAY ${day.dayNumber || i + 1}`, 48, y + 11, { width: 55, align: 'center' });
      doc.font('Helvetica');

      // Destination
      doc.fontSize(11)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text(day.destination || 'TBD', 115, y + 10);
      doc.font('Helvetica');
      
      y += dayBoxHeight + 15;

      // Activities section
      if (day.activities) {
        doc.fontSize(9)
          .fillColor('#6366f1')
          .font('Helvetica-Bold')
          .text('ACTIVITIES', 40, y);
        doc.font('Helvetica');
        y += 18;

        const activities = day.activities
          .split('\n')
          .map((a: string) => a.trim())
          .filter((a: string) => a.length > 0);

        for (const activity of activities) {
          doc.fontSize(9)
            .fillColor('#6b7280')
            .text('•', 50, y);
          
          const wrappedText = doc.heightOfString(activity, { width: doc.page.width - 100 });
          doc.fontSize(9)
            .fillColor('#374151')
            .text(activity, 60, y, { width: doc.page.width - 100 });
          
          y += wrappedText + 5;
          
          // Separator line except for last activity
          if (activity !== activities[activities.length - 1]) {
            y += 5;
            doc.moveTo(60, y)
              .lineTo(doc.page.width - 60, y)
              .dash(2, { space: 3 })
              .stroke('#e5e7eb');
            y += 8;
          }
        }
        y += 15;
      }

      // Hotel section
      if (day.hotel) {
        // Hotel box
        doc.rect(40, y, doc.page.width - 80, 45)
          .fill('#eff6ff')
          .stroke('#dbeafe');
        
        doc.fontSize(9)
          .fillColor('#1e3a8a')
          .font('Helvetica-Bold')
          .text('🏨  ACCOMMODATION', 50, y + 8);
        doc.font('Helvetica');
        
        doc.fontSize(10)
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text(day.hotel, 50, y + 22);
        doc.font('Helvetica');
        
        y += 55;
      }

      // Notes section
      if (day.notes) {
        doc.fontSize(9)
          .fillColor('#9ca3af')
          .text('📝', 40, y);
        doc.fontSize(8)
          .fillColor('#6b7280')
          .font('Helvetica-Oblique')
          .text(day.notes, 55, y, { width: doc.page.width - 100 });
        doc.font('Helvetica');
        
        const notesHeight = doc.heightOfString(day.notes, { width: doc.page.width - 100 });
        y += notesHeight + 25;
      }

      // Spacing between days
      y += 15;
    }

    // === FOOTER ===
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 40;
    }

    // Footer line
    doc.moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .stroke('#e5e7eb');
    y += 20;

    doc.fontSize(10)
      .fillColor('#374151')
      .font('Helvetica-Bold')
      .text('Happy travels!', 40, y, { align: 'center', width: doc.page.width - 80 });
    doc.font('Helvetica');
    y += 20;

    doc.fontSize(8)
      .fillColor('#9ca3af')
      .text(`Generated by MANY2GO — ${new Date().getFullYear()}`, 40, y, { align: 'center', width: doc.page.width - 80 });
    y += 15;

    doc.fontSize(8)
      .fillColor('#9ca3af')
      .font('Helvetica-Oblique')
      .text('"Travel is the only thing you buy that makes you richer."', 40, y, { align: 'center', width: doc.page.width - 80 });
    doc.font('Helvetica');

    // Finalize PDF
    doc.end();

    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Update itinerary with PDF URL
    const pdfUrl = `/uploads/pdfs/${filename}`;
    await prisma.itinerary.update({
      where: { id: itineraryId },
      data: { pdfUrl },
    });

    console.log(`✅ PDF generated: ${filePath}`);
    return pdfUrl;
  } catch (error: any) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
