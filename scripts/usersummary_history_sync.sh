#!/bin/bash
# User Daily Summary History Sync Script
# This script syncs historical user daily summary data from Garmin for a specified date range.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRON_SECRET="${CRON_SECRET:-}"
START_DATE="${1:-}"
END_DATE="${2:-}"

# Validate required environment variables
if [[ -z "$CRON_SECRET" ]]; then
  echo "Error: CRON_SECRET environment variable is required." >&2
  exit 1
fi

# Validate date parameters
if [[ -n "$START_DATE" && ! "$START_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Error: Invalid start date format. Expected YYYY-MM-DD." >&2
  exit 1
fi

if [[ -n "$END_DATE" && ! "$END_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Error: Invalid end date format. Expected YYYY-MM-DD." >&2
  exit 1
fi

# Build query parameters
QUERY_PARAMS=""
if [[ -n "$START_DATE" ]]; then
  QUERY_PARAMS="${QUERY_PARAMS}startDate=${START_DATE}&"
fi
if [[ -n "$END_DATE" ]]; then
  QUERY_PARAMS="${QUERY_PARAMS}endDate=${END_DATE}&"
fi

# Remove trailing & if present
QUERY_PARAMS="${QUERY_PARAMS%&}"

# Add syncType=usersummary to the query parameters (fetch only this type)
if [[ -n "$QUERY_PARAMS" ]]; then
  QUERY_PARAMS="${QUERY_PARAMS}&syncType=usersummary"
else
  QUERY_PARAMS="syncType=usersummary"
fi

# Determine API endpoint
if [[ -z "$QUERY_PARAMS" ]]; then
  API_ENDPOINT="/api/sync/garmin"
else
  API_ENDPOINT="/api/sync/garmin?${QUERY_PARAMS}"
fi

# Check if we're running in a Vercel environment or locally
deploy_url() {
  if [[ -f "$PROJECT_ROOT/vercel.json" ]]; then
    # Production deployment
    echo "http://localhost:3000"
  else
    # Local development server
    echo "http://localhost:3000"
  fi
}

URL="$(deploy_url)$API_ENDPOINT"
echo "Syncing user daily summary data from $URL"

# Make the API request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$URL")

HTTP_CODE=$(tail -n1 <<< "$RESPONSE")
BODY=$(sed '$ d' <<< "$RESPONSE")

# Output the response
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"

# Check for success
if [[ "$HTTP_CODE" =~ ^2[0-9]{2}$ ]]; then
  echo "User daily summary sync completed successfully"
  exit 0
else
  echo "Error: User daily summary sync failed with status $HTTP_CODE" >&2
  exit 1
fi
