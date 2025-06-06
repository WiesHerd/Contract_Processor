import { Provider } from '../../types/provider';
import { Template } from '../../types/template';
import { FieldMapping } from '../templates/mappingsSlice';

interface MergeResult {
  content: string;
  warnings: string[];
}

/**
 * Formats a number as currency
 */
const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? Number(String(amount).replace(/[^0-9.]/g, '')) : amount;
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Formats a number as currency with two decimals
 */
const formatCurrency2 = (amount: number | string): string => {
  const num = typeof amount === 'string' ? Number(String(amount).replace(/[^0-9.]/g, '')) : amount;
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Formats a number with commas
 */
const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
};

/**
 * Formats a date string to MM/DD/YYYY
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

/**
 * Generates FTE breakdown text
 */
const generateFTEBreakdown = (fte: number): string => {
  const hours = Math.round(fte * 40);
  return `${fte} FTE (${hours} hours per week)`;
};

/**
 * Merges provider data with template content
 */
export const mergeTemplateWithData = (
  template: Template,
  provider: Provider,
  templateContent: string,
  mapping?: FieldMapping[]
): MergeResult => {
  const warnings: string[] = [];
  let content = templateContent;

  // Add CSS styling for Word document
  const wordStyles = `
    <style>
      @page {
        margin: 0.5in;
      }
      body {
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        margin: 0;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Calibri Light', 'Arial', sans-serif;
        margin-top: 1em;
        margin-bottom: 0.5em;
      }
      h1 { font-size: 16pt; }
      h2 { font-size: 14pt; }
      h3 { font-size: 13pt; }
      p { margin-bottom: 0.5em; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      th, td {
        border: 1px solid #000;
        padding: 0.5em;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .signature-block {
        margin-top: 2em;
        border-top: 1px solid #000;
        padding-top: 1em;
      }
    </style>
  `;

  // Wrap content in proper HTML structure with styles
  content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${wordStyles}
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;

  // If mapping is provided, use it to resolve placeholders
  if (mapping && Array.isArray(mapping)) {
    mapping.forEach(({ placeholder, mappedColumn }) => {
      if (!placeholder || !mappedColumn) return;
      let value = provider[mappedColumn];
      // Apply formatting for known fields
      const key = mappedColumn.toLowerCase();
      if ([
        'basesalary', 'signingbonus', 'relocationbonus', 'qualitybonus', 'cmeamount', 'retentionbonus'
      ].includes(key)) {
        value = formatCurrency(value ?? '');
      } else if (['conversionfactor'].includes(key)) {
        value = formatCurrency2(value ?? '');
      } else if (['wrvutarget'].includes(key)) {
        value = formatNumber(value ?? '');
      } else if (['startdate', 'originalagreementdate'].includes(key)) {
        value = formatDate(String(value ?? ''));
      } else if (key === 'fte') {
        value = typeof value === 'number' ? value.toFixed(2) : String(value ?? '');
      }
      content = content.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value ?? ''));
    });
  } else {
    // Fallback to old logic if no mapping is provided
    const placeholderMap: Record<string, string> = {
      '{{ProviderName}}': `${provider.name}, ${provider.credentials}`,
      '{{StartDate}}': formatDate(provider.startDate),
      '{{BaseSalary}}': formatCurrency(provider.baseSalary),
      '{{FTE}}': provider.fte.toString(),
      '{{FTEBreakdown}}': generateFTEBreakdown(provider.fte),
      '{{Specialty}}': provider.specialty,
    };
    if (provider.wRVUTarget) {
      placeholderMap['{{wRVUTarget}}'] = formatNumber(provider.wRVUTarget);
    }
    if (provider.conversionFactor) {
      placeholderMap['{{ConversionFactor}}'] = formatCurrency2(provider.conversionFactor);
    }
    if (provider.retentionBonus) {
      placeholderMap['{{RetentionBonus}}'] = formatCurrency(provider.retentionBonus);
    }
    if (provider.signingBonus) {
      placeholderMap['{{SigningBonus}}'] = formatCurrency(provider.signingBonus);
    }
    if (provider.relocationBonus) {
      placeholderMap['{{RelocationBonus}}'] = formatCurrency(provider.relocationBonus);
    }
    if (provider.qualityBonus) {
      placeholderMap['{{QualityBonus}}'] = formatCurrency(provider.qualityBonus);
    }
    if (provider.cmeAmount) {
      placeholderMap['{{CMEAmount}}'] = formatCurrency(provider.cmeAmount);
    }
    if (provider.originalAgreementDate) {
      placeholderMap['{{OriginalAgreementDate}}'] = formatDate(String(provider.originalAgreementDate));
    }
    Object.entries(placeholderMap).forEach(([placeholder, value]) => {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
  }

  // Check for any remaining placeholders
  const remainingPlaceholders = content.match(/{{[^}]+}}/g);
  if (remainingPlaceholders) {
    warnings.push(
      `Warning: The following placeholders were not replaced: ${remainingPlaceholders.join(', ')}`
    );
  }

  return { content, warnings };
}; 