import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      selectedJobId: null,
      setSelectedJobId: (id) => set({ selectedJobId: id }),

      activeTab: 'ozet',
      setActiveTab: (tab) => set({ activeTab: tab }),

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      filterIlce: '',
      setFilterIlce: (v) => set({ filterIlce: v }),

      filterTur: '',
      setFilterTur: (v) => set({ filterTur: v }),

      filterVade: '',
      setFilterVade: (v) => set({ filterVade: v }),

      filterAsama: '',
      setFilterAsama: (v) => set({ filterAsama: v }),

      // Genişletilmiş ana iş ID'leri (sidebar'da alt işleri göstermek için)
      expandedParents: [],
      toggleParentExpand: (id) =>
        set((s) => ({
          expandedParents: s.expandedParents.includes(id)
            ? s.expandedParents.filter((x) => x !== id)
            : [...s.expandedParents, id],
        })),

      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),

      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'kudeb-panel-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        viewMode: state.viewMode,
        expandedParents: state.expandedParents,
      }),
    },
  ),
)

export default useStore
