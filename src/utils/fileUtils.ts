import JSZip from 'jszip';
import { saveFileWithDialog, saveZipWithDialog, saveDocxWithDialog, savePdfWithDialog } from './fileSystemAccess';

/**
 * Saves a single file using the Windows File Explorer "Save As" dialog
 * Falls back to browser download if File System Access API is not supported
 * @param content - The file content as a Blob or string
 * @param filename - The name of the file to save
 * @param mimeType - The MIME type of the file (default: 'application/octet-stream')
 */
export const saveSingleFile = async (
  content: Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<string | null> => {
  try {
    // Convert string content to Blob if needed
    const blob = typeof content === 'string' 
      ? new Blob([content], { type: mimeType })
      : content;

    // Use the new Windows File Explorer "Save As" dialog approach
    return await saveFileWithDialog(blob, filename, mimeType);
  } catch (error) {
    console.error('Error saving single file:', error);
    throw new Error(`Failed to save file ${filename}: ${error}`);
  }
};

/**
 * Saves multiple files as a ZIP archive using the Windows File Explorer "Save As" dialog
 * Falls back to browser download if File System Access API is not supported
 * @param files - Array of file objects with content, name, and optional MIME type
 * @param zipFilename - The name of the ZIP file to save (default: 'contracts.zip')
 */
export const saveMultipleFilesAsZip = async (
  files: Array<{
    content: Blob | string;
    name: string;
    mimeType?: string;
  }>,
  zipFilename: string = 'contracts.zip'
): Promise<string | null> => {
  try {
    if (files.length === 0) {
      throw new Error('No files provided for ZIP creation');
    }

    // Convert files to the format expected by saveZipWithDialog
    const zipFiles = await Promise.all(
      files.map(async (file) => {
        const mimeType = file.mimeType || 'application/octet-stream';
        const content = typeof file.content === 'string' 
          ? new Blob([file.content], { type: mimeType })
          : file.content;
        
        return {
          content,
          name: file.name
        };
      })
    );

    // Use the new Windows File Explorer "Save As" dialog approach
    return await saveZipWithDialog(zipFiles, zipFilename);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error(`Failed to create ZIP file ${zipFilename}: ${error}`);
  }
};

/**
 * Saves a DOCX file using the Windows File Explorer "Save As" dialog
 * Falls back to browser download if File System Access API is not supported
 * @param content - The DOCX content as a Blob or ArrayBuffer
 * @param filename - The name of the file to save
 */
export const saveDocxFile = async (
  content: Blob | ArrayBuffer,
  filename: string
): Promise<string | null> => {
  try {
    return await saveDocxWithDialog(content, filename);
  } catch (error) {
    console.error('Error saving DOCX file:', error);
    throw new Error(`Failed to save DOCX file ${filename}: ${error}`);
  }
};

/**
 * Saves a PDF file using the Windows File Explorer "Save As" dialog
 * Falls back to browser download if File System Access API is not supported
 * @param content - The PDF content as a Blob or ArrayBuffer
 * @param filename - The name of the file to save
 */
export const savePdfFile = async (
  content: Blob | ArrayBuffer,
  filename: string
): Promise<string | null> => {
  try {
    return await savePdfWithDialog(content, filename);
  } catch (error) {
    console.error('Error saving PDF file:', error);
    throw new Error(`Failed to save PDF file ${filename}: ${error}`);
  }
};

// Legacy functions for backward compatibility (deprecated)

/**
 * @deprecated Use saveSingleFile instead - this function uses the old browser download approach
 */
export const saveSingleFileLegacy = (
  content: Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void => {
  try {
    // Convert string content to Blob if needed
    const blob = typeof content === 'string' 
      ? new Blob([content], { type: mimeType })
      : content;

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error saving single file:', error);
    throw new Error(`Failed to save file ${filename}: ${error}`);
  }
};

/**
 * @deprecated Use saveMultipleFilesAsZip instead - this function uses the old browser download approach
 */
export const saveMultipleFilesAsZipLegacy = async (
  files: Array<{
    content: Blob | string;
    name: string;
    mimeType?: string;
  }>,
  zipFilename: string = 'contracts.zip'
): Promise<void> => {
  try {
    if (files.length === 0) {
      throw new Error('No files provided for ZIP creation');
    }

    const zip = new JSZip();

    // Add each file to the ZIP
    for (const file of files) {
      const mimeType = file.mimeType || 'application/octet-stream';
      const content = typeof file.content === 'string' 
        ? file.content 
        : await file.content.arrayBuffer();
      
      zip.file(file.name, content);
    }

    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Save the ZIP file using the single file save function
    saveSingleFileLegacy(zipBlob, zipFilename, 'application/zip');
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error(`Failed to create ZIP file ${zipFilename}: ${error}`);
  }
}; 