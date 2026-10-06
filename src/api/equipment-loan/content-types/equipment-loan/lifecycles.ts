import { calculateLoanHash } from '../../utils/hash';
import { encryptData } from '../../utils/cipher';

export default {
  // ทำงานก่อนบันทึกข้อมูลใหม่ (Create)
  async beforeCreate(event: any) {
    const { data } = event.params;
    // กำหนดค่า default ก่อนคำนวณ Hash เพื่อให้ค่าที่บันทึกและค่าที่ใช้คำนวณตรงกัน
    if (data.status === undefined || data.status === null) data.status = 'borrowing';
    if (data.fine_amount === undefined || data.fine_amount === null) data.fine_amount = 0;
    // 1. คำนวณ MD5 จากข้อมูลจริงก่อนเข้ารหัส
    data.integrity_hash = calculateLoanHash(data);
    // 2. เข้ารหัสฟิลด์สำคัญด้วย AES-256 ก่อนบันทึกลง SQLite
    if (data.borrower_phone) data.borrower_phone = encryptData(data.borrower_phone);
    if (data.equipment_serial) data.equipment_serial = encryptData(data.equipment_serial);
  },

  // ทำงานก่อนแก้ไขข้อมูลเดิม (Update)
  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    if (data) {
      let existing: any = null;
      if (where?.id) {
        existing = await strapi.db.query('api::equipment-loan.equipment-loan').findOne({
          where: { id: where.id },
        });
      } else if (where?.documentId) {
        existing = await strapi.db.query('api::equipment-loan.equipment-loan').findOne({
          where: { documentId: where.documentId },
        });
      }
      const merged = existing ? { ...existing, ...data } : data;
      // คำนวณ MD5 ใหม่ตามข้อมูลที่อัปเดต
      data.integrity_hash = calculateLoanHash(merged);
      // เข้ารหัสฟิลด์สำคัญก่อนบันทึก
      if (data.borrower_phone) data.borrower_phone = encryptData(data.borrower_phone);
      if (data.equipment_serial) data.equipment_serial = encryptData(data.equipment_serial);
    }
  },
};
