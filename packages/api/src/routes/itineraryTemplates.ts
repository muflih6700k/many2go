import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/jwt';
import PDFDocument from 'pdfkit';

const router = Router();
const prisma = new PrismaClient();

// Helper to format currency
const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-IN').format(amount);
};

// Helper to format date
const formatDate = (dateStr: string) => {
 return new Date(dateStr).toLocaleDateString('en-IN', {
 day: '2-digit',
 month: 'short',
 year: 'numeric'
 });
};

// GET /api/itinerary-templates - list all templates
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = await prisma.itineraryTemplate.findMany({
      orderBy: { planNum: 'asc' },
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching itinerary templates:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary templates' });
  }
});

// GET /api/itinerary-templates/:code - get by code
router.get('/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const template = await prisma.itineraryTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      res.status(404).json({ error: 'Itinerary template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching itinerary template:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary template' });
  }
});

// POST /api/itinerary-templates/generate-pdf - generate PDF itinerary
router.post('/generate-pdf', authenticate, async (req: Request, res: Response) => {
 try {
 const { template, customer, hotelCategory, pricing } = req.body;

 // Create PDF document
 const doc = new PDFDocument({ margin: 50 });
 const chunks: Buffer[] = [];

 doc.on('data', (chunk) => chunks.push(chunk));
 doc.on('end', () => {
 const pdfBuffer = Buffer.concat(chunks);
 res.setHeader('Content-Type', 'application/pdf');
 res.setHeader('Content-Disposition', `attachment; filename="MANY2GO-${customer.tripId}-${customer.name.replace(/\s+/g, '_')}.pdf"`);
 res.send(pdfBuffer);
 });

 // Colors
 const teal = '#0891B2';
 const darkGray = '#374151';
 const lightGray = '#F3F4F6';
 const black = '#000000';

 // === PAGE 1: COVER ===
 // Header with logo
 doc.fontSize(24).font('Helvetica-Bold').fillColor(teal).text('MANY2GO', 50, 50);
 doc.fontSize(10).font('Helvetica').fillColor(darkGray).text('FAMILY HOLIDAYS PVT LTD', 50, 75);
 
 // Contact info
 doc.fontSize(9).fillColor(darkGray).text('+91-7200455477 | trip@many2go.com | www.many2go.com', 50, 95);
 
 doc.moveDown(3);
 
 // Title
 doc.fontSize(28).font('Helvetica-Bold').fillColor(black).text('Your Holiday Itinerary', 50, 150, { align: 'center' });
 doc.moveDown(2);

 // Trip Info Box
 const infoY = 220;
 doc.rect(100, infoY, 400, 200).fill(lightGray).stroke(teal);
 
 doc.fontSize(12).font('Helvetica-Bold').fillColor(black);
 doc.text('Trip ID:', 120, infoY + 20);
 doc.text('Customer:', 120, infoY + 45);
 doc.text('Pax:', 120, infoY + 70);
 doc.text('Duration:', 120, infoY + 95);
 doc.text('Destination:', 120, infoY + 120);
 doc.text('Travel Dates:', 120, infoY + 145);
 doc.text('Consultant:', 120, infoY + 170);

 doc.fontSize(12).font('Helvetica').fillColor(darkGray);
 doc.text(customer.tripId, 220, infoY + 20);
 doc.text(customer.name, 220, infoY + 45);
 doc.text(`${customer.adults} Adults${customer.kids > 0 ? `, ${customer.kids} Kids` : ''}`, 220, infoY + 70);
 doc.text(`${template.days} Days / ${template.nights} Nights`, 220, infoY + 95);
 doc.text(template.destination?.toUpperCase() || 'VIETNAM', 220, infoY + 120);
 doc.text(`${formatDate(customer.startDate)} - ${formatDate(customer.endDate)}`, 220, infoY + 145);
 doc.text(customer.consultant || 'MANY2GO Team', 220, infoY + 170);

 // Footer note
 doc.moveDown(4);
 doc.fontSize(14).font('Helvetica-Bold').fillColor('#DC2626').text('FOR QUOTATION PURPOSE ONLY', 50, 480, { align: 'center' });
 doc.fontSize(10).font('Helvetica').fillColor(darkGray).text('This itinerary is subject to availability and confirmation.', 50, 510, { align: 'center' });

 doc.addPage();

 // === PAGE 2: TRIP SUMMARY ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor(teal).text('Trip Summary', 50, 50);
 doc.moveDown(1);

 // Greeting
 doc.fontSize(11).font('Helvetica').fillColor(darkGray);
 doc.text(`Dear ${customer.name},`);
 doc.moveDown(0.5);
 doc.text('Greetings from MANY2GO FAMILY HOLIDAYS PVT LTD');
 doc.moveDown(0.5);
 doc.text(`Thank you for choosing us for your ${template.destination || 'Vietnam'} holiday. Please find your itinerary below:`);
 doc.moveDown(1);

 // Trip Details table
 doc.fontSize(10).font('Helvetica-Bold').fillColor(black);
 const tableY = 180;
 const colWidth = 120;
 
 // Headers
 doc.rect(50, tableY, colWidth, 25).fill(lightGray).stroke(teal);
 doc.rect(170, tableY, colWidth, 25).fill(lightGray).stroke(teal);
 doc.rect(290, tableY, colWidth, 25).fill(lightGray).stroke(teal);
 doc.rect(410, tableY, colWidth, 25).fill(lightGray).stroke(teal);
 
 doc.text('TRIP ID', 55, tableY + 8);
 doc.text('DESTINATION', 175, tableY + 8);
 doc.text('START DATE', 295, tableY + 8);
 doc.text('PAX', 415, tableY + 8);

 // Values
 doc.font('Helvetica').fillColor(darkGray);
 doc.text(customer.tripId, 55, tableY + 30);
 doc.text(template.destination?.toUpperCase() || 'VIETNAM', 175, tableY + 30);
 doc.text(formatDate(customer.startDate), 295, tableY + 30);
 doc.text(`${customer.adults + customer.kids}`, 415, tableY + 30);

 doc.moveDown(3);

 // Your Itinerary Header
 doc.fontSize(14).font('Helvetica-Bold').fillColor(teal).text('Your Itinerary', 50, 260);
 doc.moveDown(0.5);

 // Brief summary
 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 if (template.title) {
 doc.text(template.title);
 doc.moveDown(0.5);
 }
 if (template.brief) {
 doc.text(template.brief);
 }

 doc.addPage();

 // === PAGE 3+: DAY WISE DETAILS ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor(teal).text('Day-by-Day Itinerary', 50, 50);
 doc.moveDown(1);

 // Parse itinerary if it's a JSON string
 let itinerary: any[] = [];
 try {
 if (typeof template.itinerary === 'string') {
 itinerary = JSON.parse(template.itinerary);
 } else if (Array.isArray(template.itinerary)) {
 itinerary = template.itinerary;
 }
 } catch (e) {
 console.error('Error parsing itinerary:', e);
 }

 let yPos = 100;
 const startDate = new Date(customer.startDate);

 if (itinerary.length > 0) {
 itinerary.forEach((day, index) => {
 if (yPos > 700) {
 doc.addPage();
 yPos = 50;
 }

 const dayDate = new Date(startDate);
 dayDate.setDate(startDate.getDate() + index);

 // Day header
 doc.fontSize(12).font('Helvetica-Bold').fillColor(teal);
 doc.text(`DAY ${day.day || index + 1} - ${formatDate(dayDate.toISOString().split('T')[0])}`, 50, yPos);
 
 // Activity title
 doc.fontSize(11).font('Helvetica-Bold').fillColor(black);
 yPos += 20;
 if (day.title) {
 doc.text(day.title.toUpperCase(), 50, yPos);
 }

 // Description
 if (day.description) {
 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 yPos += 20;
 doc.text(day.description, 50, yPos, { width: 500, align: 'justify' });
   // Estimate height based on text length
   const textHeight = doc.heightOfString(day.description, { width: 500 });
   yPos += textHeight + 20;
 } else {
   yPos += 25;
 }
 });
 } else {
 // Fallback if no itinerary data
 doc.fontSize(11).fillColor(darkGray).text('Detailed day-by-day itinerary will be provided upon booking confirmation.', 50, yPos);
 }

 doc.addPage();

 // === HOTELS PAGE ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor(teal).text('Hotels / Accommodations', 50, 50);
 doc.moveDown(1);

 const hotelNames: { [key: string]: string } = {
 '3': '3 Star Hotel Accommodation',
 '4': '4 Star Hotel Accommodation',
 '5': '5 Star Hotel Accommodation'
 };
 const hotelName = hotelNames[hotelCategory?.charAt(0)] || '4 Star Hotel Accommodation';

 doc.fontSize(12).font('Helvetica-Bold').fillColor(black).text(hotelName, 50, 100);
 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 doc.text(`Room Type: Deluxe Room with Breakfast`, 50, 125);
 doc.text(`Meal Plan: Breakfast Included`, 50, 140);
 doc.text(`Duration: ${template.nights} Nights`, 50, 155);

 // Hotel table
 const hotelTableY = 200;
 doc.rect(50, hotelTableY, 120, 30).fill(lightGray).stroke(teal);
 doc.rect(170, hotelTableY, 200, 30).fill(lightGray).stroke(teal);
 doc.rect(370, hotelTableY, 100, 30).fill(lightGray).stroke(teal);
 doc.rect(470, hotelTableY, 80, 30).fill(lightGray).stroke(teal);

 doc.fontSize(10).font('Helvetica-Bold').fillColor(black);
 doc.text('City', 55, hotelTableY + 10);
 doc.text('Hotel / Accommodation', 175, hotelTableY + 10);
 doc.text('Nights', 375, hotelTableY + 10);
 doc.text('Meals', 475, hotelTableY + 10);

 // Placeholder rows
 doc.font('Helvetica').fillColor(darkGray);
 doc.text(template.destination?.split(',')[0] || 'Vietnam', 55, hotelTableY + 40);
 doc.text(hotelName, 175, hotelTableY + 40);
 doc.text(String(template.nights), 375, hotelTableY + 40);
 doc.text('Breakfast', 475, hotelTableY + 40);

 doc.addPage();

 // === QUOTE PAGE ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor(teal).text('Quote Price', 50, 50);
 doc.moveDown(1);

 doc.fontSize(12).font('Helvetica-Bold').fillColor(teal).text(`Hotel Category: ${hotelCategory?.toUpperCase() || '4 STAR'}`, 50, 100);

 // Pricing table
 const priceY = 140;
 const drawPriceRow = (label: string, value: string, isBold = false) => {
 doc.fontSize(10).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(isBold ? black : darkGray);
 doc.text(label, 50, priceY + (doc.y - priceY));
 doc.text(value, 450, priceY + (doc.y - priceY), { align: 'right' });
 };

 // Draw pricing rows
 let currentY = priceY;
 
 doc.font('Helvetica').fillColor(darkGray);
 doc.text('Hotels (Land Package)', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.hotelInr || 0)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 if (pricing.activities > 0) {
 doc.text('Activities', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.activities)}`, 450, currentY, { align: 'right' });
 currentY += 25;
 }

 if (pricing.transfers > 0) {
 doc.text('Transfers', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.transfers)}`, 450, currentY, { align: 'right' });
 currentY += 25;
 }

 doc.text('Visa', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.visa || 0)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 if (pricing.insurance > 0) {
 doc.text('Travel Insurance', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.insurance)}`, 450, currentY, { align: 'right' });
 currentY += 25;
 }

 if (pricing.arrivalVisa > 0) {
 doc.text('Arrival Visa', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.arrivalVisa)}`, 450, currentY, { align: 'right' });
 currentY += 25;
 }

 if (pricing.other > 0) {
 doc.text(pricing.otherLabel || 'Other', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.other)}`, 450, currentY, { align: 'right' });
 currentY += 25;
 }

 // Line
 currentY += 10;
 doc.moveTo(50, currentY).lineTo(530, currentY).stroke('#E5E7EB');
 currentY += 15;

 doc.text('Subtotal', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.subtotal || pricing.hotelInr)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 doc.text(`Markup (${pricing.markupPercent || 0}%)`, 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.markupAmount || 0)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 doc.text(`GST (${pricing.gstPercent || 5}%)`, 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.gstAmount || 0)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 doc.text(`TCS (${pricing.tcsPercent || 5}%)`, 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.tcsAmount || 0)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 // Total line
 currentY += 10;
 doc.moveTo(50, currentY).lineTo(530, currentY).stroke(teal);
 currentY += 15;

 doc.font('Helvetica-Bold').fillColor(black);
 doc.text('TOTAL (INR)', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.totalInr || 0)}`, 450, currentY, { align: 'right' });
 currentY += 25;

 doc.font('Helvetica');
 doc.text('Per Person', 50, currentY);
 doc.text(`₹ ${formatCurrency(pricing.perPerson || 0)}`, 450, currentY, { align: 'right' });

 doc.addPage();

 // === INCLUSIONS/EXCLUSIONS PAGE ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor(teal).text('Package Inclusions', 50, 50);
 doc.moveDown(1);

 const inclusions = [
 'Accommodation in mentioned hotels or similar',
 'Daily breakfast at hotel',
 'All transfers and sightseeing by private vehicle',
 'English speaking guide for sightseeing',
 'All entrance fees as per itinerary',
 'Govt. taxes'
 ];

 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 inclusions.forEach((item, i) => {
 doc.text(`${i + 1}. ${item}`, { indent: 20 });
 });

 doc.moveDown(2);
 doc.fontSize(18).font('Helvetica-Bold').fillColor('#DC2626').text('Package Exclusions', 50, doc.y + 10);
 doc.moveDown(1);

 const exclusions = [
 'Airfare to/from destination',
 'Any meals other than specified',
 'Personal expenses (telephone calls, laundry, etc.)',
 'Travel insurance (unless specified)',
 'Any optional tours or activities',
 'Tips and gratuities',
 'Anything not mentioned in inclusions'
 ];

 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 exclusions.forEach((item, i) => {
 doc.text(`${i + 1}. ${item}`, { indent: 20 });
 });

 doc.addPage();

 // === HOW TO BOOK PAGE ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor(teal).text('How to Book', 50, 50);
 doc.moveDown(1);

 doc.fontSize(12).font('Helvetica-Bold').fillColor(black).text('Payment Schedule:', 50, 100);
 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 doc.text('• 25% at the time of booking confirmation', 50, 120);
 doc.text('• 50% 45 days before departure', 50, 135);
 doc.text('• 25% 21 days before departure', 50, 150);

 doc.moveDown(2);
 doc.fontSize(12).font('Helvetica-Bold').fillColor(black).text('Bank Account Details:', 50, 190);
 
 const bankY = 210;
 doc.fontSize(10).font('Helvetica-Bold').fillColor(darkGray);
 doc.text('Bank:', 50, bankY);
 doc.text('State Bank of India', 150, bankY);
 doc.text('Account Name:', 50, bankY + 20);
 doc.text('MANY2GOFAMILYHOLIDAYSPRIVATELIMITED', 150, bankY + 20);
 doc.text('Account Number:', 50, bankY + 40);
 doc.text('44312656495', 150, bankY + 40);
 doc.text('IFSC Code:', 50, bankY + 60);
 doc.text('SBIN0006616', 150, bankY + 60);
 doc.text('Branch:', 50, bankY + 80);
 doc.text('Chetpet', 150, bankY + 80);

 doc.addPage();

 // === CANCELLATION POLICY PAGE ===
 doc.fontSize(18).font('Helvetica-Bold').fillColor('#DC2626').text('Cancellation Policy', 50, 50);
 doc.moveDown(1);

 doc.fontSize(10).font('Helvetica').fillColor(darkGray);
 const cancellationTableY = 100;
 
 // Table headers
 doc.rect(50, cancellationTableY, 250, 25).fill(lightGray).stroke(teal);
 doc.rect(300, cancellationTableY, 250, 25).fill(lightGray).stroke(teal);
 doc.font('Helvetica-Bold').fillColor(black);
 doc.text('Cancellation Period', 55, cancellationTableY + 8);
 doc.text('Refund Percentage', 305, cancellationTableY + 8);

 // Table data
 doc.font('Helvetica').fillColor(darkGray);
 const cancellationData = [
 ['21 days or less before departure', '0% (No Refund)'],
 ['22-45 days before departure', '15% deduction'],
 ['46-90 days before departure', '25% deduction'],
 ['91-120 days before departure', '50% deduction'],
 ['More than 120 days', '80% refund']
 ];

 let cancelY = cancellationTableY + 30;
 cancellationData.forEach(([period, refund]) => {
 doc.text(period, 55, cancelY);
 doc.text(refund, 305, cancelY);
   cancelY += 25;
 });

 // Footer note
 doc.moveDown(3);
 doc.fontSize(9).font('Helvetica-Oblique').fillColor(darkGray);
 doc.text('Note: Cancellation charges are calculated on the total package cost.', 50, cancelY + 20);

 // Final page footer
 doc.text('Thank you for choosing MANY2GO FAMILY HOLIDAYS PVT LTD', 50, 750, { align: 'center' });
 doc.text('We wish you a memorable holiday!', 50, 765, { align: 'center' });

 doc.end();

 } catch (error) {
 console.error('Error generating PDF:', error);
 res.status(500).json({ error: 'Failed to generate PDF' });
 }
});

export default router;
