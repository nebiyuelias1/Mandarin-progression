import json
import math
from datetime import datetime

import obspython as obs

# File to store the streamed time
TIME_FILE = "/Users/brice/Documents/live_streaming/progress_bar_2025/stream_time.json"

# Variables to track streaming state
is_streaming = False
stream_start_time = None
total_streamed_hours = 0
last_update_time = None  # Add a variable to track the last update time


# Helper function to read time data from file
def load_stream_time():
    global total_streamed_hours
    try:
        with open(TIME_FILE, "r") as f:
            data = json.load(f)
            total_streamed_hours = data.get("currentHours", 0)
    except FileNotFoundError:
        total_streamed_hours = 0


# Helper function to save time data to file
def save_stream_time():
    global total_streamed_hours
    data = {"currentHours": total_streamed_hours}
    with open(TIME_FILE, "w") as f:
        json.dump(data, f, indent=4)


def format_time(total_hours):
    hours = math.floor(total_hours)
    minutes = math.floor((total_hours - hours) * 60)
    seconds = math.floor(((total_hours - hours) * 60 - minutes) * 60)
    return f"{hours}h{minutes}m{seconds}s"


def log_with_timestamp(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    obs.script_log(obs.LOG_INFO, f"[{timestamp}] {message}")


# Function to update the stream time regularly (every minute)
def update_stream_time():
    global total_streamed_hours, last_update_time
    log_with_timestamp("update_stream_time called")  # Log when function is called
    if is_streaming and stream_start_time:
        current_time = datetime.now()
        log_with_timestamp(f"Current time: {current_time}")  # Log current time
        if last_update_time is None:
            last_update_time = stream_start_time
        log_with_timestamp(
            f"Last update time: {last_update_time}"
        )  # Log last update time
        streamed_duration = current_time - last_update_time
        streamed_hours = streamed_duration.total_seconds() / 3600
        log_with_timestamp(
            f"Streamed duration: {streamed_duration}, Streamed hours: {streamed_hours}"
        )  # Log streamed duration and hours
        total_streamed_hours += streamed_hours
        last_update_time = current_time  # Update the last update time
        save_stream_time()  # Save the updated time to the JSON file
        log_with_timestamp(
            f"Stream time updated: {format_time(total_streamed_hours)} / 500h"
        )
    else:
        log_with_timestamp(
            "Streaming not active or start time not set"
        )  # Log if conditions are not met


# Update the event callback where you're logging the stream time:
def on_event(event):
    global is_streaming, stream_start_time, total_streamed_hours, last_update_time

    log_with_timestamp(f"Event detected: {event}")

    if event == obs.OBS_FRONTEND_EVENT_STREAMING_STARTED:
        log_with_timestamp("Detected Streaming Started")
        if not is_streaming:
            is_streaming = True
            stream_start_time = datetime.now()
            last_update_time = None  # Reset the last update time
            obs.timer_add(
                update_stream_time,
                10000,  # Set the timer to call update_stream_time every 10 seconds
            )
            log_with_timestamp("Timer added for update_stream_time")

    elif event == obs.OBS_FRONTEND_EVENT_STREAMING_STOPPED:
        log_with_timestamp("Detected Streaming Stopped")
        if is_streaming:
            is_streaming = False
            obs.timer_remove(
                update_stream_time
            )  # Remove the timer when streaming stops
            update_stream_time()  # Update the stream time one last time
            save_stream_time()  # Save final time to JSON when streaming stops
            log_with_timestamp("Timer removed for update_stream_time")

            # Format and log the total streamed time
            formatted_time = format_time(total_streamed_hours)
            log_with_timestamp(
                f"Streaming stopped! Total streamed: {formatted_time}/{500}h."
            )


# Script defaults (required by OBS)
def script_defaults(settings):
    pass


# Script description (shown in OBS UI)
def script_description():
    return "Tracks streaming time and logs it to a file."


# Script properties (shown in OBS UI)
def script_properties():
    props = obs.obs_properties_create()
    return props


# Called when the script is loaded
def script_load(settings):
    load_stream_time()
    log_with_timestamp("Stream Timer script loaded!")
    obs.obs_frontend_add_event_callback(on_event)
    log_with_timestamp("Event callback added")
