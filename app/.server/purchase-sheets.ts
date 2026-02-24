import {
  appendSheetRow,
  mapColumnsToStructuredObjects,
  mapRowsToObjects,
  readSheetRange,
  updateSheetRange,
} from './google-sheets';
import { withCache } from './utils/cache';
import {
  OrderStatus,
  StudentOrderState,
  type IBook,
  type IOrder,
  type IStudent,
  type IStudentOrder,
} from '~/types/purchase';

export const LOGS_SHEET_ID =
  process.env.GOOGLE_SHEETS_LOGS_SPREADSHEET_ID ?? '';
export const BASE_SHEET_NAME = '1-2';
export const BOOKS_SHEET_NAME = `${BASE_SHEET_NAME}書`;
export const ORDERS_SHEET_NAME = `${BASE_SHEET_NAME} 訂書`;

export const getBooks = withCache(
  'books',
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
  10 * 60 * 1000, // 10 minutes
);

export const getStudents = withCache(
  'students',
  async (): Promise<IStudent[]> => {
    const rows = await readSheetRange(`${ORDERS_SHEET_NAME}!A4:C`);
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
  10 * 60 * 1000, // 10 minutes
);

export const getOrders = async () => {
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
};

export const getOrderByStudentNumber = async (studentNumber: string) => {
  const orders: IOrder[] = await getOrders();

  const studentOrder = orders.filter((order) =>
    order.students.some(
      (s) => s.number === studentNumber && s.status !== StudentOrderState.None,
    ),
  );

  return studentOrder;
};

export interface IRegisterOrderInput {
  studentNumber: string;
  bookIsbn: string;
}

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

  return {
    success: true,
    message: `已取消 ${student.name} 訂購「${book.name}」`,
    student,
    book,
  };
}

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
  ip?: string;
  userAgent?: string;
  message?: string;
}) => {
  await appendSheetRow(
    BASE_SHEET_NAME,
    [
      new Date().toISOString(),
      student ? `${student.number}:${student.name}` : '',
      book ? `${book.isbn}:${book.name}` : '',
      success ? '成功' : '失敗',
      ip ?? '',
      userAgent ?? '',
      message ?? '',
    ],
    { config: { spreadsheetId: LOGS_SHEET_ID } },
  );
};

export const indexToColumnLetter = (index: number): string => {
  let columnLetter = '';
  while (index >= 0) {
    columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
    index = Math.floor(index / 26) - 1;
  }
  return columnLetter;
};
