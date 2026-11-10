<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, FileType2 } from 'lucide-vue-next'

interface FileItem {
  id: number
  kind: 'main' | 'annex'
  filename: string
  mime?: string
  size?: number
}
interface Decision {
  id: number
  number: string
  summary: string
  issuer: string
  signed_date?: string | null
  effective_from?: string | null
  effective_note?: string | null
  warning?: string | null
  files?: FileItem[]
}

defineProps<{ decision: Decision; primary?: boolean }>()

function isPdf(mime?: string) {
  return mime === 'application/pdf'
}
</script>

<template>
  <article class="rounded-lg border bg-card p-4 space-y-3" :class="decision.warning ? 'border-warning/40' : ''">
    <Alert v-if="decision.warning" variant="default" class="border-warning/40 bg-warning/5 py-2">
      <AlertDescription class="text-sm text-warning">{{ decision.warning }}</AlertDescription>
    </Alert>

    <div>
      <div class="flex items-start gap-2 flex-wrap">
        <NuxtLink
          :to="`/quyet-dinh/${decision.id}`"
          class="text-base font-semibold text-primary hover:underline"
        >Quyết định số {{ decision.number }}</NuxtLink>
        <Badge v-if="primary" variant="default" class="bg-success text-success-foreground font-normal">
          QĐ công bố chính
        </Badge>
      </div>
      <p class="text-sm text-foreground mt-1">{{ decision.summary }}</p>
    </div>

    <dl class="grid sm:grid-cols-3 gap-3 text-sm">
      <div>
        <dt class="text-xs text-muted-foreground">Cơ quan ban hành</dt>
        <dd>{{ decision.issuer }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">Ngày ký</dt>
        <dd>{{ fmtPublicDate(decision.signed_date) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">Ngày hiệu lực</dt>
        <dd>
          {{ decision.effective_from ? fmtPublicDate(decision.effective_from) : 'Chưa có thông tin' }}
          <template v-if="decision.effective_note"> — {{ decision.effective_note }}</template>
        </dd>
      </div>
    </dl>

    <ul v-if="decision.files?.length" class="space-y-2 pt-2 border-t">
      <li
        v-for="f in decision.files"
        :key="f.id"
        class="flex items-center gap-3 text-sm"
      >
        <div
          class="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
          :class="isPdf(f.mime) ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'"
        >
          <FileType2 v-if="isPdf(f.mime)" class="size-5" />
          <FileText v-else class="size-5" />
        </div>
        <div class="flex-1 min-w-0">
          <p>{{ f.kind === 'main' ? 'Văn bản Quyết định' : 'Phụ lục' }}</p>
          <p class="text-xs text-muted-foreground truncate">
            {{ f.filename }}<template v-if="f.size"> · {{ fmtKB(f.size) }}</template>
          </p>
        </div>
        <a
          :href="`/api/public/decisions/files/${f.id}/download`"
          :target="isPdf(f.mime) ? '_blank' : undefined"
          :rel="isPdf(f.mime) ? 'noopener' : undefined"
          :download="!isPdf(f.mime) || undefined"
        >
          <Button variant="outline" size="sm">
            <Download class="size-3.5 mr-1" />
            {{ isPdf(f.mime) ? 'Xem / Tải' : 'Tải' }}
          </Button>
        </a>
      </li>
    </ul>
  </article>
</template>
