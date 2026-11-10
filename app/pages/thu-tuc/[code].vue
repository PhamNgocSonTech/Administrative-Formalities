<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ChevronRight,
  Home,
  Download,
  Printer,
  FileText,
  Phone,
  Gavel,
  AlertTriangle,
  ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ layout: 'public' })

const FIELD_ORDER = [
  ['trinh_tu', 'Trình tự thực hiện'],
  ['cach_thuc', 'Cách thức thực hiện'],
  ['ho_so', 'Thành phần, số lượng hồ sơ'],
  ['thoi_han', 'Thời hạn giải quyết'],
  ['doi_tuong', 'Đối tượng thực hiện'],
  ['co_quan', 'Cơ quan giải quyết'],
  ['ket_qua', 'Kết quả thực hiện'],
  ['phi_le_phi', 'Phí, lệ phí'],
  ['mau_don', 'Tên mẫu đơn, mẫu tờ khai'],
  ['dieu_kien', 'Yêu cầu, điều kiện thực hiện'],
  ['can_cu', 'Căn cứ pháp lý'],
] as const

interface FieldValue {
  value?: string
  layout?: any
}
interface FormFile {
  id: number
  label: string
  title?: string
}
interface Procedure {
  code: string
  name: string
  sector?: string | null
  version_no: number
  published_at: string
  abolished?: { message: string } | null
  fields: Record<string, FieldValue>
  forms: {
    application: FormFile[]
    result: FormFile[]
  }
  primary_decision: any
  related_decisions: any[]
  decision_history: any[]
  support: any
}

const route = useRoute()
const { get } = usePublicApi()

const { data, pending, error } = await useAsyncData(
  () => `public-procedure-${route.params.code}`,
  () => get<Procedure>(`/api/public/procedures/${encodeURIComponent(route.params.code as string)}`),
)

useHead({
  title: computed(() => (data.value ? `${data.value.name} — Tra cứu TTHC Công Thương` : 'Chi tiết thủ tục')),
})

const d = computed(() => data.value)
const abolishedMsg = computed(() => {
  if (error.value && (error.value as any).status === 410) {
    return (error.value as any).data?.message ?? 'Thủ tục đã bị bãi bỏ hoặc ngừng công khai.'
  }
  return null
})

function firstLine(k: string): string {
  const v = d.value?.fields?.[k]?.value ?? ''
  const line = v.trim().split('\n')[0]
  return line || '—'
}

function doPrint() {
  if (import.meta.client) window.print()
}
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <Skeleton class="h-6 w-48" />
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-40 w-full" />
  </div>

  <div v-else-if="abolishedMsg" class="space-y-4">
    <NuxtLink to="/" class="text-sm text-primary hover:underline inline-flex items-center gap-1">
      <ChevronRight class="size-4 rotate-180" /> Tra cứu
    </NuxtLink>
    <Alert variant="default" class="border-warning/40 bg-warning/5">
      <AlertTriangle class="size-4 text-warning" />
      <AlertTitle>Thủ tục {{ route.params.code }}</AlertTitle>
      <AlertDescription>{{ abolishedMsg }}</AlertDescription>
    </Alert>
  </div>

  <div v-else-if="error">
    <Alert variant="destructive">
      <AlertTitle>Không tải được thủ tục</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>
  </div>

  <article v-else-if="d" class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Đường dẫn">
      <NuxtLink to="/" class="hover:text-primary flex items-center gap-1">
        <Home class="size-3.5" /> Tra cứu
      </NuxtLink>
      <ChevronRight class="size-3.5" />
      <span class="text-foreground font-mono">{{ d.code }}</span>
    </nav>

    <!-- Abolished warning -->
    <Alert v-if="d.abolished" variant="default" class="border-warning/40 bg-warning/5">
      <AlertTriangle class="size-4 text-warning" />
      <AlertTitle>Đã bị bãi bỏ</AlertTitle>
      <AlertDescription>{{ d.abolished.message }}</AlertDescription>
    </Alert>

    <!-- Hero -->
    <header class="space-y-4 pb-6 border-b">
      <div class="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
        <span>Mã thủ tục:</span>
        <span class="font-mono font-bold text-foreground">{{ d.code }}</span>
        <Badge v-if="d.sector" variant="secondary" class="font-normal">{{ d.sector }}</Badge>
      </div>
      <h1 class="text-3xl font-bold tracking-tight">{{ d.name }}</h1>

      <!-- Facts grid -->
      <dl class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        <div class="rounded-md border bg-card p-3">
          <dt class="text-xs text-muted-foreground mb-1">Đối tượng</dt>
          <dd class="text-sm font-medium">{{ firstLine('doi_tuong') }}</dd>
        </div>
        <div class="rounded-md border bg-card p-3">
          <dt class="text-xs text-muted-foreground mb-1">Cơ quan</dt>
          <dd class="text-sm font-medium">{{ firstLine('co_quan') }}</dd>
        </div>
        <div class="rounded-md border bg-card p-3">
          <dt class="text-xs text-muted-foreground mb-1">Thời hạn</dt>
          <dd class="text-sm font-medium">{{ firstLine('thoi_han') }}</dd>
        </div>
        <div class="rounded-md border bg-card p-3">
          <dt class="text-xs text-muted-foreground mb-1">Phí, lệ phí</dt>
          <dd class="text-sm font-medium">{{ firstLine('phi_le_phi') }}</dd>
        </div>
        <div v-if="d.primary_decision" class="rounded-md border bg-card p-3">
          <dt class="text-xs text-muted-foreground mb-1">Quyết định công bố</dt>
          <dd class="text-sm font-medium">
            <a href="#quyet-dinh" class="text-primary hover:underline">{{ d.primary_decision.number }}</a>
          </dd>
        </div>
        <div class="rounded-md border bg-card p-3">
          <dt class="text-xs text-muted-foreground mb-1">Cập nhật</dt>
          <dd class="text-sm font-medium">{{ fmtPublicDate(d.published_at) }} · PB {{ d.version_no }}</dd>
        </div>
      </dl>

      <div class="flex items-center gap-2 pt-2">
        <a href="#bieu-mau">
          <Button>
            <Download class="size-4 mr-2" /> Tải biểu mẫu Word
          </Button>
        </a>
        <Button variant="outline" @click="doPrint">
          <Printer class="size-4 mr-2" /> In hướng dẫn
        </Button>
      </div>
    </header>

    <!-- 2-col: TOC + Content -->
    <div class="grid lg:grid-cols-[220px_1fr] gap-8">
      <!-- TOC sticky -->
      <nav class="hidden lg:block sticky top-20 self-start" aria-label="Mục lục">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mục lục</p>
        <ul class="space-y-1 text-sm">
          <li v-for="[k, t] in FIELD_ORDER" :key="k">
            <a
              :href="`#f-${k}`"
              class="block px-2 py-1 rounded hover:bg-accent hover:text-primary transition-colors text-muted-foreground"
            >{{ t }}</a>
          </li>
          <li><a href="#bieu-mau" class="block px-2 py-1 rounded hover:bg-accent hover:text-primary transition-colors text-muted-foreground">Biểu mẫu</a></li>
          <li><a href="#quyet-dinh" class="block px-2 py-1 rounded hover:bg-accent hover:text-primary transition-colors text-muted-foreground">Quyết định công bố</a></li>
          <li><a href="#ho-tro" class="block px-2 py-1 rounded hover:bg-accent hover:text-primary transition-colors text-muted-foreground">Hỗ trợ</a></li>
        </ul>
      </nav>

      <!-- Content -->
      <div class="space-y-8 min-w-0">
        <section
          v-for="[k, t] in FIELD_ORDER"
          :key="k"
          :id="`f-${k}`"
          class="scroll-mt-20"
        >
          <h2 class="text-xl font-semibold mb-3">{{ t }}</h2>
          <AdminDossierTree
            v-if="d.fields?.[k]?.layout"
            :tree="d.fields[k].layout"
          />
          <div v-else class="prose prose-sm max-w-none">
            <pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-card border rounded-md p-4">{{ d.fields?.[k]?.value || '—' }}</pre>
          </div>
        </section>

        <!-- Forms -->
        <section id="bieu-mau" class="scroll-mt-20">
          <h2 class="text-xl font-semibold mb-3">Biểu mẫu</h2>
          <div class="space-y-5">
            <div v-if="d.forms.application.length">
              <h3 class="text-sm font-semibold text-muted-foreground mb-2">Mẫu đơn, tờ khai (người nộp hồ sơ)</h3>
              <ul class="space-y-2">
                <li
                  v-for="f in d.forms.application"
                  :key="f.id"
                  class="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                >
                  <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">W</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">{{ f.label }}</p>
                    <p v-if="f.title" class="text-xs text-muted-foreground">{{ f.title }}</p>
                  </div>
                  <a :href="`/api/public/forms/${f.id}/download`" download>
                    <Button variant="outline" size="sm">
                      <Download class="size-3.5 mr-1" /> Tải Word
                    </Button>
                  </a>
                </li>
              </ul>
            </div>
            <div v-if="d.forms.result.length">
              <h3 class="text-sm font-semibold text-muted-foreground mb-2">Mẫu kết quả giải quyết (để tham khảo)</h3>
              <ul class="space-y-2">
                <li
                  v-for="f in d.forms.result"
                  :key="f.id"
                  class="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                >
                  <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">W</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">{{ f.label }}</p>
                    <p v-if="f.title" class="text-xs text-muted-foreground">{{ f.title }}</p>
                  </div>
                  <a :href="`/api/public/forms/${f.id}/download`" download>
                    <Button variant="outline" size="sm">
                      <Download class="size-3.5 mr-1" /> Tải Word
                    </Button>
                  </a>
                </li>
              </ul>
            </div>
            <p v-if="!d.forms.application.length && !d.forms.result.length" class="text-sm text-muted-foreground">
              Thủ tục này chưa có biểu mẫu đi kèm.
            </p>
          </div>
        </section>

        <!-- Decisions -->
        <section id="quyet-dinh" class="scroll-mt-20 space-y-4">
          <h2 class="text-xl font-semibold">Quyết định công bố</h2>
          <PublicDecisionCard v-if="d.primary_decision" :decision="d.primary_decision" primary />
          <template v-if="d.related_decisions.length">
            <h3 class="text-sm font-semibold text-muted-foreground mt-6">Quyết định liên quan</h3>
            <PublicDecisionCard v-for="x in d.related_decisions" :key="x.id" :decision="x" />
          </template>
          <details v-if="d.decision_history.length" class="rounded-md border bg-card">
            <summary class="px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2">
              <ChevronDown class="size-4 text-muted-foreground" />
              Lịch sử Quyết định công bố ({{ d.decision_history.length }})
            </summary>
            <div class="px-4 pb-4 space-y-4">
              <PublicDecisionCard v-for="x in d.decision_history" :key="x.id" :decision="x" />
            </div>
          </details>
        </section>

        <!-- Support -->
        <section id="ho-tro" class="scroll-mt-20">
          <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
            <Phone class="size-5" /> Hỗ trợ
          </h2>
          <PublicSupportBlock :support="d.support" />
        </section>
      </div>
    </div>
  </article>
</template>

<style>
@media print {
  header.sticky, nav[aria-label="Điều hướng chính"], nav[aria-label="Mục lục"], footer, .btn { display: none !important; }
  .scroll-mt-20 { scroll-margin-top: 0; }
}
</style>
