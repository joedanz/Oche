#!/bin/bash
# ABOUTME: Ralph Wiggum - Long-running AI agent loop for autonomous coding
# ABOUTME: Runs Claude Code iteratively until PRD tasks are complete
# Usage: ./ralph.sh [--tool claude|amp] [max_iterations]

set -e

# Parse arguments
TOOL="claude"
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

# Check for jq (required for Claude streaming)
if [[ "$TOOL" == "claude" ]] && ! command -v jq &> /dev/null; then
  echo "Warning: jq not found. Install with 'brew install jq' for better streaming output."
  echo "Falling back to non-streaming mode."
  USE_STREAMING=false
else
  USE_STREAMING=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
OUTPUT_FILE="$SCRIPT_DIR/.ralph-output-$$.txt"

# Cleanup on exit
cleanup() {
  rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Ensure we start from master
echo "Ensuring we're on master branch..."
git checkout master 2>/dev/null || true
git pull origin master 2>/dev/null || true

echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"
echo "Workflow: PR-per-story with browser verification and auto-merge"

# Stream parser for Claude Code stream-json output
# Extracts and displays: text content, tool calls, and results
parse_claude_stream() {
  local last_tool=""

  while IFS= read -r line; do
    # Save raw output for completion detection
    echo "$line" >> "$OUTPUT_FILE"

    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Parse the JSON line
    type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

    case "$type" in
      "assistant")
        # Extract tool calls from assistant messages
        tool_name=$(echo "$line" | jq -r '.message.content[]? | select(.type == "tool_use") | .name // empty' 2>/dev/null | head -1)
        if [[ -n "$tool_name" && "$tool_name" != "$last_tool" ]]; then
          last_tool="$tool_name"
          # Format tool output with icons
          case "$tool_name" in
            "Read")     echo -e "\n📖 Reading file..." ;;
            "Write")    echo -e "\n📝 Writing file..." ;;
            "Edit")     echo -e "\n✏️  Editing file..." ;;
            "Bash")
              cmd=$(echo "$line" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.command // empty' 2>/dev/null | head -c 80)
              echo -e "\n💻 Bash: ${cmd}..." ;;
            "Glob")     echo -e "\n🔍 Searching files..." ;;
            "Grep")     echo -e "\n🔍 Searching content..." ;;
            "Task")     echo -e "\n🤖 Spawning agent..." ;;
            "WebFetch") echo -e "\n🌐 Fetching URL..." ;;
            *)          echo -e "\n🔧 $tool_name..." ;;
          esac
        fi

        # Extract text content from assistant messages
        text=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text // empty' 2>/dev/null)
        if [[ -n "$text" ]]; then
          echo "$text"
        fi
        ;;

      "stream_event")
        # Real-time text streaming (if using --verbose or partial messages)
        delta_text=$(echo "$line" | jq -j '.event.delta.text? // empty' 2>/dev/null)
        if [[ -n "$delta_text" ]]; then
          printf "%s" "$delta_text"
        fi
        ;;

      "result")
        # Final result - extract for completion check
        result_text=$(echo "$line" | jq -r '.result // empty' 2>/dev/null)
        is_error=$(echo "$line" | jq -r '.is_error // false' 2>/dev/null)
        cost=$(echo "$line" | jq -r '.total_cost_usd // 0' 2>/dev/null)

        echo ""
        echo "───────────────────────────────────────────"
        if [[ "$is_error" == "true" ]]; then
          echo "❌ Iteration ended with error"
        else
          echo "✅ Iteration complete (cost: \$${cost})"
        fi
        break  # Exit loop - "result" is the final message
        ;;
    esac
  done
}

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Clear output file for this iteration
  > "$OUTPUT_FILE"

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
  else
    if [[ "$USE_STREAMING" == "true" ]]; then
      # Claude Code with streaming JSON for real-time feedback
      # Note: stream-json requires --verbose
      claude --dangerously-skip-permissions \
        --output-format stream-json \
        --verbose \
        -p "$(cat "$SCRIPT_DIR/CLAUDE.md")" 2>&1 | parse_claude_stream || true

      # Read captured output for completion detection
      OUTPUT=$(cat "$OUTPUT_FILE" 2>/dev/null || echo "")
    else
      # Fallback: non-streaming mode
      OUTPUT=$(claude --dangerously-skip-permissions --print -p "$(cat "$SCRIPT_DIR/CLAUDE.md")" 2>&1 | tee /dev/stderr) || true
    fi
  fi

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "🎉 Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "⚠️  Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."

exit 1
