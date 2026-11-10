<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ChevronRight, Home, Gavel, FileText } from 'lucide-vue-next'

definePageMeta({ layout: 'public' })

interface ProcRef {
  code: string
  name: string
  abolished?: boolean
}
interface DecisionDetail {
  id: number
  number: string
  summary: string
  issuer: string
  signed_date?: string | null
  effective_from?: string | null
  procedures: ProcRef[]
  previous_procedures: ProcRef[]
}

const route = useRoute()
const { get } = usePublicApi()

const { data, pending, error } = await useAsyncData(
  () => `public-decision-${route.params.id}`,
  () => get<DecisionDetail>(`/api/public/decisions/${encodeURIComponent(route.params.id as string)}`),
)

useHead({
  title: computed(() => (data.value ? `Quyết định ${data.value.number} — Tra cứu TTHC` : 'Quyết định')),
})
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <Skeleton class="h-6 w-60" />
    <Skeleton class="h-40 w-full" />
  </div>

  <div v-else-if="error">
    <Alert variant="destructive">
      <AlertTitle>Không tải được Quyết định</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>
  </div>

  <div v-else-if="data" class="space-y-6">
    <nav class="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Đường dẫn">
      <NuxtLink to="/" class="hover:text-primary flex items-center gap-1">
        <Home class="size-3.5" /> Trang chủ
      </NuxtLink>
      <ChevronRight class="size-3.5" />
      <NuxtLink to="/quyet-dinh" class="hover:text-primary">Quyết định công bố</NuxtLink>
      <ChevronRight class="size-3.5" />
      <span class="text-foreground">{{ data.number }}</span>
    </nav>

    <PublicDecisionCard :decision="data as any" primary />

    <section class="space-y-3">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <FileText class="size-5" />
        Thủ tục đang công khai theo Quyết định này
        <Badge variant="secondary" class="font-normal">{{ data.procedures.length }}</Badge>
      </h2>
      <ul v-if="data.procedures.length" class="divide-y border rounded-lg bg-card">
        <li v-for="p in data.procedures" :key="p.code" class="px-4 py-3">
          <NuxtLink :to="`/thu-tuc/${encodeURIComponent(p.code)}`" class="flex items-center gap-3 group">
            <span class="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">{{ p.code }}</span>
            <span class="flex-1 text-sm group-hover:text-primary transition-colors">{{ p.name }}</span>
            <Badge v-if="p.abolished" variant="destructive" class="font-normal">Đã bị bãi bỏ</Badge>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground">
        Không có thủ tục nào đang công khai theo Quyết định này.
      </p>
    </section>

    <section v-if="data.previous_procedures.length" class="space-y-3">
      <h2 class="text-xl font-semibold">Từng công bố trước đây</h2>
      <p class="text-sm text-muted-foreground">
        Các thủ tục dưới đây hiện áp dụng theo phiên bản/Quyết định khác hoặc không còn công khai.
      </p>
      <ul class="divide-y border rounded-lg bg-card">
        <li v-for="p in data.previous_procedures" :key="p.code" class="px-4 py-3">
          <NuxtLink :to="`/thu-tuc/${encodeURIComponent(p.code)}`" class="flex items-center gap-3 group">
            <span class="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">{{ p.code }}</span>
            <span class="flex-1 text-sm group-hover:text-primary transition-colors">{{ p.name }}</span>
            <Badge v-if="p.abolished" variant="destructive" class="font-normal">Đã bị bãi bỏ</Badge>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
