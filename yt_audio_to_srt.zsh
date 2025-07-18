stop_requested=0

trap 'echo "🛑 Stop requested. Will exit after current file."; stop_requested=1' SIGINT

while read -r url; do
  if [[ $stop_requested -eq 1 ]]; then
    echo "Exiting as requested."
    break
  fi
  # Get a safe version of the video title for filenames
  title=$(yt-dlp --get-title "$url" | tr -cd '[:alnum:] _-')
  if [[ -z "$title" ]]; then
    echo "❌ Failed to get title for $url"
    continue
  fi

  # Download audio only as mp3
  yt-dlp -x --audio-format mp3 -o "${title}.%(ext)s" "$url"
  if [[ $? -ne 0 ]]; then
    echo "❌ Failed to download audio for $title"
    continue
  fi

  # Ensure the mp3 file exists and is not empty
  if [[ ! -s "${title}.mp3" ]]; then
    echo "❌ Audio file ${title}.mp3 missing or empty"
    continue
  fi

  # Transcribe to SRT using Whisper (force Chinese language)
  whisper "${title}.mp3" --language zh --task transcribe --output_format srt --model small
  if [[ $? -ne 0 ]]; then
    echo "❌ Failed to transcribe ${title}.mp3"
    rm -f "${title}.mp3"
    continue
  fi

  # Optional: Convert Simplified to Traditional Chinese
  if [[ -f "${title}.srt" ]]; then
    opencc --config s2t.json -i "${title}.srt" -o "${title}_trad.srt"
    if [[ $? -ne 0 ]]; then
      echo "❌ Failed to convert ${title}.srt to Traditional Chinese"
    fi
  else
    echo "❌ SRT file not found for $title"
  fi

  # Delete the audio file after transcription
  rm -f "${title}.mp3"

  echo "✅ Finished: $title"
done < yt_links.txt

# Blank out yt_links.txt after processing
: > yt_links.txt