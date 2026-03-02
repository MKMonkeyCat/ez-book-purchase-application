import { Box, Button, Stack } from '@mui/material';
import { Form } from 'react-router';

export function BulkPaidActions({
  studentNumber,
  bulkPayBookIsbns,
  bulkUnpayBookIsbns,
  isBulkStatusSubmitting,
  isBulkPaySubmitting,
  isBulkUnpaySubmitting,
}: {
  studentNumber: string;
  bulkPayBookIsbns: string[];
  bulkUnpayBookIsbns: string[];
  isBulkStatusSubmitting: boolean;
  isBulkPaySubmitting: boolean;
  isBulkUnpaySubmitting: boolean;
}) {
  const showBulkPayButton = studentNumber !== '' && bulkPayBookIsbns.length > 0;
  const showBulkUnpayButton =
    studentNumber !== '' && bulkUnpayBookIsbns.length > 0;

  if (!showBulkPayButton && !showBulkUnpayButton) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Stack direction="row" spacing={1}>
        {showBulkUnpayButton && (
          <Form
            method="post"
            onSubmit={(event) => {
              const confirmText = `確認將學號 ${studentNumber} 的篩選結果（${bulkUnpayBookIsbns.length} 筆）全部設為未付款？`;
              if (!window.confirm(confirmText)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="bulk-unpay-student" />
            <input type="hidden" name="studentNumber" value={studentNumber} />
            <input
              type="hidden"
              name="bookIsbns"
              value={bulkUnpayBookIsbns.join(',')}
            />
            <Button
              type="submit"
              variant="outlined"
              size="small"
              disabled={isBulkStatusSubmitting}
            >
              {isBulkUnpaySubmitting ? '一次取消付款中...' : '一次取消付款'}
            </Button>
          </Form>
        )}

        {showBulkPayButton && (
          <Form
            method="post"
            onSubmit={(event) => {
              const confirmText = `確認將學號 ${studentNumber} 的篩選結果（${bulkPayBookIsbns.length} 筆）全部設為已付款？`;
              if (!window.confirm(confirmText)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="bulk-pay-student" />
            <input type="hidden" name="studentNumber" value={studentNumber} />
            <input
              type="hidden"
              name="bookIsbns"
              value={bulkPayBookIsbns.join(',')}
            />
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={isBulkStatusSubmitting}
            >
              {isBulkPaySubmitting ? '一次付清中...' : '一次付清'}
            </Button>
          </Form>
        )}
      </Stack>
    </Box>
  );
}

export default BulkPaidActions;
