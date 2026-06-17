import { useRef, useCallback } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "antd"
import { PenLine, RotateCcw, Check } from "lucide-react"

interface SignPadProps {
  onConfirm: (dataUrl: string) => void
  onClear?: () => void
  width?: number
  height?: number
}

export default function SignPad({ onConfirm, onClear, width = 500, height = 160 }: SignPadProps) {
  const sigRef = useRef<SignatureCanvas>(null)

  const handleClear = useCallback(() => {
    sigRef.current?.clear()
    onClear?.()
  }, [onClear])

  const handleConfirm = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL("image/png")
      onConfirm(dataUrl)
    }
  }, [onConfirm])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
        <PenLine size={14} />
        <span>群众签字确认授权调证</span>
      </div>
      <div
        className="border-2 border-dashed border-gray-300 rounded bg-gray-50 mx-auto"
        style={{ width, height }}
      >
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width,
            height,
            className: "sig-canvas",
            style: { borderRadius: 4 },
          }}
        />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button
          icon={<RotateCcw size={14} />}
          onClick={handleClear}
          className="text-sm"
        >
          重签
        </Button>
        <Button
          type="primary"
          icon={<Check size={14} />}
          onClick={handleConfirm}
          style={{ background: "#1B3A5C" }}
          className="text-sm"
        >
          确认签字
        </Button>
      </div>
    </div>
  )
}
