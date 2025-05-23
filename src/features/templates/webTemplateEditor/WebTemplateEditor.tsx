import React, { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ClauseLibrary } from './ClauseLibrary';

export default function WebTemplateEditor() {
  const [value, setValue] = React.useState('');
  const quillRef = useRef<ReactQuill>(null);

  // Insert clause or placeholder at cursor
  const handleInsert = (text: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range ? range.index : 0, text, 'user');
    }
  };

  // Example: Download as DOCX (using html-docx-js)
  const handleDownload = async () => {
    const html = value;
    const htmlDocx = await import('html-docx-js/dist/html-docx');
    const blob = htmlDocx.asBlob(html);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Contract.docx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-bold mb-4">Web Template Editor</h2>
        <div className="mb-2">
          <button
            className="mr-2 px-2 py-1 bg-blue-600 text-white rounded"
            onClick={() => handleInsert('{{ProviderName}}')}
          >
            Insert ProviderName
          </button>
          {/* Add more placeholder buttons as needed */}
        </div>
        <ReactQuill
          ref={quillRef}
          value={value}
          onChange={setValue}
          theme="snow"
          style={{ height: 300, marginBottom: 20 }}
        />
        <button
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
          onClick={handleDownload}
        >
          Download as DOCX
        </button>
      </div>
      <ClauseLibrary onInsert={handleInsert} />
    </div>
  );
} 