<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  FileStack,
  Loader2,
  AlertCircle,
  Lock,
  Eye,
  History,
  AlertTriangle,
} from 'lucide-vue-next'
import {
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

definePageMeta({ layout: 'admin' })

interface BatchItem {
  filename: string
  original_filename?: string
  status: string
  warning_counts?: { error?: number; warning?: number; info?: number }
  version_id?: number | null
  error?: string | null
}
interface Batch {
  id: number
  status?: string
  total?: number
  succeeded?: number
  needs_review?: number
  failed?: number
  duplicates?: number
  split_total?: number
  created_at?: string
  created_by?: string
  items: BatchItem[]
}
interface BatchSummary {
  id: number
  status: string
  total: number
  created_at: string
  created_by: string
}

const { api } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()

const canImport = computed(() => hasRole('editor'))

const multiFiles = ref<File[]>([])
const uploading = ref(false)
const progress = ref(0)
const batch = ref<Batch | null>(null)

const collectionFiles = ref<File[]>([])
const uploadingCol = ref(false)
const progressCol = ref(0)
const batchCol = ref<Batch | null>(null)

const viewBatch = ref<Batch | null>(null)
const viewOpen = ref(false)

const { data: batches, refresh: refreshBatches, pending: pendingList } = await useAsyncData(
  'admin-import-batches',
  () => api<BatchSummary[]>('GET', '/api/admin/imports'),
  { default: () => [] as BatchSummary[] },
)

async function uploadMulti() {
  if (!multiFiles.value.length) return
  uploading.value = true
  progress.value = 0
  batch.value = null

  const fd = new FormData()
  for (const f of multiFiles.value) fd.append('files', f)

  try {
    const res = await new Promise<Batch>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/imports')
      xhr.withCredentials = true
      const me = useAdminMe()
      if (me.value?.csrf_token) xhr.setRequestHeader('X-CSRF-Token', me.value.csrf_token)
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) progress.value = Math.round((ev.loaded / ev.total) * 100)
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}')
          if (xhr.status >= 200 && xhr.status < 300) resolve(data)
          else reject(new Error(data?.detail ?? `HTTP ${xhr.status}`))
        } catch (e) {
          reject(e)
        }
      }
      xhr.onerror = () => reject(new Error('Lỗi mạng'))
      xhr.send(fd)
    })
    batch.value = res
    multiFiles.value = []
    toast.ok(`Lô #${res.id}: ${res.succeeded ?? 0} thành công, ${res.failed ?? 0} lỗi`)
    await refreshBatches()
  } catch (e: any) {
    toast.err(e?.message ?? 'Import thất bại')
  } finally {
    uploading.value = false
  }
}

async function uploadCollection() {
  if (!collectionFiles.value.length) return
  uploadingCol.value = true
  progressCol.value = 0
  batchCol.value = null

  const fd = new FormData()
  fd.append('file', collectionFiles.value[0])
  const fileName = collectionFiles.value[0].name

  try {
    const res = await new Promise<Batch>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/imports/collection')
      xhr.withCredentials = true
      const me = useAdminMe()
      if (me.value?.csrf_token) xhr.setRequestHeader('X-CSRF-Token', me.value.csrf_token)
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) progressCol.value = Math.round((ev.loaded / ev.total) * 100)
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}')
          if (xhr.status >= 200 && xhr.status < 300) resolve(data)
          else reject(new Error(data?.detail ?? `HTTP ${xhr.status}`))
        } catch (e) {
          reject(e)
        }
      }
      xhr.onerror = () => reject(new Error('Lỗi mạng'))
      xhr.send(fd)
    })
    batchCol.value = { ...res, split_total: res.split_total ?? res.total }
    ;(batchCol.value as any)._fileName = fileName
    collectionFiles.value = []
    toast.ok(`Tách ${res.split_total ?? res.total} TTHC vào lô #${res.id}`)
    await refreshBatches()
  } catch (e: any) {
    toast.err(e?.message ?? 'Tách thất bại')
  } finally {
    uploadingCol.value = false
  }
}

async function openBatch(id: number) {
  try {
    const b = await api<Batch>('GET', `/api/admin/imports/${id}`)
    viewBatch.value = b
    viewOpen.value = true
  } catch (e: any) {
    toast.err(e?.message ?? 'Không mở được lô')
  }
}

const hasPending = computed(() =>
  uploading.value || uploadingCol.value || multiFiles.value.length > 0 || collectionFiles.value.length > 0,
)

// F5 / đóng tab — chỉ browser mới chặn được (dialog mặc định, không custom được)
if (import.meta.client) {
  useEventListener(window, 'beforeunload', (e: BeforeUnloadEvent) => {
    if (hasPending.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  })
}

// Click sang tab khác / điều hướng trong app — chặn bằng dialog shadcn đẹp
const router = useRouter()
const leaveOpen = ref(false)
const pendingTo = ref<string | null>(null)

onMounted(() => {
  const remove = router.beforeEach((to, from, next) => {
    if (from.path === '/admin/import' && to.path !== '/admin/import' && hasPending.value && !pendingTo.value) {
      pendingTo.value = to.fullPath
      leaveOpen.value = true
      next(false)
    } else {
      next()
    }
  })
  onBeforeUnmount(remove)
})

function confirmLeave() {
  const to = pendingTo.value
  leaveOpen.value = false
  pendingTo.value = null
  multiFiles.value = []
  collectionFiles.value = []
  if (to) router.push(to)
}

function cancelLeave() {
  leaveOpen.value = false
  pendingTo.value = null
}

function fmtDate(iso?: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Import Word</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Tải lên DOCX TTHC. Mỗi tệp tạo một <strong>bản nháp</strong> riêng — cần vai trò Phê duyệt công khai sau.
      </p>
    </div>

    <Alert v-if="!canImport" variant="destructive">
      <Lock class="size-4" />
      <AlertTitle>Thiếu quyền</AlertTitle>
      <AlertDescription>Cần vai trò <strong>Biên tập TTHC</strong> để import file.</AlertDescription>
    </Alert>

    <!-- Multi-file import -->
    <Card :class="!canImport ? 'opacity-60 pointer-events-none' : ''">
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Upload class="size-5" />
          </div>
          <div>
            <CardTitle>Import một hoặc nhiều tệp DOCX</CardTitle>
            <CardDescription class="mt-1">Mỗi tệp Word = 1 TTHC. Parser trích 11 nhóm trường + tách biểu mẫu vào bản nháp.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <AdminFileDropzone
          v-model="multiFiles"
          multiple
          accept=".docx"
          :max-size-mb="50"
          :disabled="uploading || !canImport"
        />

        <div v-if="uploading" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground flex items-center gap-2">
              <Loader2 class="size-4 animate-spin" />
              Đang tải lên và xử lý…
            </span>
            <span class="font-medium">{{ progress }}%</span>
          </div>
          <Progress :model-value="progress" />
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            :disabled="!multiFiles.length || uploading"
            @click="multiFiles = []"
          >Xóa chọn</Button>
          <Button
            :disabled="!multiFiles.length || uploading"
            @click="uploadMulti"
          >
            <Loader2 v-if="uploading" class="size-4 mr-2 animate-spin" />
            <Upload v-else class="size-4 mr-2" />
            Import {{ multiFiles.length ? `(${multiFiles.length})` : '' }} thành bản nháp
          </Button>
        </div>

        <div v-if="batch" class="pt-4 border-t">
          <AdminBatchResult :batch="batch" />
        </div>
      </CardContent>
    </Card>

    <!-- Collection (annex) import -->
    <Card :class="!canImport ? 'opacity-60 pointer-events-none' : ''">
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileStack class="size-5" />
          </div>
          <div>
            <CardTitle>Import tệp phụ lục tổng hợp</CardTitle>
            <CardDescription class="mt-1">
              Tệp Word phụ lục kèm QĐ chứa nhiều TTHC (mỗi TTHC có dòng "… — Mã TTHC: …"). Hệ thống tự tách và gom vào một lô.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <AdminFileDropzone
          v-model="collectionFiles"
          :multiple="false"
          accept=".docx"
          :max-size-mb="100"
          :disabled="uploadingCol || !canImport"
          hint="Chọn 1 tệp phụ lục tổng hợp"
        />

        <div v-if="uploadingCol" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground flex items-center gap-2">
              <Loader2 class="size-4 animate-spin" />
              Đang tách và import…
            </span>
            <span class="font-medium">{{ progressCol }}%</span>
          </div>
          <Progress :model-value="progressCol" />
        </div>

        <div class="flex items-center justify-end">
          <Button
            :disabled="!collectionFiles.length || uploadingCol"
            @click="uploadCollection"
          >
            <Loader2 v-if="uploadingCol" class="size-4 mr-2 animate-spin" />
            <FileStack v-else class="size-4 mr-2" />
            Tách và import thành lô
          </Button>
        </div>

        <div v-if="batchCol" class="pt-4 border-t">
          <AdminBatchResult
            :batch="batchCol"
            :split-hint="(batchCol as any)._fileName"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Recent batches -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <History class="size-5" />
          </div>
          <div>
            <CardTitle>Các lô gần đây</CardTitle>
            <CardDescription class="mt-1">{{ (batches ?? []).length }} lô đã import.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-20">Lô</TableHead>
                <TableHead>Lúc</TableHead>
                <TableHead>Người</TableHead>
                <TableHead class="w-20">Tệp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead class="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pendingList" v-for="n in 3" :key="n">
                <TableCell colspan="6"><Skeleton class="h-8 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!batches?.length">
                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
                  Chưa có lô nào.
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="b in batches" :key="b.id">
                <TableCell class="font-mono text-sm">#{{ b.id }}</TableCell>
                <TableCell class="text-sm">{{ fmtDate(b.created_at) }}</TableCell>
                <TableCell class="text-sm">{{ b.created_by }}</TableCell>
                <TableCell class="text-sm">{{ b.total }}</TableCell>
                <TableCell><AdminStatusBadge :status="b.status" /></TableCell>
                <TableCell class="text-right">
                  <Button variant="outline" size="sm" @click="openBatch(b.id)">
                    <Eye class="size-3.5 mr-1" /> Xem
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Leave-confirmation dialog -->
    <Dialog v-model:open="leaveOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="size-5 text-warning" />
            Thay đổi chưa lưu
          </DialogTitle>
          <DialogDescription>
            <template v-if="uploading || uploadingCol">
              Đang upload file. Nếu rời đi, tiến trình sẽ bị huỷ và file có thể chưa được xử lý đầy đủ.
            </template>
            <template v-else>
              Bạn đã chọn
              <strong>{{ multiFiles.length + collectionFiles.length }}</strong>
              tệp nhưng chưa import. Nếu rời đi, lựa chọn sẽ bị bỏ.
            </template>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="cancelLeave">Ở lại trang</Button>
          <Button variant="destructive" @click="confirmLeave">Rời đi, bỏ qua</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Batch detail dialog -->
    <Dialog v-model:open="viewOpen">
      <DialogContent class="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            Lô import <span class="font-mono text-primary">#{{ viewBatch?.id }}</span>
            <AdminStatusBadge v-if="viewBatch" :status="viewBatch.status || ''" />
          </DialogTitle>
        </DialogHeader>
        <div v-if="viewBatch" class="pt-2">
          <p class="text-sm text-muted-foreground mb-3">
            {{ fmtDate(viewBatch.created_at) }} · {{ viewBatch.created_by }}
          </p>
          <AdminBatchResult :batch="viewBatch" />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
