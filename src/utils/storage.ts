import localforage from 'localforage';
import { Template } from '@/types/template';

// Initialize localforage instances
const templateStorage = localforage.createInstance({
  name: 'template-storage',
  storeName: 'templates',
});

const fileStorage = localforage.createInstance({
  name: 'template-files',
  storeName: 'files',
});

// Global function assignments will be set at the end of the file

/**
 * Stores a DOCX file in localforage
 * @param key The key to store the file under
 * @param file The File object to store
 */
export const storeDocxFile = async (key: string, file: File): Promise<void> => {
  try {
    // Convert File to ArrayBuffer for storage
    const arrayBuffer = await file.arrayBuffer();
    await fileStorage.setItem(key, arrayBuffer);
  } catch (error) {
    console.error('Error storing DOCX file:', error);
    throw error;
  }
};

/**
 * Retrieves a DOCX file from localforage
 * @param key The key the file was stored under
 * @returns The stored File object
 */
export const getDocxFile = async (key: string): Promise<File | null> => {
  try {
    const arrayBuffer = await fileStorage.getItem(key);
    if (!arrayBuffer) return null;

    // Convert ArrayBuffer back to File
    const blob = new Blob([arrayBuffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    return new File([blob], key, { type: blob.type });
  } catch (error) {
    console.error('Error retrieving DOCX file:', error);
    throw error;
  }
};

/**
 * Removes a DOCX file from localforage
 * @param key The key of the file to remove
 */
export const removeDocxFile = async (key: string): Promise<void> => {
  try {
    await fileStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing DOCX file:', error);
    throw error;
  }
};

/**
 * Stores template metadata in localforage
 * @param templates The templates to store
 */
export const storeTemplates = async (templates: Template[]): Promise<void> => {
  try {
    // Store templates without the actual File objects
    const templatesToStore = templates.map(template => ({
      ...template,
      docxTemplate: typeof template.docxTemplate === 'string' ? template.docxTemplate : null,
    }));
    await templateStorage.setItem('templates', templatesToStore);
  } catch (error) {
    console.error('Error storing templates:', error);
    throw error;
  }
};

/**
 * Retrieves template metadata from localforage
 * @returns The stored templates
 */
export const getTemplates = async (): Promise<Template[]> => {
  try {
    const templates = await templateStorage.getItem('templates');
    return (templates as Template[]) || [];
  } catch (error) {
    console.error('Error retrieving templates:', error);
    throw error;
  }
};

/**
 * Clears all template data from storage
 */
export const clearTemplateStorage = async (): Promise<void> => {
  try {
    await Promise.all([
      templateStorage.clear(),
      fileStorage.clear()
    ]);
    console.log('✅ Template storage cleared successfully');
  } catch (error) {
    console.error('Error clearing template storage:', error);
    throw error;
  }
};

/**
 * Debug function to show what's currently stored in localForage
 */
export const debugTemplateStorage = async (): Promise<void> => {
  try {
    console.log('🔍 Debugging template storage...');
    
    // Check template storage
    const templateKeys = await templateStorage.keys();
    console.log('📁 Template storage keys:', templateKeys);
    
    for (const key of templateKeys) {
      const value = await templateStorage.getItem(key);
      console.log(`📄 Template key "${key}":`, value);
    }
    
    // Check file storage
    const fileKeys = await fileStorage.keys();
    console.log('📁 File storage keys:', fileKeys);
    
    for (const key of fileKeys) {
      const value = await fileStorage.getItem(key);
      console.log(`📄 File key "${key}":`, value ? `ArrayBuffer(${(value as ArrayBuffer).byteLength} bytes)` : 'null');
    }
    
    // Check all localForage instances
    const allKeys = await localforage.keys();
    console.log('📁 All localForage keys:', allKeys);
    
  } catch (error) {
    console.error('Error debugging template storage:', error);
  }
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearTemplateCache = clearTemplateStorage;
  (window as any).debugTemplateCache = debugTemplateStorage;
} 