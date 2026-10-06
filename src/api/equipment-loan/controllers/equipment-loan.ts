import { factories } from '@strapi/strapi';
import { calculateLoanHash } from '../utils/hash';
import { decryptData, isEncrypted } from '../utils/cipher';

export default factories.createCoreController(
  'api::equipment-loan.equipment-loan',
  ({ strapi }) => ({
    // ถอดรหัสอัตโนมัติเมื่อเรียกดูข้อมูลผ่าน GET /api/equipment-loans
    async find(ctx) {
      const { data, meta } = await super.find(ctx);
      if (Array.isArray(data)) {
        data.forEach((loan: any) => {
          if (loan.borrower_phone) loan.borrower_phone = decryptData(loan.borrower_phone);
          if (loan.equipment_serial) loan.equipment_serial = decryptData(loan.equipment_serial);
        });
      }
      return { data, meta };
    },

    // ถอดรหัสเมื่อดึงข้อมูลรายชิ้นเดียว GET /api/equipment-loans/:id
    async findOne(ctx) {
      const response = await super.findOne(ctx);
      const loan: any = response.data;
      if (loan) {
        if (loan.borrower_phone) loan.borrower_phone = decryptData(loan.borrower_phone);
        if (loan.equipment_serial) loan.equipment_serial = decryptData(loan.equipment_serial);
      }
      return response;
    },

    // ถอดรหัสผลลัพธ์หลังสร้างข้อมูลสำเร็จ POST /api/equipment-loans
    async create(ctx) {
      const response = await super.create(ctx);
      const loan: any = response.data;
      if (loan) {
        if (loan.borrower_phone) loan.borrower_phone = decryptData(loan.borrower_phone);
        if (loan.equipment_serial) loan.equipment_serial = decryptData(loan.equipment_serial);
      }
      return response;
    },

    // ฟังก์ชันพิเศษสำหรับตรวจสอบว่าข้อมูลถูกแอบแก้ไขหรือไม่
    async verifyIntegrity(ctx) {
      const { id } = ctx.params;
      const loans = await strapi.documents('api::equipment-loan.equipment-loan').findMany({
        filters: { $or: [{ documentId: id }, { loan_code: id }] },
      });
      if (!loans || loans.length === 0) {
        return ctx.notFound(`Equipment loan not found: ${id}`);
      }
      const loan = loans[0];
      const computedHash = calculateLoanHash(loan as any);
      const storedHash = loan.integrity_hash;
      const isValid = Boolean(storedHash && storedHash === computedHash);
      return {
        loan_code: loan.loan_code,
        borrower: loan.borrower_name,
        equipment: loan.equipment_name,
        loan_status: loan.status,
        fine_amount: loan.fine_amount,
        is_valid: isValid,
        status: isValid ? 'SECURE_AND_VERIFIED' : 'TAMPER_DETECTED (DATA MODIFIED)',
        message: isValid
          ? 'ข้อมูลถูกต้องสมบูรณ์ ไม่มีการถูกแอบแก้ไข'
          : 'แจ้งเตือนความปลอดภัย! ข้อมูลถูกแอบแก้ไขโดยตรงในฐานข้อมูล (MD5 Checksum Mismatch)',
        security_info: {
          confidentiality: {
            borrower_phone_status: isEncrypted(loan.borrower_phone)
              ? 'AES-256 ENCRYPTED'
              : 'PLAINTEXT',
            equipment_serial_status: isEncrypted(loan.equipment_serial)
              ? 'AES-256 ENCRYPTED'
              : 'PLAINTEXT',
            decrypted_borrower_phone: decryptData(loan.borrower_phone),
          },
          integrity: {
            algorithm: 'MD5',
            stored_hash: storedHash,
            computed_hash: computedHash,
          },
        },
      };
    },
  })
);
