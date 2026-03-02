import { appendSheetRow } from '../google-sheets';
import { BASE_SHEET_NAME, LOGS_SHEET_ID } from './shared';
import type {
  IBook,
  IStudent,
  StudentOrderStatusField,
} from '~/types/purchase';

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
