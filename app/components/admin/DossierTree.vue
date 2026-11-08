<script setup lang="ts">
interface Line { t: string; hl?: boolean }
interface Node {
  title?: string
  level?: number
  lines?: Line[]
  children?: Node[]
}
interface Tree {
  items?: Node[]
  intro?: Line[]
  sections?: Node[]
}

const props = defineProps<{ tree: Tree | null | undefined }>()

const items = computed<Node[]>(() => {
  const t = props.tree
  if (!t) return []
  if (t.items) return t.items
  return [{ lines: t.intro || [] }, ...(t.sections || [])]
})

const secs = computed(() => items.value.filter((x) => x.title))
const hasAny = computed(() => items.value.some((x) => x.title || (x.lines || []).length))
const showToolbar = computed(() => {
  const n = secs.value.length + secs.value.reduce((a, s) => a + (s.children || []).length, 0)
  return n > 1
})

const openAll = ref(false)
function toggleAll(open: boolean) { openAll.value = open }
</script>

<template>
  <div v-if="hasAny" class="dsr-list space-y-1">
    <div v-if="showToolbar" class="flex gap-2 mb-2">
      <button
        class="text-xs text-primary hover:underline"
        @click="toggleAll(true)"
      >Mở tất cả</button>
      <span class="text-muted-foreground">·</span>
      <button
        class="text-xs text-primary hover:underline"
        @click="toggleAll(false)"
      >Thu gọn tất cả</button>
    </div>

    <template v-for="(item, i) in items" :key="i">
      <!-- Intro / plain text lines -->
      <template v-if="!item.title">
        <p
          v-for="(l, li) in (item.lines || [])"
          :key="li"
          class="text-sm"
        >
          <mark v-if="l.hl" class="bg-amber-200 text-foreground px-0.5 rounded">{{ l.t }}</mark>
          <template v-else>{{ l.t }}</template>
        </p>
      </template>
      <!-- Section (details/summary) -->
      <AdminDossierSection
        v-else
        :node="item"
        :default-open="openAll || i === items.indexOf(secs[0])"
        :force-open="openAll"
      />
    </template>
  </div>
</template>
