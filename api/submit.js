import { getSheets } from './_sheets.js';

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

    const sheetsClient = getSheets();
    if (!sheetsClient) {
      console.warn('Google Sheets credentials not configured, skipping save');
      return res.status(200).json({ success: true, saved: false, reason: 'no_credentials' });
    }

    const { sheets, spreadsheetId } = sheetsClient;

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
