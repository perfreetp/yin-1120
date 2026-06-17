import { useMemo, useState } from "react"
import { Card, Table, Tag, Select } from "antd"
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  PhoneCall,
} from "lucide-react"
import { useAuditStore } from "@/stores/useAuditStore"
import { useExceptionStore } from "@/stores/useExceptionStore"
import { Column, Pie } from "@ant-design/charts"
import dayjs from "dayjs"

export default function Dashboard() {
  const { records } = useAuditStore()
  const { records: exceptions } = useExceptionStore()
  const [range, setRange] = useState<"7d" | "15d" | "30d">("7d")

  const days = range === "7d" ? 7 : range === "15d" ? 15 : 30
  const endDate = dayjs("2026-06-15")
  const startDate = endDate.subtract(days - 1, "day")

  const dateRange = useMemo(() => {
    const dates = []
    for (let i = 0; i < days; i++) {
      dates.push(startDate.add(i, "day").format("MM-DD"))
    }
    return dates
  }, [days, startDate])

  const recordsInRange = useMemo(
    () =>
      records.filter((r) => {
        const d = dayjs(r.createdAt)
        return d.isAfter(startDate.startOf("day")) && d.isBefore(endDate.endOf("day"))
      }),
    [records, startDate, endDate]
  )

  const totalCalls = recordsInRange.filter((r) => r.action === "call").length
  const totalViews = recordsInRange.filter((r) => r.action === "view").length
  const totalDownloads = recordsInRange.filter((r) => r.action === "download").length

  const callTrend = useMemo(() => {
    return dateRange.map((date) => {
      const count = recordsInRange.filter((r) =>
        r.createdAt.startsWith(`2026-${date.replace("-", "-")}`)
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
    exceptions.forEach((e) => {
      const date = dayjs(e.createdAt)
      if (date.isAfter(startDate.startOf("day")) && date.isBefore(endDate.endOf("day"))) {
        const existing = map.get(e.windowNo) || { callCount: 0, exceptionCount: 0 }
        existing.exceptionCount++
        map.set(e.windowNo, existing)
      }
    })
    return Array.from(map.entries()).map(([windowNo, data]) => ({ windowNo, ...data }))
  }, [recordsInRange, exceptions, startDate, endDate])

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
  }, [recordsInRange])

  const returnReasons = useMemo(() => {
    const typeMap: Record<string, string> = {
      info_mismatch: "信息不一致",
      expired: "证照过期",
      authority_anomaly: "签发机关异常",
      suspected_forgery: "疑似伪造",
    }
    const map = new Map<string, number>()
    exceptions.forEach((e) => {
      const date = dayjs(e.createdAt)
      if (date.isAfter(startDate.startOf("day")) && date.isBefore(endDate.endOf("day"))) {
        const type = typeMap[e.exceptionType] || e.exceptionType
        map.set(type, (map.get(type) || 0) + 1)
      }
    })
    const total = exceptions.length || 1
    return Array.from(map.entries()).map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }, [exceptions, startDate, endDate])

  const exceptionDistribution = useMemo(() => {
    const statusMap: Record<string, string> = {
      pending: "待复核",
      reviewing: "复核中",
      resolved: "已解决",
      rejected: "已退回",
    }
    const map = new Map<string, number>()
    exceptions.forEach((e) => {
      const date = dayjs(e.createdAt)
      if (date.isAfter(startDate.startOf("day")) && date.isBefore(endDate.endOf("day"))) {
        const type = statusMap[e.status] || e.status
        map.set(type, (map.get(type) || 0) + 1)
      }
    })
    const total = exceptions.length || 1
    return Array.from(map.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }, [exceptions, startDate, endDate])

  const todayCount = recordsInRange.filter((r) => r.createdAt.startsWith("2026-06-15") && r.action === "call").length

  const kpis = [
    {
      title: "今日调用量",
      value: todayCount,
      icon: <PhoneCall size={24} />,
      color: "#1B3A5C",
      bg: "#eef2f7",
    },
    {
      title: "累计调用",
      value: totalCalls,
      icon: <TrendingUp size={24} />,
      color: "#3B82F6",
      bg: "#eff6ff",
    },
    {
      title: "查看次数",
      value: totalViews,
      icon: <EyeIcon size={24} />,
      color: "#10B981",
      bg: "#ecfdf5",
    },
    {
      title: "下载次数",
      value: totalDownloads,
      icon: <RotateCcw size={24} />,
      color: "#E04848",
      bg: "#fef1f1",
    },
  ]

  const windowBarConfig = {
    data: callsByWindow,
    xField: "windowNo",
    yField: "callCount",
    color: "#1B3A5C",
    label: {
      text: (d: { callCount: number }) => d.callCount,
      position: "outside" as const,
    },
    style: { radiusTopLeft: 4, radiusTopRight: 4 },
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

  const trendConfig = {
    data: callTrend,
    xField: "date",
    yField: "count",
    color: "#1B3A5C",
    style: { radiusTopLeft: 4, radiusTopRight: 4 },
    label: {
      text: (d: { count: number }) => d.count,
      position: "outside" as const,
    },
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
        <div className="ml-auto">
          <Select
            value={range}
            onChange={(v) => setRange(v as "7d" | "15d" | "30d")}
            style={{ width: 120 }}
            options={[
              { value: "7d", label: "近7天" },
              { value: "15d", label: "近15天" },
              { value: "30d", label: "近30天" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="shadow-sm" styles={{ body: { padding: "16px 20px" } }}>
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
          <Card title="调用量趋势" className="shadow-sm" styles={{ body: { padding: "16px 20px" } }}>
            <Column {...trendConfig} height={220} />
          </Card>

          <Card title="按窗口统计调用量" className="shadow-sm" styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ height: 220 }}>
              <Column
                data={callsByWindow}
                xField="windowNo"
                yField="callCount"
                color="#1B3A5C"
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                label={{
                  text: (d: { callCount: number }) => d.callCount,
                  position: "outside" as const,
                }}
              />
            </div>
          </Card>

          <Card title="按事项统计" className="shadow-sm" styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={callsByMatter}
              columns={matterColumns}
              pagination={false}
              size="small"
              rowKey="matterName"
            />
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
            <Table
              dataSource={exceptionDistribution}
              columns={exceptionColumns}
              pagination={false}
              size="small"
              rowKey="type"
            />
          </Card>

          <Card title="操作类型分布" className="shadow-sm" styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ height: 200 }}>
              <Column
                data={[
                  { type: "调用", count: totalCalls, color: "#1B3A5C" },
                  { type: "查看", count: totalViews, color: "#3B82F6" },
                  { type: "下载", count: totalDownloads, color: "#2EAD6B" },
                ]}
                xField="type"
                yField="count"
                colorField="type"
                color={["#1B3A5C", "#3B82F6", "#2EAD6B"]}
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                label={{
                  text: (d: { count: number }) => d.count,
                  position: "outside" as const,
                }}
              />
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
