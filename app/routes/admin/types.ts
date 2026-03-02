export interface AdminOrderRow {
  bookIsbn: string;
  bookName: string;
  subject: string;
  studentNumber: string;
  studentName: string;
  payableAmount: number;
  ordered: boolean;
  paid: boolean;
  delivered: boolean;
}

export interface SelectableBookOption {
  isbn: string;
  label: string;
}
