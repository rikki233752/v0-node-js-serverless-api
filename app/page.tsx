import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, ShoppingBag, Globe, Zap, Lock, BarChart3, Settings } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">Facebook Pixel Gateway</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track Facebook Pixel events through our secure gateway for enhanced privacy and control
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="border-2 hover:border-blue-500 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-500" />
                Shopify Store
              </CardTitle>
              <CardDescription>Install our app on your Shopify store</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>One-click installation through Shopify</span>
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Track all standard Shopify events automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <Settings className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Configure your pixel ID during installation</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/setup/shopify" className="w-full">
                <Button className="w-full">
                  Install on Shopify
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Any Website
              </CardTitle>
              <CardDescription>Add our tracking script to any website</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Lock className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Enhanced privacy with server-side tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Works with any website platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Track standard and custom events</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/setup/website" className="w-full">
                <Button className="w-full">
                  Set Up For Website
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Already installed?</h2>
          <div className="flex flex-wrap justify-center gap-4">
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
