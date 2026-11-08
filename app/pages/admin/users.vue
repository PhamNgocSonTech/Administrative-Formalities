<script setup lang="ts">
import { Users } from 'lucide-vue-next'
definePageMeta({ layout: 'admin' })
</script>
<template>
  <AdminStubPage
    title="Tài khoản"
    description="Quản lý tài khoản nội bộ với 3 vai trò: Quản trị hệ thống, Biên tập TTHC, Phê duyệt. Một tài khoản có thể kiêm quyền."
    :icon="Users"
  />
</template>
