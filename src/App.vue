<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CouponData } from './types'
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
import CouponPanel from './components/CouponPanel.vue'
import InfoModal from './components/InfoModal.vue'

const couponData = ref<CouponData>({})
const runTime = ref('')
const loading = ref(true)
const errorMsg = ref('')

const searchTerm = ref('')
const infoVisible = ref(false)
const selectedCategory = ref<string | null>(null)

const categories = computed(() => Object.keys(couponData.value))

const brandCount = computed(() => {
  const s = new Set<string>()
  for (const cat of categories.value)
    for (const c of couponData.value[cat])
      s.add(c.brand_name)
  return s.size
})

const sortedCategories = computed(() =>
  [...categories.value].sort((a, b) =>
    getAvg(couponData.value[b]) - getAvg(couponData.value[a])
  )
)

function getAvg(coupons: CouponData[string]): number {
  return coupons.reduce((s, c) => s + c.receive_customer_num, 0) / coupons.length
}

const selectedCoupons = computed(() =>
  selectedCategory.value ? couponData.value[selectedCategory.value] : []
)

function updateSeo(category: string | null) {
  const title = category
    ? `${category}优惠券 - 立创商城优惠券助手`
    : '立创商城优惠券助手'
  const description = category
    ? `查看${category}分类下的立创商城优惠券信息`
    : '立创商城优惠券助手 - 帮助选择立创商城优惠券的工具网站'
  const url = new URL(window.location.href)
  url.search = category ? `?category=${encodeURIComponent(category)}` : ''

  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url.toString())
}

function syncCategoryFromUrl() {
  const category = new URLSearchParams(window.location.search).get('category')
  selectedCategory.value =
    category && categories.value.includes(category) ? category : null
  updateSeo(selectedCategory.value)
}

function selectCategory(category: string | null, replace = false) {
  selectedCategory.value = category
  const url = category
    ? `/?category=${encodeURIComponent(category)}`
    : '/'
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
  updateSeo(category)
}

function onPopstate() {
  syncCategoryFromUrl()
}

async function loadData() {
  try {
    const [timeRes, dataRes] = await Promise.all([
      fetch('run_time.txt'),
      fetch('coupon_details.json'),
    ])
    runTime.value = await timeRes.text()
    couponData.value = await dataRes.json()
    syncCategoryFromUrl()
  } catch {
    errorMsg.value = '数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (infoVisible.value) infoVisible.value = false
    else if (selectedCategory.value) selectCategory(null)
  }
}

onMounted(async () => {
  await loadData()
  window.addEventListener('popstate', onPopstate)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopstate)
  document.removeEventListener('keydown', onKeydown)
})

</script>

<template>
  <div class="app-layout">
    <TopBar @toggle-info="infoVisible = true" />

    <div class="app-body" :class="{ 'has-selection': selectedCategory }">
      <Sidebar
        :categories="sortedCategories"
        :data="couponData"
        :run-time="runTime"
        :brand-count="brandCount"
        :loading="loading"
        :search="searchTerm"
        :selected="selectedCategory"
        @update:search="searchTerm = $event"
        @update:selected="selectCategory"
      />

      <CouponPanel
        :category="selectedCategory"
        :coupons="selectedCoupons"
        :loading="loading"
        :error="errorMsg"
        @back="selectCategory(null)"
      />
    </div>

    <InfoModal v-model:visible="infoVisible" />
  </div>
</template>

