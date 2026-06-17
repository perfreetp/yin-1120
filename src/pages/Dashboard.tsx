import { useMemo, useState } from "react"
import { Card, Table, Tag, Select, DatePicker, Empty } from "antd"
import type { Dayjs } from "dayjs"
import {
  BarChart3,
  TrendingUp,
  PhoneCall,
  FileDown,
  Download,
  Printer,
  ShieldCheck,
  ScanLine,
} from "lucide-react"
import { useAuditStore } from "@/stores/useAuditStore"
import { useExceptionStore } from "@/stores/useExceptionStore"
import { Column, Pie } from "@ant-design/charts"
import dayjs from "dayjs"

const { RangePicker } = DatePicker

export default function Dashboard() {
  const { records } = useAuditStore()
  const { records: exceptions } = useExceptionStore()
  const [rangeType, setRangeType] = useState<"7d" | "15d" | "30d" | "custom">("7d")
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [windowFilter, setWindowFilter] = useState<string>("")

  const endDate = dayjs("2026-06-15")
  let startDate: Dayjs
  if (rangeType === "custom" && customRange && customRange[0] && customRange[1]) {
    startDate = customRange[0]
  } else {
    const days = rangeType === "7d" ? 7 : rangeType === "15d" ? 15 : 30
    startDate = endDate.subtract(days - 1, "day")
  }

  const totalDays = Math.max(1, endDate.diff(startDate, "day") + 1)

  const dateRange = useMemo(() => {
    const dates = []
    for (let i = 0; i < totalDays; i++) {
      dates.push(startDate.add(i, "day").format("MM-DD"))
    }
    return dates
  }, [totalDays, startDate])

  const windows = useMemo(() => [...new Set(records.map((r) => r.windowNo))], [records])

  const recordsInRange = useMemo(
    () =>
      records.filter((r) => {
        const d = dayjs(r.createdAt)
        const matchDate = d.isAfter(startDate.startOf("day")) && d.isBefore(endDate.endOf("day"))
        const matchWindow = !windowFilter || r.windowNo === windowFilter
        return matchDate && matchWindow
      }),
    [records, startDate, endDate, windowFilter]
  )

  const exceptionsInRange = useMemo(
    () =>
      exceptions.filter((e) => {
        const d = dayjs(e.createdAt)
        const matchDate = d.isAfter(startDate.startOf("day")) && d.isBefore(endDate.endOf("day"))
        const matchWindow = !windowFilter || e.windowNo === windowFilter
        return matchDate && matchWindow
      }),
    [exceptions, startDate, endDate, windowFilter]
  )

  const totalCalls = recordsInRange.filter((r) => r.action === "call").length
  const totalScans = recordsInRange.filter((r) => r.action === "scan").length
  const totalVerifies = recordsInRange.filter((r) => r.action === "verify").length
  const totalViews = recordsInRange.filter((r) => r.action === "view").length
  const totalDownloads = recordsInRange.filter((r) => r.action === "download").length
  const totalExports = recordsInRange.filter((r) => r.action === "export").length
  const totalPrints = recordsInRange.filter((r) => r.action === "print").length

  const todayCount = recordsInRange.filter(
    (r) => r.createdAt.startsWith("2026-06-15") && r.action === "call"
  ).length

  const callTrend = useMemo(() => {
    return dateRange.map((date) => {
      const count = recordsInRange.filter(
        (r) => r.action === "call" && r.createdAt.startsWith(`2026-${date.slice(0, 2)}-${date.slice(3)}`)
      ).length
      return { date, count }
    })
  }, [dateRange, recordsInRange])

  const callsByWindow = useMemo(() => {
    const map = new Map<string, { callCount: number; exceptionCount: number }>()
    recordsInRange.forEach((r) => {
      const existing = map.get(r.windowNo) || { callCount: 0, exceptionCount: 0 }
      if (r.action === "call") existing.callCount++
      map.set(r.windowNo, existing)
    })
    exceptionsInRange.forEach((e) => {
      const existing = map.get(e.windowNo) || { callCount: 0, exceptionCount: 0 }
      existing.exceptionCount++
      map.set(e.windowNo, existing)
    })
    return Array.from(map.entries())
      .map(([windowNo, data]) => ({ windowNo, ...data }))
      .sort((a, b) => b.callCount - a.callCount)
  }, [recordsInRange, exceptionsInRange])

  const callsByMatter = useMemo(() => {
    const map = new Map<string, { callCount: number; returnCount: number }>()
    recordsInRange.forEach((r) => {
      const existing = map.get(r.matterName) || { callCount: 0, returnCount: 0 }
      if (r.action === "call") existing.callCount++
      map.set(r.matterName, existing)
    })
    return Array.from(map.entries())
      .map(([matterName, data]) => ({ matterName, ...data }))
      .sort((a, b) => b.callCount - a.callCount)
      .filter((m) => m.matterName !== "全量统计")
  }, [recordsInRange])

  const returnReasons = useMemo(() => {
    const typeMap: Record<string, string> = {
      info_mismatch: "信息不一致",
      expired: "证照过期",
      authority_anomaly: "签发机关异常",
      suspected_forgery: "疑似伪造",
    }
    const map = new Map<string, number>()
    exceptionsInRange.forEach((e) => {
      const type = typeMap[e.exceptionType] || e.exceptionType
      map.set(type, (map.get(type) || 0) + 1)
    })
    const total = exceptionsInRange.length || 1
    return Array.from(map.entries()).map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }, [exceptionsInRange])

  const exceptionDistribution = useMemo(() => {
    const statusMap: Record<string, string> = {
      pending: "待复核",
      reviewing: "复核中",
      resolved: "已解决",
      rejected: "已退回",
    }
    const map = new Map<string, number>()
    exceptionsInRange.forEach((e) => {
      const type = statusMap[e.status] || e.status
      map.set(type, (map.get(type) || 0) + 1)
    })
    const total = exceptionsInRange.length || 1
    return Array.from(map.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }, [exceptionsInRange])

  const actionDistribution = useMemo(() => {
    return [
      { type: "刷证识别", count: totalScans, color: "#13C2C2", icon: <ScanLine size={16} /> },
      { type: "证照核验", count: totalVerifies, color: "#1677FF", icon: <ShieldCheck size={16} /> },
      { type: "证照调用", count: totalCalls, color: "#1B3A5C", icon: <PhoneCall size={16} /> },
      { type: "查看详情", count: totalViews, color: "#2F54EB", icon: <EyeIcon size={16} /> },
      { type: "下载证照", count: totalDownloads, color: "#52C41A", icon: <FileDown size={16} /> },
      { type: "导出报告", count: totalExports, color: "#FAAD14", icon: <Download size={16} /> },
      { type: "打印输出", count: totalPrints, color: "#FA8C16", icon: <Printer size={16} /> },
    ]
  }, [totalScans, totalVerifies, totalCalls, totalViews, totalDownloads, totalExports, totalPrints])

  const kpis = [
    {
      title: "今日调用量",
      value: todayCount,
      icon: <PhoneCall size={22} />,
      color: "#1B3A5C",
      bg: "#eef2f7",
    },
    {
      title: "累计调用（趋势只算此项）",
      value: totalCalls,
      icon: <TrendingUp size={22} />,
      color: "#3B82F6",
      bg: "#eff6ff",
    },
    {
      title: "核验次数",
      value: totalVerifies,
      icon: <ShieldCheck size={22} />,
      color: "#10B981",
      bg: "#ecfdf5",
    },
    {
      title: "下载/导出/打印",
      value: totalDownloads + totalExports + totalPrints,
      icon: <FileDown size={22} />,
      color: "#E04848",
      bg: "#fef1f1",
    },
  ]

  const trendConfig = {
    data: callTrend,
    xField: "date",
    yField: "count",
    color: "#1B3A5C",
    style: { radiusTopLeft: 4, radiusTopRight: 4 },
    label: {
      text: (d: { count: number }) => d.count,
      position: "outside" as const,
      style: { fontSize: 11 },
    },
  }

  const pieData = returnReasons.map((r) => ({ name: r.reason, value: r.count }))

  const returnPieConfig = {
    data: pieData.length > 0 ? pieData : [{ name: "暂无数据", value: 0 }],
    angleField: "value",
    colorField: "name",
    radius: 0.85,
    innerRadius: 0.6,
    label: {
      text: "name",
      position: "outside" as const,
      style: { fontSize: 11 },
    },
    legend: { position: "bottom" as const },
    color: ["#1B3A5C", "#E8A838", "#3B82F6", "#E04848"],
  }

  const matterColumns = [
    {
      title: "事项名称",
      dataIndex: "matterName",
      key: "matterName",
      ellipsis: true,
    },
    {
      title: "调用量",
      dataIndex: "callCount",
      key: "callCount",
      width: "25%",
      render: (v: number) => <span className="font-bold text-[#1B3A5C]">{v}</span>,
    },
    {
      title: "退件数",
      dataIndex: "returnCount",
      key: "returnCount",
      width: "25%",
      render: (v: number) => (
        <span className={v > 0 ? "text-red-500 font-bold" : "text-gray-400"}>{v}</span>
      ),
    },
  ]

  const exceptionColumns = [
    {
      title: "状态",
      dataIndex: "type",
      key: "type",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "数量",
      dataIndex: "count",
      key: "count",
      render: (v: number) => <span className="font-bold">{v}</span>,
    },
    {
      title: "占比",
      dataIndex: "percentage",
      key: "percentage",
      render: (v: number) => <span>{v}%</span>,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 size={22} className="text-[#1B3A5C]" />
        <h2 className="text-lg font-bold text-[#1B3A5C] m-0">统计看板</h2>
        <div className="ml-auto flex items-center gap-3">
          <Select
            placeholder="筛选窗口"
            value={windowFilter || undefined}
            onChange={(v) => setWindowFilter(v || "")}
            allowClear
            style={{ width: 120 }}
            options={windows.map((w) => ({ value: w, label: w }))}
          />
          <Select
            value={rangeType}
            onChange={(v) => {
              setRangeType(v as "7d" | "15d" | "30d" | "custom")
              if (v !== "custom") setCustomRange(null)
            }}
            style={{ width: 120 }}
            options={[
              { value: "7d", label: "近7天" },
              { value: "15d", label: "近15天" },
              { value: "30d", label: "近30天" },
              { value: "custom", label: "自定义" },
            ]}
          />
          {rangeType === "custom" && (
            <RangePicker
              value={customRange}
              onChange={(v) => setCustomRange(v as [Dayjs | null, Dayjs | null] | null)}
              allowClear
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.title}
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">{kpi.title}</div>
                <div className="text-3xl font-bold mt-1" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: kpi.bg, color: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-5">
          <Card
            title="调用量趋势（仅统计 call 操作）"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
            extra={
              <Tag color="blue" className="text-xs">
                {windowFilter ? `${windowFilter} · ` : ""}
                {startDate.format("YYYY-MM-DD")} ~ {endDate.format("YYYY-MM-DD")}
              </Tag>
            }
          >
            <Column {...trendConfig} height={240} />
          </Card>

          <Card title="按窗口统计调用量" className="shadow-sm" styles={{ body: { padding: "16px 20px" } }}>
            {callsByWindow.length > 0 ? (
              <div style={{ height: 240 }}>
                <Column
                  data={callsByWindow}
                  xField="windowNo"
                  yField="callCount"
                  color="#1B3A5C"
                  style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                  label={{
                    text: (d: { callCount: number }) => d.callCount,
                    position: "outside" as const,
                    style: { fontSize: 12 },
                  }}
                />
              </div>
            ) : (
              <Empty
                description="当前筛选条件下暂无数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="py-6"
              />
            )}
          </Card>

          <Card title="按事项统计调用量" className="shadow-sm" styles={{ body: { padding: 0 } }}>
            {callsByMatter.length > 0 ? (
              <Table
                dataSource={callsByMatter}
                columns={matterColumns}
                pagination={false}
                size="small"
                rowKey="matterName"
              />
            ) : (
              <Empty
                description="当前筛选条件下暂无数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="py-8"
              />
            )}
          </Card>
        </div>

        <div className="col-span-4 space-y-5">
          <Card title="退件原因分析" className="shadow-sm" styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ height: 240 }}>
              {pieData.length > 0 ? (
                <Pie {...returnPieConfig} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  暂无退件数据
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {returnReasons.length > 0 ? (
                returnReasons.map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{r.reason}</span>
                    <span className="font-medium">
                      {r.count}次 <span className="text-gray-400">({r.percentage}%)</span>
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-2">暂无数据</div>
              )}
            </div>
          </Card>

          <Card title="异常证照分布" className="shadow-sm" styles={{ body: { padding: 0 } }}>
            {exceptionDistribution.length > 0 ? (
              <Table
                dataSource={exceptionDistribution}
                columns={exceptionColumns}
                pagination={false}
                size="small"
                rowKey="type"
              />
            ) : (
              <Empty
                description="当前筛选条件下暂无异常数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="py-6"
              />
            )}
          </Card>

          <Card
            title="操作类型分布（查看/下载/导出/打印/核验/刷证）"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ height: 260 }}>
              <Column
                data={actionDistribution}
                xField="type"
                yField="count"
                colorField="type"
                color={actionDistribution.map((a) => a.color)}
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                label={{
                  text: (d: { count: number }) => d.count,
                  position: "outside" as const,
                  style: { fontSize: 11 },
                }}
                xAxis={{ label: { style: { fontSize: 11 }, autoHide: false, autoRotate: false } }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {actionDistribution.map((a) => (
                <div key={a.type} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ background: a.color }}
                  />
                  <span className="text-gray-600">{a.type}</span>
                  <span className="ml-auto font-medium text-gray-700">{a.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function EyeIcon(props: { size: number }) {
  const { size } = props
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
