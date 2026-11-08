<script setup lang="ts">
import { diffWordsWithSpace } from 'diff'

const props = defineProps<{ before: string; after: string }>()

const parts = computed(() => {
  try {
    return diffWordsWithSpace(props.before || '', props.after || '')
  } catch {
    return [{ value: props.before || '', added: false, removed: false }]
  }
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 text-sm">
    <div class="rounded-md border bg-muted/20 p-3">
      <div class="text-xs font-medium text-muted-foreground mb-2">Hiện tại</div>
      <pre class="whitespace-pre-wrap font-sans text-foreground"><template v-for="(p, i) in parts" :key="`l${i}`"><span v-if="p.removed" class="bg-destructive/15 text-destructive-foreground line-through decoration-destructive/60">{{ p.value }}</span><span v-else-if="!p.added">{{ p.value }}</span></template></pre>
    </div>
    <div class="rounded-md border bg-muted/20 p-3">
      <div class="text-xs font-medium text-muted-foreground mb-2">AI đề xuất</div>
      <pre class="whitespace-pre-wrap font-sans text-foreground"><template v-for="(p, i) in parts" :key="`r${i}`"><span v-if="p.added" class="bg-success/20 text-success-foreground">{{ p.value }}</span><span v-else-if="!p.removed">{{ p.value }}</span></template></pre>
    </div>
  </div>
</template>
