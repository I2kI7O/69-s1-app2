import crypto from 'crypto';
import { decryptData } from './cipher';

/**
 * คำนวณค่า MD5 Checksum จากข้อมูลสำคัญของการยืม-คืนอุปกรณ์
 * เพื่อตรวจจับว่า status, วันที่ยืม-คืน, ค่าปรับ หรือข้อมูลส่วนตัว
 * ถูกแอบแก้ไขใน Database หรือไม่
 */
export function calculateLoanHash(loan: {
  loan_code?: string | null;
  borrower_name?: string | null;
  borrower_phone?: string | null;
  equipment_name?: string | null;
  equipment_serial?: string | null;
  borrow_date?: string | null;
  return_date?: string | null;
  status?: string | null;
  fine_amount?: number | string | null;
}): string {
  // ถอดรหัสกลับมาเป็นข้อความธรรมดาก่อนนำมาต่อกัน
  // เพื่อให้ค่า MD5 คงที่แน่นอน ไม่ว่าค่า IV จะสุ่มใหม่ทุกครั้งก็ตาม
  const plainPhone = decryptData(loan.borrower_phone);
  const plainSerial = decryptData(loan.equipment_serial);
  const payload = [
    loan.loan_code || '',
    loan.borrower_name || '',
    loan.equipment_name || '',
    loan.borrow_date || '',
    loan.return_date || '',
    loan.status || '',
    String(loan.fine_amount ?? ''),
    plainPhone || '',
    plainSerial || '',
  ].join('::');
  return crypto.createHash('md5').update(payload, 'utf8').digest('hex');
}
