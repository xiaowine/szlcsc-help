class CouponApp {
    /**
     * 优惠券应用构造函数
     * 初始化主要数据存储属性
     */
    constructor() {
        this.data = null;
        this.categories = null;
        this.brandCount = 0;
        this.modal = null;
        this.categoryContainer = null;
    }

    /**
     * 应用程序初始化入口
     * 加载数据并设置事件监听器
     */
    async init() {
        try {
            await this.loadRunTime();
            await this.loadCouponData();
            this.setupEventListeners();
            this.initializeComponents();
        } catch (error) {
            console.error('初始化失败:', error);
            document.getElementById('loading').innerHTML = '<p>数据加载失败，请稍后重试</p>';
        }
    }

    /**
     * 加载更新时间
     * 从run_time.txt获取并显示数据更新时间
     */
    async loadRunTime() {
        const timeResponse = await fetch('run_time.txt');
        const timeContent = await timeResponse.text();
        document.getElementById('run_time').textContent = `更新时间：${timeContent}`;
    }

    /**
     * 加载优惠券数据
     * 从coupon_details.json获取优惠券数据并更新统计信息
     */
    async loadCouponData() {
        const response = await fetch('coupon_details.json');
        this.data = await response.json();
        this.categories = Object.keys(this.data);
        this.brandCount = Object.values(this.data).flat().length;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('count').textContent =
            `品牌数：${this.brandCount}，分类数：${this.categories.length}`;
    }

    /**
     * 设置所有事件监听器
     * 初始化模态框、返回顶部按钮和搜索功能的事件
     */
    setupEventListeners() {
        this.setupModalEvents();
        this.setupBackToTopButton();
        this.setupSearchFeature();
    }

    /**
     * 设置模态框相关事件
     * 包括打开、关闭和点击外部区域关闭
     */
    setupModalEvents() {
        // 信息模态框事件
        const infoModal = document.getElementById('infoModal');
        const showInfoBtn = document.getElementById('showInfo');
        const closeBtn = document.getElementById('closeModal');

        showInfoBtn?.addEventListener('click', () => infoModal.style.display = 'flex');
        closeBtn?.addEventListener('click', () => infoModal.style.display = 'none');
        infoModal?.addEventListener('click', (e) => {
            if (e.target === infoModal) infoModal.style.display = 'none';
        });
    }

    /**
     * 设置返回顶部按钮事件
     * 控制按钮显示/隐藏和点击滚动行为
     */
    setupBackToTopButton() {
        const backToTopButton = document.getElementById('backToTop');
        const container = document.querySelector('.container');

        container?.addEventListener('scroll', () => {
            backToTopButton.style.display = container.scrollTop > 300 ? 'flex' : 'none';
        });

        backToTopButton?.addEventListener('click', () => {
            container.scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    /**
     * 根据搜索词过滤分类导航
     * 只过滤导航链接，不影响分类卡片显示
     * 搜索时自动展开导航容器
     * @param {string} searchTerm 搜索关键词
     */
    filterCategories(searchTerm) {
        // 获取所有导航链接
        const categoryLinks = document.querySelectorAll('.category-nav a');

        if (!searchTerm) {
            // 如果搜索词为空，显示所有导航链接
            categoryLinks.forEach(link => link.style.display = 'block');
            // 保持导航容器当前状态，不自动关闭
            return;
        }

        // 有搜索词时自动展开分类导航容器
        if (!this.categoryContainer.classList.contains('category_active')) {
            this.categoryContainer.classList.add('category_active');
        }

        // 只过滤导航链接
        categoryLinks.forEach(link => {
            const linkText = link.textContent.toLowerCase();
            if (linkText.includes(searchTerm)) {
                link.style.display = 'block';
            } else {
                link.style.display = 'none';
            }
        });
    }

    /**
     * 设置搜索功能相关事件
     * 包括搜索框的打开、关闭和搜索触发
     */
    setupSearchFeature() {
        const searchToggle = document.getElementById('searchToggle');
        const searchClose = document.getElementById('searchClose');
        const searchContainer = document.querySelector('.search-container');
        const searchBox = document.getElementById('categorySearch');

        const openSearch = () => {
            searchContainer.style.display = 'flex';
            searchContainer.offsetHeight; // 强制重绘
            searchContainer.classList.add('active_search');
            setTimeout(() => searchBox.focus(), 300);
        };

        const closeSearch = () => {
            searchContainer.classList.remove('active_search');
            setTimeout(() => searchContainer.style.display = 'none', 300);
            searchBox.value = ''; // Clear search input
            this.filterCategories(''); // Reset filters
            searchBox.blur();
        };

        searchToggle?.addEventListener('click', (e) => {
            e.preventDefault();
            searchContainer.classList.contains('active_search') ? closeSearch() : openSearch();
        });

        searchClose?.addEventListener('click', (e) => {
            e.preventDefault();
            closeSearch();
        });

        // Add search input functionality
        searchBox?.addEventListener('input', (e) => {
            this.filterCategories(e.target.value.trim().toLowerCase());
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (searchContainer.classList.contains('active_search')) closeSearch();
                if (this.modal?.style.display === 'flex') this.modal.style.display = 'none';
            }
        });
    }

    /**
     * 初始化所有组件
     * 包括分类导航和优惠券网格
     */
    initializeComponents() {
        this.initializeCategoryNav();
        this.initializeCouponGrid();
    }

    /**
     * 初始化分类导航
     * 创建并添加分类导航容器
     */
    initializeCategoryNav() {
        const nav = document.getElementById('category-nav');
        this.categoryContainer = this.createCategoryContainer();
        nav.appendChild(this.categoryContainer);
    }

    /**
     * 创建分类容器
     * 包括分类标题和内容区域
     */
    createCategoryContainer() {
        const container = document.createElement('div');
        container.className = 'category-container';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <h2>
                分类列表
                <span class="category-count">(${this.categories.length}个分类)</span>
            </h2>
            <i class="fas fa-chevron-down toggle-icon"></i>
        `;

        const content = document.createElement('div');
        content.className = 'category-content';

        const categoryNav = this.createCategoryNav();
        content.appendChild(categoryNav);
        container.appendChild(header);
        container.appendChild(content);

        header.addEventListener('click', () => {
            container.classList.toggle('category_active');
        });

        return container;
    }

    /**
     * 创建分类导航
     * 生成所有分类的链接列表
     */
    createCategoryNav() {
        const nav = document.createElement('div');
        nav.className = 'category-nav';

        this.categories.forEach(category => {
            const link = document.createElement('a');
            link.href = `#${category}`;
            link.innerHTML = `${category} <small>(${this.data[category].length})</small>`;

            link.addEventListener('click', (e) => this.handleCategoryClick(e, category));
            nav.appendChild(link);
        });

        return nav;
    }

    /**
     * 处理分类点击事件
     * 滚动到对应分类并添加高亮效果
     */
    handleCategoryClick(e, category) {
        e.preventDefault();
        this.categoryContainer.classList.remove('category_active');

        const targetCard = document.getElementById(category);
        targetCard.scrollIntoView({behavior: 'smooth', block: 'center'});
        targetCard.classList.add('highlight');

        document.querySelectorAll('.category-card.highlight').forEach(card => {
            if (card !== targetCard) card.classList.remove('highlight');
        });
    }

    /**
     * 初始化优惠券展示网格
     * 创建模态框并添加分类卡片
     */
    initializeCouponGrid() {
        const grid = document.getElementById('coupon-grid');
        this.modal = document.createElement('div');
        this.modal.className = 'coupon-modal';
        document.body.appendChild(this.modal);

        const sortedCategories = this.getSortedCategories();
        sortedCategories.forEach(category => this.createCategoryCard(category, grid));
    }

    /**
     * 获取排序后的分类列表
     * 按照平均领取数量降序排列
     */
    getSortedCategories() {
        return this.categories.sort((a, b) => {
            const avgA = this.getAverageReceiveNum(this.data[a]);
            const avgB = this.getAverageReceiveNum(this.data[b]);
            return avgB - avgA;
        });
    }

    /**
     * 计算优惠券平均领取数量
     * @param {Array} coupons 优惠券数组
     */
    getAverageReceiveNum(coupons) {
        const total = coupons.reduce((sum, coupon) => sum + coupon.receive_customer_num, 0);
        return total / coupons.length;
    }

    /**
     * 创建分类卡片
     * 显示分类名称和统计信息
     */
    createCategoryCard(category, grid) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.id = category;

        const avgReceiveNum = this.getAverageReceiveNum(this.data[category]);
        card.innerHTML = `
            <h2>${category} <br>
                <span class="brand-count">
                    共${this.data[category].length}个品牌<br>
                    平均领取数: ${avgReceiveNum.toFixed(0)}
                </span>
            </h2>
        `;

        card.addEventListener('click', () => this.showCouponModal(category, avgReceiveNum));
        grid.appendChild(card);
    }

    /**
     * 显示优惠券详情模态框
     * 展示分类下所有优惠券信息
     */
    showCouponModal(category, avgReceiveNum) {
        const sortedCoupons = this.data[category]
            .sort((a, b) => b.receive_customer_num - a.receive_customer_num);

        this.modal.innerHTML = this.createModalContent(category, avgReceiveNum, sortedCoupons);
        this.modal.style.display = 'flex';

        const closeBtn = this.modal.querySelector('.coupon-modal-close');
        closeBtn.addEventListener('click', () => this.modal.style.display = 'none');

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.modal.style.display = 'none';
        });
    }

    /**
     * 创建模态框内容
     * 生成优惠券列表的HTML
     */
    createModalContent(category, avgReceiveNum, coupons) {
        return `
            <div class="coupon-modal-content">
                <div class="coupon-modal-header">
                    <h2>${category}</h2>平均领取数: ${avgReceiveNum.toFixed(0)}
                    <button class="coupon-modal-close">&times;</button>
                </div>
                <div class="coupon-modal-body">
                    <ul class="coupon-list">
                        ${coupons.map(coupon => `
                            <li class="coupon-item">
                                <a href="https://list.szlcsc.com/brand/${coupon.brand_id}.html" target="_blank">
                                    ${coupon.brand_name} - ${coupon.coupon_name}
                                    <small>(优惠后最低消费${coupon.min_order_after_discount}元)</small>
                                    <small>- 已领取${coupon.receive_customer_num}张</small>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
}

/**
 * 应用程序入口
 * DOM加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = new CouponApp();
    app.init();
});