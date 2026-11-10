<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { History, Search, ChevronRight } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

interface AuditRow {
  at: string
  actor: string
  action: string
  entity_type: string
  entity_id?: string | number | null
  detail?: Record<string, any> | null
}

const { api } = useAdminApi()

const { data, pending, error } = await useAsyncData(
  'admin-audit',
  () => api<AuditRow[]>('GET', '/api/admin/audit?limit=300'),
  { default: () => [] as AuditRow[] },
)

const q = ref('')
const expanded = ref<Set<number>>(new Set())

const filtered = computed(() => {
  const arr = data.value ?? []
  if (!q.value.trim()) return arr
  const t = q.value.toLowerCase()
  return arr.filter((a) =>
    (a.actor || '').toLowerCase().includes(t) ||
    (a.action || '').toLowerCase().includes(t) ||
    (a.entity_type || '').toLowerCase().includes(t) ||
    String(a.entity_id ?? '').toLowerCase().includes(t),
  )
})

function toggleRow(i: number) {
  const s = new Set(expanded.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  expanded.value = s
}

function fmtAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })
  } catch { return iso }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Nhật ký thao tác</h1>
      <p class="text-sm text-muted-foreground mt-1">
        300 dòng gần nhất, chỉ ghi thêm (không sửa / xóa được).
      </p>
    </div>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải nhật ký</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History class="size-5" />
            </div>
            <div>
              <CardTitle>Nhật ký ({{ filtered.length }} / {{ data?.length ?? 0 }})</CardTitle>
              <CardDescription class="mt-1">Lọc theo người, hành động, loại đối tượng, hoặc id.</CardDescription>
            </div>
          </div>
          <div class="relative w-full sm:w-[320px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input v-model="q" placeholder="Lọc…" class="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-8"></TableHead>
                <TableHead class="w-44">Lúc</TableHead>
                <TableHead>Người</TableHead>
                <TableHead>Thao tác</TableHead>
                <TableHead>Đối tượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pending" v-for="n in 6" :key="`s${n}`">
                <TableCell colspan="5"><Skeleton class="h-5 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!filtered.length">
                <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
                  Không có nhật ký nào phù hợp.
                </TableCell>
              </TableRow>
              <template v-else v-for="(a, i) in filtered" :key="i">
                <TableRow
                  data-clickable
                  class="hover:bg-accent/40 transition-colors"
                  @click="a.detail && toggleRow(i)"
                >
                  <TableCell class="align-top">
                    <ChevronRight
                      v-if="a.detail"
                      class="size-4 text-muted-foreground transition-transform"
                      :class="expanded.has(i) ? 'rotate-90' : ''"
                    />
                  </TableCell>
                  <TableCell class="text-xs text-muted-foreground font-mono align-top">{{ fmtAt(a.at) }}</TableCell>
                  <TableCell class="text-sm align-top">{{ a.actor }}</TableCell>
                  <TableCell class="align-top">
                    <code class="text-xs bg-muted px-1.5 py-0.5 rounded">{{ a.action }}</code>
                  </TableCell>
                  <TableCell class="text-sm align-top">
                    {{ a.entity_type }}
                    <span v-if="a.entity_id" class="text-muted-foreground">#{{ a.entity_id }}</span>
                  </TableCell>
                </TableRow>
                <TableRow v-if="a.detail && expanded.has(i)" class="bg-muted/30 hover:bg-muted/30">
                  <TableCell></TableCell>
                  <TableCell colspan="4" class="pb-3">
                    <pre class="text-xs font-mono bg-background border rounded-md p-3 overflow-auto max-h-80">{{ JSON.stringify(a.detail, null, 2) }}</pre>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
