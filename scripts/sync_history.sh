#!/bin/bash

# Create log directory if it doesn't exist
mkdir -p scripts/sync_history_logs

# Set the start date and current date
start_date="2026-11-15"
current_date=$(date +%Y-%m-%d)

# Function to add days to a date (macOS compatible)
date_add_days() {
    local date_str="$1"
    local days_to_add="$2"
    # Convert date to seconds since epoch
    local epoch=$(date -j -f "%Y-%m-%d" "$date_str" +%s)
    # Add days in seconds
    local new_epoch=$((epoch + days_to_add * 24 * 60 * 60))
    # Convert back to date
    date -j -f "%s" "$new_epoch" +"%Y-%m-%d"
}

# Log file with timestamp
log_file="scripts/sync_history_logs/sync_$(date +%Y%m%d_%H%M%S).log"

# Function to fetch data for a date range
fetch_data() {
    local start=$1
    local end=$2
    echo "Fetching data from $start to $end..."
    
    curl -s "http://localhost:3000/api/sync/garmin?token=$CRON_SECRET&startDate=$start&endDate=$end" >> "$log_file" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "Successfully fetched data from $start to $end" >> "$log_file"
    else
        echo "Failed to fetch data from $start to $end" >> "$log_file"
    fi
}

# Main loop - fetch data in 10-day increments
date_range_start=$start_date
while [[ "$date_range_start" < "$current_date" ]]; do
    date_range_end=$(date_add_days "$date_range_start" 10)
    
    # Don't go past the current date
    if [[ "$date_range_end" > "$current_date" ]]; then
        date_range_end=$current_date
    fi
    
    fetch_data "$date_range_start" "$date_range_end"
    
    # Move to the next date range
    date_range_start=$(date_add_days "$date_range_end" 1)
done

echo "Data sync completed. Log saved to $log_file" 