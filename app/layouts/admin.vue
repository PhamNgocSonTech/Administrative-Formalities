<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <AdminTopProgressBar />
    <AdminTopNav />
    <main class="max-w-[1440px] mx-auto px-6 py-8">
      <slot />
    </main>
    <Toaster rich-colors position="top-right" />
    <AdminConfirmHost />
  </div>
</template>
