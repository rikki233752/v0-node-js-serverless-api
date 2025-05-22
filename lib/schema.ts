import { pgTable, text, timestamp, uuid, boolean, json, unique, integer } from "drizzle-orm/pg-core"

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  company: text("company"),
  role: text("role").notNull().default("user"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
})

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Team members table
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").notNull().default("editor"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      uniqueMember: unique().on(table.teamId, table.userId),
    }
  },
)

// Pathways table
export const pathways = pgTable("pathways", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  teamId: uuid("team_id").references(() => teams.id),
  creatorId: uuid("creator_id")
    .references(() => users.id)
    .notNull(),
  updaterId: uuid("updater_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  data: json("data").notNull(),
  blandId: text("bland_id").unique(),
})

// Phone numbers table
export const phoneNumbers = pgTable("phone_numbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  teamId: uuid("team_id").references(() => teams.id),
  number: text("number").notNull().unique(),
  location: text("location"),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  monthlyFee: integer("monthly_fee").notNull().default(0),
  assignedTo: text("assigned_to"),
})

// Calls table
export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  pathwayId: uuid("pathway_id").references(() => pathways.id),
  pathwayName: text("pathway_name"),
  status: text("status").notNull(),
  duration: integer("duration").notNull().default(0),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  userId: uuid("user_id").references(() => users.id),
  teamId: uuid("team_id").references(() => teams.id),
  blandCallId: text("bland_call_id").unique(),
  recording: text("recording_url"),
})

// Call analytics table
export const callAnalytics = pgTable("call_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .references(() => calls.id, { onDelete: "cascade" })
    .notNull(),
  transcript: text("transcript"),
  summary: text("summary"),
  sentiment: text("sentiment"),
  keywords: json("keywords"),
  intent: text("intent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Activities table
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  pathwayId: uuid("pathway_id").references(() => pathways.id),
  teamId: uuid("team_id").references(() => teams.id),
  action: text("action").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Invitations table
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull().default("editor"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  accepted: boolean("accepted").notNull().default(false),
})

// Billing table
export const billingRecords = pgTable("billing_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  teamId: uuid("team_id").references(() => teams.id),
  type: text("type").notNull(), // subscription, phone_number, usage, etc.
  amount: integer("amount").notNull(),
  status: text("status").notNull(), // paid, pending, failed
  description: text("description").notNull(),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
})

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  teamId: uuid("team_id").references(() => teams.id),
  plan: text("plan").notNull(),
  status: text("status").notNull(), // active, canceled, past_due
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  renewalDate: timestamp("renewal_date"),
  paymentMethod: text("payment_method"),
  amount: integer("amount").notNull(),
  interval: text("interval").notNull(), // monthly, yearly
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // credit_card, paypal
  isDefault: boolean("is_default").notNull().default(false),
  lastFour: text("last_four"),
  expiryDate: text("expiry_date"),
  brand: text("brand"),
  paypalEmail: text("paypal_email"),
  token: text("token"), // Payment processor token
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
