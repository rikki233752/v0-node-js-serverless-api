import { ConnectionStatus } from "@/components/connection-status"

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ConnectionStatus />
    </div>
  )
}
