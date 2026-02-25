import type { Route } from './+types/page';
import { Form, redirect, useNavigation } from 'react-router';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  StudentOrderState,
  type StudentOrderStatusField,
} from '~/types/purchase';
import MemoOrderStatusForm from './OrderStatusForm';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '訂書管理頁' },
    { name: 'description', content: '管理付款與交付狀態' },
  ];
}

const hasFlag = (value: number, flag: StudentOrderState) =>
  (value & flag) === flag;

type RowFilter = 'all' | 'unpaid' | 'undelivered';
type SortDirection = 'asc' | 'desc';

const sortLabelMap = {
  subject: '科目',
  bookName: '書名',
  studentNumber: '學號',
  studentName: '姓名',
  paid: '付款狀態',
  delivered: '交付狀態',
};

type SortBy = keyof typeof sortLabelMap;

export async function loader({ request }: Route.LoaderArgs) {
  const { requireAdminUser } = await import('~/.server/admin-auth');
  const { getOrders } = await import('~/.server/purchase-sheets');

  const user = await requireAdminUser(request);
  const orders = await getOrders();

  const orderRows = orders.flatMap(({ book, students }) =>
    students
      .filter((student) => student.status !== StudentOrderState.None)
      .map((student) => ({
        bookIsbn: book.isbn,
        bookName: book.name,
        subject: book.subject,
        studentNumber: student.number,
        studentName: student.name,
        ordered: hasFlag(student.status, StudentOrderState.Ordered),
        paid: hasFlag(student.status, StudentOrderState.Paid),
        delivered: hasFlag(student.status, StudentOrderState.Delivered),
      })),
  );

  return { user, orderRows };
}

export async function action({ request }: Route.ActionArgs) {
  const { requireAdminUser, commitAdminLogout } =
    await import('~/.server/admin-auth');
  const { updateStudentOrderStatusField, logAdminAudit } =
    await import('~/.server/purchase-sheets');

  const adminUser = await requireAdminUser(request);

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? 'update-status');

  if (intent === 'logout') {
    const setCookie = await commitAdminLogout(request);
    return redirect('/admin/login', { headers: { 'Set-Cookie': setCookie } });
  }

  const studentNumber = String(formData.get('studentNumber') ?? '');
  const bookIsbn = String(formData.get('bookIsbn') ?? '');
  const field = String(formData.get('field') ?? '') as StudentOrderStatusField;
  const checked = String(formData.get('checked') ?? 'false') === 'true';

  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('remote_addr') ||
    '';
  const userAgent = request.headers.get('user-agent') || '';

  if (!['ordered', 'paid', 'delivered'].includes(field)) {
    await logAdminAudit({
      adminEmail: adminUser.email,
      studentNumber,
      bookIsbn,
      field: 'ordered',
      checked,
      success: false,
      ip,
      userAgent,
      message: `無效的狀態欄位: ${field}`,
    });

    return { success: false, message: '無效的狀態欄位' };
  }

  const result = await updateStudentOrderStatusField({
    studentNumber,
    bookIsbn,
    field,
    checked,
  });

  await logAdminAudit({
    adminEmail: adminUser.email,
    studentNumber,
    bookIsbn,
    field,
    checked,
    success: result.success,
    ip,
    userAgent,
    message: result.message,
  });

  return result;
}

export default function AdminPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const [studentKeyword, setStudentKeyword] = useState('');
  const deferredStudentKeyword = useDeferredValue(studentKeyword);
  const [bookKeyword, setBookKeyword] = useState('');
  const deferredBookKeyword = useDeferredValue(bookKeyword);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('subject');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const submittingIntent = String(navigation.formData?.get('intent') ?? '');
  const submittingStudentNumber = String(
    navigation.formData?.get('studentNumber') ?? '',
  );
  const submittingBookIsbn = String(navigation.formData?.get('bookIsbn') ?? '');

  const rowSubmittingKey =
    submittingIntent === 'update-status'
      ? `${submittingBookIsbn}:${submittingStudentNumber}`
      : '';

  const isLogoutSubmitting = isSubmitting && submittingIntent === 'logout';

  const stats = useMemo(() => {
    const total = loaderData.orderRows.length;
    const paid = loaderData.orderRows.filter((row) => row.paid).length;
    const delivered = loaderData.orderRows.filter(
      (row) => row.delivered,
    ).length;

    return { total, unpaid: total - paid, undelivered: total - delivered };
  }, [loaderData.orderRows]);

  const bookOptions = useMemo(() => {
    const optionSet = new Set<string>();

    for (const row of loaderData.orderRows) {
      optionSet.add(row.subject);
      optionSet.add(row.bookName);
      optionSet.add(row.bookIsbn);
    }

    return [...optionSet];
  }, [loaderData.orderRows]);

  const studentOptions = useMemo(() => {
    const optionSet = new Set<string>();

    for (const row of loaderData.orderRows) {
      optionSet.add(row.studentNumber);
      optionSet.add(row.studentName);
    }

    return [...optionSet];
  }, [loaderData.orderRows]);

  const filteredRows = useMemo(() => {
    const normalizedStudentKeyword = deferredStudentKeyword
      .trim()
      .toLowerCase();
    const normalizedBookKeyword = deferredBookKeyword.trim().toLowerCase();

    return loaderData.orderRows
      .filter((row) => {
        if (filter === 'unpaid' && row.paid) return false;
        if (filter === 'undelivered' && row.delivered) return false;

        if (normalizedStudentKeyword) {
          const studentText = `${row.studentNumber} ${row.studentName}`
            .toLowerCase()
            .replaceAll('\n', '');
          if (!studentText.includes(normalizedStudentKeyword)) return false;
        }

        if (normalizedBookKeyword) {
          const bookText = `${row.subject} ${row.bookName} ${row.bookIsbn}`
            .toLowerCase()
            .replaceAll('\n', '');
          console.log(normalizedBookKeyword, bookText);
          if (!bookText.includes(normalizedBookKeyword)) return false;
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
  }, [
    filter,
    deferredStudentKeyword,
    deferredBookKeyword,
    sortBy,
    sortDirection,
    loaderData.orderRows,
  ]);

  const toggleSortDirection = () => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={600}>
              訂書管理頁
            </Typography>
            <Typography variant="body2" color="text.secondary">
              登入帳號：{loaderData.user.email}
            </Typography>
          </Box>

          <Form method="post">
            <input type="hidden" name="intent" value="logout" />
            <Button
              type="submit"
              variant="outlined"
              color="inherit"
              disabled={isLogoutSubmitting}
            >
              {isLogoutSubmitting ? '登出中...' : '登出'}
            </Button>
          </Form>
        </Box>

        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            狀態摘要
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip color="primary" label={`總筆數 ${stats.total}`} />
            <Chip color="warning" label={`待付款 ${stats.unpaid}`} />
            <Chip color="info" label={`待交付 ${stats.undelivered}`} />
          </Box>
        </Stack>

        <Stack spacing={1.5}>
          <Autocomplete
            freeSolo
            size="small"
            options={bookOptions}
            inputValue={bookKeyword}
            onInputChange={(_, newInputValue) => {
              setBookKeyword(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="書籍搜尋（科目 / 書名 / ISBN）"
                placeholder="例如：微積分、978..."
                helperText="用科目、書名或 ISBN 篩選"
              />
            )}
          />

          <Autocomplete
            freeSolo
            size="small"
            options={studentOptions}
            inputValue={studentKeyword}
            onInputChange={(_, newInputValue) => {
              setStudentKeyword(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="學生搜尋（學號 / 姓名）"
                placeholder="例如：41441134、王XX"
                helperText="用學號或姓名篩選"
              />
            )}
          />

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={filter}
              onChange={(_, nextValue: RowFilter | null) => {
                if (nextValue) setFilter(nextValue);
              }}
            >
              <ToggleButton value="all">全部</ToggleButton>
              <ToggleButton value="unpaid">待付款</ToggleButton>
              <ToggleButton value="undelivered">待交付</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={sortBy}
                onChange={(_, nextValue: SortBy | null) => {
                  if (nextValue) setSortBy(nextValue);
                }}
              >
                {Object.entries(sortLabelMap).map(([value, label]) => (
                  <ToggleButton key={value} value={value}>
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Button
                variant="outlined"
                size="small"
                onClick={toggleSortDirection}
                sx={{ minWidth: 'auto' }}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              顯示 {filteredRows.length} / {loaderData.orderRows.length} 筆
            </Typography>

            <Typography variant="body2" color="text.secondary">
              目前依「{sortLabelMap[sortBy]}」
              {sortDirection === 'asc' ? '升冪' : '降冪'}排序
            </Typography>
          </Box>
        </Stack>

        {actionData?.message && (
          <Alert severity={actionData.success ? 'success' : 'error'}>
            {actionData.message}
          </Alert>
        )}

        <Stack spacing={2}>
          {loaderData.orderRows.length === 0 && (
            <Alert severity="info">目前沒有已建立的訂單資料。</Alert>
          )}

          {loaderData.orderRows.length > 0 && filteredRows.length === 0 && (
            <Alert severity="info">目前篩選條件下沒有符合的資料。</Alert>
          )}

          {filteredRows.map((row) => {
            const rowKey = `${row.bookIsbn}:${row.studentNumber}`;

            return (
              <MemoOrderStatusForm
                key={rowKey}
                row={row}
                isSubmitting={isSubmitting && rowSubmittingKey === rowKey}
              />
            );
          })}
        </Stack>
      </Paper>
    </Container>
  );
}
