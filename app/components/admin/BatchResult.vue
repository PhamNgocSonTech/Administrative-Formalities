<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, AlertTriangle, XCircle, Copy, ExternalLink } from 'lucide-vue-next'

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
  items: BatchItem[]
}

defineProps<{ batch: Batch; splitHint?: string }>()
</script>

<template>
  <div class="space-y-3">
    <div v-if="splitHint" class="text-sm">
      <strong>Tách được tổng cộng {{ batch.split_total }} TTHC</strong> từ "{{ splitHint }}", đã đưa vào lô <span class="font-mono">#{{ batch.id }}</span>.
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-md border p-3 bg-success/5 border-success/30">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 class="size-3.5 text-success" /> Thành công
        </div>
        <p class="text-2xl font-semibold mt-1">{{ batch.succeeded ?? 0 }}</p>
      </div>
      <div class="rounded-md border p-3 bg-warning/5 border-warning/30">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle class="size-3.5 text-warning" /> Cần rà soát
        </div>
        <p class="text-2xl font-semibold mt-1">{{ batch.needs_review ?? 0 }}</p>
      </div>
      <div class="rounded-md border p-3 bg-destructive/5 border-destructive/30">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <XCircle class="size-3.5 text-destructive" /> Lỗi
        </div>
        <p class="text-2xl font-semibold mt-1">{{ batch.failed ?? 0 }}</p>
      </div>
      <div class="rounded-md border p-3 bg-muted/40">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Copy class="size-3.5" /> Trùng
        </div>
        <p class="text-2xl font-semibold mt-1">{{ batch.duplicates ?? 0 }}</p>
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      Lô <span class="font-mono font-medium">#{{ batch.id }}</span> · gắn QĐ cho cả lô tại trang
      <NuxtLink to="/admin/qd" class="text-primary hover:underline">Quyết định công bố</NuxtLink>
      (nhập số lô #{{ batch.id }}).
    </p>

    <div class="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tệp</TableHead>
            <TableHead class="w-32">Trạng thái</TableHead>
            <TableHead class="w-40">Cảnh báo</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(it, i) in batch.items" :key="i">
            <TableCell class="font-mono text-xs">{{ it.original_filename || it.filename }}</TableCell>
            <TableCell><AdminStatusBadge :status="it.status" /></TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1">
                <Badge v-if="it.warning_counts?.error" variant="destructive" class="font-normal">{{ it.warning_counts.error }} error</Badge>
                <Badge v-if="it.warning_counts?.warning" variant="secondary" class="bg-warning text-warning-foreground font-normal">{{ it.warning_counts.warning }} warning</Badge>
                <Badge v-if="it.warning_counts?.info" variant="outline" class="font-normal">{{ it.warning_counts.info }} info</Badge>
              </div>
            </TableCell>
            <TableCell class="text-sm">
              <NuxtLink
                v-if="it.version_id"
                :to="`/admin/v/${it.version_id}`"
                class="text-primary hover:underline inline-flex items-center gap-1"
              >
                Xem bản nháp <ExternalLink class="size-3" />
              </NuxtLink>
              <span v-if="it.error" class="text-destructive">{{ it.error }}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
