<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, ListTree } from 'lucide-vue-next'

/**
 * Trình dựng danh sách thả xuống + tô vàng cho 1 field.
 * Load các dòng của Word gốc trong khoảng [start, end], cho user đánh dấu:
 *  - Mục chủ (level=1)
 *  - Mục con (level=2)
 *  - Nội dung mục (level=3)
 *  - Tô vàng (hl)
 * Shift+Click để áp dụng cho cả đoạn từ dòng bấm trước đó.
 */
interface BlockLines {
  index: number
  kind: string
  lines: string[]
}
interface BlockLinesResponse {
  blocks: BlockLines[]
}

const props = defineProps<{
  open: boolean
  versionId: number
  fieldKey: string
  fieldTitle: string
  start: number
  end: number
  heads: Array<{ b: number; l: number }>
  hl: number[]
}>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  saved: []
}>()

const { api } = useAdminApi()
const { toast } = useToast()

const loading = ref(false)
const saving = ref(false)
const blocks = ref<BlockLines[]>([])

// Map<blockIndex, level>
const headsMap = ref<Map<number, number>>(new Map())
// Set<blockIndex> for highlighted
const hlSet = ref<Set<number>>(new Set())

// Lưu lần click gần nhất cho shift-range
const last = ref<{ i: number | null; t: string | null }>({ i: null, t: null })

async function load() {
  loading.value = true
  try {
    const r = await api<BlockLinesResponse>(
      'GET',
      `/api/admin/versions/${props.versionId}/block-lines?start=${props.start}&end=${props.end}`,
    )
    blocks.value = r.blocks
    headsMap.value = new Map(props.heads.map((h) => [h.b, h.l]))
    hlSet.value = new Set(props.hl)
    last.value = { i: null, t: null }
  } catch (e: any) {
    toast.err(e?.message ?? 'Không tải được các dòng của Word gốc')
    emit('update:open', false)
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (v) => { if (v) load() }, { immediate: true })

function toggle(blockIndex: number, t: '1' | '2' | '3' | 'hl', shift: boolean) {
  const on = t === 'hl' ? !hlSet.value.has(blockIndex) : headsMap.value.get(blockIndex) !== Number(t)
  const useRange = shift && last.value.t === t && last.value.i != null
  const from = useRange ? Math.min(last.value.i!, blockIndex) : blockIndex
  const to = useRange ? Math.max(last.value.i!, blockIndex) : blockIndex

  const newHeads = new Map(headsMap.value)
  const newHl = new Set(hlSet.value)

  for (const b of blocks.value) {
    if (b.index < from || b.index > to || !b.lines.length) continue
    if (t === 'hl') {
      if (on) newHl.add(b.index)
      else newHl.delete(b.index)
    } else {
      if (on) newHeads.set(b.index, Number(t))
      else newHeads.delete(b.index)
    }
  }
  headsMap.value = newHeads
  hlSet.value = newHl
  last.value = { i: blockIndex, t }
}

function isActive(blockIndex: number, t: '1' | '2' | '3' | 'hl'): boolean {
  if (t === 'hl') return hlSet.value.has(blockIndex)
  return headsMap.value.get(blockIndex) === Number(t)
}

function rowClass(blockIndex: number): string {
  const l = headsMap.value.get(blockIndex)
  const out: string[] = []
  if (l === 1) out.push('lay-h1')
  else if (l === 2) out.push('lay-h2')
  else if (l === 3) out.push('lay-h3')
  if (hlSet.value.has(blockIndex)) out.push('lay-hl')
  return out.join(' ')
}

const summary = computed(() => {
  const vals = [...headsMap.value.values()]
  const h1 = vals.filter((x) => x === 1).length
  const h2 = vals.filter((x) => x === 2).length
  const h3 = vals.filter((x) => x === 3).length
  return `${h1} mục chủ · ${h2} mục con · ${h3} nội dung mục · ${hlSet.value.size} dòng tô vàng`
})

function clearAll() {
  headsMap.value = new Map()
  hlSet.value = new Set()
  last.value = { i: null, t: null }
}

async function save() {
  saving.value = true
  try {
    await api('PUT', `/api/admin/versions/${props.versionId}/layout/${props.fieldKey}`, {
      block_start: props.start,
      block_end: props.end,
      heads: [...headsMap.value].map(([b, l]) => ({ b, l })),
      hl: [...hlSet.value],
    })
    toast.ok('Đã lưu cách trình bày')
    emit('saved')
    emit('update:open', false)
  } catch (e: any) {
    toast.err(e?.message ?? 'Lưu thất bại')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] p-0 flex flex-col">
      <DialogHeader class="px-6 pt-6 pb-3 border-b">
        <DialogTitle class="flex items-center gap-2">
          <ListTree class="size-5 text-primary" />
          Dựng danh sách thả xuống / tô vàng — {{ fieldTitle }}
        </DialogTitle>
        <DialogDescription>
          Mỗi dòng của vùng đã chọn: bấm <strong>Mục chủ</strong> hoặc <strong>Mục con</strong> để thành tiêu đề;
          bấm <strong>Nội dung mục</strong> cho dòng trong mục mở ngay phía trên. Dòng không đánh dấu hiện như văn bản thường.
          <strong>Tô vàng</strong> để nhấn mạnh. Giữ <kbd class="px-1 border rounded text-xs">Shift</kbd> khi bấm = áp dụng cho cả đoạn từ lần bấm trước đó tới dòng này.
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="flex-1 flex items-center justify-center py-12">
        <Loader2 class="size-5 animate-spin text-muted-foreground" />
      </div>

      <div v-else class="flex-1 overflow-y-auto px-6 py-3 space-y-1">
        <div
          v-for="b in blocks"
          :key="b.index"
          class="lay-row"
          :class="rowClass(b.index)"
        >
          <span class="lay-no">{{ b.index }}</span>
          <div class="lay-text">
            <template v-if="b.lines.length">
              <div v-for="(l, i) in b.lines" :key="i">{{ l }}</div>
            </template>
            <span v-else class="text-muted-foreground italic">(dòng trống)</span>
          </div>
          <div v-if="b.lines.length" class="lay-btns">
            <button
              type="button" class="lay-btn"
              :class="isActive(b.index, '1') ? 'lay-btn-on lay-btn-h1' : ''"
              @click="(e) => toggle(b.index, '1', e.shiftKey)"
            >Mục chủ</button>
            <button
              type="button" class="lay-btn"
              :class="isActive(b.index, '2') ? 'lay-btn-on lay-btn-h2' : ''"
              @click="(e) => toggle(b.index, '2', e.shiftKey)"
            >Mục con</button>
            <button
              type="button" class="lay-btn"
              :class="isActive(b.index, '3') ? 'lay-btn-on lay-btn-h3' : ''"
              @click="(e) => toggle(b.index, '3', e.shiftKey)"
            >Nội dung mục</button>
            <button
              type="button" class="lay-btn"
              :class="isActive(b.index, 'hl') ? 'lay-btn-on lay-btn-hl' : ''"
              @click="(e) => toggle(b.index, 'hl', e.shiftKey)"
            >Tô vàng</button>
          </div>
        </div>
      </div>

      <div class="px-6 py-2 border-t bg-muted/20 text-sm text-muted-foreground">
        {{ summary }}
      </div>

      <DialogFooter class="px-6 py-3 border-t">
        <Button variant="outline" @click="clearAll" :disabled="loading || saving">
          Bỏ toàn bộ cấu trúc
        </Button>
        <div class="flex-1"></div>
        <Button variant="outline" @click="emit('update:open', false)" :disabled="saving">Hủy</Button>
        <Button :disabled="loading || saving" @click="save">
          <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
          Lưu
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.lay-row {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all .15s;
}
.lay-row.lay-h1 { background: oklch(0.95 0.1 258 / 0.6); border-color: oklch(0.6 0.2 258); }
.lay-row.lay-h2 { background: oklch(0.96 0.08 180 / 0.6); border-color: oklch(0.55 0.18 180); }
.lay-row.lay-h3 { background: oklch(0.97 0.05 150 / 0.4); border-color: oklch(0.5 0.15 150); border-style: dashed; }
.lay-row.lay-hl { box-shadow: inset 0 0 0 2px oklch(0.75 0.17 90); }
.lay-no {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--color-muted-foreground);
  text-align: right;
  padding-top: 2px;
}
.lay-text {
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.lay-btns {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.lay-btn {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.lay-btn:hover { background: var(--color-accent); color: var(--color-foreground); }
.lay-btn-on { font-weight: 700; color: #fff; }
.lay-btn-on.lay-btn-h1 { background: oklch(0.5 0.2 258); border-color: oklch(0.5 0.2 258); }
.lay-btn-on.lay-btn-h2 { background: oklch(0.5 0.18 180); border-color: oklch(0.5 0.18 180); }
.lay-btn-on.lay-btn-h3 { background: oklch(0.45 0.15 150); border-color: oklch(0.45 0.15 150); }
.lay-btn-on.lay-btn-hl { background: oklch(0.65 0.18 90); border-color: oklch(0.65 0.18 90); color: #000; }
</style>
