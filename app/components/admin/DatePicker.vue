<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarDate, parseDate, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon, X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

/**
 * Date picker đồng bộ với design system shadcn.
 * v-model trả string ISO date 'YYYY-MM-DD' (hoặc '' khi trống).
 */
const props = defineProps<{
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [v: string]
}>()

const open = ref(false)

const calValue = computed<CalendarDate | undefined>(() => {
  if (!props.modelValue) return undefined
  try {
    return parseDate(props.modelValue)
  } catch { return undefined }
})

function setDate(v: CalendarDate | undefined) {
  emit('update:modelValue', v ? v.toString() : '')
  if (v) open.value = false
}

function clear() {
  emit('update:modelValue', '')
}

const display = computed(() => {
  if (!calValue.value) return ''
  const d = calValue.value
  const dd = String(d.day).padStart(2, '0')
  const mm = String(d.month).padStart(2, '0')
  return `${dd}/${mm}/${d.year}`
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :disabled="disabled"
        :class="cn('w-full justify-start text-left font-normal h-9', !modelValue && 'text-muted-foreground')"
      >
        <CalendarIcon class="size-4 mr-2 shrink-0" />
        <span class="flex-1">{{ display || placeholder || 'Chọn ngày' }}</span>
        <button
          v-if="modelValue && !disabled"
          type="button"
          tabindex="-1"
          class="p-0.5 rounded hover:bg-accent text-muted-foreground"
          :aria-label="'Xóa'"
          @click.stop="clear"
        >
          <X class="size-3.5" />
        </button>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        :model-value="calValue"
        @update:model-value="setDate"
        :weekday-format="'short'"
      />
    </PopoverContent>
  </Popover>
</template>
