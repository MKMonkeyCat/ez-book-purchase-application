import type { Route } from './+types/page';
import { Form, useNavigation } from 'react-router';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import BulkPaidActions from './BulkPaidActions';
import BookSelector from './BookSelector';
import MemoOrderStatusForm from './OrderStatusForm';
import { handleAdminPageAction, loadAdminPageData } from './server';
import {
  buildStats,
  buildStudentOptions,
  filterAndSortRows,
  findSingleStudentNumber,
  getBulkPayBookIsbns,
  getBulkUnpayBookIsbns,
  getSingleStudentUnpaidAmount,
  sortLabelMap,
  type RowFilter,
  type SortBy,
  type SortDirection,
} from './view-model';
import { formatCurrency } from '~/utils/pricing';
import type { AdminOrderRow, SelectableBookOption } from './types';

type PageLoaderData = {
  user?: { email?: string };
  orderRows?: AdminOrderRow[];
};

type PageActionData = {
  success?: boolean;
  message?: string;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: '訂書管理頁' },
    { name: 'description', content: '管理付款與交付狀態' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  return loadAdminPageData(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  return handleAdminPageAction(request, context.clientIp);
}

export default function AdminPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const pageLoaderData = loaderData as PageLoaderData | undefined;
  const orderRows = pageLoaderData?.orderRows ?? [];
  const userEmail = pageLoaderData?.user?.email ?? '';
  const pageActionData = actionData as PageActionData | undefined;

  const [studentKeyword, setStudentKeyword] = useState('');
  const deferredStudentKeyword = useDeferredValue(studentKeyword);
  const [selectedBookIsbns, setSelectedBookIsbns] = useState<string[]>([]);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('subject');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showMobileSortFilter, setShowMobileSortFilter] = useState(false);

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
  const isBulkPaySubmitting =
    isSubmitting && submittingIntent === 'bulk-pay-student';
  const isBulkUnpaySubmitting =
    isSubmitting && submittingIntent === 'bulk-unpay-student';
  const isBulkStatusSubmitting = isBulkPaySubmitting || isBulkUnpaySubmitting;

  const stats = useMemo(() => buildStats(orderRows), [orderRows]);

  const studentOptions = useMemo(
    () => buildStudentOptions(orderRows),
    [orderRows],
  );

  const baseFilteredRows = useMemo(
    () =>
      filterAndSortRows({
        rows: orderRows,
        filter,
        studentKeyword: deferredStudentKeyword,
        bookKeyword: '',
        sortBy,
        sortDirection,
      }),
    [filter, deferredStudentKeyword, sortBy, sortDirection, orderRows],
  );

  const selectableBookOptions = useMemo<SelectableBookOption[]>(() => {
    const optionMap = new Map<string, SelectableBookOption>();

    for (const row of orderRows) {
      if (optionMap.has(row.bookIsbn)) continue;

      optionMap.set(row.bookIsbn, {
        isbn: row.bookIsbn,
        label: `${row.subject}｜${row.bookName}｜${row.bookIsbn}`,
      });
    }

    return Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'zh-Hant'),
    );
  }, [orderRows]);

  const filteredRows = useMemo(() => {
    if (selectedBookIsbns.length === 0) return baseFilteredRows;

    return baseFilteredRows.filter((row) =>
      selectedBookIsbns.includes(row.bookIsbn),
    );
  }, [baseFilteredRows, selectedBookIsbns]);

  const toggleSortDirection = () => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  const singleStudentNumberInFilteredRows = useMemo(
    () => findSingleStudentNumber(filteredRows),
    [filteredRows],
  );

  const bulkPayBookIsbns = useMemo(
    () => getBulkPayBookIsbns(filteredRows),
    [filteredRows],
  );

  const bulkUnpayBookIsbns = useMemo(
    () => getBulkUnpayBookIsbns(filteredRows),
    [filteredRows],
  );

  const singleStudentUnpaidAmount = useMemo(
    () => getSingleStudentUnpaidAmount(filteredRows),
    [filteredRows],
  );

  const selectedBookOptions = useMemo(
    () =>
      selectableBookOptions.filter((option) =>
        selectedBookIsbns.includes(option.isbn),
      ),
    [selectableBookOptions, selectedBookIsbns],
  );

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
              登入帳號：{userEmail}
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
          <BookSelector
            options={selectableBookOptions}
            value={selectedBookOptions}
            onChange={setSelectedBookIsbns}
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

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setShowMobileSortFilter((current) => !current);
            }}
            sx={{
              display: { xs: 'inline-flex', sm: 'none' },
              alignSelf: 'flex-start',
            }}
          >
            {showMobileSortFilter ? '隱藏排序與篩選' : '展開排序與篩選'}
          </Button>

          <Box
            sx={{
              display: {
                xs: showMobileSortFilter ? 'flex' : 'none',
                sm: 'flex',
              },
              gap: 2,
              alignItems: 'flex-start',
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
              sx={{
                flexWrap: 'wrap',
                '& .MuiToggleButton-root': {
                  px: { xs: 1, sm: 1.5 },
                  py: { xs: 0.25, sm: 0.5 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                },
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
                sx={{
                  flexWrap: 'wrap',
                  '& .MuiToggleButton-root': {
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.25, sm: 0.5 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  },
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
                sx={{
                  minWidth: 'auto',
                  px: { xs: 1, sm: 1.5 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
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
              顯示 {filteredRows.length} / {orderRows.length} 筆
            </Typography>

            <Typography variant="body2" color="text.secondary">
              目前依「{sortLabelMap[sortBy]}」
              {sortDirection === 'asc' ? '升冪' : '降冪'}排序
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {singleStudentUnpaidAmount && (
              <Typography variant="body2" color="text.secondary">
                學號 {singleStudentUnpaidAmount.studentNumber} 待付金額：
                {formatCurrency(singleStudentUnpaidAmount.unpaidAmount)}
              </Typography>
            )}

            <BulkPaidActions
              studentNumber={singleStudentNumberInFilteredRows}
              bulkPayBookIsbns={bulkPayBookIsbns}
              bulkUnpayBookIsbns={bulkUnpayBookIsbns}
              isBulkStatusSubmitting={isBulkStatusSubmitting}
              isBulkPaySubmitting={isBulkPaySubmitting}
              isBulkUnpaySubmitting={isBulkUnpaySubmitting}
            />
          </Box>
        </Stack>

        {pageActionData?.message && (
          <Alert severity={pageActionData.success ? 'success' : 'error'}>
            {pageActionData.message}
          </Alert>
        )}

        <Stack spacing={2}>
          {orderRows.length === 0 && (
            <Alert severity="info">目前沒有已建立的訂單資料。</Alert>
          )}

          {orderRows.length > 0 && filteredRows.length === 0 && (
            <Alert severity="info">目前篩選條件下沒有符合的資料。</Alert>
          )}

          {filteredRows.map((row) => {
            const rowKey = `${row.bookIsbn}:${row.studentNumber}`;

            return (
              <MemoOrderStatusForm
                key={rowKey}
                row={row}
                isSubmitting={
                  isBulkStatusSubmitting ||
                  (isSubmitting && rowSubmittingKey === rowKey)
                }
              />
            );
          })}
        </Stack>
      </Paper>
    </Container>
  );
}
