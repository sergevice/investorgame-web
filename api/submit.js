import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const encodedCreds = process.env.GOOGLE_CREDENTIALS;
    if (!encodedCreds) {
      console.warn('GOOGLE_CREDENTIALS not set, skipping Google Sheets save');
      return res.status(200).json({ success: true, saved: false, reason: 'no_credentials' });
    }

    const credentials = JSON.parse(Buffer.from(encodedCreds, 'base64').toString('utf-8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Find spreadsheet by name - use the spreadsheet ID from env or default
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.warn('GOOGLE_SPREADSHEET_ID not set');
      return res.status(200).json({ success: true, saved: false, reason: 'no_spreadsheet_id' });
    }

    // Get the actual name of the first sheet (original used gspread .sheet1)
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
    const firstSheetName = meta.data.sheets?.[0]?.properties?.title || 'Sheet1';

    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${firstSheetName}'!A:C`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, phone, timestamp]],
      },
    });

    res.status(200).json({ success: true, saved: true });
  } catch (error) {
    console.error('Submit API error:', error);
    res.status(500).json({ error: 'Failed to save data', details: error.message });
  }
}
