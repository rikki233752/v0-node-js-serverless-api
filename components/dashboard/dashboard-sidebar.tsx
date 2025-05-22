"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  FileText,
  Home,
  Menu,
  PhoneCall,
  Settings,
  Users,
  Phone,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Pathway", href: "/dashboard/pathway", icon: FileText },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Call History", href: "/dashboard/call-history", icon: PhoneCall },
  { name: "Phone Numbers", href: "/dashboard/phone-numbers", icon: Phone },
  { name: "Team", href: "/dashboard/teams", icon: Users },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Check if the screen is mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <>
      {/* Mobile overlay when sidebar is open */}
      {!collapsed && isMobile && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setCollapsed(true)} />
      )}

      <motion.div
        className={`fixed md:relative flex flex-col border-r bg-white shadow-lg z-50 h-full transition-all duration-300 ease-in-out`}
        animate={{
          width: collapsed ? (isMobile ? "0" : "5rem") : "16rem",
          x: collapsed && isMobile ? "-100%" : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
              >
                <span className="text-xl font-bold">Bland.ai</span>
              </motion.div>
            )}
          </AnimatePresence>

          {collapsed && !isMobile && (
            <div className="flex justify-center w-full">
              <span className="text-xl font-bold">B</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={`rounded-full hover:bg-gray-100 ${collapsed && isMobile ? "absolute right-0 translate-x-full mt-2" : ""}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          <nav className="space-y-1 px-2">
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/dashboard/"
                  : pathname.startsWith(link.href + "/") || pathname === link.href

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <link.icon className={`h-5 w-5 ${collapsed ? "" : "mr-3"} ${isActive ? "text-primary" : ""}`} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {link.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t p-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs font-medium text-gray-500">Storage</p>
                  <div className="mt-2">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div className="h-2 w-2/3 rounded-full bg-primary"></div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    <span className="font-medium">65%</span> of 10GB used
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {collapsed && (
              <div className="flex justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-primary animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Toggle button for mobile that's always visible */}
      {isMobile && collapsed && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 rounded-full shadow-md bg-white"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </>
  )
}
