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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Send,
  Check,
  X,
  Trash2,
  Copy,
  Upload,
  Download,
  Pencil,
  Loader2,
  AlertTriangle,
  Link as LinkIcon,
  FileText,
  Gavel,
  Search,
  Eye,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

const IMPACT: Record<string, string> = {
  cong_bo_moi: 'Ban hành mới',
  sua_doi_bo_sung: 'Sửa đổi, bổ sung',
  thay_the: 'Thay thế',
  bai_bo: 'Bãi bỏ',
  lien_quan: 'Liên quan',
}

const MATCH: Record<string, string> = {
  khop: 'Khớp',
  khong_tim_thay: 'Chưa tìm thấy',
  trung_ma: 'Trùng mã',
  xung_dot_qd_chinh: 'Đã có QĐ chính khác',
  da_gan_qd_nay: 'Đã gắn QĐ này',
  dang_cho_duyet: 'Đang chờ duyệt',
  can_tao_ban_nhap: 'Đã ngừng/không có bản nháp',
  dang_cong_khai: 'Đang công khai',
}

interface DecisionFile {
  id: number
  filename: string
  size: number
  kind: 'main' | 'annex'
  has_text_layer?: boolean | null
  codes_found?: number
}
interface DecisionLink {
  id: number
  version_id: number
  code: string
  version_no: number
  version_status: string
  is_primary: boolean
  impact: string
  status: string
  source: string
  note?: string | null
}
interface Decision {
  id: number
  number: string
  issuer: string
  signed_date?: string | null
  effective_from?: string | null
  summary: string
  status: string
  warning?: string | null
  effective_note?: string | null
  expiry_note?: string | null
  replaces_id?: number | null
  replaced_by_id?: number | null
  approved_by?: string | null
  review_note?: string | null
  files: DecisionFile[]
  links: DecisionLink[]
}

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { api, download } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()
const { confirm } = useConfirm()

const { data: d, pending, refresh, error } = await useAsyncData(
  () => `admin-decision-${id.value}`,
  () => api<Decision>('GET', `/api/admin/decisions/${id.value}`),
  { watch: [id] },
)

const draft = computed(() => d.value?.status === 'draft' && hasRole('editor'))
const canEditMeta = computed(() => {
  if (!d.value) return false
  if (d.value.status === 'approved') return hasRole('approver')
  return !['superseded', 'cancelled'].includes(d.value.status) && hasRole('editor')
})

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return iso.split('-').reverse().join('/')
}

// Edit meta
const editOpen = ref(false)
const edit = reactive({
  number: '',
  issuer: '',
  signed_date: '',
  effective_from: '',
  summary: '',
  effective_note: '',
  expiry_note: '',
  reason: '',
})
const saving = ref(false)

function openEdit() {
  if (!d.value) return
  edit.number = d.value.number
  edit.issuer = d.value.issuer
  edit.signed_date = d.value.signed_date ?? ''
  edit.effective_from = d.value.effective_from ?? ''
  edit.summary = d.value.summary
  edit.effective_note = d.value.effective_note ?? ''
  edit.expiry_note = d.value.expiry_note ?? ''
  edit.reason = ''
  editOpen.value = true
}

async function saveMeta() {
  saving.value = true
  try {
    await api('PATCH', `/api/admin/decisions/${id.value}`, {
      number: edit.number,
      issuer: edit.issuer,
      signed_date: edit.signed_date || null,
      effective_from: edit.effective_from || null,
      summary: edit.summary,
      effective_note: edit.effective_note || null,
      expiry_note: edit.expiry_note || null,
      reason: edit.reason || null,
    })
    toast.ok('Đã lưu thay đổi')
    editOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Lưu thất bại')
  } finally {
    saving.value = false
  }
}

// Workflow actions
const working = ref<string | null>(null)

async function submit() {
  working.value = 'submit'
  try {
    await api('POST', `/api/admin/decisions/${id.value}/submit`)
    toast.ok('Đã gửi duyệt QĐ')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Gửi duyệt thất bại')
  } finally {
    working.value = null
  }
}

const approveOpen = ref(false)
async function approve() {
  working.value = 'approve'
  approveOpen.value = false
  try {
    const r = await api<{ auto_withdrawn?: { code: string }[] }>(
      'POST',
      `/api/admin/decisions/${id.value}/approve`,
    )
    let msg = 'Đã duyệt QĐ'
    if (r.auto_withdrawn?.length) {
      msg += `; ngừng công khai ${r.auto_withdrawn.length} TTHC bị bãi bỏ: ${r.auto_withdrawn.map((x) => x.code).join(', ')}`
    }
    toast.ok(msg)
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Duyệt thất bại')
  } finally {
    working.value = null
  }
}

const rejectOpen = ref(false)
async function reject() {
  working.value = 'reject'
  rejectOpen.value = false
  try {
    await api('POST', `/api/admin/decisions/${id.value}/reject`, {})
    toast.ok('Đã trả lại QĐ')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Trả lại thất bại')
  } finally {
    working.value = null
  }
}

const deleteOpen = ref(false)
const deleteReason = ref('')
async function remove() {
  working.value = 'delete'
  try {
    const r = await api<{ deleted: any[]; skipped: any[] }>(
      'POST',
      '/api/admin/decisions/delete',
      { ids: [id.value], reason: deleteReason.value || ' ' },
    )
    deleteOpen.value = false
    if (r.deleted.length) {
      toast.ok('Đã xóa QĐ')
      await navigateTo('/admin/qd')
    } else {
      toast.err('Không xóa được: ' + (r.skipped[0]?.reason ?? 'Không rõ'))
    }
  } catch (e: any) {
    toast.err(e?.message ?? 'Xóa thất bại')
  } finally {
    working.value = null
  }
}

// File upload
const fileKind = ref<'main' | 'annex'>('main')
const uploadFile = ref<File | null>(null)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function pickFile() {
  fileInputRef.value?.click()
}

function onFilePicked(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (files && files[0]) uploadFile.value = files[0]
}

async function uploadDecisionFile() {
  if (!uploadFile.value) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', uploadFile.value)
    fd.append('kind', fileKind.value)
    const r = await api<{ has_text_layer?: boolean | null; codes?: string[] }>(
      'POST',
      `/api/admin/decisions/${id.value}/files`,
      fd,
    )
    toast.ok(
      `Đã tải lên${r.has_text_layer === false ? ' — không có lớp chữ, cần đối chiếu thủ công' : ''}; tìm thấy ${r.codes?.length ?? 0} mã TTHC`,
    )
    uploadFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Tải tệp thất bại')
  } finally {
    uploading.value = false
  }
}

function downloadFile(f: DecisionFile) {
  download(`/api/admin/decisions/files/${f.id}/download`, f.filename)
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// Link preview / apply
const lk = reactive({
  batch: '',
  codes: '',
  from_annex: false,
})
interface PreviewRow {
  code: string
  name?: string
  version_id?: number
  version_no?: number
  version_status?: string
  match: string
  selectable: boolean
  current_primary?: string
  is_public?: boolean
}
interface Preview {
  summary: Record<string, number>
  rows: PreviewRow[]
  annex_warning?: string | null
  decision_status?: string
}
const preview = ref<Preview | null>(null)
const previewing = ref(false)
const applying = ref(false)
const selectedRows = ref<Set<number>>(new Set())
const linkImpact = ref<'cong_bo_moi' | 'sua_doi_bo_sung' | 'bai_bo'>('cong_bo_moi')

async function doPreview() {
  previewing.value = true
  try {
    const body: any = { from_annex: lk.from_annex }
    if (lk.batch) body.batch_id = Number(lk.batch)
    const codes = lk.codes.split(/[\s,;]+/).filter(Boolean)
    if (codes.length) body.codes = codes
    const p = await api<Preview>('POST', `/api/admin/decisions/${id.value}/links/preview`, body)
    preview.value = p
    // auto-tick rows that matched
    selectedRows.value = new Set(
      p.rows.map((r, i) => (r.selectable && r.match === 'khop' ? i : -1)).filter((i) => i >= 0),
    )
  } catch (e: any) {
    toast.err(e?.message ?? 'Xem trước thất bại')
  } finally {
    previewing.value = false
  }
}

function toggleRow(i: number, v: boolean | 'indeterminate') {
  const s = new Set(selectedRows.value)
  if (v === true) s.add(i)
  else s.delete(i)
  selectedRows.value = s
}

const allRowsChecked = computed(() => {
  if (!preview.value) return false
  const selectables = preview.value.rows.map((r, i) => (r.selectable ? i : -1)).filter((i) => i >= 0)
  return selectables.length > 0 && selectables.every((i) => selectedRows.value.has(i))
})
function toggleAllRows(v: boolean | 'indeterminate') {
  if (v === true && preview.value) {
    selectedRows.value = new Set(preview.value.rows.map((r, i) => (r.selectable ? i : -1)).filter((i) => i >= 0))
  } else {
    selectedRows.value = new Set()
  }
}

const applyConfirmOpen = ref(false)
const applyConfirmMsg = computed(() => {
  if (!preview.value) return ''
  const picked = [...selectedRows.value].map((i) => preview.value!.rows[i])
  const nPub = picked.filter((r) => r.is_public).length
  const impact = linkImpact.value
  if (impact === 'cong_bo_moi') return `Gắn QĐ làm QĐ công bố (Ban hành mới) cho ${picked.length} TTHC?`
  if (impact === 'sua_doi_bo_sung')
    return `Gắn QĐ Sửa đổi, bổ sung cho ${picked.length} TTHC; QĐ này sẽ thay QĐ công bố hiện hành.${
      nPub ? `\n\n${nPub} TTHC đang công khai sẽ bị TẠM DỪNG và tạo bản nháp mới; chỉ công khai lại khi quản trị duyệt nội dung.` : ''
    }`
  return `Gắn QĐ Bãi bỏ cho ${picked.length} TTHC?${
    nPub
      ? `\n\n${nPub} TTHC đang công khai sẽ bị NGỪNG CÔNG KHAI ${preview.value.decision_status === 'approved' ? 'ngay' : 'khi QĐ được duyệt'}.`
      : ''
  }`
})

async function doApply() {
  if (!preview.value) return
  applying.value = true
  applyConfirmOpen.value = false
  try {
    const picked = [...selectedRows.value].map((i) => preview.value!.rows[i])
    const source = lk.batch ? 'lo_import' : lk.from_annex ? 'phu_luc' : 'chon_nhieu'
    const r = await api<{ created: any[]; skipped: any[]; new_drafts: any[]; withdrawn: any[] }>(
      'POST',
      `/api/admin/decisions/${id.value}/links/apply`,
      {
        version_ids: picked.map((x) => x.version_id).filter(Boolean),
        impact: linkImpact.value,
        source,
      },
    )
    let msg = `Đã gắn ${r.created.length}; bỏ qua ${r.skipped.length}`
    if (r.skipped.length) msg += ':\n• ' + r.skipped.map((x) => `${x.code || x.version_id}: ${x.reason}`).join('\n• ')
    if (r.new_drafts?.length) msg += `\nTạo bản nháp mới: ${r.new_drafts.map((x) => x.code).join(', ')}`
    if (r.withdrawn?.length) msg += `\nĐã ngừng công khai: ${r.withdrawn.map((x) => x.code).join(', ')}`
    if (r.skipped.length) toast.err(msg)
    else toast.ok(msg)
    preview.value = null
    selectedRows.value = new Set()
    lk.batch = ''
    lk.codes = ''
    lk.from_annex = false
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Gắn thất bại')
  } finally {
    applying.value = false
  }
}

// Link management
async function changeImpact(link: DecisionLink, newImpact: string) {
  if (newImpact === link.impact) return
  const label = IMPACT[newImpact] ?? newImpact
  let warn = ''
  if (newImpact === 'bai_bo') warn = '\nTTHC đang công khai (nếu có) sẽ bị ngừng công khai khi QĐ được duyệt.'
  else if (newImpact === 'sua_doi_bo_sung')
    warn = '\nQĐ này sẽ thay QĐ công bố hiện hành; TTHC đang công khai (nếu có) sẽ bị tạm dừng.'
  const ok = await confirm({
    title: `Đổi tính chất thành "${label}"?`,
    description: warn.trim() || undefined,
    confirmText: 'Đổi',
    variant: newImpact === 'bai_bo' ? 'destructive' : 'warning',
  })
  if (!ok) {
    await refresh()
    return
  }
  try {
    await api('POST', `/api/admin/decisions/links/${link.id}/impact`, { impact: newImpact })
    toast.ok('Đã đổi tính chất liên kết')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Đổi tính chất thất bại')
    await refresh()
  }
}

async function unlink(link: DecisionLink) {
  if (!(await confirm({
    title: `Gỡ liên kết TTHC ${link.code}?`,
    description: 'TTHC sẽ không còn gắn với QĐ này nữa.',
    confirmText: 'Gỡ',
    variant: 'warning',
  }))) return
  try {
    await api('POST', `/api/admin/decisions/links/${link.id}/remove`, {})
    toast.ok('Đã gỡ liên kết')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Gỡ thất bại')
  }
}

// Replacement
const replaceOpen = ref(false)
const replaceForm = reactive({
  number: '',
  issuer: '',
  signed_date: '',
  effective_from: '',
  summary: '',
  effective_note: '',
  expiry_note: '',
})

function openReplace() {
  if (!d.value) return
  replaceForm.number = ''
  replaceForm.issuer = d.value.issuer
  replaceForm.signed_date = ''
  replaceForm.effective_from = ''
  replaceForm.summary = ''
  replaceForm.effective_note = ''
  replaceForm.expiry_note = ''
  replaceOpen.value = true
}

async function createReplacement() {
  if (!replaceForm.number || !replaceForm.issuer || !replaceForm.summary) {
    toast.err('Vui lòng điền Số/ký hiệu, Cơ quan và Trích yếu')
    return
  }
  working.value = 'replace'
  try {
    const nd = await api<Decision>('POST', `/api/admin/decisions/${id.value}/replace`, {
      number: replaceForm.number,
      issuer: replaceForm.issuer,
      signed_date: replaceForm.signed_date || null,
      effective_from: replaceForm.effective_from || null,
      summary: replaceForm.summary,
      effective_note: replaceForm.effective_note || null,
      expiry_note: replaceForm.expiry_note || null,
    })
    toast.ok(`Đã tạo QĐ thay thế #${nd.id}`)
    replaceOpen.value = false
    await navigateTo(`/admin/d/${nd.id}`)
  } catch (e: any) {
    toast.err(e?.message ?? 'Tạo QĐ thay thế thất bại')
  } finally {
    working.value = null
  }
}

const abolishCount = computed(() => {
  if (!d.value) return 0
  return (d.value.links ?? []).filter((l) => l.impact === 'bai_bo' && l.status !== 'rejected').length
})
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <Skeleton class="h-10 w-48" />
    <Skeleton class="h-32 w-full" />
  </div>

  <div v-else-if="error" class="space-y-4">
    <NuxtLink to="/admin/qd">
      <Button variant="ghost" size="sm">
        <ArrowLeft class="size-4 mr-1" /> Danh sách QĐ
      </Button>
    </NuxtLink>
    <Alert variant="destructive">
      <AlertTitle>Không tải được QĐ</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>
  </div>

  <div v-else-if="d" class="space-y-6">
    <!-- Back -->
    <NuxtLink to="/admin/qd">
      <Button variant="ghost" size="sm" class="-ml-2">
        <ArrowLeft class="size-4 mr-1" /> Danh sách QĐ
      </Button>
    </NuxtLink>

    <!-- Header -->
    <Card>
      <CardContent class="pt-6 space-y-4">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="min-w-0">
            <div class="flex items-center gap-3 flex-wrap mb-2">
              <h1 class="text-2xl font-semibold tracking-tight">QĐ {{ d.number }}</h1>
              <AdminStatusBadge :status="d.status" />
            </div>
            <p class="text-sm text-foreground">{{ d.summary }}</p>
            <p class="text-sm text-muted-foreground mt-2">
              {{ d.issuer }} · ký {{ fmtDate(d.signed_date) }} · hiệu lực {{ d.effective_from ? fmtDate(d.effective_from) : 'chưa xác định' }}
              <template v-if="d.replaces_id">
                · thay thế
                <NuxtLink :to="`/admin/d/${d.replaces_id}`" class="text-primary hover:underline">QĐ #{{ d.replaces_id }}</NuxtLink>
              </template>
              <template v-if="d.replaced_by_id">
                · bị thay bởi
                <NuxtLink :to="`/admin/d/${d.replaced_by_id}`" class="text-primary hover:underline">QĐ #{{ d.replaced_by_id }}</NuxtLink>
              </template>
              <template v-if="d.approved_by"> · duyệt: {{ d.approved_by }}</template>
              <template v-if="d.review_note"> · ghi chú: {{ d.review_note }}</template>
            </p>
          </div>
        </div>

        <Alert v-if="d.warning" variant="destructive">
          <AlertTriangle class="size-4" />
          <AlertDescription>{{ d.warning }}</AlertDescription>
        </Alert>

        <Alert v-if="['draft', 'pending_approval'].includes(d.status) && abolishCount" variant="default" class="border-warning/30 bg-warning/5">
          <AlertTriangle class="size-4 text-warning" />
          <AlertDescription>
            QĐ này bãi bỏ <strong>{{ abolishCount }}</strong> TTHC. Khi duyệt, các TTHC đang công khai trong số đó sẽ tự động bị ngừng công khai.
          </AlertDescription>
        </Alert>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-wrap pt-2 border-t">
          <Button v-if="draft" :disabled="working === 'submit'" @click="submit">
            <Loader2 v-if="working === 'submit'" class="size-4 mr-2 animate-spin" />
            <Send v-else class="size-4 mr-2" />
            Gửi duyệt
          </Button>

          <template v-if="d.status === 'pending_approval' && hasRole('approver')">
            <Button :disabled="working === 'approve'" @click="approveOpen = true">
              <Check class="size-4 mr-2" />
              Duyệt QĐ
            </Button>
            <Button variant="outline" :disabled="working === 'reject'" @click="rejectOpen = true">
              <X class="size-4 mr-2" />
              Trả lại
            </Button>
          </template>

          <Button
            v-if="canEditMeta"
            variant="outline"
            @click="openEdit"
          >
            <Pencil class="size-4 mr-2" />
            Chỉnh sửa
          </Button>

          <Button
            v-if="d.status === 'approved' && hasRole('editor')"
            variant="outline"
            @click="openReplace"
          >
            <Copy class="size-4 mr-2" />
            Tạo QĐ thay thế
          </Button>

          <div class="flex-1"></div>

          <Button
            v-if="hasRole('editor') || hasRole('approver')"
            variant="destructive"
            @click="deleteOpen = true"
          >
            <Trash2 class="size-4 mr-2" />
            Xóa QĐ
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Files -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText class="size-5" />
          </div>
          <div>
            <CardTitle>Tệp</CardTitle>
            <CardDescription class="mt-1">Văn bản QĐ chính + phụ lục.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <div v-if="d.files.length === 0" class="text-sm text-muted-foreground">Chưa có tệp.</div>
        <ul v-else class="space-y-2">
          <li
            v-for="f in d.files"
            :key="f.id"
            class="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <Badge :variant="f.kind === 'main' ? 'default' : 'secondary'" class="font-normal shrink-0">
              {{ f.kind === 'main' ? 'Văn bản QĐ' : 'Phụ lục' }}
            </Badge>
            <span class="flex-1 text-sm truncate">{{ f.filename }}</span>
            <span class="text-xs text-muted-foreground">{{ fmtSize(f.size) }}</span>
            <Badge v-if="f.has_text_layer === false" variant="outline" class="text-warning border-warning/40">
              Không có lớp chữ
            </Badge>
            <span v-if="f.codes_found" class="text-xs text-muted-foreground">
              · {{ f.codes_found }} mã
            </span>
            <Button variant="outline" size="sm" @click="downloadFile(f)">
              <Download class="size-3.5 mr-1" /> Tải
            </Button>
          </li>
        </ul>

        <div v-if="draft" class="flex items-center gap-2 pt-2 border-t">
          <Select v-model="fileKind">
            <SelectTrigger class="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Văn bản QĐ</SelectItem>
              <SelectItem value="annex">Phụ lục</SelectItem>
            </SelectContent>
          </Select>
          <input
            ref="fileInputRef"
            type="file"
            accept=".pdf,.docx"
            class="hidden"
            @change="onFilePicked"
          />
          <Button variant="outline" @click="pickFile">
            <FileText class="size-4 mr-1.5" />
            {{ uploadFile ? uploadFile.name : 'Chọn tệp (PDF / DOCX)' }}
          </Button>
          <Button :disabled="!uploadFile || uploading" @click="uploadDecisionFile">
            <Loader2 v-if="uploading" class="size-4 mr-2 animate-spin" />
            <Upload v-else class="size-4 mr-2" />
            Tải lên
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Link multiple TTHC -->
    <Card v-if="hasRole('editor') && !['superseded', 'cancelled'].includes(d.status)">
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LinkIcon class="size-5" />
          </div>
          <div>
            <CardTitle>Gắn QĐ cho nhiều TTHC</CardTitle>
            <CardDescription class="mt-1">
              2 bước: chọn nguồn → xem trước đối chiếu → chọn tính chất rồi xác nhận gắn.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-5">
        <!-- Step 1 -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">1</span>
            <h4 class="text-sm font-semibold">Chọn nguồn mã TTHC</h4>
            <span class="text-xs text-muted-foreground">(chọn 1 trong 3)</span>
          </div>

          <div class="grid md:grid-cols-3 gap-3">
            <label
              class="group space-y-2 rounded-md border p-3 cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-colors"
              :class="lk.batch ? 'border-primary bg-primary/5' : ''"
            >
              <span class="block text-xs font-medium text-muted-foreground select-none">A. Theo lô import</span>
              <Input v-model="lk.batch" type="number" min="1" placeholder="Số lô, vd. 3" />
              <span class="block text-xs text-muted-foreground select-none">Lấy tất cả TTHC trong 1 lô import.</span>
            </label>

            <label
              class="group space-y-2 rounded-md border p-3 cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-colors"
              :class="lk.codes ? 'border-primary bg-primary/5' : ''"
            >
              <span class="block text-xs font-medium text-muted-foreground select-none">B. Danh sách mã TTHC</span>
              <Textarea v-model="lk.codes" rows="2" placeholder="1.000000, 2.000123…" class="resize-none" />
              <span class="block text-xs text-muted-foreground select-none">Dán hoặc gõ mã, cách bởi dấu phẩy / xuống dòng.</span>
            </label>

            <div
              data-clickable
              class="space-y-2 rounded-md border p-3 hover:border-primary/60 hover:bg-accent/30 transition-colors select-none"
              :class="lk.from_annex ? 'border-primary bg-primary/5' : ''"
              @click="lk.from_annex = !lk.from_annex"
            >
              <span class="block text-xs font-medium text-muted-foreground">C. Từ phụ lục QĐ đã tải</span>
              <div class="flex items-center gap-2 h-9">
                <Checkbox
                  :model-value="lk.from_annex"
                  @update:model-value="lk.from_annex = $event === true"
                  @click.stop
                />
                <span class="text-sm">Lấy mã từ tệp phụ lục</span>
              </div>
              <span class="block text-xs text-muted-foreground">
                Cần đã upload tệp phụ lục ở mục "Tệp" phía trên.
              </span>
            </div>
          </div>

          <div class="flex justify-end">
            <Button
              :disabled="previewing || (!lk.batch && !lk.codes && !lk.from_annex)"
              @click="doPreview"
            >
              <Loader2 v-if="previewing" class="size-4 mr-2 animate-spin" />
              <Eye v-else class="size-4 mr-2" />
              Xem trước đối chiếu
            </Button>
          </div>
        </div>

        <!-- Empty preview hint -->
        <div v-if="!preview" class="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Chọn nguồn rồi bấm <strong>Xem trước đối chiếu</strong> để tiếp tục bước 2.
        </div>

        <!-- Step 2 -->
        <div v-if="preview" class="space-y-3 pt-4 border-t">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">2</span>
            <h4 class="text-sm font-semibold">Kiểm tra &amp; xác nhận gắn</h4>
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge
              v-for="(n, k) in preview.summary"
              :key="k"
              :variant="k === 'khop' ? 'default' : 'secondary'"
              :class="k === 'khop' ? 'bg-success text-success-foreground' : 'bg-warning/15 text-warning-foreground border-warning/30'"
              class="font-normal"
            >
              {{ MATCH[k] || k }}: {{ n }}
            </Badge>
          </div>

          <Alert v-if="preview.annex_warning" variant="default" class="border-warning/30 bg-warning/5">
            <AlertTriangle class="size-4 text-warning" />
            <AlertDescription>{{ preview.annex_warning }}</AlertDescription>
          </Alert>

          <div v-if="!preview.rows.length" class="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Không có TTHC nào trong nguồn đã chọn.
            <template v-if="lk.from_annex"> Kiểm tra tệp phụ lục đã upload có chứa mã TTHC chưa.</template>
            <template v-else-if="lk.batch"> Lô #{{ lk.batch }} có thể không tồn tại hoặc rỗng.</template>
          </div>

          <div v-else class="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-10">
                    <Checkbox :model-value="allRowsChecked" @update:model-value="toggleAllRows" />
                  </TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Phiên bản</TableHead>
                  <TableHead>Đối chiếu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(r, i) in preview.rows" :key="i">
                  <TableCell>
                    <Checkbox
                      v-if="r.selectable"
                      :model-value="selectedRows.has(i)"
                      @update:model-value="(v) => toggleRow(i, v)"
                    />
                  </TableCell>
                  <TableCell class="font-mono text-xs">{{ r.code }}</TableCell>
                  <TableCell class="text-sm">{{ r.name || '' }}</TableCell>
                  <TableCell class="text-sm">
                    <template v-if="r.version_no">
                      PB {{ r.version_no }} <AdminStatusBadge :status="r.version_status || ''" />
                    </template>
                    <template v-else>—</template>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap items-center gap-1">
                      <AdminStatusBadge
                        :status="r.match === 'khop' ? 'published' : 'needs_review'"
                        :label="MATCH[r.match] || r.match"
                      />
                      <span v-if="r.current_primary" class="text-xs text-muted-foreground">
                        {{ r.current_primary }}
                      </span>
                      <AdminStatusBadge v-if="r.is_public" status="published" label="Đang công khai" />
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <Label>Tính chất:</Label>
            <Select v-model="linkImpact">
              <SelectTrigger class="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cong_bo_moi">Ban hành mới</SelectItem>
                <SelectItem value="sua_doi_bo_sung">Sửa đổi, bổ sung</SelectItem>
                <SelectItem value="bai_bo">Bãi bỏ</SelectItem>
              </SelectContent>
            </Select>
            <Button
              :disabled="!selectedRows.size || applying"
              @click="applyConfirmOpen = true"
            >
              <Loader2 v-if="applying" class="size-4 mr-2 animate-spin" />
              Xác nhận gắn {{ selectedRows.size }} dòng
            </Button>
          </div>

          <div class="text-xs text-muted-foreground space-y-1 pt-2">
            <p><strong>Ban hành mới</strong>: TTHC mới nhập lần đầu; QĐ này là QĐ công bố.</p>
            <p><strong>Sửa đổi, bổ sung</strong>: thay QĐ công bố hiện hành. TTHC đang công khai sẽ tạm dừng và có bản nháp mới.</p>
            <p><strong>Bãi bỏ</strong>: TTHC đang công khai sẽ bị ngừng công khai ngay (nếu QĐ đã duyệt) hoặc khi QĐ được duyệt.</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Linked TTHCs -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Gavel class="size-5" />
          </div>
          <div>
            <CardTitle>TTHC đã liên kết</CardTitle>
            <CardDescription class="mt-1">{{ d.links?.length ?? 0 }} liên kết.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>PB</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Tính chất</TableHead>
                <TableHead>Liên kết</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead v-if="hasRole('editor')"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!d.links?.length">
                <TableCell :colspan="hasRole('editor') ? 7 : 6" class="text-center text-muted-foreground py-8">
                  Chưa có TTHC nào liên kết.
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="l in d.links" :key="l.id">
                <TableCell>
                  <NuxtLink :to="`/admin/v/${l.version_id}`" class="font-mono text-xs text-primary hover:underline">
                    {{ l.code }}
                  </NuxtLink>
                </TableCell>
                <TableCell class="text-sm">
                  PB {{ l.version_no }} <AdminStatusBadge :status="l.version_status" />
                </TableCell>
                <TableCell class="text-sm">
                  <Badge v-if="l.is_primary" variant="default" class="font-normal">QĐ chính</Badge>
                  <span v-else class="text-muted-foreground">Không phải QĐ chính</span>
                </TableCell>
                <TableCell>
                  <Select
                    v-if="hasRole('editor') && l.status !== 'rejected' && ['draft', 'rejected'].includes(l.version_status)"
                    :model-value="l.impact"
                    @update:model-value="(v) => changeImpact(l, v as string)"
                  >
                    <SelectTrigger class="w-[180px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cong_bo_moi">Ban hành mới</SelectItem>
                      <SelectItem value="sua_doi_bo_sung">Sửa đổi, bổ sung</SelectItem>
                      <SelectItem value="bai_bo">Bãi bỏ</SelectItem>
                      <SelectItem v-if="l.impact === 'thay_the'" value="thay_the">Thay thế</SelectItem>
                      <SelectItem v-if="l.impact === 'lien_quan'" value="lien_quan">Liên quan</SelectItem>
                    </SelectContent>
                  </Select>
                  <span v-else class="text-sm">{{ IMPACT[l.impact] }}</span>
                </TableCell>
                <TableCell><AdminStatusBadge :status="l.status" /></TableCell>
                <TableCell class="text-sm">
                  {{ l.source }}
                  <div v-if="l.note" class="text-xs text-muted-foreground">{{ l.note }}</div>
                </TableCell>
                <TableCell v-if="hasRole('editor')" class="text-right">
                  <Button
                    v-if="l.status !== 'rejected' && ['draft', 'rejected'].includes(l.version_status)"
                    variant="outline"
                    size="sm"
                    @click="unlink(l)"
                  >
                    Gỡ liên kết
                  </Button>
                  <span v-else class="text-xs text-muted-foreground">Chỉ sửa ở bản nháp</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Edit meta dialog -->
    <Dialog v-model:open="editOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Chỉnh sửa thông tin QĐ
            <span v-if="d.status === 'approved'" class="text-sm font-normal text-warning"> (đã duyệt)</span>
          </DialogTitle>
          <DialogDescription v-if="d.status === 'approved'" class="text-warning">
            QĐ đã duyệt: thay đổi hiển thị ngay cho công dân ở các TTHC đang công khai và được ghi nhật ký. Nếu nội dung thay đổi về bản chất, nên dùng "Tạo QĐ thay thế".
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveMeta" class="grid md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Số/ký hiệu</Label>
            <Input v-model="edit.number" required />
          </div>
          <div class="space-y-2">
            <Label>Cơ quan</Label>
            <Input v-model="edit.issuer" required />
          </div>
          <div class="space-y-2">
            <Label>Ngày ký</Label>
            <Input v-model="edit.signed_date" type="date" />
          </div>
          <div class="space-y-2">
            <Label>Ngày hiệu lực</Label>
            <Input v-model="edit.effective_from" type="date" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Trích yếu</Label>
            <Textarea v-model="edit.summary" rows="2" required />
          </div>
          <div class="space-y-2">
            <Label>Ghi chú hiệu lực</Label>
            <Input v-model="edit.effective_note" />
          </div>
          <div class="space-y-2">
            <Label>Ghi chú hết hiệu lực</Label>
            <Input v-model="edit.expiry_note" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Lý do chỉnh sửa</Label>
            <Input v-model="edit.reason" placeholder="Không bắt buộc" />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" @click="editOpen = false">Hủy</Button>
          <Button :disabled="saving" @click="saveMeta">
            <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Replace dialog -->
    <Dialog v-model:open="replaceOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo QĐ thay thế</DialogTitle>
          <DialogDescription>
            QĐ mới sẽ ở trạng thái nháp và liên kết tới QĐ #{{ d.id }}.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="createReplacement" class="grid md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Số/ký hiệu *</Label>
            <Input v-model="replaceForm.number" required />
          </div>
          <div class="space-y-2">
            <Label>Cơ quan *</Label>
            <Input v-model="replaceForm.issuer" required />
          </div>
          <div class="space-y-2">
            <Label>Ngày ký</Label>
            <Input v-model="replaceForm.signed_date" type="date" />
          </div>
          <div class="space-y-2">
            <Label>Ngày hiệu lực</Label>
            <Input v-model="replaceForm.effective_from" type="date" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Trích yếu *</Label>
            <Textarea v-model="replaceForm.summary" rows="2" required />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" @click="replaceOpen = false">Hủy</Button>
          <Button :disabled="working === 'replace'" @click="createReplacement">
            <Loader2 v-if="working === 'replace'" class="size-4 mr-2 animate-spin" />
            Tạo QĐ thay thế
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Approve confirm -->
    <Dialog v-model:open="approveOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Check class="size-5 text-success" />
            Duyệt QĐ {{ d.number }}
          </DialogTitle>
          <DialogDescription>
            Các TTHC bị QĐ bãi bỏ đang công khai sẽ tự động bị ngừng công khai.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="approveOpen = false">Hủy</Button>
          <Button @click="approve">Duyệt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Reject confirm -->
    <Dialog v-model:open="rejectOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <X class="size-5 text-destructive" />
            Trả lại QĐ về nháp
          </DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="rejectOpen = false">Hủy</Button>
          <Button variant="destructive" @click="reject">Trả lại</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete -->
    <Dialog v-model:open="deleteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="size-5 text-destructive" />
            Xóa QĐ {{ d.number }}
          </DialogTitle>
          <DialogDescription>
            Xóa cứng khỏi CSDL. Không xóa được nếu QĐ đang dùng cho TTHC đang công khai.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <Label>Lý do xóa (tùy chọn)</Label>
          <Input v-model="deleteReason" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deleteOpen = false">Hủy</Button>
          <Button variant="destructive" :disabled="working === 'delete'" @click="remove">
            <Loader2 v-if="working === 'delete'" class="size-4 mr-2 animate-spin" />
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Apply confirm -->
    <Dialog v-model:open="applyConfirmOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận gắn QĐ</DialogTitle>
          <DialogDescription class="whitespace-pre-line">{{ applyConfirmMsg }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="applyConfirmOpen = false">Hủy</Button>
          <Button @click="doApply">Xác nhận</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
