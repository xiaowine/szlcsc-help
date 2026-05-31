<script setup lang="ts">
defineEmits<{ 'toggle-info': [] }>()
</script>

<template>
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">
        <i class="fas fa-ticket-alt"></i>
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
        <i class="fab fa-github"></i>
      </a>
      <button class="topbar-btn topbar-btn--primary" @click="$emit('toggle-info')">
        <i class="fas fa-info-circle"></i>
        <span>使用说明</span>
      </button>
    </nav>
  </header>
</template>
