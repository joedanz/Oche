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
  gum log --level error "Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

# Check for required tools
HAS_GUM=false
if command -v gum &> /dev/null; then
  HAS_GUM=true
fi

HAS_JQ=false
if command -v jq &> /dev/null; then
  HAS_JQ=true
fi

if [[ "$TOOL" == "claude" && "$HAS_JQ" == "false" ]]; then
  gum_log warn "jq not found. Install with 'brew install jq' for streaming output."
  USE_STREAMING=false
else
  USE_STREAMING=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
OUTPUT_FILE="$SCRIPT_DIR/.ralph-output-$$.txt"

# ── Logging helpers ──────────────────────────────────────────────────────────

gum_log() {
  local level="$1"; shift
  if [[ "$HAS_GUM" == "true" ]]; then
    gum log --level "$level" -- "$@"
  else
    echo "[$level] $*"
  fi
}

gum_style() {
  if [[ "$HAS_GUM" == "true" ]]; then
    gum style "$@"
  else
    # Fallback: print the last argument (the text)
    echo "${@: -1}"
  fi
}

# ── PRD status ───────────────────────────────────────────────────────────────

prd_status() {
  if [[ "$HAS_JQ" == "true" && -f "$PRD_FILE" ]]; then
    local total passed
    total=$(jq '.userStories | length' "$PRD_FILE")
    passed=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
    echo "${passed}/${total}"
  else
    echo "?"
  fi
}

next_story() {
  if [[ "$HAS_JQ" == "true" && -f "$PRD_FILE" ]]; then
    jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0] | "\(.id): \(.title)"' "$PRD_FILE"
  else
    echo "unknown"
  fi
}

# ── Cleanup ──────────────────────────────────────────────────────────────────

cleanup() {
  rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT

# ── Initialize ───────────────────────────────────────────────────────────────

if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Ensure we start from master
gum_log info "Checking out master branch…"
git checkout master 2>/dev/null || true
git pull origin master 2>/dev/null || true

# ── Banner ───────────────────────────────────────────────────────────────────

echo ""
if [[ "$HAS_GUM" == "true" ]]; then
  gum style \
    --border double \
    --border-foreground 33 \
    --padding "1 3" \
    --margin "0 0" \
    --bold \
    "🤖 Ralph" \
    "" \
    "Tool: $TOOL  ·  Iterations: $MAX_ITERATIONS  ·  Stories: $(prd_status)"
else
  echo "==============================================================="
  echo "  🤖 Ralph — Tool: $TOOL — Iterations: $MAX_ITERATIONS"
  echo "  Stories: $(prd_status)"
  echo "==============================================================="
fi
echo ""

# ── Stream parser ────────────────────────────────────────────────────────────
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
          local label=""
          case "$tool_name" in
            "Read")     label="📖 Reading file" ;;
            "Write")    label="📝 Writing file" ;;
            "Edit")     label="✏️  Editing file" ;;
            "Bash")
              cmd=$(echo "$line" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.command // empty' 2>/dev/null | head -c 80)
              label="💻 $cmd" ;;
            "Glob")     label="🔍 Searching files" ;;
            "Grep")     label="🔍 Searching content" ;;
            "Task")     label="🤖 Spawning agent" ;;
            "WebFetch") label="🌐 Fetching URL" ;;
            *)          label="🔧 $tool_name" ;;
          esac
          if [[ "$HAS_GUM" == "true" ]]; then
            gum style --faint --italic "  $label"
          else
            echo -e "\n$label..."
          fi
        fi

        # Extract text content from assistant messages
        text=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text // empty' 2>/dev/null)
        if [[ -n "$text" ]]; then
          echo "$text"
        fi
        ;;

      "stream_event")
        delta_text=$(echo "$line" | jq -j '.event.delta.text? // empty' 2>/dev/null)
        if [[ -n "$delta_text" ]]; then
          printf "%s" "$delta_text"
        fi
        ;;

      "result")
        result_text=$(echo "$line" | jq -r '.result // empty' 2>/dev/null)
        is_error=$(echo "$line" | jq -r '.is_error // false' 2>/dev/null)
        cost=$(echo "$line" | jq -r '.total_cost_usd // 0' 2>/dev/null)

        echo ""
        if [[ "$is_error" == "true" ]]; then
          gum_log error "Iteration ended with error"
        else
          gum_log info "Iteration complete — cost: \$${cost}"
        fi
        break
        ;;
    esac
  done
}

# ── Main loop ────────────────────────────────────────────────────────────────

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  if [[ "$HAS_GUM" == "true" ]]; then
    gum style \
      --border rounded \
      --border-foreground 245 \
      --padding "0 2" \
      "Iteration $i/$MAX_ITERATIONS  ·  Stories: $(prd_status)  ·  Next: $(next_story)"
  else
    echo "═══ Iteration $i/$MAX_ITERATIONS ═══ Stories: $(prd_status) ═══ Next: $(next_story) ═══"
  fi

  # Clear output file for this iteration
  > "$OUTPUT_FILE"

  # Run the selected tool
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
  else
    if [[ "$USE_STREAMING" == "true" ]]; then
      claude --dangerously-skip-permissions \
        --output-format stream-json \
        --verbose \
        -p "$(cat "$SCRIPT_DIR/CLAUDE.md")" 2>&1 | parse_claude_stream || true

      OUTPUT=$(cat "$OUTPUT_FILE" 2>/dev/null || echo "")
    else
      OUTPUT=$(claude --dangerously-skip-permissions --print -p "$(cat "$SCRIPT_DIR/CLAUDE.md")" 2>&1 | tee /dev/stderr) || true
    fi
  fi

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    if [[ "$HAS_GUM" == "true" ]]; then
      gum style \
        --border double \
        --border-foreground 82 \
        --padding "1 3" \
        --bold \
        "✅ All stories complete!" \
        "Finished at iteration $i of $MAX_ITERATIONS"
    else
      echo "🎉 Ralph completed all tasks at iteration $i of $MAX_ITERATIONS!"
    fi
    exit 0
  fi

  gum_log info "Iteration $i done. Continuing…"
  sleep 2
done

echo ""
if [[ "$HAS_GUM" == "true" ]]; then
  gum style \
    --border rounded \
    --border-foreground 208 \
    --padding "0 2" \
    "⚠️  Reached max iterations ($MAX_ITERATIONS). Stories: $(prd_status)" \
    "Check $PROGRESS_FILE for status."
else
  echo "⚠️  Ralph reached max iterations ($MAX_ITERATIONS). Stories: $(prd_status)"
  echo "Check $PROGRESS_FILE for status."
fi

exit 1
