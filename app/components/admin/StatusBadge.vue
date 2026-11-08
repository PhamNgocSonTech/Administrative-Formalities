<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const props = defineProps<{ status: string; label?: string }>()
const text = computed(() => props.label ?? STATUS_LABEL[props.status] ?? props.status)

const variant = computed<'default' | 'secondary' | 'destructive' | 'outline'>(() => {
  switch (props.status) {
    case 'published':
    case 'approved':
    case 'confirmed':
      return 'default'
    case 'rejected':
    case 'cancelled':
      return 'destructive'
    case 'superseded':
    case 'withdrawn':
    case 'unused':
      return 'outline'
    default:
      return 'secondary'
  }
})

const extraClass = computed(() => {
  switch (props.status) {
    case 'published':
    case 'approved':
    case 'confirmed':
      return 'bg-success text-success-foreground hover:bg-success/90'
    case 'pending_approval':
    case 'needs_review':
    case 'needs_fix':
    case 'proposed':
      return 'bg-warning text-warning-foreground hover:bg-warning/90'
    default:
      return ''
  }
})
</script>

<template>
  <Badge :variant="variant" :class="cn('font-normal', extraClass)">{{ text }}</Badge>
</template>
