CREATE TABLE "sync_locks" (
	"name" varchar(100) PRIMARY KEY NOT NULL,
	"lock_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"locked_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
