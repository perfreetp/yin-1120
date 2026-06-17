import { Tag, Card } from "antd"
import { FileBadge } from "lucide-react"
import type { License } from "@/types"

const statusMap: Record<License["status"], { color: string; text: string }> = {
  normal: { color: "green", text: "正常" },
  expired: { color: "red", text: "已过期" },
  revoked: { color: "volcano", text: "已注销" },
  lost: { color: "orange", text: "已挂失" },
}

const callStatusMap: Record<License["callStatus"], { color: string; text: string }> = {
  available: { color: "blue", text: "已关联" },
  need_auth: { color: "orange", text: "需授权" },
  unavailable: { color: "default", text: "暂不可用" },
}

interface LicenseCardProps {
  license: License
  onVerify?: () => void
  compact?: boolean
}

export default function LicenseCard({ license, onVerify, compact }: LicenseCardProps) {
  const statusInfo = statusMap[license.status]
  const callInfo = callStatusMap[license.callStatus]

  return (
    <Card
      size="small"
      className="hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: license.status === "normal" ? "#2EAD6B" : "#E04848" }}
      title={
        <div className="flex items-center gap-2">
          <FileBadge size={16} className="text-[#1B3A5C]" />
          <span className="font-medium text-[#1B3A5C]">{license.name}</span>
          <Tag color={statusInfo.color} className="ml-1">{statusInfo.text}</Tag>
          <Tag color={callInfo.color}>{callInfo.text}</Tag>
        </div>
      }
      extra={
        onVerify && (
          <button
            onClick={onVerify}
            disabled={license.callStatus === "unavailable"}
            className="px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: license.callStatus === "unavailable" ? "#d9d9d9" : "#1B3A5C",
              color: license.callStatus === "unavailable" ? "#999" : "#fff",
            }}
          >
            调用核验
          </button>
        )
      }
    >
      {compact ? (
        <div className="text-sm text-gray-500">
          编号：{license.licenseNumber}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><span className="text-gray-400">持证人：</span>{license.holderName}</div>
          <div><span className="text-gray-400">证照编号：</span>{license.licenseNumber}</div>
          <div><span className="text-gray-400">签发日期：</span>{license.issueDate}</div>
          <div><span className="text-gray-400">有效期至：</span>{license.expiryDate}</div>
          <div className="col-span-2"><span className="text-gray-400">签发机关：</span>{license.issueAuthority}</div>
        </div>
      )}
    </Card>
  )
}
