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
LAST_COST="—"

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

prd_remaining() {
  if [[ "$HAS_JQ" == "true" && -f "$PRD_FILE" ]]; then
    local total remaining
    total=$(jq '.userStories | length' "$PRD_FILE")
    remaining=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
    echo "${remaining}/${total}"
  else
    echo "?"
  fi
}

next_story_id() {
  if [[ "$HAS_JQ" == "true" && -f "$PRD_FILE" ]]; then
    jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0] | .id // "?"' "$PRD_FILE"
  else
    echo "?"
  fi
}

next_story_title() {
  if [[ "$HAS_JQ" == "true" && -f "$PRD_FILE" ]]; then
    jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0] | .title // "unknown"' "$PRD_FILE"
  else
    echo "unknown"
  fi
}

format_duration() {
  local secs=$1
  if (( secs >= 3600 )); then
    printf "%dh %dm" $((secs / 3600)) $(( (secs % 3600) / 60 ))
  elif (( secs >= 60 )); then
    printf "%dm %ds" $((secs / 60)) $((secs % 60))
  else
    printf "%ds" "$secs"
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
    "🤖 Ralph  ·  Iterations: $MAX_ITERATIONS  ·  Stories Completed: $(prd_status)"
else
  echo "==============================================================="
  echo "  🤖 Ralph — Iterations: $MAX_ITERATIONS — Stories Completed: $(prd_status)"
  echo "==============================================================="
fi
echo ""

# ── Stream parser ────────────────────────────────────────────────────────────
# Parses Claude's stream-json output into readable, grouped display

parse_claude_stream() {
  # Tool tracking for grouping consecutive calls
  local current_tool=""
  local tool_count=0
  local tool_detail=""

  # Tool usage counters for summary (bash 3.2 compatible)
  local tc_Read=0 tc_Edit=0 tc_Write=0 tc_Bash=0 tc_Grep=0 tc_Glob=0
  local tc_Task=0 tc_WebFetch=0 tc_Skill=0 tc_Other=0

  # Text buffer — flush on newlines or tool boundaries
  local text_buffer=""

  # Cost capture
  local iteration_cost="0"

  flush_text() {
    if [[ -n "$text_buffer" ]]; then
      printf "%s" "$text_buffer"
      text_buffer=""
    fi
  }

  flush_tool_group() {
    if [[ -z "$current_tool" ]]; then return; fi
    flush_text

    local label=""
    local icon=""
    case "$current_tool" in
      "Read")     icon="📖"; label="Read" ;;
      "Write")    icon="📝"; label="Write" ;;
      "Edit")     icon="✏️ "; label="Edit" ;;
      "Bash")     icon="💻"; label="Bash" ;;
      "Glob")     icon="🔍"; label="Glob" ;;
      "Grep")     icon="🔎"; label="Grep" ;;
      "Task")     icon="🤖"; label="Task" ;;
      "WebFetch") icon="🌐"; label="WebFetch" ;;
      "Skill")    icon="⚡"; label="Skill" ;;
      *)          icon="🔧"; label="$current_tool" ;;
    esac

    local display=""
    if (( tool_count > 1 )); then
      display="$icon $label ×${tool_count}"
    else
      display="$icon $label"
    fi

    # Append detail (file path or command) if available
    if [[ -n "$tool_detail" ]]; then
      display="$display  $tool_detail"
    fi

    if [[ "$HAS_GUM" == "true" ]]; then
      gum style --faint "  $display"
    else
      echo "  $display"
    fi

    current_tool=""
    tool_count=0
    tool_detail=""
  }

  record_tool() {
    local name="$1"
    local detail="$2"

    # Increment global counter
    case "$name" in
      Read)     tc_Read=$((tc_Read + 1))     ;;
      Edit)     tc_Edit=$((tc_Edit + 1))     ;;
      Write)    tc_Write=$((tc_Write + 1))    ;;
      Bash)     tc_Bash=$((tc_Bash + 1))     ;;
      Grep)     tc_Grep=$((tc_Grep + 1))     ;;
      Glob)     tc_Glob=$((tc_Glob + 1))     ;;
      Task)     tc_Task=$((tc_Task + 1))     ;;
      WebFetch) tc_WebFetch=$((tc_WebFetch + 1)) ;;
      Skill)    tc_Skill=$((tc_Skill + 1))    ;;
      *)        tc_Other=$((tc_Other + 1))    ;;
    esac

    if [[ "$name" == "$current_tool" ]]; then
      # Same tool — just bump count, update detail
      tool_count=$((tool_count + 1))
      tool_detail="$detail"
    else
      # Different tool — flush previous group, start new one
      flush_tool_group
      current_tool="$name"
      tool_count=1
      tool_detail="$detail"
    fi
  }

  extract_tool_detail() {
    local name="$1"
    local json="$2"
    case "$name" in
      "Read"|"Write")
        echo "$json" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.file_path // empty' 2>/dev/null | head -1 | sed 's|.*/||' ;;
      "Edit")
        echo "$json" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.file_path // empty' 2>/dev/null | head -1 | sed 's|.*/||' ;;
      "Bash")
        echo "$json" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.command // empty' 2>/dev/null | head -1 | head -c 70 ;;
      "Grep")
        echo "$json" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.pattern // empty' 2>/dev/null | head -1 | head -c 50 ;;
      "Glob")
        echo "$json" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.pattern // empty' 2>/dev/null | head -1 | head -c 50 ;;
      "Task")
        echo "$json" | jq -r '.message.content[]? | select(.type == "tool_use") | .input.description // empty' 2>/dev/null | head -1 | head -c 50 ;;
      *)
        echo "" ;;
    esac
  }

  while IFS= read -r line; do
    echo "$line" >> "$OUTPUT_FILE"
    [[ -z "$line" ]] && continue

    type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

    case "$type" in
      "assistant")
        tool_name=$(echo "$line" | jq -r '.message.content[]? | select(.type == "tool_use") | .name // empty' 2>/dev/null | head -1)
        if [[ -n "$tool_name" ]]; then
          local detail
          detail=$(extract_tool_detail "$tool_name" "$line")
          record_tool "$tool_name" "$detail"
        fi

        text=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text // empty' 2>/dev/null)
        if [[ -n "$text" ]]; then
          flush_tool_group
          echo "$text"
        fi
        ;;

      "stream_event")
        delta_text=$(echo "$line" | jq -j '.event.delta.text? // empty' 2>/dev/null)
        if [[ -n "$delta_text" ]]; then
          text_buffer+="$delta_text"
          # Flush when buffer contains a newline
          if [[ "$text_buffer" == *$'\n'* ]]; then
            printf "%s" "$text_buffer"
            text_buffer=""
          fi
        fi
        ;;

      "result")
        flush_tool_group
        flush_text

        is_error=$(echo "$line" | jq -r '.is_error // false' 2>/dev/null)
        iteration_cost=$(echo "$line" | jq -r '.total_cost_usd // 0' 2>/dev/null)

        # Build tool summary string
        local tool_summary=""
        local _name _count
        for _name in Read Edit Write Bash Grep Glob Task WebFetch Skill Other; do
          eval "_count=\$tc_${_name}"
          if (( _count > 0 )); then
            [[ -n "$tool_summary" ]] && tool_summary+=", "
            tool_summary+="${_count} ${_name}"
          fi
        done

        # Export cost for the main loop
        LAST_COST="\$${iteration_cost}"

        # Print footer
        local elapsed_secs=$(( $(date +%s) - ITER_START ))
        local elapsed_str
        elapsed_str=$(format_duration "$elapsed_secs")

        echo ""
        if [[ "$HAS_GUM" == "true" ]]; then
          local status_line="Cost: \$${iteration_cost}  ·  Duration: ${elapsed_str}  ·  Stories: $(prd_status)"
          local tools_line="Tools: ${tool_summary:-none}"
          if [[ "$is_error" == "true" ]]; then
            gum style --foreground 196 --bold "─── Iteration Error ────────────────────────────────"
            gum style --foreground 196 "  $status_line"
          else
            gum style --foreground 245 "─── Iteration Complete ─────────────────────────────"
            gum style --faint "  $status_line"
            gum style --faint "  $tools_line"
          fi
          gum style --foreground 245 "────────────────────────────────────────────────────"
        else
          if [[ "$is_error" == "true" ]]; then
            echo "─── Iteration Error ────────────────────────────────"
          else
            echo "─── Iteration Complete ─────────────────────────────"
          fi
          echo "  Cost: \$${iteration_cost}  ·  Duration: ${elapsed_str}  ·  Stories: $(prd_status)"
          echo "  Tools: ${tool_summary:-none}"
          echo "────────────────────────────────────────────────────"
        fi
        break
        ;;
    esac
  done
}

# ── Main loop ────────────────────────────────────────────────────────────────

RALPH_START=$(date +%s)

for i in $(seq 1 $MAX_ITERATIONS); do
  ITER_START=$(date +%s)
  local_elapsed=$(( ITER_START - RALPH_START ))
  elapsed_str=$(format_duration "$local_elapsed")

  story_id=$(next_story_id)
  story_title=$(next_story_title)

  echo ""
  if [[ "$HAS_GUM" == "true" ]]; then
    gum style \
      --border rounded \
      --border-foreground 33 \
      --padding "0 2" \
      "Iteration $i/$MAX_ITERATIONS  ·  Stories: $(prd_status)  ·  Next: $story_id" \
      "\"$story_title\"" \
      "Elapsed: ${elapsed_str}  ·  Last cost: ${LAST_COST}"
  else
    echo "═══ Iteration $i/$MAX_ITERATIONS ═══ Stories: $(prd_status) ═══ Next: $story_id ═══"
    echo "    \"$story_title\""
    echo "    Elapsed: ${elapsed_str}  ·  Last cost: ${LAST_COST}"
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
