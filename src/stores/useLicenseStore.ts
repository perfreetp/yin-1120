import { create } from "zustand"
import type { License, LicenseCallReason, VerificationResult, FieldComparison } from "@/types"
import { licenses } from "@/mock/licenses"
import dayjs from "dayjs"

interface LicenseState {
  allLicenses: License[]
  currentLicenses: License[]
  verifyingLicense: License | null
  callReason: LicenseCallReason | null
  verificationResults: Map<string, VerificationResult>
  calledLicenseIds: string[]
  setCurrentLicenses: (licenseIds: string[]) => void
  setVerifyingLicense: (license: License | null) => void
  setCallReason: (reason: LicenseCallReason | null) => void
  verifyLicense: (license: License) => VerificationResult
  markCalled: (licenseId: string) => void
  reset: () => void
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  allLicenses: licenses,
  currentLicenses: [],
  verifyingLicense: null,
  callReason: null,
  verificationResults: new Map(),
  calledLicenseIds: [],

  setCurrentLicenses: (licenseIds) => {
    const { allLicenses } = get()
    const filtered = allLicenses.filter((l) => licenseIds.includes(l.id))
    set({ currentLicenses: filtered })
  },

  setVerifyingLicense: (license) => set({ verifyingLicense: license }),
  setCallReason: (reason) => set({ callReason: reason }),

  verifyLicense: (license) => {
    const now = dayjs()
    const expiry = dayjs(license.expiryDate)
    const daysUntilExpiry = expiry.diff(now, "day")

    let expiryCheck: VerificationResult["expiryCheck"] = "valid"
    if (daysUntilExpiry < 0) expiryCheck = "expired"
    else if (daysUntilExpiry < 90) expiryCheck = "expiring_soon"

    const authorityCheck: VerificationResult["authorityCheck"] = "consistent"

    let statusCheck: VerificationResult["statusCheck"] = "normal"
    if (license.status !== "normal") statusCheck = "abnormal"

    const fieldComparison: FieldComparison[] = license.fields.map((f) => ({
      formField: f.matchFormFieldName,
      formValue: f.matchResult === "mismatch" ? "（申请表填写值）" : f.fieldValue,
      licenseField: f.fieldName,
      licenseValue: f.fieldValue,
      result: f.matchResult,
    }))

    const { calledLicenseIds } = get()
    const duplicateWarning = calledLicenseIds.includes(license.id)

    const result: VerificationResult = {
      licenseId: license.id,
      expiryCheck,
      authorityCheck,
      statusCheck,
      fieldComparison,
      duplicateWarning,
      missingLicenses: [],
    }

    const newResults = new Map(get().verificationResults)
    newResults.set(license.id, result)
    set({ verificationResults: newResults })

    return result
  },

  markCalled: (licenseId) => {
    const { calledLicenseIds } = get()
    if (!calledLicenseIds.includes(licenseId)) {
      set({ calledLicenseIds: [...calledLicenseIds, licenseId] })
    }
  },

  reset: () =>
    set({
      currentLicenses: [],
      verifyingLicense: null,
      callReason: null,
      verificationResults: new Map(),
      calledLicenseIds: [],
    }),
}))
