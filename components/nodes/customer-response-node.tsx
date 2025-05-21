"use client"

import { useState } from "react"
import { Handle, Position } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus, MessageSquareQuote } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { NodeDeleteButton } from "@/components/flowchart-builder/node-delete-button"
import { NodeDuplicateButton } from "@/components/flowchart-builder/node-duplicate-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  defaultResponseOptions,
  commonVariables,
  getVariableTypeByName,
  getVariableDescription,
} from "@/config/flowchart-defaults"
import { motion } from "framer-motion"

export default function CustomerResponseNode({ data, selected, id }: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [options, setOptions] = useState<string[]>(data?.options || data?.responses || defaultResponseOptions)
  const [isOpenEnded, setIsOpenEnded] = useState(data?.isOpenEnded || false)
  const [newOption, setNewOption] = useState("")
  const [variableName, setVariableName] = useState(data?.variableName || "")
  const [variableType, setVariableType] = useState(data?.variableType || "string")
  const [variableDescription, setVariableDescription] = useState(data?.variableDescription || "")

  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()])
      setNewOption("")
    }
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    // Use the first option as a fallback if there are no options
    const finalOptions = options.length > 0 ? options : [newOption.trim() || "Response"]

    // Update the data object with the options
    data.options = finalOptions
    data.responses = finalOptions // For compatibility
    data.isOpenEnded = isOpenEnded

    // Determine a sensible variable name if none is provided
    const derivedVariableName = variableName || finalOptions[0]

    // Save variable extraction information
    data.variableName = derivedVariableName
    data.variableType = variableType || getVariableTypeByName(derivedVariableName)
    data.variableDescription = variableDescription || getVariableDescription(derivedVariableName)

    // Log to verify data is being set correctly
    console.log("Saving customer response options:", finalOptions)

    setIsEditing(false)
  }

  // Calculate handle positions
  const getHandlePosition = (index: number, total: number) => {
    // If there's only one option, put it in the center
    if (total === 1) return 0.5

    // Otherwise, distribute handles evenly
    return total <= 1 ? 0.5 : index / (total - 1)
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
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between bg-gradient-to-r from-cyan-50 to-cyan-100 dark:from-cyan-900 dark:to-cyan-800 rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="bg-white/80 text-cyan-600 border-cyan-200">
                <MessageSquareQuote size={12} className="mr-1" />
                Customer Response
              </Badge>
              <span className="text-cyan-700 dark:text-cyan-100">User Input</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 bg-white rounded-b-lg">
            {!isEditing ? (
              <>
                <div className="space-y-2">
                  {(data?.options || data?.responses || defaultResponseOptions).map((option: string, index: number) => (
                    <div
                      key={index}
                      className="text-sm p-2 border rounded-md bg-gray-50 relative hover:bg-gray-100 transition-colors"
                    >
                      {option}
                      <Handle
                        type="source"
                        position={Position.Bottom}
                        id={`response-${index}`}
                        className="w-3 h-3 bg-cyan-500"
                        style={{
                          left: `${getHandlePosition(index, (data?.options || data?.responses || []).length) * 100}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 rounded-md"
                >
                  Edit Response Options
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id={`open-ended-${id}`} checked={isOpenEnded} onCheckedChange={setIsOpenEnded} />
                  <Label htmlFor={`open-ended-${id}`}>Open-ended response</Label>
                </div>

                <div className="space-y-2">
                  <Label>Response Options</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options]
                          newOptions[index] = e.target.value
                          setOptions(newOptions)
                        }}
                        className="flex-1 rounded-md"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add new option"
                    className="flex-1 rounded-md"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddOption()
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddOption}
                    className="h-8 w-8 rounded-full hover:bg-cyan-50 hover:text-cyan-600"
                  >
                    <Plus size={16} />
                  </Button>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                  <Label htmlFor={`variable-name-${id}`}>Variable Name</Label>
                  <Select value={variableName} onValueChange={setVariableName}>
                    <SelectTrigger id={`variable-name-${id}`} className="rounded-md">
                      <SelectValue placeholder={options.length > 0 ? options[0] : "Response"} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Use first option as default suggestion */}
                      {options.length > 0 && <SelectItem value={options[0]}>{options[0]}</SelectItem>}
                      {/* Add common variables */}
                      {commonVariables.map((variable) => (
                        <SelectItem key={variable.name} value={variable.name}>
                          {variable.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>

                  {variableName === "custom" && (
                    <Input
                      value=""
                      onChange={(e) => setVariableName(e.target.value)}
                      placeholder="Custom variable name"
                      className="mt-2 rounded-md"
                    />
                  )}

                  <Label htmlFor={`variable-type-${id}`}>Variable Type</Label>
                  <Select
                    value={variableType}
                    onValueChange={setVariableType}
                    defaultValue={getVariableTypeByName(variableName || (options.length > 0 ? options[0] : "Response"))}
                  >
                    <SelectTrigger id={`variable-type-${id}`} className="rounded-md">
                      <SelectValue placeholder="Select variable type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="integer">Integer</SelectItem>
                      <SelectItem value="float">Float</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label htmlFor={`variable-description-${id}`}>Description</Label>
                  <Input
                    id={`variable-description-${id}`}
                    value={variableDescription}
                    onChange={(e) => setVariableDescription(e.target.value)}
                    placeholder={getVariableDescription(variableName || (options.length > 0 ? options[0] : "Response"))}
                    className="rounded-md"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-md">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="rounded-md">
                    Save
                  </Button>
                </div>
              </div>
            )}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
