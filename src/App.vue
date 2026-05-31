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

async function loadData() {
  try {
    const [timeRes, dataRes] = await Promise.all([
      fetch('run_time.txt'),
      fetch('coupon_details.json'),
    ])
    runTime.value = await timeRes.text()
    couponData.value = await dataRes.json()
  } catch {
    errorMsg.value = '数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (infoVisible.value) infoVisible.value = false
    else if (selectedCategory.value) selectedCategory.value = null
  }
}

onMounted(async () => {
  await loadData()
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => document.removeEventListener('keydown', onKeydown))
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
        @update:selected="selectedCategory = $event"
      />

      <CouponPanel
        :category="selectedCategory"
        :coupons="selectedCoupons"
        :loading="loading"
        :error="errorMsg"
        @back="selectedCategory = null"
      />
    </div>

    <InfoModal v-model:visible="infoVisible" />
  </div>
</template>

