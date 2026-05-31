<script setup lang="ts">
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="visible"
        class="drawer-wrap"
        role="dialog"
        aria-modal="true"
        aria-label="使用说明"
      >
        <div class="drawer-backdrop" @click="emit('update:visible', false)" />
        <div class="drawer-panel">
          <div class="drawer-head">
            <h2 class="drawer-title">使用说明</h2>
            <button
              class="drawer-close"
              @click="emit('update:visible', false)"
              aria-label="关闭"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="drawer-body">
            <div class="drawer-card">
              <div class="drawer-card-icon"><i class="fas fa-info-circle"></i></div>
              <p>帮助选择立创商城领券中心优惠券的工具网站，按品牌分类展示。</p>
            </div>
            <div class="drawer-card">
              <div class="drawer-card-icon"><i class="fas fa-filter"></i></div>
              <p>只展示<strong>非新人专享</strong>、且优惠后最低消费 <strong>≤ 15 元</strong>的品牌优惠券。</p>
            </div>
            <div class="drawer-card">
              <div class="drawer-card-icon"><i class="fas fa-sort-amount-down"></i></div>
              <p>分类按平均领取量从高到低排列，券列表按领取数量排序，越靠前越热门。</p>
            </div>
            <div class="drawer-card">
              <div class="drawer-card-icon"><i class="fas fa-sync-alt"></i></div>
              <p>数据来源：立创商城优惠券中心，每月自动更新。</p>
            </div>
            <div class="drawer-card">
              <div class="drawer-card-icon"><i class="fas fa-code"></i></div>
              <p>本项目仅用于辅助，不涉及任何商业行为。如有侵权，请联系删除。</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
