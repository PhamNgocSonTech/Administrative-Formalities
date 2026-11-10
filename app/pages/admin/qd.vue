<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Gavel,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Lock,
  Search,
  FileText,
  Info,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

interface Decision {
  id: number
  number: string
  issuer: string
  signed_date?: string | null
  effective_from?: string | null
  summary: string
  status: string
  warning?: string | null
}

const { api } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()

const canCreate = computed(() => hasRole('editor'))
const canBulk = computed(() => hasRole('editor') || hasRole('approver'))

const q = ref('')

const { data, pending, refresh, error } = await useAsyncData(
  'admin-decisions',
  () => api<Decision[]>('GET', '/api/admin/decisions'),
  { default: () => [] as Decision[] },
)

const filtered = computed(() => {
  const arr = data.value ?? []
  if (!q.value) return arr
  const t = q.value.toLowerCase()
  return arr.filter((d) =>
    d.number.toLowerCase().includes(t) ||
    d.summary.toLowerCase().includes(t) ||
    d.issuer.toLowerCase().includes(t),
  )
})

// Create form
const form = reactive({
  number: '',
  issuer: '',
  signed_date: '',
  effective_from: '',
  summary: '',
  effective_note: '',
  expiry_note: '',
})
const creating = ref(false)

async function create() {
  if (creating.value) return
  if (!form.number || !form.issuer || !form.summary) {
    toast.err('Vui lòng điền Số/ký hiệu, Cơ quan và Trích yếu')
    return
  }
  creating.value = true
  try {
    const d = await api<Decision>('POST', '/api/admin/decisions', {
      number: form.number,
      issuer: form.issuer,
      signed_date: form.signed_date || null,
      effective_from: form.effective_from || null,
      summary: form.summary,
      effective_note: form.effective_note || null,
      expiry_note: form.expiry_note || null,
    })
    toast.ok(`Đã tạo QĐ nháp #${d.id}`)
    await navigateTo(`/admin/d/${d.id}`)
  } catch (e: any) {
    toast.err(e?.message ?? 'Tạo QĐ thất bại')
  } finally {
    creating.value = false
  }
}

// Bulk delete
const selected = ref<Set<number>>(new Set())
const deleteOpen = ref(false)
const deleteReason = ref('')
const deleting = ref(false)

const allChecked = computed(() => filtered.value.length > 0 && filtered.value.every((d) => selected.value.has(d.id)))

function toggleAll(v: boolean | 'indeterminate') {
  if (v === true) selected.value = new Set(filtered.value.map((d) => d.id))
  else selected.value = new Set()
}

function toggleOne(id: number, v: boolean | 'indeterminate') {
  const s = new Set(selected.value)
  if (v === true) s.add(id)
  else s.delete(id)
  selected.value = s
}

async function confirmDelete() {
  if (!selected.value.size) return
  deleting.value = true
  try {
    const r = await api<{ deleted: any[]; skipped: any[] }>(
      'POST',
      '/api/admin/decisions/delete',
      { ids: [...selected.value], reason: deleteReason.value || ' ' },
    )
    const ok = r.deleted.length
    const skipped = r.skipped
    selected.value = new Set()
    deleteOpen.value = false
    deleteReason.value = ''
    await refresh()
    if (skipped.length) {
      toast.err(`Xóa ${ok}. Bỏ qua ${skipped.length}:\n• ` + skipped.map((x: any) => `${x.number || x.id}: ${x.reason}`).join('\n• '))
    } else {
      toast.ok(`Đã xóa ${ok} QĐ`)
    }
  } catch (e: any) {
    toast.err(e?.message ?? 'Xóa thất bại')
  } finally {
    deleting.value = false
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return iso.split('-').reverse().join('/')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Quyết định công bố</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Mỗi phiên bản TTHC công khai cần 01 QĐ công bố chính. Một QĐ có thể gắn N thủ tục.
      </p>
    </div>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải danh sách</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <!-- Create -->
    <Alert v-if="!canCreate">
      <Lock class="size-4" />
      <AlertTitle>Thiếu quyền</AlertTitle>
      <AlertDescription>Cần vai trò <strong>Biên tập</strong> để tạo QĐ mới.</AlertDescription>
    </Alert>

    <Card v-if="canCreate">
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Plus class="size-5" />
          </div>
          <div>
            <CardTitle>Tạo Quyết định công bố</CardTitle>
            <CardDescription class="mt-1">
              Chỉ nhập thông tin từ văn bản QĐ thật; hệ thống không tự suy luận.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="create" class="grid md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="num">Số/ký hiệu <span class="text-destructive">*</span></Label>
            <Input id="num" v-model="form.number" required placeholder="vd. 1234/QĐ-BCT" />
          </div>
          <div class="space-y-2">
            <Label for="issuer">Cơ quan ban hành <span class="text-destructive">*</span></Label>
            <Input id="issuer" v-model="form.issuer" required placeholder="vd. Bộ Công Thương" />
          </div>
          <div class="space-y-2">
            <Label for="sd">Ngày ký</Label>
            <AdminDatePicker v-model="form.signed_date" placeholder="Chọn ngày ký" />
          </div>
          <div class="space-y-2">
            <Label for="ef">
              Ngày bắt đầu hiệu lực
              <span class="text-xs text-muted-foreground font-normal">(không suy từ ngày ký)</span>
            </Label>
            <AdminDatePicker v-model="form.effective_from" placeholder="Chọn ngày hiệu lực" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label for="sum">Trích yếu <span class="text-destructive">*</span></Label>
            <Textarea id="sum" v-model="form.summary" rows="2" required />
          </div>
          <div class="space-y-2">
            <Label for="en">Ghi chú hiệu lực</Label>
            <Input id="en" v-model="form.effective_note" />
          </div>
          <div class="space-y-2">
            <Label for="xn">Ghi chú hết hiệu lực / thay thế</Label>
            <Input id="xn" v-model="form.expiry_note" />
          </div>

          <div class="md:col-span-2 flex justify-end">
            <Button type="submit" :disabled="creating">
              <Loader2 v-if="creating" class="size-4 mr-2 animate-spin" />
              <Plus v-else class="size-4 mr-2" />
              Tạo QĐ nháp
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- List -->
    <Card>
      <CardHeader>
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Gavel class="size-5" />
            </div>
            <div>
              <CardTitle>Danh sách Quyết định</CardTitle>
              <CardDescription class="mt-1">{{ filtered.length }} / {{ data?.length ?? 0 }} QĐ</CardDescription>
            </div>
          </div>
          <div class="relative w-full sm:w-[280px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input v-model="q" placeholder="Lọc số/ký hiệu, trích yếu…" class="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <AdminBulkBar :show="canBulk && selected.size > 0">
          <div class="px-6 py-3 border-t border-b bg-muted/30 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Đã chọn <strong class="text-foreground">{{ selected.size }}</strong></span>
            <Button variant="destructive" size="sm" @click="deleteOpen = true">
              <Trash2 class="size-4 mr-1.5" />
              Xóa
            </Button>
          </div>
        </AdminBulkBar>

        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-if="canBulk" class="w-10">
                  <Checkbox :model-value="allChecked" @update:model-value="toggleAll" />
                </TableHead>
                <TableHead>Số/ký hiệu</TableHead>
                <TableHead class="w-28">Ngày ký</TableHead>
                <TableHead class="w-28">Hiệu lực</TableHead>
                <TableHead class="min-w-[280px]">Trích yếu</TableHead>
                <TableHead>Cơ quan</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pending" v-for="n in 4" :key="n">
                <TableCell :colspan="canBulk ? 7 : 6"><Skeleton class="h-6 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!filtered.length">
                <TableCell :colspan="canBulk ? 7 : 6" class="h-24 text-center text-muted-foreground">
                  Chưa có Quyết định nào.
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="d in filtered" :key="d.id">
                <TableCell v-if="canBulk">
                  <Checkbox
                    :model-value="selected.has(d.id)"
                    @update:model-value="(v) => toggleOne(d.id, v)"
                  />
                </TableCell>
                <TableCell>
                  <NuxtLink :to="`/admin/d/${d.id}`" class="text-primary hover:underline font-medium">
                    {{ d.number }}
                  </NuxtLink>
                </TableCell>
                <TableCell class="text-sm">{{ fmtDate(d.signed_date) }}</TableCell>
                <TableCell class="text-sm">{{ fmtDate(d.effective_from) }}</TableCell>
                <TableCell class="text-sm">{{ d.summary }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">{{ d.issuer }}</TableCell>
                <TableCell>
                  <div class="flex flex-col gap-1">
                    <AdminStatusBadge :status="d.status" />
                    <span v-if="d.warning" class="text-xs text-warning">{{ d.warning }}</span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Delete dialog -->
    <Dialog v-model:open="deleteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="size-5 text-destructive" />
            Xóa {{ selected.size }} Quyết định
          </DialogTitle>
          <DialogDescription>
            Xóa cứng khỏi CSDL (nhật ký vẫn giữ dấu vết). Không xóa QĐ đang dùng cho TTHC đang công khai.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <Label for="reason">Lý do xóa (tùy chọn)</Label>
          <Input id="reason" v-model="deleteReason" placeholder="Nhập lý do…" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deleteOpen = false">Hủy</Button>
          <Button variant="destructive" :disabled="deleting" @click="confirmDelete">
            <Loader2 v-if="deleting" class="size-4 mr-2 animate-spin" />
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
