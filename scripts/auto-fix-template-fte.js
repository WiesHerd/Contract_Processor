// Run this in the browser console to automatically fix templates with individual FTE placeholders
console.log('🔧 Auto-fixing templates with individual FTE placeholders...');

if (window.store) {
  const state = window.store.getState();
  const templates = state.templates?.templates || [];
  const dispatch = window.store.dispatch;
  
  console.log(`📊 Found ${templates.length} templates`);
  
  const templatesToFix = [];
  
  templates.forEach((template, index) => {
    console.log(`\n📄 Template ${index + 1}: ${template.name}`);
    console.log(`   ID: ${template.id}`);
    
    // Check HTML content for individual FTE placeholders
    const htmlContent = template.editedHtmlContent || template.htmlPreviewContent || '';
    const placeholderMatches = htmlContent.match(/\{\{[^}]+\}\}/g);
    
    if (placeholderMatches) {
      // Check for individual FTE placeholders (not FTEBreakdown)
      const individualFTEPlaceholders = placeholderMatches.filter(p => 
        p.toLowerCase().includes('fte') && 
        !p.toLowerCase().includes('ftebreakdown') &&
        p.toLowerCase() !== '{{fte}}'
      );
      
      if (individualFTEPlaceholders.length > 0) {
        console.log(`   ⚠️ Found individual FTE placeholders:`, individualFTEPlaceholders);
        templatesToFix.push({
          template,
          placeholders: individualFTEPlaceholders,
          originalContent: htmlContent
        });
      } else {
        console.log(`   ✅ No individual FTE placeholders found`);
      }
    }
  });
  
  if (templatesToFix.length > 0) {
    console.log(`\n🎯 Found ${templatesToFix.length} templates to fix:`);
    
    templatesToFix.forEach((item, index) => {
      console.log(`\n${index + 1}. Template: ${item.template.name}`);
      console.log(`   Individual FTE placeholders: ${item.placeholders.join(', ')}`);
      
      // Create the fixed content
      let fixedContent = item.originalContent;
      
      // Replace individual FTE lines with {{FTEBreakdown}}
      // Look for patterns like "Clinical: {{Clinical FTE}}" and replace with {{FTEBreakdown}}
      const fteLinePatterns = [
        /Clinical:\s*\{\{Clinical\s*FTE\}\}/gi,
        /Research:\s*\{\{Research\s*FTE\}\}/gi,
        /Teaching:\s*\{\{Teaching\s*FTE\}\}/gi,
        /Medical\s*Directors?:\s*\{\{Medical\s*Director\s*FTE\}\}/gi,
        /Division\s*Chief:\s*\{\{Division\s*Chief\s*FTE\}\}/gi,
        /Administrative:\s*\{\{Administrative\s*FTE\}\}/gi,
        /Total\s*FTE:\s*\{\{Total\s*FTE\}\}/gi
      ];
      
      // Remove individual FTE lines and replace with {{FTEBreakdown}}
      fteLinePatterns.forEach(pattern => {
        fixedContent = fixedContent.replace(pattern, '');
      });
      
      // Clean up any empty lines or extra spacing
      fixedContent = fixedContent.replace(/\n\s*\n/g, '\n');
      
      // Add {{FTEBreakdown}} if it's not already there
      if (!fixedContent.includes('{{FTEBreakdown}}')) {
        // Find a good place to insert it (after "Base Salary" section)
        const baseSalaryIndex = fixedContent.indexOf('Base Salary');
        if (baseSalaryIndex !== -1) {
          const insertIndex = fixedContent.indexOf('\n', baseSalaryIndex) + 1;
          fixedContent = fixedContent.slice(0, insertIndex) + 
                        '{{FTEBreakdown}}\n' + 
                        fixedContent.slice(insertIndex);
        } else {
          // If no "Base Salary" section, add it at the end
          fixedContent += '\n{{FTEBreakdown}}';
        }
      }
      
      console.log(`   Original content length: ${item.originalContent.length}`);
      console.log(`   Fixed content length: ${fixedContent.length}`);
      
      // Update the template
      const updatedTemplate = {
        ...item.template,
        editedHtmlContent: fixedContent,
        htmlPreviewContent: fixedContent
      };
      
      // Dispatch the update
      try {
        dispatch({
          type: 'templates/updateTemplate',
          payload: updatedTemplate
        });
        console.log(`   ✅ Template "${item.template.name}" updated successfully!`);
      } catch (error) {
        console.error(`   ❌ Error updating template "${item.template.name}":`, error);
      }
    });
    
    console.log(`\n🎉 Auto-fix complete! ${templatesToFix.length} templates updated.`);
    console.log(`📝 Please test the templates in the preview to ensure they work correctly.`);
  } else {
    console.log(`\n✅ All templates are already using the correct {{FTEBreakdown}} placeholder!`);
  }
} else {
  console.log('❌ Redux store not available');
} 