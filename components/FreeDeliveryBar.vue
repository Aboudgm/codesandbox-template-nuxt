<template>
  <div class="fdb">
    <p class="fdb__label">
      <template v-if="remaining > 0">
        <i class="fa-solid fa-truck-fast"></i>
        Add <strong>${{ remaining.toFixed(2) }}</strong> more for
        <strong>free delivery</strong>
      </template>
      <template v-else>
        <i class="fa-solid fa-circle-check"></i>
        <strong>You've unlocked free delivery!</strong> 🎉
      </template>
    </p>
    <div class="fdb__track">
      <div class="fdb__fill" :style="{ width: pct + '%' }"></div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { FREE_DELIVERY_THRESHOLD } from '~/store'

export default {
  name: 'FreeDeliveryBar',
  computed: {
    ...mapGetters(['subtotal', 'amountToFreeDelivery']),
    remaining() {
      return this.amountToFreeDelivery
    },
    pct() {
      return Math.min(100, (this.subtotal / FREE_DELIVERY_THRESHOLD) * 100)
    },
  },
}
</script>

<style scoped>
.fdb {
  background: var(--green-50);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
}
.fdb__label {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
}
.fdb__label i {
  color: var(--green-600);
}
.fdb__track {
  height: 8px;
  border-radius: 999px;
  background: #dfeede;
  overflow: hidden;
}
.fdb__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--green-500), var(--green-600));
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
