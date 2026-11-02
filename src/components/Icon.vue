<script setup lang="ts">
import { icons, type IconName } from "../icons";

defineProps<{ name: IconName }>();
</script>

<template>
  <svg
    class="icon"
    :viewBox="`0 0 ${icons[name].width} 512`"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="icons[name].path" />
  </svg>
</template>
