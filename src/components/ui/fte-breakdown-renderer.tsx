import React from 'react';
import { ParentChildData, ParentChildItem } from './parent-child-builder';

interface FTEBreakdownRendererProps {
  data: ParentChildData;
  format?: 'table' | 'list' | 'inline';
  className?: string;
}

export function FTEBreakdownRenderer({ 
  data, 
  format = 'table', 
  className = '' 
}: FTEBreakdownRendererProps) {
  
  const formatValue = (value: number, unit: string) => {
    if (unit === '$') {
      return `$${value.toLocaleString()}`;
    }
    return `${value.toFixed(data.precision || 2)} ${unit}`;
  };

  const totalChildren = data.children.reduce((sum, item) => sum + item.value, 0);
  const isBalanced = Math.abs(totalChildren - data.parentValue) < 0.01;

  if (format === 'table') {
    return (
      <div className={`w-full ${className}`}>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                {data.parentLabel}
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right font-semibold">
                Amount
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right font-semibold">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            {data.children.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                <td className="border border-gray-300 px-4 py-2">{item.label}</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                  {formatValue(item.value, data.parentUnit)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {data.parentValue > 0 ? `${((item.value / data.parentValue) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold">
              <td className="border border-gray-300 px-4 py-2">Total</td>
              <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                {formatValue(totalChildren, data.parentUnit)}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                {data.parentValue > 0 ? `${((totalChildren / data.parentValue) * 100).toFixed(1)}%` : '0%'}
              </td>
            </tr>
          </tbody>
        </table>
        {!isBalanced && (
          <div className="mt-2 text-sm text-amber-600">
            Note: Total allocation ({formatValue(totalChildren, data.parentUnit)}) does not match target ({formatValue(data.parentValue, data.parentUnit)})
          </div>
        )}
      </div>
    );
  }

  if (format === 'list') {
    return (
      <div className={`w-full ${className}`}>
        <h4 className="font-semibold mb-2">{data.parentLabel}</h4>
        <ul className="space-y-1">
          {data.children.map((item) => (
            <li key={item.id} className="flex justify-between items-center">
              <span>{item.label}</span>
              <span className="font-mono">
                {formatValue(item.value, data.parentUnit)} 
                {data.parentValue > 0 && (
                  <span className="text-gray-500 ml-2">
                    ({((item.value / data.parentValue) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center font-semibold">
          <span>Total</span>
          <span className="font-mono">
            {formatValue(totalChildren, data.parentUnit)}
            {data.parentValue > 0 && (
              <span className="text-gray-500 ml-2">
                ({((totalChildren / data.parentValue) * 100).toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (format === 'inline') {
    return (
      <span className={className}>
        {data.children.map((item, index) => (
          <span key={item.id}>
            {item.label}: {formatValue(item.value, data.parentUnit)}
            {index < data.children.length - 1 ? ', ' : ''}
          </span>
        ))}
      </span>
    );
  }

  return null;
}

// Helper function to convert Parent-Child data to HTML string for contract templates
export function renderFTEBreakdownHTML(data: ParentChildData): string {
  const formatValue = (value: number, unit: string) => {
    if (unit === '$') {
      return `$${value.toLocaleString()}`;
    }
    return `${value.toFixed(data.precision || 2)} ${unit}`;
  };

  const totalChildren = data.children.reduce((sum, item) => sum + item.value, 0);

  let html = `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; margin: 10px 0;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-weight: 600;">
            ${data.parentLabel}
          </th>
          <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-weight: 600;">
            Amount
          </th>
          <th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-weight: 600;">
            Percentage
          </th>
        </tr>
      </thead>
      <tbody>
  `;

  data.children.forEach((item, index) => {
    const percentage = data.parentValue > 0 ? ((item.value / data.parentValue) * 100).toFixed(1) : '0';
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    html += `
      <tr style="background-color: ${bgColor};">
        <td style="border: 1px solid #d1d5db; padding: 8px 12px;">${item.label}</td>
        <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-family: monospace;">
          ${formatValue(item.value, data.parentUnit)}
        </td>
        <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right;">
          ${percentage}%
        </td>
      </tr>
    `;
  });

  const totalPercentage = data.parentValue > 0 ? ((totalChildren / data.parentValue) * 100).toFixed(1) : '0';
  
  html += `
        <tr style="background-color: #e5e7eb; font-weight: 600;">
          <td style="border: 1px solid #d1d5db; padding: 8px 12px;">Total</td>
          <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-family: monospace;">
            ${formatValue(totalChildren, data.parentUnit)}
          </td>
          <td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: right;">
            ${totalPercentage}%
          </td>
        </tr>
      </tbody>
    </table>
  `;

  return html;
}

// Helper function to convert Parent-Child data to plain text for simple contracts
export function renderFTEBreakdownText(data: ParentChildData): string {
  const formatValue = (value: number, unit: string) => {
    if (unit === '$') {
      return `$${value.toLocaleString()}`;
    }
    return `${value.toFixed(data.precision || 2)} ${unit}`;
  };

  let text = `${data.parentLabel}:\n`;
  
  data.children.forEach((item) => {
    const percentage = data.parentValue > 0 ? ((item.value / data.parentValue) * 100).toFixed(1) : '0';
    text += `  • ${item.label}: ${formatValue(item.value, data.parentUnit)} (${percentage}%)\n`;
  });

  const totalChildren = data.children.reduce((sum, item) => sum + item.value, 0);
  const totalPercentage = data.parentValue > 0 ? ((totalChildren / data.parentValue) * 100).toFixed(1) : '0';
  
  text += `  Total: ${formatValue(totalChildren, data.parentUnit)} (${totalPercentage}%)`;

  return text;
} 