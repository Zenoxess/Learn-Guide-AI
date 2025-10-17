import React from 'react';
import type { GuideStep, SolvedQuestion } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PdfPreviewProps {
  guide?: GuideStep[];
  solvedQuestions?: SolvedQuestion[];
}

// Styles are defined here to be self-contained and not rely on Tailwind.
// This ensures jsPDF's html() method can correctly capture the styling.
const styles = `
  #pdf-content {
    font-family: Arial, sans-serif;
    color: #333333;
    line-height: 1.5;
    background-color: white;
    width: 210mm; /* A4 width */
    box-sizing: border-box;
  }
  #pdf-content h1 {
    font-size: 22pt;
    font-weight: bold;
    color: #1a202c;
    margin-bottom: 8pt;
    padding-bottom: 8pt;
    border-bottom: 2px solid #e2e8f0;
  }
  #pdf-content .subtitle {
      font-size: 10pt;
      color: #718096;
      margin-bottom: 24pt;
  }
  #pdf-content .guide-step, #pdf-content .solved-question {
    page-break-inside: avoid;
    margin-bottom: 20pt;
  }
  #pdf-content h2 {
    font-size: 16pt;
    font-weight: bold;
    color: #2d374d;
    margin-bottom: 12pt;
    padding-bottom: 4pt;
    border-bottom: 1px solid #cbd5e0;
  }
  #pdf-content h3 {
    font-size: 12pt;
    font-weight: bold;
    color: #4a5568;
    margin-top: 16pt;
    margin-bottom: 6pt;
  }
  #pdf-content p, #pdf-content li {
    font-size: 10pt;
    margin-bottom: 6pt;
  }
  #pdf-content ul, #pdf-content ol {
    padding-left: 18pt;
    page-break-inside: avoid;
  }
  #pdf-content blockquote {
    border-left: 3px solid #a0aec0;
    padding-left: 12pt;
    margin-left: 0;
    font-style: italic;
    color: #4a5568;
    page-break-inside: avoid;
  }
  #pdf-content pre, #pdf-content code {
    font-size: 9pt;
    background-color: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 8pt;
    white-space: pre-wrap;
    word-wrap: break-word; /* Use word-wrap instead of break-all */
    page-break-inside: avoid;
  }
`;

export const PdfPreview: React.FC<PdfPreviewProps> = ({ guide, solvedQuestions }) => {
  const mainTitle = guide && guide.length > 0 ? 'Dein persönlicher Lern-Guide' : 'Gelöste Übungsaufgaben';
  const subtitle = `Generiert von Lern-Guide AI am ${new Date().toLocaleDateString('de-DE')}`;

  return (
    <>
      <style>{styles}</style>
      <div id="pdf-content">
        <h1>{mainTitle}</h1>
        <p className="subtitle">{subtitle}</p>

        {guide && guide.map((step, index) => (
          <div key={`guide-${index}`} className="guide-step">
            <h2>{step.title}</h2>
            <MarkdownRenderer content={step.content} />
          </div>
        ))}
        {solvedQuestions && solvedQuestions.map((item, index) => (
          <div key={`solved-${index}`} className="solved-question">
            <h2>{item.title}</h2>
            <div>
              <h3>Antwort</h3>
              <MarkdownRenderer content={item.answer} />
            </div>
            <div>
              <h3>Erklärung</h3>
              <MarkdownRenderer content={item.explanation} />
            </div>
            <div>
              <h3>Referenz im Skript</h3>
              <blockquote>
                <MarkdownRenderer content={item.reference} />
              </blockquote>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};