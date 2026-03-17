import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      // Selected job
      selectedJobId: null,
      setSelectedJobId: (id) => set({ selectedJobId: id }),

      // Active tab in detail panel
      activeTab: 'ozet',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Search & filter
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      filterIlce: '',
      setFilterIlce: (v) => set({ filterIlce: v }),

      filterTur: '',
      setFilterTur: (v) => set({ filterTur: v }),

      filterVade: '',
      setFilterVade: (v) => set({ filterVade: v }),

      // Theme
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'kudeb-panel-store',
      partialize: (state) => ({ darkMode: state.darkMode }),
    },
  ),
)

export default useStore
