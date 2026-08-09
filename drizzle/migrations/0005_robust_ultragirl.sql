CREATE TYPE "public"."triage_severity" AS ENUM('critical', 'urgent', 'standard', 'low');--> statement-breakpoint
CREATE TYPE "public"."lab_order_status" AS ENUM('ordered', 'completed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'nurse';--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'walk_in';--> statement-breakpoint
CREATE TABLE "triage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"nurse_user_id" uuid NOT NULL,
	"severity" "triage_severity" DEFAULT 'standard' NOT NULL,
	"chief_complaint" text,
	"vitals_bp" varchar(20),
	"vitals_temp" varchar(10),
	"vitals_weight" varchar(10),
	"vitals_pulse" varchar(10),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"instructions" text,
	"status" "lab_order_status" DEFAULT 'ordered' NOT NULL,
	"result" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "is_walk_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_nurse_user_id_users_id_fk" FOREIGN KEY ("nurse_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;