export interface Matter {
  id: string
  name: string
  department: string
  category: string
  requiredLicenses: string[]
  description: string
}

export interface Citizen {
  idNumber: string
  name: string
  gender: string
  photo: string
  address: string
}

export interface LicenseField {
  fieldName: string
  fieldValue: string
  matchFormFieldName: string
  formValue: string
  matchResult: "match" | "mismatch" | "missing"
}

export interface License {
  id: string
  name: string
  type: string
  licenseNumber: string
  holderName: string
  holderIdNumber: string
  issueDate: string
  expiryDate: string
  issueAuthority: string
  status: "normal" | "expired" | "revoked" | "lost"
  imageUrl: string
  fields: LicenseField[]
  callStatus: "available" | "need_auth" | "unavailable"
}

export interface LicenseCallReason {
  category: "legal_requirement" | "material_verification" | "information_comparison"
  description: string
}

export interface FieldComparison {
  formField: string
  formValue: string
  licenseField: string
  licenseValue: string
  result: "match" | "mismatch" | "missing"
}

export interface VerificationResult {
  licenseId: string
  expiryCheck: "valid" | "expiring_soon" | "expired"
  authorityCheck: "consistent" | "inconsistent"
  statusCheck: "normal" | "abnormal"
  fieldComparison: FieldComparison[]
  duplicateWarning: boolean
  missingLicenses: string[]
}

export interface ReviewOpinion {
  id: string
  reviewer: string
  opinion: string
  disposition: "return_supplement" | "manual_pass" | "escalate"
  createdAt: string
}

export interface ExceptionRecord {
  id: string
  licenseId: string
  licenseName: string
  exceptionType: "info_mismatch" | "expired" | "authority_anomaly" | "suspected_forgery"
  description: string
  attachments: string[]
  status: "pending" | "reviewing" | "resolved" | "rejected"
  reviewOpinions: ReviewOpinion[]
  createdAt: string
  createdBy: string
  windowNo: string
}

export interface AuditRecord {
  id: string
  licenseId: string
  licenseName: string
  matterId: string
  matterName: string
  windowNo: string
  operatorId: string
  operatorName: string
  citizenId: string
  citizenName: string
  callReason: LicenseCallReason
  verificationResult: VerificationResult
  signatureDataUrl: string
  action: "scan" | "verify" | "call" | "view" | "download" | "export" | "print" | "submit_supplement" | "return_supplement" | "matter_select"
  createdAt: string
}

export interface SupplementItem {
  licenseId: string
  licenseName: string
  status: "pending" | "submitted" | "returned"
  submittedAt?: string
  submittedBy?: string
  remark?: string
}

export interface NoticeRecord {
  id: string
  citizenId: string
  citizenName: string
  matterId: string
  matterName: string
  windowNo: string
  operatorName: string
  supplements: SupplementItem[]
  createdAt: string
  printedAt?: string
  exportedAt?: string
}

export interface AuditFilter {
  searchText: string
  windowFilter: string
  actionFilter: string
  dateRange: [string, string] | null
  matterFilter: string
  citizenFilter: string
}

export interface TrendItem {
  date: string
  count: number
}

export interface WindowCallItem {
  windowNo: string
  callCount: number
  exceptionCount: number
}

export interface MatterCallItem {
  matterName: string
  callCount: number
  returnCount: number
}

export interface ReturnReasonItem {
  reason: string
  count: number
  percentage: number
}

export interface ExceptionDistItem {
  type: string
  count: number
  percentage: number
}

export interface DashboardStats {
  totalCalls: number
  totalExceptions: number
  totalReturns: number
  callTrend: TrendItem[]
  callsByWindow: WindowCallItem[]
  callsByMatter: MatterCallItem[]
  returnReasons: ReturnReasonItem[]
  exceptionDistribution: ExceptionDistItem[]
}
