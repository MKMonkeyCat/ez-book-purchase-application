import {
  mapColumnsToStructuredObjects,
  mapRowsToObjects,
  readSheetRange,
  readSheetRanges,
} from '../google-sheets';
import { withCache } from '../utils/cache';
import { BOOKS_SHEET_NAME, ORDERS_SHEET_NAME, watchEditKeys } from './shared';
import {
  StudentOrderState,
  type IBook,
  type IOrder,
  type IStudent,
  type IStudentOrder,
} from '~/types/purchase';

const BOOKS_CACHE_KEY = 'books';
const STUDENTS_CACHE_KEY = 'students';
const ORDERS_CACHE_KEY = 'orders';

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
    ttl: 30 * 60 * 1000,
    staleIfError: true,
    watchKeys: [watchEditKeys.books],
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
    ttl: 30 * 60 * 1000,
    staleIfError: true,
    watchKeys: [watchEditKeys.students],
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

        if (dataRows[j][i] === 'O') status |= StudentOrderState.Ordered;
        if (dataRows[j][i + 1] === 'O') status |= StudentOrderState.Paid;
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
    ttl: 2 * 60 * 1000,
    staleIfError: true,
    watchKeys: [
      watchEditKeys.books,
      watchEditKeys.students,
      watchEditKeys.orders,
    ],
  },
);

export const getOrderByStudentNumber = async (studentNumber: string) => {
  const orders: IOrder[] = await getOrders();

  return orders.filter((order) =>
    order.students.some(
      (s) => s.number === studentNumber && s.status !== StudentOrderState.None,
    ),
  );
};
