/**
 * File System Access API utilities for Windows File Explorer "Save As" dialog
 * This approach provides a clean, permission-free way to save files
 */

// Type definitions for File System Access API
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: FileSystemWriteChunkType): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

type FileSystemWriteChunkType = BufferSource | Blob | string;

// Extend Window interface for File System Access API
declare global {
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle>;
    
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
      startIn?: string | FileSystemHandle;
    }): Promise<FileSystemDirectoryHandle>;
  }
}

/**
 * Check if File System Access API is supported
 */
export const isFileSystemAccessSupported = (): boolean => {
  return 'showSaveFilePicker' in window && 'showDirectoryPicker' in window;
};

/**
 * Save a single file using Windows File Explorer "Save As" dialog
 * @param blob - The file content as a Blob
 * @param suggestedName - Suggested filename for the dialog
 * @param mimeType - MIME type for the file
 * @returns Promise that resolves to the saved file path or null if cancelled
 */
export const saveFileWithDialog = async (
  blob: Blob,
  suggestedName: string,
  mimeType: string = 'application/octet-stream'
): Promise<string | null> => {
  try {
    if (!isFileSystemAccessSupported()) {
      console.warn('File System Access API not supported, falling back to standard download');
      return saveFileFallback(blob, suggestedName);
    }

    // Determine file extension from MIME type
    const extension = getExtensionFromMimeType(mimeType);
    const filename = suggestedName.endsWith(extension) ? suggestedName : `${suggestedName}${extension}`;

    // Show the "Save As" dialog
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: getFileDescription(mimeType),
        accept: {
          [mimeType]: [extension]
        }
      }]
    });

    // Create a writable stream and write the file
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    console.log('✅ File saved successfully:', fileHandle.name);
    return fileHandle.name;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('User cancelled file save dialog');
      return null;
    }
    console.error('Error saving file with dialog:', error);
    // Fallback to standard download
    return saveFileFallback(blob, suggestedName);
  }
};

/**
 * Save multiple files as a ZIP using Windows File Explorer "Save As" dialog
 * @param files - Array of file objects with content and name
 * @param suggestedZipName - Suggested name for the ZIP file
 * @returns Promise that resolves to the saved ZIP path or null if cancelled
 */
export const saveZipWithDialog = async (
  files: Array<{ content: Blob; name: string }>,
  suggestedZipName: string = `contracts-${new Date().toISOString().split('T')[0]}.zip`
): Promise<string | null> => {
  try {
    if (!isFileSystemAccessSupported()) {
      console.warn('File System Access API not supported, falling back to standard ZIP download');
      return saveZipFallback(files, suggestedZipName);
    }

    // Import JSZip dynamically
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add all files to the ZIP
    files.forEach(({ content, name }) => {
      zip.file(name, content);
    });

    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Show the "Save As" dialog for the ZIP
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: suggestedZipName,
      types: [{
        description: 'ZIP Archive',
        accept: {
          'application/zip': ['.zip']
        }
      }]
    });

    // Create a writable stream and write the ZIP
    const writable = await fileHandle.createWritable();
    await writable.write(zipBlob);
    await writable.close();

    console.log('✅ ZIP file saved successfully:', fileHandle.name);
    return fileHandle.name;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('User cancelled ZIP save dialog');
      return null;
    }
    console.error('Error saving ZIP with dialog:', error);
    // Fallback to standard ZIP download
    return saveZipFallback(files, suggestedZipName);
  }
};

/**
 * Save a DOCX file using Windows File Explorer "Save As" dialog
 * @param content - The DOCX content as a Blob or ArrayBuffer
 * @param filename - The name of the file to save
 * @returns Promise that resolves to the saved file path or null if cancelled
 */
export const saveDocxWithDialog = async (
  content: Blob | ArrayBuffer,
  filename: string
): Promise<string | null> => {
  const blob = content instanceof ArrayBuffer 
    ? new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    : content;
  
  return saveFileWithDialog(
    blob, 
    filename, 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
};

/**
 * Save a PDF file using Windows File Explorer "Save As" dialog
 * @param content - The PDF content as a Blob or ArrayBuffer
 * @param filename - The name of the file to save
 * @returns Promise that resolves to the saved file path or null if cancelled
 */
export const savePdfWithDialog = async (
  content: Blob | ArrayBuffer,
  filename: string
): Promise<string | null> => {
  const blob = content instanceof ArrayBuffer 
    ? new Blob([content], { type: 'application/pdf' })
    : content;
  
  return saveFileWithDialog(blob, filename, 'application/pdf');
};

// Helper functions

/**
 * Fallback to standard browser download for single files
 */
const saveFileFallback = (blob: Blob, filename: string): string | null => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ File downloaded using fallback method:', filename);
    return `Downloads/${filename}`;
  } catch (error) {
    console.error('Error in fallback file save:', error);
    return null;
  }
};

/**
 * Fallback to standard browser download for ZIP files
 */
const saveZipFallback = async (
  files: Array<{ content: Blob; name: string }>,
  zipName: string
): Promise<string | null> => {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add all files to the ZIP
    files.forEach(({ content, name }) => {
      zip.file(name, content);
    });

    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Use standard download
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ ZIP file downloaded using fallback method:', zipName);
    return `Downloads/${zipName}`;
  } catch (error) {
    console.error('Error in fallback ZIP save:', error);
    return null;
  }
};

/**
 * Get file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType: string): string => {
  const extensions: Record<string, string> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'text/csv': '.csv',
    'application/json': '.json',
    'text/plain': '.txt',
    'application/octet-stream': ''
  };
  
  return extensions[mimeType] || '';
};

/**
 * Get human-readable file description from MIME type
 */
const getFileDescription = (mimeType: string): string => {
  const descriptions: Record<string, string> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/pdf': 'PDF Document',
    'application/zip': 'ZIP Archive',
    'text/csv': 'CSV File',
    'application/json': 'JSON File',
    'text/plain': 'Text File',
    'application/octet-stream': 'Binary File'
  };
  
  return descriptions[mimeType] || 'File';
}; 