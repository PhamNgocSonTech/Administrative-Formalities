import { Readable } from 'stream'

export default defineEventHandler(async (event) => {
    const formData = await readFormData(event)
    const file = formData.get('file') as File
    const soQD = (formData.get('soQD') as string) ?? ''
    const category = (formData.get('category') as string) ?? ''
    const capThucHien = (formData.get('capThucHien') as string) ?? ''
    const mucDoDVC = (formData.get('mucDoDVC') as string) ?? ''
    const forceOverwrite = formData.get('forceOverwrite') === 'true'

    if (!file) throw createError({ statusCode: 400, message: 'Chưa chọn file' })
    if (!file.name.endsWith('.docx')) throw createError({ statusCode: 400, message: 'Chỉ chấp nhận file .docx' })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseDocx(buffer)

    const slug = file.name.replace(/\.docx$/i, '')
    const filename = file.name

    // Check existing slug in Sheets
    const sheets = getSheets()
    const slugColumn = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'procedures!A:A',
    })
    const allSlugs = (slugColumn.data.values ?? []).flat()
    const existingRowIndex = allSlugs.indexOf(slug)
    const exists = existingRowIndex > 0  // index 0 = header row

    if (exists && !forceOverwrite) {
        return { conflict: true, slug }
    }

    // Upload to Google Drive
    const drive = getDrive()
    const stream = Readable.from(buffer)
    const driveRes = await drive.files.create({
        requestBody: {
            name: filename,
            ...(process.env.GOOGLE_DRIVE_FOLDER_ID ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] } : {}),
        },
        media: {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            body: stream,
        },
        fields: 'id',
    })

    const driveFileId = driveRes.data.id!
    const updatedAt = new Date().toLocaleDateString('vi-VN')

    const rowData = [
        slug,
        filename,
        parsed.ten_tthc ?? '',
        category,
        soQD,
        mucDoDVC,
        capThucHien,
        driveFileId,
        JSON.stringify(parsed),
        updatedAt,
    ]

    if (exists) {
        const rowNum = existingRowIndex + 1
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `procedures!A${rowNum}:J${rowNum}`,
            valueInputOption: 'RAW',
            requestBody: { values: [rowData] },
        })
    } else {
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'procedures!A:J',
            valueInputOption: 'RAW',
            requestBody: { values: [rowData] },
        })
    }

    return { success: true, slug, driveFileId, name: parsed.ten_tthc }
})
