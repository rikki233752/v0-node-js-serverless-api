import Link from "next/link"
import { ShopifyInstallButton } from "@/components/shopify-install-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get environment variables
  const apiKey = process.env.SHOPIFY_API_KEY || ""
  const host = process.env.HOST || ""
  const scopes = process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events"
  const redirectUri = `${host}/api/auth/callback`

  // Get shop from query params (if available)
  const shop = typeof searchParams.shop === "string" ? searchParams.shop : null

  // Check if API key is set
  const isApiKeySet = !!apiKey

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Facebook Pixel Server-Side Gateway</h1>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Send events to Facebook Conversions API securely, bypass ad blockers, and protect user data
          </p>

          {/* API Key Warning */}
          {!isApiKeySet && (
            <Alert variant="destructive" className="max-w-md mx-auto mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing API Key</AlertTitle>
              <AlertDescription>
                The Shopify API key is not set. Please add the SHOPIFY_API_KEY environment variable.
              </AlertDescription>
            </Alert>
          )}

          {/* Install Button */}
          <div className="max-w-md mx-auto mt-8">
            <ShopifyInstallButton
              apiKey={apiKey}
              redirectUri={redirectUri}
              scopes={scopes}
              initialShop={shop}
              buttonText="Install on Shopify"
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
              disabled={!isApiKeySet}
            />
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <p>
                  <strong>Debug Info:</strong>
                </p>
                <p>API Key: {apiKey ? "Set" : "Missing"}</p>
                <p>Host: {host}</p>
                <p>Redirect URI: {redirectUri}</p>
              </div>
            )}
            {!isApiKeySet && (
              <p className="text-sm text-gray-300 mt-2">Installation is disabled until the API key is configured.</p>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 flex flex-col items-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Facebook Pixel Gateway</CardTitle>
            <CardDescription>Admin tools and utilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Admin Tools</h2>
              <div className="space-y-2">
                <Link href="/login?redirect=/admin/dashboard" className="block">
                  <Button className="w-full">Admin Dashboard</Button>
                </Link>
                <Link href="/login?redirect=/test-pixel" className="block">
                  <Button variant="outline" className="w-full">
                    Test Pixel Tool
                  </Button>
                </Link>
                <Link href="/login?redirect=/admin/pixels" className="block">
                  <Button variant="outline" className="w-full">
                    Pixel Management
                  </Button>
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h2 className="text-lg font-semibold mb-2">Documentation</h2>
              <div className="space-y-2">
                <Link href="/integration-guide" className="block">
                  <Button variant="secondary" className="w-full">
                    Integration Guide
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>

          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-2">What is server-side tracking?</h3>
              <p className="text-gray-700">
                Server-side tracking sends events from your server to Facebook instead of from the user's browser. This
                bypasses ad blockers and provides more reliable tracking.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Do I need to modify my Shopify theme?</h3>
              <p className="text-gray-700">
                No, our app works without any theme modifications. It automatically tracks all standard Shopify events.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">How do I get a Facebook Pixel ID and access token?</h3>
              <p className="text-gray-700">
                You can create a Facebook Pixel in your Meta Business Manager. The access token can be generated in the
                Events Manager under the Conversions API section.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Is this compliant with privacy regulations?</h3>
              <p className="text-gray-700">
                Yes, our app automatically hashes all personally identifiable information (PII) before sending it to
                Facebook, helping you comply with privacy regulations like GDPR and CCPA.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
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
