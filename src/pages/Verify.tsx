import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, Select, Input, Button, Table, Tag, message, Alert, Divider, Steps, Modal } from "antd"
import {
  ShieldCheck,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  FileDown,
  ArrowLeft,
  Printer,
  Download,
} from "lucide-react"
import { useLicenseStore } from "@/stores/useLicenseStore"
import { useMatterStore } from "@/stores/useMatterStore"
import { useAuditStore } from "@/stores/useAuditStore"
import SignPad from "@/components/SignPad"
import type { VerificationResult, LicenseCallReason, AuditRecord } from "@/types"
import dayjs from "dayjs"

export default function Verify() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentLicenses, verifyingLicense, setVerifyingLicense, verifyLicense, markCalled, callReason, setCallReason } = useLicenseStore()
  const { selectedMatter, citizen } = useMatterStore()
  const addAuditRecord = useAuditStore((s) => s.addRecord)

  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [signatureData, setSignatureData] = useState<string>("")
  const [step, setStep] = useState(0)
  const [exportVisible, setExportVisible] = useState(false)

  const license = id ? currentLicenses.find((l) => l.id === id) : null

  const makeRecord = (action: AuditRecord["action"], desc: string): AuditRecord => ({
    id: `A${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    licenseId: license?.id || "",
    licenseName: license?.name || "",
    matterId: selectedMatter?.id || "",
    matterName: selectedMatter?.name || "",
    windowNo: "窗口1",
    operatorId: "OP001",
    operatorName: "王丽娟",
    citizenId: citizen?.idNumber || "",
    citizenName: citizen?.name || "",
    callReason: { category: (callReason?.category || "material_verification") as LicenseCallReason["category"], description: desc },
    verificationResult: verificationResult || {
      licenseId: license?.id || "",
      expiryCheck: "valid",
      authorityCheck: "consistent",
      statusCheck: "normal",
      fieldComparison: [],
      duplicateWarning: false,
      missingLicenses: [],
    },
    signatureDataUrl: signatureData,
    action,
    createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
  })

  useEffect(() => {
    if (license && !verificationResult) {
      const result = verifyLicense(license)
      setVerificationResult(result)
      setStep(1)
      addAuditRecord({
        ...makeRecord("verify", `核验${license.name}信息`),
      })
    }
  }, [license])

  const handleReasonChange = (field: string, value: string) => {
    if (!callReason) {
      const newReason: LicenseCallReason = { category: "legal_requirement", description: "" }
      if (field === "category") newReason.category = value as LicenseCallReason["category"]
      else newReason.description = value
      setCallReason(newReason)
    } else {
      setCallReason({
        ...callReason,
        [field]: value,
      })
    }
  }

  const handleSignConfirm = (dataUrl: string) => {
    setSignatureData(dataUrl)
    setStep(3)
    message.success("签字确认成功")
  }

  const handleComplete = () => {
    if (!license || !selectedMatter || !citizen || !callReason || !verificationResult) return

    markCalled(license.id)
    addAuditRecord(makeRecord("call", `调用${license.name}用于${selectedMatter.name}办理`))

    message.success("证照调用完成，已自动留痕")
    navigate("/")
  }

  const handleDownload = () => {
    if (!license) return
    addAuditRecord(makeRecord("download", `下载${license.name}电子证照存档`))
    message.success(`已下载${license.name}，操作已留痕`)
  }

  const handleExport = () => {
    if (!license) return
    setExportVisible(true)
  }

  const handleConfirmExport = () => {
    if (!license) return
    addAuditRecord(makeRecord("export", `导出${license.name}核验报告`))
    setExportVisible(false)
    message.success("核验报告已导出，操作已留痕")
  }

  const expiryConfig: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
    valid: { icon: <CheckCircle2 size={20} />, color: "#2EAD6B", text: "有效", bg: "#f0faf4" },
    expiring_soon: { icon: <AlertTriangle size={20} />, color: "#F0983E", text: "即将到期", bg: "#fef7ed" },
    expired: { icon: <XCircle size={20} />, color: "#E04848", text: "已过期", bg: "#fef1f1" },
  }

  const authorityConfig: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
    consistent: { icon: <CheckCircle2 size={20} />, color: "#2EAD6B", text: "一致", bg: "#f0faf4" },
    inconsistent: { icon: <XCircle size={20} />, color: "#E04848", text: "不一致", bg: "#fef1f1" },
  }

  const statusCheckConfig: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
    normal: { icon: <CheckCircle2 size={20} />, color: "#2EAD6B", text: "正常", bg: "#f0faf4" },
    abnormal: { icon: <XCircle size={20} />, color: "#E04848", text: "异常", bg: "#fef1f1" },
  }

  if (!license) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="text-center p-8">
          <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500 mb-4">未找到证照信息，请从受理台进入</div>
          <Button type="primary" onClick={() => navigate("/")} style={{ background: "#1B3A5C" }}>
            返回受理台
          </Button>
        </Card>
      </div>
    )
  }

  const eCfg = verificationResult ? expiryConfig[verificationResult.expiryCheck] : expiryConfig.valid
  const aCfg = verificationResult ? authorityConfig[verificationResult.authorityCheck] : authorityConfig.consistent
  const sCfg = verificationResult ? statusCheckConfig[verificationResult.statusCheck] : statusCheckConfig.normal

  const comparisonColumns = [
    { title: "申请表字段", dataIndex: "formField", key: "formField", width: "25%" },
    { title: "申请表值", dataIndex: "formValue", key: "formValue", width: "25%" },
    { title: "证照字段", dataIndex: "licenseField", key: "licenseField", width: "25%" },
    { title: "证照值", dataIndex: "licenseValue", key: "licenseValue", width: "20%" },
    {
      title: "比对结果",
      key: "result",
      width: "5%",
      render: (_: unknown, record: { result: string }) => {
        const map: Record<string, { color: string; text: string }> = {
          match: { color: "green", text: "一致" },
          mismatch: { color: "red", text: "不一致" },
          missing: { color: "orange", text: "缺失" },
        }
        const cfg = map[record.result] || map.missing
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
  ]

  const hasMismatch = verificationResult?.fieldComparison.some((f) => f.result !== "match")
  const hasAbnormal = verificationResult?.expiryCheck === "expired" || verificationResult?.statusCheck === "abnormal"

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Button
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate("/")}
          type="text"
          className="text-gray-500"
        />
        <h2 className="text-lg font-bold text-[#1B3A5C] m-0">证照核验</h2>
        <Tag color="blue">{license.name}</Tag>
      </div>

      <Steps
        current={step}
        items={[
          { title: "核验证照" },
          { title: "字段比对" },
          { title: "填写原因" },
          { title: "签字确认" },
        ]}
        className="mb-4"
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 space-y-5">
          <Card
            title={
              <div className="flex items-center gap-2 text-[#1B3A5C]">
                <ShieldCheck size={16} />
                <span>证照信息</span>
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-gray-400">证照名称：</span><span className="font-medium">{license.name}</span></div>
              <div><span className="text-gray-400">证照编号：</span>{license.licenseNumber}</div>
              <div><span className="text-gray-400">持证人：</span>{license.holderName}</div>
              <div><span className="text-gray-400">身份证号：</span>{license.holderIdNumber}</div>
              <div><span className="text-gray-400">签发日期：</span>{license.issueDate}</div>
              <div><span className="text-gray-400">有效期至：</span>{license.expiryDate}</div>
              <div className="col-span-2"><span className="text-gray-400">签发机关：</span>{license.issueAuthority}</div>
            </div>
          </Card>

          <Card
            title="核验结果"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg p-4 text-center" style={{ background: eCfg.bg }}>
                <div className="flex items-center justify-center gap-2 mb-1" style={{ color: eCfg.color }}>
                  <Clock size={16} />
                  <span className="font-bold text-lg">{eCfg.text}</span>
                </div>
                <div className="text-xs text-gray-400">有效期核验</div>
              </div>
              <div className="rounded-lg p-4 text-center" style={{ background: aCfg.bg }}>
                <div className="flex items-center justify-center gap-2 mb-1" style={{ color: aCfg.color }}>
                  <Building2 size={16} />
                  <span className="font-bold text-lg">{aCfg.text}</span>
                </div>
                <div className="text-xs text-gray-400">签发机关核验</div>
              </div>
              <div className="rounded-lg p-4 text-center" style={{ background: sCfg.bg }}>
                <div className="flex items-center justify-center gap-2 mb-1" style={{ color: sCfg.color }}>
                  <ShieldCheck size={16} />
                  <span className="font-bold text-lg">{sCfg.text}</span>
                </div>
                <div className="text-xs text-gray-400">证照状态核验</div>
              </div>
            </div>
          </Card>

          {verificationResult && verificationResult.fieldComparison.length > 0 && (
            <Card
              title="字段比对"
              className="shadow-sm"
              styles={{ body: { padding: "12px 16px" } }}
            >
              <Table
                dataSource={verificationResult.fieldComparison}
                columns={comparisonColumns}
                pagination={false}
                size="small"
                rowKey="formField"
                rowClassName={(record) =>
                  record.result !== "match" ? "bg-red-50" : ""
                }
              />
            </Card>
          )}
        </div>

        <div className="col-span-5 space-y-5">
          {verificationResult?.duplicateWarning && (
            <Alert
              message="重复材料提示"
              description="该证照在本次事项办理中已被调用过，群众可免交纸质复印件。"
              type="warning"
              showIcon
              icon={<Copy size={16} />}
            />
          )}

          {hasAbnormal && (
            <Alert
              message="证照存在异常"
              description="该证照核验未通过，建议进入异常处理流程进行上报。"
              type="error"
              showIcon
              icon={<AlertTriangle size={16} />}
              action={
                <Button
                  size="small"
                  danger
                  onClick={() => navigate("/exception")}
                >
                  去处理
                </Button>
              }
            />
          )}

          <Card
            title="调用原因登记（必填）"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">调用原因类别</div>
                <Select
                  placeholder="请选择调用原因类别"
                  value={callReason?.category}
                  onChange={(v) => handleReasonChange("category", v)}
                  className="w-full"
                  options={[
                    { value: "legal_requirement", label: "法定要求" },
                    { value: "material_verification", label: "材料核验" },
                    { value: "information_comparison", label: "信息比对" },
                  ]}
                />
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">调用说明</div>
                <Input.TextArea
                  placeholder="请说明调用该证照的具体原因"
                  value={callReason?.description || ""}
                  onChange={(e) => handleReasonChange("description", e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                type="primary"
                disabled={!callReason?.category || !callReason?.description}
                onClick={() => {
                  setStep(2)
                  message.success("调用原因已登记")
                }}
                style={{ background: "#1B3A5C" }}
                block
              >
                确认原因
              </Button>
            </div>
          </Card>

          {step >= 2 && (
            <Card
              title="群众签字确认"
              className="shadow-sm"
              styles={{ body: { padding: "16px 20px" } }}
            >
              <div className="text-sm text-gray-500 mb-3">
                请群众在下方签字确认已授权调用电子证照
              </div>
              <SignPad
                onConfirm={handleSignConfirm}
                width={400}
                height={140}
              />
            </Card>
          )}

          {step >= 3 && (
            <>
              <Divider className="my-2" />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  icon={<Download size={16} />}
                  onClick={handleDownload}
                  className="w-full"
                >
                  下载证照
                </Button>
                <Button
                  icon={<FileDown size={16} />}
                  onClick={handleExport}
                  className="w-full"
                >
                  导出报告
                </Button>
                <Button
                  icon={<Printer size={16} />}
                  onClick={() => {
                    if (!license) return
                    addAuditRecord(makeRecord("print", `打印${license.name}证照信息`))
                    message.success("证照打印任务已提交，操作已留痕")
                  }}
                  className="w-full col-span-2"
                >
                  打印证照
                </Button>
                <Button
                  type="primary"
                  onClick={handleComplete}
                  style={{ background: "#2EAD6B" }}
                  className="w-full col-span-2"
                >
                  完成调用
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        title="导出证照核验报告"
        open={exportVisible}
        onCancel={() => setExportVisible(false)}
        onOk={handleConfirmExport}
        okText="确认导出"
        cancelText="取消"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <div>本次导出将包含以下内容：</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>{license.name}证照基本信息</li>
            <li>有效期、签发机关、状态核验结果</li>
            <li>字段比对明细（共 {verificationResult?.fieldComparison.length || 0} 项）</li>
            <li>调用原因与群众签字（如有）</li>
          </ul>
          <div className="text-gray-400 text-xs mt-2">导出操作将自动记入留痕档案</div>
        </div>
      </Modal>
    </div>
  )
}
