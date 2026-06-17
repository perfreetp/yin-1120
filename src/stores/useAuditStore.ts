import { create } from "zustand"
import type { AuditRecord, LicenseCallReason, VerificationResult } from "@/types"
import { auditRecords } from "@/mock/auditRecords"

interface AuditState {
  records: AuditRecord[]
  addRecord: (record: AuditRecord) => void
  getRecordsByDateRange: (start: string, end: string) => AuditRecord[]
  getRecordsByWindow: (windowNo: string) => AuditRecord[]
}

export const useAuditStore = create<AuditState>((set, get) => ({
  records: [...auditRecords],

  addRecord: (record) => {
    set((state) => ({ records: [record, ...state.records] }))
  },

  getRecordsByDateRange: (start, end) => {
    const { records } = get()
    return records.filter((r) => r.createdAt >= start && r.createdAt <= end)
  },

  getRecordsByWindow: (windowNo) => {
    const { records } = get()
    return records.filter((r) => r.windowNo === windowNo)
  },
}))
