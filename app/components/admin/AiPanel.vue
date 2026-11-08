<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sparkles, Loader2, Eye, Check, X, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{ versionId: number; canUse: boolean }>()
const emit = defineEmits<{ 'open-viewer': [runId: number] }>()

const { api } = useAdminApi()
const { toast } = useToast()

interface AIStatus {
  enabled: boolean
  extract: {
    model?: string
    token_limit?: number | null
    month: { calls: number; tokens: number }
  }
}
interface RunItem {
  id: string
  title: string
  decision: 'pending' | 'accepted' | 'rejected'
  type?: string
  same?: boolean
  relation?: string
}
interface Run {
  id: number
  status: string
  error?: string | null
  created_by: string
  items: RunItem[]
}

const AI_TARGETS = [
  { group: 'Một trường', items: [
    ['field:trinh_tu', 'Trình tự thực hiện'],
    ['field:cach_thuc', 'Cách thức thực hiện'],
    ['field:ho_so', 'Thành phần, số lượng hồ sơ'],
    ['field:thoi_han', 'Thời hạn giải quyết'],
    ['field:doi_tuong', 'Đối tượng thực hiện'],
    ['field:co_quan', 'Cơ quan giải quyết'],
    ['field:ket_qua', 'Kết quả thực hiện'],
    ['field:phi_le_phi', 'Phí, lệ phí'],
    ['field:mau_don', 'Tên mẫu đơn, mẫu tờ khai'],
    ['field:dieu_kien', 'Yêu cầu, điều kiện'],
    ['field:can_cu', 'Căn cứ pháp lý'],
  ]},
  { group: 'Một nhóm nội dung', items: [
    ['group:ho_so', 'Hồ sơ + mẫu đơn'],
    ['group:thoi_han_phi', 'Thời hạn + phí, lệ phí'],
    ['group:trinh_tu', 'Trình tự + cách thức'],
    ['group:co_quan', 'Đối tượng + cơ quan + kết quả'],
    ['group:dieu_kien', 'Điều kiện + căn cứ pháp lý'],
  ]},
  { group: 'Toàn bộ', items: [['all:', 'Toàn bộ thủ tục (11 nhóm + các mẫu biểu)']] },
]

const status = ref<AIStatus | null>(null)
const runs = ref<Run[]>([])
const loading = ref(false)
const target = ref('field:trinh_tu')
const running = ref(false)

async function reload() {
  loading.value = true
  try {
    const [st, rs] = await Promise.all([
      api<AIStatus>('GET', '/api/admin/ai/status'),
      api<Run[]>('GET', `/api/admin/versions/${props.versionId}/ai/runs`),
    ])
    status.value = st
    runs.value = rs
  } catch {
    // ignore (endpoint có thể không bật)
    status.value = null
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch(() => props.versionId, reload)

const run0 = computed(() => runs.value[0] ?? null)
const pendingCount = computed(() => run0.value?.items.filter((it) => it.decision === 'pending').length ?? 0)

async function runExtract() {
  if (running.value) return
  running.value = true
  toast.info('Đang gọi AI, vui lòng chờ…')
  try {
    const [scope, key] = target.value.split(':')
    const r = await api<{ status: string; error?: string }>(
      'POST',
      `/api/admin/versions/${props.versionId}/ai/extract`,
      { scope, keys: key ? [key] : null },
    )
    if (r.status === 'failed') toast.err('AI lỗi: ' + (r.error || 'Không rõ'))
    else toast.ok('Đã có đề xuất của AI — mở trình đối chiếu để so sánh')
    await reload()
  } catch (e: any) {
    toast.err(e?.message ?? 'Chạy AI thất bại')
  } finally {
    running.value = false
  }
}
</script>

<template>
  <Card v-if="canUse">
    <CardHeader>
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles class="size-5" />
        </div>
        <div class="flex-1">
          <CardTitle>Bóc tách lại bằng AI</CardTitle>
          <CardDescription class="mt-1">
            AI chỉ <strong>đề xuất</strong> kèm chứng cứ từ Word gốc; không tự ghi đè. Bạn chọn từng đề xuất để áp vào bản nháp, vẫn phải gửi duyệt như thường.
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-3">
      <Alert v-if="status && !status.enabled" variant="default" class="border-warning/40 bg-warning/5">
        <AlertTriangle class="size-4 text-warning" />
        <AlertTitle>AI chưa được bật</AlertTitle>
        <AlertDescription>
          Cấu hình <code>TTHC_AI_ENABLED</code> + <code>TTHC_OPENAI_API_KEY</code> ở máy chủ để dùng.
        </AlertDescription>
      </Alert>

      <p v-else-if="status" class="text-xs text-muted-foreground">
        Model: <code>{{ status.extract.model || '—' }}</code> · tháng này:
        <strong>{{ status.extract.month.calls }}</strong> lượt,
        <strong>{{ status.extract.month.tokens.toLocaleString('vi-VN') }}</strong> token
        <template v-if="status.extract.token_limit">
          / hạn mức {{ status.extract.token_limit.toLocaleString('vi-VN') }}
        </template>
      </p>

      <div class="flex items-end gap-2 flex-wrap">
        <div class="space-y-1 flex-1 min-w-[260px]">
          <label class="text-xs font-medium">Phạm vi</label>
          <Select v-model="target">
            <SelectTrigger class="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup v-for="g in AI_TARGETS" :key="g.group">
                <SelectLabel>{{ g.group }}</SelectLabel>
                <SelectItem v-for="[val, label] in g.items" :key="val" :value="val">{{ label }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button :disabled="!status?.enabled || running" @click="runExtract">
          <Loader2 v-if="running" class="size-4 mr-2 animate-spin" />
          <Sparkles v-else class="size-4 mr-2" />
          Chạy AI bóc tách
        </Button>
      </div>

      <div v-if="run0" class="pt-3 border-t space-y-2">
        <h3 class="text-sm font-semibold">
          Kết quả gần nhất (#{{ run0.id }}, {{ run0.created_by }})
        </h3>
        <Alert v-if="run0.status === 'failed'" variant="destructive">
          <AlertDescription>Lỗi AI: {{ run0.error }}. Dữ liệu không bị thay đổi.</AlertDescription>
        </Alert>
        <Alert v-else-if="run0.error" variant="default">
          <AlertDescription>{{ run0.error }}</AlertDescription>
        </Alert>

        <template v-if="run0.items.length">
          <p class="text-sm text-muted-foreground">
            {{ run0.items.length }} đề xuất · còn chờ <strong>{{ pendingCount }}</strong>
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <Button variant="default" @click="emit('open-viewer', run0.id)">
              <Eye class="size-4 mr-2" /> Mở trình đối chiếu
            </Button>
          </div>
        </template>
        <p v-else-if="run0.status === 'ok'" class="text-sm text-muted-foreground">
          AI không đề xuất mục nào.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
