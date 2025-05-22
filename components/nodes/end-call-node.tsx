"use client"

import { useState } from "react"
import { Handle, Position } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { NodeDeleteButton } from "@/components/flowchart-builder/node-delete-button"
import { NodeDuplicateButton } from "@/components/flowchart-builder/node-duplicate-button"
import { PhoneOff } from "lucide-react"
import { motion } from "framer-motion"

export default function EndCallNode({ data, selected, id }: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(data?.text || "Thank you for your time. Goodbye!")

  const handleSave = () => {
    data.text = text
    setIsEditing(false)
  }

  return (
    <div className="relative">
      {selected && (
        <>
          <NodeDeleteButton nodeId={id} />
          <NodeDuplicateButton nodeId={id} />
        </>
      )}
      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
        <Card
          className={`w-64 shadow-sm hover:shadow-md transition-shadow duration-200 ${selected ? "ring-2 ring-primary" : ""}`}
        >
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="bg-white/80 text-red-600 border-red-200">
                <PhoneOff size={12} className="mr-1" />
                End Call
              </Badge>
              <span className="text-red-700 dark:text-red-100">Hang Up</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 bg-white rounded-b-lg">
            {!isEditing ? (
              <>
                <div className="text-sm min-h-[40px] py-1">{data?.text || "Thank you for your time. Goodbye!"}</div>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 rounded-md"
                >
                  Edit End Message
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`text-${id}`}>End Message</Label>
                  <Textarea
                    id={`text-${id}`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Thank you for your time. Goodbye!"
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-md">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="rounded-md">
                    Save
                  </Button>
                </div>
              </div>
            )}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-red-500" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
