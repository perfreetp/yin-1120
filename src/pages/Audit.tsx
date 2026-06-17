import { useState, useMemo } from "react"
import { Card, Table, Tag, Button, Input, DatePicker, Select, Modal, Descriptions, message } from "antd"
import type { Dayjs } from "dayjs"
import {
  FileText,
  Search,
  RotateCcw,
  Download,
  Eye,
  FileDown,
} from "lucide-react"
import { useAuditStore } from "@/stores/useAuditStore"
import type { AuditRecord } from "@/types"
import dayjs from "dayjs"

const { RangePicker } = DatePicker

const actionMap: Record<string, { color: string; text: string }> = {
  view: { color: "blue", text: "查看" },
  download: { color: "green", text: "下载" },
  call: { color: "purple", text: "调用" },
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

  const addAuditRecord = (record: AuditRecord, actionType: "view" | "download", desc: string) => {
    addRecord({
      id: `A${Date.now()}`,
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
    addAuditRecord(record, "view", `查看${record.licenseName}详情`)
    message.success("查看详情已自动留痕")
  }

  const handleDownload = (record: AuditRecord) => {
    addAuditRecord(record, "download", `下载${record.licenseName}电子件`)
    message.success(`下载 ${record.licenseName}，已自动留痕`)
  }

  const handleExport = () => {
    const rec: AuditRecord = {
      id: `A${Date.now()}`,
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
      action: "download",
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
      width: "7%",
    },
    {
      title: "操作人",
      dataIndex: "operatorName",
      key: "operatorName",
      width: "8%",
    },
    {
      title: "办理事项",
      dataIndex: "matterName",
      key: "matterName",
      width: "16%",
      ellipsis: true,
    },
    {
      title: "证照",
      dataIndex: "licenseName",
      key: "licenseName",
      width: "12%",
    },
    {
      title: "群众",
      dataIndex: "citizenName",
      key: "citizenName",
      width: "7%",
    },
    {
      title: "调用原因",
      dataIndex: "callReason",
      key: "callReason",
      width: "18%",
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
      width: "7%",
      render: (action: string) => {
        const cfg = actionMap[action] || { color: "default", text: action }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: "操作",
      key: "actions",
      width: "9%",
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
            className="w-28"
            options={[
              { value: "call", label: "调用" },
              { value: "view", label: "查看" },
              { value: "download", label: "下载" },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(val) => setDateRange(val as [Dayjs | null, Dayjs | null] | null)}
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
        width={760}
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
                <Tag color={actionMap[detailRecord.action]?.color}>
                  {actionMap[detailRecord.action]?.text}
                </Tag>
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

            {detailRecord.verificationResult && (
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
                          <div>{f.formValue}</div>
                          <div className="text-gray-600">{f.licenseField}</div>
                          <div>{f.licenseValue}</div>
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
