import { CallHistoryClient } from "@/components/call-history/call-history-client"

export default function CallHistoryPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Call History</h1>
      <p className="text-muted-foreground mb-6">View and manage your call history for phone number +19787836427</p>
      <CallHistoryClient phoneNumber="+19787836427" />
    </div>
  )
}
