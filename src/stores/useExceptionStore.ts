import { create } from "zustand"
import type { ExceptionRecord, ReviewOpinion } from "@/types"
import { exceptions } from "@/mock/exceptions"

interface ExceptionState {
  records: ExceptionRecord[]
  addRecord: (record: ExceptionRecord) => void
  addReviewOpinion: (exceptionId: string, opinion: ReviewOpinion) => void
  updateStatus: (id: string, status: ExceptionRecord["status"]) => void
}

export const useExceptionStore = create<ExceptionState>((set) => ({
  records: [...exceptions],

  addRecord: (record) => {
    set((state) => ({ records: [record, ...state.records] }))
  },

  addReviewOpinion: (exceptionId, opinion) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === exceptionId
          ? { ...r, reviewOpinions: [...r.reviewOpinions, opinion] }
          : r
      ),
    }))
  },

  updateStatus: (id, status) => {
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, status } : r)),
    }))
  },
}))
