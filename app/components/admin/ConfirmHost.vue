<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Info, HelpCircle } from 'lucide-vue-next'

const state = useConfirmState()

const icon = computed(() => {
  switch (state.value.variant) {
    case 'destructive': return AlertTriangle
    case 'warning': return AlertTriangle
    default: return HelpCircle
  }
})
const iconColor = computed(() => {
  switch (state.value.variant) {
    case 'destructive': return 'text-destructive'
    case 'warning': return 'text-warning'
    default: return 'text-primary'
  }
})
const buttonVariant = computed<'default' | 'destructive'>(() =>
  state.value.variant === 'destructive' ? 'destructive' : 'default',
)

function decide(v: boolean) {
  state.value.resolve?.(v)
  state.value.resolve = null
  state.value.open = false
}
</script>

<template>
  <Dialog
    :open="state.open"
    @update:open="(v) => !v && decide(false)"
  >
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <component :is="icon" class="size-5" :class="iconColor" />
          {{ state.title }}
        </DialogTitle>
        <DialogDescription v-if="state.description" class="whitespace-pre-line pt-1">
          {{ state.description }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="decide(false)">{{ state.cancelText }}</Button>
        <Button :variant="buttonVariant" @click="decide(true)">{{ state.confirmText }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
