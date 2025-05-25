import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Globe, ArrowRight, Zap, Lock, BarChart } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Facebook Pixel Gateway
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Server-side tracking for enhanced privacy and improved conversion accuracy
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 border-blue-100 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-2xl">Shopify Store</CardTitle>
                  <CardDescription>Install on your Shopify store</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Zap className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>One-click installation through Shopify App Store</span>
                </li>
                <li className="flex items-start">
                  <Lock className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Secure server-side tracking compliant with iOS 14+</span>
                </li>
                <li className="flex items-start">
                  <BarChart className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Track all standard Shopify events automatically</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/setup/shopify" className="w-full">
                <Button className="w-full" size="lg">
                  Install on Shopify
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-2 border-green-100 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle className="text-2xl">Any Website</CardTitle>
                  <CardDescription>Install on any website platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Zap className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Simple JavaScript snippet for any website platform</span>
                </li>
                <li className="flex items-start">
                  <Lock className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Server-side event processing for improved accuracy</span>
                </li>
                <li className="flex items-start">
                  <BarChart className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Works with WordPress, Wix, Squarespace, and more</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/setup/website" className="w-full">
                <Button className="w-full" variant="outline" size="lg">
                  Install on Website
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Already installed?</h2>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline">Admin Dashboard</Button>
            </Link>
            <Link href="/customer/setup">
              <Button variant="outline">Customer Setup</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
