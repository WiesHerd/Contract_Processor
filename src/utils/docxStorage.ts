import { saveTemplateFile, getTemplateFile } from './s3Storage';

/**
 * Save a DOCX file to S3 storage. Returns the S3 key.
 */
export async function saveDocxFile(file: File, id: string): Promise<string> {
  // The `saveTemplateFile` function from s3Storage now handles the upload.
  // It returns the S3 key, which is what we want to store in our template metadata.
  return saveTemplateFile(file, id);
}

/**
 * Retrieve a DOCX file from S3 storage by id. Returns a File object or null.
 * This now returns a signed URL for direct download.
 * Note: The consuming component might need to be adapted to handle a URL.
 * For now, we will attempt to fetch the file and return a Blob.
 */
export async function getDocxFile(templateId: string, fileName: string): Promise<File | null> {
  try {
    const { url } = await getTemplateFile(templateId, fileName);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from S3: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error('Error retrieving DOCX from S3:', error);
    return null;
  }
}

// To migrate to S3 or another cloud storage:
// - Replace the above functions with S3 upload/download logic.
// - Keep the function signatures the same for easy migration. 