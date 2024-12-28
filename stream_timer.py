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


# Function to update the stream time regularly (every minute)
def update_stream_time():
    global total_streamed_hours
    if is_streaming and stream_start_time:
        current_time = datetime.now()
        streamed_duration = current_time - stream_start_time
        streamed_hours = streamed_duration.total_seconds() / 3600
        total_streamed_hours += streamed_hours
        save_stream_time()  # Save the updated time to the JSON file
        obs.script_log(
            obs.LOG_INFO,
            f"Stream time updated: {format_time(total_streamed_hours)} / 500h",
        )


# Update the event callback where you're logging the stream time:
def on_event(event):
    global is_streaming, stream_start_time, total_streamed_hours

    obs.script_log(obs.LOG_INFO, f"Event detected: {event}")

    if event == obs.OBS_FRONTEND_EVENT_STREAMING_STARTED:
        obs.script_log(obs.LOG_INFO, "Detected Streaming Started")
        if not is_streaming:
            is_streaming = True
            stream_start_time = datetime.now()
            obs.timer_add(
                update_stream_time,
                10000,  # Set the timer to call update_stream_time every 10 seconds
            )

    elif event == obs.OBS_FRONTEND_EVENT_STREAMING_STOPPED:
        obs.script_log(obs.LOG_INFO, "Detected Streaming Stopped")
        if is_streaming:
            is_streaming = False
            obs.timer_remove(
                update_stream_time
            )  # Remove the timer when streaming stops
            save_stream_time()  # Save final time to JSON when streaming stops

            # Format and log the total streamed time
            formatted_time = format_time(total_streamed_hours)
            obs.script_log(
                obs.LOG_INFO,
                f"Streaming stopped! Total streamed: {formatted_time}/{500}h.",
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
    obs.script_log(obs.LOG_INFO, "Stream Timer script loaded!")
    obs.obs_frontend_add_event_callback(on_event)
