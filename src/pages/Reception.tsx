import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Input, Card, Empty, Button, Tag, message, Divider } from "antd"
import {
  Search,
  ScanLine,
  User,
  FileBadge,
  ChevronRight,
  RefreshCw,
  Printer,
} from "lucide-react"
import { useMatterStore } from "@/stores/useMatterStore"
import { useLicenseStore } from "@/stores/useLicenseStore"
import { useAuditStore } from "@/stores/useAuditStore"
import LicenseCard from "@/components/LicenseCard"
import type { AuditRecord } from "@/types"
import dayjs from "dayjs"

export default function Reception() {
  const navigate = useNavigate()
  const {
    selectedMatter,
    citizen,
    searchKeyword,
    setSearchKeyword,
    selectMatter,
    findCitizen,
    setCitizen,
    filteredMatters,
  } = useMatterStore()
  const { allLicenses, currentLicenses, setCurrentLicenses, reset: resetLicense } = useLicenseStore()
  const addAuditRecord = useAuditStore((s) => s.addRecord)

  const [idInput, setIdInput] = useState("")
  const [idSearchLoading, setIdSearchLoading] = useState(false)

  const matters = filteredMatters()
  const categories = [...new Set(matters.map((m) => m.category))]

  useEffect(() => {
    if (selectedMatter && citizen) {
      const citizenLicenses = allLicenses.filter(
        (l) => l.holderIdNumber === citizen.idNumber
      )
      const matterLicenseIds = selectedMatter.requiredLicenses
      const matched = citizenLicenses.filter((l) => matterLicenseIds.includes(l.id))
      setCurrentLicenses(matched.map((l) => l.id))
    } else {
      resetLicense()
    }
  }, [selectedMatter, citizen, allLicenses, setCurrentLicenses, resetLicense])

  const handleIdSearch = () => {
    if (!idInput.trim()) {
      message.warning("请输入身份证号")
      return
    }
    setIdSearchLoading(true)
    setTimeout(() => {
      const found = findCitizen(idInput.trim())
      if (found) {
        setCitizen(found)
        message.success("查询成功")
      } else {
        setCitizen(null)
        message.error("未找到该身份证号对应的信息")
      }
      setIdSearchLoading(false)
    }, 400)
  }

  const handleSelectMatter = (matter: typeof matters[0]) => {
    selectMatter(matter)
  }

  const handleRefresh = () => {
    if (!selectedMatter || !citizen) return
    const citizenLicenses = allLicenses.filter(
      (l) => l.holderIdNumber === citizen.idNumber
    )
    const matterLicenseIds = selectedMatter.requiredLicenses
    const matched = citizenLicenses.filter((l) => matterLicenseIds.includes(l.id))
    setCurrentLicenses(matched.map((l) => l.id))
    message.success("证照状态已刷新")
  }

  const handleStartVerify = (licenseId: string) => {
    navigate(`/verify/${licenseId}`)
  }

  const handlePrintNotice = () => {
    if (!selectedMatter || !citizen) return
    const record: AuditRecord = {
      id: `A${Date.now()}`,
      licenseId: "MULTI",
      licenseName: "告知单打印",
      matterId: selectedMatter.id,
      matterName: selectedMatter.name,
      windowNo: "窗口1",
      operatorId: "OP001",
      operatorName: "王丽娟",
      citizenId: citizen.idNumber,
      citizenName: citizen.name,
      callReason: { category: "material_verification", description: "打印一次性告知单" },
      verificationResult: {
        licenseId: "MULTI",
        expiryCheck: "valid",
        authorityCheck: "consistent",
        statusCheck: "normal",
        fieldComparison: [],
        duplicateWarning: false,
        missingLicenses: missingLicenseIds,
      },
      signatureDataUrl: "",
      action: "download",
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    }
    addAuditRecord(record)
    message.info("一次性告知单已发送至打印队列，操作已留痕")
  }

  const missingLicenseIds = selectedMatter
    ? selectedMatter.requiredLicenses.filter(
        (id) => !currentLicenses.find((l) => l.id === id)
      )
    : []

  const showLicenseList = selectedMatter && citizen

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-4">
          <Card
            title={
              <div className="flex items-center gap-2 text-[#1B3A5C]">
                <Search size={16} />
                <span>事项选择</span>
                {selectedMatter && (
                  <Tag color="blue" className="ml-auto text-xs">
                    已选事项
                  </Tag>
                )}
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: "12px 16px", maxHeight: 520, overflow: "auto" } }}
          >
            <Input
              placeholder="搜索事项名称、部门、类别..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              prefix={<Search size={14} className="text-gray-400" />}
              allowClear
              className="mb-3"
            />
            {categories.map((cat) => (
              <div key={cat} className="mb-3">
                <div className="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
                  {cat}
                </div>
                {matters
                  .filter((m) => m.category === cat)
                  .map((matter) => (
                    <div
                      key={matter.id}
                      onClick={() => handleSelectMatter(matter)}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-all text-sm mb-1 ${
                        selectedMatter?.id === matter.id
                          ? "bg-[#1B3A5C] text-white shadow"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{matter.name}</div>
                        <div
                          className={`text-xs mt-0.5 ${
                            selectedMatter?.id === matter.id ? "text-white/60" : "text-gray-400"
                          }`}
                        >
                          {matter.department}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={
                          selectedMatter?.id === matter.id ? "text-white/60" : "text-gray-300"
                        }
                      />
                    </div>
                  ))}
              </div>
            ))}
            {matters.length === 0 && <Empty description="未找到匹配事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </div>

        <div className="col-span-8 space-y-5">
          <Card
            title={
              <div className="flex items-center gap-2 text-[#1B3A5C]">
                <User size={16} />
                <span>身份识别</span>
                {citizen && (
                  <Tag color="green" className="ml-auto text-xs">
                    已识别
                  </Tag>
                )}
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="flex items-center gap-3">
              <Input
                placeholder="请输入群众身份证号码"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onPressEnter={handleIdSearch}
                className="flex-1"
                size="large"
                style={{ fontSize: 16, letterSpacing: 2 }}
              />
              <Button
                type="primary"
                icon={<ScanLine size={16} />}
                onClick={handleIdSearch}
                loading={idSearchLoading}
                style={{ background: "#1B3A5C", height: 40 }}
                className="px-5"
              >
                扫码/查询
              </Button>
            </div>
            {citizen && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#1B3A5C] flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <div className="font-medium text-[#1B3A5C] text-base">{citizen.name}</div>
                  <div className="text-sm text-gray-500">
                    {citizen.gender} · {citizen.idNumber}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{citizen.address}</div>
                </div>
              </div>
            )}
          </Card>

          {showLicenseList && (
            <>
              <Card
                title={
                  <div className="flex items-center gap-2 text-[#1B3A5C]">
                    <FileBadge size={16} />
                    <span>可调用证照清单</span>
                    <Tag color="blue" className="ml-2">
                      {selectedMatter.name}
                    </Tag>
                    <Tag color="green" className="ml-1">
                      {citizen.name}
                    </Tag>
                  </div>
                }
                extra={
                  <div className="flex gap-2">
                    <Button
                      icon={<RefreshCw size={14} />}
                      size="small"
                      onClick={handleRefresh}
                    >
                      刷新状态
                    </Button>
                    <Button
                      icon={<Printer size={14} />}
                      size="small"
                      onClick={handlePrintNotice}
                    >
                      打印告知单
                    </Button>
                  </div>
                }
                className="shadow-sm"
                styles={{ body: { padding: "12px 16px" } }}
              >
                {currentLicenses.length > 0 ? (
                  <div className="space-y-3">
                    {currentLicenses.map((license) => (
                      <LicenseCard
                        key={license.id}
                        license={license}
                        onVerify={() => handleStartVerify(license.id)}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <Empty
                    description="该群众未持有本事项所需的任何电子证照"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="py-6"
                  />
                )}

                {missingLicenseIds.length > 0 && (
                  <>
                    <Divider className="my-3" />
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-red-700 mb-1">
                        ⚠ 缺失证照 - 以下证照群众未持有，需补充提交
                      </div>
                      <div className="text-sm text-red-600">
                        共 {missingLicenseIds.length} 项缺失：{missingLicenseIds.join("、")}
                      </div>
                      <Button
                        size="small"
                        className="mt-2"
                        type="primary"
                        danger
                        icon={<Printer size={14} />}
                        onClick={handlePrintNotice}
                      >
                        生成一次性告知单
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {!showLicenseList && (
            <Card className="shadow-sm" styles={{ body: { padding: "60px 20px" } }}>
              <Empty
                description={
                  <div className="text-gray-400">
                    <div className="text-base mb-1">
                      {selectedMatter
                        ? "请输入群众身份证号查询"
                        : citizen
                        ? "请先选择办理事项"
                        : "请选择办理事项并输入身份证号"}
                    </div>
                    <div className="text-sm">
                      事项和群众都确定后，自动列出可调用的电子证照清单
                    </div>
                  </div>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
