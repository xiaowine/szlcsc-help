<script setup lang="ts">
import Icon from "./Icon.vue";

defineEmits<{ 'toggle-info': [] }>()
</script>

<template>
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">
        <Icon name="ticket" />
      </div>
      <h1 class="topbar-title">立创商城优惠券助手</h1>
    </div>

    <nav class="topbar-nav">
      <a
        href="https://github.com/xiaowine/szlcsc-help"
        target="_blank"
        rel="noopener noreferrer"
        class="topbar-btn"
        aria-label="GitHub 源码"
      >
        <Icon name="github" />
      </a>
      <button class="topbar-btn topbar-btn--primary" @click="$emit('toggle-info')">
        <Icon name="circle-info" />
        <span>使用说明</span>
      </button>
    </nav>
  </header>
</template>
