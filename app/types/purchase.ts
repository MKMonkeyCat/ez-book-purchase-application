export enum StudentOrderState {
  None = 0,
  Ordered = 4,
  Paid = 2,
  Delivered = 1,
}

export enum OrderStatus {
  PreOrdering = '預購中',
  PreOrderClosed = '預購截止',
  Ordered = '已訂購',
  Closed = '已關閉',
}

export interface IBook {
  subject: string;
  name: string;
  author: string;
  publisher: string;

  basePrice: string;
  onePrice: string;
  groupPrice: { price: string; minQuantity: string };

  isbn: string;
  image: string;
}

export interface IStudent {
  seat: number;
  number: string;
  name: string;
}

export interface IStudentOrder extends IStudent {
  status: number;
}

export interface IOrder {
  book: IBook;
  status: OrderStatus;
  students: IStudentOrder[];
  totalOrdered: number;
}
