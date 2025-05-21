import { validatePathway } from "./validate-pathway"

export function preparePathwayForDeployment(flowchart: any) {
  if (!flowchart || !flowchart.nodes || !Array.isArray(flowchart.nodes)) {
    console.warn("Invalid flowchart structure:", flowchart)
    return {
      name: "Invalid Flowchart",
      description: "The flowchart structure is invalid",
      nodes: [],
      edges: [],
      validationResult: {
        isValid: false,
        issues: ["Invalid flowchart structure. Please create a valid flowchart."],
      },
    }
  }

  const { nodes: reactFlowNodes, edges: reactFlowEdges } = flowchart
  const validNodes = reactFlowNodes.filter((node: any) => node && node.id && typeof node.id === "string")
  const validEdges = Array.isArray(reactFlowEdges)
    ? reactFlowEdges.filter(
        (edge: any) =>
          edge && edge.source && edge.target && typeof edge.source === "string" && typeof edge.target === "string",
      )
    : []

  const startNodeId = findStartNodeId(validNodes, validEdges)
  const validationResult = validatePathway(validNodes, validEdges)
  const nodesToUse = validationResult.isValid ? validNodes : validationResult.nodesWithFallbacks

  // Use the exact same conversion logic as the preview JSON
  const blandFormat = convertFlowchartToBlandFormat(nodesToUse, validationResult.edges, startNodeId)

  return {
    name: flowchart.name || "Bland.ai Pathway",
    description: flowchart.description || `Pathway created on ${new Date().toISOString()}`,
    nodes: blandFormat.nodes,
    edges: blandFormat.edges,
    validationResult,
  }
}

function findStartNodeId(nodes: any[], edges: any[]): string | null {
  const validNodes = nodes.filter((node) => node && node.id && typeof node.id === "string")
  if (validNodes.length === 0) return null
  const startNode = validNodes.find((node) => node.data?.isStart === true)
  if (startNode) return startNode.id
  const greetingNode = validNodes.find((node) => node.type === "greetingNode")
  if (greetingNode) return greetingNode.id
  const validEdges = edges.filter((edge) => edge && edge.target && typeof edge.target === "string")
  const nodesWithIncomingEdges = new Set(validEdges.map((edge) => edge.target))
  const startNodes = validNodes.filter((node) => !nodesWithIncomingEdges.has(node.id))
  return startNodes.length > 0 ? startNodes[0].id : validNodes[0]?.id || null
}

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

// Updated function to parse conditional expressions with any variable
function parseConditionExpression(text: string) {
  // More flexible regex that captures any variable name, not just "Age"
  const pattern = /if\s*$$\s*([a-zA-Z0-9_]+)\s*([<>=!]=?)\s*([^\s$$]+)\s*\)\s*\{/
  const match = text.match(pattern)
  if (!match) return null

  const [, variable, operator, value] = match

  // Create the true label using the actual variable name
  const trueLabel = `${variable}${operator}${value}`

  // Create the false label by inverting the operator for the actual variable
  const falseLabel =
    operator === "<="
      ? `${variable}>${value}`
      : operator === ">="
        ? `${variable}<${value}`
        : operator === "<"
          ? `${variable}>=${value}`
          : operator === ">"
            ? `${variable}<=${value}`
            : operator === "=="
              ? `${variable}!=${value}`
              : operator === "!="
                ? `${variable}==${value}`
                : "Else"

  return { variable, operator, value, trueLabel, falseLabel }
}

function convertFlowchartToBlandFormat(reactFlowNodes: any[], reactFlowEdges: any[], startNodeId: string | null) {
  const blandNodes: any[] = []
  const blandEdges: any[] = []
  const nodesToSkip = new Set()
  const extractedVars = new Set(["Age"]) // Default to Age, but we'll add more as we find them
  const nodeConnections = new Map()

  // Filter out invalid nodes and edges
  const validNodes = reactFlowNodes.filter((node: any) => node && node.id && typeof node.id === "string")
  const validEdges = reactFlowEdges.filter(
    (edge: any) =>
      edge && edge.source && edge.target && typeof edge.source === "string" && typeof edge.target === "string",
  )

  // Find the start node
  const startNode = validNodes.find((n) => n.id === startNodeId)

  // Find extracted vars from start node
  if (startNode && startNode.data?.extractVariables) {
    startNode.data.extractVariables.forEach((varName: string) => extractedVars.add(varName))
  }

  // First pass: identify customer response nodes and their variables
  validNodes.forEach((node) => {
    if (node.type === "customerResponseNode" && node.data?.variableName) {
      extractedVars.add(node.data.variableName)
    }

    // Add this section to collect variables from Response nodes
    if (node.type === "responseNode" && node.data?.extractVariables && Array.isArray(node.data.extractVariables)) {
      node.data.extractVariables.forEach((variable: string) => {
        extractedVars.add(variable)
      })
    }
  })

  // Map conditional node → parsed expression
  const conditionalMap = new Map()

  // Second pass: identify conditional nodes and their conditions
  validNodes.forEach((node) => {
    if (node.type === "conditionalNode") {
      // Get the condition text from the appropriate field
      const conditionText = node.data?.condition || node.data?.text || "if (Age <= 65) { True } else { False }"

      // Parse the condition to extract variable, operator, and value
      const parsed = parseConditionExpression(conditionText)

      if (parsed) {
        // Add the variable to our set of extracted variables
        extractedVars.add(parsed.variable)

        // Store the parsed condition for this node
        conditionalMap.set(node.id, parsed)
        nodesToSkip.add(node.id) // We'll remove this node later
      }
    }

    // Skip customer response nodes for variables that are already extracted
    if (node.type === "customerResponseNode") {
      const variableName =
        node.data?.variableName ||
        (node.data?.options && node.data.options[0]) ||
        (node.data?.responses && node.data.responses[0])

      if (variableName && extractedVars.has(variableName)) {
        console.log(`Skipping customer response node for already extracted variable: ${variableName}`)
        nodesToSkip.add(node.id)
      }
    }
  })

  // Update the section where we rewrite edges that connect through conditional node
  validEdges.forEach((edge) => {
    const sourceCondNode = conditionalMap.get(edge.source)
    if (sourceCondNode) {
      const isTrue = edge.sourceHandle === "true"

      // Use the actual parsed variable and condition from the conditional node
      const label = isTrue ? sourceCondNode.trueLabel : sourceCondNode.falseLabel

      const targetId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_")
      const sourceId = startNodeId?.replace(/[^a-zA-Z0-9_]/g, "_") || ""

      if (sourceId) {
        // Store this connection to create later
        if (!nodeConnections.has(sourceId)) {
          nodeConnections.set(sourceId, [])
        }

        nodeConnections.get(sourceId).push({
          targetId,
          condition: label,
          description: `Condition: ${label}`,
          edgeId: `edge_${sourceId}_${label.replace(/[^a-zA-Z0-9]/g, "_")}_to_${targetId}`,
        })

        console.log(`Created direct edge from start node to ${targetId} with condition: ${label}`)
      }
    }
  })

  // Process nodes
  validNodes.forEach((node, index) => {
    if (nodesToSkip.has(node.id)) {
      return
    }

    const nodeId = node.id.replace(/[^a-zA-Z0-9_]/g, "_")
    const text = node.data?.text || node.data?.intentDescription || node.data?.description || `Node ${index + 1}`
    const isStartNode = node.id === startNodeId

    if (node.type === "transferNode") {
      blandNodes.push({
        id: nodeId,
        type: "Transfer Call",
        data: {
          name: "Transfer Call",
          text,
          transferNumber: node.data?.transferNumber || "+18445940353",
          warmTransferFields: {
            isEnabled: node.data?.transferType === "warm",
            userHandling: "on-hold",
            optimizeForIVR: true,
          },
          modelOptions: { modelType: "smart", temperature: 0.2 },
        },
      })
    } else if (node.type === "endCallNode") {
      blandNodes.push({
        id: nodeId,
        type: "End Call",
        data: {
          name: "End Call",
          prompt: text,
          modelOptions: { modelType: "smart", temperature: 0.2 },
        },
      })
    } else if (node.type === "webhookNode") {
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
      const nodeType = mapNodeTypeToBlandType(node.type)
      const nodeData: any = {
        name: isStartNode ? "Start" : node.type,
        text,
        modelOptions: {
          modelType: "smart",
          temperature: 0.2,
          ...(isStartNode && {
            isSMSReturnNode: false,
            skipUserResponse: false,
            disableEndCallTool: false,
            block_interruptions: false,
            disableSilenceRepeat: false,
          }),
        },
      }

      // Add extractVars to the start node for all variables used in conditions
      if (isStartNode && nodeType === "Default") {
        nodeData.isStart = true

        // Create extractVars array with all extracted variables
        nodeData.extractVars = Array.from(extractedVars).map((variable) => {
          // Determine the appropriate type for the variable
          let type = "string"
          if (variable === "Age") type = "integer"
          if (variable === "Zip") type = "integer"

          return [variable, type, `Extract the ${variable.toLowerCase()}`, false]
        })

        nodeData.extractVarSettings = {}
      }

      blandNodes.push({ id: nodeId, type: nodeType, data: nodeData })
    }
  })

  // Process regular edges (not involving skipped nodes)
  validEdges.forEach((edge, index) => {
    if (nodesToSkip.has(edge.source) || nodesToSkip.has(edge.target)) {
      return
    }

    const sourceId = edge.source.replace(/[^a-zA-Z0-9_]/g, "_")
    const targetId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_")

    // Improved label handling for customer response nodes
    let label = "next"

    // First check if the edge has a data.label property
    if (edge.data?.label) {
      label = edge.data.label
    }
    // Then check if it has a direct label property
    else if (edge.label) {
      label = edge.label
    }
    // Finally, check if it's from a customer response node with a sourceHandle
    else if (edge.sourceHandle && edge.sourceHandle.startsWith("response-")) {
      // Find the source node
      const sourceNode = validNodes.find((n) => n.id === edge.source)
      if (sourceNode && sourceNode.type === "customerResponseNode") {
        const responseIndex = Number.parseInt(edge.sourceHandle.split("-")[1], 10)
        const options = sourceNode.data?.options || sourceNode.data?.responses || []
        if (options.length > responseIndex) {
          label = options[responseIndex]
        }
      }
    }

    // Create edge using Bland.ai format with direct label property
    blandEdges.push({
      id: `edge_${sourceId}_${targetId}_${index}`,
      source: sourceId,
      target: targetId,
      label: label,
    })
  })

  // And update the section where we add direct edges from start node to targets
  nodeConnections.forEach((targets, sourceId) => {
    targets.forEach((target) => {
      // Only add if this connection doesn't already exist
      if (!blandEdges.some((e) => e.source === sourceId && e.target === target.targetId)) {
        blandEdges.push({
          id:
            target.edgeId || `edge_${sourceId}_${target.condition.replace(/[^a-zA-Z0-9]/g, "_")}_to_${target.targetId}`,
          source: sourceId,
          target: target.targetId,
          label: target.condition, // Direct label property as per Bland.ai format
        })
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
          let type = "string"
          if (variable === "Age") type = "integer"
          if (variable === "Zip") type = "integer"
          return [variable, type, `Extract the ${variable.toLowerCase()}`, false]
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
        label: "next",
      })
    }
  }

  // Ensure only one node has isStart: true
  let startNodeFound = false
  blandNodes.forEach((node: any) => {
    if (node.data && node.data.isStart) {
      if (startNodeFound) {
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

  return { nodes: blandNodes, edges: blandEdges }
}
