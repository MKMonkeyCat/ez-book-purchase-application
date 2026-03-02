import type { IBook } from '~/types/purchase';

export const formatCurrency = (value: number | string) => {
  if (typeof value === 'string') {
    const parsed = Number(value.replaceAll(',', '').trim());
    if (!Number.isFinite(parsed)) return '-';
    value = parsed;
  }

  return `NT$ ${value.toLocaleString('zh-TW')}`;
};

export const parsePrice = (value?: string) => {
  if (!value) {
    return 0;
  }

  const parsed = Number(value.replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getCurrentPriceValue = (book: IBook, totalOrdered?: number) => {
  const groupPrice = parsePrice(book.groupPrice?.price);
  const onePrice = parsePrice(book.onePrice);
  const basePrice = parsePrice(book.basePrice);

  const minQuantity = Number(book.groupPrice?.minQuantity || 0);
  const hasGroupThreshold = minQuantity > 0;
  const reachedGroupThreshold =
    typeof totalOrdered === 'number' && totalOrdered >= minQuantity;

  if (groupPrice > 0 && (!hasGroupThreshold || reachedGroupThreshold)) {
    return groupPrice;
  }

  if (onePrice > 0) {
    return onePrice;
  }

  if (groupPrice > 0) {
    return groupPrice;
  }

  return basePrice;
};
