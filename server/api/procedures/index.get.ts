export default defineEventHandler(async () => {
    const sheets = getSheets()

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'procedures!A1:J1',
    })

    return {
        success: true,
        headers: response.data.values?.[0] ?? []
    }
})