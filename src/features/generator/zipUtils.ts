import JSZip from 'jszip';

interface ContractFile {
  filename: string;
  blob: Blob;
}

/**
 * Generates a ZIP file containing multiple contract documents
 */
export const generateContractZip = async (
  files: ContractFile[],
  zipName: string = `ContractBundle_${new Date().toISOString().split('T')[0]}.zip`
): Promise<void> => {
  try {
    const zip = new JSZip();

    // Add each file to the ZIP
    files.forEach(({ filename, blob }) => {
      zip.file(filename, blob);
    });

    // Generate the ZIP file
    const content = await zip.generateAsync({ type: 'blob' });

    // Create download link
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating ZIP file:', error);
    throw new Error('Failed to generate contract bundle');
  }
}; 