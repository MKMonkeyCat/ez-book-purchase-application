import type { Route } from './+types/page';
import { Form, Link, useNavigation } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  OrderStatus,
  StudentOrderState,
  type IBook,
  type IOrder,
} from '~/types/purchase';
import { isbot } from 'isbot';

const formatPrice = (value: string) => {
  if (!value) {
    return '';
  }
  return `NT$ ${value}`;
};

const formatCurrency = (value: number) =>
  `NT$ ${value.toLocaleString('zh-TW')}`;

const parsePrice = (value?: string) => {
  if (!value) {
    return 0;
  }
  const parsed = Number(value.replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCurrentPriceValue = (book: IBook, totalOrdered?: number) => {
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

const getPriceLabels = (book: IBook, totalOrdered?: number) => {
  const groupPrice = book.groupPrice?.price;
  const minQuantity = Number(book.groupPrice?.minQuantity || 0);

  const reachedGroupThreshold =
    typeof totalOrdered === 'number' && totalOrdered >= minQuantity;

  const priceItems: { label: string; priority: number }[] = [];
  if (book.onePrice) {
    priceItems.push({
      label: `單購價 ${formatPrice(book.onePrice)}`,
      priority: reachedGroupThreshold ? 2 : 1,
    });
  }

  if (groupPrice) {
    const thresholdText = minQuantity > 0 ? ` (滿${minQuantity}本)` : '';

    priceItems.push({
      label: `團體價 ${formatPrice(groupPrice)}${thresholdText}`,
      priority: reachedGroupThreshold ? 1 : 2,
    });
  }

  if (book.basePrice) {
    priceItems.push({
      label: `定價 ${formatPrice(book.basePrice)}`,
      priority: 3,
    });
  }

  if (priceItems.length === 0) return ['-'];

  priceItems.sort((a, b) => a.priority - b.priority);
  priceItems[0].label += ' (目前價格)';

  return priceItems.map((item) => item.label);
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: '登記訂書' },
    { name: 'description', content: '使用登記訂書' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getOrders, getStudents } = await import('~/.server/purchase-sheets');

  const requestUrl = new URL(request.url);
  const studentNumber =
    requestUrl.searchParams.get('studentNumber')?.trim() ?? '';

  // 406bbcxx
  // 第一碼 4:四技 3:二技 5:五專
  // 第二三碼 06:106入學
  // 第四五碼 bb:系所代號
  // 第六碼 c:1代表甲班 2代表乙班
  // 第七八碼 xx:座位號碼
  const checkStudentNumber =
    studentNumber !== '' && /[345]\d{2}\d{2}[12]\d{2}$/.test(studentNumber);

  if (!checkStudentNumber) {
    return { books: [] };
  }

  const students = await getStudents();
  const student = students.find((s) => s.number === studentNumber);

  if (!student) {
    return { books: [] };
  }

  const allOrders = await getOrders();
  const orders = allOrders.filter((order) =>
    order.students.some(
      (s) => s.number === studentNumber && s.status !== StudentOrderState.None,
    ),
  );
  const existingBookIsbns = new Set(
    orders?.map((order) => order.book.isbn) ?? [],
  );

  return {
    books: allOrders
      .filter(
        (order) =>
          order.status === OrderStatus.PreOrdering &&
          !existingBookIsbns.has(order.book.isbn),
      )
      .map((order) => order.book),
    orders,
    student,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const {
    logRegistration,
    registerOrderByStudentNumber,
    unregisterOrderByStudentNumber,
  } = await import('~/.server/purchase-sheets');

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? 'register');
  const studentNumber = String(formData.get('studentNumber') ?? '');
  const bookIsbn = String(formData.get('bookIsbn') ?? '');

  const IP =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('remote_addr') ||
    '';

  const userAgent = request.headers.get('user-agent') || '';
  const isBot = isbot(userAgent);
  if (isBot) {
    logRegistration({
      success: false,
      message: '機器人偵測',
      ip: IP,
      userAgent: userAgent,
    });
    return { success: false, message: '請勿使用機器人進行訂書登記。' };
  }

  const result =
    intent === 'delete'
      ? await unregisterOrderByStudentNumber({ studentNumber, bookIsbn })
      : await registerOrderByStudentNumber({ studentNumber, bookIsbn });

  logRegistration({
    student: result.student,
    book: result.book,
    success: result.success,
    message: result.message,
    ip: IP,
    userAgent: userAgent,
  });

  return { success: result.success, message: result.message };
}

export default function RegisterOrder({ loaderData }: Route.ComponentProps) {
  const student = loaderData.student;
  if (!student) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            登記學號訂書
          </Typography>

          <Alert severity="error">無效的學號，請確認後重新輸入。</Alert>
          <Link to="/">重新輸入學號</Link>
        </Paper>
      </Container>
    );
  }

  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const submittingIntent = String(
    navigation.formData?.get('intent') ?? 'register',
  );
  const submittingBookIsbn = String(navigation.formData?.get('bookIsbn') ?? '');
  const isRegisterSubmitting = isSubmitting && submittingIntent === 'register';

  const availableBookIsbns = useMemo(
    () => loaderData.books.map((book) => book.isbn),
    [loaderData.books],
  );
  const [selectedBookIsbn, setSelectedBookIsbn] = useState('');

  useEffect(() => {
    if (!availableBookIsbns.includes(selectedBookIsbn)) {
      setSelectedBookIsbn('');
    }
  }, [availableBookIsbns, selectedBookIsbn]);

  const getStudentOrderStatus = (order: IOrder) => {
    return (
      order.students.find((item) => item.number === student.number)?.status ??
      StudentOrderState.None
    );
  };

  const estimatedPayableTotal = loaderData.orders.reduce((sum, order) => {
    const studentOrderStatus = getStudentOrderStatus(order);
    const isPaid = (studentOrderStatus & StudentOrderState.Paid) !== 0;
    if (isPaid) return sum;

    return sum + getCurrentPriceValue(order.book, order.totalOrdered);
  }, 0);

  return (
    <Container maxWidth="sm" sx={{ my: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          登記學號訂書
        </Typography>

        <Box>
          <Typography variant="subtitle1">學號：{student.number}</Typography>
          <Typography variant="subtitle1">姓名：{student.name}</Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>
            待付款試算總額：{formatCurrency(estimatedPayableTotal)}
          </Typography>
        </Box>

        <Form
          method="post"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <input type="hidden" name="studentNumber" value={student.number} />
          <input type="hidden" name="intent" value="register" />
          <TextField
            id="bookIsbn"
            name="bookIsbn"
            label="書本"
            required
            select
            fullWidth
            value={selectedBookIsbn}
            onChange={(event) => setSelectedBookIsbn(event.target.value)}
            disabled={isSubmitting}
          >
            <MenuItem value="" disabled>
              請選擇書本
            </MenuItem>
            {loaderData.books.map((book) => (
              <MenuItem key={book.isbn} value={book.isbn}>
                {book.subject}｜{book.name}｜{book.isbn}｜
                {getPriceLabels(book).join('｜')}
              </MenuItem>
            ))}
          </TextField>

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isRegisterSubmitting ? '發送中...' : '發送訂單'}
          </Button>
        </Form>

        {loaderData.orders.map((order: IOrder) => (
          <Box
            key={order.book.isbn}
            sx={{ mt: 3, p: 2, border: '1px solid #ccc', position: 'relative' }}
          >
            {(() => {
              const studentOrderStatus = getStudentOrderStatus(order);
              const isPaid =
                (studentOrderStatus & StudentOrderState.Paid) !== 0;
              const isDelivered =
                (studentOrderStatus & StudentOrderState.Delivered) !== 0;

              return (
                <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    color={isPaid ? 'success' : 'default'}
                    label={isPaid ? '已付款' : '未付款'}
                  />
                  <Chip
                    size="small"
                    color={isDelivered ? 'success' : 'default'}
                    label={isDelivered ? '已交付' : '未交付'}
                  />
                </Box>
              );
            })()}

            <Box>
              <Chip
                label={order.status}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: {
                    [OrderStatus.PreOrdering]: 'primary.main',
                    [OrderStatus.PreOrderClosed]: 'warning.main',
                    [OrderStatus.Ordered]: 'success.main',
                    [OrderStatus.Closed]: 'error.main',
                  }[order.status],
                  color: '#fff',
                }}
              />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Typography variant="subtitle1">
                  {order.book.subject}｜{order.book.name}｜{order.book.isbn}
                </Typography>
              </Box>
              <Box>
                {getPriceLabels(order.book, order.totalOrdered).map(
                  (label, index) => (
                    <Typography
                      key={index}
                      variant="subtitle2"
                      sx={{
                        fontWeight: label.includes('(目前價格)') ? 700 : 400,
                      }}
                    >
                      {label}
                    </Typography>
                  ),
                )}
                <Typography variant="subtitle2">
                  現班級總預購數: {order.totalOrdered}
                </Typography>
              </Box>
            </Box>

            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input
                type="hidden"
                name="studentNumber"
                value={student.number}
              />
              <input type="hidden" name="bookIsbn" value={order.book.isbn} />
              <IconButton
                type="submit"
                disabled={
                  isSubmitting || order.status !== OrderStatus.PreOrdering
                }
                sx={{ position: 'absolute', bottom: 8, right: 8 }}
              >
                {isSubmitting &&
                submittingIntent === 'delete' &&
                submittingBookIsbn === order.book.isbn ? (
                  <CircularProgress size={18} />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </IconButton>
            </Form>
          </Box>
        ))}
      </Paper>
    </Container>
  );
}
