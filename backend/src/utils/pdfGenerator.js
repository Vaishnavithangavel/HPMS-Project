const PDFDocument = require('pdfkit');

/**
 * Generates a medical record summary PDF.
 * @param {Object} data - Medical record, patient and doctor details.
 * @param {res} res - Express response stream.
 */
function generateMedicalRecordPDF(data, res) {
  const doc = new PDFDocument({ margin: 50 });

  // Stream the PDF directly to the express response
  doc.pipe(res);

  // Colors
  const primaryColor = '#1e3a8a'; // Deep Navy
  const secondaryColor = '#475569'; // Slate Gray
  const textColor = '#1f2937'; // Dark Gray
  const borderColor = '#e5e7eb'; // Light Gray

  // 1. Header & Hospital Info
  doc
    .fillColor(primaryColor)
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('HOPEWELL GENERAL HOSPITAL', { align: 'center' });
  
  doc
    .fillColor(secondaryColor)
    .fontSize(10)
    .font('Helvetica')
    .text('100 Care Circle, Suite 500, Health City | Tel: (555) 019-2834 | clinic@hopewell.org', { align: 'center' })
    .moveDown(1.5);

  // Border line
  doc
    .strokeColor(primaryColor)
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(562, doc.y)
    .stroke()
    .moveDown(2);

  // 2. Report Title
  doc
    .fillColor(textColor)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('MEDICAL CONSULTATION REPORT', { align: 'center' })
    .moveDown(1.5);

  // 3. Patient & Doctor Info Grid (2 columns)
  const gridStartY = doc.y;
  
  // Left Column - Patient
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('PATIENT INFORMATION', 50, gridStartY)
    .font('Helvetica')
    .moveDown(0.5)
    .text(`Name: ${data.patient_name}`)
    .text(`Age / Gender: ${data.patient_age} yrs / ${data.patient_gender}`)
    .text(`Contact: ${data.patient_contact}`)
    .text(`Emergency Contact: ${data.emergency_contact || 'N/A'}`);

  // Right Column - Doctor & Visit
  doc
    .font('Helvetica-Bold')
    .text('CONSULTATION DETAILS', 320, gridStartY)
    .font('Helvetica')
    .moveDown(0.5)
    .text(`Date of Visit: ${new Date(data.visit_date).toLocaleDateString()}`)
    .text(`Attending Doctor: ${data.doctor_name}`)
    .text(`Specialty: ${data.specialty}`)
    .text(`Record Reference: #MR-00${data.id}`);

  doc.moveDown(3);

  // Reset doc margins or x coordinate
  doc.x = 50;

  // Horizontal Divider
  doc
    .strokeColor(borderColor)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(562, doc.y)
    .stroke()
    .moveDown(1.5);

  // 4. Clinical Details Sections
  
  // A. Diagnosis
  doc
    .fillColor(primaryColor)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('DIAGNOSIS & CLINICAL FINDINGS')
    .moveDown(0.5)
    .fillColor(textColor)
    .fontSize(10)
    .font('Helvetica')
    .text(data.diagnosis || 'No diagnosis recorded.')
    .moveDown(2);

  // B. Treatment / Plan
  doc
    .fillColor(primaryColor)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TREATMENT PLAN & INTERVENTIONS')
    .moveDown(0.5)
    .fillColor(textColor)
    .fontSize(10)
    .font('Helvetica')
    .text(data.treatment || 'No treatment plan recorded.')
    .moveDown(2);

  // C. Prescriptions
  doc
    .fillColor(primaryColor)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('PRESCRIPTION & PHARMACY INSTRUCTIONS')
    .moveDown(0.5)
    .fillColor(textColor)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Rx:', { continued: true })
    .font('Helvetica')
    .text(`\n${data.prescription || 'No prescriptions provided.'}`)
    .moveDown(4);

  // 5. Signatures
  const signatureY = doc.y;
  
  doc
    .strokeColor(secondaryColor)
    .lineWidth(0.5)
    .moveTo(350, signatureY)
    .lineTo(530, signatureY)
    .stroke()
    .moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor(secondaryColor)
    .text('Authorized Signature (Attending Physician)', 350, signatureY + 5, { align: 'center' });

  // 6. Footer
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .text(
        'CONFIDENTIAL MEDICAL RECORD - HOPEWELL GENERAL HOSPITAL - FOR CLINICAL USE ONLY',
        50,
        740,
        { align: 'center', width: 512 }
      );
  }

  // End the document
  doc.end();
}

module.exports = {
  generateMedicalRecordPDF,
};
