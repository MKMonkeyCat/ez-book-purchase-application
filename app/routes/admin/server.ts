import { redirect } from 'react-router';
import {
  StudentOrderState,
  type StudentOrderStatusField,
} from '~/types/purchase';
import { getCurrentPriceValue } from '~/utils/pricing';
import type { AdminOrderRow } from './types';

const hasFlag = (value: number, flag: StudentOrderState) =>
  (value & flag) === flag;

export async function loadAdminPageData(request: Request) {
  const { requireAdminUser } = await import('~/.server/admin-auth');
  const { getOrders } = await import('~/.server/purchase-sheets/index');

  const user = await requireAdminUser(request);
  const orders = await getOrders();

  const orderRows: AdminOrderRow[] = orders.flatMap(
    ({ book, students, totalOrdered }) =>
      students
        .filter((student) => student.status !== StudentOrderState.None)
        .map((student) => ({
          bookIsbn: book.isbn,
          bookName: book.name,
          subject: book.subject,
          studentNumber: student.number,
          studentName: student.name,
          payableAmount: getCurrentPriceValue(book, totalOrdered),
          ordered: hasFlag(student.status, StudentOrderState.Ordered),
          paid: hasFlag(student.status, StudentOrderState.Paid),
          delivered: hasFlag(student.status, StudentOrderState.Delivered),
        })),
  );

  return { user, orderRows };
}

const getRequestContext = (request: Request) => ({
  userAgent: request.headers.get('user-agent') || '',
});

export async function handleAdminPageAction(request: Request, ip: string) {
  const { requireAdminUser, commitAdminLogout } =
    await import('~/.server/admin-auth');
  const {
    updateStudentOrderStatusField,
    updateStudentPaidStatusByBookIsbnsBulk,
    logAdminAudit,
  } = await import('~/.server/purchase-sheets/index');

  const adminUser = await requireAdminUser(request);
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? 'update-status');

  if (intent === 'logout') {
    const setCookie = await commitAdminLogout(request);
    return redirect('/admin/login', { headers: { 'Set-Cookie': setCookie } });
  }

  const { userAgent } = getRequestContext(request);
  if (intent === 'bulk-pay-student' || intent === 'bulk-unpay-student') {
    const studentNumber = String(formData.get('studentNumber') ?? '').trim();
    const bookIsbnsRaw = String(formData.get('bookIsbns') ?? '').trim();
    const bookIsbns = Array.from(
      new Set(
        bookIsbnsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    const checked = intent === 'bulk-pay-student';
    const actionName = checked ? '一次付清' : '一次取消付款';

    if (!studentNumber || bookIsbns.length === 0) {
      return {
        success: false,
        message: `缺少學生或書籍資料，無法${actionName}`,
      };
    }

    const result = await updateStudentPaidStatusByBookIsbnsBulk({
      studentNumber,
      bookIsbns,
      checked,
    });

    await logAdminAudit({
      adminEmail: adminUser.email,
      studentNumber,
      bookIsbn: result.updatedBookIsbns.join(',') || '-',
      field: 'paid',
      checked,
      success: result.success,
      ip,
      userAgent,
      message: `${actionName}：${result.message}`,
    });

    return result;
  }

  const studentNumber = String(formData.get('studentNumber') ?? '');
  const bookIsbn = String(formData.get('bookIsbn') ?? '');
  const field = String(formData.get('field') ?? '') as StudentOrderStatusField;
  const checked = String(formData.get('checked') ?? 'false') === 'true';

  if (!['ordered', 'paid', 'delivered'].includes(field)) {
    await logAdminAudit({
      adminEmail: adminUser.email,
      studentNumber,
      bookIsbn,
      field: 'ordered',
      checked,
      success: false,
      ip,
      userAgent,
      message: `無效的狀態欄位: ${field}`,
    });

    return { success: false, message: '無效的狀態欄位' };
  }

  const result = await updateStudentOrderStatusField({
    studentNumber,
    bookIsbn,
    field,
    checked,
  });

  await logAdminAudit({
    adminEmail: adminUser.email,
    studentNumber,
    bookIsbn,
    field,
    checked,
    success: result.success,
    ip,
    userAgent,
    message: result.message,
  });

  return result;
}
