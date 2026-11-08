<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Scissors, AlertTriangle, Info } from 'lucide-vue-next'

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
  /** Returns true on success → dialog closes */
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
    // for form-add there's no owner filter needed, but endpoint always returns forms
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

watch(() => props.open, (v) => { if (v) load() })

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
    // Set the nearer handle
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

function fmtBlock(b: Block): string {
  if (b.kind === 'tbl') {
    const rows = b.preview ?? []
    const txt = rows.slice(0, 2).map((r) => r.join(' | ')).join(' · ')
    return `[Bảng ${b.rows} hàng] ${txt}`
  }
  return b.text || '(dòng trống)'
}
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
          Click dòng để đặt đầu gần nhất. Shift+Click để đặt kết thúc. Có thể gõ số khối trực tiếp.
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
              type="number"
              class="w-24 h-9"
              :min="0"
              :max="total - 1"
              :model-value="startIdx"
              @update:model-value="syncStart($event as string)"
            />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Đến khối</Label>
            <Input
              type="number"
              class="w-24 h-9"
              :min="0"
              :max="total - 1"
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

        <!-- Block list -->
        <div ref="listRef" class="flex-1 overflow-y-auto">
          <div
            v-for="b in data.blocks"
            :key="b.index"
            :data-i="b.index"
            data-clickable
            class="flex gap-3 px-6 py-2 border-b border-border/40 text-sm hover:bg-accent/40 transition-colors"
            :class="[
              b.index >= startIdx && b.index <= endIdx ? 'bg-primary/5' : '',
              b.index === startIdx ? 'border-l-4 border-l-primary' : '',
              b.index === endIdx && b.index !== startIdx ? 'border-l-4 border-l-primary/60' : '',
            ]"
            @click="selectBlock(b.index, $event)"
          >
            <span class="font-mono text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{{ b.index }}</span>
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
          <span>Đang chọn khối {{ startIdx }}–{{ endIdx }} ({{ endIdx - startIdx + 1 }} khối) — {{ note }}</span>
        </div>
        <div v-else class="px-6 py-2 border-t bg-muted/20 flex items-center gap-2 text-sm text-muted-foreground">
          <Info class="size-4 shrink-0" />
          <span>Đang chọn khối {{ startIdx }}–{{ endIdx }} ({{ endIdx - startIdx + 1 }} khối)</span>
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
