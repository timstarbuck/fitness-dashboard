CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garmin_activity_id" bigint NOT NULL,
	"activity_name" varchar(255) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"start_time_local" timestamp NOT NULL,
	"start_time_gmt" timestamp NOT NULL,
	"end_time_gmt" timestamp NOT NULL,
	"distance" double precision NOT NULL,
	"duration_seconds" integer NOT NULL,
	"elevation_gain" double precision,
	"elevation_loss" double precision,
	"avg_heart_rate" integer,
	"max_heart_rate" integer,
	"calories" double precision,
	"avg_speed" double precision,
	"max_speed" double precision,
	"owner_id" varchar(255) NOT NULL,
	"is_favorite" boolean DEFAULT false,
	"is_pr" boolean DEFAULT false,
	CONSTRAINT "activities_garmin_activity_id_unique" UNIQUE("garmin_activity_id")
);
--> statement-breakpoint
CREATE TABLE "activity_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"split_number" integer NOT NULL,
	"distance" double precision NOT NULL,
	"duration_seconds" integer NOT NULL,
	"avg_speed" double precision
);
--> statement-breakpoint
ALTER TABLE "activity_splits" ADD CONSTRAINT "activity_splits_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;