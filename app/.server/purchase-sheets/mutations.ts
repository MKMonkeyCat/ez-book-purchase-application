import { updateSheetRange, updateSheetRanges } from '../google-sheets';
import {
  indexToColumnLetter,
  notifyPurchaseSheetsEdited,
  ORDERS_SHEET_NAME,
} from './shared';
import { getBooks, getOrders, getStudents } from './queries';
import {
  OrderStatus,
  StudentOrderState,
  type IBook,
  type IRegisterOrderInput,
  type IStudent,
  type IUpdateStudentOrderStatusFieldInput,
  type StudentOrderStatusField,
} from '~/types/purchase';

export async function registerOrderByStudentNumber(
  input: IRegisterOrderInput,
): Promise<{
  success: boolean;
  message: string;
  student?: IStudent;
  book?: IBook;
}> {
  const studentNumber = input.studentNumber.trim();
  const bookIsbn = input.bookIsbn.trim();

  if (!studentNumber || !bookIsbn) {
    return { success: false, message: '學號與 ISBN 為必填' };
  }

  const [students, books] = await Promise.all([getStudents(), getBooks()]);

  const studentIndex = students.findIndex(
    (item) => item.number === studentNumber,
  );
  if (studentIndex === -1) {
    return { success: false, message: '查無此學號，請確認後再試' };
  }
  const student = students[studentIndex];

  const bookIndex = books.findIndex((item) => item.isbn === bookIsbn);
  if (bookIndex === -1) {
    return { success: false, message: '查無此書籍 ISBN，請重新選擇' };
  }
  const book = books[bookIndex];

  await updateSheetRange(
    `${ORDERS_SHEET_NAME}!${indexToColumnLetter(bookIndex * 3 + 3)}${studentIndex + 5}`,
    [['O']],
  );
  notifyPurchaseSheetsEdited(['orders']);

  return {
    success: true,
    message: `已登記 ${student.name} 訂購 「${book.name}」`,
    student,
    book,
  };
}

export async function unregisterOrderByStudentNumber(
  input: IRegisterOrderInput,
): Promise<{
  success: boolean;
  message: string;
  student?: IStudent;
  book?: IBook;
}> {
  const studentNumber = input.studentNumber.trim();
  const bookIsbn = input.bookIsbn.trim();

  if (!studentNumber || !bookIsbn) {
    return { success: false, message: '學號與 ISBN 為必填' };
  }

  const [students, books, orders] = await Promise.all([
    getStudents(),
    getBooks(),
    getOrders(),
  ]);

  const studentIndex = students.findIndex(
    (item) => item.number === studentNumber,
  );
  if (studentIndex === -1) {
    return { success: false, message: '查無此學號，請確認後再試' };
  }
  const student = students[studentIndex];

  const bookIndex = books.findIndex((item) => item.isbn === bookIsbn);
  if (bookIndex === -1) {
    return { success: false, message: '查無此書籍 ISBN，請重新選擇' };
  }
  const book = books[bookIndex];

  const order = orders.find((item) => item.book.isbn === bookIsbn);
  if (!order) {
    return { success: false, message: '查無此訂單資料' };
  }

  const studentOrder = order.students.find(
    (item) => item.number === studentNumber,
  );
  if (!studentOrder || studentOrder.status === StudentOrderState.None) {
    return { success: false, message: '目前沒有此書的訂購紀錄' };
  }

  if ((studentOrder.status & StudentOrderState.Paid) !== 0) {
    return { success: false, message: '此訂單已收款，無法直接刪除' };
  }

  if ((studentOrder.status & StudentOrderState.Delivered) !== 0) {
    return { success: false, message: '此訂單已交付，無法直接刪除' };
  }

  if (order.status !== OrderStatus.PreOrdering) {
    return { success: false, message: '目前非預購中，無法刪除' };
  }

  const startColumn = indexToColumnLetter(bookIndex * 3 + 3);
  const endColumn = indexToColumnLetter(bookIndex * 3 + 5);
  const row = studentIndex + 5;

  await updateSheetRange(
    `${ORDERS_SHEET_NAME}!${startColumn}${row}:${endColumn}${row}`,
    [['', '', '']],
  );
  notifyPurchaseSheetsEdited(['orders']);

  return {
    success: true,
    message: `已取消 ${student.name} 訂購「${book.name}」`,
    student,
    book,
  };
}

export async function updateStudentOrderStatusField(
  input: IUpdateStudentOrderStatusFieldInput,
): Promise<{
  success: boolean;
  message: string;
  student?: IStudent;
  book?: IBook;
}> {
  const studentNumber = input.studentNumber.trim();
  const bookIsbn = input.bookIsbn.trim();

  if (!studentNumber || !bookIsbn) {
    return { success: false, message: '學號與 ISBN 為必填' };
  }

  const [students, books] = await Promise.all([getStudents(), getBooks()]);

  const studentIndex = students.findIndex(
    (item) => item.number === studentNumber,
  );
  if (studentIndex === -1) {
    return { success: false, message: '查無此學號，請確認後再試' };
  }
  const student = students[studentIndex];

  const bookIndex = books.findIndex((item) => item.isbn === bookIsbn);
  if (bookIndex === -1) {
    return { success: false, message: '查無此書籍 ISBN，請重新選擇' };
  }
  const book = books[bookIndex];

  const fieldOffsetByName: Record<StudentOrderStatusField, number> = {
    ordered: 0,
    paid: 1,
    delivered: 2,
  };

  const row = studentIndex + 5;
  const column = indexToColumnLetter(
    bookIndex * 3 + 3 + fieldOffsetByName[input.field],
  );

  await updateSheetRange(`${ORDERS_SHEET_NAME}!${column}${row}`, [
    [input.checked ? 'O' : ''],
  ]);
  notifyPurchaseSheetsEdited(['orders']);

  const fieldTextByName = {
    ordered: '已訂購',
    paid: '已付款',
    delivered: '已交付',
  };

  return {
    success: true,
    message: `已更新 ${student.name}「${book.name}」的${fieldTextByName[input.field]}狀態`,
    student,
    book,
  };
}

export async function updateStudentPaidStatusByBookIsbnsBulk(input: {
  studentNumber: string;
  bookIsbns: string[];
  checked: boolean;
}): Promise<{
  success: boolean;
  message: string;
  student?: IStudent;
  updatedBookIsbns: string[];
  missingBookIsbns: string[];
}> {
  return updateStudentStatusByBookIsbnsBulk({
    studentNumber: input.studentNumber,
    bookIsbns: input.bookIsbns,
    field: 'paid',
    checked: input.checked,
  });
}

export async function updateStudentStatusByBookIsbnsBulk(input: {
  studentNumber: string;
  bookIsbns: string[];
  field: Extract<StudentOrderStatusField, 'paid' | 'delivered'>;
  checked: boolean;
}): Promise<{
  success: boolean;
  message: string;
  student?: IStudent;
  updatedBookIsbns: string[];
  missingBookIsbns: string[];
}> {
  const studentNumber = input.studentNumber.trim();
  const bookIsbns = Array.from(
    new Set(input.bookIsbns.map((isbn) => isbn.trim()).filter(Boolean)),
  );

  if (!studentNumber || bookIsbns.length === 0) {
    return {
      success: false,
      message: '學號與書籍資料為必填',
      updatedBookIsbns: [],
      missingBookIsbns: [],
    };
  }

  const [students, books] = await Promise.all([getStudents(), getBooks()]);

  const studentIndex = students.findIndex(
    (item) => item.number === studentNumber,
  );
  if (studentIndex === -1) {
    return {
      success: false,
      message: '查無此學號，請確認後再試',
      updatedBookIsbns: [],
      missingBookIsbns: [],
    };
  }
  const student = students[studentIndex];

  const row = studentIndex + 5;
  const updates: Array<{ range: string; rows: string[][] }> = [];
  const updatedBookIsbns: string[] = [];
  const missingBookIsbns: string[] = [];
  const fieldOffsetByName = {
    paid: 1,
    delivered: 2,
  } as const;
  const fieldStatusByName = {
    paid: { checked: '已付款', unchecked: '未付款' },
    delivered: { checked: '已交付', unchecked: '未交付' },
  } as const;

  for (const bookIsbn of bookIsbns) {
    const bookIndex = books.findIndex((item) => item.isbn === bookIsbn);
    if (bookIndex === -1) {
      missingBookIsbns.push(bookIsbn);
      continue;
    }

    const statusColumn = indexToColumnLetter(
      bookIndex * 3 + 3 + fieldOffsetByName[input.field],
    );
    updates.push({
      range: `${ORDERS_SHEET_NAME}!${statusColumn}${row}`,
      rows: [[input.checked ? 'O' : '']],
    });
    updatedBookIsbns.push(bookIsbn);
  }

  if (updates.length === 0) {
    return {
      success: false,
      message: '沒有可更新的書籍資料',
      student,
      updatedBookIsbns,
      missingBookIsbns,
    };
  }

  await updateSheetRanges(updates);
  notifyPurchaseSheetsEdited(['orders']);

  const actionText = input.checked
    ? fieldStatusByName[input.field].checked
    : fieldStatusByName[input.field].unchecked;

  return {
    success: true,
    message:
      missingBookIsbns.length > 0
        ? `已將 ${student.name} 的 ${updatedBookIsbns.length} 筆設為${actionText}，另有 ${missingBookIsbns.length} 筆書籍不存在`
        : `已將 ${student.name} 的 ${updatedBookIsbns.length} 筆設為${actionText}`,
    student,
    updatedBookIsbns,
    missingBookIsbns,
  };
}
