import {
  appendSheetRow,
  mapColumnsToStructuredObjects,
  mapRowsToObjects,
  readSheetRange,
  readSheetRanges,
  updateSheetRange,
} from './google-sheets';
import { notifyCacheEdit, withCache } from './utils/cache';
import {
  OrderStatus,
  StudentOrderState,
  type IBook,
  type IOrder,
  type IRegisterOrderInput,
  type IStudent,
  type IStudentOrder,
  type IUpdateStudentOrderStatusFieldInput,
  type StudentOrderStatusField,
} from '~/types/purchase';

export const LOGS_SHEET_ID =
  process.env.GOOGLE_SHEETS_LOGS_SPREADSHEET_ID ?? '';
export const BASE_SHEET_NAME = '1-2';
export const BOOKS_SHEET_NAME = `${BASE_SHEET_NAME}書`;
export const ORDERS_SHEET_NAME = `${BASE_SHEET_NAME} 訂書`;

const BOOKS_CACHE_KEY = 'books';
const STUDENTS_CACHE_KEY = 'students';
const ORDERS_CACHE_KEY = 'orders';

const BOOKS_EDIT_KEY = 'sheets:books';
const STUDENTS_EDIT_KEY = 'sheets:students';
const ORDERS_EDIT_KEY = 'sheets:orders';

export type PurchaseSheetEditTarget = 'books' | 'students' | 'orders' | 'all';

const EDIT_KEY_BY_TARGET: Record<
  Exclude<PurchaseSheetEditTarget, 'all'>,
  string
> = {
  books: BOOKS_EDIT_KEY,
  students: STUDENTS_EDIT_KEY,
  orders: ORDERS_EDIT_KEY,
};

export const notifyPurchaseSheetsEdited = (
  targets: PurchaseSheetEditTarget[] = ['all'],
) => {
  const requested = targets.length > 0 ? targets : ['all'];
  const hasAll = requested.includes('all');

  const keys = hasAll
    ? Object.values(EDIT_KEY_BY_TARGET)
    : requested
        .filter((target): target is Exclude<PurchaseSheetEditTarget, 'all'> => {
          return target !== 'all';
        })
        .map((target) => EDIT_KEY_BY_TARGET[target]);

  notifyCacheEdit(Array.from(new Set(keys)));
};

export const getBooks = withCache(
  BOOKS_CACHE_KEY,
  async (): Promise<IBook[]> => {
    const rows = await readSheetRange(BOOKS_SHEET_NAME);
    const bookMapping = {
      科目: 'subject',
      書名: 'name',
      作者: 'author',
      出版社: 'publisher',

      定價: 'basePrice',
      單購價: 'onePrice',

      團體價: 'groupPrice.price',
      團體價最低訂購量: 'groupPrice.minQuantity',

      isbn: 'isbn',
      Image: 'image',
    };

    return mapColumnsToStructuredObjects(rows, bookMapping);
  },
  {
    ttl: 30 * 60 * 1000, // 30 minutes
    staleIfError: true,
    watchKeys: [BOOKS_EDIT_KEY],
  },
);

export const getStudents = withCache(
  STUDENTS_CACHE_KEY,
  async (): Promise<IStudent[]> => {
    const [rowsPart1, rowsPart2] = await readSheetRanges([
      `${ORDERS_SHEET_NAME}!A4:C`,
      `${ORDERS_SHEET_NAME}!A73:C`,
    ]);
    const rows = [...rowsPart1, ...rowsPart2];
    return mapRowsToObjects(rows)
      .map(
        (row): IStudent => ({
          seat: +row['座號'],
          number: row['學號'],
          name: row['姓名'].replaceAll('*', '').trim(),
        }),
      )
      .filter((student) => student.seat && student.number && student.name);
  },
  {
    ttl: 30 * 60 * 1000, // 30 minutes
    staleIfError: true,
    watchKeys: [STUDENTS_EDIT_KEY],
  },
);

export const getOrders = withCache(
  ORDERS_CACHE_KEY,
  async () => {
    const books = await getBooks();
    const students = await getStudents();
    const rows = await readSheetRange(`${ORDERS_SHEET_NAME}!D3:AA66`);

    const statusRows = rows[0];
    const dataRows = rows.slice(2);
    const orders: IOrder[] = [];

    for (let i = 0; i < statusRows.length; i += 3) {
      const studentOrders: IStudentOrder[] = [];
      for (let j = 0; j < dataRows.length; j++) {
        let status: number = 0;

        // 是否訂購
        if (dataRows[j][i] === 'O') status |= StudentOrderState.Ordered;
        // 是否收款
        if (dataRows[j][i + 1] === 'O') status |= StudentOrderState.Paid;
        // 是否交付
        if (dataRows[j][i + 2] === 'O') {
          status |= StudentOrderState.Delivered;
        }

        studentOrders.push({ ...students[j], status });
      }

      const book = books[i / 3];
      const status = statusRows[i] as IOrder['status'];
      if (!book || !status) {
        continue;
      }

      const totalOrdered = studentOrders.filter(
        (s) => s.status !== StudentOrderState.None,
      ).length;

      orders.push({ book, status, students: studentOrders, totalOrdered });
    }

    return orders;
  },
  {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleIfError: true,
    watchKeys: [BOOKS_EDIT_KEY, STUDENTS_EDIT_KEY, ORDERS_EDIT_KEY],
  },
);

export const getOrderByStudentNumber = async (studentNumber: string) => {
  const orders: IOrder[] = await getOrders();

  const studentOrder = orders.filter((order) =>
    order.students.some(
      (s) => s.number === studentNumber && s.status !== StudentOrderState.None,
    ),
  );

  return studentOrder;
};

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

export const appendLog = async (
  data: [
    user: string,
    book: string,
    success: string,
    ip: string,
    userAgent: string,
    message: string,
  ],
) => {
  await appendSheetRow(BASE_SHEET_NAME, [new Date().toUTCString(), ...data], {
    config: { spreadsheetId: LOGS_SHEET_ID },
  });
};

export const logRegistration = async ({
  student,
  book,
  success,
  ip,
  userAgent,
  message,
}: {
  student?: IStudent;
  book?: IBook;
  success: boolean;
  ip: string;
  userAgent: string;
  message: string;
}) => {
  await appendLog([
    student ? `${student.number}:${student.name}` : '',
    book ? `${book.isbn}:${book.name}` : '',
    success ? '成功' : '失敗',
    ip,
    userAgent,
    message,
  ]);
};

export const logAdminAudit = async ({
  adminEmail,
  studentNumber,
  bookIsbn,
  field,
  checked,
  success,
  ip,
  userAgent,
  message,
}: {
  adminEmail: string;
  studentNumber: string;
  bookIsbn: string;
  field: StudentOrderStatusField;
  checked: boolean;
  success: boolean;
  ip: string;
  userAgent: string;
  message: string;
}) => {
  await appendLog([
    `admin:${adminEmail}`,
    `${studentNumber} / ${bookIsbn} / ${field} -> ${checked}`,
    success ? '成功' : '失敗',
    ip,
    userAgent,
    message,
  ]);
};

export const indexToColumnLetter = (index: number): string => {
  let columnLetter = '';
  while (index >= 0) {
    columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
    index = Math.floor(index / 26) - 1;
  }
  return columnLetter;
};
