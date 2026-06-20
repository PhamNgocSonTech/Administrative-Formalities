import mammoth from 'mammoth'

export async function parseDocx(buffer: Buffer) {
    const { value: html } = await mammoth.convertToHtml({ buffer })

    const sections: Record<string, any> = {}

    // Tách tên và mã TTHC từ heading cố định
    // Pattern: "9. Cấp Giấy... – Mã TTHC: 2.000673"
    const titleMatch = html.match(/\d+\.\s+(.+?)\s*[–\-–—]\s*Mã TTHC:\s*([\d.]+)/i)
    sections['ten_tthc'] = titleMatch?.[1]?.trim() ?? ''
    sections['ma_tthc'] = titleMatch?.[2]?.trim() ?? ''

    const SECTION_KEYS = ['a', 'b', 'c', 'd', 'đ', 'e', 'g', 'h', 'i', 'k', 'l']

    // mammoth có thể render heading mục dạng:
    // 1. <h1>a) Tên mục:</h1> / <h2>...</h2> / <h3>...</h3>
    // 2. <p><strong>a) Tên mục:</strong></p>
    // 3. <strong>a) Tên mục:</strong> (inline)
    // => Tìm bất kỳ tag nào chứa "x) " ở đầu
    function findSectionStart(html: string, key: string): { index: number; tagEnd: number; label: string } | null {
        // Escape đặc biệt cho "đ"
        const escapedKey = key === 'đ' ? 'đ' : key

        // Pattern 1: heading tags <h1-6> hoặc <p><strong>
        const patterns = [
            // <h1>a) label:</h1>
            new RegExp(`<h[1-6][^>]*>\\s*${escapedKey}\\)([^<]*)<\\/h[1-6]>`, 'i'),
            // <p><strong>a) label:</strong></p> or <strong>a) label:</strong>
            new RegExp(`<strong[^>]*>\\s*${escapedKey}\\)([^<]*)<\\/strong>`, 'i'),
            // <b>a) label:</b>
            new RegExp(`<b[^>]*>\\s*${escapedKey}\\)([^<]*)<\\/b>`, 'i'),
            // plain paragraph: <p>a) label:</p> (fallback)
            new RegExp(`<p[^>]*>\\s*${escapedKey}\\)([^<]*)<\\/p>`, 'i'),
        ]

        for (const pattern of patterns) {
            const match = html.match(pattern)
            if (match && match.index !== undefined) {
                return {
                    index: match.index,
                    tagEnd: match.index + match[0].length,
                    label: match[1].trim().replace(/:$/, '').trim(),
                }
            }
        }
        return null
    }

    for (let i = 0; i < SECTION_KEYS.length; i++) {
        const current = SECTION_KEYS[i]
        const next = SECTION_KEYS[i + 1]

        const startInfo = findSectionStart(html, current)
        if (!startInfo) continue

        let endIdx = html.length
        if (next) {
            const nextInfo = findSectionStart(html.slice(startInfo.tagEnd), next)
            if (nextInfo) {
                endIdx = startInfo.tagEnd + nextInfo.index
            }
        }

        const rawContent = html.slice(startInfo.tagEnd, endIdx)
        const content = rawContent
            .replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li>/gi, '- ')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()

        sections[current] = { label: startInfo.label, content }
    }

    return sections
}
