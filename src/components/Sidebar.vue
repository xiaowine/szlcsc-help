<script setup lang="ts">
import { computed, ref } from "vue";
import type { CouponData } from "../types";

const props = defineProps<{
  categories: string[];
  data: CouponData;
  runTime: string;
  brandCount: number;
  loading: boolean;
  search: string;
  selected: string | null;
}>();

const emit = defineEmits<{
  "update:search": [string];
  "update:selected": [string | null];
}>();

type SortMode = "name" | "brand" | "receive";
const sortMode = ref<SortMode>("name");
const sortAsc = ref(true);

function setSort(mode: SortMode) {
  if (sortMode.value === mode) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortMode.value = mode;
    sortAsc.value = mode === "name";
  }
}

function getTotal(coupons: CouponData[string]): number {
  return coupons.reduce((s, c) => s + c.receive_customer_num, 0);
}

function getAvg(coupons: CouponData[string]): number {
  return Math.round(getTotal(coupons) / coupons.length);
}

const filtered = computed(() => {
  const list = props.search
    ? props.categories.filter((c) => c.toLowerCase().includes(props.search))
    : [...props.categories];

  const dir = sortAsc.value ? 1 : -1;
  if (sortMode.value === "name") {
    list.sort((a, b) => dir * a.localeCompare(b, "zh-CN"));
  } else if (sortMode.value === "brand") {
    list.sort(
      (a, b) =>
        dir * ((props.data[a]?.length ?? 0) - (props.data[b]?.length ?? 0)),
    );
  } else {
    list.sort(
      (a, b) =>
        dir * (getTotal(props.data[a] ?? []) - getTotal(props.data[b] ?? [])),
    );
  }
  return list;
});
</script>

<template>
  <aside class="sidebar">
    <!-- Search -->
    <div class="sidebar-search">
      <i class="fas fa-search sidebar-search-icon"></i>
      <input
        class="sidebar-search-input"
        type="text"
        placeholder="搜索分类..."
        :value="search"
        @input="
          emit(
            'update:search',
            ($event.target as HTMLInputElement).value.toLowerCase().trim(),
          )
        "
      />
      <button
        v-if="search"
        class="sidebar-search-clear"
        @click="emit('update:search', '')"
        aria-label="清除搜索"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Sort Controls -->
    <div class="sidebar-sort">
      <div class="sort-modes">
        <button
          v-for="[key, label] in [
            ['name', '名称'],
            ['brand', '品牌数'],
            ['receive', '领取数'],
          ] as [SortMode, string][]"
          :key="key"
          class="sort-btn"
          :class="{ active: sortMode === key }"
          @click="setSort(key)"
        >
          {{ label }}
          <i
            v-if="sortMode === key"
            class="fas"
            :class="sortAsc ? 'fa-arrow-up' : 'fa-arrow-down'"
          ></i>
        </button>
      </div>
      <button
        class="sort-dir-btn"
        :title="sortAsc ? '当前正序，点击切换反序' : '当前反序，点击切换正序'"
        @click="sortAsc = !sortAsc"
      >
        <i
          class="fas"
          :class="sortAsc ? 'fa-sort-amount-up-alt' : 'fa-sort-amount-down-alt'"
        ></i>
      </button>
    </div>

    <!-- Category List -->
    <div class="sidebar-list" role="list">
      <div v-if="loading" class="sidebar-loading">
        <div class="sidebar-spinner"></div>
        <span>加载中...</span>
      </div>

      <template v-else>
        <button
          v-for="cat in filtered"
          :key="cat"
          class="sidebar-item"
          :class="{ active: selected === cat }"
          role="listitem"
          @click="emit('update:selected', cat)"
        >
          <span class="sidebar-item-name">{{ cat }}</span>
          <div class="sidebar-item-meta">
            <span>{{ data[cat].length }} 品牌</span>
            <span class="sidebar-item-avg"
              >均领取{{ getAvg(data[cat]) }}张</span
            >
          </div>
        </button>

        <div v-if="filtered.length === 0" class="sidebar-empty">无匹配分类</div>
      </template>
    </div>

    <!-- Footer Stats -->
    <div class="sidebar-footer">
      <div class="sidebar-stat">
        <i class="fas fa-clock"></i>
        <span>{{ runTime || "更新时间加载中…" }}</span>
      </div>
      <div class="sidebar-stat">
        <i class="fas fa-building"></i>
        <span>{{
          brandCount > 0
            ? `${brandCount} 个品牌 · ${categories.length} 个分类`
            : "统计加载中…"
        }}</span>
      </div>
      <div class="sidebar-stat">
        <i class="fas fa-eye"></i>
        <span>
          浏览
          <span id="busuanzi_container_site_pv"
            ><span id="busuanzi_value_site_pv">-</span> 次</span
          >
          &nbsp;·&nbsp;
          <span id="busuanzi_container_site_uv"
            ><span id="busuanzi_value_site_uv">-</span> 人访问</span
          >
        </span>
      </div>
    </div>
  </aside>
</template>
