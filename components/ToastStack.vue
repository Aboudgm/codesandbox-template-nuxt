<template>
  <div class="toasts" aria-live="polite">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type || 'success'}`"
      >
        <i :class="icon(t.type)"></i>
        <span class="toast__msg">{{ t.message }}</span>
        <button class="toast__x" aria-label="Dismiss" @click="dismiss(t.id)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'ToastStack',
  data() {
    return { timers: {} }
  },
  computed: {
    toasts() {
      return this.$store.state.toasts
    },
  },
  watch: {
    toasts(list) {
      list.forEach((t) => {
        if (!this.timers[t.id]) {
          this.timers[t.id] = setTimeout(() => this.dismiss(t.id), 3200)
        }
      })
    },
  },
  beforeDestroy() {
    Object.values(this.timers).forEach(clearTimeout)
  },
  methods: {
    dismiss(id) {
      clearTimeout(this.timers[id])
      delete this.timers[id]
      this.$store.commit('DISMISS_TOAST', id)
    },
    icon(type) {
      if (type === 'info') return 'fa-solid fa-circle-info'
      if (type === 'error') return 'fa-solid fa-triangle-exclamation'
      return 'fa-solid fa-circle-check'
    },
  },
}
</script>

<style scoped>
.toasts {
  position: fixed;
  z-index: 1200;
  bottom: 22px;
  right: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(360px, calc(100vw - 32px));
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--line);
  border-left: 4px solid var(--green-600);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  box-shadow: var(--shadow);
  font-size: 0.88rem;
}
.toast i {
  color: var(--green-600);
}
.toast--info {
  border-left-color: #1e6fc4;
}
.toast--info i {
  color: #1e6fc4;
}
.toast--error {
  border-left-color: var(--danger);
}
.toast--error i {
  color: var(--danger);
}
.toast__msg {
  flex: 1;
}
.toast__x {
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 2px;
}
.toast__x:hover {
  color: var(--ink);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
