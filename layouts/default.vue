<template>
  <div class="app">
    <AppHeader />
    <main>
      <Nuxt />
    </main>
    <AppFooter />
    <CartDrawer />
    <ToastStack />
  </div>
</template>

<script>
export default {
  name: 'DefaultLayout',
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
main {
  flex: 1;
}
</style>
