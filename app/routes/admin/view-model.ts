import type { AdminOrderRow } from './types';

export type RowFilter = 'all' | 'unpaid' | 'undelivered';
export type SortDirection = 'asc' | 'desc';

export const sortLabelMap = {
  subject: '科目',
  bookName: '書名',
  studentNumber: '學號',
  studentName: '姓名',
  paid: '付款狀態',
  delivered: '交付狀態',
};

export type SortBy = keyof typeof sortLabelMap;

const getSeatNumber = (studentNumber: string) =>
  studentNumber.slice(Math.max(0, studentNumber.length - 2));

export const buildStats = (rows: AdminOrderRow[]) => {
  const total = rows.length;
  const paid = rows.filter((row) => row.paid).length;
  const delivered = rows.filter((row) => row.delivered).length;

  return { total, unpaid: total - paid, undelivered: total - delivered };
};

export const buildBookOptions = (rows: AdminOrderRow[]) => {
  const optionSet = new Set<string>();
  for (const row of rows) {
    optionSet.add(row.subject);
    optionSet.add(row.bookName);
    optionSet.add(row.bookIsbn);
  }

  return [...optionSet];
};

export const buildStudentOptions = (rows: AdminOrderRow[]) => {
  const optionSet = new Set<string>();
  for (const row of rows) {
    optionSet.add(getSeatNumber(row.studentNumber));
  }

  return [...optionSet].sort((a, b) => a.localeCompare(b));
};

export const filterAndSortRows = ({
  rows,
  filter,
  studentKeyword,
  bookKeyword,
  sortBy,
  sortDirection,
}: {
  rows: AdminOrderRow[];
  filter: RowFilter;
  studentKeyword: string;
  bookKeyword: string;
  sortBy: SortBy;
  sortDirection: SortDirection;
}) => {
  const normalizedStudentKeyword = studentKeyword.trim().toLowerCase();
  const normalizedBookKeyword = bookKeyword.trim().toLowerCase();

  const bookKeywordTokens = normalizedBookKeyword
    .split(/[\s,，]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const excludedBookTokens = bookKeywordTokens
    .filter(
      (token) =>
        (token.startsWith('-') || token.startsWith('!')) && token.length > 1,
    )
    .map((token) => token.slice(1));
  const includedBookTokens = bookKeywordTokens.filter(
    (token) => !token.startsWith('-') && !token.startsWith('!'),
  );

  return rows
    .filter((row) => {
      if (filter === 'unpaid' && row.paid) return false;
      if (filter === 'undelivered' && row.delivered) return false;

      if (normalizedStudentKeyword) {
        const studentText = getSeatNumber(row.studentNumber)
          .toLowerCase()
          .replaceAll('\n', '');
        if (!studentText.includes(normalizedStudentKeyword)) return false;
      }

      if (normalizedBookKeyword) {
        const bookText = `${row.subject} ${row.bookName} ${row.bookIsbn}`
          .toLowerCase()
          .replaceAll('\n', '');

        if (
          includedBookTokens.some(
            (includedToken) =>
              includedToken && !bookText.includes(includedToken),
          )
        ) {
          return false;
        }

        if (
          excludedBookTokens.some(
            (excludedToken) =>
              excludedToken && bookText.includes(excludedToken),
          )
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let bySortField: number;
      if (sortBy === 'studentNumber') {
        bySortField = a.studentNumber.localeCompare(b.studentNumber);
      } else if (sortBy === 'studentName') {
        bySortField = a.studentName.localeCompare(b.studentName, 'zh-Hant');
      } else if (sortBy === 'bookName') {
        bySortField = a.bookName.localeCompare(b.bookName, 'zh-Hant');
      } else {
        bySortField = a.subject.localeCompare(b.subject, 'zh-Hant');
      }

      if (bySortField !== 0) {
        return sortDirection === 'asc' ? bySortField : -bySortField;
      }

      const bySubject = a.subject.localeCompare(b.subject, 'zh-Hant');
      if (bySubject !== 0) return bySubject;

      const byBook = a.bookName.localeCompare(b.bookName, 'zh-Hant');
      if (byBook !== 0) return byBook;

      return a.studentNumber.localeCompare(b.studentNumber);
    });
};

export const findSingleStudentNumber = (rows: AdminOrderRow[]) => {
  if (rows.length === 0) return '';

  const uniqueStudentNumbers = new Set(rows.map((row) => row.studentNumber));
  if (uniqueStudentNumbers.size !== 1) return '';

  return rows[0].studentNumber;
};

export const getBulkPayBookIsbns = (rows: AdminOrderRow[]) =>
  Array.from(
    new Set(
      rows
        .filter((row) => !row.paid)
        .map((row) => row.bookIsbn)
        .filter(Boolean),
    ),
  );

export const getBulkUnpayBookIsbns = (rows: AdminOrderRow[]) =>
  Array.from(
    new Set(
      rows
        .filter((row) => row.paid)
        .map((row) => row.bookIsbn)
        .filter(Boolean),
    ),
  );

export const getBulkDeliverBookIsbns = (rows: AdminOrderRow[]) =>
  Array.from(
    new Set(
      rows
        .filter((row) => !row.delivered)
        .map((row) => row.bookIsbn)
        .filter(Boolean),
    ),
  );

export const getBulkUndeliverBookIsbns = (rows: AdminOrderRow[]) =>
  Array.from(
    new Set(
      rows
        .filter((row) => row.delivered)
        .map((row) => row.bookIsbn)
        .filter(Boolean),
    ),
  );

export const getSingleStudentUnpaidAmount = (rows: AdminOrderRow[]) => {
  const studentNumber = findSingleStudentNumber(rows);
  if (!studentNumber) return null;

  const unpaidAmount = rows
    .filter((row) => !row.paid)
    .reduce((sum, row) => sum + row.payableAmount, 0);

  return { studentNumber, unpaidAmount, studentName: rows[0].studentName };
};
