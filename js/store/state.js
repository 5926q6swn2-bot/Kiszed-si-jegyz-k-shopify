// js/store/state.js
// Központi Állapotkezelő (State Management)

const state = {
    orders: [],
    sortableInstance: null,
    sortModeActive: false,
    currentLoadedRunId: null,
    originalLoadedRun: null,
    editingOrderInternalId: null,
    mergeSelectionMode: false,
    selectedForMerge: new Set(),
    statsLeafletMap: null,
    activeStatsTab: 'charts',
    geoCache: JSON.parse(localStorage.getItem('hu_zip_geocache_v1') || '{}')
};

export const Store = {
    // --- Getters ---
    get orders() { return state.orders; },
    get sortableInstance() { return state.sortableInstance; },
    get sortModeActive() { return state.sortModeActive; },
    get currentLoadedRunId() { return state.currentLoadedRunId; },
    get originalLoadedRun() { return state.originalLoadedRun; },
    get editingOrderInternalId() { return state.editingOrderInternalId; },
    get mergeSelectionMode() { return state.mergeSelectionMode; },
    get selectedForMerge() { return state.selectedForMerge; },
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

    setMergeSelectionMode(isModeActive) {
        state.mergeSelectionMode = isModeActive;
    },

    clearSelectedForMerge() {
        state.selectedForMerge.clear();
    },

    addToSelectedForMerge(id) {
        state.selectedForMerge.add(id);
    },

    removeFromSelectedForMerge(id) {
        state.selectedForMerge.delete(id);
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
