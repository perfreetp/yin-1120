import { create } from "zustand"
import type { NoticeRecord, SupplementItem, AuditFilter } from "@/types"

interface NoticeState {
  notices: NoticeRecord[]
  currentNoticeId: string | null
  addNotice: (notice: NoticeRecord) => void
  updateSupplement: (noticeId: string, licenseId: string, status: SupplementItem["status"], remark?: string) => void
  getNoticeByCitizenMatter: (citizenId: string, matterId: string) => NoticeRecord | undefined
  setCurrentNotice: (id: string | null) => void
  auditFilter: AuditFilter
  setAuditFilter: (filter: Partial<AuditFilter>) => void
  resetAuditFilter: () => void
}

const defaultAuditFilter: AuditFilter = {
  searchText: "",
  windowFilter: "",
  actionFilter: "",
  dateRange: null,
  matterFilter: "",
  citizenFilter: "",
}

export const useNoticeStore = create<NoticeState>((set, get) => ({
  notices: [],
  currentNoticeId: null,
  auditFilter: defaultAuditFilter,

  addNotice: (notice) => {
    set((state) => ({ notices: [notice, ...state.notices] }))
  },

  updateSupplement: (noticeId, licenseId, status, remark) => {
    set((state) => ({
      notices: state.notices.map((n) => {
        if (n.id !== noticeId) return n
        return {
          ...n,
          supplements: n.supplements.map((s) =>
            s.licenseId === licenseId
              ? {
                  ...s,
                  status,
                  remark,
                  submittedAt:
                    status === "submitted" || status === "returned"
                      ? new Date().toISOString().replace("T", " ").slice(0, 19)
                      : s.submittedAt,
                  submittedBy: status === "submitted" || status === "returned" ? "王丽娟" : s.submittedBy,
                }
              : s
          ),
        }
      }),
    }))
  },

  getNoticeByCitizenMatter: (citizenId, matterId) => {
    return get().notices.find((n) => n.citizenId === citizenId && n.matterId === matterId)
  },

  setCurrentNotice: (id) => set({ currentNoticeId: id }),

  setAuditFilter: (filter) => {
    set((state) => ({ auditFilter: { ...state.auditFilter, ...filter } }))
  },

  resetAuditFilter: () => set({ auditFilter: defaultAuditFilter }),
}))
