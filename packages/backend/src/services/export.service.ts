import { PrismaClient } from '@prisma/client';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';

const prisma = new PrismaClient();

/**
 * Escape HTML special characters to prevent injection when user-controlled
 * fields (applicantName, referenceNumber, officer name, risk findings) are
 * interpolated into the report template.
 */
function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getSessionWithClauses(sessionId: string) {
  return prisma.lCSession.findUnique({
    where: { id: sessionId },
    include: {
      clauses: {
        orderBy: { clauseIndex: 'asc' },
        include: {
          officerDecision: true,
          alternatives: true,
        },
      },
      officer: { select: { name: true, email: true } },
    },
  });
}

function buildReportHTML(session: Awaited<ReturnType<typeof getSessionWithClauses>>): string {
  if (!session) return '<html><body>Session not found</body></html>';

  const riskCounts = {
    HIGH: session.clauses.filter((c) => c.riskLevel === 'HIGH').length,
    MEDIUM: session.clauses.filter((c) => c.riskLevel === 'MEDIUM').length,
    LOW: session.clauses.filter((c) => c.riskLevel === 'LOW').length,
    COMPLIANT: session.clauses.filter((c) => c.riskLevel === 'COMPLIANT').length,
  };

  const clauseRows = session.clauses
    .map((c) => {
      const findings = Array.isArray(c.riskFindings)
        ? (c.riskFindings as Array<{ issue: string }>).map((f) => f.issue).join('; ')
        : '';
      const riskColor =
        c.riskLevel === 'HIGH'
          ? '#dc2626'
          : c.riskLevel === 'MEDIUM'
          ? '#d97706'
          : c.riskLevel === 'LOW'
          ? '#ca8a04'
          : '#16a34a';
      return `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${esc(c.clauseIndex)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${esc(c.clauseType.replace(/_/g, ' '))}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;color:${riskColor};font-weight:bold;">${esc(c.riskLevel)}${c.isSoftClause ? ' &#9888;' : ''}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${esc(findings)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${esc(c.officerDecision?.decision?.replace(/_/g, ' ') ?? 'Pending')}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; }
    .header { background: #1e3a5f; color: white; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .content { padding: 32px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .meta-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; }
    .meta-item label { font-size: 11px; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 4px; }
    .meta-item span { font-size: 14px; font-weight: 600; }
    .risk-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .risk-card { border-radius: 8px; padding: 16px; text-align: center; color: white; }
    .risk-card.high { background: #dc2626; }
    .risk-card.medium { background: #d97706; }
    .risk-card.low { background: #ca8a04; }
    .risk-card.compliant { background: #16a34a; }
    .risk-card .count { font-size: 32px; font-weight: 700; line-height: 1; }
    .risk-card .label { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    h2 { font-size: 16px; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: left; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { background: #f3f4f6; padding: 16px 32px; font-size: 11px; color: #6b7280; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LC SCRUTINY REPORT</h1>
    <p>Confidential — For Internal Bank Use Only</p>
  </div>
  <div class="content">
    <div class="meta-grid">
      <div class="meta-item"><label>LC Reference</label><span>${esc(session.referenceNumber)}</span></div>
      <div class="meta-item"><label>Applicant</label><span>${esc(session.applicantName)}</span></div>
      <div class="meta-item"><label>LC Type</label><span>${esc(session.lcType)}</span></div>
      <div class="meta-item"><label>Reviewing Officer</label><span>${esc(session.officer.name)}</span></div>
      <div class="meta-item"><label>Report Date</label><span>${esc(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))}</span></div>
      <div class="meta-item"><label>Status</label><span>${esc(session.status)}</span></div>
    </div>
    <h2>Risk Summary</h2>
    <div class="risk-cards">
      <div class="risk-card high"><div class="count">${riskCounts.HIGH}</div><div class="label">HIGH RISK</div></div>
      <div class="risk-card medium"><div class="count">${riskCounts.MEDIUM}</div><div class="label">MEDIUM RISK</div></div>
      <div class="risk-card low"><div class="count">${riskCounts.LOW}</div><div class="label">LOW RISK</div></div>
      <div class="risk-card compliant"><div class="count">${riskCounts.COMPLIANT}</div><div class="label">COMPLIANT</div></div>
    </div>
    <h2>Clause Analysis</h2>
    <table>
      <thead><tr><th>#</th><th>Clause Type</th><th>Risk Level</th><th>Key Findings</th><th>Decision</th></tr></thead>
      <tbody>${clauseRows}</tbody>
    </table>
  </div>
  <div class="footer">
    Generated: ${esc(new Date().toISOString())} | Session ID: ${esc(session.id)} | System: LC Clause Negotiation Copilot
  </div>
</body>
</html>`;
}

export async function exportToPDF(sessionId: string): Promise<Buffer> {
  const session = await getSessionWithClauses(sessionId);
  if (!session) throw new Error('Session not found');

  const html = buildReportHTML(session);

  // Dynamic import to avoid startup cost
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Defense-in-depth: the report is static HTML — disable JS and block all
    // outbound requests so any residual injection cannot reach the network
    // (e.g. cloud instance metadata) from inside the backend host.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (reqIntercept) => {
      const url = reqIntercept.url();
      if (url.startsWith('data:') || url.startsWith('about:')) {
        reqIntercept.continue();
      } else {
        reqIntercept.abort();
      }
    });
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function exportToDOCX(sessionId: string): Promise<Buffer> {
  const session = await getSessionWithClauses(sessionId);
  if (!session) throw new Error('Session not found');

  const riskCounts = {
    HIGH: session.clauses.filter((c) => c.riskLevel === 'HIGH').length,
    MEDIUM: session.clauses.filter((c) => c.riskLevel === 'MEDIUM').length,
    LOW: session.clauses.filter((c) => c.riskLevel === 'LOW').length,
    COMPLIANT: session.clauses.filter((c) => c.riskLevel === 'COMPLIANT').length,
  };

  const riskTableRows = [
    new TableRow({
      children: ['Risk Level', 'Count'].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
              }),
            ],
            shading: { fill: '1e3a5f' },
          })
      ),
    }),
    ...(['HIGH', 'MEDIUM', 'LOW', 'COMPLIANT'] as const).map(
      (level) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(level)] }),
            new TableCell({
              children: [new Paragraph(String(riskCounts[level]))],
            }),
          ],
        })
    ),
  ];

  const clauseTableRows = [
    new TableRow({
      children: ['#', 'Type', 'Risk', 'Finding', 'Decision'].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
              }),
            ],
            shading: { fill: '1e3a5f' },
            width: { size: 20, type: WidthType.PERCENTAGE },
          })
      ),
    }),
    ...session.clauses.map(
      (c) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(String(c.clauseIndex))] }),
            new TableCell({
              children: [new Paragraph(c.clauseType.replace(/_/g, ' '))],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: c.riskLevel + (c.isSoftClause ? ' ⚠' : ''),
                      bold: true,
                      color:
                        c.riskLevel === 'HIGH'
                          ? 'DC2626'
                          : c.riskLevel === 'MEDIUM'
                          ? 'D97706'
                          : c.riskLevel === 'LOW'
                          ? 'CA8A04'
                          : '16A34A',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph(
                  Array.isArray(c.riskFindings)
                    ? (c.riskFindings as Array<{ issue: string }>)
                        .map((f) => f.issue)
                        .join('; ')
                    : ''
                ),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph(
                  c.officerDecision?.decision?.replace(/_/g, ' ') ?? 'Pending'
                ),
              ],
            }),
          ],
        })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          // Cover page
          new Paragraph({
            text: 'LC SCRUTINY REPORT',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CONFIDENTIAL – FOR INTERNAL BANK USE ONLY', bold: true }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: `LC Reference: ${session.referenceNumber}`, bold: true })],
          }),
          new Paragraph({ text: `Applicant: ${session.applicantName}` }),
          new Paragraph({ text: `LC Type: ${session.lcType}` }),
          new Paragraph({ text: `Reviewing Officer: ${session.officer.name}` }),
          new Paragraph({ text: `Report Date: ${new Date().toLocaleDateString('en-GB')}` }),
          new Paragraph({ text: '' }),

          // Risk summary
          new Paragraph({ text: 'EXECUTIVE RISK SUMMARY', heading: HeadingLevel.HEADING_1 }),
          new Table({
            rows: riskTableRows,
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
          new Paragraph({ text: '' }),

          // Clause analysis
          new Paragraph({ text: 'CLAUSE-BY-CLAUSE ANALYSIS', heading: HeadingLevel.HEADING_1 }),
          new Table({
            rows: clauseTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
          new Paragraph({ text: '' }),

          // Footer info
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${new Date().toISOString()} | Session ID: ${session.id}`,
                size: 18,
                color: '6B7280',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
