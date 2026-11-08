<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Scissors, AlertTriangle, Info } from 'lucide-vue-next'
import { useDraggable } from '@vueuse/core'

interface Block {
  index: number
  kind: string
  text?: string
  preview?: string[][]
  rows?: number
  page_break?: boolean
}
interface FormEntry {
  id: number
  label: string
  block_start: number
  block_end: number
  review_status?: string
}
interface BlocksResponse {
  code?: string
  total: number
  content_end_block?: number
  blocks: Block[]
  forms: FormEntry[]
}

const props = defineProps<{
  open: boolean
  title: string
  versionId: number
  formId?: number | null
  start?: number
  end?: number
  withLabel?: boolean
  onSave: (start: number, end: number, extra?: { label: string; form_type: string }) => Promise<boolean>
}>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const { api } = useAdminApi()
const { toast } = useToast()

const loading = ref(false)
const data = ref<BlocksResponse | null>(null)
const startIdx = ref(0)
const endIdx = ref(0)
const label = ref('')
const formType = ref<'application' | 'result' | 'unclassified'>('unclassified')
const saving = ref(false)
const listRef = ref<HTMLElement | null>(null)
const startHandleRef = ref<HTMLElement | null>(null)
const endHandleRef = ref<HTMLElement | null>(null)

const others = computed(() => (data.value?.forms ?? []).filter((f) => f.id !== props.formId && f.review_status !== 'unused'))
const contentEnd = computed(() => data.value?.content_end_block ?? 0)
const total = computed(() => data.value?.total ?? 0)

function ownerOf(i: number) {
  return others.value.find((f) => i >= f.block_start && i <= f.block_end)
}

async function load() {
  loading.value = true
  data.value = null
  try {
    const r = await api<BlocksResponse>('GET', `/api/admin/versions/${props.versionId}/blocks`)
    data.value = { ...r, forms: r.forms ?? [] }
    const s0 = props.start != null ? props.start : contentEnd.value
    const e0 = props.end != null ? props.end : s0
    startIdx.value = Math.min(Math.max(s0, 0), total.value - 1)
    endIdx.value = Math.min(Math.max(e0, startIdx.value), total.value - 1)
    label.value = ''
    formType.value = 'unclassified'
    await nextTick(() => scrollTo(startIdx.value))
  } catch (e: any) {
    toast.err(e?.message ?? 'Không tải được các khối Word')
    emit('update:open', false)
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (v) => { if (v) load() }, { immediate: true })

const note = computed(() => {
  if (!data.value) return ''
  const msgs: string[] = []
  if (startIdx.value < contentEnd.value) msgs.push('có đè lên nội dung TTHC')
  const clash = others.value.find((f) => !(endIdx.value < f.block_start || startIdx.value > f.block_end))
  if (clash) msgs.push(`có đè lên "${clash.label}"`)
  return msgs.join('; ')
})

function selectBlock(i: number, ev: MouseEvent) {
  if (ev.shiftKey) {
    endIdx.value = Math.max(i, startIdx.value)
  } else {
    const dS = Math.abs(i - startIdx.value)
    const dE = Math.abs(i - endIdx.value)
    if (dS <= dE) {
      startIdx.value = i
      if (endIdx.value < i) endIdx.value = i
    } else {
      endIdx.value = i
      if (startIdx.value > i) startIdx.value = i
    }
  }
}

function syncStart(v: string) {
  const n = Number(v)
  if (Number.isFinite(n)) {
    startIdx.value = Math.min(Math.max(n, 0), total.value - 1)
    if (endIdx.value < startIdx.value) endIdx.value = startIdx.value
  }
}
function syncEnd(v: string) {
  const n = Number(v)
  if (Number.isFinite(n)) {
    endIdx.value = Math.min(Math.max(n, 0), total.value - 1)
    if (startIdx.value > endIdx.value) startIdx.value = endIdx.value
  }
}

function scrollTo(i: number) {
  const el = listRef.value?.querySelector<HTMLElement>(`[data-i="${i}"]`)
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// ---------- Drag handles (useDraggable) ----------
// Mỗi handle tự quản y relative tới list; khi drag → tìm block index tương ứng theo tọa độ.
function rowIndexAtY(absY: number): number {
  const list = listRef.value
  if (!list || !data.value) return 0
  const rows = list.querySelectorAll<HTMLElement>('[data-i]')
  const listTop = list.getBoundingClientRect().top
  const yInList = absY - listTop + list.scrollTop
  let lo = 0
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].offsetTop <= yInList) lo = i
    else break
  }
  return lo
}

// Auto-scroll khi kéo gần mép
let autoScrollInterval: number | null = null
function startAutoScroll(dir: number) {
  stopAutoScroll()
  autoScrollInterval = window.setInterval(() => {
    listRef.value?.scrollBy({ top: dir * 12 })
  }, 16)
}
function stopAutoScroll() {
  if (autoScrollInterval !== null) {
    clearInterval(autoScrollInterval)
    autoScrollInterval = null
  }
}

function handleDragStart(ev: PointerEvent) {
  const t = ev.target as HTMLElement
  t.setPointerCapture?.(ev.pointerId)
}
function handleDrag(which: 'start' | 'end', ev: PointerEvent) {
  const list = listRef.value
  if (!list) return
  const rect = list.getBoundingClientRect()
  // Auto-scroll
  if (ev.clientY < rect.top + 30) startAutoScroll(-1)
  else if (ev.clientY > rect.bottom - 30) startAutoScroll(1)
  else stopAutoScroll()
  // Compute row
  const idx = rowIndexAtY(ev.clientY)
  if (which === 'start') {
    startIdx.value = Math.min(Math.max(idx, 0), total.value - 1)
    if (endIdx.value < startIdx.value) endIdx.value = startIdx.value
  } else {
    endIdx.value = Math.min(Math.max(idx, 0), total.value - 1)
    if (startIdx.value > endIdx.value) startIdx.value = endIdx.value
  }
}
function handleDragEnd(ev: PointerEvent) {
  const t = ev.target as HTMLElement
  t.releasePointerCapture?.(ev.pointerId)
  stopAutoScroll()
}

// Tính vị trí Y của handle theo block index
function handleTopFor(idx: number, bottom = false): string {
  const list = listRef.value
  if (!list) return '0px'
  const row = list.querySelector<HTMLElement>(`[data-i="${idx}"]`)
  if (!row) return '0px'
  const top = row.offsetTop + (bottom ? row.offsetHeight : 0)
  return `${top - 11}px`
}
// Reactive handle positions (recompute khi startIdx/endIdx/total/data đổi)
const startHandleTop = computed(() => {
  startIdx.value; endIdx.value; data.value; // reactive deps
  return handleTopFor(startIdx.value, false)
})
const endHandleTop = computed(() => {
  startIdx.value; endIdx.value; data.value;
  return handleTopFor(endIdx.value, true)
})

// Keyboard navigation khi handle được focus
function onHandleKey(which: 'start' | 'end', ev: KeyboardEvent) {
  const delta = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0
  if (!delta) return
  ev.preventDefault()
  if (which === 'start') {
    const newIdx = Math.max(0, Math.min(total.value - 1, startIdx.value + delta))
    startIdx.value = newIdx
    if (endIdx.value < startIdx.value) endIdx.value = startIdx.value
  } else {
    const newIdx = Math.max(0, Math.min(total.value - 1, endIdx.value + delta))
    endIdx.value = newIdx
    if (startIdx.value > endIdx.value) startIdx.value = endIdx.value
  }
  scrollTo(which === 'start' ? startIdx.value : endIdx.value)
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const extra = props.withLabel ? { label: label.value.trim(), form_type: formType.value } : undefined
    const ok = await props.onSave(startIdx.value, endIdx.value, extra)
    if (ok) emit('update:open', false)
  } catch (e: any) {
    toast.err(e?.message ?? 'Lưu thất bại')
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(stopAutoScroll)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] p-0 flex flex-col">
      <DialogHeader class="px-6 pt-6 pb-3 border-b">
        <DialogTitle class="flex items-center gap-2">
          <Scissors class="size-5 text-primary" />
          {{ title }}
          <span v-if="data" class="text-sm font-normal text-muted-foreground">
            — {{ data.code }} · {{ total }} khối
          </span>
        </DialogTitle>
        <DialogDescription>
          Kéo thanh <b class="text-success">BẮT ĐẦU</b> (xanh) và <b class="text-destructive">KẾT THÚC</b> (đỏ)
          tới vị trí mong muốn. Hoặc click dòng (Shift+Click = đặt kết thúc), hoặc nhập số khối, hoặc dùng phím ↑↓ khi focus handle.
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="flex-1 flex items-center justify-center py-12">
        <Loader2 class="size-5 animate-spin text-muted-foreground" />
      </div>

      <template v-else-if="data">
        <!-- Controls -->
        <div class="px-6 py-3 border-b bg-muted/30 flex items-end gap-3 flex-wrap">
          <div class="space-y-1.5">
            <Label class="text-xs">Từ khối</Label>
            <Input
              type="number" class="w-24 h-9"
              :min="0" :max="total - 1"
              :model-value="startIdx"
              @update:model-value="syncStart($event as string)"
            />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Đến khối</Label>
            <Input
              type="number" class="w-24 h-9"
              :min="0" :max="total - 1"
              :model-value="endIdx"
              @update:model-value="syncEnd($event as string)"
            />
          </div>
          <template v-if="withLabel">
            <div class="space-y-1.5 flex-1 min-w-[200px]">
              <Label class="text-xs">Nhãn (tùy chọn)</Label>
              <Input v-model="label" placeholder="vd. Mẫu số 05" class="h-9" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">Loại</Label>
              <Select v-model="formType">
                <SelectTrigger class="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclassified">Chưa phân loại</SelectItem>
                  <SelectItem value="application">Mẫu người nộp</SelectItem>
                  <SelectItem value="result">Mẫu kết quả</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>
          <Button variant="outline" size="sm" class="h-9" @click="scrollTo(startIdx)">Đến vị trí đang chọn</Button>
        </div>

        <!-- Block list + drag handles -->
        <div
          ref="listRef"
          class="flex-1 overflow-y-auto relative pl-14"
        >
          <!-- Start handle -->
          <div
            ref="startHandleRef"
            role="slider"
            tabindex="0"
            :aria-valuemin="0"
            :aria-valuemax="total - 1"
            :aria-valuenow="startIdx"
            class="cut-handle cut-handle-start"
            :style="{ top: startHandleTop }"
            @pointerdown="handleDragStart"
            @pointermove="(ev) => (ev.target as HTMLElement).hasPointerCapture?.(ev.pointerId) && handleDrag('start', ev)"
            @pointerup="handleDragEnd"
            @pointercancel="handleDragEnd"
            @keydown="(ev) => onHandleKey('start', ev)"
          >
            <span class="cut-knob">BẮT ĐẦU #{{ startIdx }}</span>
          </div>
          <!-- End handle -->
          <div
            ref="endHandleRef"
            role="slider"
            tabindex="0"
            :aria-valuemin="0"
            :aria-valuemax="total - 1"
            :aria-valuenow="endIdx"
            class="cut-handle cut-handle-end"
            :style="{ top: endHandleTop }"
            @pointerdown="handleDragStart"
            @pointermove="(ev) => (ev.target as HTMLElement).hasPointerCapture?.(ev.pointerId) && handleDrag('end', ev)"
            @pointerup="handleDragEnd"
            @pointercancel="handleDragEnd"
            @keydown="(ev) => onHandleKey('end', ev)"
          >
            <span class="cut-knob">KẾT THÚC #{{ endIdx }}</span>
          </div>

          <div
            v-for="b in data.blocks"
            :key="b.index"
            :data-i="b.index"
            data-clickable
            class="flex gap-3 px-4 py-2 border-b border-border/40 text-sm hover:bg-accent/30 transition-colors relative"
            :class="[
              b.index >= startIdx && b.index <= endIdx ? 'bg-primary/10' : '',
              b.index === startIdx ? 'border-l-4 border-l-success' : '',
              b.index === endIdx && b.index !== startIdx ? 'border-l-4 border-l-destructive' : '',
            ]"
            @click="selectBlock(b.index, $event)"
          >
            <span class="font-mono text-xs text-muted-foreground absolute -left-10 top-2 w-8 text-right">{{ b.index }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span
                  v-if="b.index < contentEnd"
                  class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                >Nội dung TTHC</span>
                <span
                  v-if="ownerOf(b.index)"
                  class="inline-flex items-center rounded bg-warning/15 text-warning-foreground px-1.5 py-0.5 text-xs"
                >{{ ownerOf(b.index)?.label }}</span>
                <span v-if="b.page_break" class="text-xs text-muted-foreground">⤓ ngắt trang</span>
              </div>
              <div class="whitespace-pre-wrap break-words">
                <template v-if="b.kind === 'tbl'">
                  <table class="text-xs border-collapse">
                    <tr v-for="(row, ri) in (b.preview || []).slice(0, 3)" :key="ri">
                      <td v-for="(cell, ci) in row" :key="ci" class="border px-1.5 py-0.5">{{ cell }}</td>
                    </tr>
                  </table>
                  <span class="text-xs text-muted-foreground">Bảng {{ b.rows }} hàng</span>
                </template>
                <template v-else-if="b.kind === 'p'">
                  <span v-if="b.text">{{ b.text }}</span>
                  <span v-else class="text-muted-foreground italic">(dòng trống)</span>
                </template>
                <template v-else>
                  <span class="text-muted-foreground italic">({{ b.kind }})</span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-if="note" class="px-6 py-2 border-t bg-warning/5 flex items-center gap-2 text-sm text-warning">
          <AlertTriangle class="size-4 shrink-0" />
          <span>Chọn khối {{ startIdx }}–{{ endIdx }} ({{ endIdx - startIdx + 1 }} khối) — {{ note }}</span>
        </div>
        <div v-else class="px-6 py-2 border-t bg-muted/20 flex items-center gap-2 text-sm text-muted-foreground">
          <Info class="size-4 shrink-0" />
          <span>Chọn khối {{ startIdx }}–{{ endIdx }} ({{ endIdx - startIdx + 1 }} khối)</span>
        </div>
      </template>

      <DialogFooter class="px-6 py-3 border-t">
        <Button variant="outline" @click="emit('update:open', false)">Hủy</Button>
        <Button :disabled="saving || !data" @click="save">
          <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
          <Scissors v-else class="size-4 mr-2" />
          Cắt &amp; lưu
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.cut-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 22px;
  z-index: 5;
  cursor: ns-resize;
  touch-action: none;
  outline: none;
}
.cut-handle::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 9px;
  height: 4px;
  border-radius: 2px;
}
.cut-handle-start::before { background: oklch(0.55 0.18 150); }
.cut-handle-end::before { background: oklch(0.55 0.22 27); }
.cut-knob {
  position: absolute;
  left: 8px;
  top: 0;
  padding: 2px 10px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 10px;
  white-space: nowrap;
  pointer-events: none;
  letter-spacing: 0.3px;
}
.cut-handle-start .cut-knob { background: oklch(0.55 0.18 150); }
.cut-handle-end .cut-knob { background: oklch(0.55 0.22 27); }
.cut-handle:focus-visible::before,
.cut-handle:active::before {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .35);
}
</style>
