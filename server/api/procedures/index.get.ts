export default defineEventHandler(async (event) => {
    const { q, category, capThucHien, mucDoDVC, page = '1', limit = '20' } = getQuery(event) as Record<string, string>

    const sheets = getSheets()
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'procedures!A2:J',
    })

    const rows = response.data.values ?? []

    let procedures = rows
        .filter(row => row[0])
        .map(row => ({
            slug: row[0] ?? '',
            filename: row[1] ?? '',
            name: row[2] ?? '',
            category: row[3] ?? '',
            soQD: row[4] ?? '',
            mucDoDVC: row[5] ?? '',
            capThucHien: row[6] ?? '',
            driveFileId: row[7] ?? '',
            updatedAt: row[9] ?? '',
        }))

    if (q) {
        const lower = q.toLowerCase()
        procedures = procedures.filter(p =>
            p.slug.toLowerCase().includes(lower) ||
            p.name.toLowerCase().includes(lower)
        )
    }
    if (category) procedures = procedures.filter(p => p.category === category)
    if (capThucHien) procedures = procedures.filter(p => p.capThucHien === capThucHien)
    if (mucDoDVC) procedures = procedures.filter(p => p.mucDoDVC === mucDoDVC)

    const total = procedures.length
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const start = (pageNum - 1) * limitNum

    return {
        procedures: procedures.slice(start, start + limitNum),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
    }
})
