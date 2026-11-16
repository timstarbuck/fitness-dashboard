CREATE TABLE "hrv_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_date" varchar(10) NOT NULL,
	"weekly_avg" double precision,
	"last_night_avg" double precision,
	"last_night_5min_high" double precision,
	"baseline_low_upper" double precision,
	"baseline_balanced_low" double precision,
	"baseline_balanced_upper" double precision,
	"baseline_marker_value" double precision,
	"status" varchar(50),
	"feedback_phrase" varchar(255),
	"create_timestamp" timestamp,
	"start_timestamp_gmt" timestamp,
	"end_timestamp_gmt" timestamp,
	"start_timestamp_local" timestamp,
	"end_timestamp_local" timestamp,
	"sleep_start_timestamp_gmt" timestamp,
	"sleep_end_timestamp_gmt" timestamp,
	"sleep_start_timestamp_local" timestamp,
	"sleep_end_timestamp_local" timestamp,
	"owner_id" varchar(255) NOT NULL,
	"raw_payload" jsonb,
	CONSTRAINT "hrv_data_calendar_date_unique" UNIQUE("calendar_date")
);
--> statement-breakpoint
CREATE TABLE "hrv_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hrv_data_id" uuid NOT NULL,
	"hrv_value" double precision NOT NULL,
	"reading_time_gmt" timestamp NOT NULL,
	"reading_time_local" timestamp
);
--> statement-breakpoint
ALTER TABLE "hrv_readings" ADD CONSTRAINT "hrv_readings_hrv_data_id_hrv_data_id_fk" FOREIGN KEY ("hrv_data_id") REFERENCES "public"."hrv_data"("id") ON DELETE cascade ON UPDATE no action;