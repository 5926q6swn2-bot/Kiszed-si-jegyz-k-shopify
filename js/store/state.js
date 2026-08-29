// js/store/state.js
// Központi Állapotkezelő (State Management)

const state = {
    orders: [],
    pxpOrders: [],
    shopifyHubOrders: [],
    selectedHubOrderIds: new Set(),
    hubFilters: {
        search: '',
        fulfillment: 'all',
        financial: 'all',
        tag: 'all',
        dateRange: 'all'
    },
    activeMainTab: 'overview', // 'overview' | 'picking' | 'pannonxp'
    sortableInstance: null,
    sortModeActive: false,
    currentLoadedRunId: null,
    originalLoadedRun: null,
    editingOrderInternalId: null,
    statsLeafletMap: null,
    activeStatsTab: 'charts',
    geoCache: JSON.parse(localStorage.getItem('hu_zip_geocache_v1') || '{}')
};

export const Store = {
    // --- Getters ---
    get orders() { return state.orders; },
    get pxpOrders() { return state.pxpOrders; },
    get shopifyHubOrders() { return state.shopifyHubOrders; },
    get selectedHubOrderIds() { return state.selectedHubOrderIds; },
    get hubFilters() { return state.hubFilters; },
    get activeMainTab() { return state.activeMainTab; },
    get sortableInstance() { return state.sortableInstance; },
    get sortModeActive() { return state.sortModeActive; },
    get currentLoadedRunId() { return state.currentLoadedRunId; },
    get originalLoadedRun() { return state.originalLoadedRun; },
    get editingOrderInternalId() { return state.editingOrderInternalId; },
    get statsLeafletMap() { return state.statsLeafletMap; },
    get activeStatsTab() { return state.activeStatsTab; },
    get geoCache() { return state.geoCache; },

    // --- Setters ---
    setOrders(newOrders) {
        state.orders = newOrders;
    },
    
    addOrder(order) {
        state.orders.push(order);
    },

    clearOrders() {
        state.orders = [];
    },

    setPxpOrders(newPxpOrders) {
        state.pxpOrders = newPxpOrders;
    },

    addPxpOrder(pxpOrder) {
        state.pxpOrders.push(pxpOrder);
    },

    clearPxpOrders() {
        state.pxpOrders = [];
    },

    setShopifyHubOrders(orders) {
        state.shopifyHubOrders = orders;
    },

    setSelectedHubOrderIds(idSet) {
        state.selectedHubOrderIds = idSet;
    },

    toggleHubOrderSelection(orderId) {
        if (state.selectedHubOrderIds.has(orderId)) {
            state.selectedHubOrderIds.delete(orderId);
        } else {
            state.selectedHubOrderIds.add(orderId);
        }
    },

    selectAllHubOrders(orderIds) {
        state.selectedHubOrderIds = new Set(orderIds);
    },

    clearHubOrderSelection() {
        state.selectedHubOrderIds.clear();
    },

    setHubFilters(filters) {
        state.hubFilters = { ...state.hubFilters, ...filters };
    },

    setActiveMainTab(tabName) {
        state.activeMainTab = tabName;
    },

    setSortableInstance(instance) {
        state.sortableInstance = instance;
    },

    setSortModeActive(isActive) {
        state.sortModeActive = isActive;
    },

    setCurrentLoadedRunId(id) {
        state.currentLoadedRunId = id;
    },

    setOriginalLoadedRun(run) {
        state.originalLoadedRun = run;
    },

    setEditingOrderInternalId(id) {
        state.editingOrderInternalId = id;
    },

    setStatsLeafletMap(mapInstance) {
        state.statsLeafletMap = mapInstance;
    },

    setActiveStatsTab(tabId) {
        state.activeStatsTab = tabId;
    },

    saveGeoCache() {
        localStorage.setItem('hu_zip_geocache_v1', JSON.stringify(state.geoCache));
    }
};

