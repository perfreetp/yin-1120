import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ConfigProvider } from "antd"
import zhCN from "antd/locale/zh_CN"
import Layout from "@/components/Layout"
import Reception from "@/pages/Reception"
import Verify from "@/pages/Verify"
import Exception from "@/pages/Exception"
import Audit from "@/pages/Audit"
import Dashboard from "@/pages/Dashboard"

const theme = {
  token: {
    colorPrimary: "#1B3A5C",
    borderRadius: 6,
    fontFamily:
      '"Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
}

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Reception />} />
            <Route path="/verify/:id" element={<Verify />} />
            <Route path="/exception" element={<Exception />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  )
}
