<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui'
import { AlertTriangle, HelpCircle } from 'lucide-vue-next'

/**
 * Dialog xác nhận toàn cục dùng với useConfirm().
 * Dùng reka-ui primitives trực tiếp để kiểm soát overlay — khi mở chồng
 * lên một Dialog khác (vd. AI viewer), overlay nhạt hơn, không gây đen màn.
 */
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
  <DialogRoot
    :open="state.open"
    @update:open="(v) => !v && decide(false)"
  >
    <DialogPortal>
      <!-- Overlay rất nhạt (bg-black/30) — tránh đen màn khi chồng lên dialog khác -->
      <DialogOverlay
        class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[61] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-xl rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div class="flex flex-col gap-2">
          <DialogTitle class="text-lg font-semibold flex items-center gap-2">
            <component :is="icon" class="size-5" :class="iconColor" />
            {{ state.title }}
          </DialogTitle>
          <DialogDescription v-if="state.description" class="text-sm text-muted-foreground whitespace-pre-line">
            {{ state.description }}
          </DialogDescription>
        </div>
        <div class="flex items-center justify-end gap-2">
          <Button variant="outline" @click="decide(false)">{{ state.cancelText }}</Button>
          <Button :variant="buttonVariant" @click="decide(true)">{{ state.confirmText }}</Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
