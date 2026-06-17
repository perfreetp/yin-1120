import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, Table, Tag, Button, Input, DatePicker, Select, Modal, Descriptions, message, Tabs, Timeline, Empty, Collapse, Popconfirm, Dropdown } from "antd"
import type { Dayjs } from "dayjs"
import {
  FileText,
  Search,
  RotateCcw,
  Download,
  Eye,
  FileDown,
  ScanLine,
  ShieldCheck,
  PhoneCall,
  MousePointerClick,
  Printer,
  GitBranch,
  List,
  CheckCircle2,
  RotateCcw as RotateIcon,
  ChevronDown,
} from "lucide-react"
import { useAuditStore } from "@/stores/useAuditStore"
import { useNoticeStore } from "@/stores/useNoticeStore"
import type { AuditRecord, SupplementItem } from "@/types"
import dayjs from "dayjs"

const { RangePicker } = DatePicker

const actionMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  scan: { color: "cyan", text: "刷证识别", icon: <ScanLine size={14} /> },
  verify: { color: "blue", text: "证照核验", icon: <ShieldCheck size={14} /> },
  call: { color: "purple", text: "证照调用", icon: <PhoneCall size={14} /> },
  view: { color: "geekblue", text: "查看详情", icon: <Eye size={14} /> },
  download: { color: "green", text: "下载证照", icon: <FileDown size={14} /> },
  export: { color: "gold", text: "导出报告", icon: <Download size={14} /> },
  print: { color: "orange", text: "打印输出", icon: <Printer size={14} /> },
  submit_supplement: { color: "purple", text: "补交材料", icon: <CheckCircle2 size={14} /> },
  return_supplement: { color: "magenta", text: "退回补正", icon: <RotateIcon size={14} /> },
  matter_select: { color: "default", text: "选择事项", icon: <List size={14} /> },
}

const actionColorMap: Record<string, string> = {
  scan: "#13C2C2",
  verify: "#1677ff",
  call: "#722ED1",
  view: "#2F54EB",
  download: "#52C41A",
  export: "#FAAD14",
  print: "#FA8C16",
  submit_supplement: "#722ED1",
  return_supplement: "#EB2F96",
  matter_select: "#666",
}

const reasonCategoryMap: Record<string, string> = {
  legal_requirement: "法定要求",
  material_verification: "材料核验",
  information_comparison: "信息比对",
}

const expiryMap: Record<string, string> = {
  valid: "有效",
  expiring_soon: "即将到期",
  expired: "已过期",
}

export default function Audit() {
  const navigate = useNavigate()
  const { records, addRecord } = useAuditStore()
  const { auditFilter, setAuditFilter, resetAuditFilter, notices, getNoticeByCitizenMatter, updateSupplement } = useNoticeStore()

  const [searchText, setSearchText] = useState(auditFilter.searchText || "")
  const [windowFilter, setWindowFilter] = useState<string>(auditFilter.windowFilter || "")
  const [actionFilter, setActionFilter] = useState<string>(auditFilter.actionFilter || "")
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    auditFilter.dateRange ? [dayjs(auditFilter.dateRange[0]), dayjs(auditFilter.dateRange[1])] : null
  )
  const [detailRecord, setDetailRecord] = useState<AuditRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [chainView, setChainView] = useState<"list" | "chain">("list")
  const [selectedCitizenId, setSelectedCitizenId] = useState<string>(auditFilter.citizenFilter || "")
  const [expandedMatters, setExpandedMatters] = useState<string[]>([])

  useEffect(() => {
    setSearchText(auditFilter.searchText || "")
    setWindowFilter(auditFilter.windowFilter || "")
    setActionFilter(auditFilter.actionFilter || "")
    setDateRange(
      auditFilter.dateRange ? [dayjs(auditFilter.dateRange[0]), dayjs(auditFilter.dateRange[1])] : null
    )
    setSelectedCitizenId(auditFilter.citizenFilter || "")
  }, [])

  const windows = useMemo(() => [...new Set(records.map((r) => r.windowNo))], [records])

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchText ||
        r.licenseName.includes(searchText) ||
        r.matterName.includes(searchText) ||
        r.operatorName.includes(searchText) ||
        r.citizenName.includes(searchText)
      const matchWindow = !windowFilter || r.windowNo === windowFilter
      const matchAction = !actionFilter || r.action === actionFilter
      let matchDate = true
      if (dateRange && dateRange[0] && dateRange[1]) {
        const recordDate = dayjs(r.createdAt)
        matchDate =
          (recordDate.isSame(dateRange[0], "day") || recordDate.isAfter(dateRange[0])) &&
          (recordDate.isSame(dateRange[1], "day") || recordDate.isBefore(dateRange[1]))
      }
      return matchSearch && matchWindow && matchAction && matchDate
    })
  }, [records, searchText, windowFilter, actionFilter, dateRange])

  const citizens = useMemo(() => {
    const m = new Map<string, { id: string; name: string; idNumber: string }>()
    filteredRecords.forEach((r) => {
      if (!m.has(r.citizenId)) m.set(r.citizenId, { id: r.citizenId, name: r.citizenName, idNumber: r.citizenId })
    })
    return Array.from(m.values())
  }, [filteredRecords])

  const citizenMatterGroups = useMemo(() => {
    const citizenMap = new Map<string, Map<string, AuditRecord[]>>()
    filteredRecords.forEach((r) => {
      if (selectedCitizenId && r.citizenId !== selectedCitizenId) return
      if (!citizenMap.has(r.citizenId)) citizenMap.set(r.citizenId, new Map())
      const matterMap = citizenMap.get(r.citizenId)!
      const matterKey = r.matterId || "NO_MATTER"
      if (!matterMap.has(matterKey)) matterMap.set(matterKey, [])
      matterMap.get(matterKey)!.push(r)
    })
    const result: Array<{
      citizenId: string
      citizenName: string
      matters: Array<{ matterId: string; matterName: string; records: AuditRecord[] }>
    }> = []
    citizenMap.forEach((matterMap, citizenId) => {
      const matters: Array<{ matterId: string; matterName: string; records: AuditRecord[] }> = []
      matterMap.forEach((recs, matterId) => {
        const sorted = [...recs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        matters.push({
          matterId,
          matterName: sorted[0]?.matterName || "未关联事项",
          records: sorted,
        })
      })
      const citizenName = matterMap.values().next().value?.[0]?.citizenName || citizenId
      result.push({
        citizenId,
        citizenName,
        matters: matters.sort((a, b) => a.records[0]?.createdAt.localeCompare(b.records[0]?.createdAt || "")),
      })
    })
    return result.sort((a, b) =>
      (b.matters[0]?.records[0]?.createdAt || "").localeCompare(a.matters[0]?.records[0]?.createdAt || "")
    )
  }, [filteredRecords, selectedCitizenId])

  const addAuditRecord = (record: AuditRecord, actionType: AuditRecord["action"], desc: string) => {
    addRecord({
      id: `A${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      licenseId: record.licenseId,
      licenseName: record.licenseName,
      matterId: record.matterId,
      matterName: record.matterName,
      windowNo: "窗口1",
      operatorId: "OP001",
      operatorName: "王丽娟",
      citizenId: record.citizenId,
      citizenName: record.citizenName,
      callReason: { category: "material_verification", description: desc },
      verificationResult: record.verificationResult,
      signatureDataUrl: "",
      action: actionType,
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    })
  }

  const handleViewDetail = (record: AuditRecord) => {
    setDetailRecord(record)
    setDetailVisible(true)
    addAuditRecord(record, "view", `查看${record.licenseName}调用详情`)
  }

  const handleDownload = (record: AuditRecord) => {
    addAuditRecord(record, "download", `下载${record.licenseName}电子件`)
    message.success(`下载 ${record.licenseName}，已自动留痕`)
  }

  const handleExport = () => {
    const rec: AuditRecord = {
      id: `A${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      licenseId: "EXPORT",
      licenseName: "记录导出",
      matterId: "ALL",
      matterName: "全量统计",
      windowNo: "窗口1",
      operatorId: "OP001",
      operatorName: "王丽娟",
      citizenId: "SYSTEM",
      citizenName: "系统操作",
      callReason: { category: "information_comparison", description: "导出调用留痕记录" },
      verificationResult: {
        licenseId: "EXPORT",
        expiryCheck: "valid",
        authorityCheck: "consistent",
        statusCheck: "normal",
        fieldComparison: [],
        duplicateWarning: false,
        missingLicenses: [],
      },
      signatureDataUrl: "",
      action: "export",
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    }
    addRecord(rec)
    message.success("导出功能已触发，操作已留痕")
  }

  const handleReset = () => {
    setSearchText("")
    setWindowFilter("")
    setActionFilter("")
    setDateRange(null)
    setSelectedCitizenId("")
    resetAuditFilter()
    message.info("筛选条件已重置")
  }

  const handleUpdateSupplement = (
    noticeId: string,
    licenseId: string,
    licenseName: string,
    status: SupplementItem["status"],
    record: AuditRecord
  ) => {
    updateSupplement(noticeId, licenseId, status)
    const actionType = status === "submitted" ? "submit_supplement" : "return_supplement"
    const desc = status === "submitted" ? `补交材料：${licenseName}` : `退回补正：${licenseName}`
    addAuditRecord(record, actionType, desc)
    message.success(status === "submitted" ? "已标记为已补交" : "已标记为退回补正")
  }

  const columns = [
    {
      title: "调用时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: "16%",
      sorter: (a: AuditRecord, b: AuditRecord) => a.createdAt.localeCompare(b.createdAt),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "窗口",
      dataIndex: "windowNo",
      key: "windowNo",
      width: "5%",
    },
    {
      title: "操作人",
      dataIndex: "operatorName",
      key: "operatorName",
      width: "6%",
    },
    {
      title: "办理事项",
      dataIndex: "matterName",
      key: "matterName",
      width: "14%",
      ellipsis: true,
      render: (text: string) => (
        <a
          onClick={() => {
            setSearchText(text)
            setAuditFilter({ searchText: text })
          }}
        >
          {text}
        </a>
      ),
    },
    {
      title: "证照",
      dataIndex: "licenseName",
      key: "licenseName",
      width: "11%",
    },
    {
      title: "群众",
      dataIndex: "citizenName",
      key: "citizenName",
      width: "5%",
      render: (text: string, record: AuditRecord) => (
        <a
          onClick={() => {
            setSelectedCitizenId(record.citizenId)
            setAuditFilter({ citizenFilter: record.citizenId })
          }}
        >
          {text}
        </a>
      ),
    },
    {
      title: "调用原因",
      dataIndex: "callReason",
      key: "callReason",
      width: "20%",
      render: (reason: AuditRecord["callReason"]) => (
        <span>
          <Tag color="blue" className="mr-1">
            {reasonCategoryMap[reason.category]}
          </Tag>
          <span className="text-xs text-gray-500">{reason.description}</span>
        </span>
      ),
    },
    {
      title: "操作类型",
      dataIndex: "action",
      key: "action",
      width: "8%",
      render: (action: string) => {
        const cfg = actionMap[action] || { color: "default", text: action, icon: null }
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.text}
          </Tag>
        )
      },
    },
    {
      title: "操作",
      key: "actions",
      width: "10%",
      render: (_: unknown, record: AuditRecord) => (
        <div className="flex gap-1">
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.licenseId !== "SYSTEM" && record.licenseId !== "NOTICE" && record.licenseId !== "EXPORT" && (
            <Button
              type="link"
              size="small"
              icon={<FileDown size={14} />}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
          )}
        </div>
      ),
    },
  ]

  const collapseItems = citizenMatterGroups.flatMap((citizen) =>
    citizen.matters.map((matter, mIdx) => {
      const firstRecord = matter.records[0]
      const callCount = matter.records.filter((r) => r.action === "call").length
      const hasScan = matter.records.some((r) => r.action === "scan")
      const hasNotice = matter.records.some((r) => r.action === "print" && r.licenseName === "一次性告知单")
      const panelKey = `${citizen.citizenId}-${matter.matterId}`
      const notice = notices.find((n) => n.citizenId === citizen.citizenId && n.matterId === matter.matterId)
      return {
        key: panelKey,
        label: (
          <div className="flex items-center gap-3 py-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-[#1B3A5C]">{citizen.citizenName}</span>
              <span className="text-xs text-gray-400">
                ({citizen.citizenId.slice(0, 6)}...{citizen.citizenId.slice(-4)})
              </span>
            </div>
            <ChevronDown size={14} className="text-gray-300" />
            <span className="text-gray-700">办理</span>
            <span className="font-medium">{matter.matterName}</span>
            {hasScan && <Tag color="cyan" icon={<ScanLine size={12} />} className="text-xs">已刷证</Tag>}
            <Tag color="purple" className="text-xs">{callCount}次调用</Tag>
            {hasNotice && <Tag color="orange" icon={<Printer size={12} />} className="text-xs">已出告知单</Tag>}
            <span className="ml-auto text-xs text-gray-400">
              {matter.records[0].createdAt} ~ {matter.records[matter.records.length - 1].createdAt.slice(11)}
            </span>
          </div>
        ),
        children: (
          <div className="pl-2 pr-4 py-2">
            <Timeline
              mode="left"
              items={matter.records.map((r) => {
                const cfg = actionMap[r.action] || { color: "default", text: r.action, icon: null }
                const thisNotice = notice
                const supItem = thisNotice?.supplements.find((s) => s.licenseId === r.licenseId)
                return {
                  dot: (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
                      style={{ background: actionColorMap[r.action] || "#999" }}
                    >
                      {cfg.icon}
                    </div>
                  ),
                  color:
                    r.action === "scan"
                      ? "cyan"
                      : r.action === "verify"
                      ? "blue"
                      : r.action === "call"
                      ? "purple"
                      : r.action === "view"
                      ? "geekblue"
                      : r.action === "download"
                      ? "green"
                      : r.action === "export"
                      ? "gold"
                      : r.action === "print"
                      ? "orange"
                      : r.action === "submit_supplement"
                      ? "purple"
                      : r.action === "return_supplement"
                      ? "magenta"
                      : "default",
                  children: (
                    <div className="pl-2 pb-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Tag color={cfg.color as any} icon={cfg.icon}>
                          {cfg.text}
                        </Tag>
                        <span className="font-medium text-[#1B3A5C]">{r.licenseName}</span>
                        <span className="text-xs text-gray-400">事项：{r.matterName}</span>
                        <span className="text-xs text-gray-400">窗口：{r.windowNo}</span>
                        {r.verificationResult.statusCheck === "abnormal" && (
                          <Tag color="red" className="text-xs">证照异常</Tag>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 space-y-0.5">
                        <div>
                          <span className="text-gray-400">操作人：</span>
                          {r.operatorName}
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-gray-400">群众：</span>
                          {r.citizenName}
                        </div>
                        <div>
                          <span className="text-gray-400">调用原因：</span>
                          <Tag color="blue" style={{ marginRight: 4 }}>{reasonCategoryMap[r.callReason.category]}</Tag>
                          <span className="text-gray-600">{r.callReason.description}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="link"
                          size="small"
                          icon={<Eye size={13} />}
                          onClick={() => handleViewDetail(r)}
                          style={{ padding: 0 }}
                        >
                          查看详情
                        </Button>
                        {r.licenseId !== "SYSTEM" && r.licenseId !== "NOTICE" && r.licenseId !== "EXPORT" && (
                          <Button
                            type="link"
                            size="small"
                            icon={<FileDown size={13} />}
                            onClick={() => handleDownload(r)}
                            style={{ padding: 0 }}
                          >
                            下载
                          </Button>
                        )}
                        {thisNotice && supItem && (
                          <Dropdown
                            trigger={["click"]}
                            menu={{
                              items: [
                                {
                                  key: "submitted",
                                  label: (
                                    <span className="text-green-600">
                                      <CheckCircle2 size={13} className="mr-1 inline-block" />
                                      标记为已补交
                                    </span>
                                  ),
                                  onClick: () => handleUpdateSupplement(thisNotice.id, supItem.licenseId, supItem.licenseName, "submitted", r),
                                },
                                {
                                  key: "returned",
                                  label: (
                                    <span className="text-red-500">
                                      <RotateIcon size={13} className="mr-1 inline-block" />
                                      退回补正
                                    </span>
                                  ),
                                  onClick: () => handleUpdateSupplement(thisNotice.id, supItem.licenseId, supItem.licenseName, "returned", r),
                                },
                                supItem.status !== "pending"
                                  ? {
                                      key: "pending",
                                      label: "重置为待补交",
                                      onClick: () => handleUpdateSupplement(thisNotice.id, supItem.licenseId, supItem.licenseName, "pending", r),
                                    }
                                  : null,
                              ].filter(Boolean) as any,
                            }}
                          >
                            <Button type="link" size="small" style={{ padding: 0 }}>
                              补交操作 <ChevronDown size={12} />
                            </Button>
                          </Dropdown>
                        )}
                      </div>
                      {thisNotice && supItem && (
                        <div className="mt-2 pl-2 border-l-2 border-blue-200">
                          <div className="text-xs">
                            <span className="text-gray-400">告知单材料状态：</span>
                            <Tag
                              color={supItem.status === "submitted" ? "green" : supItem.status === "returned" ? "red" : "orange"}
                            >
                              {supItem.status === "submitted" ? "已补交" : supItem.status === "returned" ? "退回补正" : "待补交"}
                            </Tag>
                            {supItem.submittedAt && (
                              <span className="text-gray-400 ml-2">{supItem.submittedAt} · {supItem.submittedBy}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                  label: <div className="text-sm font-mono text-gray-500 pt-1">{r.createdAt}</div>,
                }
              })}
            />
            {notice && notice.supplements.length > 0 && (
              <div className="mt-3 border rounded p-3 bg-gray-50">
                <div className="text-xs font-medium text-gray-600 mb-2">📋 一次性告知单材料清单（{notice.id}）</div>
                <div className="space-y-1">
                  {notice.supplements.map((s) => (
                    <div key={s.licenseId} className="flex items-center gap-2 text-sm">
                      <Tag
                        color={s.status === "submitted" ? "green" : s.status === "returned" ? "red" : "orange"}
                      >
                        {s.status === "submitted" ? "已补交" : s.status === "returned" ? "退回补正" : "待补交"}
                      </Tag>
                      <span>{s.licenseName}</span>
                      {s.submittedAt && (
                        <span className="ml-auto text-xs text-gray-400">{s.submittedAt}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      }
    })
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <FileText size={22} className="text-[#1B3A5C]" />
        <h2 className="text-lg font-bold text-[#1B3A5C] m-0">留痕档案</h2>
        <span className="text-sm text-gray-400">共 {filteredRecords.length} 条调用记录</span>
        <div className="ml-auto">
          <Tabs
            activeKey={chainView}
            onChange={(v) => setChainView(v as "list" | "chain")}
            size="small"
            items={[
              {
                key: "list",
                label: (
                  <span className="flex items-center gap-1">
                    <MousePointerClick size={14} />
                    列表视图
                  </span>
                ),
              },
              {
                key: "chain",
                label: (
                  <span className="flex items-center gap-1">
                    <GitBranch size={14} />
                    案件链路
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>

      <Card className="shadow-sm" styles={{ body: { padding: "12px 16px" } }}>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="搜索证照、事项、操作人、群众..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setAuditFilter({ searchText: e.target.value })
            }}
            prefix={<Search size={14} className="text-gray-400" />}
            allowClear
            className="w-72"
          />
          {chainView === "chain" && (
            <Select
              placeholder="选择群众..."
              value={selectedCitizenId || undefined}
              onChange={(v) => {
                setSelectedCitizenId(v || "")
                setAuditFilter({ citizenFilter: v || "" })
              }}
              allowClear
              className="w-56"
              showSearch
              options={citizens.map((c) => ({ value: c.id, label: `${c.name} (${c.id.slice(-4)})` }))}
            />
          )}
          <Select
            placeholder="筛选窗口"
            value={windowFilter || undefined}
            onChange={(v) => {
              setWindowFilter(v || "")
              setAuditFilter({ windowFilter: v || "" })
            }}
            allowClear
            className="w-28"
            options={windows.map((w) => ({ value: w, label: w }))}
          />
          <Select
            placeholder="操作类型"
            value={actionFilter || undefined}
            onChange={(v) => {
              setActionFilter(v || "")
              setAuditFilter({ actionFilter: v || "" })
            }}
            allowClear
            className="w-32"
            options={[
              { value: "scan", label: "刷证识别" },
              { value: "verify", label: "证照核验" },
              { value: "call", label: "证照调用" },
              { value: "view", label: "查看详情" },
              { value: "download", label: "下载证照" },
              { value: "export", label: "导出报告" },
              { value: "print", label: "打印输出" },
              { value: "submit_supplement", label: "补交材料" },
              { value: "return_supplement", label: "退回补正" },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(val) => {
              setDateRange(val as [Dayjs | null, Dayjs | null] | null)
              if (val && val[0] && val[1]) {
                setAuditFilter({
                  dateRange: [val[0].format("YYYY-MM-DD HH:mm:ss"), val[1].format("YYYY-MM-DD HH:mm:ss")],
                })
              } else {
                setAuditFilter({ dateRange: null })
              }
            }}
            className="w-60"
            allowClear
          />
          <Button icon={<RotateCcw size={14} />} onClick={handleReset}>
            重置
          </Button>
          <div className="ml-auto">
            <Button icon={<Download size={14} />} onClick={handleExport}>
              导出记录
            </Button>
          </div>
        </div>
      </Card>

      {chainView === "list" ? (
        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={filteredRecords}
            columns={columns}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            size="small"
            rowKey="id"
          />
        </Card>
      ) : (
        <Card
          className="shadow-sm"
          title={
            <div className="flex items-center gap-2">
              <GitBranch size={16} className="text-[#1B3A5C]" />
              <span className="text-[#1B3A5C] font-medium">
                案件链路视图
                {selectedCitizenId && citizens.find((c) => c.id === selectedCitizenId) && (
                  <Tag color="blue" className="ml-2">
                    {citizens.find((c) => c.id === selectedCitizenId)?.name}
                  </Tag>
                )}
              </span>
              <span className="text-gray-400 text-xs">
                共 {citizenMatterGroups.reduce((a, b) => a + b.matters.length, 0)} 段办理过程，含 {filteredRecords.length} 个动作
              </span>
            </div>
          }
          styles={{ body: { padding: "12px 16px" } }}
        >
          {collapseItems.length > 0 ? (
            <Collapse
              activeKey={expandedMatters}
              onChange={(keys) => setExpandedMatters(keys as string[])}
              ghost
              size="small"
              items={collapseItems}
            />
          ) : (
            <Empty
              description={
                <div className="text-gray-400">
                  <div className="text-base mb-1">当前筛选条件下暂无案件链路</div>
                  <div className="text-sm">尝试清空筛选条件或选择其他群众</div>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}

      <Modal
        title={
          <div className="flex items-center gap-2 text-[#1B3A5C]">
            <Eye size={18} />
            <span>调用记录详情</span>
          </div>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={820}
      >
        {detailRecord && (
          <div className="space-y-4">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="调用时间">{detailRecord.createdAt}</Descriptions.Item>
              <Descriptions.Item label="窗口">{detailRecord.windowNo}</Descriptions.Item>
              <Descriptions.Item label="操作人">{detailRecord.operatorName}</Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {(() => {
                  const cfg = actionMap[detailRecord.action] || { color: "default", text: detailRecord.action, icon: null }
                  return (
                    <Tag color={cfg.color as any} icon={cfg.icon}>
                      {cfg.text}
                    </Tag>
                  )
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="办理事项" span={2}>
                {detailRecord.matterName}
              </Descriptions.Item>
              <Descriptions.Item label="调用证照" span={2}>
                {detailRecord.licenseName}
              </Descriptions.Item>
              <Descriptions.Item label="群众姓名">{detailRecord.citizenName}</Descriptions.Item>
              <Descriptions.Item label="身份证号">{detailRecord.citizenId}</Descriptions.Item>
              <Descriptions.Item label="调用原因类别">
                {reasonCategoryMap[detailRecord.callReason.category]}
              </Descriptions.Item>
              <Descriptions.Item label="调用说明">{detailRecord.callReason.description}</Descriptions.Item>
            </Descriptions>

            {detailRecord.verificationResult &&
              detailRecord.licenseId !== "SYSTEM" &&
              detailRecord.licenseId !== "NOTICE" &&
              detailRecord.licenseId !== "EXPORT" && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">核验结果（与核验页面一致）</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className={`text-center p-3 rounded ${
                        detailRecord.verificationResult.expiryCheck === "valid"
                          ? "bg-green-50"
                          : detailRecord.verificationResult.expiryCheck === "expiring_soon"
                          ? "bg-orange-50"
                          : "bg-red-50"
                      }`}
                    >
                      <div className="text-xs text-gray-400">有效期</div>
                      <div
                        className={`font-bold text-lg ${
                          detailRecord.verificationResult.expiryCheck === "valid"
                            ? "text-green-600"
                            : detailRecord.verificationResult.expiryCheck === "expiring_soon"
                            ? "text-orange-500"
                            : "text-red-500"
                        }`}
                      >
                        {expiryMap[detailRecord.verificationResult.expiryCheck]}
                      </div>
                    </div>
                    <div
                      className={`text-center p-3 rounded ${
                        detailRecord.verificationResult.authorityCheck === "consistent" ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <div className="text-xs text-gray-400">签发机关</div>
                      <div
                        className={`font-bold text-lg ${
                          detailRecord.verificationResult.authorityCheck === "consistent"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {detailRecord.verificationResult.authorityCheck === "consistent" ? "一致" : "不一致"}
                      </div>
                    </div>
                    <div
                      className={`text-center p-3 rounded ${
                        detailRecord.verificationResult.statusCheck === "normal" ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <div className="text-xs text-gray-400">证照状态</div>
                      <div
                        className={`font-bold text-lg ${
                          detailRecord.verificationResult.statusCheck === "normal" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {detailRecord.verificationResult.statusCheck === "normal" ? "正常" : "异常"}
                      </div>
                    </div>
                  </div>

                  {detailRecord.verificationResult.statusCheck === "abnormal" && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                      ⚠️ 该证照核验异常，请结合异常处理流程进一步排查
                    </div>
                  )}

                  {detailRecord.verificationResult.duplicateWarning && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-600">
                      🔁 该证照在本次事项办理中已被调用过（重复材料提示）
                    </div>
                  )}

                  {detailRecord.verificationResult.fieldComparison.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">字段比对详情（申请表真实值 vs 证照值）</div>
                      <div className="border rounded text-sm overflow-hidden">
                        <div className="grid grid-cols-5 bg-gray-50 px-3 py-2 font-medium text-gray-500 text-xs">
                          <div>申请表字段</div>
                          <div>申请表填写值</div>
                          <div>证照字段</div>
                          <div>证照实际值</div>
                          <div>比对结果</div>
                        </div>
                        {detailRecord.verificationResult.fieldComparison.map((f, idx) => (
                          <div
                            key={idx}
                            className={`grid grid-cols-5 px-3 py-2 border-t text-xs ${
                              f.result !== "match" ? "bg-red-50" : ""
                            }`}
                          >
                            <div className="text-gray-600">{f.formField}</div>
                            <div className="font-mono font-medium">{f.formValue}</div>
                            <div className="text-gray-600">{f.licenseField}</div>
                            <div className="font-mono font-medium">{f.licenseValue}</div>
                            <div>
                              <Tag
                                color={f.result === "match" ? "green" : f.result === "mismatch" ? "red" : "orange"}
                              >
                                {f.result === "match" ? "一致" : f.result === "mismatch" ? "不一致" : "缺失"}
                              </Tag>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {detailRecord.verificationResult.missingLicenses.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">缺失证照（告知单输出）</div>
                <div className="flex flex-wrap gap-2">
                  {detailRecord.verificationResult.missingLicenses.map((id) => (
                    <Tag key={id} color="orange">{id}</Tag>
                  ))}
                </div>
              </div>
            )}

            {detailRecord.signatureDataUrl && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">群众签字</div>
                <img
                  src={detailRecord.signatureDataUrl}
                  alt="签字图片"
                  style={{ width: 300, height: 100, border: "1px solid #e5e7eb", borderRadius: 4 }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
