"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useCallback, useRef, useState, useEffect } from "react"
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Connection,
  type Edge,
  type Node,
  getBezierPath,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { NodeSidebar } from "./node-sidebar"
import { nodeTypes } from "./node-types"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { initialNodes } from "./initial-data"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Play, Phone } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { JsonPreview } from "./json-preview"
import { ImportJsonDialog } from "./import-json-dialog"
import { convertBlandFormatToFlowchart } from "./convert-bland-to-flowchart"
import { preparePathwayForDeployment } from "./deploy-utils"
import { ValidationDialog } from "./validation-dialog"
import { TestPathwayDialog } from "./test-pathway-dialog"
import { defaultVariable, getVariableTypeByName, getVariableDescription } from "@/config/flowchart-defaults"
import { SendTestCallDialog } from "./send-test-call-dialog"

const initialEdges: Edge[] = []

// Helper function to normalize IDs
function normalizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_")
}

// Function to normalize node IDs by replacing special characters with underscores
function normalizeNodeIds(flowchart: any) {
  if (!flowchart || !flowchart.nodes || !Array.isArray(flowchart.nodes)) {
    console.warn("Invalid flowchart structure:", flowchart)
    return flowchart
  }

  const idMap = new Map() // Map to store original ID to normalized ID mapping

  // Create a deep copy of the flowchart
  const normalizedFlowchart = JSON.parse(JSON.stringify(flowchart))

  // Filter out nodes with undefined IDs
  normalizedFlowchart.nodes = normalizedFlowchart.nodes.filter((node: any) => {
    if (!node || !node.id || typeof node.id !== "string") {
      console.warn("Skipping node with invalid ID:", node)
      return false
    }
    return true
  })

  // Normalize node IDs
  normalizedFlowchart.nodes.forEach((node: any) => {
    const originalId = node.id
    // Replace special characters with underscores and ensure it's a valid ID
    const normalizedId = originalId.replace(/[^a-zA-Z0-9_]/g, "_")

    // Update the node ID
    node.id = normalizedId

    // Store the mapping
    idMap.set(originalId, normalizedId)
  })

  // Update edge source and target IDs
  if (normalizedFlowchart.edges && Array.isArray(normalizedFlowchart.edges)) {
    normalizedFlowchart.edges = normalizedFlowchart.edges.filter((edge: any) => {
      if (!edge || !edge.source || !edge.target || typeof edge.source !== "string" || typeof edge.target !== "string") {
        console.warn("Skipping edge with invalid source or target:", edge)
        return false
      }
      return true
    })

    normalizedFlowchart.edges.forEach((edge: any) => {
      if (idMap.has(edge.source)) {
        edge.source = idMap.get(edge.source)
      }

      if (idMap.has(edge.target)) {
        edge.target = idMap.get(edge.target)
      }

      // Also normalize sourceHandle and targetHandle if they exist
      if (edge.sourceHandle && typeof edge.sourceHandle === "string") {
        edge.sourceHandle = edge.sourceHandle.replace(/[^a-zA-Z0-9_]/g, "_")
      }

      if (edge.targetHandle && typeof edge.targetHandle === "string") {
        edge.targetHandle = edge.targetHandle.replace(/[^a-zA-Z0-9_]/g, "_")
      }
    })
  }

  return normalizedFlowchart
}

// Helper function to extract variables from customer response nodes
function extractVariablesFromCustomerResponseNodes(nodes: any[], edges: any[]) {
  const extractVars: any[] = []
  const customerResponseNodes = nodes.filter((node: any) => node.type === "customerResponseNode")

  customerResponseNodes.forEach((node: any) => {
    // If the node has a specific variable name in its data, use it
    if (node.data.variableName) {
      extractVars.push([
        node.data.variableName,
        node.data.variableType || getVariableTypeByName(node.data.variableName),
        node.data.variableDescription || getVariableDescription(node.data.variableName),
        false,
      ])
    } else if (node.data.options && node.data.options.length > 0) {
      // Otherwise use the first option as the variable name
      const variableName = node.data.options[0]
      extractVars.push([variableName, getVariableTypeByName(variableName), getVariableDescription(variableName), false])
    }
  })

  return extractVars
}

// Update the convertFlowchartToBlandFormat function to handle conditional nodes as direct edges
function convertFlowchartToBlandFormat(flowchart: any) {
  if (!flowchart || !flowchart.nodes || !Array.isArray(flowchart.nodes)) {
    console.warn("Invalid flowchart structure:", flowchart)
    return {
      name: "Invalid Flowchart",
      description: "The flowchart structure is invalid",
      nodes: [],
      edges: [],
    }
  }

  const { nodes: reactFlowNodes, edges: reactFlowEdges } = flowchart

  // Filter out invalid nodes
  const validNodes = reactFlowNodes.filter((node: any) => {
    if (!node || !node.id || typeof node.id !== "string") {
      console.warn("Skipping node with invalid ID:", node)
      return false
    }
    if (!node.type) {
      console.warn("Node missing type, defaulting to Default:", node.id)
      node.type = "Default"
    }
    if (!node.data) {
      console.warn("Node missing data, creating empty object:", node.id)
      node.data = {}
    }
    return true
  })

  // Filter out invalid edges
  const validEdges = Array.isArray(reactFlowEdges)
    ? reactFlowEdges.filter((edge: any) => {
        if (
          !edge ||
          !edge.source ||
          !edge.target ||
          typeof edge.source !== "string" ||
          typeof edge.target !== "string"
        ) {
          console.warn("Skipping edge with invalid source or target:", edge)
          return false
        }
        return true
      })
    : []

  // Find the start node
  const startNodeId = findStartNodeId(validNodes, validEdges)
  const startNode = validNodes.find((node: any) => node.id === startNodeId)
  const startNodeIdNormalized = startNodeId ? startNodeId.replace(/[^a-zA-Z0-9_]/g, "_") : null

  // Track nodes to skip - ALWAYS skip customer response nodes for variables and conditional nodes
  const nodesToSkip = new Set()
  const extractedVars = new Set() // Start with an empty set and add variables as we find them

  // Add variables from the start node
  if (startNode && startNode.data?.extractVariables) {
    startNode.data.extractVariables.forEach((varName: string) => extractedVars.add(varName))
  } else {
    // Default to Response if no variables are specified
    extractedVars.add(defaultVariable.name)
  }

  validNodes.forEach((node: any) => {
    if (node.type === "customerResponseNode" && node.data?.variableName) {
      extractedVars.add(node.data.variableName)
    }

    // Add this section to collect variables from Response nodes
    if (node.type === "responseNode" && node.data?.extractVariables && Array.isArray(node.data.extractVariables)) {
      node.data.extractVariables.forEach((variable: string) => {
        extractedVars.add(variable)
      })
    }

    // Skip customer response nodes for variables that are already extracted
    if (node.type === "customerResponseNode") {
      // Extract the variable name from the node
      const variableName =
        node.data?.variableName ||
        (node.data?.options && node.data.options[0]) ||
        (node.data?.responses && node.data.responses[0])

      if (variableName) {
        extractedVars.add(variableName)

        // Skip customer response nodes for variables that are already extracted
        if (extractedVars.has(variableName)) {
          console.log(`Skipping customer response node for already extracted variable: ${variableName}`)
          nodesToSkip.add(node.id)
        }
      }
    }

    // Skip conditional nodes - we'll handle them as direct edges
    if (node.type === "conditionalNode") {
      console.log("Skipping conditional node:", node.id)
      nodesToSkip.add(node.id)

      // Extract the variable name from the conditional node
      if (node.data?.variableName) {
        extractedVars.add(node.data.variableName)
      }
    }
  })

  // Create a map to track conditional node targets
  const conditionalNodeTargets = new Map()

  // First pass: identify conditional node targets and their conditions
  validEdges.forEach((edge) => {
    const sourceNode = validNodes.find((n) => n.id === edge.source)

    if (sourceNode?.type === "conditionalNode") {
      const targetId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_")

      // Use the actual variable name and condition from the node data
      const variableName = sourceNode.data?.variableName || defaultVariable.name
      const operator = sourceNode.data?.conditionOperator || "=="
      const value = sourceNode.data?.conditionValue || "Yes"

      // Create the condition based on the source handle (true/false)
      const isTrue = edge.sourceHandle === "true"
      const condition = isTrue
        ? `${variableName}${operator}${value}`
        : `${variableName}${
            operator === "<="
              ? ">"
              : operator === "<"
                ? ">="
                : operator === "=="
                  ? "!="
                  : operator === "!="
                    ? "=="
                    : operator === ">="
                      ? "<"
                      : "<="
          }${value}`

      const description = isTrue
        ? `${variableName} ${operator} ${value}`
        : `${variableName} is not ${operator} ${value}`

      if (!conditionalNodeTargets.has(sourceNode.id)) {
        conditionalNodeTargets.set(sourceNode.id, [])
      }

      conditionalNodeTargets.get(sourceNode.id).push({
        targetId,
        condition,
        description,
      })
    }
  })

  // Initialize arrays for nodes and edges
  const blandNodes: any[] = []
  const blandEdges: any[] = []

  // Create a map of node connections to handle skipped nodes
  const nodeConnections = new Map()

  // For each skipped node, find incoming and outgoing edges
  nodesToSkip.forEach((skippedNodeId) => {
    const incomingEdges = validEdges.filter((e) => e.target === skippedNodeId)
    const outgoingEdges = validEdges.filter((e) => e.source === skippedNodeId)

    // For each incoming edge source, connect it to each outgoing edge target
    incomingEdges.forEach((inEdge) => {
      // If this is a conditional node, handle it specially
      const skippedNode = validNodes.find((n) => n.id === skippedNodeId)

      if (skippedNode?.type === "conditionalNode") {
        // Get the targets for this conditional node
        const targets = conditionalNodeTargets.get(skippedNodeId) || []

        // For each source to the conditional node, create direct edges to the targets
        const sourceId = inEdge.source.replace(/[^a-zA-Z0-9_]/g, "_")

        // Store these connections to create later
        if (!nodeConnections.has(sourceId)) {
          nodeConnections.set(sourceId, [])
        }

        // Add each target with its condition
        targets.forEach((target) => {
          nodeConnections.get(sourceId).push({
            targetId: target.targetId,
            condition: target.condition,
            description: target.description,
          })
        })
      } else {
        // Handle regular skipped nodes
        outgoingEdges.forEach((outEdge) => {
          if (!nodesToSkip.has(inEdge.source) && !nodesToSkip.has(outEdge.target)) {
            // Get the label from the edge data if available
            let edgeLabel = "next"

            // First check if the outgoing edge has a data.label property
            if (outEdge.data?.label) {
              edgeLabel = outEdge.data.label
              console.log(`Using outgoing edge data label: ${edgeLabel}`)
            }
            // Then check if it has a direct label property
            else if (outEdge.label) {
              edgeLabel = outEdge.label
              console.log(`Using direct outgoing edge label: ${edgeLabel}`)
            }
            // Check if it's from a customer response node with a sourceHandle
            else if (outEdge.sourceHandle && outEdge.sourceHandle.startsWith("response-")) {
              // Find the source node
              const sourceNode = validNodes.find((n) => n.id === outEdge.source)
              if (sourceNode && sourceNode.type === "customerResponseNode") {
                const responseIndex = Number.parseInt(outEdge.sourceHandle.split("-")[1], 10)
                const options = sourceNode.data?.options || sourceNode.data?.responses || []
                if (options.length > responseIndex) {
                  edgeLabel = `User responded ${options[responseIndex]}`
                  console.log(`Using customer response option: ${edgeLabel}`)
                }
              }
            }

            // Store this connection to create later
            if (!nodeConnections.has(inEdge.source)) {
              nodeConnections.set(inEdge.source, [])
            }

            nodeConnections.get(inEdge.source).push({
              targetId: outEdge.target.replace(/[^a-zA-Z0-9_]/g, "_"),
              condition: edgeLabel,
              description: `User selected: ${edgeLabel}`,
            })
          }
        })
      }
    })
  })

  // Process each node
  validNodes.forEach((node: any, index: number) => {
    // Skip nodes that should be excluded
    if (nodesToSkip.has(node.id)) {
      return
    }

    // Ensure ID is sanitized
    const nodeId = node.id.replace(/[^a-zA-Z0-9_]/g, "_")

    // Get text from appropriate field - with safety check
    const text = node.data?.text || node.data?.intentDescription || node.data?.description || `Node ${index + 1}`

    // Check if this is the start node
    const isStartNode = nodeId === startNodeIdNormalized

    if (node.type === "transferNode") {
      // Create the Transfer Node with the exact format specified
      blandNodes.push({
        id: nodeId,
        type: "Transfer Call",
        data: {
          name: "Transfer Call",
          text: text || "Transferring your call now...",
          transferNumber: node.data?.transferNumber || node.data?.phoneNumber || "+18445940353",
          warmTransferFields: {
            isEnabled: node.data?.transferType === "warm",
            userHandling: "on-hold",
            optimizeForIVR: true,
          },
          modelOptions: {
            modelType: "smart",
            temperature: 0.2,
          },
        },
      })
    } else if (node.type === "endCallNode") {
      // Create the End Call Node with the exact format specified
      blandNodes.push({
        id: nodeId,
        type: "End Call",
        data: {
          name: "End Call",
          prompt: text || "Thank you for your time. Goodbye!",
          modelOptions: {
            modelType: "smart",
            temperature: 0.2,
          },
        },
      })
    } else if (node.type === "webhookNode") {
      // Create Webhook Node
      blandNodes.push({
        id: nodeId,
        type: "Webhook",
        data: {
          name: node.data?.name || `Webhook ${index + 1}`,
          text: text || `Webhook ${index + 1}`,
          url: node.data?.url || "https://example.com",
          method: node.data?.method || "POST",
          body: node.data?.body || "{}",
          extractVars: node.data?.extractVars || [
            ["response", "string", "The response from the webhook"],
            ["status", "number", "The HTTP status code"],
          ],
        },
      })
    } else {
      // Handle Default nodes (greeting, question, response)
      const nodeType = mapNodeTypeToBlandType(node.type)

      const nodeData: any = {
        name: node.type === "greetingNode" ? "Start" : node.type,
        text: text,
      }

      // ALWAYS add isStart flag and extractVars for the start node
      if (isStartNode && nodeType === "Default") {
        nodeData.isStart = true

        // Create extractVars array with all extracted variables
        nodeData.extractVars = Array.from(extractedVars).map((variable) => {
          // Determine the appropriate type for the variable
          const type = getVariableTypeByName(variable)
          return [variable, type, getVariableDescription(variable), false]
        })

        nodeData.extractVarSettings = {}

        // Add model options for the start node
        nodeData.modelOptions = {
          modelType: "smart",
          temperature: 0.2,
          isSMSReturnNode: false,
          skipUserResponse: false,
          disableEndCallTool: false,
          block_interruptions: false,
          disableSilenceRepeat: false,
        }
      } else {
        // Add basic model options for other nodes
        nodeData.modelOptions = {
          modelType: "smart",
          temperature: 0.2,
        }
      }

      blandNodes.push({
        id: nodeId,
        type: nodeType,
        data: nodeData,
      })
    }
  })

  // Process edges, handling conditional nodes specially
  validEdges.forEach((edge: any, index: number) => {
    // Safety check for source and target
    if (!edge.source || !edge.target || typeof edge.source !== "string" || typeof edge.target !== "string") {
      console.warn("Skipping edge with invalid source or target:", edge)
      return
    }

    const sourceId = edge.source.replace(/[^a-zA-Z0-9_]/g, "_")
    const targetId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_")

    // Skip edges where the source or target is a node we're skipping
    if (nodesToSkip.has(edge.source) || nodesToSkip.has(edge.target)) {
      return
    }

    // Improved label handling
    let label = "next"

    // First check if the edge has a data.label property
    if (edge.data?.label) {
      label = edge.data.label
      console.log(`Using edge data label: ${label}`)
    }
    // Then check if it has a direct label property
    else if (edge.label) {
      label = edge.label
      console.log(`Using direct edge label: ${label}`)
    }
    // Check if it's from a customer response node with a sourceHandle
    else if (edge.sourceHandle && edge.sourceHandle.startsWith("response-")) {
      // Find the source node
      const sourceNode = validNodes.find((n) => n.id === edge.source)
      if (sourceNode && sourceNode.type === "customerResponseNode") {
        const responseIndex = Number.parseInt(edge.sourceHandle.split("-")[1], 10)
        const options = sourceNode.data?.options || sourceNode.data?.responses || []
        if (options.length > responseIndex) {
          label = `User responded ${options[responseIndex]}`
          console.log(`Using customer response option: ${label}`)
        }
      }
    }

    // Create edge with required fields - USING BLAND.AI FORMAT
    blandEdges.push({
      id: `edge_${sourceId}_${targetId}_${index}`,
      source: sourceId,
      target: targetId,
      label: label, // Direct label property as per Bland.ai format
    })
  })

  // Add bypass edges for skipped nodes
  nodeConnections.forEach((targets, sourceId) => {
    targets.forEach((target, idx) => {
      // Only add if this connection doesn't already exist
      if (!blandEdges.some((e) => e.source === sourceId && e.target === target.targetId)) {
        // Create edge using Bland.ai format
        blandEdges.push({
          id: `edge_${sourceId}_${target.targetId}_bypass_${idx}`,
          source: sourceId,
          target: target.targetId,
          label: target.condition, // Direct label property as per Bland.ai format
        })
        console.log(`Created bypass edge: ${sourceId} -> ${target.targetId} with condition: ${target.condition}`)
      }
    })
  })

  // Ensure we have at least one Default node and one End Call node
  const hasDefaultNode = blandNodes.some((node: any) => node.type === "Default")
  const hasEndCallNode = blandNodes.some((node: any) => node.type === "End Call")

  // If no Default node, add one
  if (!hasDefaultNode) {
    const defaultNode = {
      id: "default_node",
      type: "Default",
      data: {
        name: "Start",
        text: "Hello! This is the start of your conversation.",
        isStart: true,
        extractVars: Array.from(extractedVars).map((variable) => {
          const type = getVariableTypeByName(variable)
          return [variable, type, getVariableDescription(variable), false]
        }),
        extractVarSettings: {},
        modelOptions: {
          modelType: "smart",
          temperature: 0.2,
          isSMSReturnNode: false,
          skipUserResponse: false,
          disableEndCallTool: false,
          block_interruptions: false,
          disableSilenceRepeat: false,
        },
      },
    }
    blandNodes.push(defaultNode)
  }

  // If no End Call node, add one
  if (!hasEndCallNode) {
    const endCallNode = {
      id: "end_call_node",
      type: "End Call",
      data: {
        name: "End Call",
        prompt: "Thank you for your time. Goodbye!",
        modelOptions: {
          modelType: "smart",
          temperature: 0.2,
        },
      },
    }
    blandNodes.push(endCallNode)
  }

  // Ensure there's at least one edge connecting nodes
  if (blandEdges.length === 0 && blandNodes.length >= 2) {
    const defaultNodeId = blandNodes.find((node: any) => node.type === "Default")?.id
    const endCallNodeId = blandNodes.find((node: any) => node.type === "End Call")?.id

    if (defaultNodeId && endCallNodeId) {
      blandEdges.push({
        id: `edge_${defaultNodeId}_${endCallNodeId}_0`,
        source: defaultNodeId,
        target: endCallNodeId,
        label: "next", // Direct label property as per Bland.ai format
      })
    }
  }

  // Ensure only one node has isStart: true
  let startNodeFound = false
  blandNodes.forEach((node: any) => {
    if (node.data && node.data.isStart) {
      if (startNodeFound) {
        // If we already found a start node, remove isStart from this one
        delete node.data.isStart
      } else {
        startNodeFound = true
      }
    }
  })

  // Add the global config node
  blandNodes.push({
    globalConfig: { globalPrompt: "" },
  })

  return {
    name: flowchart.name || "Bland.ai Pathway",
    description: flowchart.description || `Pathway created on ${new Date().toISOString()}`,
    nodes: blandNodes,
    edges: blandEdges,
  }
}

// Helper function to find the start node ID
function findStartNodeId(nodes: any[], edges: any[]): string | null {
  // Filter out invalid nodes
  const validNodes = nodes.filter((node) => node && node.id && typeof node.id === "string")

  if (validNodes.length === 0) {
    console.warn("No valid nodes found")
    return null
  }

  // First, look for a greeting node
  const greetingNode = validNodes.find((node) => node.type === "greetingNode")
  if (greetingNode) return greetingNode.id

  // If no greeting node, find nodes with no incoming edges
  const validEdges = edges.filter((edge) => edge && edge.target && typeof edge.target === "string")
  const nodesWithIncomingEdges = new Set(validEdges.map((edge) => edge.target))
  const startNodes = validNodes.filter((node) => !nodesWithIncomingEdges.has(node.id))

  if (startNodes.length > 0) {
    return startNodes[0].id
  }

  // If all else fails, return the first node
  return validNodes.length > 0 ? validNodes[0].id : null
}

// Updated mapper function with correct Bland.ai node types
function mapNodeTypeToBlandType(type: string): string {
  switch (type) {
    case "greetingNode":
    case "questionNode":
    case "customerResponseNode":
      return "Default"
    case "endCallNode":
      return "End Call"
    case "transferNode":
      return "Transfer Call"
    case "webhookNode":
      return "Webhook"
    default:
      return "Default"
  }
}

// Update the CustomEdge component to better handle edge labels

// Custom edge component to display labels and deletion controls
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
  selected,
}: any) => {
  const [isHovered, setIsHovered] = useState(false)
  const edgeRef = useRef<SVGPathElement>(null)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Get the label from data.label, or fall back to a default
  const label = data?.label || "next"

  // Get the reactFlowInstance from context to access edge removal function
  const { setEdges } = useReactFlow()

  // Function to handle edge deletion
  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      setEdges((edges) => edges.filter((edge) => edge.id !== id))
      toast({
        title: "Connection removed",
        description: "The connection has been deleted.",
      })
    },
    [id, setEdges],
  )

  // Calculate a better position for the delete button - slightly above the midpoint
  const deleteButtonX = (sourceX + targetX) / 2
  const deleteButtonY = (sourceY + targetY) / 2 - 20 // Position it above the line

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: selected || isHovered ? "#ff0072" : style.stroke || "#b1b1b7",
          strokeWidth: selected || isHovered ? 3 : style.strokeWidth || 1.5, // Increased stroke width
          cursor: "pointer",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        ref={edgeRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          // This helps with edge selection
          if (!selected) {
            setEdges((edges) =>
              edges.map((e) => ({
                ...e,
                selected: e.id === id,
              })),
            )
          }
        }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: selected || isHovered ? "#fff8fa" : "white",
            padding: "3px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 500,
            pointerEvents: "all",
            border: selected || isHovered ? "1px solid #ff0072" : "1px solid #ccc",
            cursor: "pointer",
            boxShadow: selected || isHovered ? "0 0 5px rgba(255, 0, 114, 0.3)" : "none",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            // This helps with edge selection
            setEdges((edges) =>
              edges.map((e) => ({
                ...e,
                selected: e.id === id,
              })),
            )
          }}
        >
          {label}
        </div>
      )}
      {/* Delete button that appears when edge is selected or hovered */}
      {(selected || isHovered) && (
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${deleteButtonX}px, ${deleteButtonY}px)`,
            background: "#ff0072",
            color: "white",
            borderRadius: "50%",
            width: "22px",
            height: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            pointerEvents: "all",
            zIndex: 10,
            boxShadow: "0 0 5px rgba(0, 0, 0, 0.3)",
            transition: "transform 0.1s ease-in-out",
          }}
          className="nodrag nopan"
          onClick={handleDelete}
          title="Delete connection"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `translate(-50%, -50%) translate(${deleteButtonX}px, ${deleteButtonY}px) scale(1.1)`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `translate(-50%, -50%) translate(${deleteButtonX}px, ${deleteButtonY}px)`
          }}
        >
          ✖
        </div>
      )}
    </>
  )
}

// Define edge types
const edgeTypes = {
  custom: CustomEdge,
}

// Update the FlowchartBuilder component to accept initialData
export function FlowchartBuilder({ phoneNumber, initialData }: { phoneNumber?: string; initialData?: any }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [deployDialogOpen, setDeployDialogOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [pathwayName, setPathwayName] = useState("")
  const [pathwayDescription, setPathwayDescription] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")
  const [connectionMessage, setConnectionMessage] = useState("")
  const [deploymentResult, setDeploymentResult] = useState<any>(null)
  const [deploymentError, setDeploymentError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [apiPayload, setApiPayload] = useState<any>(null)
  const [blandPayload, setBlandPayload] = useState<any>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [testPathwayOpen, setTestPathwayOpen] = useState(false)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [sendTestCallOpen, setSendTestCallOpen] = useState(false)

  // Load saved flowchart on component mount
  useEffect(() => {
    try {
      // If initialData is provided, use it instead of loading from localStorage
      if (initialData) {
        // If initialData has name and description, use them
        if (initialData.name) setPathwayName(initialData.name)
        if (initialData.description) setPathwayDescription(initialData.description)

        // No need to set nodes and edges as they're already set in the useState above
        return
      }

      // Otherwise, load from localStorage as before
      // If we have a phone number, try to load the specific flowchart for that number
      const storageKey = phoneNumber ? `bland-flowchart-${phoneNumber}` : "bland-flowchart"

      // Set a default pathway name based on the phone number if provided
      if (phoneNumber) {
        const formattedNumber = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber}`
        setPathwayName(`Pathway for ${formattedNumber}`)
        setPathwayDescription(`Call flow for phone number ${formattedNumber}`)
      }

      const savedFlow = localStorage.getItem(storageKey)
      if (savedFlow) {
        const flow = JSON.parse(savedFlow)
        if (flow.nodes && flow.edges) {
          setNodes(flow.nodes)
          setEdges(flow.edges)

          // Load name and description if available
          if (flow.name) setPathwayName(flow.name)
          if (flow.description) setPathwayDescription(flow.description)

          toast({
            title: "Flowchart loaded",
            description: "Your saved flowchart has been loaded successfully.",
          })
        }
      }

      // Load saved API key if available
      const savedApiKey = localStorage.getItem("bland-api-key")
      if (savedApiKey) {
        setApiKey(savedApiKey)
      }
    } catch (error) {
      console.error("Error loading flowchart:", error)
    }
  }, [setNodes, setEdges, phoneNumber, initialData])

  // Update Bland.ai payload preview whenever nodes or edges change
  useEffect(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()

      // Add name and description to the flow
      flow.name = pathwayName || "Bland.ai Pathway"
      flow.description = pathwayDescription || `Pathway created on ${new Date().toLocaleString()}`

      const normalizedFlow = normalizeNodeIds(flow)
      const blandFormat = convertFlowchartToBlandFormat(normalizedFlow)

      setBlandPayload(blandFormat)
    }
  }, [nodes, edges, reactFlowInstance, pathwayName, pathwayDescription])

  // Effect to handle node highlighting during testing
  useEffect(() => {
    if (!reactFlowInstance) return

    // Create a new array of nodes with updated styles
    const updatedNodes = nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        boxShadow: node.id === highlightedNodeId ? "0 0 0 2px #3b82f6" : undefined,
        borderColor: node.id === highlightedNodeId ? "#3b82f6" : undefined,
        borderWidth: node.id === highlightedNodeId ? "2px" : undefined,
      },
    }))

    // Only update if the styles have actually changed
    const hasStyleChanges = updatedNodes.some((updatedNode, index) => {
      const currentNode = nodes[index]
      return JSON.stringify(updatedNode.style) !== JSON.stringify(currentNode.style)
    })

    if (hasStyleChanges) {
      setNodes(updatedNodes)

      // If we have a highlighted node, center on it
      if (highlightedNodeId) {
        const node = updatedNodes.find((n) => n.id === highlightedNodeId)
        if (node) {
          reactFlowInstance.setCenter(node.position.x, node.position.y, { duration: 800 })
        }
      }
    }
  }, [highlightedNodeId, reactFlowInstance, nodes, setNodes])

  // Update the onConnect function to better handle customer response node edge labels
  const onConnect = useCallback(
    (params: Connection) => {
      // Find the source node
      const sourceNode = nodes.find((node) => node.id === params.source)

      // Set edge data based on source node type
      let edgeData = {}

      if (sourceNode) {
        if (sourceNode.type === "customerResponseNode" && params.sourceHandle?.startsWith("response-")) {
          const responseIndex = Number.parseInt(params.sourceHandle.split("-")[1])
          const responses = sourceNode.data.options || sourceNode.data.responses || []

          // Check if we have a valid response at this index
          if (responses.length > 0) {
            // If there's only one response or the index is out of bounds, use the first response
            const responseText =
              responseIndex >= 0 && responseIndex < responses.length ? responses[responseIndex] : responses[0]

            edgeData = { label: `User responded ${responseText}` }

            // Log for debugging
            console.log(`Created edge with label: User responded ${responseText} from customer response node`)
          } else {
            // Fallback if no responses are defined
            edgeData = { label: "next" }
          }
        } else if (sourceNode.type === "conditionalNode") {
          if (params.sourceHandle === "true") {
            edgeData = { label: sourceNode.data.trueLabel || "Yes" }
          } else if (params.sourceHandle === "false") {
            edgeData = { label: sourceNode.data.falseLabel || "No" }
          }
        }
      }

      // Create the edge with the data
      const edge = {
        ...params,
        data: edgeData,
        type: "custom", // Use our custom edge type
      }

      setEdges((eds) => addEdge(edge, eds))
    },
    [nodes, setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")

      // Check if the dropped element is valid
      if (typeof type === "undefined" || !type || !reactFlowBounds || !reactFlowInstance) {
        return
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      // Create a unique ID for the new node and normalize it
      const rawNodeId = `${type.toLowerCase()}_${Date.now()}`
      const newNodeId = normalizeId(rawNodeId)

      // Default data for different node types
      let nodeData = {}

      switch (type) {
        case "greetingNode":
          nodeData = {
            text: "Hello! This is an AI assistant calling. How are you today?",
          }
          break
        case "questionNode":
          nodeData = {
            text: "What can I help you with today?",
          }
          break
        case "responseNode":
          nodeData = {
            text: "I understand. Let me help you with that.",
          }
          break
        case "customerResponseNode":
          nodeData = {
            responses: ["Age", "Name", "Email", "Phone"],
            options: ["Age", "Name", "Email", "Phone"], // Add options array for consistency
            isOpenEnded: false,
            intentDescription: "Capture customer's response and determine their intent",
          }
          break
        case "endCallNode":
          nodeData = {
            text: "Thank you for your time. Goodbye!",
          }
          break
        case "transferNode":
          nodeData = {
            text: "Transferring your call now...",
            transferNumber: "+18445940353",
            transferType: "warm",
            webhookUrl: "https://example.com/webhook",
            webhookMethod: "POST",
            webhookBody: JSON.stringify(
              {
                campaignId: "{{campaign_id}}",
                callId: "{{call_id}}",
                customerPhone: "{{customer_phone}}",
              },
              null,
              2,
            ),
          }
          break
        case "webhookNode":
          nodeData = {
            text: "Send data to external API", // Explicitly set text field
            url: "https://example.com/webhook",
            method: "POST",
            body: JSON.stringify(
              {
                event: "call_progress",
                data: {},
              },
              null,
              2,
            ),
            extractVars: [
              ["response", "string", "The response from the webhook"],
              ["status", "number", "The HTTP status code"],
            ],
          }
          break
        case "conditionalNode":
          nodeData = {
            conditions: [
              { id: normalizeId("cond_1"), text: "Yes" },
              { id: normalizeId("cond_2"), text: "No" },
              { id: normalizeId("cond_3"), text: "Maybe" },
            ],
          }
          break
        case "facebookLeadNode":
          nodeData = {
            text: "Track Facebook conversion",
            pixelId: "",
            eventName: "Lead",
            description: "Track Facebook conversion",
          }
          break
        case "googleLeadNode":
          nodeData = {
            text: "Track Google conversion",
            trackingId: "",
            conversionId: "",
            description: "Track Google conversion",
          }
          break
        case "zapierNode":
          nodeData = {
            text: "Send data to Zapier",
            webhookUrl: "",
            description: "Send data to Zapier",
          }
          break
        default:
          nodeData = {}
      }

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: nodeData,
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes],
  )

  const saveFlowchart = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject()

      // Add name and description to the flow
      flow.name = pathwayName || "Bland.ai Pathway"
      flow.description = pathwayDescription || `Pathway created on ${new Date().toLocaleString()}`

      // Use a specific storage key if we have a phone number
      const storageKey = phoneNumber ? `bland-flowchart-${phoneNumber}` : "bland-flowchart"
      localStorage.setItem(storageKey, JSON.stringify(flow))

      // For compatibility
      localStorage.setItem("flowchartData", JSON.stringify(flow))

      toast({
        title: "Flowchart saved",
        description: "Your flowchart has been saved successfully.",
      })
    } else {
      toast({
        title: "Error saving flowchart",
        description: "There was an error saving your flowchart. Please try again.",
        variant: "destructive",
      })
    }
  }

  const testConnection = async () => {
    if (!apiKey) {
      toast({
        title: "Missing API key",
        description: "Please provide your Bland.ai API key.",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)
    setConnectionStatus("idle")
    setConnectionMessage("")
    setDebugInfo(null)

    try {
      const response = await fetch("/api/bland-ai/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
        }),
      })

      const data = await response.json()
      setDebugInfo(data)

      if (response.ok && data.status === "success") {
        setConnectionStatus("success")
        setConnectionMessage("Successfully connected to Bland.ai API")

        // Save API key for future use
        localStorage.setItem("bland-api-key", apiKey)

        toast({
          title: "Connection successful",
          description: "Successfully connected to Bland.ai API.",
        })
      } else {
        setConnectionStatus("error")
        setConnectionMessage(data.message || "Failed to connect to Bland.ai API")

        toast({
          title: "Connection failed",
          description: data.message || "Failed to connect to Bland.ai API",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing connection:", error)
      setConnectionStatus("error")
      setConnectionMessage(error instanceof Error ? error.message : "Unknown error occurred")

      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeploy = async () => {
    if (!apiKey || !pathwayName) {
      toast({
        title: "Missing information",
        description: "Please provide your API key and pathway name.",
        variant: "destructive",
      })
      return
    }

    // Get the current flowchart
    const flow = reactFlowInstance.toObject()

    // Add name and description to the flow
    flow.name = pathwayName
    flow.description = pathwayDescription || `Pathway created on ${new Date().toLocaleString()}`

    // Validate the pathway
    const result = preparePathwayForDeployment(flow)
    setValidationResult(result.validationResult)

    // Show validation dialog
    setShowValidationDialog(true)
  }

  // Updated handleDeployAfterValidation function with improved error handling
  const handleDeployAfterValidation = async () => {
    setIsDeploying(true)
    setDeploymentResult(null)
    setDeploymentError(null)
    setDebugInfo(null)

    try {
      // Close the validation dialog
      setShowValidationDialog(false)

      // Get the current flowchart
      const flow = reactFlowInstance.toObject()

      // Add name and description to the flow
      flow.name = pathwayName
      flow.description = pathwayDescription || `Pathway created on ${new Date().toLocaleString()}`

      // Get the exact same JSON that's shown in the preview
      const blandFormat = convertFlowchartToBlandFormat(flow)

      // CRITICAL: Ensure all edges follow the Bland.ai format with direct label property
      if (blandFormat.edges && Array.isArray(blandFormat.edges)) {
        blandFormat.edges = blandFormat.edges.map((edge: any) => {
          // Convert from our format to Bland.ai format
          const newEdge: any = {
            id: edge.id,
            source: edge.source,
            target: edge.target,
          }

          // Get the label from data.label if it exists, otherwise use edge.label or "next"
          if (edge.data && edge.data.label) {
            newEdge.label = edge.data.label
            console.log(`Deployment: Using edge data label: ${newEdge.label}`)
          } else if (edge.label) {
            newEdge.label = edge.label
            console.log(`Deployment: Using direct edge label: ${newEdge.label}`)
          } else {
            // Look for the source node to get customer response options
            const sourceNode = reactFlowInstance.getNodes().find((n: any) => n.id === edge.source)
            if (
              sourceNode &&
              sourceNode.type === "customerResponseNode" &&
              edge.sourceHandle?.startsWith("response-")
            ) {
              const responseIndex = Number.parseInt(edge.sourceHandle.split("-")[1], 10)
              const options = sourceNode.data?.options || sourceNode.data?.responses || []
              if (options.length > responseIndex) {
                newEdge.label = options[responseIndex]
                console.log(`Deployment: Using customer response option: ${newEdge.label}`)
              } else {
                newEdge.label = "next"
              }
            } else {
              newEdge.label = "next"
            }
          }

          // Remove the type and data properties as they're not in Bland.ai format
          delete newEdge.type
          delete newEdge.data

          return newEdge
        })
      }

      // Store the payload for debugging
      setApiPayload(blandFormat)

      // First create the pathway
      const createResponse = await fetch("/api/bland-ai/create-pathway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          name: pathwayName,
          description: pathwayDescription || `Pathway created on ${new Date().toLocaleString()}`,
        }),
      })

      const createData = await createResponse.json()
      setDebugInfo((prev: any) => ({ ...prev, createResponse: createData }))

      if (!createResponse.ok) {
        throw new Error(createData.message || "Failed to create pathway")
      }

      // Extract the pathway ID from the nested response structure
      const pathwayId = createData.data?.data?.pathway_id

      if (!pathwayId) {
        throw new Error("No pathway ID returned from API: " + JSON.stringify(createData))
      }

      console.log("Sending exact preview JSON to Bland.ai:", JSON.stringify(blandFormat, null, 2))

      // Then update the pathway with the exact same JSON as the preview
      const updateResponse = await fetch("/api/bland-ai/update-pathway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          pathwayId,
          flowchart: blandFormat,
        }),
      })

      // Get the raw text response first to check if it's valid JSON
      const rawUpdateResponse = await updateResponse.text()
      let updateData

      try {
        updateData = JSON.parse(rawUpdateResponse)
      } catch (e) {
        console.error("Failed to parse update response as JSON:", rawUpdateResponse)
        throw new Error(`Invalid response from API: ${rawUpdateResponse.substring(0, 200)}...`)
      }

      setDebugInfo((prev: any) => ({
        ...prev,
        updateResponse: updateData,
        rawUpdateResponse:
          rawUpdateResponse.length > 1000 ? rawUpdateResponse.substring(0, 1000) + "..." : rawUpdateResponse,
      }))

      if (!updateResponse.ok) {
        if (updateData.validationErrors) {
          // Format validation errors for better display
          const errorMessage = "Validation errors: " + updateData.validationErrors.join(", ")
          throw new Error(errorMessage)
        } else if (updateData.responseData) {
          // Extract error details from the API response
          const apiErrorMessage = updateData.responseData.message || updateData.message || "Unknown API error"
          throw new Error(`API Error: ${apiErrorMessage}`)
        } else {
          throw new Error(updateData.message || "Failed to update pathway")
        }
      }

      setDeploymentResult({
        createResponse: createData,
        updateResponse: updateData,
        pathwayId,
      })

      toast({
        title: "Deployment successful",
        description: `Your flowchart has been deployed to Bland.ai with ID: ${pathwayId}`,
      })
    } catch (error) {
      console.error("Deployment error:", error)
      setDeploymentError(error instanceof Error ? error.message : "Unknown error occurred")

      toast({
        title: "Deployment failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const handleImportJson = (jsonData: any) => {
    try {
      // Convert the Bland.ai JSON to ReactFlow format
      const flowchartData = convertBlandFormatToFlowchart(jsonData)

      // Update the flowchart
      setNodes(flowchartData.nodes)
      setEdges(flowchartData.edges)

      // Update name and description if available
      if (flowchartData.name) setPathwayName(flowchartData.name)
      if (flowchartData.description) setPathwayDescription(flowchartData.description)

      // Auto-arrange the nodes for better visibility
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.2 })
        }, 100)
      }

      toast({
        title: "Import successful",
        description: "The flowchart has been rebuilt from the imported JSON.",
      })
    } catch (error) {
      console.error("Error importing JSON:", error)
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import JSON",
        variant: "destructive",
      })
    }
  }

  const copyPayloadToClipboard = () => {
    if (apiPayload) {
      navigator.clipboard.writeText(JSON.stringify(apiPayload, null, 2))
      toast({
        title: "Copied to clipboard",
        description: "The API payload has been copied to your clipboard.",
      })
    }
  }

  // Add keyboard event handler for deleting selected edges
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        // Check if we have any selected edges
        if (reactFlowInstance) {
          const selectedEdges = edges.filter((edge) => edge.selected)

          if (selectedEdges.length > 0) {
            // Remove the selected edges
            setEdges((edges) => edges.filter((edge) => !edge.selected))

            toast({
              title: `${selectedEdges.length > 1 ? "Connections" : "Connection"} removed`,
              description: `${selectedEdges.length} ${selectedEdges.length > 1 ? "connections have" : "connection has"} been deleted.`,
            })

            // Prevent default browser behavior
            event.preventDefault()
          }
        }
      }
    }

    // Add event listener
    window.addEventListener("keydown", handleKeyDown)

    // Clean up
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [reactFlowInstance, setEdges, edges])

  // Handle node highlighting for test pathway
  const handleHighlightNode = useCallback((nodeId: string | null) => {
    setHighlightedNodeId(nodeId)
  }, [])

  return (
    <div className="flex h-screen">
      <NodeSidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: "custom" }}
            selectNodesOnDrag={false}
            elementsSelectable={true}
            edgesFocusable={true}
            edgesUpdatable={true}
            fitView
            deleteKeyCode={["Backspace", "Delete"]} // Add this line to support both keys
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
            <Panel position="top-right" className="flex gap-2">
              <Button onClick={saveFlowchart} className="bg-green-600 hover:bg-green-700">
                Save Flowchart
              </Button>
              <Button
                onClick={() => setTestPathwayOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                Test Pathway
              </Button>
              <ImportJsonDialog onImport={handleImportJson} />
              {blandPayload && <JsonPreview data={blandPayload} title="Bland.ai Pathway JSON" />}
              <Button onClick={() => setDeployDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                Deploy to Bland.ai
              </Button>
              <Button
                onClick={() => setSendTestCallOpen(true)}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                disabled={!deploymentResult?.pathwayId}
              >
                <Phone className="h-4 w-4" />
                Send Test Call
              </Button>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Test Pathway Dialog */}
      {testPathwayOpen && reactFlowInstance && (
        <TestPathwayDialog
          isOpen={testPathwayOpen}
          onClose={() => {
            setTestPathwayOpen(false)
            setHighlightedNodeId(null)
          }}
          flowchartData={reactFlowInstance.toObject()}
          onHighlightNode={handleHighlightNode}
        />
      )}
      {sendTestCallOpen && (
        <SendTestCallDialog
          isOpen={sendTestCallOpen}
          onClose={() => setSendTestCallOpen(false)}
          pathwayId={deploymentResult?.pathwayId || null}
        />
      )}

      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Deploy to Bland.ai</DialogTitle>
            <DialogDescription>
              Enter your Bland.ai API key and pathway details to deploy your flowchart.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API Key
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="org_..."
                  className="flex-1"
                />
                <Button onClick={testConnection} disabled={isTesting || !apiKey} variant="outline" size="sm">
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </div>

            {connectionStatus === "success" && (
              <Alert className="col-start-2 col-span-3 bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Connection Successful</AlertTitle>
                <AlertDescription>{connectionMessage}</AlertDescription>
              </Alert>
            )}

            {connectionStatus === "error" && (
              <Alert className="col-start-2 col-span-3 bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{connectionMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pathwayName" className="text-right">
                Pathway Name
              </Label>
              <Input
                id="pathwayName"
                value={pathwayName}
                onChange={(e) => setPathwayName(e.target.value)}
                placeholder="My Awesome Pathway"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pathwayDescription" className="text-right">
                Description
              </Label>
              <Textarea
                id="pathwayDescription"
                value={pathwayDescription}
                onChange={(e) => setPathwayDescription(e.target.value)}
                placeholder="Describe your pathway..."
                className="col-span-3"
              />
            </div>
          </div>

          {deploymentError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">
              <p className="font-semibold">Deployment Error:</p>
              <p>{deploymentError}</p>
            </div>
          )}

          {deploymentResult && (
            <div className="bg-green-50 border border-green-200 rounded-md mb-4 overflow-hidden">
              <div className="bg-green-600 text-white px-4 py-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <h3 className="font-medium">Deployment Successful!</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pathway ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-green-50 px-2 py-1 rounded text-sm">{deploymentResult.pathwayId}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(deploymentResult.pathwayId)
                        toast({
                          title: "Copied",
                          description: "Pathway ID copied to clipboard",
                        })
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                {phoneNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Linked Phone Number:</span>
                    <code className="bg-green-50 px-2 py-1 rounded text-sm">{phoneNumber}</code>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeployDialogOpen(false)
                      window.location.href = "/dashboard/pathway"
                    }}
                  >
                    View All Pathways
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeployDialogOpen(false)
                      window.location.href = "/dashboard/call-history"
                    }}
                  >
                    View Call History
                  </Button>
                </div>
              </div>
            </div>
          )}

          {apiPayload && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="w-full flex items-center justify-between"
              >
                <span>Technical Details</span>
                {showDebugInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showDebugInfo && (
                <div className="mt-2 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium">API Payload:</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPayloadToClipboard}
                        className="flex items-center gap-1 h-7"
                      >
                        <Copy size={14} />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-md overflow-auto max-h-60">
                      <pre className="text-xs">{JSON.stringify(apiPayload, null, 2)}</pre>
                    </div>
                  </div>

                  {debugInfo && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Debug Information:</h3>
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded-md overflow-auto max-h-40">
                        <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !apiKey || !pathwayName || connectionStatus === "error"}
            >
              {isDeploying ? "Deploying..." : "Deploy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showValidationDialog && (
        <ValidationDialog
          isOpen={showValidationDialog}
          onClose={() => setShowValidationDialog(false)}
          validationResult={validationResult}
          onProceed={handleDeployAfterValidation}
          isDeploying={isDeploying}
        />
      )}
    </div>
  )
}
