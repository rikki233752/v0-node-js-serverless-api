import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt, model = "openai/gpt-4o-mini", debug = false } = await req.json()

  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 })
  }

  console.log(`Generating pathway with OpenRouter, model: ${model}, prompt:`, prompt)

  const systemPrompt = `
You are a flowchart AI builder specialized in creating Bland.ai compatible call flows.
Convert the user's prompt into a conversational call flow using nodes compatible with Bland.ai's schema.

The output should be a valid JSON object with this structure:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "greeting",
      "data": {
        "text": "Hello, this is [Company Name]. How can I help you today?"
      },
      "position": { "x": 250, "y": 0 }
    },
    {
      "id": "node-2",
      "type": "question",
      "data": {
        "text": "Are you currently on Medicare or Medicaid?"
      },
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "node-3",
      "type": "customer-response",
      "data": {
        "text": "Waiting for customer response",
        "options": ["Yes", "No"],
        "variableName": "medicare_status"
      },
      "position": { "x": 250, "y": 200 }
    },
    {
      "id": "node-4",
      "type": "question",
      "data": {
        "text": "Great! Can I get your name please?"
      },
      "position": { "x": 150, "y": 300 }
    },
    {
      "id": "node-5",
      "type": "end-call",
      "data": {
        "text": "Thank you for your time. Have a great day!"
      },
      "position": { "x": 350, "y": 300 }
    }
  ],
  "edges": [
    {
      "id": "edge-1-2",
      "source": "node-1",
      "target": "node-2"
    },
    {
      "id": "edge-2-3",
      "source": "node-2",
      "target": "node-3"
    },
    {
      "id": "edge-3-4",
      "source": "node-3",
      "target": "node-4",
      "label": "Yes"
    },
    {
      "id": "edge-3-5",
      "source": "node-3",
      "target": "node-5",
      "label": "No"
    }
  ]
}

CRITICAL RULES:
1. Always start with a "greeting" node
2. Use "question" nodes for asking questions
3. NEVER use a "response" node followed by a "conditional" node to capture and branch based on user input
4. ALWAYS use a "customer-response" node after any yes/no question
5. For ALL yes/no questions, IMMEDIATELY follow with a "customer-response" node with options array containing ["Yes", "No"]
6. For numeric comparisons (like age checks), use a "customer-response" node with options array containing ["Under 65", "65 or older"]
7. Position nodes in a logical flow (greeting at top, end at bottom)
8. Every option in a customer-response node MUST have a corresponding edge with a matching label
9. The flow should follow the logical structure described in the prompt
10. Do not include any explanations, just return the JSON object
11. IMPORTANT: Any question that can be answered with Yes or No MUST be followed by a customer-response node with Yes/No options
12. IMPORTANT: Return ONLY valid JSON. No markdown formatting, no code blocks, no explanations.
13. CRITICAL: After EVERY Yes/No question, the "Yes" option should connect to the next step in the flow, and the "No" option should connect to an "end-call" node with a polite goodbye message.
14. NEVER use generic AI Response nodes when the response is binary (Yes/No) and will affect the path.

User prompt: "${prompt}"
`

  try {
    console.log("Calling OpenRouter API...")

    // Get API key from environment variable
    const apiKey = process.env.OPENROUTER_API_KEY

    // If no API key is found, return an error
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "No OpenRouter API key found",
          message: "Please set your OpenRouter API key in the environment variables",
        },
        { status: 401 },
      )
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bland-flowchart-builder.vercel.app/", // Replace with your actual domain
        "X-Title": "Bland.ai Flowchart Builder",
      },
      body: JSON.stringify({
        model: model, // Now using the model parameter with default of gpt-4o-mini
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.3, // Lower temperature for more consistent results
      }),
    })

    console.log("OpenRouter API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("OpenRouter API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to generate pathway with OpenRouter",
          details: errorData,
          status: response.status,
        },
        { status: 500 },
      )
    }

    const result = await response.json()
    console.log("OpenRouter API response received")

    const content = result.choices?.[0]?.message?.content

    if (!content) {
      console.error("No content in OpenRouter response")
      return NextResponse.json(
        {
          error: "No content in OpenRouter response",
          rawResponse: result,
        },
        { status: 500 },
      )
    }

    try {
      console.log("Parsing JSON from OpenRouter response")
      // Clean the content to handle potential markdown formatting
      const cleaned = content
        .trim()
        .replace(/^```(json|javascript|js)?\n/i, "")
        .replace(/\n```$/i, "")

      console.log("Cleaned content:", cleaned.substring(0, 100) + "...")

      // Try to parse the JSON
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch (parseError) {
        console.error("Initial JSON parsing failed:", parseError)

        // Try more aggressive cleaning for malformed JSON
        const moreAggressiveCleaning = cleaned
          .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
          .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
          .replace(/\n/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " ") // Collapse multiple spaces
          .trim()

        console.log("Trying more aggressive cleaning:", moreAggressiveCleaning.substring(0, 100) + "...")

        try {
          parsed = JSON.parse(moreAggressiveCleaning)
        } catch (secondParseError) {
          console.error("Second JSON parsing attempt failed:", secondParseError)

          // If debug mode is enabled, return the raw content for debugging
          if (debug) {
            return NextResponse.json(
              {
                error: "Failed to parse JSON",
                message: secondParseError.message,
                rawContent: content,
                cleanedContent: cleaned,
                moreAggressiveCleaning: moreAggressiveCleaning,
              },
              { status: 500 },
            )
          }

          throw secondParseError
        }
      }

      // Validate the response
      if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
        console.error("Invalid JSON structure: missing or empty nodes array")

        // If debug mode is enabled, return the parsed content for debugging
        if (debug) {
          return NextResponse.json(
            {
              error: "Invalid JSON structure: missing or empty nodes array",
              parsedContent: parsed,
              rawContent: content,
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: "Invalid JSON structure: missing or empty nodes array",
          },
          { status: 500 },
        )
      }

      if (!parsed.edges || !Array.isArray(parsed.edges)) {
        console.error("Invalid JSON structure: missing or invalid edges array")

        // If debug mode is enabled, return the parsed content for debugging
        if (debug) {
          return NextResponse.json(
            {
              error: "Invalid JSON structure: missing or invalid edges array",
              parsedContent: parsed,
              rawContent: content,
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: "Invalid JSON structure: missing or invalid edges array",
          },
          { status: 500 },
        )
      }

      // Process the flow to ensure Yes/No questions use customer-response nodes
      ensureYesNoQuestionsUseCustomerResponse(parsed.nodes, parsed.edges)

      console.log(`Successfully parsed JSON with ${parsed.nodes.length} nodes and ${parsed.edges.length} edges`)

      // If debug mode is enabled, include the raw content in the response
      if (debug) {
        return NextResponse.json({
          ...parsed,
          _debug: {
            rawContent: content,
            cleanedContent: cleaned,
          },
        })
      }

      return NextResponse.json(parsed)
    } catch (e) {
      console.error("Failed to parse JSON from OpenRouter:", e)
      console.error("Raw content:", content)

      // If debug mode is enabled, return the raw content for debugging
      if (debug) {
        return NextResponse.json(
          {
            error: "Invalid JSON from OpenRouter",
            message: e.message,
            rawContent: content,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error: "Invalid JSON from OpenRouter",
          message: e.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error calling OpenRouter:", error)

    // If debug mode is enabled, return more detailed error information
    if (debug) {
      return NextResponse.json(
        {
          error: "Failed to generate pathway with OpenRouter",
          message: error.message,
          stack: error.stack,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to generate pathway with OpenRouter",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

/**
 * Ensure that all Yes/No questions use customer-response nodes with proper branching
 */
function ensureYesNoQuestionsUseCustomerResponse(nodes, edges) {
  // Find all question nodes that are Yes/No questions
  const yesNoQuestionNodes = nodes.filter(
    (node) =>
      (node.type === "question" || node.type.toLowerCase().includes("question")) &&
      node.data &&
      node.data.text &&
      (node.data.text.toLowerCase().includes("are you") ||
        node.data.text.toLowerCase().includes("do you") ||
        node.data.text.toLowerCase().includes("have you") ||
        node.data.text.toLowerCase().includes("would you") ||
        node.data.text.toLowerCase().includes("can you") ||
        node.data.text.toLowerCase().includes("will you") ||
        node.data.text.toLowerCase().includes("is this") ||
        node.data.text.toLowerCase().includes("is that") ||
        node.data.text.toLowerCase().includes("are they") ||
        node.data.text.toLowerCase().includes("did you") ||
        node.data.text.toLowerCase().includes("should") ||
        node.data.text.toLowerCase().includes("could") ||
        node.data.text.toLowerCase().includes("interested") ||
        node.data.text.toLowerCase().includes("want to") ||
        node.data.text.toLowerCase().includes("medicare") ||
        node.data.text.toLowerCase().includes("medicaid") ||
        node.data.text.toLowerCase().includes("insurance") ||
        node.data.text.toLowerCase().includes("coverage") ||
        // Check for question marks in short questions (likely yes/no)
        (node.data.text.includes("?") && node.data.text.length < 100)),
  )

  // Process each Yes/No question node
  for (const questionNode of yesNoQuestionNodes) {
    // Find outgoing edges from this question
    const outgoingEdges = edges.filter((edge) => edge.source === questionNode.id)

    // Skip if there are no outgoing edges
    if (outgoingEdges.length === 0) continue

    // Get target nodes
    const targetNodeIds = outgoingEdges.map((edge) => edge.target)
    const targetNodes = nodes.filter((node) => targetNodeIds.includes(node.id))

    // Check if the next node is already a customer response node
    const nextIsCustomerResponse = targetNodes.some(
      (node) =>
        node.type === "customer-response" ||
        node.type.toLowerCase().includes("customer") ||
        node.type.toLowerCase().includes("user-response"),
    )

    // If the next node is already a customer response node, ensure it has Yes/No options
    if (nextIsCustomerResponse) {
      const customerResponseNode = targetNodes.find(
        (node) =>
          node.type === "customer-response" ||
          node.type.toLowerCase().includes("customer") ||
          node.type.toLowerCase().includes("user-response"),
      )

      if (customerResponseNode) {
        // Ensure the node has options array with Yes/No
        if (!customerResponseNode.data.options || !Array.isArray(customerResponseNode.data.options)) {
          customerResponseNode.data.options = ["Yes", "No"]
        } else if (
          !customerResponseNode.data.options.includes("Yes") ||
          !customerResponseNode.data.options.includes("No")
        ) {
          customerResponseNode.data.options = ["Yes", "No"]
        }

        // Ensure the node has a variableName
        if (!customerResponseNode.data.variableName) {
          // Determine variable name based on question content
          let variableName = "response"

          if (questionNode.data.text.toLowerCase().includes("medicare")) {
            variableName = "medicare_status"
          } else if (questionNode.data.text.toLowerCase().includes("medicaid")) {
            variableName = "medicaid_status"
          } else if (questionNode.data.text.toLowerCase().includes("insurance")) {
            variableName = "insurance_status"
          } else if (questionNode.data.text.toLowerCase().includes("coverage")) {
            variableName = "coverage_status"
          }

          customerResponseNode.data.variableName = variableName
        }

        // Find outgoing edges from the customer response node
        const customerResponseOutgoingEdges = edges.filter((edge) => edge.source === customerResponseNode.id)

        // Check if we have edges for both Yes and No options
        const hasYesEdge = customerResponseOutgoingEdges.some((edge) => edge.label === "Yes")
        const hasNoEdge = customerResponseOutgoingEdges.some((edge) => edge.label === "No")

        // If we're missing the Yes edge, create one to the next node in the flow
        if (!hasYesEdge) {
          // Find the next node in the flow
          const nodeIndex = nodes.findIndex((node) => node.id === customerResponseNode.id)
          if (nodeIndex >= 0 && nodeIndex < nodes.length - 1) {
            const nextNode = nodes[nodeIndex + 1]
            edges.push({
              id: `edge_${customerResponseNode.id}_${nextNode.id}_Yes`,
              source: customerResponseNode.id,
              target: nextNode.id,
              label: "Yes",
            })
          }
        }

        // If we're missing the No edge, create one to an end call node
        if (!hasNoEdge) {
          // Check if we already have an end call node
          let endCallNode = nodes.find(
            (node) =>
              node.type === "end-call" ||
              node.type.toLowerCase().includes("end") ||
              (node.data &&
                node.data.text &&
                (node.data.text.toLowerCase().includes("thank") ||
                  node.data.text.toLowerCase().includes("goodbye") ||
                  node.data.text.toLowerCase().includes("great day"))),
          )

          // If we don't have an end call node, create one
          if (!endCallNode) {
            endCallNode = {
              id: `end_call_${Date.now()}`,
              type: "end-call",
              data: {
                text: "Thank you for your time. Have a great day!",
              },
              position: {
                x: customerResponseNode.position?.x + 200 || 450,
                y: customerResponseNode.position?.y || 300,
              },
            }
            nodes.push(endCallNode)
          }

          // Create an edge from the customer response node to the end call node
          edges.push({
            id: `edge_${customerResponseNode.id}_${endCallNode.id}_No`,
            source: customerResponseNode.id,
            target: endCallNode.id,
            label: "No",
          })
        }
      }
    } else {
      // The next node is not a customer response node, so we need to create one
      // Check if the next node is a response node
      const responseNode = targetNodes.find(
        (node) =>
          node.type === "response" ||
          node.type === "AI Response" ||
          (node.type.toLowerCase().includes("response") && !node.type.toLowerCase().includes("customer")),
      )

      if (responseNode) {
        console.log("Converting response node after Yes/No question to customer response node")

        // Determine variable name based on question content
        let variableName = "response"

        if (questionNode.data.text.toLowerCase().includes("medicare")) {
          variableName = "medicare_status"
        } else if (questionNode.data.text.toLowerCase().includes("medicaid")) {
          variableName = "medicaid_status"
        } else if (questionNode.data.text.toLowerCase().includes("insurance")) {
          variableName = "insurance_status"
        } else if (questionNode.data.text.toLowerCase().includes("coverage")) {
          variableName = "coverage_status"
        }

        // Create a new customer response node
        const customerResponseNode = {
          id: `customer_response_${Date.now()}`,
          type: "customer-response",
          data: {
            text: "Waiting for customer response",
            options: ["Yes", "No"],
            responses: ["Yes", "No"],
            variableName: variableName,
            intentDescription: questionNode.data.text || "Capture customer response",
          },
          position: {
            x: responseNode.position?.x || 250,
            y: responseNode.position?.y || 200,
          },
        }

        // Add the new node
        nodes.push(customerResponseNode)

        // Create an edge from the question to the customer response node
        edges.push({
          id: `edge_${questionNode.id}_${customerResponseNode.id}`,
          source: questionNode.id,
          target: customerResponseNode.id,
        })

        // Find outgoing edges from the response node
        const responseOutgoingEdges = edges.filter((edge) => edge.source === responseNode.id)

        // If there are outgoing edges, connect the Yes option to the first target
        if (responseOutgoingEdges.length > 0) {
          edges.push({
            id: `edge_${customerResponseNode.id}_${responseOutgoingEdges[0].target}_Yes`,
            source: customerResponseNode.id,
            target: responseOutgoingEdges[0].target,
            label: "Yes",
          })
        }

        // Check if we already have an end call node
        let endCallNode = nodes.find(
          (node) =>
            node.type === "end-call" ||
            node.type.toLowerCase().includes("end") ||
            (node.data &&
              node.data.text &&
              (node.data.text.toLowerCase().includes("thank") ||
                node.data.text.toLowerCase().includes("goodbye") ||
                node.data.text.toLowerCase().includes("great day"))),
        )

        // If we don't have an end call node, create one
        if (!endCallNode) {
          endCallNode = {
            id: `end_call_${Date.now()}`,
            type: "end-call",
            data: {
              text: "Thank you for your time. Have a great day!",
            },
            position: {
              x: customerResponseNode.position?.x + 200 || 450,
              y: customerResponseNode.position?.y || 300,
            },
          }
          nodes.push(endCallNode)
        }

        // Create an edge from the customer response node to the end call node
        edges.push({
          id: `edge_${customerResponseNode.id}_${endCallNode.id}_No`,
          source: customerResponseNode.id,
          target: endCallNode.id,
          label: "No",
        })

        // Remove the response node and its edges
        const nodesToRemove = [responseNode.id]

        // Remove edges connected to the nodes we're removing
        const edgesToRemove = edges
          .filter((edge) => nodesToRemove.includes(edge.source) || nodesToRemove.includes(edge.target))
          .map((edge) => edge.id)

        // Update the nodes and edges arrays
        for (let i = nodes.length - 1; i >= 0; i--) {
          if (nodesToRemove.includes(nodes[i].id)) {
            nodes.splice(i, 1)
          }
        }

        for (let i = edges.length - 1; i >= 0; i--) {
          if (edgesToRemove.includes(edges[i].id)) {
            edges.splice(i, 1)
          }
        }
      }
    }
  }
}
