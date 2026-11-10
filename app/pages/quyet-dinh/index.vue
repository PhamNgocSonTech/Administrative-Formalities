<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Search, Gavel } from 'lucide-vue-next'

definePageMeta({ layout: 'public' })

useHead({ title: 'Quyết định công bố — Tra cứu TTHC Công Thương' })

const route = useRoute()
const router = useRouter()
const { get } = usePublicApi()

const q = ref((route.query.q as string) || '')

const { data, pending, error } = await useAsyncData(
  () => `public-decisions-${q.value}`,
  () => get<any[]>('/api/public/decisions' + (q.value ? `?q=${encodeURIComponent(q.value)}` : '')),
  { default: () => [] as any[], watch: [q] },
)

function submitSearch(e: Event) {
  e.preventDefault()
  router.push({ path: '/quyet-dinh', query: q.value ? { q: q.value } : {} })
}
</script>

<template>
  <div class="space-y-6">
    <header class="text-center space-y-4 pt-4">
      <h1 class="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
        <Gavel class="size-7 text-primary" />
        Quyết định công bố thủ tục hành chính
      </h1>
      <form @submit="submitSearch" role="search" class="max-w-xl mx-auto flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            v-model="q"
            name="q"
            placeholder="Số, ngày, trích yếu hoặc cơ quan"
            class="pl-10 h-10"
          />
        </div>
        <Button type="submit">Tìm</Button>
      </form>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <div v-if="pending" class="space-y-3">
      <Skeleton v-for="n in 3" :key="n" class="h-40 w-full" />
    </div>

    <div v-else-if="data?.length" class="space-y-4">
      <PublicDecisionCard v-for="x in data" :key="x.id" :decision="x" />
    </div>

    <div v-else class="text-center py-12 text-muted-foreground">
      <Gavel class="size-12 mx-auto mb-3 text-muted-foreground/40" />
      <p>{{ q ? 'Không có Quyết định phù hợp.' : 'Chưa có Quyết định công bố nào được công khai.' }}</p>
    </div>
  </div>
</template>
