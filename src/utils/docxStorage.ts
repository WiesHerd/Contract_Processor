import localforage from 'localforage';

/**
 * Save a DOCX file to storage. Returns the storage key.
 * Swap this logic for S3 or other cloud storage as needed.
 */
export async function saveDocxFile(file: File, id: string): Promise<string> {
  const key = `docxTemplate_${id}`;
  await localforage.setItem(key, file);
  return key;
}

/**
 * Retrieve a DOCX file from storage by id. Returns File or null.
 * Swap this logic for S3 or other cloud storage as needed.
 */
export async function getDocxFile(id: string): Promise<File | null> {
  const key = `docxTemplate_${id}`;
  const file = await localforage.getItem<File>(key);
  return file || null;
}

// To migrate to S3 or another cloud storage:
// - Replace the above functions with S3 upload/download logic.
// - Keep the function signatures the same for easy migration. 