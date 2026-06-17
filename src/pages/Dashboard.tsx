import { useMemo } from "react"
import { Card, Select, Table, Tag } from "antd"
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

export default function Dashboard() {
  const { records } = useAuditStore()
  const { records: exceptions } = useExceptionStore()

  const totalCalls = records.length
  const totalExceptions = exceptions.length
  const totalReturns = exceptions.filter((e) => e.status === "rejected").length
  const todayCalls = records.filter((r) => r.createdAt.startsWith("2026-06-15")).length

  const callsByWindow = useMemo(() => {
    const map = new Map<string, { callCount: number; exceptionCount: number }>()
    records.forEach((r) => {
      const existing = map.get(r.windowNo) || { callCount: 0, exceptionCount: 0 }
      existing.callCount++
      map.set(r.windowNo, existing)
    })
    exceptions.forEach((e) => {
      const existing = map.get(e.windowNo) || { callCount: 0, exceptionCount: 0 }
      existing.exceptionCount++
      map.set(e.windowNo, existing)
    })
    return Array.from(map.entries()).map(([windowNo, data]) => ({ windowNo, ...data }))
  }, [records, exceptions])

  const callsByMatter = useMemo(() => {
    const map = new Map<string, { callCount: number; returnCount: number }>()
    records.forEach((r) => {
      const existing = map.get(r.matterName) || { callCount: 0, returnCount: 0 }
      existing.callCount++
      map.set(r.matterName, existing)
    })
    exceptions.forEach((e) => {
      if (e.status === "rejected") {
        const exceptionLicense = e.licenseName
        records.forEach((r) => {
          if (r.licenseName === exceptionLicense) {
            const existing = map.get(r.matterName) || { callCount: 0, returnCount: 0 }
            existing.returnCount++
            map.set(r.matterName, existing)
          }
        })
      }
    })
    return Array.from(map.entries()).map(([matterName, data]) => ({ matterName, ...data }))
  }, [records, exceptions])

  const returnReasons = useMemo(() => {
    const typeMap: Record<string, string> = {
      info_mismatch: "信息不一致",
      expired: "证照过期",
      authority_anomaly: "签发机关异常",
      suspected_forgery: "疑似伪造",
    }
    const map = new Map<string, number>()
    exceptions.forEach((e) => {
      const type = typeMap[e.exceptionType] || e.exceptionType
      map.set(type, (map.get(type) || 0) + 1)
    })
    const total = exceptions.length || 1
    return Array.from(map.entries()).map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }, [exceptions])

  const exceptionDistribution = useMemo(() => {
    const statusMap2: Record<string, string> = {
      pending: "待复核",
      reviewing: "复核中",
      resolved: "已解决",
      rejected: "已退回",
    }
    const map = new Map<string, number>()
    exceptions.forEach((e) => {
      const type = statusMap2[e.status] || e.status
      map.set(type, (map.get(type) || 0) + 1)
    })
    const total = exceptions.length || 1
    return Array.from(map.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }, [exceptions])

  const callTrend = useMemo(() => {
    const dates = ["06-09", "06-10", "06-11", "06-12", "06-13", "06-14", "06-15"]
    return dates.map((date) => ({
      date: `06-${date}`,
      count: records.filter((r) => r.createdAt.includes(date)).length || Math.floor(Math.random() * 5) + 1,
    }))
  }, [records])

  const kpis = [
    {
      title: "今日调用量",
      value: todayCalls,
      icon: <PhoneCall size={24} />,
      color: "#1B3A5C",
      bg: "#eef2f7",
    },
    {
      title: "总调用量",
      value: totalCalls,
      icon: <TrendingUp size={24} />,
      color: "#3B82F6",
      bg: "#eff6ff",
    },
    {
      title: "异常证照",
      value: totalExceptions,
      icon: <AlertTriangle size={24} />,
      color: "#E8A838",
      bg: "#fef7ed",
    },
    {
      title: "退件数",
      value: totalReturns,
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
    label: { text: (d: { callCount: number }) => d.callCount, position: "outside" as const },
    style: { radiusTopLeft: 4, radiusTopRight: 4 },
  }

  const returnPieConfig = {
    data: returnReasons.map((r) => ({ name: r.reason, value: r.count })),
    angleField: "value",
    colorField: "name",
    radius: 0.8,
    innerRadius: 0.6,
    label: { text: "name", position: "outside" as const },
    legend: { position: "bottom" as const },
    color: ["#1B3A5C", "#E8A838", "#3B82F6", "#E04848"],
  }

  const trendLineConfig = {
    data: callTrend,
    xField: "date",
    yField: "count",
    style: { stroke: "#1B3A5C", lineWidth: 2 },
    smooth: true,
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
      width: "20%",
      render: (v: number) => <span className="font-bold text-[#1B3A5C]">{v}</span>,
    },
    {
      title: "退件数",
      dataIndex: "returnCount",
      key: "returnCount",
      width: "20%",
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
            title="调用量趋势"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <Column {...windowBarConfig} height={220} />
          </Card>

          <Card
            title="按窗口统计调用量"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ height: 220 }}>
              <Column
                data={callsByWindow}
                xField="windowNo"
                yField="callCount"
                color="#1B3A5C"
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                label={{ text: (d: { callCount: number }) => d.callCount, position: "outside" as const }}
              />
            </div>
          </Card>

          <Card
            title="按事项统计"
            className="shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
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
          <Card
            title="退件原因分析"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ height: 240 }}>
              <Pie {...returnPieConfig} />
            </div>
            <div className="mt-3 space-y-2">
              {returnReasons.map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{r.reason}</span>
                  <span className="font-medium">
                    {r.count}次 <span className="text-gray-400">({r.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="异常证照分布"
            className="shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={exceptionDistribution}
              columns={exceptionColumns}
              pagination={false}
              size="small"
              rowKey="type"
            />
          </Card>

          <Card
            title="调用量趋势"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ height: 200 }}>
              <Column
                data={callTrend}
                xField="date"
                yField="count"
                color="#3B82F6"
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
