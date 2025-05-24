import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateAdmin } from "@/lib/db-auth"
