<template>
  <div class="stepper" :class="{ 'stepper--sm': small }">
    <button
      class="stepper__btn"
      aria-label="Decrease quantity"
      @click="change(-1)"
    >
      <i class="fa-solid fa-minus"></i>
    </button>
    <span class="stepper__val">{{ value }}</span>
    <button
      class="stepper__btn"
      aria-label="Increase quantity"
      @click="change(1)"
    >
      <i class="fa-solid fa-plus"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'QtyStepper',
  props: {
    value: { type: Number, default: 1 },
    min: { type: Number, default: 0 },
    small: { type: Boolean, default: false },
  },
  methods: {
    change(delta) {
      const next = Math.max(this.min, this.value + delta)
      this.$emit('input', next)
      this.$emit('change', next)
    },
  },
}
</script>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  background: var(--green-50);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
}
.stepper__btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 0;
  background: #fff;
  color: var(--green-700);
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  box-shadow: var(--shadow-sm);
  transition: background 0.15s ease, transform 0.1s ease;
}
.stepper__btn:hover {
  background: var(--green-100);
}
.stepper__btn:active {
  transform: scale(0.92);
}
.stepper__val {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.stepper--sm .stepper__btn {
  width: 28px;
  height: 28px;
  font-size: 0.7rem;
}
.stepper--sm .stepper__val {
  min-width: 24px;
  font-size: 0.9rem;
}
</style>
