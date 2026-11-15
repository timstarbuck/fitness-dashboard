# Fitness Dashboard Project Plan

## Objective
Build a personal dashboard to visualize fitness data fetched from the Garmin Connect API. The dashboard will provide insights into activity trends, including totals and averages per activity type.

## Key Metrics to Display
- **Overall & Per Activity Type:**
  - Total Distance
  - Total Time (Duration)
  - Heart Rate (Average & Max)
  - Elevation Gain
  - Calories (Estimated/Consumed)
  - Intensity Metrics (Aerobic/Anaerobic Training Effect)

## Proposed Database Schema (PostgreSQL)

### `activities` Table
Stores the core activity data fetched from Garmin.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier for the activity. |
| `garmin_activity_id` | BIGINT (Unique) | The original ID from Garmin. |
| `activity_name` | VARCHAR(255) | Name of the activity. |
| `activity_type` | VARCHAR(50) | e.g., 'running', 'cycling', 'swimming'. |
| `start_time_local` | TIMESTAMP | Local start time. |
| `start_time_gmt` | TIMESTAMP | GMT start time. |
| `end_time_gmt` | TIMESTAMP | GMT end time. |
| `distance` | DOUBLE PRECISION | Total distance (meters). |
| `duration_seconds` | INTEGER | Duration in seconds. |
| `elevation_gain` | DOUBLE PRECISION | Total elevation gain (meters). |
| `elevation_loss` | DOUBLE PRECISION | Total elevation loss (meters). |
| `avg_heart_rate` | INTEGER | Average heart rate. |
| `max_heart_rate` | INTEGER | Maximum heart rate. |
| `calories` | DOUBLE PRECISION | Calories burned. |
| `avg_speed` | DOUBLE PRECISION | Average speed. |
| `max_speed` | DOUBLE PRECISION | Maximum speed. |
| `owner_id` | VARCHAR(255) | Garmin user ID/Display name. |
| `is_favorite` | BOOLEAN | Whether the activity is marked as favorite. |
| `is_pr` | BOOLEAN | Whether it's a Personal Record. |
| `raw_payload` | JSONB | The full Garmin activity payload. |

### `activity_splits` Table
Stores split-level data for detailed analysis (e.g., pace per km).
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier. |
| `activity_id` | UUID (FK) | Reference to the parent activity. |
| `split_number` | INTEGER | Sequence number of the split. |
| `distance` | DOUBLE PRECISION | Distance for this split. |
| `duration_seconds` | INTEGER | Duration for this split. |
| `avg_speed` | DOUBLE PRECISION | Average speed for this split. |

### `sync_locks` Table
Named locks ensuring only one instance of a sync process runs at a time (works across serverless function instances). Stale locks expire via `expires_at` and can be re-claimed.
| Column | Type | Description |
| :--- | :--- | :--- |
| `name` | VARCHAR(100) (PK) | Lock name, e.g. `garmin-activities`. One row per lock. |
| `lock_token` | UUID | Unique token for the current holder; only the holder can release it. |
| `locked_at` | TIMESTAMPTZ | When the lock was (re-)claimed. |
| `expires_at` | TIMESTAMPTZ | When the lock becomes stale and can be re-claimed (locked_at + 10 min). |

## Implementation Roadmap
1. **Phase 1: Data Ingestion**
   - Implement Garmin API client to fetch activities by date range.
   - Create database migration scripts for PostgreSQL schema.
   - Build a worker to sync activities from Garmin to the local DB.
2. **Phase 2: Backend API**
   - Develop endpoints to serve aggregated metrics (totals/averages) by activity type.
3. **Phase 3: Frontend Dashboard**
   - Build a web interface to visualize the data using charts (e.g., Chart.js or Recharts).
