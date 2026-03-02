import { notifyCacheEdit } from '../utils/cache';

export const LOGS_SHEET_ID =
  process.env.GOOGLE_SHEETS_LOGS_SPREADSHEET_ID ?? '';
export const BASE_SHEET_NAME = '1-2';
export const BOOKS_SHEET_NAME = `${BASE_SHEET_NAME}書`;
export const ORDERS_SHEET_NAME = `${BASE_SHEET_NAME} 訂書`;

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

export const watchEditKeys = {
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

export const indexToColumnLetter = (index: number): string => {
  let columnLetter = '';
  while (index >= 0) {
    columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
    index = Math.floor(index / 26) - 1;
  }
  return columnLetter;
};
