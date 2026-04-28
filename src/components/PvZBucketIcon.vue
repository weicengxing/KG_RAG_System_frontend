<template>
  <svg
    class="pvz-bucket-icon"
    viewBox="0 0 64 64"
    role="img"
    aria-label="铁桶"
  >
    <path
      class="bucket-handle"
      d="M18 23 C18 8 46 8 46 23"
    />
    <path
      class="bucket-body-shadow"
      d="M15 20 H49 L44 56 H20 Z"
    />
    <path
      class="bucket-body"
      d="M17 19 H47 L43 54 H21 Z"
    />
    <path
      class="bucket-rim"
      d="M13 16 H51 V25 H13 Z"
    />
    <path
      class="bucket-lip"
      d="M17 25 H47"
    />
    <path
      class="bucket-highlight"
      d="M25 24 L24 48"
    />
    <path
      class="bucket-dent"
      d="M35 34 C39 31 43 33 43 37"
    />
  </svg>
</template>

<style scoped>
.pvz-bucket-icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  overflow: visible;
  vertical-align: -0.12em;
}

.bucket-handle,
.bucket-lip,
.bucket-highlight,
.bucket-dent {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bucket-handle {
  stroke: #0f172a;
  stroke-width: 4;
}

.bucket-body-shadow,
.bucket-body,
.bucket-rim {
  stroke: #0f172a;
  stroke-width: 4;
  stroke-linejoin: round;
}

.bucket-body-shadow {
  fill: #475569;
  opacity: 0.7;
}

.bucket-body {
  fill: #94a3b8;
}

.bucket-rim {
  fill: #cbd5e1;
}

.bucket-lip {
  stroke: #64748b;
  stroke-width: 3;
}

.bucket-highlight {
  stroke: #e2e8f0;
  stroke-width: 4;
}

.bucket-dent {
  stroke: #64748b;
  stroke-width: 3;
}
</style>
