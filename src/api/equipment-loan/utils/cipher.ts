import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const PREFIX = 'enc:';

// ดึง Secret Key 32 bytes จากไฟล์ .env
function getEncryptionKey(): Buffer {
  const secret =
    process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-fallback-key';
  return crypto.createHash('sha256').update(secret).digest();
}

export function isEncrypted(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith(PREFIX);
}

// ฟังก์ชันเข้ารหัส (Encryption)
export function encryptData(plainText: string | null | undefined): string {
  if (!plainText || typeof plainText !== 'string' || isEncrypted(plainText)) {
    return plainText ?? '';
  }
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // สุ่ม Initial Vector 16 bytes
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${PREFIX}${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return plainText;
  }
}

// ฟังก์ชันถอดรหัส (Decryption)
export function decryptData(cipherText: string | null | undefined): string {
  if (!cipherText || typeof cipherText !== 'string' || !isEncrypted(cipherText)) {
    return cipherText ?? '';
  }
  try {
    const key = getEncryptionKey();
    const parts = cipherText.slice(PREFIX.length).split(':');
    if (parts.length !== 2) return cipherText;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return '[DECRYPTION_FAILED]';
  }
}
