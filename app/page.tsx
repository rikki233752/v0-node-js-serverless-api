import Link from "next/link"
import { ShopifyInstallButton } from "@/components/shopify-install-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="min-h-screen bg-white">
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

          {/* Admin Dashboard Access */}
          <div className="flex justify-center gap-4 mb-8">
            <Link href={`/admin/dashboard${shop ? `?shop=${shop}` : ""}`}>
              <Button className="bg-blue-600 hover:bg-blue-700">Admin Dashboard</Button>
            </Link>
            <Link href={`/test-pixel${shop ? `?shop=${shop}` : ""}`}>
              <Button variant="outline" className="bg-gray-800 hover:bg-gray-700 text-white">
                Test Pixel Tool
              </Button>
            </Link>
          </div>

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
            {!isApiKeySet && (
              <p className="text-sm text-gray-300 mt-2">Installation is disabled until the API key is configured.</p>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Bypass ad blockers and browser restrictions by sending events directly from your server to Facebook's
                Conversions API.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Automatically hash personally identifiable information (PII) using SHA-256 before sending it to Meta's
                Conversions API.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Pixel Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Manage multiple Facebook Pixels for different clients or websites through a single gateway with secure
                credential storage.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>

          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-blue-50 p-6 rounded-full text-blue-600 text-4xl font-bold">1</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Install the App</h3>
                <p className="text-gray-700">
                  Install our app on your Shopify store with just a few clicks. No coding required.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-blue-50 p-6 rounded-full text-blue-600 text-4xl font-bold">2</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Configure Your Pixel</h3>
                <p className="text-gray-700">Enter your Facebook Pixel ID and access token in the app settings.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-blue-50 p-6 rounded-full text-blue-600 text-4xl font-bold">3</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Start Tracking</h3>
                <p className="text-gray-700">
                  Our app automatically tracks all standard Shopify events and sends them to Facebook's Conversions API.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="flex justify-center gap-4">
              <Link href={`/admin/dashboard${shop ? `?shop=${shop}` : ""}`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-lg py-3 px-8">Go to Admin Dashboard</Button>
              </Link>
              <ShopifyInstallButton
                apiKey={apiKey}
                redirectUri={redirectUri}
                scopes={scopes}
                initialShop={shop}
                buttonText="Install Now"
                className="bg-blue-600 hover:bg-blue-700 text-lg py-3 px-8"
                disabled={!isApiKeySet}
              />
            </div>
            {!isApiKeySet && (
              <p className="text-sm text-gray-500 mt-2">Installation is disabled until the API key is configured.</p>
            )}
          </div>
        </div>
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
