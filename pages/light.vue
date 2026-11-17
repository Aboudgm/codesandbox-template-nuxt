<template>
  <client-only>
    <LightRoom />
  </client-only>
</template>

<script>
export default {
  name: 'LightPage',
  head() {
    return {
      title: 'A small light in an empty room',
      bodyAttrs: { style: 'margin:0;overflow:hidden' },
    }
  },
}
</script>
