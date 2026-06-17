import { useState } from "react"
import { Layout as AntLayout, Menu } from "antd"
import { useNavigate, useLocation } from "react-router-dom"
import {
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  FileText,
  BarChart3,
} from "lucide-react"

const { Header, Sider, Content } = AntLayout

const menuItems = [
  {
    key: "/",
    icon: <ClipboardList size={18} />,
    label: "受理台",
  },
  {
    key: "/exception",
    icon: <AlertTriangle size={18} />,
    label: "异常处理",
  },
  {
    key: "/audit",
    icon: <FileText size={18} />,
    label: "留痕档案",
  },
  {
    key: "/dashboard",
    icon: <BarChart3 size={18} />,
    label: "统计看板",
  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = menuItems.find((item) =>
    item.key === "/" ? location.pathname === "/" : location.pathname.startsWith(item.key)
  )?.key || "/"

  return (
    <AntLayout className="min-h-screen">
      <Header
        className="flex items-center px-6 border-b"
        style={{
          background: "#1B3A5C",
          height: 56,
          lineHeight: "56px",
          padding: "0 24px",
        }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={28} color="#E8A838" strokeWidth={2.5} />
          <span className="text-lg font-bold text-white tracking-wide">
            电子证照调用核验工作台
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-white/80 text-sm">
          <span>窗口1</span>
          <span className="text-white/40">|</span>
          <span>王丽娟</span>
          <span className="px-2 py-0.5 rounded text-xs bg-[#E8A838] text-[#1B3A5C] font-medium">
            综合窗口
          </span>
        </div>
      </Header>
      <AntLayout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={180}
          className="bg-white border-r border-gray-200"
          style={{ background: "#fff" }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, marginTop: 8 }}
            className="text-[15px]"
          />
        </Sider>
        <Content
          className="p-6 overflow-auto"
          style={{ background: "#F5F6FA", minHeight: "calc(100vh - 56px)" }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
