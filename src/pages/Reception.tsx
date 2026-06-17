import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Input, Card, Empty, Button, Tag, message, Divider, Modal, Descriptions } from "antd"
import {
  Search,
  ScanLine,
  User,
  FileBadge,
  ChevronRight,
  RefreshCw,
  Printer,
  FileDown,
  Eye,
  AlertTriangle,
} from "lucide-react"
import { useMatterStore } from "@/stores/useMatterStore"
import { useLicenseStore } from "@/stores/useLicenseStore"
import { useAuditStore } from "@/stores/useAuditStore"
import { useNoticeStore } from "@/stores/useNoticeStore"
import LicenseCard from "@/components/LicenseCard"
import type { AuditRecord, NoticeRecord, SupplementItem } from "@/types"
import { licenses as allLicensesData } from "@/mock/licenses"
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
  const { addNotice, notices, getNoticeByCitizenMatter } = useNoticeStore()

  const [idInput, setIdInput] = useState("")
  const [idSearchLoading, setIdSearchLoading] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(false)
  const [noticeAction, setNoticeAction] = useState<"print" | "export">("print")

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
        if (selectedMatter) {
          const rec: AuditRecord = {
            id: `A${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            licenseId: "SYSTEM",
            licenseName: "身份识别",
            matterId: selectedMatter.id,
            matterName: selectedMatter.name,
            windowNo: "窗口1",
            operatorId: "OP001",
            operatorName: "王丽娟",
            citizenId: found.idNumber,
            citizenName: found.name,
            callReason: { category: "legal_requirement", description: "群众刷身份证取号识别身份" },
            verificationResult: {
              licenseId: "SYSTEM",
              expiryCheck: "valid",
              authorityCheck: "consistent",
              statusCheck: "normal",
              fieldComparison: [],
              duplicateWarning: false,
              missingLicenses: [],
            },
            signatureDataUrl: "",
            action: "scan",
            createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          }
          addAuditRecord(rec)
        }
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

  const missingLicenseIds = selectedMatter
    ? selectedMatter.requiredLicenses.filter(
        (id) => !currentLicenses.find((l) => l.id === id)
      )
    : []

  const missingLicenseNames = missingLicenseIds
    .map((id) => allLicensesData.find((l) => l.id === id)?.name || id)
    .filter(Boolean)

  const makeNoticeRecord = (action: "print" | "export"): AuditRecord => {
    const desc = action === "print" ? "打印一次性告知单" : "导出一次性告知单"
    return {
      id: `A${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      licenseId: "NOTICE",
      licenseName: "一次性告知单",
      matterId: selectedMatter?.id || "",
      matterName: selectedMatter?.name || "",
      windowNo: "窗口1",
      operatorId: "OP001",
      operatorName: "王丽娟",
      citizenId: citizen?.idNumber || "",
      citizenName: citizen?.name || "",
      callReason: {
        category: "legal_requirement",
        description: `${desc}，缺失证照：${missingLicenseNames.join("、") || "无"}`,
      },
      verificationResult: {
        licenseId: "NOTICE",
        expiryCheck: "valid",
        authorityCheck: "consistent",
        statusCheck: "normal",
        fieldComparison: [],
        duplicateWarning: false,
        missingLicenses: missingLicenseIds,
      },
      signatureDataUrl: "",
      action,
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    }
  }

  const handlePrintNotice = () => {
    if (!selectedMatter || !citizen) return
    setNoticeAction("print")
    setNoticeVisible(true)
  }

  const handleExportNotice = () => {
    if (!selectedMatter || !citizen) return
    setNoticeAction("export")
    setNoticeVisible(true)
  }

  const handleConfirmNotice = () => {
    if (!selectedMatter || !citizen) return
    const audit = makeNoticeRecord(noticeAction)
    addAuditRecord(audit)
    const supplements: SupplementItem[] = missingLicenseIds.map((id) => ({
      licenseId: id,
      licenseName: missingLicenseNames[missingLicenseIds.indexOf(id)] || id,
      status: "pending",
    }))
    let notice = getNoticeByCitizenMatter(citizen.idNumber, selectedMatter.id)
    if (!notice) {
      notice = {
        id: `N${Date.now()}${Math.floor(Math.random() * 1000)}`,
        citizenId: citizen.idNumber,
        citizenName: citizen.name,
        matterId: selectedMatter.id,
        matterName: selectedMatter.name,
        windowNo: "窗口1",
        operatorName: "王丽娟",
        supplements,
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      }
      addNotice(notice)
    }
    if (noticeAction === "print" && !notice.printedAt) {
      notice.printedAt = dayjs().format("YYYY-MM-DD HH:mm:ss")
    }
    if (noticeAction === "export" && !notice.exportedAt) {
      notice.exportedAt = dayjs().format("YYYY-MM-DD HH:mm:ss")
    }
    setNoticeVisible(false)
    message.success(
      noticeAction === "print"
        ? "一次性告知单已发送至打印队列，操作已留痕"
        : "一次性告知单已导出，操作已留痕"
    )
  }

  const currentNotice = useMemo(
    () => (selectedMatter && citizen ? getNoticeByCitizenMatter(citizen.idNumber, selectedMatter.id) : undefined),
    [selectedMatter, citizen, notices]
  )

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
                placeholder="请输入群众身份证号码（示例：110101199001011234）"
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
                <div className="flex-1">
                  <div className="font-medium text-[#1B3A5C] text-base">{citizen.name}</div>
                  <div className="text-sm text-gray-500">
                    {citizen.gender} · {citizen.idNumber}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{citizen.address}</div>
                </div>
                <Tag color="cyan" icon={<ScanLine size={12} />}>
                  已刷证
                </Tag>
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
                    <Button icon={<RefreshCw size={14} />} size="small" onClick={handleRefresh}>
                      刷新状态
                    </Button>
                    <Button
                      icon={<Eye size={14} />}
                      size="small"
                      onClick={() => {
                        setNoticeAction("print")
                        setNoticeVisible(true)
                      }}
                    >
                      预览告知单
                    </Button>
                    <Button
                      icon={<FileDown size={14} />}
                      size="small"
                      onClick={handleExportNotice}
                    >
                      导出告知单
                    </Button>
                    <Button icon={<Printer size={14} />} size="small" onClick={handlePrintNotice}>
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
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-red-600" />
                        <span className="text-sm font-medium text-red-700">
                          缺失证照（共 {missingLicenseIds.length} 项）- 以下证照群众未持有，需补充提交
                        </span>
                      </div>
                      <div className="text-sm text-red-600 mb-3">
                        {missingLicenseNames.join("、")}
                      </div>
                      {currentNotice && currentNotice.supplements.length > 0 && (
                        <div className="bg-white rounded p-2 mb-3 border border-red-100">
                          <div className="text-xs font-medium text-gray-600 mb-1.5">
                            📋 补交进度（告知单 {currentNotice.id}）
                            {currentNotice.printedAt && <Tag color="orange" className="ml-2 text-xs">已打印</Tag>}
                            {currentNotice.exportedAt && <Tag color="gold" className="ml-1 text-xs">已导出</Tag>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentNotice.supplements.map((s) => (
                              <Tag
                                key={s.licenseId}
                                color={s.status === "submitted" ? "green" : s.status === "returned" ? "red" : "orange"}
                                className="text-xs"
                              >
                                {s.licenseName}：{s.status === "submitted" ? "已补交" : s.status === "returned" ? "退回补正" : "待补交"}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          type="primary"
                          danger
                          icon={<Eye size={14} />}
                          onClick={() => {
                            setNoticeAction("print")
                            setNoticeVisible(true)
                          }}
                        >
                          预览一次性告知单
                        </Button>
                        <Button
                          size="small"
                          icon={<Printer size={14} />}
                          onClick={handlePrintNotice}
                        >
                          打印
                        </Button>
                        <Button
                          size="small"
                          icon={<FileDown size={14} />}
                          onClick={handleExportNotice}
                        >
                          导出
                        </Button>
                      </div>
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

      <Modal
        title={
          <div className="flex items-center gap-2 text-[#1B3A5C]">
            <FileBadge size={18} />
            <span>一次性告知单{noticeAction === "print" ? "（打印预览）" : "（导出预览）"}</span>
          </div>
        }
        open={noticeVisible}
        onCancel={() => setNoticeVisible(false)}
        onOk={handleConfirmNotice}
        okText={noticeAction === "print" ? "确认打印" : "确认导出"}
        cancelText="取消"
        width={720}
      >
        {selectedMatter && citizen && (
          <div className="border rounded-lg p-6 bg-white">
            <div className="text-center mb-5">
              <div className="text-lg font-bold text-[#1B3A5C]">政务服务一次性告知单</div>
              <div className="text-xs text-gray-400 mt-1">
                编号：GZ-{dayjs().format("YYYYMMDD")}-{Math.floor(Math.random() * 9000 + 1000)}
              </div>
            </div>

            <Descriptions column={2} size="small" bordered className="mb-4">
              <Descriptions.Item label="办理事项" span={2}>
                <span className="font-medium text-[#1B3A5C]">{selectedMatter.name}</span>
              </Descriptions.Item>
              <Descriptions.Item label="承办部门">{selectedMatter.department}</Descriptions.Item>
              <Descriptions.Item label="办理窗口">窗口1</Descriptions.Item>
              <Descriptions.Item label="群众姓名">{citizen.name}</Descriptions.Item>
              <Descriptions.Item label="身份证号">{citizen.idNumber}</Descriptions.Item>
              <Descriptions.Item label="窗口人员">王丽娟（OP001）</Descriptions.Item>
              <Descriptions.Item label="告知日期">{dayjs().format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
            </Descriptions>

            <div className="mb-4">
              <div className="text-sm font-medium text-[#1B3A5C] mb-2">一、已可调用的电子证照（{currentLicenses.length} 项）</div>
              {currentLicenses.length > 0 ? (
                <div className="border rounded">
                  <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                    <div className="col-span-1">序号</div>
                    <div className="col-span-5">证照名称</div>
                    <div className="col-span-4">证照编号</div>
                    <div className="col-span-2">状态</div>
                  </div>
                  {currentLicenses.map((lic, idx) => (
                    <div key={lic.id} className="grid grid-cols-12 px-3 py-2 border-t text-sm">
                      <div className="col-span-1 text-gray-400">{idx + 1}</div>
                      <div className="col-span-5">{lic.name}</div>
                      <div className="col-span-4 font-mono text-xs text-gray-600">{lic.licenseNumber}</div>
                      <div className="col-span-2">
                        <Tag color={lic.status === "normal" ? "green" : "red"}>
                          {lic.status === "normal" ? "正常" : lic.status === "expired" ? "已过期" : lic.status === "revoked" ? "已吊销" : "已挂失"}
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">暂无可调用电子证照</div>
              )}
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-red-600 mb-2">
                二、需补交的纸质材料（{missingLicenseIds.length} 项）
              </div>
              {missingLicenseIds.length > 0 ? (
                <div className="border border-red-200 rounded bg-red-50">
                  <div className="grid grid-cols-12 bg-red-100 px-3 py-2 text-xs font-medium text-red-600">
                    <div className="col-span-1">序号</div>
                    <div className="col-span-5">材料/证照名称</div>
                    <div className="col-span-6">补交说明</div>
                  </div>
                  {missingLicenseNames.map((name, idx) => (
                    <div key={idx} className="grid grid-cols-12 px-3 py-2 border-t border-red-100 text-sm">
                      <div className="col-span-1 text-gray-400">{idx + 1}</div>
                      <div className="col-span-5 text-red-700">{name}</div>
                      <div className="col-span-6 text-gray-600 text-xs">
                        群众未持有该电子证照，需携带原件及复印件至窗口核验，复印件需加盖"与原件一致"章并由群众签字确认。
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-green-600">✓ 本事项所需证照群众均已持有，无需补交</div>
              )}
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">三、办理须知</div>
              <ul className="text-xs text-gray-500 space-y-1 list-disc pl-5">
                <li>请群众在补交材料前认真核对以上清单，如有疑问可咨询窗口工作人员</li>
                <li>已调用的电子证照无需重复提交纸质材料，系统将自动核验并留存记录</li>
                <li>所有操作均已记入电子证照调用留痕档案，可随时查询追溯</li>
                <li>本告知单一式两份，窗口留存一份，群众带走一份</li>
              </ul>
            </div>

            <div className="flex justify-between items-end pt-4 border-t">
              <div className="text-xs text-gray-400">
                窗口人员签字：____________<span className="ml-4">日期：{dayjs().format("YYYY年MM月DD日")}</span>
              </div>
              <div className="text-xs text-gray-400">
                群众签字确认：____________
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
