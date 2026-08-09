CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "health_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"disease" varchar(100),
	"severity" "alert_severity" DEFAULT 'medium' NOT NULL,
	"city" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "managed_by" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_managed_by_users_id_fk" FOREIGN KEY ("managed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;