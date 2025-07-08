import React from 'react';

const InstructionsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto bg-gray-50 border border-gray-200 rounded-xl p-8 shadow-sm mt-8">
    <h1 className="text-3xl font-bold text-blue-700 mb-6">How to Use ContractEngine</h1>
    <ol className="list-decimal list-inside text-gray-700 space-y-3">
      <li>
        <span className="font-semibold">Templates:</span> Start by creating or uploading contract templates in the <span className="font-semibold">Templates</span> section. Templates define the structure and placeholders for your contracts. You can upload DOCX files or use the built-in editor to design templates. Make sure to use <span className="font-mono">&#123;&#123;placeholders&#125;&#125;</span> for dynamic fields (e.g., <span className="font-mono">&#123;&#123;ProviderName&#125;&#125;</span>, <span className="font-mono">&#123;&#123;StartDate&#125;&#125;</span>).
      </li>
      <li>
        <span className="font-semibold">Providers:</span> Go to the <span className="font-semibold">Providers</span> section to upload or manage provider data. You can upload a CSV file with provider details or add/edit providers manually. Each provider will be matched to a template based on their data.
      </li>
      <li>
        <span className="font-semibold">Mapping:</span> Use the <span className="font-semibold">Mapping</span> section to map provider data fields to template placeholders. This ensures that all required fields in your templates are correctly populated from your provider data.
      </li>
      <li>
        <span className="font-semibold">Generate:</span> In the <span className="font-semibold">Generate</span> section, select one or more providers to generate contracts. The system will merge provider data with the selected template(s) and generate DOCX or PDF files for download. You can generate contracts individually or in bulk (ZIP download).
      </li>
      <li>
        <span className="font-semibold">Activity Log:</span> Review FMV override logs and contract generation metadata in the <span className="font-semibold">Activity Log</span> section. This helps ensure compliance and provides a record of all contract actions and overrides.
      </li>
      <li>
        <span className="font-semibold">Tips:</span> 
        <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
          <li>All required placeholders must be resolved before exporting a contract.</li>
          <li>Use the clause system in templates for conditional or dynamic contract sections.</li>
          <li>Check the activity log regularly for FMV warnings and justifications.</li>
          <li>Use the search and filter features in each section to quickly find templates, providers, or contracts.</li>
        </ul>
      </li>
    </ol>
  </div>
);

export default InstructionsPage; 