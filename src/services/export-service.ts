import { saveAs } from 'file-saver';

export interface ExportOptions {
  format: 'txt' | 'pdf' | 'docx' | 'xlsx';
  includeTimestamps?: boolean;
  includeSpeakers?: boolean;
  includeFMRBranding?: boolean;
}

export class ExportService {
  
  async exportTranscript(
    transcript: any,
    options: ExportOptions
  ): Promise<void> {
    switch (options.format) {
      case 'txt':
        await this.exportToTXT(transcript, options);
        break;
      case 'pdf':
        await this.exportToPDF(transcript, options);
        break;
      case 'docx':
        await this.exportToDocx(transcript, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  async exportAnalysis(
    analysisData: any,
    projectInfo: any
  ): Promise<void> {
    // Always export analysis as Excel with FMR branding
    await this.exportToExcel(analysisData, projectInfo);
  }

  private async exportToTXT(transcript: any, options: ExportOptions): Promise<void> {
    let content = '';
    
    if (options.includeFMRBranding) {
      content += 'FMR GLOBAL HEALTH\n';
      content += 'Transcript Intelligence Platform\n';
      content += '================================\n\n';
    }
    
    content += `Project: ${transcript.projectName}\n`;
    content += `Date: ${new Date().toLocaleDateString()}\n`;
    content += `Duration: ${transcript.duration}\n\n`;
    
    if (transcript.speakers && options.includeSpeakers) {
      transcript.speakers.forEach((segment: any) => {
        if (options.includeTimestamps) {
          content += `[${this.formatTime(segment.startTime)}] `;
        }
        content += `${segment.speaker}: ${segment.text}\n\n`;
      });
    } else {
      content += transcript.text;
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${transcript.projectName}_transcript.txt`);
  }

  private async exportToPDF(transcript: any, options: ExportOptions): Promise<void> {
    // For now, create a simple HTML that can be converted to PDF
    // In production, use a proper PDF library like jsPDF or PDFKit
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>FMR Transcript</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #1e40af; }
          .subtitle { color: #666; margin: 10px 0; }
          .metadata { background: #f5f5f5; padding: 15px; margin: 20px 0; }
          .speaker { font-weight: bold; color: #1e40af; }
          .timestamp { color: #666; font-size: 0.9em; }
          .segment { margin: 15px 0; }
        </style>
      </head>
      <body>`;
    
    if (options.includeFMRBranding) {
      htmlContent += `
        <div class="header">
          <div class="logo">FMR GLOBAL HEALTH</div>
          <div class="subtitle">Transcript Intelligence Platform</div>
        </div>`;
    }
    
    htmlContent += `
      <div class="metadata">
        <strong>Project:</strong> ${transcript.projectName}<br>
        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
        <strong>Duration:</strong> ${transcript.duration}
      </div>`;
    
    if (transcript.speakers && options.includeSpeakers) {
      transcript.speakers.forEach((segment: any) => {
        htmlContent += `
          <div class="segment">
            ${options.includeTimestamps ? `<span class="timestamp">[${this.formatTime(segment.startTime)}]</span> ` : ''}
            <span class="speaker">${segment.speaker}:</span> ${segment.text}
          </div>`;
      });
    } else {
      htmlContent += `<div class="segment">${transcript.text}</div>`;
    }
    
    htmlContent += '</body></html>';
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    saveAs(blob, `${transcript.projectName}_transcript.html`);
  }

  private async exportToDocx(transcript: any, options: ExportOptions): Promise<void> {
    // For now, export as RTF which can be opened by Word
    // In production, use a proper DOCX library like docx.js
    
    let rtfContent = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
    
    if (options.includeFMRBranding) {
      rtfContent += '\\f0\\fs28\\b FMR GLOBAL HEALTH\\b0\\par';
      rtfContent += '\\fs20 Transcript Intelligence Platform\\par\\par';
    }
    
    rtfContent += `\\b Project:\\b0 ${transcript.projectName}\\par`;
    rtfContent += `\\b Date:\\b0 ${new Date().toLocaleDateString()}\\par`;
    rtfContent += `\\b Duration:\\b0 ${transcript.duration}\\par\\par`;
    
    if (transcript.speakers && options.includeSpeakers) {
      transcript.speakers.forEach((segment: any) => {
        if (options.includeTimestamps) {
          rtfContent += `[${this.formatTime(segment.startTime)}] `;
        }
        rtfContent += `\\b ${segment.speaker}:\\b0 ${segment.text}\\par\\par`;
      });
    } else {
      rtfContent += `${transcript.text}\\par`;
    }
    
    rtfContent += '}';
    
    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    saveAs(blob, `${transcript.projectName}_transcript.rtf`);
  }

  private async exportToExcel(analysisData: any, projectInfo: any): Promise<void> {
    // Create CSV format that Excel can import
    // In production, use a proper Excel library like SheetJS
    
    let csvContent = '';
    
    // FMR Dish Table
    if (analysisData.fmrDishTable && analysisData.fmrDishTable.length > 0) {
      csvContent += 'FMR DISH ANALYSIS\n';
      csvContent += `Project: ${projectInfo.name}\n`;
      csvContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
      
      csvContent += 'Vashette,Quote,Summary,Theme,Verbatim Code\n';
      analysisData.fmrDishTable.forEach((row: any) => {
        csvContent += `"${row.vashette}","${row.quote}","${row.summary}","${row.theme}","${row.verbatimCode}"\n`;
      });
      csvContent += '\n\n';
    }
    
    // Strategic Themes
    if (analysisData.strategicThemes && analysisData.strategicThemes.length > 0) {
      csvContent += 'STRATEGIC THEMES\n';
      csvContent += 'Theme,Rationale,Supporting Quotes\n';
      analysisData.strategicThemes.forEach((row: any) => {
        csvContent += `"${row.theme}","${row.rationale}","${row.supportingQuotes}"\n`;
      });
      csvContent += '\n\n';
    }
    
    // Journey Table
    if (analysisData.journeyTable && analysisData.journeyTable.length > 0) {
      csvContent += 'JOURNEY ANALYSIS\n';
      csvContent += 'Stage,Action,Emotion,Touchpoint,Quote\n';
      analysisData.journeyTable.forEach((row: any) => {
        csvContent += `"${row.stage}","${row.action}","${row.emotion}","${row.touchpoint}","${row.quote}"\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${projectInfo.name}_FMR_Analysis.csv`);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async exportBulk(items: any[], format: string): Promise<void> {
    // Create a ZIP file with all selected items
    // For now, just trigger individual downloads
    for (const item of items) {
      if (item.type === 'transcript') {
        await this.exportTranscript(item.data, { format: item.format as any });
      } else if (item.type === 'analysis') {
        await this.exportAnalysis(item.data, item.projectInfo);
      }
      
      // Add delay to prevent browser from blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export const exportService = new ExportService();