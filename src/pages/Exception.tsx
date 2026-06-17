import { useState } from "react"
import { Card, Table, Tag, Select, Input, Button, Timeline, message, Empty, Badge } from "antd"
import {
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
} from "lucide-react"
import { useExceptionStore } from "@/stores/useExceptionStore"
import type { ExceptionRecord, ReviewOpinion } from "@/types"

const exceptionTypeMap: Record<string, { color: string; text: string }> = {
  info_mismatch: { color: "orange", text: "信息不一致" },
  expired: { color: "red", text: "证照过期" },
  authority_anomaly: { color: "purple", text: "签发机关异常" },
  suspected_forgery: { color: "volcano", text: "疑似伪造" },
}

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: "orange", text: "待复核" },
  reviewing: { color: "blue", text: "复核中" },
  resolved: { color: "green", text: "已解决" },
  rejected: { color: "red", text: "已退回" },
}

const dispositionMap: Record<string, { color: string; text: string }> = {
  return_supplement: { color: "orange", text: "退回补正" },
  manual_pass: { color: "green", text: "人工核实通过" },
  escalate: { color: "red", text: "上报主管部门" },
}

export default function Exception() {
  const { records, addRecord, addReviewOpinion, updateStatus } = useExceptionStore()
  const [selectedRecord, setSelectedRecord] = useState<ExceptionRecord | null>(null)
  const [newExceptionType, setNewExceptionType] = useState<string>("")
  const [newDescription, setNewDescription] = useState<string>("")
  const [reviewOpinion, setReviewOpinion] = useState<string>("")
  const [reviewDisposition, setReviewDisposition] = useState<string>("")

  const handleAddException = () => {
    if (!newExceptionType || !newDescription) {
      message.warning("请填写异常类型和描述")
      return
    }
    addRecord({
      id: `E${Date.now()}`,
      licenseId: "",
      licenseName: "手动登记异常",
      exceptionType: newExceptionType as ExceptionRecord["exceptionType"],
      description: newDescription,
      attachments: [],
      status: "pending",
      reviewOpinions: [],
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      createdBy: "王丽娟",
      windowNo: "窗口1",
    })
    setNewExceptionType("")
    setNewDescription("")
    message.success("异常已登记")
  }

  const handleAddReview = () => {
    if (!selectedRecord || !reviewOpinion || !reviewDisposition) {
      message.warning("请填写复核意见和处置方式")
      return
    }
    const opinion: ReviewOpinion = {
      id: `R${Date.now()}`,
      reviewer: "陈处长",
      opinion: reviewOpinion,
      disposition: reviewDisposition as ReviewOpinion["disposition"],
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    }
    addReviewOpinion(selectedRecord.id, opinion)

    if (reviewDisposition === "manual_pass") {
      updateStatus(selectedRecord.id, "resolved")
    } else if (reviewDisposition === "return_supplement") {
      updateStatus(selectedRecord.id, "rejected")
    } else {
      updateStatus(selectedRecord.id, "reviewing")
    }
    setReviewOpinion("")
    setReviewDisposition("")
    setSelectedRecord({ ...selectedRecord, reviewOpinions: [...selectedRecord.reviewOpinions, opinion] })
    message.success("复核意见已提交")
  }

  const columns = [
    {
      title: "证照名称",
      dataIndex: "licenseName",
      key: "licenseName",
      width: "18%",
      render: (text: string) => <span className="font-medium text-[#1B3A5C]">{text}</span>,
    },
    {
      title: "异常类型",
      dataIndex: "exceptionType",
      key: "exceptionType",
      width: "14%",
      render: (type: string) => {
        const cfg = exceptionTypeMap[type] || { color: "default", text: type }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: "30%",
      ellipsis: true,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (status: string) => {
        const cfg = statusMap[status]
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: "登记人",
      dataIndex: "createdBy",
      key: "createdBy",
      width: "10%",
    },
    {
      title: "登记时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: "14%",
    },
    {
      title: "操作",
      key: "action",
      width: "4%",
      render: (_: unknown, record: ExceptionRecord) => (
        <Button type="link" size="small" onClick={() => setSelectedRecord(record)}>
          详情
        </Button>
      ),
    },
  ]

  const pendingCount = records.filter((r) => r.status === "pending").length
  const reviewingCount = records.filter((r) => r.status === "reviewing").length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <AlertTriangle size={22} className="text-[#E8A838]" />
        <h2 className="text-lg font-bold text-[#1B3A5C] m-0">异常处理</h2>
        <Badge count={pendingCount} className="ml-2">
          <Tag color="orange">待复核 {pendingCount}</Tag>
        </Badge>
        <Badge count={reviewingCount} className="ml-1">
          <Tag color="blue">复核中 {reviewingCount}</Tag>
        </Badge>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 space-y-5">
          <Card
            title={
              <div className="flex items-center gap-2 text-[#1B3A5C]">
                <FileWarning size={16} />
                <span>异常登记</span>
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">异常类型</div>
                <Select
                  placeholder="选择异常类型"
                  value={newExceptionType || undefined}
                  onChange={setNewExceptionType}
                  className="w-full"
                  options={Object.entries(exceptionTypeMap).map(([value, cfg]) => ({
                    value,
                    label: cfg.text,
                  }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="primary"
                  icon={<Send size={14} />}
                  onClick={handleAddException}
                  style={{ background: "#E8A838", borderColor: "#E8A838" }}
                >
                  提交异常
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm text-gray-500 mb-1">异常描述</div>
              <Input.TextArea
                placeholder="请描述异常情况..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
          </Card>

          <Card
            title="异常记录列表"
            className="shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={records}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="id"
              onRow={(record) => ({
                onClick: () => setSelectedRecord(record),
                className: `cursor-pointer ${selectedRecord?.id === record.id ? "bg-blue-50" : ""}`,
              })}
            />
          </Card>
        </div>

        <div className="col-span-5 space-y-5">
          {selectedRecord ? (
            <>
              <Card
                title={
                  <div className="flex items-center gap-2 text-[#1B3A5C]">
                    <Clock size={16} />
                    <span>流转跟踪</span>
                    <Tag color={statusMap[selectedRecord.status].color} className="ml-2">
                      {statusMap[selectedRecord.status].text}
                    </Tag>
                  </div>
                }
                className="shadow-sm"
                styles={{ body: { padding: "16px 20px" } }}
              >
                <Timeline
                  items={[
                    {
                      color: "blue",
                      children: (
                        <div>
                          <div className="text-sm font-medium">异常登记</div>
                          <div className="text-xs text-gray-400">
                            {selectedRecord.createdBy} · {selectedRecord.createdAt}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{selectedRecord.description}</div>
                        </div>
                      ),
                    },
                    ...selectedRecord.reviewOpinions.map((op) => ({
                      color: op.disposition === "manual_pass" ? "green" : op.disposition === "escalate" ? "red" : "orange",
                      children: (
                        <div>
                          <div className="text-sm font-medium">
                            复核意见 · {dispositionMap[op.disposition]?.text}
                          </div>
                          <div className="text-xs text-gray-400">
                            {op.reviewer} · {op.createdAt}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{op.opinion}</div>
                        </div>
                      ),
                    })),
                  ]}
                />
              </Card>

              <Card
                title={
                  <div className="flex items-center gap-2 text-[#1B3A5C]">
                    <UserCheck size={16} />
                    <span>人工复核</span>
                  </div>
                }
                className="shadow-sm"
                styles={{ body: { padding: "16px 20px" } }}
              >
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">处置方式</div>
                    <Select
                      placeholder="选择处置方式"
                      value={reviewDisposition || undefined}
                      onChange={setReviewDisposition}
                      className="w-full"
                      options={Object.entries(dispositionMap).map(([value, cfg]) => ({
                        value,
                        label: cfg.text,
                      }))}
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">复核意见</div>
                    <Input.TextArea
                      placeholder="请输入复核意见..."
                      value={reviewOpinion}
                      onChange={(e) => setReviewOpinion(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    type="primary"
                    onClick={handleAddReview}
                    style={{ background: "#1B3A5C" }}
                    block
                    icon={<CheckCircle2 size={14} />}
                  >
                    提交复核意见
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <Card className="shadow-sm" styles={{ body: { padding: "60px 20px" } }}>
              <Empty description="请从左侧列表选择一条异常记录查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
