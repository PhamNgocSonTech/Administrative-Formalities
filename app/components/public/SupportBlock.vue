<script setup lang="ts">
import { Phone } from 'lucide-vue-next'

interface Contact {
  label: string
  phone: string
  note?: string | null
}
interface Support {
  scope?: string
  sector?: string
  contacts?: Contact[]
  message?: string
}

const props = defineProps<{ support: Support | null | undefined }>()

const phoneHref = (p: string) => `tel:${p.replace(/[^0-9+]/g, '')}`
</script>

<template>
  <div v-if="!support || !support.contacts?.length">
    <p class="text-sm text-muted-foreground">
      {{ (support && support.message) || 'Chưa có thông tin số điện thoại hỗ trợ.' }}
    </p>
  </div>
  <div v-else class="space-y-3">
    <p class="text-sm">
      <template v-if="support.scope === 'linh_vuc'">
        Đầu mối hỗ trợ lĩnh vực <strong>{{ support.sector }}</strong>:
      </template>
      <template v-else>
        Số điện thoại hỗ trợ chung:
      </template>
    </p>
    <ul class="divide-y border rounded-lg bg-card">
      <li
        v-for="(c, i) in support.contacts"
        :key="i"
        class="flex items-center justify-between gap-4 px-4 py-3"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium">{{ c.label }}</p>
          <p v-if="c.note" class="text-xs text-muted-foreground mt-0.5">{{ c.note }}</p>
        </div>
        <a
          :href="phoneHref(c.phone)"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-mono font-semibold text-sm transition-colors"
        >
          <Phone class="size-3.5" />
          {{ c.phone }}
        </a>
      </li>
    </ul>
  </div>
</template>
