import type { Route } from './+types/page';
import { Form, useNavigation } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '登記學號訂書' },
    { name: 'description', content: '使用學號登記訂書' },
  ];
}

export default function Home({}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper
        variant="outlined"
        sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            登記學號訂書
          </Typography>
          <Typography variant="body2" color="text.secondary">
            輸入學號並選擇書本，即可完成訂書登記。
          </Typography>
        </Box>

        <Alert severity="info">
          暫不支援外班學生訂書，如有需求請與訂書負責人聯繫
          <br />
          若網站發生錯誤、問題請聯繫 猴貓
          <br />- DC: monkey_cat
          <br />- email: a102009102009@gmail.com
          <br />- github: MKMonkeyCat
          <br />
          <del>(這網站孕期半天，所以難免有問題XD)</del>
          <br />
          試算表:
          <Link
            href="https://docs.google.com/spreadsheets/d/1vMX2u9ebxsqi3Gr3q_qxxCLu9tuZVQHwIdFeLq1cqaw/edit?usp=sharing"
            target="_blank"
          >
            點此查看試算表
          </Link>
        </Alert>

        <Form
          method="get"
          action="/registerOrder"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <TextField
            id="studentNumber"
            name="studentNumber"
            label="學號"
            placeholder="請輸入學號"
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
          >
            下一步
          </Button>
        </Form>
      </Paper>
    </Container>
  );
}
