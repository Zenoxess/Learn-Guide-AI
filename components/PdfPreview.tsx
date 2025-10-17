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
    color: #333;
    line-height: 1.6;
    padding: 15mm;
    background-color: white;
    width: 210mm;
    box-sizing: border-box;
  }
  #pdf-content h1 {
    font-size: 24pt;
    font-weight: bold;
    color: #2D3748;
    margin-bottom: 20pt;
    border-bottom: 2px solid #E2E8F0;
    padding-bottom: 10pt;
  }
  #pdf-content .guide-step, #pdf-content .solved-question {
    margin-bottom: 25pt;
    page-break-inside: avoid;
  }
  #pdf-content h2 {
    font-size: 18pt;
    font-weight: bold;
    color: #2D3748;
    margin-bottom: 15pt;
    border-bottom: 1px solid #CBD5E0;
    padding-bottom: 5pt;
  }
  #pdf-content h3 {
    font-size: 14pt;
    font-weight: bold;
    color: #4A5568;
    margin-top: 15pt;
    margin-bottom: 8pt;
  }
  #pdf-content p, #pdf-content li {
    font-size: 11pt;
    margin-bottom: 8pt;
  }
  #pdf-content ul, #pdf-content ol {
    padding-left: 20pt;
  }
  #pdf-content blockquote {
    border-left: 4px solid #A0AEC0;
    padding-left: 15pt;
    margin-left: 0;
    font-style: italic;
    color: #4A5568;
  }
  #pdf-content pre, #pdf-content code {
    font-size: 9pt;
    background-color: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 8pt;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

export const PdfPreview: React.FC<PdfPreviewProps> = ({ guide, solvedQuestions }) => {
  const mainTitle = guide && guide.length > 0 ? 'Dein persönlicher Lern-Guide' : 'Gelöste Übungsaufgaben';

  return (
    <>
      <style>{styles}</style>
      <div id="pdf-content">
        <h1>{mainTitle}</h1>
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
