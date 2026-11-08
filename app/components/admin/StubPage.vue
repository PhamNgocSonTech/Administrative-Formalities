<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction, Info } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  description?: string
  icon?: any
}>()

const { toast } = useToast()

onMounted(() => {
  toast.info(`${props.title} — đang phát triển, chưa khả dụng`)
})
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <component :is="icon || Construction" class="size-5" />
        </div>
        <div class="flex-1">
          <CardTitle class="text-xl">{{ title }}</CardTitle>
          <CardDescription v-if="description" class="mt-1">{{ description }}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div class="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 text-sm px-3 py-2.5">
        <Info class="size-4 mt-0.5 text-warning" />
        <span>
          Màn hình này sẽ được migrate ở các turn tiếp theo. Logic nghiệp vụ tham khảo
          <code class="font-mono">tthc-tra-cuu-main/frontend/assets/admin.js</code>
          và <code class="font-mono">tthc-tra-cuu-main/docs/</code>.
        </span>
      </div>
      <slot />
    </CardContent>
  </Card>
</template>
