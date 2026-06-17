import { create } from "zustand"
import type { Matter, Citizen } from "@/types"
import { matters } from "@/mock/matters"
import { citizens } from "@/mock/citizens"

interface MatterState {
  matters: Matter[]
  selectedMatter: Matter | null
  citizen: Citizen | null
  searchKeyword: string
  setSearchKeyword: (keyword: string) => void
  selectMatter: (matter: Matter | null) => void
  findCitizen: (idNumber: string) => Citizen | null
  setCitizen: (citizen: Citizen | null) => void
  filteredMatters: () => Matter[]
}

export const useMatterStore = create<MatterState>((set, get) => ({
  matters,
  selectedMatter: null,
  citizen: null,
  searchKeyword: "",
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  selectMatter: (matter) => set({ selectedMatter: matter }),
  findCitizen: (idNumber) => {
    return citizens.find((c) => c.idNumber === idNumber) || null
  },
  setCitizen: (citizen) => set({ citizen }),
  filteredMatters: () => {
    const { matters, searchKeyword } = get()
    if (!searchKeyword) return matters
    const kw = searchKeyword.toLowerCase()
    return matters.filter(
      (m) =>
        m.name.toLowerCase().includes(kw) ||
        m.department.toLowerCase().includes(kw) ||
        m.category.toLowerCase().includes(kw)
    )
  },
}))
