import { formatCurrency, formatDate } from '@/utils/format';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { DynamicBlockService } from '@/services/dynamicBlockService';

interface FieldMapping {
  placeholder: string;
  mappedColumn?: string;
  notes?: string;
}

interface EnhancedFieldMapping extends FieldMapping {
  mappedDynamicBlock?: string;
  mappingType?: 'field' | 'dynamic';
}

interface MergeResult {
  content: string;
  warnings: string[];
}

// Cache for dynamic blocks to avoid repeated database calls
const dynamicBlockCache = new Map<string, any>();

/**
 * Evaluates a dynamic block condition against provider data
 */
const evaluateCondition = (condition: any, provider: Provider): boolean => {
  let fieldValue = getProviderFieldValue(provider, condition.field);
  
  // Handle undefined fields
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }
  
  const compareValue = parseFloat(condition.value);
  
  // Handle non-numeric values
  if (isNaN(compareValue)) {
    return false;
  }
  
  // Convert fieldValue to number if it's a string
  const numericFieldValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue;
  
  if (isNaN(numericFieldValue)) {
    return false;
  }
  
  switch (condition.operator) {
    case '>': return numericFieldValue > compareValue;
    case '>=': return numericFieldValue >= compareValue;
    case '=': return numericFieldValue === compareValue;
    case '!=': return numericFieldValue !== compareValue;
    case '<': return numericFieldValue < compareValue;
    case '<=': return numericFieldValue <= compareValue;
    default: return false;
  }
};

/**
 * Generates dynamic block content using the stored logic
 */
const generateDynamicBlockContent = async (blockId: string, provider: Provider): Promise<string> => {
  try {
    // Check cache first
    if (dynamicBlockCache.has(blockId)) {
      console.log('🎯 Using cached dynamic block:', blockId);
    } else {
      console.log('🔄 Loading dynamic block from database:', blockId);
      const block = await DynamicBlockService.getDynamicBlock(blockId);
      dynamicBlockCache.set(blockId, block);
    }
    
    const block = dynamicBlockCache.get(blockId);
    if (!block) {
      console.error('❌ Dynamic block not found:', blockId);
      return 'Dynamic block not found';
    }
    
    console.log('📊 Generating dynamic block content for:', block.name);
    console.log('🔍 Block data:', {
      conditions: block.conditions,
      alwaysInclude: block.alwaysInclude,
      outputType: block.outputType
    });
    
    const items: Array<{label: string, value: string}> = [];
    
    // Parse conditions if they're JSON strings
    let conditions = block.conditions;
    if (typeof conditions === 'string') {
      try {
        conditions = JSON.parse(conditions);
        console.log('✅ Parsed conditions from JSON string:', conditions);
      } catch (e) {
        console.error('❌ Failed to parse conditions JSON:', e);
        conditions = [];
      }
    }
    
    // Add conditional items (only show if condition is met)
    if (conditions && Array.isArray(conditions)) {
      console.log('🔍 Processing', conditions.length, 'conditions');
      conditions.forEach((condition: any, index: number) => {
        console.log(`  Condition ${index + 1}:`, condition);
        if (condition.field && condition.label) {
          const conditionMet = evaluateCondition(condition, provider);
          console.log(`    Condition met: ${conditionMet}`);
          if (conditionMet) {
            const fieldValue = getProviderFieldValue(provider, condition.field);
            console.log(`    Field value: ${fieldValue}`);
            if (fieldValue !== undefined && fieldValue !== null) {
              // Only include items with values > 0
              const numValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue;
              if (!isNaN(numValue) && numValue > 0) {
                const displayValue = typeof fieldValue === 'number' ? fieldValue.toLocaleString() : fieldValue.toString();
                items.push({ label: condition.label, value: displayValue });
                console.log(`    ✅ Added item: ${condition.label} = ${displayValue}`);
              } else {
                console.log(`    ❌ Field value is 0 or not a positive number: ${fieldValue}`);
              }
            }
          }
        }
      });
    }
    
    // Parse alwaysInclude if they're JSON strings
    let alwaysInclude = block.alwaysInclude;
    if (typeof alwaysInclude === 'string') {
      try {
        alwaysInclude = JSON.parse(alwaysInclude);
        console.log('✅ Parsed alwaysInclude from JSON string:', alwaysInclude);
      } catch (e) {
        console.error('❌ Failed to parse alwaysInclude JSON:', e);
        alwaysInclude = [];
      }
    }
    
    // Add always include items
    if (alwaysInclude && Array.isArray(alwaysInclude)) {
      console.log('🔍 Processing', alwaysInclude.length, 'always include items');
      alwaysInclude.forEach((item: any, index: number) => {
        console.log(`  Always include ${index + 1}:`, item);
        if (item.label && item.valueField) {
          const value = getProviderFieldValue(provider, item.valueField);
          console.log(`    Field value: ${value}`);
          if (value !== undefined && value !== null) {
            // Only include items with values > 0
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (!isNaN(numValue) && numValue > 0) {
              const displayValue = typeof value === 'number' ? value.toLocaleString() : value.toString();
              items.push({ label: item.label, value: displayValue });
              console.log(`    ✅ Added item: ${item.label} = ${displayValue}`);
            } else {
              console.log(`    ❌ Field value is 0 or not a positive number: ${value}`);
            }
          }
        }
      });
    }
    
    console.log('📋 Total items to render:', items.length, items);
    
    // Return empty if no items
    if (items.length === 0) {
      return '';
    }
    
    // Format based on output type
    switch (block.outputType) {
      case 'bullets':
        const bulletItems = items.map(item => 
          `<li style="margin: 2px 0; font-size: 11pt; line-height: 1.4;"><strong>${item.label}</strong>: ${item.value}</li>`
        ).join('');
        return `<ul style="margin: 10px 0; padding-left: 20px; font-size: 11pt; list-style-type: disc;">${bulletItems}</ul>`;
        
      case 'table':
        const tableRows = items.map(item => 
          `<tr><td style="border: 1px solid #ddd; padding: 6px 8px; font-weight: bold; width: 60%; font-size: 11pt;">${item.label}</td><td style="border: 1px solid #ddd; padding: 6px 8px; width: 40%; font-size: 11pt;">${item.value}</td></tr>`
        ).join('');
        return `<table style="width: 100%; max-width: 400px; border-collapse: collapse; margin: 10px 0; font-size: 11pt;">
          <thead><tr><th style="border: 1px solid #ddd; padding: 6px 8px; background: #f5f5f5; width: 60%; font-size: 11pt; text-align: left;">FTE Activity</th><th style="border: 1px solid #ddd; padding: 6px 8px; background: #f5f5f5; width: 40%; font-size: 11pt; text-align: left;">FTE</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>`;
        
      case 'table-no-borders':
        const noBorderRows = items.map(item => 
          `<tr><td style="padding: 1px 4px; font-weight: bold; width: 60%; font-size: 11pt; line-height: 1.0;">${item.label}</td><td style="padding: 1px 4px; width: 40%; font-size: 11pt; line-height: 1.0;">${item.value}</td></tr>`
        ).join('');
        return `<div style="margin: 6px 0;"><table style="width: 100%; max-width: 400px; margin: 0; font-size: 11pt; line-height: 1.0; border-spacing: 0;">
          <thead><tr><th style="padding: 4px 8px; background: #f5f5f5; width: 60%; font-size: 11pt; text-align: left; line-height: 1.2;">FTE Activity</th><th style="padding: 4px 8px; background: #f5f5f5; width: 40%; font-size: 11pt; text-align: left; line-height: 1.2;">FTE</th></tr></thead>
          <tbody>${noBorderRows}</tbody>
        </table></div>`;
        
      case 'paragraph':
        const paragraphText = items.map(item => `<strong>${item.label}</strong>: ${item.value}`).join(', ');
        return `<p style="margin: 10px 0; line-height: 1.4; font-size: 11pt;">${paragraphText}</p>`;
        
      case 'list':
        const listItems = items.map(item => `<li style="margin: 2px 0; font-size: 11pt;"><strong>${item.label}</strong>: ${item.value}</li>`).join('');
        return `<ul style="margin: 10px 0; padding-left: 20px; font-size: 11pt;">${listItems}</ul>`;
        
      default:
        const defaultItems = items.map(item => 
          `<li style="margin: 2px 0; font-size: 11pt; line-height: 1.4;"><strong>${item.label}</strong>: ${item.value}</li>`
        ).join('');
        return `<ul style="margin: 10px 0; padding-left: 20px; font-size: 11pt; list-style-type: disc;">${defaultItems}</ul>`;
    }
  } catch (error) {
    console.error('Error generating dynamic block content:', error);
    return 'Error generating dynamic content';
  }
};

/**
 * Generates FTE breakdown text using dynamic blocks if available
 */
const generateFTEBreakdown = async (provider: Provider, dynamicBlockId?: string): Promise<string> => {
  try {
    if (dynamicBlockId) {
      console.log('🎯 Using dynamic block for FTE breakdown:', dynamicBlockId);
      return await generateDynamicBlockContent(dynamicBlockId, provider);
    }
    
    // Generate FTE breakdown from dynamicFields
    if (provider.dynamicFields) {
      try {
        const dynamicFields = typeof provider.dynamicFields === 'string' 
          ? JSON.parse(provider.dynamicFields) 
          : provider.dynamicFields;
        
        const fteBreakdown: string[] = [];
        
        // Define FTE field mappings with display names
        const fteFieldMappings = [
          { field: 'Clinical FTE', display: 'Clinical' },
          { field: 'ClinicalFTE', display: 'Clinical' },
          { field: 'Medical Director FTE', display: 'Medical Directors' },
          { field: 'MedicalDirectorFTE', display: 'Medical Directors' },
          { field: 'Division Chief FTE', display: 'Division Chief' },
          { field: 'DivisionChiefFTE', display: 'Division Chief' },
          { field: 'Research FTE', display: 'Research' },
          { field: 'ResearchFTE', display: 'Research' },
          { field: 'Teaching FTE', display: 'Teaching' },
          { field: 'TeachingFTE', display: 'Teaching' },
          { field: 'Administrative FTE', display: 'Administrative' },
          { field: 'AdministrativeFTE', display: 'Administrative' }
        ];
        
        // Check each FTE field and only include those with values > 0
        fteFieldMappings.forEach(({ field, display }) => {
          const value = dynamicFields[field];
          if (value !== undefined && value !== null && value !== '') {
            const numValue = parseFloat(String(value));
            if (!isNaN(numValue) && numValue > 0) {
              fteBreakdown.push(`${display}: ${numValue.toFixed(1)}`);
            }
          }
        });
        
        // Add total FTE if available
        const totalFTE = dynamicFields['Total FTE'] || dynamicFields['TotalFTE'];
        if (totalFTE !== undefined && totalFTE !== null && totalFTE !== '') {
          const numTotal = parseFloat(String(totalFTE));
          if (!isNaN(numTotal) && numTotal > 0) {
            fteBreakdown.push(`Total FTE: ${numTotal.toFixed(1)}`);
          }
        }
        
        if (fteBreakdown.length > 0) {
          return fteBreakdown.join('<br>');
        }
      } catch (e) {
        console.warn('Failed to parse dynamicFields for FTE breakdown:', e);
      }
    }
    
    // Fallback to simple FTE breakdown
    if (provider.fte !== undefined && provider.fte !== null) {
      const hours = Math.round(provider.fte * 40);
      return `${provider.fte} FTE (${hours} hours per week)`;
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error generating FTE breakdown:', error);
    
    // Fallback to simple FTE breakdown
    if (provider.fte !== undefined && provider.fte !== null) {
      const hours = Math.round(provider.fte * 40);
      return `${provider.fte} FTE (${hours} hours per week)`;
    }
    
    return 'N/A';
  }
};

/**
 * Merges provider data with template content
 */
export const mergeTemplateWithData = async (
  template: Template,
  provider: Provider,
  templateContent: string,
  mapping?: EnhancedFieldMapping[]
): Promise<MergeResult> => {
  const warnings: string[] = [];
  let content = templateContent;
  


  // If mapping is provided, use it to resolve placeholders
  if (mapping && Array.isArray(mapping)) {
    // Process mappings in sequence to handle async dynamic blocks
    for (const { placeholder, mappedColumn, mappedDynamicBlock, mappingType } of mapping) {
      if (!placeholder) continue;
      
      let value = '';
      
      if (mappingType === 'dynamic' && mappedDynamicBlock) {
        // Handle dynamic block
        console.log('🔄 Processing dynamic block mapping:', placeholder, '→', mappedDynamicBlock);
        value = await generateDynamicBlockContent(mappedDynamicBlock, provider);
      } else if (mappingType === 'field' && mappedColumn) {
        // Handle regular field mapping
        const fieldValue = getProviderFieldValue(provider, mappedColumn);
      
      // Apply formatting for known fields
      const key = mappedColumn.toLowerCase();
      if ([
        'basesalary', 'signingbonus', 'relocationbonus', 'qualitybonus', 'cmeamount', 'retentionbonus'
      ].includes(key)) {
          value = formatCurrency(fieldValue ?? '');
      } else if (['conversionfactor'].includes(key)) {
          value = formatCurrency2(fieldValue ?? '');
      } else if (['wrvutarget'].includes(key)) {
          value = formatNumber(fieldValue ?? '');
      } else if (['startdate', 'originalagreementdate'].includes(key)) {
          value = formatDate(String(fieldValue ?? ''));
      } else if (key === 'fte' || key.includes('fte')) {
          // Only include FTE values > 0
          const numValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue;
          if (!isNaN(numValue) && numValue > 0) {
            value = typeof fieldValue === 'number' ? fieldValue.toFixed(2) : String(fieldValue ?? '');
          } else {
            value = 'HIDE_LINE'; // Special marker to hide entire line
          }
        } else {
          value = String(fieldValue ?? '');
        }
      }
      
      // If value is HIDE_LINE, replace with empty string instead of removing lines
      if (value === 'HIDE_LINE') {
        // Replace the placeholder with empty string instead of removing entire lines
        content = content.replace(new RegExp(`{{${placeholder}}}`, 'g'), '');
      } else {
        // Replace placeholder with resolved value
        content = content.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
      }
    }
  } else {
    // Fallback to old logic if no mapping is provided
    const placeholderMap: Record<string, string> = {
      '{{ProviderName}}': provider.name ? `<b><strong>${provider.name}${provider.credentials ? ', ' + provider.credentials : ''}</strong></b>` : 'N/A',
      '{{StartDate}}': provider.startDate ? formatDate(provider.startDate) : 'N/A',
      '{{BaseSalary}}': provider.baseSalary ? `<b><strong>${formatCurrency(provider.baseSalary)}</strong></b>` : 'N/A',
      '{{FTE}}': provider.fte !== undefined && provider.fte !== null ? `<b><strong>${provider.fte}</strong></b>` : 'N/A',
      '{{FTEBreakdown}}': await generateFTEBreakdown(provider), // Now supports dynamic blocks
      '{{Specialty}}': provider.specialty ?? 'N/A',
    };
    
    // Add dynamic FTE fields for fallback mode
    if (provider.dynamicFields) {
      try {
        const dynamicFields = typeof provider.dynamicFields === 'string' 
          ? JSON.parse(provider.dynamicFields) 
          : provider.dynamicFields;
        
        // Add only FTE-related dynamic fields with values > 0
        Object.keys(dynamicFields).forEach(key => {
          if (key.toLowerCase().includes('fte')) {
            const value = dynamicFields[key];
            if (value !== undefined && value !== null && value !== '') {
              const numValue = parseFloat(String(value));
              if (!isNaN(numValue) && numValue > 0) {
                const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
                placeholderMap[`{{${key}}}`] = formattedValue;
              }
            }
          }
        });
      } catch (e) {
        console.warn('Failed to parse dynamicFields for FTE breakdown:', e);
      }
    }
    
    // Add other standard placeholders
    if (provider.wRVUTarget) {
      placeholderMap['{{wRVUTarget}}'] = formatNumber(provider.wRVUTarget);
    }
    if (provider.conversionFactor) {
      placeholderMap['{{ConversionFactor}}'] = formatCurrency2(provider.conversionFactor);
    }
    if (provider.retentionBonus) {
      if (typeof provider.retentionBonus === 'number') {
        placeholderMap['{{RetentionBonus}}'] = formatCurrency(provider.retentionBonus);
      } else if (typeof provider.retentionBonus === 'object' && provider.retentionBonus.amount) {
        placeholderMap['{{RetentionBonus}}'] = formatCurrency(provider.retentionBonus.amount);
      }
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

  // After all replacements, replace any remaining {{...}} with 'N/A' and log a warning
  const unresolved = content.match(/{{[^}]+}}/g);
  if (unresolved) {
    unresolved.forEach(ph => {
      content = content.replace(new RegExp(ph, 'g'), 'N/A');
    });
    warnings.push(
      `Warning: The following placeholders were not replaced and set to 'N/A': ${unresolved.join(', ')}`
    );
  }

  // Clean up empty FTE lines after all replacements
  // Check if any FTE-related placeholders are mapped (either as fields or dynamic blocks)
  const hasFTEMappings = mapping?.some(m => 
    m.placeholder?.toLowerCase().includes('fte') && 
    (m.mappedColumn || m.mappedDynamicBlock)
  );
  
  // Check if there are any FTE-related placeholders in the original template content
  const hasFTEPlaceholders = templateContent.includes('{{ClinicalFTE}}') || 
                             templateContent.includes('{{DivisionChief}}') || 
                             templateContent.includes('{{MedicalDirector}}') || 
                             templateContent.includes('{{Research}}') || 
                             templateContent.includes('{{Teaching}}') || 
                             templateContent.includes('{{TotalFTE}}');
  
  console.log('🔍 Template content check:');
  console.log('🔍 Template content length:', templateContent.length);
  console.log('🔍 Contains ClinicalFTE:', templateContent.includes('{{ClinicalFTE}}'));
  console.log('🔍 Contains DivisionChief:', templateContent.includes('{{DivisionChief}}'));
  console.log('🔍 Contains MedicalDirector:', templateContent.includes('{{MedicalDirector}}'));
  console.log('🔍 Contains Research:', templateContent.includes('{{Research}}'));
  console.log('🔍 Contains Teaching:', templateContent.includes('{{Teaching}}'));
  console.log('🔍 Contains TotalFTE:', templateContent.includes('{{TotalFTE}}'));
  
  if (hasFTEMappings || hasFTEPlaceholders) {
    console.log('🔍 Template has FTE mappings or placeholders - cleaning up empty FTE lines');
    console.log('🔍 Before cleanup:', content.substring(0, 1000));
    console.log('🔍 Has FTE mappings:', hasFTEMappings);
    console.log('🔍 Has FTE placeholders:', hasFTEPlaceholders);
    
    // More aggressive cleanup for FTE lines
    // Remove lines that are just "Label:" with no value
    content = content.replace(/^[^:]*:\s*$/gm, ''); // Remove "Label: "
    content = content.replace(/^[^:]*:\s*\n/gm, ''); // Remove "Label: " followed by newline
    content = content.replace(/^[^:]*:\s*<br\s*\/?>/gim, ''); // Remove "Label: <br>"
    content = content.replace(/^[^:]*:\s*<\/p>/gim, ''); // Remove "Label: </p>"
    
    // Also try removing lines that have only whitespace after colon
    content = content.replace(/^([^:]*):\s*$/gm, ''); // Remove "Label: " (empty after colon)
    
    // More specific patterns for FTE lines (both plain text and HTML)
    content = content.replace(/^Clinical:\s*$/gm, ''); // Remove "Clinical:"
    content = content.replace(/^Division Chief:\s*$/gm, ''); // Remove "Division Chief:"
    content = content.replace(/^Medical Directors:\s*$/gm, ''); // Remove "Medical Directors:"
    content = content.replace(/^Research:\s*$/gm, ''); // Remove "Research:"
    content = content.replace(/^Teaching:\s*$/gm, ''); // Remove "Teaching:"
    content = content.replace(/^Total FTE:\s*$/gm, ''); // Remove "Total FTE:"
    
    // HTML-specific patterns
    content = content.replace(/<p[^>]*>Clinical:\s*<\/p>/gi, ''); // Remove "<p>Clinical:</p>"
    content = content.replace(/<p[^>]*>Division Chief:\s*<\/p>/gi, ''); // Remove "<p>Division Chief:</p>"
    content = content.replace(/<p[^>]*>Medical Directors:\s*<\/p>/gi, ''); // Remove "<p>Medical Directors:</p>"
    content = content.replace(/<p[^>]*>Research:\s*<\/p>/gi, ''); // Remove "<p>Research:</p>"
    content = content.replace(/<p[^>]*>Teaching:\s*<\/p>/gi, ''); // Remove "<p>Teaching:</p>"
    content = content.replace(/<p[^>]*>Total FTE:\s*<\/p>/gi, ''); // Remove "<p>Total FTE:</p>"
    
    // Also check for lines that might be in different HTML formats
    content = content.replace(/<div[^>]*>Clinical:\s*<\/div>/gi, ''); // Remove "<div>Clinical:</div>"
    content = content.replace(/<div[^>]*>Division Chief:\s*<\/div>/gi, ''); // Remove "<div>Division Chief:</div>"
    content = content.replace(/<div[^>]*>Medical Directors:\s*<\/div>/gi, ''); // Remove "<div>Medical Directors:</div>"
    content = content.replace(/<div[^>]*>Research:\s*<\/div>/gi, ''); // Remove "<div>Research:</div>"
    content = content.replace(/<div[^>]*>Teaching:\s*<\/div>/gi, ''); // Remove "<div>Teaching:</div>"
    content = content.replace(/<div[^>]*>Total FTE:\s*<\/div>/gi, ''); // Remove "<div>Total FTE:</div>"
    
    // Clean up extra blank lines
    content = content.replace(/\n\s*\n/g, '\n');
    
    console.log('🔍 After cleanup:', content.substring(0, 1000));
  } else {
    console.log('🔍 Template does not have FTE mappings or placeholders - leaving hardcoded FTE lines as-is');
  }
  
  // Ensure content is not empty after all replacements
  if (!content || content.trim().length === 0) {
    warnings.push('Warning: Template content is empty after merging');
    content = '<p>No content available</p>';
  }

  // Patch: Convert any dash-based lists for bonuses/incentives to <ul><li>...</li></ul>
  content = content.replace(/((?:- .+\n?)+)/g, (match) => {
    const items = match.trim().split(/\n/).map(line => line.replace(/^- /, '').trim());
    if (items.length > 1) {
      return '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
    }
    return match;
  });

  return { content, warnings };
};

/**
 * Enhanced provider field value getter that checks multiple sources
 */
function getProviderFieldValue(provider: Provider, fieldName: string): any {
  // First try flat field (direct provider property)
  if (provider[fieldName as keyof Provider] !== undefined && provider[fieldName as keyof Provider] !== null) {
    return provider[fieldName as keyof Provider];
  }
  
  // Then try dynamicFields (uploaded CSV columns)
  if (provider.dynamicFields) {
    try {
      const dynamicFields = typeof provider.dynamicFields === 'string' 
        ? JSON.parse(provider.dynamicFields) 
        : provider.dynamicFields;
      
      // Try exact field name match first
      if (dynamicFields[fieldName] !== undefined && dynamicFields[fieldName] !== null) {
        console.log(`✅ Found field "${fieldName}" in dynamicFields:`, dynamicFields[fieldName]);
        return dynamicFields[fieldName];
      }
      
      // Try case-insensitive match for uploaded columns
      const fieldLower = fieldName.toLowerCase();
      const matchingKey = Object.keys(dynamicFields).find(key => 
        key.toLowerCase() === fieldLower
      );
      if (matchingKey && dynamicFields[matchingKey] !== undefined && dynamicFields[matchingKey] !== null) {
        console.log(`✅ Found field "${fieldName}" as "${matchingKey}" in dynamicFields:`, dynamicFields[matchingKey]);
        return dynamicFields[matchingKey];
      }
      
      // Special handling for FTE fields - try common variations
      if (fieldName.toLowerCase().includes('fte')) {
        const fteVariations = [
          fieldName,
          fieldName.replace('FTE', ' FTE'),
          fieldName.replace('FTE', ' Fte'),
          fieldName.replace('FTE', ' fte'),
          fieldName.replace('FTE', 'Fte'),
          fieldName.replace('FTE', 'fte')
        ];
        
        for (const variation of fteVariations) {
          if (dynamicFields[variation] !== undefined && dynamicFields[variation] !== null) {
            console.log(`✅ Found FTE field "${fieldName}" as "${variation}" in dynamicFields:`, dynamicFields[variation]);
            return dynamicFields[variation];
          }
        }
        
        // Log available FTE fields for debugging
        const availableFteFields = Object.keys(dynamicFields).filter(key => 
          key.toLowerCase().includes('fte')
        );
        if (availableFteFields.length > 0) {
          console.log(`🔍 Available FTE fields in dynamicFields:`, availableFteFields);
          console.log(`❌ Looking for "${fieldName}" but not found`);
        }
      }
    } catch (e) {
      console.warn('Failed to parse dynamicFields:', e);
    }
  }
  
  console.log(`❌ Field "${fieldName}" not found in provider data`);
  return null;
} 

// Helper formatting functions (if not already imported)
const formatCurrency2 = (value: any): string => {
  if (typeof value === 'number') {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
};

const formatNumber = (value: any): string => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}; 