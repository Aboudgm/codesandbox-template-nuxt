<template>
  <NeumorphicMusicPlayer />
</template>

<script lang="ts">
import Vue from 'vue'
import NeumorphicMusicPlayer from '~/components/NeumorphicMusicPlayer.vue'

export default Vue.extend({
  name: 'IndexPage',
  components: {
    NeumorphicMusicPlayer,
  },
})
</script>
