import { useState, useMemo } from "react"
import { Card, Table, Tag, Button, Input, DatePicker, Select, Modal, Descriptions, message, Tabs, Timeline, Empty } from "antd"
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
  ArrowLeftRight,
  GitBranch,
} from "lucide-react"
import { useAuditStore } from "@/stores/useAuditStore"
import type { AuditRecord } from "@/types"
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
  const { records, addRecord } = useAuditStore()
  const [searchText, setSearchText] = useState("")
  const [windowFilter, setWindowFilter] = useState<string>("")
  const [actionFilter, setActionFilter] = useState<string>("")
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [detailRecord, setDetailRecord] = useState<AuditRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [chainView, setChainView] = useState<"list" | "chain">("list")
  const [chainBy, setChainBy] = useState<"citizen" | "matter">("citizen")
  const [selectedChainId, setSelectedChainId] = useState<string>("")

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
          recordDate.isAfter(dateRange[0].startOf("day")) &&
          recordDate.isBefore(dateRange[1].endOf("day"))
      }
      return matchSearch && matchWindow && matchAction && matchDate
    })
  }, [records, searchText, windowFilter, actionFilter, dateRange])

  const chainGroups = useMemo(() => {
    const groups = new Map<string, AuditRecord[]>()
    filteredRecords.forEach((r) => {
      const key = chainBy === "citizen" ? r.citizenId : r.matterId
      const list = groups.get(key) || []
      list.push(r)
      groups.set(key, list)
    })
    Array.from(groups.values()).forEach((list) =>
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    )
    return groups
  }, [filteredRecords, chainBy])

  const chainOptions = useMemo(() => {
    const set = new Set<{ id: string; name: string }>()
    filteredRecords.forEach((r) => {
      if (chainBy === "citizen") {
        set.add({ id: r.citizenId, name: `${r.citizenName} (${r.citizenId.slice(-4)})` })
      } else {
        set.add({ id: r.matterId, name: r.matterName })
      }
    })
    return Array.from(set)
  }, [filteredRecords, chainBy])

  const selectedChainRecords = useMemo(() => {
    if (!selectedChainId) return []
    return (chainGroups.get(selectedChainId) || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [selectedChainId, chainGroups])

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
    message.success("查看详情已自动留痕")
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
    setSelectedChainId("")
    message.info("筛选条件已重置")
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
      width: "6%",
    },
    {
      title: "操作人",
      dataIndex: "operatorName",
      key: "operatorName",
      width: "7%",
    },
    {
      title: "办理事项",
      dataIndex: "matterName",
      key: "matterName",
      width: "15%",
      ellipsis: true,
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
      width: "6%",
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
      width: "11%",
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
          <Button
            type="link"
            size="small"
            icon={<FileDown size={14} />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <FileText size={22} className="text-[#1B3A5C]" />
        <h2 className="text-lg font-bold text-[#1B3A5C] m-0">留痕档案</h2>
        <span className="text-sm text-gray-400">共 {filteredRecords.length} 条调用记录</span>
        <div className="ml-auto">
          <Tabs
            activeKey={chainView}
            onChange={(v) => {
              setChainView(v as "list" | "chain")
              setSelectedChainId("")
            }}
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
                    操作链路
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
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<Search size={14} className="text-gray-400" />}
            allowClear
            className="w-72"
          />
          <Select
            placeholder="筛选窗口"
            value={windowFilter || undefined}
            onChange={(v) => setWindowFilter(v || "")}
            allowClear
            className="w-28"
            options={windows.map((w) => ({ value: w, label: w }))}
          />
          <Select
            placeholder="操作类型"
            value={actionFilter || undefined}
            onChange={(v) => setActionFilter(v || "")}
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
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(val) => setDateRange(val as [Dayjs | null, Dayjs | null] | null)}
            className="w-60"
            allowClear
          />
          {chainView === "chain" && (
            <>
              <Select
                value={chainBy}
                onChange={(v) => {
                  setChainBy(v as "citizen" | "matter")
                  setSelectedChainId("")
                }}
                className="w-32"
                options={[
                  { value: "citizen", label: "按群众回溯" },
                  { value: "matter", label: "按事项回溯" },
                ]}
              />
              <Select
                placeholder={chainBy === "citizen" ? "选择群众..." : "选择事项..."}
                value={selectedChainId || undefined}
                onChange={(v) => setSelectedChainId(v || "")}
                allowClear
                className="w-52"
                showSearch
                filterOption={(input, option) =>
                  ((option?.label as string) || "").toLowerCase().includes(input.toLowerCase())
                }
                options={chainOptions.map((o) => ({ value: o.id, label: o.name }))}
              />
            </>
          )}
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
      ) : selectedChainId && selectedChainRecords.length > 0 ? (
        <Card
          className="shadow-sm"
          title={
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-[#1B3A5C]" />
              <span className="text-[#1B3A5C] font-medium">
                {chainBy === "citizen"
                  ? `群众 ${selectedChainRecords[0].citizenName} 的完整操作链路`
                  : `事项 ${selectedChainRecords[0].matterName} 的完整操作链路`}
              </span>
              <Tag color="blue">共 {selectedChainRecords.length} 个动作</Tag>
              {chainBy === "citizen" && (
                <span className="text-xs text-gray-400">身份证号：{selectedChainRecords[0].citizenId}</span>
              )}
            </div>
          }
          styles={{ body: { padding: "20px 30px" } }}
        >
          <Timeline
            mode="left"
            items={selectedChainRecords.map((r) => {
              const cfg = actionMap[r.action] || { color: "default", text: r.action, icon: null }
              return {
                dot: (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: r.action === "scan" ? "#13C2C2" : r.action === "verify" ? "#1677ff" : r.action === "call" ? "#722ED1" : r.action === "view" ? "#2F54EB" : r.action === "download" ? "#52C41A" : r.action === "export" ? "#FAAD14" : "#FA8C16" }}
                  >
                    {cfg.icon}
                  </div>
                ),
                color: r.action === "scan" ? "cyan" : r.action === "verify" ? "blue" : r.action === "call" ? "purple" : r.action === "view" ? "geekblue" : r.action === "download" ? "green" : r.action === "export" ? "gold" : "orange",
                children: (
                  <div className="pl-2 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color={cfg.color} icon={cfg.icon}>
                        {cfg.text}
                      </Tag>
                      <span className="font-medium text-[#1B3A5C]">{r.licenseName}</span>
                      <span className="text-xs text-gray-400">事项：{r.matterName}</span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      <div>
                        <span className="text-gray-400">窗口：</span>
                        {r.windowNo}
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-400">操作人：</span>
                        {r.operatorName}
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-400">群众：</span>
                        {r.citizenName}
                      </div>
                      <div>
                        <span className="text-gray-400">调用原因：</span>
                        <Tag color="blue">{reasonCategoryMap[r.callReason.category]}</Tag>
                        <span className="text-gray-600">{r.callReason.description}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Button
                        type="link"
                        size="small"
                        icon={<Eye size={13} />}
                        onClick={() => handleViewDetail(r)}
                        style={{ padding: 0 }}
                      >
                        查看详情
                      </Button>
                    </div>
                  </div>
                ),
                label: <div className="text-sm font-mono text-gray-500 pt-1">{r.createdAt}</div>,
              }
            })}
          />
        </Card>
      ) : (
        <Card className="shadow-sm" styles={{ body: { padding: "40px 20px" } }}>
          <Empty
            description={
              <div className="text-gray-400">
                <div className="text-base mb-1">请选择要回溯的{chainBy === "citizen" ? "群众" : "事项"}</div>
                <div className="text-sm">可按群众或事项维度查看完整操作链路时间线</div>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
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
        width={780}
      >
        {detailRecord && (
          <div className="space-y-4">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="调用时间">
                {detailRecord.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="窗口">{detailRecord.windowNo}</Descriptions.Item>
              <Descriptions.Item label="操作人">
                {detailRecord.operatorName}
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {(() => {
                  const cfg = actionMap[detailRecord.action] || { color: "default", text: detailRecord.action, icon: null }
                  return (
                    <Tag color={cfg.color} icon={cfg.icon}>
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
              <Descriptions.Item label="群众姓名">
                {detailRecord.citizenName}
              </Descriptions.Item>
              <Descriptions.Item label="身份证号">
                {detailRecord.citizenId}
              </Descriptions.Item>
              <Descriptions.Item label="调用原因类别">
                {reasonCategoryMap[detailRecord.callReason.category]}
              </Descriptions.Item>
              <Descriptions.Item label="调用说明">
                {detailRecord.callReason.description}
              </Descriptions.Item>
            </Descriptions>

            {detailRecord.verificationResult && detailRecord.licenseId !== "SYSTEM" && detailRecord.licenseId !== "NOTICE" && detailRecord.licenseId !== "EXPORT" && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">核验结果</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs text-gray-400">有效期</div>
                    <div
                      className={`font-bold ${
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
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs text-gray-400">签发机关</div>
                    <div
                      className={`font-bold ${
                        detailRecord.verificationResult.authorityCheck === "consistent"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {detailRecord.verificationResult.authorityCheck === "consistent"
                        ? "一致"
                        : "不一致"}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs text-gray-400">证照状态</div>
                    <div
                      className={`font-bold ${
                        detailRecord.verificationResult.statusCheck === "normal"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {detailRecord.verificationResult.statusCheck === "normal"
                        ? "正常"
                        : "异常"}
                    </div>
                  </div>
                </div>

                {detailRecord.verificationResult.fieldComparison.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">字段比对详情</div>
                    <div className="border rounded text-sm">
                      <div className="grid grid-cols-5 bg-gray-50 px-3 py-2 font-medium text-gray-500 text-xs">
                        <div>申请表字段</div>
                        <div>申请表值</div>
                        <div>证照字段</div>
                        <div>证照值</div>
                        <div>结果</div>
                      </div>
                      {detailRecord.verificationResult.fieldComparison.map((f, idx) => (
                        <div
                          key={idx}
                          className={`grid grid-cols-5 px-3 py-2 border-t ${
                            f.result !== "match" ? "bg-red-50" : ""
                          }`}
                        >
                          <div className="text-gray-600">{f.formField}</div>
                          <div className="font-mono">{f.formValue}</div>
                          <div className="text-gray-600">{f.licenseField}</div>
                          <div className="font-mono">{f.licenseValue}</div>
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
