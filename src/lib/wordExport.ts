import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  HeightRule
} from 'docx';
import { saveAs } from 'file-saver';
import { ResumeData } from '../types';

export const exportToWord = async (data: ResumeData) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: data.personalInfo.fullName.toUpperCase(),
              bold: true,
              size: 28,
              color: "0f172a",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `${data.personalInfo.location} | ${data.personalInfo.phone} | ${data.personalInfo.email}`,
              size: 20,
              color: "64748b",
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        // Summary
        ...(data.personalInfo.summary ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "PROFESSIONAL SUMMARY", bold: true, size: 24 })],
            border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
          }),
          new Paragraph({
            spacing: { before: 120, after: 200 },
            children: [new TextRun({ text: data.personalInfo.summary, size: 22 })],
          }),
        ] : []),

        // Experience
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "PROFESSIONAL EXPERIENCE", bold: true, size: 24 })],
          border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
        }),
        ...data.experience.flatMap(exp => [
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: exp.company, bold: true, size: 22 }),
              new TextRun({ text: `\t${exp.location}`, bold: true, size: 22 }),
            ],
            tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: exp.position, italics: true, size: 22 }),
              new TextRun({ text: `\t${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`, italics: true, size: 22 }),
            ],
            tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
          }),
          ...exp.description.map(bullet => new Paragraph({
            text: bullet,
            bullet: { level: 0 },
            spacing: { before: 80 },
          }))
        ]),

        // Skills
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400 },
          children: [new TextRun({ text: "TECHNICAL SKILLS", bold: true, size: 24 })],
          border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
        }),
        new Paragraph({
          spacing: { before: 120, after: 200 },
          children: [new TextRun({ text: data.skills.join(", "), size: 22 })],
        }),

        // Education
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "EDUCATION", bold: true, size: 24 })],
          border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
        }),
        ...data.education.flatMap(edu => [
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: edu.school, bold: true, size: 22 }),
              new TextRun({ text: `\t${edu.location}`, bold: true, size: 22 }),
            ],
            tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: edu.degree, italics: true, size: 22 }),
              new TextRun({ text: `\t${edu.startDate} - ${edu.endDate}`, italics: true, size: 22 }),
            ],
            tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
          }),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.docx`);
};
