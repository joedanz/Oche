// ABOUTME: Google Sheets URL parsing and CSV export URL construction.
// ABOUTME: Extracts sheet IDs from URLs and builds public CSV export endpoints.

const SHEETS_URL_REGEX =
  /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

export function extractSheetId(url: string): string | null {
  const match = url.match(SHEETS_URL_REGEX);
  return match ? match[1] : null;
}

export function buildCsvExportUrl(sheetId: string, sheetName?: string): string {
  let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  if (sheetName) {
    url += `&sheet=${sheetName}`;
  }
  return url;
}

export function parseGoogleSheetsUrl(url: string): {
  sheetId: string | null;
  error?: string;
} {
  if (!url.trim()) {
    return { sheetId: null, error: "Please enter a Google Sheets URL" };
  }

  const sheetId = extractSheetId(url);
  if (!sheetId) {
    return {
      sheetId: null,
      error: "Please enter a valid Google Sheets URL",
    };
  }

  return { sheetId };
}
