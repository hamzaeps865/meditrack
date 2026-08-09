CREATE TYPE "public"."medicine_form" AS ENUM('tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'other');--> statement-breakpoint
CREATE TABLE "dispensings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_item_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"inventory_batch_id" uuid NOT NULL,
	"quantity_dispensed" integer DEFAULT 0 NOT NULL,
	"dispensed_by" uuid NOT NULL,
	"dispensed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "dispensings_prescription_item_id_unique" UNIQUE("prescription_item_id")
);
--> statement-breakpoint
CREATE TABLE "medicine_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"quantity_in_stock" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 50 NOT NULL,
	"expiry_date" date,
	"cost_price_cents" integer DEFAULT 0 NOT NULL,
	"received_at" date,
	"supplier" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"generic_name" varchar(255),
	"category" varchar(100),
	"form" "medicine_form",
	"strength" varchar(50),
	"manufacturer" varchar(255),
	"description" text,
	"reorder_level" integer DEFAULT 50 NOT NULL,
	"unit_price_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "medicine_id" uuid;--> statement-breakpoint
ALTER TABLE "dispensings" ADD CONSTRAINT "dispensings_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensings" ADD CONSTRAINT "dispensings_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensings" ADD CONSTRAINT "dispensings_inventory_batch_id_medicine_inventory_id_fk" FOREIGN KEY ("inventory_batch_id") REFERENCES "public"."medicine_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensings" ADD CONSTRAINT "dispensings_dispensed_by_users_id_fk" FOREIGN KEY ("dispensed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_inventory" ADD CONSTRAINT "medicine_inventory_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;