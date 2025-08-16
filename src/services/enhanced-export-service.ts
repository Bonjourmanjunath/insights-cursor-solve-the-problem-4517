import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType, TextRun, WidthType, TableLayoutType } from 'docx';
import { saveAs } from 'file-saver';

export interface TranscriptData {
  id: string;
  file_name: string;
  display_name?: string;
  transcript_content: string;
  duration_seconds?: number;
  speaker_count?: number;
  language_detected?: string;
  created_at: string;
  project?: {
    name: string;
    description?: string;
  };
  metadata?: {
    projectNumber?: string;
    market?: string;
    respondentInitials?: string;
    specialty?: string;
  };
  // New fields from database
  project_number?: string;
  market?: string;
  interview_date?: string;
  respondent_initials?: string;
  specialty?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt';
  includeFMRBranding: boolean;
  includeTimestamps: boolean;
  includeSpeakers: boolean;
}

export class EnhancedExportService {
  
  async exportTranscript(transcript: TranscriptData, options: ExportOptions): Promise<void> {
    switch (options.format) {
      case 'pdf':
        await this.exportToPDF(transcript, options);
        break;
      case 'docx':
        await this.exportToDocx(transcript, options);
        break;
      case 'txt':
        await this.exportToTXT(transcript, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private parseTranscriptContent(content: string): Array<{ speaker: string; text: string; timestamp?: string }> {
    if (!content) return [];
    
    const lines = content.split('\n').filter(line => line.trim());
    const parsedSegments: Array<{ speaker: string; text: string; timestamp?: string }> = [];
    
    for (const line of lines) {
      // Try to match I: or R: pattern
      const speakerMatch = line.match(/^(I|R):\s*(.+)$/);
      if (speakerMatch) {
        parsedSegments.push({
          speaker: speakerMatch[1] === 'I' ? 'Interviewer' : 'Respondent',
          text: speakerMatch[2].trim(),
        });
      } else {
        // If no I:/R: pattern, treat as general content
        parsedSegments.push({
          speaker: 'Speaker',
          text: line.trim(),
        });
      }
    }
    
    return parsedSegments;
  }

  private async exportToPDF(transcript: TranscriptData, options: ExportOptions): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;
    
    // Header with FMR branding (text only)
    if (options.includeFMRBranding) {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FMR GLOBAL HEALTH', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Transcript Intelligence Platform', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Horizontal line separator
      doc.setLineWidth(1);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 15;
    }
    
    // Project Information Table (matching your image layout)
    doc.setFontSize(11);
    
    const displayName = transcript.display_name || transcript.file_name.replace(/\.[^/.]+$/, '');
    const tableData = [
      ['Project:', transcript.project?.name || displayName],
      ['Market:', transcript.market || transcript.metadata?.market || 'Global'],
      ['Date:', new Date(transcript.created_at).toLocaleDateString('en-GB').replace(/\//g, '/')],
      ['Resp. Initials:', transcript.respondent_initials || transcript.metadata?.respondentInitials || 'R.S.'],
      ['Specialty:', transcript.specialty || transcript.metadata?.specialty || 'Healthcare Professional'],
      ['Duration:', transcript.duration_seconds ? `${Math.floor(transcript.duration_seconds / 60)} min` : 'N/A'],
      ['Language:', transcript.language_detected || 'en']
    ];
    
    tableData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPosition);
      yPosition += 7;
    });
    
    yPosition += 15;
    
    // TRANSCRIPT heading (bold, larger)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSCRIPT', 20, yPosition);
    yPosition += 12;
    
    const segments = this.parseTranscriptContent(transcript.transcript_content || '');
    doc.setFontSize(11);
    
    for (const segment of segments) {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Speaker label (I: or R:)
      doc.setFont('helvetica', 'bold');
      const speakerLabel = segment.speaker === 'Interviewer' ? 'I:' : 'R:';
      doc.text(speakerLabel, 20, yPosition);
      
      // Text content with proper line wrapping
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(segment.text, 155);
      doc.text(textLines, 35, yPosition);
      yPosition += (textLines.length * 5) + 3;
    }
    
    // Save the PDF
    const fileName = `${(transcript.display_name || transcript.file_name).replace(/\.[^/.]+$/, '')}_transcript.pdf`;
    doc.save(fileName);
  }

  private async exportToDocx(transcript: TranscriptData, options: ExportOptions): Promise<void> {
    const children: any[] = [];
    
    // Header with FMR branding
    if (options.includeFMRBranding) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'FMR GLOBAL HEALTH',
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Transcript Intelligence Platform',
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }
    
    // Project Information Table
    const infoTable = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Project:', bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: transcript.project?.name || transcript.display_name || transcript.file_name })] })],
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Market:', bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: transcript.metadata?.market || 'N/A' })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: new Date(transcript.created_at).toLocaleDateString() })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Resp. Initials:', bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: transcript.metadata?.respondentInitials || 'N/A' })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Specialty:', bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: transcript.metadata?.specialty || 'N/A' })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Duration:', bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: transcript.duration_seconds ? `${Math.floor(transcript.duration_seconds / 60)} min` : 'N/A' 
                })] 
              })],
            }),
          ],
        }),
      ],
    });
    
    children.push(infoTable);
    
    // Transcript heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'TRANSCRIPT',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );
    
    // Transcript content
    const segments = this.parseTranscriptContent(transcript.transcript_content || '');
    
    for (const segment of segments) {
      const speakerLabel = segment.speaker === 'Interviewer' ? 'I:' : 'R:';
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${speakerLabel} `,
              bold: true,
            }),
            new TextRun({
              text: segment.text,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }
    
    const doc = new Document({
      sections: [
        {
          children,
        },
      ],
    });
    
    const blob = await Packer.toBlob(doc);
    const fileName = `${(transcript.display_name || transcript.file_name).replace(/\.[^/.]+$/, '')}_transcript.docx`;
    saveAs(blob, fileName);
  }

  private async exportToTXT(transcript: TranscriptData, options: ExportOptions): Promise<void> {
    let content = '';
    
    // Header with FMR branding
    if (options.includeFMRBranding) {
      content += 'FMR GLOBAL HEALTH\n';
      content += 'Transcript Intelligence Platform\n';
      content += '================================\n\n';
    }
    
    // Project information
    content += 'PROJECT INFORMATION\n';
    content += '==================\n';
    content += `Project: ${transcript.project?.name || transcript.display_name || transcript.file_name}\n`;
    content += `Market: ${transcript.market || transcript.metadata?.market || 'N/A'}\n`;
    content += `Date: ${new Date(transcript.created_at).toLocaleDateString()}\n`;
    content += `Resp. Initials: ${transcript.respondent_initials || transcript.metadata?.respondentInitials || 'N/A'}\n`;
    content += `Specialty: ${transcript.specialty || transcript.metadata?.specialty || 'N/A'}\n`;
    content += `Duration: ${transcript.duration_seconds ? `${Math.floor(transcript.duration_seconds / 60)} min` : 'N/A'}\n`;
    content += `Language: ${transcript.language_detected || 'N/A'}\n\n`;
    
    // Transcript content
    content += 'TRANSCRIPT\n';
    content += '==========\n\n';
    
    const segments = this.parseTranscriptContent(transcript.transcript_content || '');
    
    for (const segment of segments) {
      const speakerLabel = segment.speaker === 'Interviewer' ? 'I:' : 'R:';
      content += `${speakerLabel} ${segment.text}\n\n`;
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const fileName = `${(transcript.display_name || transcript.file_name).replace(/\.[^/.]+$/, '')}_transcript.txt`;
    saveAs(blob, fileName);
  }
}

export const enhancedExportService = new EnhancedExportService();