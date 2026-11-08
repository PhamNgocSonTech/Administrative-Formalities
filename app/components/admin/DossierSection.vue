<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

interface Line { t: string; hl?: boolean }
interface Node {
  title?: string
  level?: number
  lines?: Line[]
  children?: Node[]
}

const props = defineProps<{ node: Node; defaultOpen?: boolean; forceOpen?: boolean }>()

const open = ref(props.defaultOpen ?? false)
watch(() => props.forceOpen, (v) => { if (v) open.value = true })
</script>

<template>
  <div class="rounded-md border bg-card">
    <button
      class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-accent/40 transition-colors"
      @click="open = !open"
    >
      <ChevronRight class="size-4 text-muted-foreground transition-transform" :class="open ? 'rotate-90' : ''" />
      <span>{{ node.title }}</span>
    </button>
    <div v-if="open" class="px-3 pb-3 pl-9 space-y-1">
      <p
        v-for="(l, i) in (node.lines || [])"
        :key="`l${i}`"
        class="text-sm"
      >
        <mark v-if="l.hl" class="bg-amber-200 text-foreground px-0.5 rounded">{{ l.t }}</mark>
        <template v-else>{{ l.t }}</template>
      </p>
      <AdminDossierSection
        v-for="(c, i) in (node.children || [])"
        :key="`c${i}`"
        :node="c"
        :default-open="false"
        :force-open="forceOpen"
        class="ml-2"
      />
    </div>
  </div>
</template>
