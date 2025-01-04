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
last_update_time = None
previous_total = 0  # Add this to track previous total


# Helper function to read time data from file
def load_stream_time():
    global total_streamed_hours, previous_total
    try:
        with open(TIME_FILE, "r") as f:
            data = json.load(f)
            total_streamed_hours = data.get("currentHours", 0)
            previous_total = total_streamed_hours 
    except FileNotFoundError:
        # shrow error if file not found
        log_with_timestamp(f"File not found: {TIME_FILE}")
        


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


# Function to update the stream time regularly
def update_stream_time():
    global total_streamed_hours
    log_with_timestamp("update_stream_time called")
    if is_streaming and stream_start_time:
        current_time = datetime.now()
        # Calculate time since stream started for this session
        streamed_duration = current_time - stream_start_time
        current_session_hours = streamed_duration.total_seconds() / 3600

        # Add current session to previous total
        total_streamed_hours = previous_total + current_session_hours

        log_with_timestamp(f"Previous total: {format_time(previous_total)}")
        log_with_timestamp(f"Session duration: {streamed_duration}")
        log_with_timestamp(f"Total time: {format_time(total_streamed_hours)}")

        save_stream_time()
    else:
        log_with_timestamp("Streaming not active or start time not set")
    return True


# Update the event callback where you're logging the stream time:
def on_event(event):
    global is_streaming, stream_start_time, total_streamed_hours, last_update_time

    # Map event numbers to names for better logging
    event_names = {
        obs.OBS_FRONTEND_EVENT_STREAMING_STARTING: "STREAMING_STARTING",
        obs.OBS_FRONTEND_EVENT_STREAMING_STARTED: "STREAMING_STARTED",
        obs.OBS_FRONTEND_EVENT_STREAMING_STOPPING: "STREAMING_STOPPING",
        obs.OBS_FRONTEND_EVENT_STREAMING_STOPPED: "STREAMING_STOPPED",
    }
    event_name = event_names.get(event, str(event))
    log_with_timestamp(f"Event detected: {event_name} ({event})")

    if event == obs.OBS_FRONTEND_EVENT_STREAMING_STARTED:
        log_with_timestamp("Detected Streaming Started")
        if not is_streaming:
            is_streaming = True
            stream_start_time = datetime.now()
            last_update_time = None
            # Try different timer approach
            try:
                obs.timer_remove(update_stream_time)  # Remove any existing timer
            except Exception as e:
                log_with_timestamp(f"Error removing timer: {e}")
            obs.timer_add(
                update_stream_time, 10000
            )  # Add a new timer to call update_stream_time every 10 seconds
            log_with_timestamp("Timer added for update_stream_time every 10 seconds")

    elif event == obs.OBS_FRONTEND_EVENT_STREAMING_STOPPED:
        log_with_timestamp("Detected Streaming Stopped")
        if is_streaming:
            # First remove the timer
            obs.timer_remove(update_stream_time)
            log_with_timestamp("Timer removed as streaming stopped")

            # Then do the final update while streaming is still active
            update_stream_time()  # Update the stream time one last time
            save_stream_time()  # Save final time to JSON

            # Format and log the final time while streaming is still active
            formatted_time = format_time(total_streamed_hours)
            log_with_timestamp(
                f"Streaming stopped! Total streamed: {formatted_time}/{500}h."
            )

            # Finally, update the streaming state
            is_streaming = False
            stream_start_time = None


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
    # Try adding timer on script load
    timer_result = obs.timer_add(update_stream_time, 10000)
    log_with_timestamp(f"Initial timer add result: {timer_result}")
