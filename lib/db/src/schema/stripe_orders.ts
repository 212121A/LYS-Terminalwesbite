import {
  jsonb,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Abgeschlossene Stripe Checkout Sessions (Webhook checkout.session.completed). */
export const stripeOrders = pgTable("stripe_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountTotal: integer("amount_total"),
  currency: text("currency"),
  paymentStatus: text("payment_status"),
  customerEmail: text("customer_email"),
  metadata: jsonb("metadata").$type<Record<string, string> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
