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
import { MessageCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function QuestionNode({ data, selected, id }: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(data?.text || "What would you like to know about?")

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
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="bg-white/80 text-blue-600 border-blue-200">
                <MessageCircle size={12} className="mr-1" />
                Question
              </Badge>
              <span className="text-blue-700 dark:text-blue-100">Ask Question</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 bg-white rounded-b-lg">
            {!isEditing ? (
              <>
                <div className="text-sm min-h-[40px] py-1">{data?.text || "What would you like to know about?"}</div>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 rounded-md"
                >
                  Edit Question
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`text-${id}`}>Question Text</Label>
                  <Textarea
                    id={`text-${id}`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What would you like to know about?"
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
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
