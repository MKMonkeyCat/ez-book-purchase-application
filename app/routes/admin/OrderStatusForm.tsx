import {
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { memo, useEffect, useState } from 'react';
import { Form, useSubmit } from 'react-router';
import type { StudentOrderStatusField } from '~/types/purchase';

export function OrderStatusForm({
  row,
  isSubmitting,
}: {
  row: {
    bookIsbn: string;
    bookName: string;
    subject: string;
    studentNumber: string;
    studentName: string;
    ordered: boolean;
    paid: boolean;
    delivered: boolean;
  };
  isSubmitting: boolean;
}) {
  const submit = useSubmit();
  const [ordered, setOrdered] = useState(row.ordered);
  const [paid, setPaid] = useState(row.paid);
  const [delivered, setDelivered] = useState(row.delivered);

  useEffect(() => {
    setOrdered(row.ordered);
    setPaid(row.paid);
    setDelivered(row.delivered);
  }, [row.ordered, row.paid, row.delivered]);

  const submitStatus = (field: StudentOrderStatusField, checked: boolean) => {
    if (isSubmitting) return;

    const formData = new FormData();
    formData.set('intent', 'update-status');
    formData.set('studentNumber', row.studentNumber);
    formData.set('bookIsbn', row.bookIsbn);
    formData.set('field', field);
    formData.set('checked', String(checked));

    submit(formData, { method: 'post' });
  };

  const onOrderedChange = (nextOrdered: boolean) => {
    const confirmMessage = nextOrdered
      ? `確認將 ${row.studentName} 的「${row.bookName}」設為已訂購？`
      : `確認取消 ${row.studentName} 的「${row.bookName}」已訂購狀態？`;

    if (!window.confirm(confirmMessage)) return;

    setOrdered(nextOrdered);
    submitStatus('ordered', nextOrdered);
  };

  const onPaidChange = (nextPaid: boolean) => {
    setPaid(nextPaid);
    submitStatus('paid', nextPaid);
  };

  const onDeliveredChange = (nextDelivered: boolean) => {
    setDelivered(nextDelivered);
    submitStatus('delivered', nextDelivered);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Form method="post">
        <input type="hidden" name="intent" value="update-status" />
        <input type="hidden" name="studentNumber" value={row.studentNumber} />
        <input type="hidden" name="bookIsbn" value={row.bookIsbn} />

        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            {row.subject}｜{row.bookName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            學號：{row.studentNumber}｜姓名：{row.studentName}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="ordered"
                  checked={ordered}
                  onChange={(event) => onOrderedChange(event.target.checked)}
                  disabled={isSubmitting}
                />
              }
              label="已訂購"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="paid"
                  checked={paid}
                  onChange={(event) => onPaidChange(event.target.checked)}
                  disabled={isSubmitting}
                />
              }
              label="已付款"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="delivered"
                  checked={delivered}
                  onChange={(event) => onDeliveredChange(event.target.checked)}
                  disabled={isSubmitting}
                />
              }
              label="已交付"
            />
          </Box>
        </Stack>
      </Form>
    </Paper>
  );
}

export const MemoOrderStatusForm = memo(OrderStatusForm);
export default MemoOrderStatusForm;
