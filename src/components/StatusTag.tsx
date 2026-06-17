import { Tag } from "antd"

type Variant = "success" | "warning" | "error" | "info" | "default"

interface StatusTagProps {
  variant: Variant
  text: string
}

const variantConfig: Record<Variant, { color: string; bg: string }> = {
  success: { color: "#2EAD6B", bg: "#f0faf4" },
  warning: { color: "#F0983E", bg: "#fef7ed" },
  error: { color: "#E04848", bg: "#fef1f1" },
  info: { color: "#3B82F6", bg: "#eff6ff" },
  default: { color: "#6b7280", bg: "#f3f4f6" },
}

const antColorMap: Record<Variant, string> = {
  success: "green",
  warning: "orange",
  error: "red",
  info: "blue",
  default: "default",
}

export default function StatusTag({ variant, text }: StatusTagProps) {
  return <Tag color={antColorMap[variant]}>{text}</Tag>
}

export function BadgeDot({ variant }: { variant: Variant }) {
  const config = variantConfig[variant]
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5"
      style={{ background: config.color }}
    />
  )
}
