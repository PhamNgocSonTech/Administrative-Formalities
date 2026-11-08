<script setup lang="ts">
import { Button } from '@/components/ui/button'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  FileCheck,
  Gavel,
  Check,
  X,
  Loader2,
  Lock,
  AlertTriangle,
  Inbox,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

interface PendingVersion {
  id: number
  code: string
  name: string
  version_no: number
  submitted_by: string
  warning_counts?: { error?: number; warning?: number; info?: number }
}
interface PendingDecision {
  id: number
  number: string
  summary: string
  status: string
}

const { api } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()
const { confirm } = useConfirm()

const canReview = computed(() => hasRole('approver'))

const { data, pending, refresh, error } = await useAsyncData(
  'admin-pending',
  async () => {
    const [vs, ds] = await Promise.all([
      api<PendingVersion[]>('GET', '/api/admin/versions?status=pending_approval'),
      api<PendingDecision[]>('GET', '/api/admin/decisions'),
    ])
    return {
      versions: vs,
      decisions: ds.filter((d) => d.status === 'pending_approval'),
    }
  },
  { default: () => ({ versions: [] as PendingVersion[], decisions: [] as PendingDecision[] }) },
)

const versions = computed(() => data.value?.versions ?? [])
const decisions = computed(() => data.value?.decisions ?? [])

// Selection
const selected = ref<Set<number>>(new Set())
const allChecked = computed(() => versions.value.length > 0 && versions.value.every((v) => selected.value.has(v.id)))

function toggleAll(v: boolean | 'indeterminate') {
  if (v === true) selected.value = new Set(versions.value.map((x) => x.id))
  else selected.value = new Set()
}
function toggleOne(id: number, v: boolean | 'indeterminate') {
  const s = new Set(selected.value)
  if (v === true) s.add(id)
  else s.delete(id)
  selected.value = s
}

// Bulk action
const working = ref<null | 'approve' | 'reject'>(null)

async function bulkAction(kind: 'approve' | 'reject') {
  const picked = versions.value.filter((v) => selected.value.has(v.id))
  if (!picked.length) {
    toast.err('Chưa chọn TTHC nào')
    return
  }
  const label = kind === 'approve' ? 'Duyệt công khai' : 'Trả lại'
  const ok = await confirm({
    title: `${label} ${picked.length} TTHC?`,
    description: kind === 'approve'
      ? 'Bản đang công khai (nếu có) của từng TTHC sẽ được thay. Công dân thấy nội dung mới ngay.'
      : 'Các phiên bản sẽ quay về bản nháp để biên tập chỉnh sửa lại.',
    confirmText: label,
    variant: kind === 'approve' ? 'default' : 'warning',
  })
  if (!ok) return

  working.value = kind
  const okList: string[] = []
  const bad: string[] = []
  for (const v of picked) {
    try {
      await api('POST', `/api/admin/versions/${v.id}/${kind}`, {})
      okList.push(v.code)
    } catch (e: any) {
      const blockers = (e.blockers || []) as string[]
      const extra = blockers.length ? ` (${blockers.join('; ')})` : ''
      bad.push(`${v.code}: ${e.message}${extra}`)
    }
  }
  working.value = null
  selected.value = new Set()
  await refresh()

  const summary = `${label}: ${okList.length}/${picked.length}`
  if (bad.length) {
    toast.err(`${summary}\nKhông thực hiện được:\n• ${bad.join('\n• ')}`)
  } else {
    toast.ok(summary)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Chờ duyệt</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Người có vai trò <strong>Phê duyệt</strong> xem xét từng mục và duyệt công khai, hoặc trả lại nháp.
      </p>
    </div>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải danh sách</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <Alert v-if="!canReview">
      <Lock class="size-4" />
      <AlertTitle>Thiếu quyền</AlertTitle>
      <AlertDescription>Cần vai trò <strong>Phê duyệt</strong> để duyệt/trả lại. Bạn vẫn xem được danh sách.</AlertDescription>
    </Alert>

    <!-- Versions -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileCheck class="size-5" />
          </div>
          <div class="flex-1">
            <CardTitle>Phiên bản TTHC chờ duyệt ({{ versions.length }})</CardTitle>
            <CardDescription class="mt-1">
              Mỗi TTHC được kiểm tra điều kiện riêng; nếu không đủ sẽ báo lý do và giữ nguyên trạng thái.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <AdminBulkBar :show="canReview && versions.length > 0 && selected.size > 0">
          <div class="px-6 py-3 border-t border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
            <span class="text-sm text-muted-foreground">
              Đã chọn <strong class="text-foreground">{{ selected.size }}</strong>
              / {{ versions.length }}
            </span>
            <div class="flex items-center gap-2">
              <Button
                size="sm"
                :disabled="!selected.size || working !== null"
                @click="bulkAction('approve')"
              >
                <Loader2 v-if="working === 'approve'" class="size-3.5 mr-1 animate-spin" />
                <Check v-else class="size-3.5 mr-1" />
                Duyệt công khai
              </Button>
              <Button
                size="sm"
                variant="outline"
                :disabled="!selected.size || working !== null"
                @click="bulkAction('reject')"
              >
                <Loader2 v-if="working === 'reject'" class="size-3.5 mr-1 animate-spin" />
                <X v-else class="size-3.5 mr-1" />
                Trả lại
              </Button>
            </div>
          </div>
        </AdminBulkBar>

        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-if="canReview" class="w-10">
                  <Checkbox :model-value="allChecked" @update:model-value="toggleAll" />
                </TableHead>
                <TableHead>Mã</TableHead>
                <TableHead class="min-w-[320px]">Tên thủ tục</TableHead>
                <TableHead>Gửi bởi</TableHead>
                <TableHead>Cảnh báo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pending" v-for="n in 3" :key="`s${n}`">
                <TableCell :colspan="canReview ? 5 : 4"><Skeleton class="h-6 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!versions.length">
                <TableCell :colspan="canReview ? 5 : 4" class="h-32 text-center text-muted-foreground">
                  <Inbox class="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  Không có phiên bản nào đang chờ duyệt.
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="v in versions" :key="v.id">
                <TableCell v-if="canReview">
                  <Checkbox
                    :model-value="selected.has(v.id)"
                    @update:model-value="(val) => toggleOne(v.id, val)"
                  />
                </TableCell>
                <TableCell>
                  <NuxtLink
                    :to="`/admin/v/${v.id}`"
                    class="font-mono text-xs text-primary hover:underline"
                  >
                    {{ v.code }} PB {{ v.version_no }}
                  </NuxtLink>
                </TableCell>
                <TableCell class="text-sm">{{ v.name }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">{{ v.submitted_by }}</TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge v-if="v.warning_counts?.error" variant="destructive" class="font-normal">{{ v.warning_counts.error }} error</Badge>
                    <Badge v-if="v.warning_counts?.warning" variant="secondary" class="bg-warning text-warning-foreground font-normal">{{ v.warning_counts.warning }} warning</Badge>
                    <Badge v-if="v.warning_counts?.info" variant="outline" class="font-normal">{{ v.warning_counts.info }} info</Badge>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Decisions -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Gavel class="size-5" />
          </div>
          <div class="flex-1">
            <CardTitle>Quyết định chờ duyệt ({{ decisions.length }})</CardTitle>
            <CardDescription class="mt-1">
              Mở chi tiết QĐ để duyệt / trả lại.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="pending" class="space-y-2">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </div>
        <div v-else-if="!decisions.length" class="text-center text-sm text-muted-foreground py-8">
          <Inbox class="size-8 mx-auto mb-2 text-muted-foreground/50" />
          Không có Quyết định nào chờ duyệt.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="d in decisions"
            :key="d.id"
            class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-accent/40 transition-colors"
          >
            <NuxtLink :to="`/admin/d/${d.id}`" class="text-primary hover:underline font-medium shrink-0">
              {{ d.number }}
            </NuxtLink>
            <span class="text-muted-foreground flex-1 truncate">{{ d.summary }}</span>
            <NuxtLink :to="`/admin/d/${d.id}`">
              <Button variant="outline" size="sm">Mở</Button>
            </NuxtLink>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
