<template>
  <div class="bg-surface text-on-surface antialiased h-screen overflow-hidden flex font-sans">
    <AdminSideNav />
    <main class="ml-64 flex-1 h-screen overflow-y-auto bg-background px-margin-desktop py-stack-lg">
      <slot />
    </main>
  </div>
</template>
