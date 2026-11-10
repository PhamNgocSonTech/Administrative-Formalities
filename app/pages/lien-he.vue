<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Phone } from 'lucide-vue-next'

definePageMeta({ layout: 'public' })

useHead({ title: 'Liên hệ hỗ trợ — Tra cứu TTHC Công Thương' })

interface Contacts {
  general: any
  sectors: Array<{ sector: string; contacts: any[] }>
}

const { get } = usePublicApi()

const { data, pending, error } = await useAsyncData(
  'public-contacts',
  () => get<Contacts>('/api/public/contacts'),
)
</script>

<template>
  <div class="space-y-6">
    <header class="text-center space-y-3 pt-4">
      <Phone class="size-12 mx-auto text-primary" />
      <h1 class="text-3xl font-bold tracking-tight">Liên hệ hỗ trợ</h1>
      <p class="text-muted-foreground">Số điện thoại do cơ quan cấu hình chính thức.</p>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <div v-if="pending" class="space-y-4">
      <Skeleton class="h-32 w-full" />
      <Skeleton class="h-32 w-full" />
    </div>

    <div v-else-if="data" class="space-y-6">
      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Số hỗ trợ chung</h2>
        <PublicSupportBlock :support="data.general" />
      </section>

      <section
        v-for="s in data.sectors"
        :key="s.sector"
        class="space-y-3"
      >
        <h2 class="text-xl font-semibold">{{ s.sector }}</h2>
        <PublicSupportBlock :support="{ scope: 'linh_vuc', sector: s.sector, contacts: s.contacts }" />
      </section>
    </div>
  </div>
</template>
