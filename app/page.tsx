import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Code, Zap, Shield } from "lucide-react"

export default function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get UTM parameters for pixel ID
  const utmPixelId = typeof searchParams.utm_pixel_id === "string" ? searchParams.utm_pixel_id : null
  const pixelId = typeof searchParams.pixel_id === "string" ? searchParams.pixel_id : utmPixelId

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Facebook Pixel Server-Side Gateway</h1>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Send events to Facebook Conversions API securely, bypass ad blockers, and protect user data
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href={`/setup/shopify${pixelId ? `?pixel_id=${pixelId}` : ""}`}>
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Install on Shopify
              </Button>
            </Link>
            <Link href={`/setup/website${pixelId ? `?pixel_id=${pixelId}` : ""}`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Code className="mr-2 h-5 w-5" />
                Install on Any Website
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Shopify Installation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
                <CardTitle>Shopify Installation</CardTitle>
              </div>
              <CardDescription>For Shopify store owners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Automatic event tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>No code modifications needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Web Pixel integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Server-side tracking</span>
                </li>
              </ul>
              <Link href={`/setup/shopify${pixelId ? `?pixel_id=${pixelId}` : ""}`}>
                <Button className="w-full">Get Started with Shopify</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Website Installation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-6 w-6 text-green-600" />
                <CardTitle>Website Installation</CardTitle>
              </div>
              <CardDescription>For any website or platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Works with any website</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Simple script installation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Custom event tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Full API access</span>
                </li>
              </ul>
              <Link href={`/setup/website${pixelId ? `?pixel_id=${pixelId}` : ""}`}>
                <Button className="w-full" variant="outline">
                  Get Started with Any Website
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Use Our Gateway?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Bypass Ad Blockers</h3>
              <p className="text-sm text-gray-600">Server-side tracking ensures your events are always captured</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Privacy Compliant</h3>
              <p className="text-sm text-gray-600">Automatic PII hashing for GDPR and CCPA compliance</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Code className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Easy Integration</h3>
              <p className="text-sm text-gray-600">Simple setup for both Shopify and custom websites</p>
            </div>
          </div>
        </div>

        {/* Admin Tools */}
        <Card className="max-w-md mx-auto mt-16">
          <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
            <CardDescription>Manage your pixel configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/login?redirect=/admin/dashboard" className="block">
              <Button className="w-full">Admin Dashboard</Button>
            </Link>
            <Link href="/login?redirect=/admin/pixels" className="block">
              <Button variant="outline" className="w-full">
                Pixel Management
              </Button>
            </Link>
            <Link href="/integration-guide" className="block">
              <Button variant="secondary" className="w-full">
                Integration Guide
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-bold">Facebook Pixel Gateway</h2>
              <p className="mt-2 text-gray-400">© {new Date().getFullYear()} All rights reserved.</p>
            </div>
            <div className="flex gap-8">
              <Link href="/privacy-policy" className="text-gray-400 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="text-gray-400 hover:text-white">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
