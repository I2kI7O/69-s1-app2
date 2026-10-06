import type { Core } from '@strapi/strapi';

const API_UID = 'api::equipment-loan.equipment-loan';

/**
 * สิทธิ์ที่เปิดให้ Public (เรียก API ได้โดยไม่ต้อง login)
 * ตรงตามคู่มือข้อ 6.1: find, findOne, create และ verifyIntegrity
 * คงไว้เฉพาะที่จำเป็น (Least Privilege) ไม่เปิด update/delete ให้สาธารณะ
 */
const PUBLIC_ACTIONS = ['find', 'findOne', 'create', 'verifyIntegrity'];

/**
 * ข้อมูลตัวอย่างสำหรับสาธิต (รายชื่อผู้ยืม + รหัสการยืม)
 * จะถูกสร้างอัตโนมัติก็ต่อเมื่อยังไม่มีข้อมูลในฐานข้อมูล
 */
const DEMO_LOANS = [
  {
    loan_code: 'LN-2026-001',
    borrower_name: 'Wachirawit Kantho',
    borrower_phone: '081-234-5678',
    equipment_name: 'MacBook Pro M3 (รหัสครุภัณฑ์ CP-012)',
    equipment_serial: 'C02X1234JGH5',
    borrow_date: '2026-10-01',
    status: 'borrowing',
    fine_amount: 0,
  },
  {
    loan_code: 'LN-2026-002',
    borrower_name: 'สมชาย เรียนดี',
    borrower_phone: '089-876-5432',
    equipment_name: 'Dell OptiPlex 7010 (รหัสครุภัณฑ์ CP-045)',
    equipment_serial: 'CN-0FJ8N2-72981',
    borrow_date: '2026-09-28',
    return_date: '2026-10-05',
    status: 'returned',
    fine_amount: 0,
  },
  {
    loan_code: 'LN-2026-003',
    borrower_name: 'สมหญิง รักเรียน',
    borrower_phone: '086-555-1234',
    equipment_name: 'กล้อง Canon EOS 250D (รหัสครุภัณฑ์ CP-078)',
    equipment_serial: '093456789012',
    borrow_date: '2026-09-30',
    status: 'borrowing',
    fine_amount: 0,
  },
  {
    loan_code: 'LN-2026-004',
    borrower_name: 'วรรณา ใจดี',
    borrower_phone: '082-111-2222',
    equipment_name: 'โปรเจคเตอร์ Epson EB-X06 (รหัสครุภัณฑ์ CP-101)',
    equipment_serial: 'X4KJ1900123',
    borrow_date: '2026-09-20',
    return_date: '2026-10-02',
    status: 'damaged',
    fine_amount: 1500,
  },
  {
    loan_code: 'LN-2026-005',
    borrower_name: 'อาทิตย์ มีไฟ',
    borrower_phone: '085-999-8888',
    equipment_name: 'iPad Air 5 (รหัสครุภัณฑ์ CP-133)',
    equipment_serial: 'DMPX7C1Q5XY',
    borrow_date: '2026-10-06',
    status: 'borrowing',
    fine_amount: 0,
  },
];

/** สร้างสิทธิ์ให้ Public ถ้ายังไม่มี (ทำงานซ้ำได้โดยไม่สร้างซ้ำ) */
async function syncPublicPermissions(strapi: Core.Strapi) {
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) {
    strapi.log.warn('[security] ไม่พบ Public role ข้ามการตั้งค่าสิทธิ์');
    return;
  }

  const actions = PUBLIC_ACTIONS.map((action) => `${API_UID}.${action}`);
  const existing = await permissionQuery.findMany({
    where: { action: { $in: actions }, role: { id: publicRole.id } },
  });
  const existingActions = new Set(existing.map((permission) => permission.action));

  const toCreate = actions.filter((action) => !existingActions.has(action));
  for (const action of toCreate) {
    await permissionQuery.create({ data: { action, role: publicRole.id } });
  }

  if (toCreate.length > 0) {
    strapi.log.info(`[security] เปิดสิทธิ์ Public: ${toCreate.join(', ')}`);
  }
}

/** เติมข้อมูลตัวอย่างเมื่อฐานข้อมูลยังว่าง */
async function seedDemoData(strapi: Core.Strapi) {
  const count = await strapi.db.query(API_UID).count();
  if (count > 0) return;

  for (const loan of DEMO_LOANS) {
    await strapi.documents(API_UID).create({ data: loan });
  }
  strapi.log.info(`[seed] สร้างข้อมูลตัวอย่าง ${DEMO_LOANS.length} รายการ`);
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await syncPublicPermissions(strapi);
    await seedDemoData(strapi);
  },
};
