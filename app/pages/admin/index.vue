<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'

definePageMeta({ layout: 'admin' })

interface Decision {
  id: number
  number: string
  signed_date?: string | null
}
interface WarningCounts {
  error?: number
  warning?: number
  info?: number
}
interface Procedure {
  code: string
  name: string
  sector?: string | null
  batch_id?: number | null
  latest_version_id: number
  latest_version_no: number
  latest_status: string
  published_version_no?: number | null
  abolished?: boolean
  amend_pending?: boolean
  decision?: Decision | null
  warning_counts?: WarningCounts
}

const { api } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()

const q = useSessionStorage('tthc_q', '')
const filter = useSessionStorage('tthc_f', '')
const pageSize = useSessionStorage<number>('tthc_ps', 20)
const page = useSessionStorage<number>('tthc_p', 1)
const selected = ref<Set<string>>(new Set())
const deleteOpen = ref(false)
const deleting = ref(false)

const { data, pending, refresh, error } = await useAsyncData(
  'admin-procedures',
  () => api<Procedure[]>('GET', '/api/admin/procedures' + (q.value ? `?q=${encodeURIComponent(q.value)}` : '')),
  { default: () => [] as Procedure[], watch: [q] },
)

const all = computed(() => data.value ?? [])

const isPub = (r: Procedure) => r.published_version_no != null
const keyOf = (r: Procedure) =>
  (isPub(r) ? 'pub:' : 'non:') +
  (r.abolished ? 'abolished' : r.amend_pending && !isPub(r) ? 'amending' : r.latest_status)

const tally = computed(() => {
  const t: Record<string, number> = {}
  for (const r of all.value) t[keyOf(r)] = (t[keyOf(r)] || 0) + 1
  return t
})

const filtered = computed(() =>
  all.value.filter((r) => {
    if (!filter.value) return true
    if (filter.value === 'pub') return isPub(r)
    if (filter.value === 'non') return !isPub(r)
    if (filter.value === 'abolished') return r.abolished
    if (filter.value === 'amending') return r.amend_pending
    return keyOf(r) === filter.value
  }),
)

const nPub = computed(() => all.value.filter(isPub).length)
const nNon = computed(() => all.value.length - nPub.value)
const nAbolished = computed(() => all.value.filter((r) => r.abolished).length)
const nAmending = computed(() => all.value.filter((r) => r.amend_pending).length)

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const curPage = computed(() => Math.min(Math.max(1, page.value), totalPages.value))
const shown = computed(() =>
  filtered.value.slice((curPage.value - 1) * pageSize.value, curPage.value * pageSize.value),
)

watch(filter, () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })

function setFilter(f: string) {
  filter.value = filter.value === f ? '' : f
}

const pubOrder = ['published', 'draft', 'needs_review', 'pending_approval', 'rejected']
const nonOrder = ['draft', 'needs_review', 'pending_approval', 'rejected', 'withdrawn', 'superseded', 'cancelled']

function pubLabel(s: string) {
  return s === 'published' ? 'Đang công khai' : `Có bản ${(STATUS_LABEL[s] || s).toLowerCase()} mới`
}

const canBulk = computed(() => hasRole('editor') || hasRole('approver'))

const allChecked = computed(() => shown.value.length > 0 && shown.value.every((r) => selected.value.has(r.code)))

function toggleAll(v: boolean | 'indeterminate') {
  if (v === true) selected.value = new Set(shown.value.map((r) => r.code))
  else selected.value = new Set()
}

function toggleOne(code: string, v: boolean | 'indeterminate') {
  const s = new Set(selected.value)
  if (v === true) s.add(code)
  else s.delete(code)
  selected.value = s
}

const deleteReason = ref('')

async function confirmDelete() {
  if (!selected.value.size) return
  deleting.value = true
  const codes = [...selected.value]
  try {
    const r = await api<{ deleted: any[]; skipped: any[] }>(
      'POST',
      '/api/admin/procedures/delete',
      { codes, reason: deleteReason.value || ' ' },
    )
    selected.value = new Set()
    deleteOpen.value = false
    deleteReason.value = ''
    await refresh()
    const ok = r.deleted.length
    if (r.skipped.length) {
      toast.err(`Xóa ${ok}/${codes.length}. Bỏ qua ${r.skipped.length}:\n• ` +
        r.skipped.map((x: any) => `${x.code || x.id}: ${x.reason}`).join('\n• '))
    } else {
      toast.ok(`Đã xóa ${ok} TTHC`)
    }
  } catch (e: any) {
    toast.err(e?.message ?? 'Xóa thất bại')
  } finally {
    deleting.value = false
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return ''
  return iso.split('-').reverse().join('/')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Thủ tục hành chính</h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ filtered.length }} / {{ all.length }} thủ tục
          <template v-if="filter"> · lọc theo trạng thái</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative w-[320px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input v-model="q" placeholder="Lọc theo mã hoặc tên…" class="pl-9" />
        </div>
      </div>
    </div>

    <div v-if="error" class="rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm px-4 py-3">
      {{ error.message }}
    </div>

    <!-- Tally cards -->
    <div class="grid md:grid-cols-2 gap-4">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-baseline justify-between mb-1">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 class="size-4 text-success" />
              Công khai <span class="text-xl font-semibold text-foreground">{{ nPub }}</span>
            </h3>
          </div>
          <p class="text-xs text-muted-foreground mb-3">Công dân đang tra cứu được.</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              :class="cn('tchip', filter === 'pub' && 'on')"
              @click="setFilter('pub')"
            >Tất cả <b>{{ nPub }}</b></button>
            <button
              v-for="s in pubOrder.filter((s) => tally[`pub:${s}`])"
              :key="`pub-${s}`"
              :class="cn('tchip', filter === `pub:${s}` && 'on')"
              @click="setFilter(`pub:${s}`)"
            >{{ pubLabel(s) }} <b>{{ tally[`pub:${s}`] }}</b></button>
            <button
              v-if="nAmending"
              :class="cn('tchip', filter === 'amending' && 'on')"
              @click="setFilter('amending')"
            >Sửa đổi chờ duyệt <b>{{ nAmending }}</b></button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-baseline justify-between mb-1">
            <h3 class="text-sm font-medium flex items-center gap-2">
              <XCircle class="size-4 text-muted-foreground" />
              Không công khai <span class="text-xl font-semibold text-foreground">{{ nNon }}</span>
            </h3>
          </div>
          <p class="text-xs text-muted-foreground mb-3">Chưa duyệt công khai hoặc đã ngừng.</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              :class="cn('tchip', filter === 'non' && 'on')"
              @click="setFilter('non')"
            >Tất cả <b>{{ nNon }}</b></button>
            <button
              v-for="s in nonOrder.filter((s) => tally[`non:${s}`])"
              :key="`non-${s}`"
              :class="cn('tchip', filter === `non:${s}` && 'on')"
              @click="setFilter(`non:${s}`)"
            >{{ STATUS_LABEL[s] || s }} <b>{{ tally[`non:${s}`] }}</b></button>
            <button
              v-if="nAbolished"
              :class="cn('tchip', filter === 'abolished' && 'on')"
              @click="setFilter('abolished')"
            >Bãi bỏ <b>{{ nAbolished }}</b></button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Toolbar -->
    <div v-if="filter || (canBulk && selected.size)" class="flex items-center justify-between flex-wrap gap-2">
      <div v-if="filter" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter class="size-4" />
        <span>Đang lọc</span>
        <Button variant="ghost" size="sm" class="h-7" @click="filter = ''">Bỏ lọc</Button>
      </div>
      <div v-else></div>
      <div v-if="canBulk && selected.size" class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Đã chọn {{ selected.size }}</span>
        <Button variant="destructive" size="sm" @click="deleteOpen = true">
          <Trash2 class="size-4 mr-1.5" />
          Xóa
        </Button>
      </div>
    </div>

    <!-- Table -->
    <Card>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead v-if="canBulk" class="w-10">
                <Checkbox :model-value="allChecked" @update:model-value="toggleAll" />
              </TableHead>
              <TableHead>Mã</TableHead>
              <TableHead class="min-w-[280px]">Tên thủ tục</TableHead>
              <TableHead>Lĩnh vực</TableHead>
              <TableHead>Lô</TableHead>
              <TableHead>Bản mới nhất</TableHead>
              <TableHead>Quyết định công bố</TableHead>
              <TableHead>Cảnh báo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="pending">
              <TableRow v-for="n in 6" :key="n">
                <TableCell v-if="canBulk"><Skeleton class="size-4" /></TableCell>
                <TableCell><Skeleton class="h-4 w-20" /></TableCell>
                <TableCell><Skeleton class="h-4 w-full" /></TableCell>
                <TableCell><Skeleton class="h-4 w-24" /></TableCell>
                <TableCell><Skeleton class="h-4 w-10" /></TableCell>
                <TableCell><Skeleton class="h-4 w-32" /></TableCell>
                <TableCell><Skeleton class="h-4 w-28" /></TableCell>
                <TableCell><Skeleton class="h-4 w-16" /></TableCell>
              </TableRow>
            </template>
            <TableRow v-else-if="!shown.length">
              <TableCell :colspan="canBulk ? 8 : 7" class="h-32 text-center text-muted-foreground">
                Không có thủ tục nào phù hợp.
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="r in shown" :key="r.code">
              <TableCell v-if="canBulk">
                <Checkbox
                  :model-value="selected.has(r.code)"
                  @update:model-value="(v) => toggleOne(r.code, v)"
                />
              </TableCell>
              <TableCell>
                <NuxtLink :to="`/admin/v/${r.latest_version_id}`" class="font-mono text-xs text-primary hover:underline">
                  {{ r.code }}
                </NuxtLink>
              </TableCell>
              <TableCell class="max-w-[380px] whitespace-normal leading-snug">{{ r.name }}</TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ r.sector || '—' }}</TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ r.batch_id ? `#${r.batch_id}` : '—' }}</TableCell>
              <TableCell>
                <div class="flex flex-wrap items-center gap-1">
                  <span class="text-xs text-muted-foreground">PB {{ r.latest_version_no }}</span>
                  <AdminStatusBadge :status="r.latest_status" />
                  <AdminStatusBadge v-if="r.abolished" status="cancelled" label="Bãi bỏ" />
                  <AdminStatusBadge v-if="r.amend_pending" status="needs_review" label="Sửa chờ duyệt" />
                </div>
              </TableCell>
              <TableCell>
                <template v-if="r.decision">
                  <NuxtLink :to="`/admin/d/${r.decision.id}`" class="text-primary hover:underline text-sm">
                    {{ r.decision.number }}
                  </NuxtLink>
                  <div v-if="r.decision.signed_date" class="text-xs text-muted-foreground">ngày {{ fmtDate(r.decision.signed_date) }}</div>
                </template>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1">
                  <Badge v-if="r.warning_counts?.error" variant="destructive" class="font-normal">{{ r.warning_counts.error }} error</Badge>
                  <Badge v-if="r.warning_counts?.warning" variant="secondary" class="bg-warning text-warning-foreground font-normal">{{ r.warning_counts.warning }} warning</Badge>
                  <Badge v-if="r.warning_counts?.info" variant="outline" class="font-normal">{{ r.warning_counts.info }} info</Badge>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pager -->
      <div class="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-t">
        <div class="text-sm text-muted-foreground">
          <template v-if="filtered.length">
            Hiển thị {{ (curPage - 1) * pageSize + 1 }}–{{ (curPage - 1) * pageSize + shown.length }} / {{ filtered.length }}
          </template>
          <template v-else>0 kết quả</template>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Trang {{ curPage }} / {{ totalPages }}</span>
          <div class="flex items-center gap-1 ml-2">
            <Button variant="outline" size="icon" class="size-8" :disabled="curPage <= 1" @click="page = curPage - 1">
              <ChevronLeft class="size-4" />
            </Button>
            <Button variant="outline" size="icon" class="size-8" :disabled="curPage >= totalPages" @click="page = curPage + 1">
              <ChevronRight class="size-4" />
            </Button>
          </div>
          <Select :model-value="String(pageSize)" @update:model-value="(v) => pageSize = Number(v)">
            <SelectTrigger class="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="n in [10, 20, 50]" :key="n" :value="String(n)">{{ n }} / trang</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>

    <!-- Delete dialog -->
    <Dialog v-model:open="deleteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="size-5 text-destructive" />
            Xác nhận xóa {{ selected.size }} TTHC
          </DialogTitle>
          <DialogDescription>
            Xóa cứng khỏi cơ sở dữ liệu, không thể hoàn tác. TTHC đã từng công khai cần vai trò Phê duyệt.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <label for="del-reason" class="text-sm font-medium">Lý do xóa (tùy chọn)</label>
          <input
            id="del-reason"
            v-model="deleteReason"
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deleteOpen = false">Hủy</Button>
          <Button variant="destructive" :disabled="deleting" @click="confirmDelete">
            <Loader2 v-if="deleting" class="size-4 mr-2 animate-spin" />
            {{ deleting ? 'Đang xóa…' : 'Xóa vĩnh viễn' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.tchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  color: var(--color-muted-foreground);
  font-size: 12px;
  font-weight: 500;
  transition: all .15s;
  cursor: pointer;
}
.tchip:hover { background: var(--color-accent); color: var(--color-foreground); }
.tchip b {
  background: var(--color-background);
  color: var(--color-foreground);
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 11px;
}
.tchip.on {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}
.tchip.on b { background: color-mix(in oklch, var(--color-primary-foreground) 25%, transparent); color: var(--color-primary-foreground); }
</style>
