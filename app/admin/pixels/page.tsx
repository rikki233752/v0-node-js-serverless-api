"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PixelConfig {
  pixelId: string
  accessToken: string
  name?: string
  clientId?: string
}

interface EventLog {
  id: string
  pixelId: string
  eventName: string
  status: string
  response?: string
  error?: string
  createdAt: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

export default function PixelAdmin() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  // Pixel state
  const [pixels, setPixels] = useState<PixelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newPixel, setNewPixel] = useState<Partial<PixelConfig>>({
    name: "",
    pixelId: "",
    accessToken: "",
    clientId: "",
  })

  // Logs state
  const [logs, setLogs] = useState<EventLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [selectedPixelId, setSelectedPixelId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 100,
    pages: 0,
  })

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Create basic auth header
    const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64")

    try {
      const response = await fetch("/api/admin/pixels", {
        headers: {
          Authorization: authHeader,
        },
      })

      if (response.ok) {
        setIsAuthenticated(true)
        // Store auth header in session storage
        sessionStorage.setItem("authHeader", authHeader)
        fetchPixels()
      } else {
        setError("Invalid credentials")
      }
    } catch (err) {
      setError("Login failed")
      console.error(err)
    }
  }

  // Check for existing auth on load
  useEffect(() => {
    const authHeader = sessionStorage.getItem("authHeader")
    if (authHeader) {
      setIsAuthenticated(true)
      fetchPixels()
    }
  }, [])

  // Fetch pixels
  const fetchPixels = async () => {
    try {
      setLoading(true)
      const authHeader = sessionStorage.getItem("authHeader")

      const response = await fetch("/api/admin/pixels", {
        headers: {
          Authorization: authHeader || "",
        },
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        setPixels(data.pixels)
        setError(null)
      } else {
        setError(data.error || "Failed to fetch pixel configurations")
      }
    } catch (err) {
      setError("An error occurred while fetching pixel configurations")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch logs
  const fetchLogs = async (pixelId?: string, page = 1) => {
    try {
      setLogsLoading(true)
      const authHeader = sessionStorage.getItem("authHeader")

      let url = `/api/admin/logs?page=${page}&limit=100`
      if (pixelId) {
        url += `&pixelId=${pixelId}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: authHeader || "",
        },
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setPagination(data.pagination)
        setLogsError(null)
      } else {
        setLogsError(data.error || "Failed to fetch event logs")
      }
    } catch (err) {
      setLogsError("An error occurred while fetching event logs")
      console.error(err)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewPixel((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddPixel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPixel.pixelId || !newPixel.accessToken) {
      setError("Pixel ID and Access Token are required")
      return
    }

    try {
      const authHeader = sessionStorage.getItem("authHeader")

      const response = await fetch("/api/admin/pixels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || "",
        },
        body: JSON.stringify(newPixel),
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        // Reset form and refresh list
        setNewPixel({
          name: "",
          pixelId: "",
          accessToken: "",
          clientId: "",
        })
        fetchPixels()
      } else {
        setError(data.error || "Failed to add pixel configuration")
      }
    } catch (err) {
      setError("An error occurred while adding the pixel configuration")
      console.error(err)
    }
  }

  const handleDeletePixel = async (pixelId: string) => {
    if (!confirm("Are you sure you want to delete this pixel configuration?")) {
      return
    }

    try {
      const authHeader = sessionStorage.getItem("authHeader")

      const response = await fetch(`/api/admin/pixels?pixelId=${pixelId}`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader || "",
        },
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        fetchPixels()
      } else {
        setError(data.error || "Failed to delete pixel configuration")
      }
    } catch (err) {
      setError("An error occurred while deleting the pixel configuration")
      console.error(err)
    }
  }

  const handleViewLogs = (pixelId: string) => {
    setSelectedPixelId(pixelId)
    fetchLogs(pixelId)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem("authHeader")
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Facebook Pixel Gateway Admin</h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <Tabs defaultValue="pixels">
        <TabsList className="mb-4">
          <TabsTrigger value="pixels">Pixel Configurations</TabsTrigger>
          <TabsTrigger value="logs">Event Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="pixels">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Pixel</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddPixel} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newPixel.name || ""}
                      onChange={handleInputChange}
                      placeholder="Client A - Main Pixel"
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientId">Client ID (Optional)</Label>
                    <Input
                      id="clientId"
                      name="clientId"
                      value={newPixel.clientId || ""}
                      onChange={handleInputChange}
                      placeholder="client-a"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pixelId">Pixel ID *</Label>
                    <Input
                      id="pixelId"
                      name="pixelId"
                      value={newPixel.pixelId || ""}
                      onChange={handleInputChange}
                      placeholder="123456789012345"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      name="accessToken"
                      value={newPixel.accessToken || ""}
                      onChange={handleInputChange}
                      placeholder="EAABsbCc1234567890..."
                      required
                      type="password"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Add Pixel
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configured Pixels</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Loading pixel configurations...</p>
                ) : pixels.length === 0 ? (
                  <p>No pixel configurations found. Add one to get started.</p>
                ) : (
                  <div className="space-y-4">
                    {pixels.map((pixel) => (
                      <div key={pixel.pixelId} className="border p-4 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{pixel.name || `Pixel ${pixel.pixelId}`}</h3>
                            <p className="text-sm text-gray-500">ID: {pixel.pixelId}</p>
                            {pixel.clientId && <p className="text-sm text-gray-500">Client: {pixel.clientId}</p>}
                            <p className="text-sm text-gray-500">Token: {pixel.accessToken}</p>
                          </div>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleViewLogs(pixel.pixelId)}
                            >
                              View Logs
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => handleDeletePixel(pixel.pixelId)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Event Logs
                  {selectedPixelId && ` for Pixel ${selectedPixelId}`}
                </CardTitle>
                <div className="flex gap-2">
                  {selectedPixelId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPixelId(null)
                        fetchLogs()
                      }}
                    >
                      Show All Pixels
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fetchLogs(selectedPixelId || undefined)}>
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p>Loading event logs...</p>
              ) : logsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{logsError}</AlertDescription>
                </Alert>
              ) : logs.length === 0 ? (
                <p>No event logs found.</p>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left">Time</th>
                          <th className="border p-2 text-left">Pixel ID</th>
                          <th className="border p-2 text-left">Event</th>
                          <th className="border p-2 text-left">Status</th>
                          <th className="border p-2 text-left">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className={log.status === "error" ? "bg-red-50" : ""}>
                            <td className="border p-2">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="border p-2">{log.pixelId}</td>
                            <td className="border p-2">{log.eventName}</td>
                            <td className="border p-2">
                              <span className={log.status === "success" ? "text-green-600" : "text-red-600"}>
                                {log.status}
                              </span>
                            </td>
                            <td className="border p-2">
                              {log.error ? (
                                <details>
                                  <summary className="cursor-pointer">Error</summary>
                                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                                    {log.error}
                                  </pre>
                                </details>
                              ) : log.response ? (
                                <details>
                                  <summary className="cursor-pointer">Response</summary>
                                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                                    {log.response}
                                  </pre>
                                </details>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        Showing page {pagination.page} of {pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1}
                          onClick={() => fetchLogs(selectedPixelId || undefined, pagination.page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.pages}
                          onClick={() => fetchLogs(selectedPixelId || undefined, pagination.page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
