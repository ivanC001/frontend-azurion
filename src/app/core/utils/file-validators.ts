export interface FileValidationOptions {
  readonly maxBytes?: number;
  readonly allowedExtensions?: readonly string[];
  readonly allowedMimeTypes?: readonly string[];
}

export function isValidLogoFile(file: File, maxBytes = 2 * 1024 * 1024): boolean {
  const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime = allowedMimeTypes.has(file.type.toLowerCase());

  return file.size > 0 && file.size <= maxBytes && (hasAllowedMime || hasAllowedExtension);
}

export function isValidProfilePhotoFile(file: File): boolean {
  return isValidLogoFile(file, 1024 * 1024);
}

export function isValidCertificateFile(file: File, maxBytes = 5 * 1024 * 1024): boolean {
  const allowedMimeTypes = new Set([
    'application/x-pkcs12',
    'application/pkcs12',
    'application/octet-stream',
    'application/x-pem-file',
    'text/plain',
  ]);
  const allowedExtensions = ['.pem', '.pfx', '.p12'];
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  const mime = file.type?.toLowerCase?.() ?? '';
  const hasAllowedMime = mime === '' || allowedMimeTypes.has(mime);

  return file.size > 0 && file.size <= maxBytes && hasAllowedExtension && hasAllowedMime;
}
