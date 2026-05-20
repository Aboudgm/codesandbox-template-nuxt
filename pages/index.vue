<template>
  <CityBuilder />
</template>

<script lang="ts">
import Vue from 'vue'
import CityBuilder from '~/components/CityBuilder.vue'

export default Vue.extend({
  name: 'IndexPage',
  components: { CityBuilder },
})
</script>
