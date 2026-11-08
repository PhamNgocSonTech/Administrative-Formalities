<script setup lang="ts">
import { History } from 'lucide-vue-next'
definePageMeta({ layout: 'admin' })
</script>
<template>
  <AdminStubPage
    title="Nhật ký"
    description="Mọi thao tác tạo/sửa/duyệt/phát hành/rollback đều được ghi lại."
    :icon="History"
  />
</template>
