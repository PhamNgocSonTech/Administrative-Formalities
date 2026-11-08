<script setup lang="ts">
import { Phone } from 'lucide-vue-next'
definePageMeta({ layout: 'admin' })
</script>
<template>
  <AdminStubPage
    title="Lĩnh vực & số hỗ trợ"
    description="Danh mục lĩnh vực TTHC, số hotline theo lĩnh vực và số chung — dùng cho chatbot khi câu ngoài phạm vi."
    :icon="Phone"
  />
</template>
