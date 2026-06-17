import { useMemo, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  Users,
  Flame,
} from "lucide-react"
import { useAuditStore } from "@/stores/useAuditStore"
import { useExceptionStore } from "@/stores/useExceptionStore"
import { useNoticeStore } from "@/stores/useNoticeStore"
import { Column, Pie } from "@ant-design/charts"
import dayjs from "dayjs"

const { RangePicker } = DatePicker

export default function Dashboard() {
  const navigate = useNavigate()
  const { records } = useAuditStore()
  const { records: exceptions } = useExceptionStore()
  const { notices, setAuditFilter, resetAuditFilter } = useNoticeStore()
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
      dates.push(startDate.add(i, "day").format("YYYY-MM-DD"))
    }
    return dates
  }, [totalDays, startDate])

  const windows = useMemo(() => [...new Set(records.map((r) => r.windowNo))], [records])

  const recordsInRange = useMemo(
    () =>
      records.filter((r) => {
        const d = dayjs(r.createdAt)
        const matchDate = d.isSame(startDate, "day") || d.isAfter(startDate) && (d.isSame(endDate, "day") || d.isBefore(endDate))
        const matchWindow = !windowFilter || r.windowNo === windowFilter
        return matchDate && matchWindow
      }),
    [records, startDate, endDate, windowFilter]
  )

  const exceptionsInRange = useMemo(
    () =>
      exceptions.filter((e) => {
        const d = dayjs(e.createdAt)
        const matchDate = d.isSame(startDate, "day") || (d.isAfter(startDate) && (d.isSame(endDate, "day") || d.isBefore(endDate)))
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
  const totalSubmitSupplements = recordsInRange.filter((r) => r.action === "submit_supplement").length
  const totalReturnSupplements = recordsInRange.filter((r) => r.action === "return_supplement").length

  const todayDate = endDate.format("YYYY-MM-DD")
  const todayCount = recordsInRange.filter(
    (r) => r.createdAt.startsWith(todayDate) && r.action === "call"
  ).length

  const callTrend = useMemo(() => {
    return dateRange.map((fullDate) => {
      const count = recordsInRange.filter(
        (r) => r.action === "call" && r.createdAt.startsWith(fullDate)
      ).length
      return { date: fullDate.slice(5), count }
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
    const map = new Map<string, { matterId: string; callCount: number; returnCount: number }>()
    recordsInRange.forEach((r) => {
      const existing = map.get(r.matterName) || { matterId: r.matterId, callCount: 0, returnCount: 0 }
      if (r.action === "call") existing.callCount++
      map.set(r.matterName, existing)
    })
    return Array.from(map.entries())
      .map(([matterName, data]) => ({ matterName, ...data }))
      .sort((a, b) => b.callCount - a.callCount)
      .filter((m) => m.matterName !== "全量统计")
  }, [recordsInRange])

  const operatorsRank = useMemo(() => {
    const map = new Map<string, { callCount: number; total: number; windowNo: string }>()
    recordsInRange.forEach((r) => {
      const existing = map.get(r.operatorName) || { callCount: 0, total: 0, windowNo: r.windowNo }
      if (r.action === "call") existing.callCount++
      existing.total++
      map.set(r.operatorName, existing)
    })
    return Array.from(map.entries())
      .map(([name, data]) => ({ operatorName: name, ...data }))
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
      { type: "刷证识别", count: totalScans, color: "#13C2C2" },
      { type: "证照核验", count: totalVerifies, color: "#1677FF" },
      { type: "证照调用", count: totalCalls, color: "#1B3A5C" },
      { type: "查看详情", count: totalViews, color: "#2F54EB" },
      { type: "下载证照", count: totalDownloads, color: "#52C41A" },
      { type: "导出报告", count: totalExports, color: "#FAAD14" },
      { type: "打印输出", count: totalPrints, color: "#FA8C16" },
      { type: "补交材料", count: totalSubmitSupplements, color: "#722ED1" },
      { type: "退回补正", count: totalReturnSupplements, color: "#EB2F96" },
    ].filter((a) => a.count > 0 || ["刷证识别", "证照核验", "证照调用", "下载证照"].includes(a.type))
  }, [totalScans, totalVerifies, totalCalls, totalViews, totalDownloads, totalExports, totalPrints, totalSubmitSupplements, totalReturnSupplements])

  const noticesInRange = useMemo(
    () => notices.filter((n) => (n.printedAt || n.createdAt) && dayjs(n.printedAt || n.createdAt).isSame(startDate, "day") || (dayjs(n.printedAt || n.createdAt).isAfter(startDate) && (dayjs(n.printedAt || n.createdAt).isSame(endDate, "day") || dayjs(n.printedAt || n.createdAt).isBefore(endDate)))),
    [notices, startDate, endDate]
  )

  const supplementStats = useMemo(() => {
    let totalRequired = 0
    let submitted = 0
    let returned = 0
    let pending = 0
    noticesInRange.forEach((n) => {
      n.supplements.forEach((s) => {
        totalRequired++
        if (s.status === "submitted") submitted++
        else if (s.status === "returned") returned++
        else pending++
      })
    })
    return { totalRequired, submitted, returned, pending, rate: totalRequired > 0 ? Math.round((submitted / totalRequired) * 100) : 0 }
  }, [noticesInRange])

  const kpis = [
    {
      title: "今日调用量",
      value: todayCount,
      icon: <PhoneCall size={22} />,
      color: "#1B3A5C",
      bg: "#eef2f7",
    },
    {
      title: "累计调用（趋势）",
      value: totalCalls,
      icon: <TrendingUp size={22} />,
      color: "#3B82F6",
      bg: "#eff6ff",
    },
    {
      title: "告知单打印份数",
      value: noticesInRange.filter((n) => n.printedAt).length,
      icon: <Printer size={22} />,
      color: "#10B981",
      bg: "#ecfdf5",
    },
    {
      title: "材料补交率",
      value: `${supplementStats.rate}%`,
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
    interactions: [{ type: "element-active" }],
    onReady: (plot: any) => {
      plot.on("element:click", (evt: any) => {
        const { data } = evt.data?.data || {}
        if (data?.date) {
          resetAuditFilter()
          setAuditFilter({
            windowFilter,
            dateRange: [
              dayjs(`2026-${data.date}`).startOf("day").format("YYYY-MM-DD HH:mm:ss"),
              dayjs(`2026-${data.date}`).endOf("day").format("YYYY-MM-DD HH:mm:ss"),
            ],
            actionFilter: "call",
          })
          navigate("/audit")
        }
      })
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

  const windowBarConfig = {
    data: callsByWindow,
    xField: "windowNo",
    yField: "callCount",
    color: "#1B3A5C",
    style: { radiusTopLeft: 4, radiusTopRight: 4 },
    label: {
      text: (d: { callCount: number }) => d.callCount,
      position: "outside" as const,
      style: { fontSize: 12 },
    },
    interactions: [{ type: "element-active" }],
    onReady: (plot: any) => {
      plot.on("element:click", (evt: any) => {
        const { data } = evt.data?.data || {}
        if (data?.windowNo) {
          resetAuditFilter()
          setAuditFilter({
            windowFilter: data.windowNo,
            dateRange: [
              startDate.startOf("day").format("YYYY-MM-DD HH:mm:ss"),
              endDate.endOf("day").format("YYYY-MM-DD HH:mm:ss"),
            ],
          })
          navigate("/audit")
        }
      })
    },
  }

  const operatorColumns = [
    {
      title: "排名",
      key: "rank",
      width: "12%",
      render: (_: unknown, __: unknown, index: number) => (
        <Tag color={index === 0 ? "gold" : index === 1 ? "blue" : index === 2 ? "cyan" : "default"}>
          NO.{index + 1}
        </Tag>
      ),
    },
    {
      title: "窗口人员",
      dataIndex: "operatorName",
      key: "operatorName",
    },
    {
      title: "所在窗口",
      dataIndex: "windowNo",
      key: "windowNo",
    },
    {
      title: "调用量",
      dataIndex: "callCount",
      key: "callCount",
      render: (v: number) => <span className="font-bold text-[#1B3A5C]">{v}</span>,
    },
    {
      title: "总操作数",
      dataIndex: "total",
      key: "total",
      render: (v: number) => <span className="text-gray-500">{v}</span>,
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: { operatorName: string }) => (
        <a
          onClick={() => {
            resetAuditFilter()
            setAuditFilter({
              windowFilter,
              dateRange: [
                startDate.startOf("day").format("YYYY-MM-DD HH:mm:ss"),
                endDate.endOf("day").format("YYYY-MM-DD HH:mm:ss"),
              ],
              searchText: record.operatorName,
            })
            navigate("/audit")
          }}
        >
          看记录
        </a>
      ),
    },
  ]

  const matterColumns = [
    {
      title: "排名",
      key: "rank",
      width: "10%",
      render: (_: unknown, __: unknown, index: number) => (
        <span className={index < 3 ? "font-bold text-[#E8A838]" : "text-gray-400"}>
          {index + 1}
        </span>
      ),
    },
    {
      title: "事项名称",
      dataIndex: "matterName",
      key: "matterName",
      ellipsis: true,
      render: (text: string, record: { matterId: string }) => (
        <a
          onClick={() => {
            resetAuditFilter()
            setAuditFilter({
              windowFilter,
              dateRange: [
                startDate.startOf("day").format("YYYY-MM-DD HH:mm:ss"),
                endDate.endOf("day").format("YYYY-MM-DD HH:mm:ss"),
              ],
              searchText: text,
            })
            navigate("/audit")
          }}
          className="text-[#1B3A5C] hover:underline"
        >
          {text}
        </a>
      ),
    },
    {
      title: "调用量",
      dataIndex: "callCount",
      key: "callCount",
      width: "20%",
      render: (v: number) => <span className="font-bold text-[#1B3A5C]">{v}</span>,
    },
    {
      title: "热度",
      key: "hot",
      width: "20%",
      render: (_: unknown, record: { callCount: number }) => {
        const max = Math.max(...callsByMatter.map((m) => m.callCount), 1)
        const pct = Math.round((record.callCount / max) * 100)
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: pct > 60 ? "#1B3A5C" : pct > 30 ? "#3B82F6" : "#999",
                }}
              />
            </div>
            <Flame size={14} className={pct > 60 ? "text-orange-500" : "text-gray-300"} />
          </div>
        )
      },
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
        <Tag color="blue" className="text-xs">
          {windowFilter ? `${windowFilter} · ` : ""}
          {startDate.format("YYYY-MM-DD")} ~ {endDate.format("YYYY-MM-DD")}
        </Tag>
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
            title="调用量趋势（仅统计 call 操作，点击柱子可跳转留痕档案）"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <Column {...trendConfig} height={240} />
          </Card>

          <Card
            title="按窗口统计调用量（点击柱子跳转对应窗口留痕）"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            {callsByWindow.length > 0 ? (
              <div style={{ height: 240 }}>
                <Column {...windowBarConfig} />
              </div>
            ) : (
              <Empty
                description="当前筛选条件下暂无数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="py-6"
              />
            )}
          </Card>

          <Card
            title={
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#1B3A5C]" />
                <span>窗口人员调用排行</span>
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
            {operatorsRank.length > 0 ? (
              <Table
                dataSource={operatorsRank}
                columns={operatorColumns}
                pagination={false}
                size="small"
                rowKey="operatorName"
              />
            ) : (
              <Empty
                description="当前筛选条件下暂无数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="py-6"
              />
            )}
          </Card>

          <Card
            title={
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[#E8A838]" />
                <span>事项热度明细（点击事项跳转留痕）</span>
              </div>
            }
            className="shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
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
            title="材料补交情况（告知单闭环）"
            className="shadow-sm"
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">需补交总项数</span>
                <span className="font-bold text-[#1B3A5C]">{supplementStats.totalRequired}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">已补交</span>
                <span className="font-bold text-green-600">{supplementStats.submitted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">退回补正</span>
                <span className="font-bold text-red-500">{supplementStats.returned}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">待补交</span>
                <span className="font-bold text-orange-500">{supplementStats.pending}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500">补交完成率</span>
                  <span className="font-bold text-[#1B3A5C]">{supplementStats.rate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1B3A5C]"
                    style={{ width: `${supplementStats.rate}%` }}
                  />
                </div>
              </div>
            </div>
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
                xAxis={{ label: { style: { fontSize: 10 }, autoHide: false, autoRotate: false } }}
                interactions={[{ type: "element-active" }]}
                onReady={(plot: any) => {
                  plot.on("element:click", (evt: any) => {
                    const { data } = evt.data?.data || {}
                    if (data?.type) {
                      const typeMap: Record<string, string> = {
                        刷证识别: "scan",
                        证照核验: "verify",
                        证照调用: "call",
                        查看详情: "view",
                        下载证照: "download",
                        导出报告: "export",
                        打印输出: "print",
                        补交材料: "submit_supplement",
                        退回补正: "return_supplement",
                      }
                      resetAuditFilter()
                      setAuditFilter({
                        windowFilter,
                        dateRange: [
                          startDate.startOf("day").format("YYYY-MM-DD HH:mm:ss"),
                          endDate.endOf("day").format("YYYY-MM-DD HH:mm:ss"),
                        ],
                        actionFilter: typeMap[data.type] || "",
                      })
                      navigate("/audit")
                    }
                  })
                }}
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
