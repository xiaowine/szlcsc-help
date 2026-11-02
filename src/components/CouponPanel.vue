<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import type { Coupon } from "../types";
import Icon from "./Icon.vue";
import { icons, type IconName } from "../icons";

interface PromotionLink {
  icon: IconName;
  title: string;
  desc: string;
  href: string;
}

const promotionLinks = ref<PromotionLink[]>([]);

onMounted(async () => {
  try {
    const res = await fetch("data/promotion.json", { cache: "no-cache" });
    const links: PromotionLink[] = await res.json();
    // 忽略 icons 表中不存在的图标名，避免渲染空白或报错
    promotionLinks.value = links.filter((link) => link.icon in icons);
  } catch {
    // 加载失败静默处理，不展示推广
  }
});

const props = defineProps<{
  category: string | null;
  coupons: Coupon[];
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{ back: [] }>();

const sorted = computed(() =>
  [...props.coupons].sort(
    (a, b) => b.receive_customer_num - a.receive_customer_num,
  ),
);

const panelRef = ref<HTMLElement | null>(null);
const showTop = ref(false);

function onScroll(e: Event) {
  showTop.value = (e.target as HTMLElement).scrollTop > 200;
}

function scrollToTop() {
  panelRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<template>
  <div class="panel" ref="panelRef" @scroll="onScroll">
    <!-- Empty state -->
    <div v-if="!loading && !error && !category" class="panel-empty">
      <div class="panel-empty-icon">
        <Icon name="ticket" />
      </div>
      <h2>选择左侧分类</h2>
      <p>点击任意分类查看该分类下所有优惠券，按领取数量排序</p>

      <div v-if="promotionLinks.length" class="promotion-section">
        <p class="promotion-label">推荐链接</p>
        <div class="promotion-list">
          <a
            v-for="item in promotionLinks"
            :key="item.href"
            :href="item.href"
            target="_blank"
            rel="noopener noreferrer"
            class="promotion-item"
          >
            <span class="promotion-icon"><Icon :name="item.icon" /></span>
            <span class="promotion-text">
              <span class="promotion-title">{{ item.title }}</span>
              <span class="promotion-desc">{{ item.desc }}</span>
            </span>
            <Icon name="up-right-from-square" class="promotion-arrow" />
          </a>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="panel-empty">
      <div class="panel-empty-icon panel-empty-icon--error">
        <Icon name="circle-exclamation" />
      </div>
      <h2>加载失败</h2>
      <p>{{ error }}</p>
    </div>

    <!-- Loading state -->
    <div v-else-if="loading" class="panel-empty">
      <div class="panel-spinner"></div>
      <p>数据加载中...</p>
    </div>

    <!-- Coupon list -->
    <template v-else-if="category">
      <!-- Panel header -->
      <div class="panel-head">
        <button
          class="panel-back"
          @click="emit('back')"
          aria-label="返回分类列表"
        >
          <Icon name="arrow-left" />
        </button>
        <div class="panel-head-info">
          <h2 class="panel-title">{{ category }}</h2>
          <span class="panel-subtitle"
            >{{ sorted.length }} 个品牌 · 平均领取
            {{
              Math.round(
                coupons.reduce((s, c) => s + c.receive_customer_num, 0) /
                  coupons.length,
              )
            }}
            张</span
          >
        </div>
      </div>

      <!-- Coupon items -->
      <ul class="coupon-list">
        <li
          v-for="(coupon, index) in sorted"
          :key="coupon.brand_id"
          class="coupon-item"
        >
          <a
            :href="`https://list.szlcsc.com/brand/${coupon.brand_id}.html`"
            target="_blank"
            rel="noopener noreferrer"
            class="coupon-item-link"
          >
            <span class="coupon-rank">{{ index + 1 }}</span>

            <div class="coupon-info">
              <div class="coupon-name">{{ coupon.brand_name }}</div>
              <div class="coupon-desc">{{ coupon.coupon_name }}</div>
            </div>

            <div class="coupon-right">
              <div class="coupon-discount">
                <span class="coupon-amount">-¥{{ coupon.coupon_amount }}</span>
                <span class="coupon-condition"
                  >满¥{{ coupon.min_order_amount }}</span
                >
              </div>
              <div class="coupon-min">
                实付最低¥{{ coupon.min_order_after_discount }}
              </div>
            </div>

            <div class="coupon-count-wrap">
              <span class="coupon-count">{{
                coupon.receive_customer_num
              }}</span>
              <span class="coupon-count-label">人已领</span>
            </div>
          </a>
        </li>
      </ul>
    </template>
  </div>

  <!-- Back to top — teleported to body to avoid CSS transform containing-block issue -->
  <Teleport to="body">
    <Transition name="fade-up">
      <button
        v-if="showTop"
        class="panel-top-btn"
        @click="scrollToTop"
        aria-label="返回顶部"
      >
        <Icon name="arrow-up" />
      </button>
    </Transition>
  </Teleport>
</template>
