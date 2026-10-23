/**
 * Resume Storage — stores the user's base resume PDF as a base64 string in localStorage.
 * This resume is used as the base when tailoring resumes for specific jobs.
 */

const RESUME_KEY = 'swipe-select-base-resume';
const RESUME_META_KEY = 'swipe-select-base-resume-meta';

export type ResumeMeta = {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
};

/** Store a resume PDF file as base64 in localStorage. */
export async function saveBaseResume(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      localStorage.setItem(RESUME_KEY, base64);
      const meta: ResumeMeta = {
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        mimeType: file.type || 'application/pdf',
      };
      localStorage.setItem(RESUME_META_KEY, JSON.stringify(meta));
      resolve();
    };
    reader.onerror = () => reject(new Error('Failed to read resume file'));
    reader.readAsDataURL(file);
  });
}

/** Retrieve the stored base resume as a data URL string and its metadata. */
export function getBaseResume(): { dataUrl: string; meta: ResumeMeta } | null {
  const dataUrl = localStorage.getItem(RESUME_KEY);
  const metaRaw = localStorage.getItem(RESUME_META_KEY);
  if (!dataUrl || !metaRaw) return null;
  try {
    const meta = JSON.parse(metaRaw) as ResumeMeta;
    return { dataUrl, meta };
  } catch {
    return null;
  }
}

/** Convert the stored base64 data URL back into a File object for upload. */
export function getBaseResumeAsFile(): File | null {
  const stored = getBaseResume();
  if (!stored) return null;

  try {
    const { dataUrl, meta } = stored;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;

    const byteString = atob(parts[1]);
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : meta.mimeType;

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new File([ab], meta.fileName, { type: mimeType });
  } catch {
    return null;
  }
}

/** Check if a base resume is stored. */
export function hasBaseResume(): boolean {
  return Boolean(localStorage.getItem(RESUME_KEY));
}

/** Remove the stored base resume. */
export function clearBaseResume(): void {
  localStorage.removeItem(RESUME_KEY);
  localStorage.removeItem(RESUME_META_KEY);
}
