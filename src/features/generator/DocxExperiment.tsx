import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export default function DocxExperiment() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [providerJson, setProviderJson] = useState('');
  const [mappings, setMappings] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTemplateFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);
    setDownloadUrl(null);
    if (!templateFile) {
      setError('Please upload a DOCX template.');
      return;
    }
    let providerData;
    try {
      providerData = JSON.parse(providerJson);
    } catch {
      setError('Provider data is not valid JSON.');
      return;
    }
    let mappingData = {};
    if (mappings.trim()) {
      try {
        mappingData = JSON.parse(mappings);
      } catch {
        setError('Mappings are not valid JSON.');
        return;
      }
    }
    // Merge providerData and mappingData (mappingData can override providerData)
    const mergedData = { ...providerData, ...mappingData };
    try {
      const arrayBuffer = await templateFile.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.setData(mergedData);
      try {
        doc.render();
      } catch (err: any) {
        setError('docxtemplater error: ' + (err.message || err));
        return;
      }
      const out = doc.getZip().generate({ type: 'blob' });
      const url = URL.createObjectURL(out);
      setDownloadUrl(url);
      setSuccess('DOCX generated successfully!');
    } catch (err: any) {
      setError('Failed to generate DOCX: ' + (err.message || err));
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">DOCX Generation Experiment (docxtemplater)</h2>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Upload DOCX Template</label>
        <Input type="file" accept=".docx" onChange={handleTemplateUpload} />
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Provider Data (JSON)</label>
        <textarea
          className="w-full border rounded p-2 text-sm font-mono"
          rows={6}
          value={providerJson}
          onChange={e => setProviderJson(e.target.value)}
          placeholder='{"ProviderName": "Dr. Smith", "BaseSalary": 200000, ...}'
        />
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Mappings (JSON, optional)</label>
        <textarea
          className="w-full border rounded p-2 text-sm font-mono"
          rows={3}
          value={mappings}
          onChange={e => setMappings(e.target.value)}
          placeholder='{"StartDate": "2025-08-01"}'
        />
      </div>
      <Button onClick={handleGenerate} className="mb-4">Generate DOCX</Button>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-700 mb-2">{success}</div>}
      {downloadUrl && (
        <a href={downloadUrl} download="generated.docx" className="text-blue-700 underline">Download Generated DOCX</a>
      )}
    </div>
  );
} 