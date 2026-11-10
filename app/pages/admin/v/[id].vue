<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  ArrowLeft,
  Send,
  Check,
  X,
  Trash2,
  Copy,
  Download,
  Upload,
  Pencil,
  Loader2,
  AlertTriangle,
  Info,
  Link as LinkIcon,
  FileText,
  Eye,
  ChevronDown,
  Save,
  Ban,
  RefreshCw,
  Scissors,
  Plus,
  FileType,
  Search,
  Filter,
  Palette,
  ChevronsUpDown,
  CircleCheckBig,
  ChevronsDown,
  ChevronsUp,
  ListTree,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

const IMPACT: Record<string, string> = {
  cong_bo_moi: 'Ban hành mới',
  sua_doi_bo_sung: 'Sửa đổi, bổ sung',
  thay_the: 'Thay thế',
  bai_bo: 'Bãi bỏ',
  lien_quan: 'Liên quan',
}
const FORM_TYPE: Record<string, string> = {
  application: 'Mẫu người nộp',
  result: 'Mẫu kết quả',
  unclassified: 'Chưa phân loại',
}

interface FieldContent {
  value?: string
  source?: 'trich_word' | 'bien_tap_thu_cong' | string
  source_blocks?: [number, number] | null
  layout?: { tree?: any; heads?: any[]; hl?: any[]; range?: [number, number] } | null
}
interface FieldExtraction {
  raw_text?: string
  evidence?: { block_start?: number; block_end?: number } | Array<{ block_index?: number }>
}
interface FormRow {
  id: number
  title: string
  label: string
  label_key: string
  form_type: string
  review_status: string
  block_start?: number | null
  block_end?: number | null
  validation?: { ok: boolean } | null
  normalizations?: string[]
}
interface WarningRow {
  index: number
  severity: 'error' | 'warning' | 'info' | string
  code: string
  message: string
  resolution?: { note: string; by: string } | null
}
interface DecisionLinkRow {
  id: number
  decision_id: number
  number: string
  decision_status: string
  impact: string
  is_primary: boolean
  status: string
}
interface VersionDto {
  id: number
  code: string
  name: string
  version_no: number
  status: string
  editable: boolean
  amendable?: boolean
  source?: { id: number; filename: string; sha256: string } | null
  created_by: string
  submitted_by?: string | null
  review_note?: string | null
  content: { fields: Record<string, FieldContent> }
  extraction: { fields: Record<string, FieldExtraction> }
  field_titles: Record<string, string>
  forms: FormRow[]
  warnings: WarningRow[]
  decision_links: DecisionLinkRow[]
  versions: Array<{ id: number; version_no: number; status: string }>
  publish_blockers?: string[]
  content_blockers?: string[]
}
interface Sector { id: number; name: string; is_active: boolean }

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { api, download } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()
const { confirm } = useConfirm()

const { data, pending, refresh, error } = await useAsyncData(
  () => `admin-version-${id.value}`,
  async () => {
    const [v, sectors] = await Promise.all([
      api<VersionDto>('GET', `/api/admin/versions/${id.value}`),
      api<Sector[]>('GET', '/api/admin/config/sectors').catch(() => [] as Sector[]),
    ])
    return { v, sectors }
  },
  { watch: [id] },
)
const v = computed(() => data.value?.v ?? null)
const activeSectors = computed(() => (data.value?.sectors ?? []).filter((s) => s.is_active))

// Word gốc preview
const srcHtml = ref('')
const srcLoading = ref(false)
const srcError = ref('')
const wordRef = ref<InstanceType<typeof import('@/components/admin/WordViewer.vue').default> | null>(null)

async function loadSource() {
  if (!v.value) return
  srcLoading.value = true
  srcError.value = ''
  try {
    const r = await api<{ html: string }>('GET', `/api/admin/versions/${v.value.id}/source-preview`)
    srcHtml.value = r.html
  } catch (e: any) {
    srcError.value = e?.message ?? 'Không tải được Word gốc'
  } finally {
    srcLoading.value = false
  }
}

// Chỉ load ở client — SSR không có DOM để render block
onMounted(() => { if (v.value) loadSource() })
watch(() => v.value?.id, (id) => { if (id) loadSource() })

// Field ranges derived from content + extraction
interface RangeInfo { s: number; e: number; n: number; manual: boolean }
const fieldRanges = ref<Record<string, RangeInfo>>({})
const formRanges = ref<Record<string, { s: number; e: number; n: number; label: string }>>({})

function evidenceRange(ex?: FieldExtraction): [number, number] | null {
  if (!ex?.evidence) return null
  const e: any = ex.evidence
  if (e.block_start !== undefined) return [e.block_start, e.block_end]
  if (Array.isArray(e)) {
    const ix = e.map((x) => x.block_index).filter((x) => x !== undefined) as number[]
    if (ix.length) return [Math.min(...ix), Math.max(...ix)]
  }
  return null
}

function computeRanges() {
  if (!v.value) return
  const fRanges: Record<string, RangeInfo> = {}
  Object.keys(v.value.field_titles).forEach((k, n) => {
    const f = v.value!.content.fields?.[k] ?? {}
    const srcF = v.value!.extraction.fields?.[k]
    const sb = f.source_blocks
    const rg = sb && sb.length === 2 ? [sb[0], sb[1]] : evidenceRange(srcF)
    if (rg) fRanges[k] = { s: rg[0], e: rg[1], n: n % 8, manual: !!(sb && sb.length === 2) }
  })
  fieldRanges.value = fRanges
  const fmRanges: Record<string, any> = {}
  v.value.forms.forEach((f, n) => {
    if (f.block_start != null && f.block_end != null) {
      fmRanges[f.id] = { s: f.block_start, e: f.block_end, n: n % 6, label: f.title || f.label }
    }
  })
  formRanges.value = fmRanges
}

watch(() => v.value, () => computeRanges(), { immediate: true })

// Props passed to <AdminWordViewer :fields :forms> — auto repaint via its watcher
const wordFields = computed(() =>
  Object.fromEntries(Object.entries(fieldRanges.value).map(([k, r]) => [k, { s: r.s, e: r.e, n: r.n }])),
)

// Field expand/collapse state
const openFields = ref<Set<string>>(new Set())
function toggleField(k: string): 'opened' | 'closed' {
  const s = new Set(openFields.value)
  const willOpen = !s.has(k)
  if (willOpen) s.add(k)
  else s.delete(k)
  openFields.value = s
  return willOpen ? 'opened' : 'closed'
}

/** Click field title bên trái: chỉ scroll Word khi MỞ (giống code gốc check !d.open). */
function onFieldClick(k: string) {
  const state = toggleField(k)
  if (state === 'opened') {
    const r = fieldRanges.value[k]
    if (r) wordRef.value?.highlight(r.s, r.e)
    else wordRef.value?.clearHighlight()
  }
}

/** Click block Word bên phải: mở field + tô vùng + scroll trang 'nearest' (không nhảy nếu field đã trong viewport). */
function onBlockClick(idx: number) {
  for (const [k, r] of Object.entries(fieldRanges.value)) {
    if (idx >= r.s && idx <= r.e) {
      openFields.value = new Set([...openFields.value, k])
      wordRef.value?.markHighlight(r.s, r.e)
      nextTick(() => {
        document.querySelector(`[data-field-key="${k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      return
    }
  }
}

function focusField(k: string) {
  const r = fieldRanges.value[k]
  if (r) wordRef.value?.highlight(r.s, r.e)
  else wordRef.value?.clearHighlight()
}

// Permissions
const canEdit = computed(() => !!v.value?.editable && hasRole('editor'))
const amendable = computed(() => !!v.value?.amendable)

// In-place edit (sửa trực tiếp bản công khai)
const inplaceReason = useLocalStorage<Record<number, string>>('admin:inplace-reasons', {})
const editingInPlace = computed(() => amendable.value && !!v.value && !!inplaceReason.value[v.value.id])
const canChange = computed(() => canEdit.value || editingInPlace.value)

const inplaceOpen = ref(false)
const inplaceReasonInput = ref('')

function openInPlace() {
  inplaceReasonInput.value = ''
  inplaceOpen.value = true
}
function confirmInPlace() {
  if (!v.value || !inplaceReasonInput.value.trim()) return
  inplaceReason.value = { ...inplaceReason.value, [v.value.id]: inplaceReasonInput.value.trim() }
  inplaceOpen.value = false
}
function exitInPlace() {
  if (!v.value) return
  const next = { ...inplaceReason.value }
  delete next[v.value.id]
  inplaceReason.value = next
}

// Field text edit
const editValue = ref<Record<string, string>>({})
const editReason = ref<Record<string, string>>({})
const editingKey = ref<string | null>(null)
const savingKey = ref<string | null>(null)

function startEdit(k: string) {
  editValue.value[k] = v.value?.content.fields?.[k]?.value ?? ''
  editReason.value[k] = ''
  editingKey.value = k
}
function cancelEdit() { editingKey.value = null }

async function saveField(k: string) {
  if (!v.value) return
  const pub = editingInPlace.value
  if (pub && !(await confirm({
    title: 'Lưu thay đổi ngay trên bản đang công khai?',
    description: 'Công dân sẽ thấy nội dung mới ngay.',
    confirmText: 'Lưu & công khai',
    variant: 'warning',
  }))) return
  savingKey.value = k
  const opened = new Set(openFields.value)
  try {
    const reason = editReason.value[k]?.trim() || (pub ? inplaceReason.value[v.value.id] : '')
    await api('PUT', `/api/admin/versions/${v.value.id}/fields/${k}/text`, {
      value: editValue.value[k],
      reason,
    })
    toast.ok(pub ? 'Đã lưu và cập nhật trang công dân' : 'Đã lưu vào bản nháp')
    editingKey.value = null
    await refresh()
    // Không reload source — Word gốc bất biến, chỉ text field thay đổi
    await nextTick()
    openFields.value = opened
    await nextTick()
    // Scroll tới đúng field vừa sửa (bền hơn snapshot scrollY vì layout đổi sau refresh)
    document.querySelector(`[data-field-key="${k}"]`)?.scrollIntoView({
      behavior: 'instant' as ScrollBehavior,
      block: 'center',
    })
  } catch (e: any) {
    toast.err(e?.message ?? 'Lưu thất bại')
  } finally {
    savingKey.value = null
  }
}

// Sector field uses select — reka-ui không cho SelectItem value="" nên dùng sentinel
const SECTOR_NONE = '__none__'

async function saveSector(k: string, value: string) {
  if (!v.value) return
  const pub = editingInPlace.value
  savingKey.value = k
  try {
    const reason = pub ? inplaceReason.value[v.value.id] : ''
    const realValue = value === SECTOR_NONE ? '' : value
    await api('PUT', `/api/admin/versions/${v.value.id}/fields/${k}/text`, { value: realValue, reason })
    toast.ok('Đã lưu lĩnh vực')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Lưu thất bại')
  } finally {
    savingKey.value = null
  }
}

// Workflow actions
const working = ref<string | null>(null)
const submitOpen = ref(false)
const approveOpen = ref(false)
const rejectOpen = ref(false)
const withdrawOpen = ref(false)
const deleteOpen = ref(false)
const deleteReason = ref('')

async function act(name: 'submit' | 'approve' | 'reject' | 'withdraw' | 'new-draft') {
  if (!v.value) return
  working.value = name
  try {
    const url = `/api/admin/versions/${v.value.id}/${name}`
    const r = await api<any>('POST', url, {})
    const map: Record<string, string> = {
      submit: 'Đã gửi duyệt',
      approve: 'Đã công khai',
      reject: 'Đã trả lại',
      withdraw: 'Đã ngừng công khai',
      'new-draft': '',
    }
    if (name === 'new-draft' && r?.id) {
      await navigateTo(`/admin/v/${r.id}`)
      return
    }
    toast.ok(map[name])
    submitOpen.value = approveOpen.value = rejectOpen.value = withdrawOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? `${name} thất bại`)
  } finally {
    working.value = null
  }
}

async function deleteVersion() {
  if (!v.value) return
  working.value = 'delete'
  try {
    const r = await api<{ deleted: any[]; skipped: any[] }>(
      'POST',
      '/api/admin/versions/delete',
      { version_ids: [v.value.id], reason: deleteReason.value || ' ' },
    )
    deleteOpen.value = false
    if (r.deleted.length) {
      toast.ok('Đã xóa phiên bản')
      await navigateTo('/admin')
    } else {
      toast.err('Không xóa được: ' + (r.skipped[0]?.reason ?? 'Không rõ'))
    }
  } catch (e: any) {
    toast.err(e?.message ?? 'Xóa thất bại')
  } finally {
    working.value = null
  }
}

// Replace Word
const replaceInputRef = ref<HTMLInputElement | null>(null)
async function onReplaceFile(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (!files?.[0] || !v.value) return
  const ok = await confirm({
    title: `Thay file Word cho ${v.value.code}?`,
    description: 'Tạo bản nháp mới, bản công khai giữ nguyên.',
    confirmText: 'Thay file',
    variant: 'warning',
  })
  if (!ok) {
    (ev.target as HTMLInputElement).value = ''
    return
  }
  working.value = 'replace-word'
  try {
    const fd = new FormData()
    fd.append('file', files[0])
    const b = await api<{ items: Array<{ version_id?: number; status: string; error?: string }> }>(
      'POST',
      `/api/admin/procedures/${encodeURIComponent(v.value.code)}/replace-word`,
      fd,
    )
    const it = b.items[0]
    if (it.version_id && !['failed', 'duplicate'].includes(it.status)) {
      toast.ok('Đã tạo bản nháp mới từ Word vừa tải')
      await navigateTo(`/admin/v/${it.version_id}`)
    } else {
      toast.err(it.error ?? 'Không thành công')
    }
  } catch (e: any) {
    toast.err(e?.message ?? 'Thay Word thất bại')
  } finally {
    working.value = null
    ;(ev.target as HTMLInputElement).value = ''
  }
}

// Warning resolve
async function resolveWarning(idx: number) {
  if (!v.value) return
  if (!(await confirm({
    title: 'Ghi nhận đã xử lý cảnh báo?',
    description: 'Cảnh báo gốc vẫn được giữ lại trong hồ sơ.',
    confirmText: 'Đã xử lý',
  }))) return
  try {
    await api('POST', `/api/admin/versions/${v.value.id}/warnings/${idx}/resolve`, {})
    toast.ok('Đã ghi nhận')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thất bại')
  }
}

// Forms management
async function renameForm(form: FormRow, title: string) {
  if (!title.trim()) {
    toast.err('Tên biểu mẫu không được trống')
    await refresh()
    return
  }
  try {
    await api('POST', `/api/admin/forms/${form.id}/rename`, { title })
    toast.ok('Đã đổi tên')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thất bại')
  }
}

async function changeFormType(form: FormRow, form_type: string) {
  try {
    await api('POST', `/api/admin/forms/${form.id}/type`, { form_type, reason: 'Đổi nhóm khi rà soát' })
    toast.ok('Đã đổi nhóm')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thất bại')
  }
}

async function deleteForm(form: FormRow) {
  if (!(await confirm({
    title: 'Xóa biểu mẫu?',
    description: 'Xóa hoàn toàn khỏi thủ tục. Không thể khôi phục.',
    confirmText: 'Xóa',
    variant: 'destructive',
  }))) return
  try {
    const q = editingInPlace.value && v.value
      ? `?reason=${encodeURIComponent(inplaceReason.value[v.value.id] || '')}`
      : ''
    await api('DELETE', `/api/admin/forms/${form.id}${q}`)
    toast.ok('Đã xóa biểu mẫu')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thất bại')
  }
}

function downloadForm(form: FormRow) {
  if (!v.value) return
  const name = `${v.value.code}_${form.label_key.replace(':', '_')}.docx`
  download(`/api/admin/forms/${form.id}/download`, 'NHAP_' + name)
}

function downloadSource() {
  if (!v.value?.source) return
  download(`/api/admin/source-documents/${v.value.source.id}/download`, v.value.source.filename)
}

// --- Cutter (field-boundary + form-boundary + form-add) ---
const cutterOpen = ref(false)
const cutterOpts = ref<{
  title: string
  withLabel: boolean
  formId: number | null
  start?: number
  end?: number
  onSave: (s: number, e: number, extra?: { label: string; form_type: string }) => Promise<boolean>
} | null>(null)

function openFieldCutter(k: string) {
  if (!v.value) return
  const vid = v.value.id
  const r = fieldRanges.value[k]
  cutterOpts.value = {
    title: `Chọn vùng nội dung cho "${v.value.field_titles[k]}"`,
    withLabel: false,
    formId: null,
    start: r?.s,
    end: r?.e,
    onSave: async (s, e) => {
      try {
        await api('PUT', `/api/admin/versions/${vid}/fields/${k}`, {
          reason: inplaceReason.value[vid] || '',
          evidence_note: `Chọn từ khối ${s}–${e} của Word gốc`,
          block_start: s,
          block_end: e,
        })
        toast.ok('Đã lấy nội dung từ vùng đã chọn vào bản nháp')
        await refresh()
        await loadSource()
        return true
      } catch (err: any) {
        toast.err(err?.message ?? 'Lưu thất bại')
        return false
      }
    },
  }
  cutterOpen.value = true
}

function openFormCutter(form: FormRow) {
  if (!v.value) return
  cutterOpts.value = {
    title: `Chỉnh ranh giới biểu mẫu: ${form.title || form.label}`,
    withLabel: false,
    formId: form.id,
    start: form.block_start ?? undefined,
    end: form.block_end ?? undefined,
    onSave: async (s, e) => {
      try {
        await api('POST', `/api/admin/forms/${form.id}/boundary`, { block_start: s, block_end: e })
        toast.ok('Đã cắt và lưu biểu mẫu')
        await refresh()
        return true
      } catch (err: any) {
        toast.err(err?.message ?? 'Lưu thất bại')
        return false
      }
    },
  }
  cutterOpen.value = true
}

function openFormAddCutter() {
  if (!v.value) return
  const vid = v.value.id
  const isInPlace = editingInPlace.value
  cutterOpts.value = {
    title: isInPlace ? 'Thêm biểu mẫu mới' : 'Tách thêm biểu mẫu bị sót',
    withLabel: true,
    formId: null,
    onSave: async (s, e, extra) => {
      try {
        await api('POST', `/api/admin/versions/${vid}/forms`, {
          block_start: s,
          block_end: e,
          label: extra?.label || '',
          form_type: extra?.form_type || 'unclassified',
          reason: isInPlace ? inplaceReason.value[vid] || '' : '',
        })
        toast.ok('Đã tách thêm biểu mẫu')
        await refresh()
        return true
      } catch (err: any) {
        toast.err(err?.message ?? 'Lưu thất bại')
        return false
      }
    },
  }
  cutterOpen.value = true
}

// --- Form preview ---
const formPreviewId = ref<number | null>(null)
const formPreviewOpen = ref(false)
function openFormPreview(f: FormRow) {
  formPreviewId.value = f.id
  formPreviewOpen.value = true
}

// --- Sticky action bar khi scroll xuống xa khỏi header ---
const showStickyActions = ref(false)
const hasQuickActions = computed(() => {
  if (!v.value) return false
  if (canEdit.value) return true
  if (hasRole('approver') && v.value.status === 'pending_approval') return true
  if (hasRole('approver') && v.value.status === 'published') return true
  return false
})
function onScroll() {
  showStickyActions.value = window.scrollY > 400
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
if (import.meta.client) {
  useEventListener(window, 'scroll', onScroll, { passive: true })
}

// --- Field filter + search ---
const fieldSearch = ref('')
const fieldFilter = ref<'all' | 'no_source' | 'manual' | 'has_warning'>('all')

const warningsByField = computed(() => {
  // Backend chỉ trả warnings level toàn version, không gắn field — ở đây ước chừng theo code
  // vd. code chứa tên field. Nếu không khớp, bỏ qua filter.
  const map: Record<string, number> = {}
  for (const w of v.value?.warnings ?? []) {
    const code = (w.code || '').toLowerCase()
    for (const k of Object.keys(v.value?.field_titles ?? {})) {
      if (code.includes(k.toLowerCase())) map[k] = (map[k] || 0) + 1
    }
  }
  return map
})

const filteredFieldKeys = computed(() => {
  if (!v.value) return []
  const keys = Object.keys(v.value.field_titles)
  const q = fieldSearch.value.trim().toLowerCase()
  return keys.filter((k) => {
    const title = (v.value!.field_titles[k] || '').toLowerCase()
    if (q && !title.includes(q) && !k.toLowerCase().includes(q)) return false
    const f = v.value!.content.fields?.[k] ?? {}
    if (fieldFilter.value === 'no_source' && f.source) return false
    if (fieldFilter.value === 'manual' && f.source !== 'bien_tap_thu_cong') return false
    if (fieldFilter.value === 'has_warning' && !warningsByField.value[k]) return false
    return true
  })
})

const completeness = computed(() => {
  if (!v.value) return { done: 0, total: 0 }
  const keys = Object.keys(v.value.field_titles)
  const done = keys.filter((k) => !!v.value!.content.fields?.[k]?.source).length
  return { done, total: keys.length }
})

function expandAll() {
  openFields.value = new Set(filteredFieldKeys.value)
}
function collapseAll() {
  openFields.value = new Set()
}

// --- Show/hide WordViewer colors ---
const showHighlights = useLocalStorage('word-viewer:highlights', true)
const effectiveWordFields = computed(() => showHighlights.value ? wordFields.value : {})
const effectiveWordForms = computed(() => showHighlights.value ? formRanges.value : {})

// --- Dirty state (chặn navigate khi textarea đang edit chưa save) ---
const dirty = computed(() => editingKey.value !== null)

if (import.meta.client) {
  useEventListener(window, 'beforeunload', (e: BeforeUnloadEvent) => {
    if (dirty.value) { e.preventDefault(); e.returnValue = '' }
  })
}

const routerForLeave = useRouter()
const leaveOpen = ref(false)
const pendingTo = ref<string | null>(null)

onMounted(() => {
  const remove = routerForLeave.beforeEach((to, from, next) => {
    if (from.path.startsWith('/admin/v/') && to.path !== from.path && dirty.value && !pendingTo.value) {
      pendingTo.value = to.fullPath
      leaveOpen.value = true
      next(false)
    } else {
      next()
    }
  })
  onBeforeUnmount(remove)
})

async function confirmLeave() {
  const to = pendingTo.value
  leaveOpen.value = false
  pendingTo.value = null
  editingKey.value = null
  if (to) await routerForLeave.push(to)
}
function cancelLeave() {
  leaveOpen.value = false
  pendingTo.value = null
}

// --- Layout editor (dựng danh sách thả xuống) ---
const layoutOpen = ref(false)
const layoutOpts = ref<{
  fieldKey: string
  fieldTitle: string
  start: number
  end: number
  heads: Array<{ b: number; l: number }>
  hl: number[]
} | null>(null)

function openLayoutEditor(k: string) {
  if (!v.value) return
  const r = fieldRanges.value[k]
  if (!r) {
    toast.err('Trường chưa có vùng nội dung; bấm "Chọn vùng từ Word gốc" trước.')
    return
  }
  const f = v.value.content.fields?.[k]
  const layout = f?.layout
  const same = layout?.range && layout.range[0] === r.s && layout.range[1] === r.e
  layoutOpts.value = {
    fieldKey: k,
    fieldTitle: v.value.field_titles[k],
    start: r.s,
    end: r.e,
    heads: same ? (layout.heads as any) || [] : [],
    hl: same ? (layout.hl as any) || [] : [],
  }
  layoutOpen.value = true
}

// --- Docx preview (Xem bản dựng đẹp) ---
const docxPreviewOpen = ref(false)
const docxPreviewUrl = computed(() =>
  v.value?.source ? `/api/admin/source-documents/${v.value.source.id}/download` : null,
)
const docxPreviewFilename = computed(() => v.value?.source?.filename || '')

// --- AI viewer ---
const aiViewerOpen = ref(false)
const aiViewerRunId = ref<number | null>(null)
function openAiViewer(runId: number) {
  aiViewerRunId.value = runId
  aiViewerOpen.value = true
}

// Decision link unlink
async function unlinkDecision(link: DecisionLinkRow) {
  if (!(await confirm({
    title: `Gỡ liên kết QĐ ${link.number}?`,
    description: 'Phiên bản này sẽ không còn gắn với QĐ này nữa.',
    confirmText: 'Gỡ liên kết',
    variant: 'warning',
  }))) return
  try {
    await api('POST', `/api/admin/decisions/links/${link.id}/remove`, {})
    toast.ok('Đã gỡ liên kết')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thất bại')
  }
}

// CÙNG CÔNG THỨC VỚI WordViewer.outlineFor() để dot và block khớp màu
const FIELD_HUES = [258, 150, 40, 320, 180, 60, 280, 110]
function fieldDotColor(n: number) {
  return `oklch(0.55 0.22 ${FIELD_HUES[n % 8]})`
}

function versionsByDesc(vs: any[]) {
  return [...vs].sort((a, b) => b.version_no - a.version_no)
}

function sourceLabel(s?: string) {
  if (s === 'bien_tap_thu_cong') return 'Biên tập thủ công'
  if (s === 'trich_word') return 'Trích Word'
  return 'Chưa có'
}
function sourceVariant(s?: string): 'default' | 'secondary' | 'outline' {
  if (s === 'bien_tap_thu_cong') return 'default'
  if (s === 'trich_word') return 'secondary'
  return 'outline'
}
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <Skeleton class="h-10 w-80" />
    <Skeleton class="h-40 w-full" />
  </div>

  <div v-else-if="error">
    <NuxtLink to="/admin">
      <Button variant="ghost" size="sm" class="mb-4"><ArrowLeft class="size-4 mr-1" /> Danh sách TTHC</Button>
    </NuxtLink>
    <Alert variant="destructive">
      <AlertTitle>Không tải được phiên bản</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>
  </div>

  <div v-else-if="v" class="space-y-6">
    <NuxtLink to="/admin">
      <Button variant="ghost" size="sm" class="-ml-2"><ArrowLeft class="size-4 mr-1" /> Danh sách TTHC</Button>
    </NuxtLink>

    <!-- Header -->
    <Card>
      <CardContent class="pt-6 space-y-4">
        <div>
          <div class="flex items-center gap-3 flex-wrap mb-2">
            <span class="font-mono text-sm text-muted-foreground">{{ v.code }}</span>
            <h1 class="text-xl font-semibold tracking-tight">{{ v.name }}</h1>
            <Badge variant="outline" class="font-mono">PB {{ v.version_no }}</Badge>
            <AdminStatusBadge :status="v.status" />
          </div>
          <p class="text-sm text-muted-foreground">
            Nguồn: {{ v.source?.filename || '—' }}
            <template v-if="v.source"> · SHA256 <code class="font-mono text-xs">{{ v.source.sha256.slice(0, 12) }}…</code></template>
            · tạo bởi {{ v.created_by }}
            <template v-if="v.submitted_by"> · gửi duyệt: {{ v.submitted_by }}</template>
            <template v-if="v.review_note"> · ghi chú duyệt: {{ v.review_note }}</template>
          </p>
        </div>

        <Alert v-if="editingInPlace" variant="default" class="border-warning/40 bg-warning/5">
          <AlertTriangle class="size-4 text-warning" />
          <AlertTitle>Chế độ chỉnh sửa tại chỗ</AlertTitle>
          <AlertDescription>
            Lý do: <strong>{{ inplaceReason[v.id] }}</strong>. Mỗi lần lưu có hiệu lực NGAY với công dân, không tạo phiên bản mới, được ghi nhật ký.
          </AlertDescription>
        </Alert>

        <Alert v-if="(v.publish_blockers || v.content_blockers || []).length" variant="destructive">
          <AlertTitle>Chưa đủ điều kiện {{ v.publish_blockers ? 'duyệt công khai' : 'gửi duyệt' }}</AlertTitle>
          <AlertDescription>
            <ul class="list-disc pl-5 mt-1 space-y-0.5">
              <li v-for="b in (v.publish_blockers || v.content_blockers || [])" :key="b">{{ b }}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <!-- Progress completeness -->
        <div class="pt-2 border-t">
          <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span class="flex items-center gap-1.5">
              <CircleCheckBig class="size-3.5 text-success" />
              <strong class="text-foreground">{{ completeness.done }}</strong>/{{ completeness.total }} trường đã có nguồn
            </span>
            <span>{{ Math.round((completeness.done / Math.max(1, completeness.total)) * 100) }}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full bg-success transition-[width] duration-500"
              :style="{ width: (completeness.done / Math.max(1, completeness.total) * 100) + '%' }"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-wrap pt-2 border-t">
          <Button v-if="amendable && !editingInPlace" variant="outline" @click="openInPlace">
            <Pencil class="size-4 mr-2" /> Chỉnh sửa tại phiên bản này
          </Button>
          <Button v-if="editingInPlace" variant="outline" @click="exitInPlace">
            <X class="size-4 mr-2" /> Thoát chế độ chỉnh sửa
          </Button>
          <Button v-if="canEdit" :disabled="working === 'submit'" @click="submitOpen = true">
            <Send class="size-4 mr-2" /> Gửi duyệt
          </Button>
          <Button v-if="hasRole('editor') && ['published','superseded','withdrawn'].includes(v.status)" variant="outline" @click="act('new-draft')">
            <Copy class="size-4 mr-2" /> Tạo bản nháp mới
          </Button>
          <template v-if="hasRole('editor') && v.status !== 'pending_approval'">
            <input ref="replaceInputRef" type="file" accept=".docx" class="hidden" @change="onReplaceFile" />
            <Button variant="outline" :disabled="working === 'replace-word'" @click="replaceInputRef?.click()">
              <RefreshCw class="size-4 mr-2" /> Thay file Word
            </Button>
          </template>
          <template v-if="hasRole('approver') && v.status === 'pending_approval'">
            <Button @click="approveOpen = true"><Check class="size-4 mr-2" /> Duyệt công khai</Button>
            <Button variant="outline" @click="rejectOpen = true"><X class="size-4 mr-2" /> Trả lại</Button>
          </template>
          <Button v-if="hasRole('approver') && v.status === 'published'" variant="outline" class="text-destructive hover:text-destructive" @click="withdrawOpen = true">
            <Ban class="size-4 mr-2" /> Ngừng công khai
          </Button>
          <div class="flex-1"></div>
          <Button v-if="(hasRole('editor') || hasRole('approver')) && v.status !== 'pending_approval'" variant="destructive" @click="deleteOpen = true">
            <Trash2 class="size-4 mr-2" /> Xóa phiên bản
          </Button>
        </div>

        <!-- Version switcher + source download -->
        <div class="flex items-center gap-2 flex-wrap pt-2 border-t">
          <Label class="text-xs text-muted-foreground">Phiên bản khác:</Label>
          <Select :model-value="String(v.id)" @update:model-value="(val) => val && navigateTo(`/admin/v/${val}`)">
            <SelectTrigger class="w-[260px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="(x, i) in versionsByDesc(v.versions)" :key="x.id" :value="String(x.id)">
                PB {{ x.version_no }}{{ i === 0 ? ' (mới nhất)' : '' }} — {{ STATUS_LABEL[x.status] || x.status }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button v-if="v.source" variant="outline" size="sm" @click="downloadSource">
            <Download class="size-3.5 mr-1" /> Tải Word gốc
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Sticky action bar nhỏ gọn ở góc phải dưới, mặc định thu lại chỉ 1 nút "Lên đầu" -->
    <Transition name="slide-up">
      <div
        v-show="showStickyActions"
        class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 group"
      >
        <!-- Action pills expand khi hover -->
        <div
          v-if="hasQuickActions"
          class="rounded-full border bg-background/95 backdrop-blur shadow-lg flex items-center p-1 gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
        >
          <Button v-if="canEdit" size="icon" class="size-8 rounded-full" title="Gửi duyệt" @click="submitOpen = true">
            <Send class="size-3.5" />
          </Button>
          <template v-if="hasRole('approver') && v.status === 'pending_approval'">
            <Button size="icon" class="size-8 rounded-full" title="Duyệt công khai" @click="approveOpen = true">
              <Check class="size-3.5" />
            </Button>
            <Button size="icon" variant="outline" class="size-8 rounded-full" title="Trả lại" @click="rejectOpen = true">
              <X class="size-3.5" />
            </Button>
          </template>
          <Button
            v-if="hasRole('approver') && v.status === 'published'"
            size="icon" variant="outline" class="size-8 rounded-full text-destructive"
            title="Ngừng công khai"
            @click="withdrawOpen = true"
          >
            <Ban class="size-3.5" />
          </Button>
        </div>
        <!-- Nút "Lên đầu" luôn hiện, nhỏ -->
        <Button
          size="icon"
          variant="outline"
          class="size-9 rounded-full shadow-md bg-background/95 backdrop-blur"
          title="Lên đầu trang"
          @click="scrollToTop"
        >
          <ChevronsUp class="size-4" />
        </Button>
      </div>
    </Transition>

    <!-- AI Panel (chỉ hiện với bản nháp / rejected) -->
    <AdminAiPanel v-if="canEdit" :version-id="v.id" :can-use="canEdit" @open-viewer="openAiViewer" />

    <!-- Quyết định đã gắn -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2"><LinkIcon class="size-4" /> Quyết định công bố</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="!v.decision_links.length" class="text-sm text-muted-foreground">
          Chưa gắn QĐ nào. Gắn tại trang <NuxtLink to="/admin/qd" class="text-primary hover:underline">Quyết định công bố</NuxtLink>.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="l in v.decision_links"
            :key="l.id"
            class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <Badge :variant="l.is_primary ? 'default' : 'secondary'" class="font-normal">
              {{ l.is_primary ? 'QĐ chính' : 'Liên quan' }}
            </Badge>
            <NuxtLink :to="`/admin/d/${l.decision_id}`" class="text-primary hover:underline font-medium">
              {{ l.number }}
            </NuxtLink>
            <AdminStatusBadge :status="l.decision_status" />
            <span class="text-muted-foreground">· {{ IMPACT[l.impact] }}</span>
            <div class="flex-1"></div>
            <Button
              v-if="canEdit && l.status !== 'rejected'"
              variant="outline"
              size="sm"
              @click="unlinkDecision(l)"
            >Gỡ</Button>
          </li>
        </ul>
      </CardContent>
    </Card>

    <!-- Cảnh báo -->
    <Card v-if="v.warnings.length">
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2">
          <AlertTriangle class="size-4 text-warning" /> Cảnh báo nguồn ({{ v.warnings.length }})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="space-y-2 text-sm">
          <li
            v-for="w in v.warnings"
            :key="w.index"
            class="flex items-start gap-2 rounded-md border px-3 py-2"
          >
            <AdminStatusBadge
              :status="w.severity === 'error' ? 'rejected' : w.severity === 'warning' ? 'needs_review' : 'draft'"
              :label="w.severity"
            />
            <div class="flex-1 min-w-0">
              <code class="text-xs text-muted-foreground">{{ w.code }}</code>
              <p>{{ w.message }}</p>
              <p v-if="w.resolution" class="text-xs mt-1">
                <AdminStatusBadge status="published" label="Đã xử lý" />
                <span class="text-muted-foreground"> {{ w.resolution.note }} — {{ w.resolution.by }}</span>
              </p>
            </div>
            <Button
              v-if="canEdit && w.severity !== 'info' && !w.resolution"
              variant="outline"
              size="sm"
              @click="resolveWarning(w.index)"
            >Ghi nhận đã xử lý</Button>
          </li>
        </ul>
      </CardContent>
    </Card>

    <!-- Biểu mẫu tách riêng -->
    <Card>
      <CardHeader class="pb-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle class="text-base flex items-center gap-2"><FileText class="size-4" /> Biểu mẫu tách riêng ({{ v.forms.length }})</CardTitle>
          <Button
            v-if="canEdit || editingInPlace"
            variant="outline"
            size="sm"
            @click="openFormAddCutter"
          >
            <Plus class="size-4 mr-1" />
            {{ editingInPlace ? 'Thêm biểu mẫu' : 'Tách thêm mẫu bị sót' }}
          </Button>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <Table v-if="v.forms.length">
          <TableHeader>
            <TableRow>
              <TableHead>Tên biểu mẫu</TableHead>
              <TableHead class="w-[200px]">Nhóm</TableHead>
              <TableHead class="w-[180px]">Trạng thái</TableHead>
              <TableHead class="text-right w-[220px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="f in v.forms" :key="f.id">
              <TableCell>
                <div class="flex items-center gap-2">
                  <span
                    v-if="formRanges[f.id]"
                    class="w-2 h-2 rounded-full shrink-0"
                    :style="{ background: fieldDotColor(formRanges[f.id].n) }"
                  />
                  <Input
                    v-if="canEdit"
                    :default-value="f.title || f.label"
                    class="h-8"
                    @blur="(e) => renameForm(f, (e.target as HTMLInputElement).value)"
                  />
                  <span v-else>{{ f.title || f.label }}</span>
                </div>
              </TableCell>
              <TableCell>
                <Select v-if="canEdit" :model-value="f.form_type" @update:model-value="(val) => changeFormType(f, val as string)">
                  <SelectTrigger class="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="(label, key) in FORM_TYPE" :key="key" :value="key">{{ label }}</SelectItem>
                  </SelectContent>
                </Select>
                <Badge v-else variant="secondary">{{ FORM_TYPE[f.form_type] }}</Badge>
              </TableCell>
              <TableCell>
                <div class="flex flex-col gap-1">
                  <AdminStatusBadge :status="f.review_status" />
                  <Badge
                    :variant="f.validation?.ok ? 'secondary' : 'destructive'"
                    class="font-normal text-xs"
                  >{{ f.validation?.ok ? 'Tệp đạt' : 'Lỗi tệp' }}</Badge>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="outline" size="sm" @click="downloadForm(f)">
                    <Download class="size-3.5 mr-1" /> Tải
                  </Button>
                  <Button variant="outline" size="sm" @click="openFormPreview(f)">
                    <FileType class="size-3.5 mr-1" /> Xem trước
                  </Button>
                  <Button
                    v-if="formRanges[f.id]"
                    variant="outline"
                    size="sm"
                    @click="wordRef?.highlight(f.block_start!, f.block_end!)"
                  >
                    <Eye class="size-3.5 mr-1" /> Word
                  </Button>
                  <Button
                    v-if="canEdit"
                    variant="outline"
                    size="sm"
                    @click="openFormCutter(f)"
                  >
                    <Scissors class="size-3.5 mr-1" /> Ranh giới
                  </Button>
                  <Button
                    v-if="canEdit || editingInPlace"
                    variant="outline"
                    size="sm"
                    class="text-destructive"
                    @click="deleteForm(f)"
                  >
                    <Trash2 class="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-else class="p-6 text-center text-sm text-muted-foreground">Chưa có biểu mẫu nào.</div>
      </CardContent>
    </Card>

    <!-- Split: fields left | Word right -->
    <div class="grid lg:grid-cols-2 gap-4">
      <!-- Fields -->
      <div class="space-y-2">
        <div class="px-1 space-y-2">
          <h2 class="text-base font-semibold">Các trường dữ liệu (bản nháp)</h2>
          <p class="text-xs text-muted-foreground">
            Cột này là nội dung sẽ hiển thị cho công dân. Cột phải là Word gốc <strong>bất biến</strong> (chỉ để đối chiếu).
          </p>
          <div class="flex items-center gap-2 flex-wrap pt-1">
            <div class="relative flex-1 min-w-[180px]">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input v-model="fieldSearch" placeholder="Lọc theo tên trường…" class="pl-8 h-8" />
            </div>
            <Select v-model="fieldFilter">
              <SelectTrigger class="h-8 w-[180px]">
                <Filter class="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="no_source">Chưa có nguồn</SelectItem>
                <SelectItem value="manual">Biên tập thủ công</SelectItem>
                <SelectItem value="has_warning">Có cảnh báo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" class="h-8" title="Mở tất cả" @click="expandAll">
              <ChevronsDown class="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" class="h-8" title="Thu gọn tất cả" @click="collapseAll">
              <ChevronsUp class="size-3.5" />
            </Button>
          </div>
          <p v-if="filteredFieldKeys.length < Object.keys(v.field_titles).length" class="text-xs text-muted-foreground">
            {{ filteredFieldKeys.length }} / {{ Object.keys(v.field_titles).length }} trường phù hợp
          </p>
        </div>
        <div
          v-for="k in filteredFieldKeys"
          :key="k"
          :data-field-key="k"
          class="rounded-md border bg-card"
        >
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/40 transition-colors"
            @click="onFieldClick(k)"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :style="{ background: fieldRanges[k] ? fieldDotColor(fieldRanges[k].n) : 'transparent', border: fieldRanges[k] ? '' : '1px dashed var(--color-border)' }"
            />
            <span class="flex-1 font-medium text-sm">{{ v.field_titles[k] }}</span>
            <Badge
              v-if="warningsByField[k]"
              variant="outline"
              class="font-normal text-xs text-warning border-warning/40"
            >{{ warningsByField[k] }} ⚠</Badge>
            <Badge
              :variant="sourceVariant(v.content.fields?.[k]?.source)"
              class="font-normal text-xs"
            >{{ sourceLabel(v.content.fields?.[k]?.source) }}</Badge>
            <ChevronDown class="size-4 text-muted-foreground transition-transform" :class="openFields.has(k) ? 'rotate-180' : ''" />
          </button>

          <div v-if="openFields.has(k)" class="border-t px-3 py-3 space-y-2">
            <pre class="src whitespace-pre-wrap text-sm bg-muted/30 rounded-md p-3 max-h-80 overflow-y-auto">{{ v.content.fields?.[k]?.value || '— trống —' }}</pre>

            <div v-if="fieldRanges[k]" class="flex items-center gap-2">
              <Button variant="outline" size="sm" @click="wordRef?.highlight(fieldRanges[k].s, fieldRanges[k].e)">
                <Eye class="size-3.5 mr-1" /> Xem trong Word gốc (khối {{ fieldRanges[k].s }}–{{ fieldRanges[k].e }})
              </Button>
            </div>

            <!-- Dossier layout preview -->
            <div v-if="v.content.fields?.[k]?.layout?.tree" class="rounded-md border bg-muted/20 p-3 space-y-2">
              <p class="text-xs text-muted-foreground">
                Cách trình bày cho công dân (danh sách thả xuống ·
                {{ v.content.fields[k].layout?.heads?.length || 0 }} mục ·
                {{ v.content.fields[k].layout?.hl?.length || 0 }} dòng tô vàng):
              </p>
              <AdminDossierTree :tree="v.content.fields[k].layout!.tree" />
            </div>

            <!-- Sector select -->
            <template v-if="canChange && k === 'linh_vuc'">
              <Label class="text-xs">Lĩnh vực</Label>
              <Select
                :model-value="v.content.fields?.[k]?.value || SECTOR_NONE"
                @update:model-value="(val) => saveSector(k, val as string)"
              >
                <SelectTrigger class="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem :value="SECTOR_NONE">— chưa chọn —</SelectItem>
                  <SelectItem v-for="s in activeSectors" :key="s.id" :value="s.name">{{ s.name }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="!activeSectors.length" class="text-xs text-muted-foreground">
                Chưa có lĩnh vực nào. Thêm tại
                <NuxtLink to="/admin/config" class="text-primary hover:underline">Lĩnh vực &amp; hỗ trợ</NuxtLink>.
              </p>
            </template>

            <!-- Text editor -->
            <template v-else-if="canChange">
              <div v-if="editingKey !== k" class="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" @click="openFieldCutter(k)">
                  <Scissors class="size-3.5 mr-1" /> Chọn vùng từ Word gốc
                </Button>
                <Button variant="outline" size="sm" @click="startEdit(k)">
                  <Pencil class="size-3.5 mr-1" /> Sửa chữ tại phiên bản này
                </Button>
                <Button
                  v-if="fieldRanges[k] && v.content.fields?.[k]?.value"
                  variant="outline" size="sm" @click="openLayoutEditor(k)"
                >
                  <ListTree class="size-3.5 mr-1" /> Dựng danh sách / tô vàng
                </Button>
                <span class="text-xs text-muted-foreground">Chọn vùng = lấy nguyên văn Word; sửa chữ = chỉnh thủ công.</span>
              </div>
              <div v-else class="space-y-2">
                <Textarea v-model="editValue[k]" rows="8" class="font-mono text-sm" />
                <Input
                  v-model="editReason[k]"
                  :placeholder="editingInPlace ? 'Lý do sửa (mặc định: lý do chế độ chỉnh sửa)' : 'Lý do sửa (không bắt buộc)'"
                />
                <div class="flex items-center gap-2">
                  <Button :disabled="savingKey === k" @click="saveField(k)">
                    <Loader2 v-if="savingKey === k" class="size-4 mr-2 animate-spin" />
                    <Save v-else class="size-4 mr-2" />
                    {{ editingInPlace ? 'Lưu tại phiên bản này' : 'Lưu vào bản nháp' }}
                  </Button>
                  <Button variant="outline" @click="cancelEdit">Hủy</Button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Word pane -->
      <div class="lg:sticky lg:top-32 lg:self-start">
        <div class="space-y-2">
          <div class="flex items-center justify-end gap-2">
            <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" v-model="showHighlights" class="size-3.5" />
              <Palette class="size-3.5" /> Tô màu vùng đã bóc tách
            </label>
          </div>
          <AdminWordViewer
            ref="wordRef"
            :html="srcHtml"
            :loading="srcLoading"
            :error="srcError"
            :fields="effectiveWordFields"
            :forms="effectiveWordForms"
            @block-click="onBlockClick"
            @open-docx-preview="docxPreviewOpen = true"
          />
        </div>
      </div>
    </div>

    <!-- Cutter -->
    <AdminCutterDialog
      v-if="cutterOpts"
      :open="cutterOpen"
      :version-id="v.id"
      :title="cutterOpts.title"
      :with-label="cutterOpts.withLabel"
      :form-id="cutterOpts.formId"
      :start="cutterOpts.start"
      :end="cutterOpts.end"
      :on-save="cutterOpts.onSave"
      @update:open="cutterOpen = $event"
    />

    <!-- Form preview -->
    <AdminFormPreviewDialog
      v-model:open="formPreviewOpen"
      :form-id="formPreviewId"
    />

    <!-- Docx preview (Xem bản dựng đẹp) -->
    <AdminDocxPreviewDialog
      v-model:open="docxPreviewOpen"
      :url="docxPreviewUrl"
      :filename="docxPreviewFilename"
    />

    <!-- Layout editor (dựng danh sách thả xuống) -->
    <AdminLayoutEditorDialog
      v-if="layoutOpts"
      v-model:open="layoutOpen"
      :version-id="v.id"
      :field-key="layoutOpts.fieldKey"
      :field-title="layoutOpts.fieldTitle"
      :start="layoutOpts.start"
      :end="layoutOpts.end"
      :heads="layoutOpts.heads"
      :hl="layoutOpts.hl"
      @saved="refresh(); loadSource()"
    />

    <!-- AI viewer -->
    <AdminAiViewerDialog
      v-model:open="aiViewerOpen"
      :version-id="v.id"
      :run-id="aiViewerRunId"
      @applied="refresh(); loadSource()"
    />

    <!-- Chặn navigate khi có edit chưa save -->
    <Dialog v-model:open="leaveOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="size-5 text-warning" />
            Thay đổi chưa lưu
          </DialogTitle>
          <DialogDescription>
            Bạn đang chỉnh trường <strong>{{ editingKey ? v.field_titles[editingKey] : '' }}</strong>
            nhưng chưa lưu. Rời đi sẽ bỏ các thay đổi đó.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="cancelLeave">Ở lại trang</Button>
          <Button variant="destructive" @click="confirmLeave">Rời đi, bỏ qua</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialogs -->
    <Dialog v-model:open="inplaceOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><Pencil class="size-5 text-warning" /> Chỉnh sửa tại phiên bản công khai</DialogTitle>
          <DialogDescription>
            Mỗi lần lưu có hiệu lực NGAY với công dân, không tạo phiên bản mới. Nhập lý do (dùng cho mọi thao tác lưu trong phiên này).
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <Label>Lý do</Label>
          <Input v-model="inplaceReasonInput" placeholder="VD: Sửa typo chính tả" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="inplaceOpen = false">Hủy</Button>
          <Button :disabled="!inplaceReasonInput.trim()" @click="confirmInPlace">Bật chế độ chỉnh sửa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="submitOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><Send class="size-5" /> Gửi duyệt phiên bản</DialogTitle>
          <DialogDescription>Phiên bản sẽ chuyển sang trạng thái "Chờ duyệt". Người có vai trò Phê duyệt sẽ duyệt công khai.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="submitOpen = false">Hủy</Button>
          <Button :disabled="working === 'submit'" @click="act('submit')">
            <Loader2 v-if="working === 'submit'" class="size-4 mr-2 animate-spin" />
            Gửi duyệt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="approveOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><Check class="size-5 text-success" /> Duyệt công khai</DialogTitle>
          <DialogDescription>Bản đang công khai (nếu có) sẽ được thay bằng phiên bản này. Công dân thấy ngay.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="approveOpen = false">Hủy</Button>
          <Button :disabled="working === 'approve'" @click="act('approve')">
            <Loader2 v-if="working === 'approve'" class="size-4 mr-2 animate-spin" />
            Duyệt công khai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="rejectOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><X class="size-5 text-destructive" /> Trả lại</DialogTitle>
          <DialogDescription>Trả phiên bản về cho biên tập chỉnh sửa.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="rejectOpen = false">Hủy</Button>
          <Button variant="destructive" :disabled="working === 'reject'" @click="act('reject')">
            <Loader2 v-if="working === 'reject'" class="size-4 mr-2 animate-spin" />
            Trả lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="withdrawOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><Ban class="size-5 text-destructive" /> Ngừng công khai</DialogTitle>
          <DialogDescription>Thủ tục sẽ không còn hiển thị cho người dân.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="withdrawOpen = false">Hủy</Button>
          <Button variant="destructive" :disabled="working === 'withdraw'" @click="act('withdraw')">
            <Loader2 v-if="working === 'withdraw'" class="size-4 mr-2 animate-spin" />
            Ngừng công khai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><AlertTriangle class="size-5 text-destructive" /> Xóa phiên bản</DialogTitle>
          <DialogDescription>
            Nếu là phiên bản duy nhất, TTHC cũng bị xóa. Bản đã công khai sẽ biến mất khỏi website.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <Label>Lý do xóa</Label>
          <Input v-model="deleteReason" placeholder="Không bắt buộc" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deleteOpen = false">Hủy</Button>
          <Button variant="destructive" :disabled="working === 'delete'" @click="deleteVersion">
            <Loader2 v-if="working === 'delete'" class="size-4 mr-2 animate-spin" />
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all .25s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(16px); }
</style>
