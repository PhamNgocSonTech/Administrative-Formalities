<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronLeft, ChevronRight, FileSearch } from 'lucide-vue-next'

definePageMeta({ layout: 'public' })

interface Procedure {
  code: string
  name: string
  sector?: string | null
  summary?: string | null
}
interface SearchResult {
  items: Procedure[]
  total: number
  page: number
  size: number
  pages: number
}
interface Sector {
  name: string
  count: number
}

const { get } = usePublicApi()
const route = useRoute()
const router = useRouter()

const q = ref((route.query.q as string) || '')
const sector = ref((route.query['linh-vuc'] as string) || '')
const page = ref(Math.max(1, parseInt((route.query.trang as string) || '1', 10) || 1))

useHead({
  title: computed(() =>
    q.value
      ? `Tìm "${q.value}" — Tra cứu TTHC Công Thương`
      : 'Tra cứu thủ tục hành chính ngành Công Thương',
  ),
})

const { data, pending, error } = await useAsyncData(
  () => `public-procedures-${q.value}-${sector.value}-${page.value}`,
  async () => {
    const params = new URLSearchParams({
      ...(q.value && { q: q.value }),
      ...(sector.value && { sector: sector.value }),
      page: String(page.value),
      size: '10',
    })
    const [res, sectors] = await Promise.all([
      get<SearchResult>(`/api/public/procedures?${params}`),
      get<Sector[]>('/api/public/sectors'),
    ])
    return { res, sectors }
  },
  { watch: [q, sector, page] },
)

function submitSearch(e: Event) {
  e.preventDefault()
  page.value = 1
  updateUrl()
}

function selectSector(name: string) {
  sector.value = name
  page.value = 1
  updateUrl()
}

function goPage(p: number) {
  page.value = p
  updateUrl()
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateUrl() {
  const query: Record<string, string> = {}
  if (q.value) query.q = q.value
  if (sector.value) query['linh-vuc'] = sector.value
  if (page.value > 1) query.trang = String(page.value)
  router.push({ path: '/', query })
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero + search -->
    <section class="text-center space-y-5 pt-6 pb-2">
      <h1 class="text-4xl font-bold tracking-tight">Tra cứu thủ tục hành chính</h1>
      <p class="text-muted-foreground max-w-xl mx-auto">
        Tìm theo mã, tên thủ tục hoặc từ khóa — gõ có dấu hoặc không dấu đều được.
      </p>
      <form @submit="submitSearch" role="search" class="max-w-2xl mx-auto flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            v-model="q"
            name="q"
            placeholder="vd. 1.000366 hoặc 'giấy phép quá cảnh'"
            class="pl-10 h-11 text-base"
            autocomplete="off"
          />
        </div>
        <Button type="submit" class="h-11 px-6">Tìm</Button>
      </form>
    </section>

    <!-- Sector chips -->
    <div v-if="data?.sectors?.length" class="flex flex-wrap gap-2 justify-center" role="list">
      <button
        role="listitem"
        type="button"
        class="chip"
        :class="!sector ? 'on' : ''"
        @click="selectSector('')"
      >Tất cả</button>
      <button
        v-for="s in data.sectors"
        :key="s.name"
        role="listitem"
        type="button"
        class="chip"
        :class="s.name === sector ? 'on' : ''"
        @click="selectSector(s.name)"
      >
        {{ s.name }} <b>{{ s.count }}</b>
      </button>
    </div>

    <!-- Error -->
    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải danh sách</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <!-- Results -->
    <section v-if="pending" class="space-y-3">
      <Skeleton v-for="n in 5" :key="n" class="h-20 w-full" />
    </section>

    <section v-else-if="data?.res.items.length" class="space-y-3">
      <p class="text-sm text-muted-foreground">
        {{ data.res.total }} thủ tục
        <template v-if="q || sector">
          phù hợp
          <template v-if="q"> · từ khóa <strong class="text-foreground">"{{ q }}"</strong></template>
          <template v-if="sector"> · lĩnh vực <strong class="text-foreground">{{ sector }}</strong></template>
        </template>
      </p>

      <ul class="space-y-3">
        <li v-for="r in data.res.items" :key="r.code">
          <NuxtLink :to="`/thu-tuc/${encodeURIComponent(r.code)}`">
            <Card class="hover:border-primary/60 hover:shadow-sm transition-all">
              <CardContent class="pt-5 pb-5">
                <div class="flex items-start gap-3">
                  <span class="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0 mt-0.5">
                    {{ r.code }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-base text-foreground">{{ r.name }}</h3>
                    <div class="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge v-if="r.sector" variant="secondary" class="font-normal">{{ r.sector }}</Badge>
                      <span v-if="r.summary" class="text-sm text-muted-foreground">{{ r.summary }}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </NuxtLink>
        </li>
      </ul>

      <!-- Pager -->
      <div v-if="data.res.pages > 1" class="flex items-center justify-center gap-2 pt-4">
        <Button variant="outline" size="icon" :disabled="data.res.page <= 1" @click="goPage(data.res.page - 1)">
          <ChevronLeft class="size-4" />
        </Button>
        <span class="text-sm text-muted-foreground px-2">
          Trang <strong class="text-foreground">{{ data.res.page }}</strong> / {{ data.res.pages }}
        </span>
        <Button variant="outline" size="icon" :disabled="data.res.page >= data.res.pages" @click="goPage(data.res.page + 1)">
          <ChevronRight class="size-4" />
        </Button>
      </div>
    </section>

    <!-- Empty -->
    <section v-else class="max-w-xl mx-auto text-center space-y-4 py-12">
      <FileSearch class="size-16 mx-auto text-muted-foreground/40" />
      <template v-if="q || sector">
        <h2 class="text-xl font-semibold">Không tìm thấy thủ tục phù hợp</h2>
        <ul class="text-sm text-muted-foreground space-y-1">
          <li>Kiểm tra lại chính tả hoặc thử từ khóa ngắn hơn (có thể gõ không dấu).</li>
          <li>Tìm theo mã thủ tục, ví dụ <code class="bg-muted px-1 rounded">1.000366</code>.</li>
          <li v-if="sector">Bỏ bộ lọc lĩnh vực.</li>
        </ul>
        <p class="text-sm">
          Cần hỗ trợ?
          <NuxtLink to="/lien-he" class="text-primary hover:underline">Xem số điện thoại hỗ trợ</NuxtLink>.
        </p>
      </template>
      <template v-else>
        <h2 class="text-xl font-semibold">Chưa có thủ tục công khai</h2>
        <p class="text-sm text-muted-foreground">
          Hiện chưa có thủ tục nào được phê duyệt công khai. Vui lòng quay lại sau.
        </p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted-foreground);
  transition: all .15s;
  cursor: pointer;
}
.chip:hover { border-color: var(--color-primary); color: var(--color-foreground); }
.chip b {
  background: var(--color-muted);
  color: var(--color-foreground);
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.chip.on {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}
.chip.on b { background: color-mix(in oklch, var(--color-primary-foreground) 25%, transparent); color: var(--color-primary-foreground); }
</style>
