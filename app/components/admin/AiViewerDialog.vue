<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Check, X, ChevronLeft, ChevronRight, Eye } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  versionId: number
  runId: number | null
}>()
const emit = defineEmits<{ 'update:open': [v: boolean]; applied: [] }>()

const { api } = useAdminApi()
const { toast } = useToast()
const { confirm } = useConfirm()

interface Evidence { block?: number; quote?: string; verified?: boolean; moved_from?: number }
interface Current { value?: string; source?: string }
interface Proposed { label?: string; title?: string; form_type?: string; block_start?: number; block_end?: number }
interface Item {
  id: string
  title: string
  type?: string
  decision: 'pending' | 'accepted' | 'rejected'
  sufficient?: boolean
  same?: boolean
  relation?: string
  current?: Current
  proposed?: any
  evidence?: Evidence[]
  warnings?: string[]
  value_blocks?: number[]
}
interface Run { id: number; status: string; error?: string | null; items: Item[] }

const run = ref<Run | null>(null)
const loading = ref(false)
const idx = ref(0)
const editValue = ref('')
const editing = ref(false)
const working = ref(false)

const cur = computed<Item | null>(() => (run.value?.items ?? [])[idx.value] ?? null)
const pendingCount = computed(() => run.value?.items.filter((x) => x.decision === 'pending').length ?? 0)

async function load() {
  if (!props.runId) return
  loading.value = true
  try {
    const rs = await api<Run[]>('GET', `/api/admin/versions/${props.versionId}/ai/runs`)
    run.value = rs.find((x) => x.id === props.runId) ?? null
  } catch (e: any) {
    toast.err(e?.message ?? 'Không tải được')
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (v) => {
  if (v) {
    idx.value = 0
    editing.value = false
    load()
  }
})

function nextPending(from: number): number {
  if (!run.value) return from
  const n = run.value.items.length
  for (let k = 1; k <= n; k++) {
    const j = (from + k) % n
    if (run.value.items[j].decision === 'pending') return j
  }
  return from
}

async function acceptOne(itemId: string, value?: string | null, overwriteManual = false, insufficient = false) {
  const body: any = { value: value ?? null, reason: '' }
  if (overwriteManual) body.confirm_overwrite_manual = true
  if (insufficient) body.confirm_insufficient = true
  try {
    await api('POST', `/api/admin/ai/runs/${props.runId}/items/${encodeURIComponent(itemId)}/accept`, body)
    return { ok: true as const }
  } catch (e: any) {
    return { ok: false as const, msg: e.message as string }
  }
}

async function accept() {
  if (!cur.value || !run.value) return
  working.value = true
  let res = await acceptOne(cur.value.id, editing.value ? editValue.value : null)
  if (!res.ok) {
    if (/ghi đè/.test(res.msg)) {
      if (await confirm({ title: 'Ghi đè giá trị đã chỉnh thủ công?', description: res.msg, confirmText: 'Ghi đè', variant: 'warning' })) {
        res = await acceptOne(cur.value.id, editing.value ? editValue.value : null, true)
      }
    } else if (/chưa đủ căn cứ/.test(res.msg)) {
      if (await confirm({ title: 'Vẫn chấp nhận dù thiếu căn cứ?', description: res.msg, confirmText: 'Chấp nhận', variant: 'warning' })) {
        res = await acceptOne(cur.value.id, editing.value ? editValue.value : null, false, true)
      }
    }
  }
  if (res.ok) {
    toast.ok('Đã áp dụng vào bản nháp')
    editing.value = false
    await load()
    idx.value = nextPending(idx.value)
    emit('applied')
  } else {
    toast.err(res.msg)
  }
  working.value = false
}

async function reject() {
  if (!cur.value) return
  working.value = true
  try {
    await api('POST', `/api/admin/ai/runs/${props.runId}/items/${encodeURIComponent(cur.value.id)}/reject`, {})
    toast.ok('Đã từ chối đề xuất')
    await load()
    idx.value = nextPending(idx.value)
    emit('applied')
  } catch (e: any) {
    toast.err(e?.message ?? 'Thất bại')
  } finally {
    working.value = false
  }
}

async function bulkAction(action: 'accept' | 'reject') {
  if (!run.value) return
  const pend = run.value.items.filter((it) => it.decision === 'pending')
  if (!pend.length) {
    toast.err('Không còn đề xuất nào đang chờ')
    return
  }
  const nOver = pend.filter((it) => it.type !== 'form' && it.current?.source === 'bien_tap_thu_cong' && !it.same).length
  const ok = await confirm({
    title: action === 'accept' ? `Chấp nhận ${pend.length} đề xuất?` : `Từ chối ${pend.length} đề xuất?`,
    description: action === 'accept'
      ? `${nOver ? `${nOver} mục đã chỉnh thủ công sẽ BỊ GHI ĐÈ. Mục chưa đủ căn cứ sẽ được bỏ qua.` : 'Mục chưa đủ căn cứ sẽ được bỏ qua để bạn xử lý riêng.'}`
      : 'Dữ liệu bản nháp không thay đổi.',
    confirmText: action === 'accept' ? 'Chấp nhận tất cả' : 'Từ chối tất cả',
    variant: action === 'accept' ? 'warning' : 'destructive',
  })
  if (!ok) return
  working.value = true
  let done = 0
  const skipped: string[] = []
  for (const it of pend) {
    if (action === 'accept') {
      const r = await acceptOne(it.id, null, true)
      if (r.ok) done++
      else skipped.push(`${it.title}: ${r.msg}`)
    } else {
      try {
        await api('POST', `/api/admin/ai/runs/${props.runId}/items/${encodeURIComponent(it.id)}/reject`, {})
        done++
      } catch (e: any) {
        skipped.push(`${it.title}: ${e.message}`)
      }
    }
  }
  working.value = false
  const msg = `${action === 'accept' ? 'Đã chấp nhận' : 'Đã từ chối'} ${done}/${pend.length}` + (skipped.length ? `\nBỏ qua ${skipped.length} mục:\n• ${skipped.join('\n• ')}` : '')
  if (skipped.length) toast.err(msg)
  else toast.ok(msg)
  await load()
  emit('applied')
}

function startEdit() {
  if (!cur.value) return
  editValue.value = String(cur.value.proposed ?? '')
  editing.value = true
}

const differs = (x: Item) => x.type === 'form' ? x.relation !== 'da_co' : !x.same
const nDiff = computed(() => (run.value?.items ?? []).filter(differs).length)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-6xl max-h-[90vh] p-0 flex flex-col">
      <DialogHeader class="px-6 pt-6 pb-3 border-b">
        <DialogTitle class="flex items-center gap-3">
          <Eye class="size-5 text-primary" />
          Đối chiếu đề xuất AI
          <span v-if="run" class="text-sm font-normal text-muted-foreground">
            — lần chạy #{{ run.id }} · còn chờ {{ pendingCount }} · {{ nDiff }}/{{ run.items.length }} khác nội dung hiện tại
          </span>
        </DialogTitle>
        <DialogDescription>
          Chọn từng mục để Chấp nhận (lưu vào nháp) hoặc Từ chối. Có thể sửa đề xuất trước khi chấp nhận.
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <Loader2 class="size-5 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="run" class="flex-1 flex min-h-0">
        <!-- Sidebar list -->
        <nav class="w-72 border-r overflow-y-auto">
          <button
            v-for="(it, i) in run.items"
            :key="it.id"
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-b border-border/40 hover:bg-accent/40 transition-colors"
            :class="i === idx ? 'bg-accent/60 font-medium' : ''"
            @click="idx = i; editing = false"
          >
            <span class="w-4 shrink-0 text-center">
              <Check v-if="it.decision === 'accepted'" class="size-3.5 text-success inline" />
              <X v-else-if="it.decision === 'rejected'" class="size-3.5 text-destructive inline" />
              <span v-else class="text-muted-foreground">○</span>
            </span>
            <span class="flex-1 truncate">{{ it.title }}</span>
            <Badge v-if="differs(it)" variant="outline" class="font-normal text-xs shrink-0">khác</Badge>
          </button>
        </nav>

        <!-- Main viewer -->
        <main class="flex-1 overflow-y-auto p-6 space-y-4">
          <template v-if="cur">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base font-semibold flex-1">{{ cur.title }}</h3>
              <Badge v-if="cur.sufficient" class="bg-success text-success-foreground">Đủ căn cứ</Badge>
              <Badge v-else variant="destructive">Chưa đủ căn cứ</Badge>
              <Badge v-if="cur.decision === 'accepted'" class="bg-success text-success-foreground">Đã chấp nhận</Badge>
              <Badge v-else-if="cur.decision === 'rejected'" variant="secondary">Đã từ chối</Badge>
            </div>

            <!-- Form type -->
            <div v-if="cur.type === 'form' && cur.proposed" class="rounded-md border p-3 text-sm space-y-1">
              <p><strong>Nhãn:</strong> {{ cur.proposed.label }} · {{ cur.proposed.title }}</p>
              <p><strong>Nhóm:</strong> {{ cur.proposed.form_type }} · khối {{ cur.proposed.block_start }}–{{ cur.proposed.block_end }}</p>
              <p v-if="cur.relation === 'thieu'" class="text-warning">Chưa có trong danh sách</p>
              <p v-else-if="cur.relation === 'da_co'" class="text-muted-foreground">Đã có (đúng ranh giới)</p>
              <p v-else-if="cur.relation === 'lech_ranh_gioi'" class="text-warning">Lệch ranh giới so với mẫu hiện có</p>
            </div>

            <!-- Field diff -->
            <template v-else>
              <AdminAiDiff
                v-if="!editing"
                :before="cur.current?.value || ''"
                :after="String(cur.proposed ?? '')"
              />
              <div v-else class="space-y-2">
                <label class="text-xs font-medium">Giá trị đề xuất (có thể sửa)</label>
                <Textarea v-model="editValue" rows="12" class="font-mono text-sm" />
                <Button variant="outline" size="sm" @click="editing = false">Quay lại so sánh</Button>
              </div>
              <Button v-if="!editing && cur.decision === 'pending'" variant="outline" size="sm" @click="startEdit">
                Sửa đề xuất
              </Button>
            </template>

            <!-- Evidence -->
            <details v-if="cur.evidence?.length" class="rounded-md border">
              <summary class="px-3 py-2 text-sm font-medium cursor-pointer">
                Chứng cứ trong Word gốc ({{ cur.evidence.length }})
              </summary>
              <ul class="px-4 pb-3 text-sm space-y-1">
                <li v-for="(e, i) in cur.evidence" :key="i">
                  <span :class="e.verified ? 'text-success' : 'text-destructive'">{{ e.verified ? '✓' : '✗' }}</span>
                  khối #{{ e.block }}:
                  <em class="text-muted-foreground">{{ e.quote }}</em>
                </li>
              </ul>
            </details>

            <ul v-if="cur.warnings?.length" class="text-sm text-warning space-y-0.5">
              <li v-for="(w, i) in cur.warnings" :key="i">⚠ {{ w }}</li>
            </ul>
          </template>
        </main>
      </div>

      <DialogFooter class="px-6 py-3 border-t flex-wrap gap-2">
        <Button variant="outline" size="sm" :disabled="idx === 0" @click="idx--; editing = false">
          <ChevronLeft class="size-4 mr-1" /> Trước
        </Button>
        <Button variant="outline" size="sm" :disabled="!run || idx >= run.items.length - 1" @click="idx++; editing = false">
          Sau <ChevronRight class="size-4 ml-1" />
        </Button>
        <div class="flex-1"></div>
        <Button
          v-if="cur?.decision === 'pending'"
          :disabled="working"
          @click="accept"
        >
          <Loader2 v-if="working" class="size-4 mr-2 animate-spin" />
          <Check v-else class="size-4 mr-2" />
          Chấp nhận
        </Button>
        <Button
          v-if="cur?.decision === 'pending'"
          variant="outline"
          :disabled="working"
          @click="reject"
        >
          <X class="size-4 mr-2" />
          Từ chối
        </Button>
        <Button variant="default" :disabled="!pendingCount || working" @click="bulkAction('accept')">
          Chấp nhận tất cả ({{ pendingCount }})
        </Button>
        <Button variant="outline" :disabled="!pendingCount || working" @click="bulkAction('reject')">
          Từ chối tất cả
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
