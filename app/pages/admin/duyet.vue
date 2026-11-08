<script setup lang="ts">
import { FileCheck } from 'lucide-vue-next'
definePageMeta({ layout: 'admin' })
</script>
<template>
  <AdminStubPage
    title="Chờ duyệt"
    description="Danh sách phiên bản TTHC và QĐ đang chờ phê duyệt công khai."
    :icon="FileCheck"
  />
</template>
