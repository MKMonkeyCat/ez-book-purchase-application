import { sheets } from '@googleapis/sheets';
import type { sheets_v4 } from '@googleapis/sheets';
import { JWT } from 'google-auth-library';

const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

type ValueInputOption = 'RAW' | 'USER_ENTERED';

type InsertDataOption = 'INSERT_ROWS' | 'OVERWRITE';

export type GoogleSheetsConfig = {
  spreadsheetId?: string;
};

let cachedSheetsClient: Promise<sheets_v4.Sheets> | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(
      `[google-sheets] Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function getPrivateKey(): string {
  return getRequiredEnv('GOOGLE_SHEETS_PRIVATE_KEY').replace(/\\n/g, '\n');
}

function getSpreadsheetId(config?: GoogleSheetsConfig): string {
  return (
    config?.spreadsheetId ?? getRequiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID')
  );
}

async function createSheetsClient(): Promise<sheets_v4.Sheets> {
  const clientEmail = getRequiredEnv('GOOGLE_SHEETS_CLIENT_EMAIL');
  const privateKey = getPrivateKey();

  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SHEETS_SCOPE,
  });

  await auth.authorize();

  return sheets({ version: 'v4', auth });
}

export function getGoogleSheetsClient(): Promise<sheets_v4.Sheets> {
  if (!cachedSheetsClient) cachedSheetsClient = createSheetsClient();

  return cachedSheetsClient;
}

export async function readSheetRange(
  range: string,
  config?: GoogleSheetsConfig,
): Promise<string[][]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(config);

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (data.values as string[][] | undefined) ?? [];
}

export async function appendSheetRows(
  range: string,
  rows: Array<Array<string | number | boolean | null>>,
  options?: {
    config?: GoogleSheetsConfig;
    valueInputOption?: ValueInputOption;
    insertDataOption?: InsertDataOption;
  },
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(options?.config);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: options?.valueInputOption ?? 'USER_ENTERED',
    insertDataOption: options?.insertDataOption ?? 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

export async function appendSheetRow(
  range: string,
  row: Array<string | number | boolean | null>,
  options?: {
    config?: GoogleSheetsConfig;
    valueInputOption?: ValueInputOption;
    insertDataOption?: InsertDataOption;
  },
): Promise<void> {
  await appendSheetRows(range, [row], options);
}

export async function updateSheetRange(
  range: string,
  rows: Array<Array<string | number | boolean | null>>,
  options?: {
    config?: GoogleSheetsConfig;
    valueInputOption?: ValueInputOption;
  },
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(options?.config);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: options?.valueInputOption ?? 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

export async function clearSheetRange(
  range: string,
  config?: GoogleSheetsConfig,
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(config);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
}

export function mapRowsToObjects<T extends Record<string, string>>(
  rows: string[][],
): T[] {
  if (rows.length <= 1) {
    return [];
  }

  const [headers, ...body] = rows;

  return body.map((cells) => {
    const row = {} as Record<string, string>;

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });

    return row as T;
  });
}

export function mapColumnsToObjects<T extends Record<string, string>>(
  rows: string[][],
): T[] {
  if (rows.length === 0 || rows[0].length <= 1) {
    return [];
  }

  const keys = rows.map((row) => row[0]);
  const numberOfDataColumns = rows[0].length - 1;

  return Array.from({ length: numberOfDataColumns }, (_, colIndex) => {
    const obj = {} as Record<string, string>;

    rows.forEach((row, rowIndex) => {
      const key = keys[rowIndex];
      const value = row[colIndex + 1] || '';

      if (key) obj[key] = value.trim();
    });

    return obj as T;
  });
}

export function setDeep(obj: any, pathParts: string[], value: string) {
  let current = obj;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (i === pathParts.length - 1) {
      current[part] = value;
    } else {
      current[part] = current[part] || {};
      current = current[part];
    }
  }
}

export function mapColumnsToStructuredObjects<T>(
  rows: string[][],
  mapping: Record<string, string>,
): T[] {
  if (!rows.length || rows[0].length <= 1) return [];

  const columnCount = rows[0].length;
  const compiledMapping = rows
    .map((row) => {
      const originalKey = row[0]?.trim();
      if (!originalKey) return null;

      const targetPath = mapping[originalKey] || originalKey;
      return {
        pathParts: targetPath.split('.'),
        originalIndex: rows.indexOf(row),
      };
    })
    .filter(
      (item): item is { pathParts: string[]; originalIndex: number } =>
        item !== null,
    );

  const results: T[] = [];
  for (let colIndex = 1; colIndex < columnCount; colIndex++) {
    const item = {} as any;
    for (const { pathParts, originalIndex } of compiledMapping) {
      const value = rows[originalIndex][colIndex]?.trim() ?? '';
      setDeep(item, pathParts, value);
    }

    results.push(item as T);
  }

  return results;
}
