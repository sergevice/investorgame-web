import { google } from 'googleapis';

/**
 * Shared Google Sheets auth helper.
 * Returns { sheets, spreadsheetId } or null if credentials are not configured.
 */
export function getSheets() {
  const encodedCreds = process.env.GOOGLE_CREDENTIALS;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!encodedCreds || !spreadsheetId) {
    return null;
  }

  const credentials = JSON.parse(Buffer.from(encodedCreds, 'base64').toString('utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  return { sheets, spreadsheetId };
}
