#!/usr/bin/env bash
# Manual-test harness: a real SillyTavern with this extension installed, seeded
# test data, and a stand-in OpenAI-compatible model, for driving with
# Playwright (see lib.mjs and .claude/skills/manual-test/SKILL.md).
#
#   harness.sh up [seed args]   setup + install + seed + start (the usual entry point)
#   harness.sh setup            find or clone SillyTavern, npm ci, install playwright-core
#   harness.sh install          build the extension and copy it into ST (run after every src/ change)
#   harness.sh seed [args]      stop, (re)seed test data (args go to seed.mjs), no restart
#   harness.sh start | stop     start/stop ST + the stand-in model in the background
#   harness.sh serve            run both in the foreground (for a backgrounded shell)
#   harness.sh reset            stop and wipe ST's default user (next start recreates it)
#   harness.sh status           show what's running and where
#   harness.sh run SCRIPT.mjs   run a smoke script with the harness env set
#
# Env (all optional):
#   SSE_TEST_DIR   work dir for logs, pids, the request log, playwright-core
#                  (default: $TMPDIR/sse-manual-test; use the session scratchpad)
#   ST_DIR         SillyTavern checkout (default: /home/user/SillyTavern if it
#                  exists, else a clone of SillyTavern's release branch in $SSE_TEST_DIR)
#   ST_PORT        default 8000        FAKE_LLM_PORT  default 5005

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
SSE_TEST_DIR="${SSE_TEST_DIR:-${TMPDIR:-/tmp}/sse-manual-test}"
if [[ -z "${ST_DIR:-}" ]]; then
    if [[ -f /home/user/SillyTavern/server.js ]]; then ST_DIR=/home/user/SillyTavern; else ST_DIR="$SSE_TEST_DIR/SillyTavern"; fi
fi
ST_PORT="${ST_PORT:-8000}"
FAKE_LLM_PORT="${FAKE_LLM_PORT:-5005}"
export SSE_TEST_DIR ST_DIR ST_PORT FAKE_LLM_PORT
mkdir -p "$SSE_TEST_DIR"

EXT_DIR="$ST_DIR/public/scripts/extensions/third-party/Saints-Silly-Extensions"
ST_LOG="$SSE_TEST_DIR/st.log"
LLM_LOG="$SSE_TEST_DIR/fake-llm.log"

log() { printf '[harness] %s\n' "$*"; }

wait_for_url() { # url, seconds
    local url="$1" tries="${2:-120}"
    for _ in $(seq 1 "$tries"); do
        curl -s -o /dev/null --noproxy '*' "$url" && return 0
        sleep 1
    done
    return 1
}

# Processes are found by command line (setsid -f forks, so there's no $! to
# keep). Anchored at the start, so a shell whose own command text merely
# mentions the pattern is never matched (and never killed by `stop`).
pattern() {
    case "$1" in
        st) echo "^node server\\.js --port $ST_PORT( |\$)" ;;
        fake-llm) echo "^node $HERE/fake-llm\\.mjs" ;;
    esac
}
is_running() { pgrep -f "$(pattern "$1")" >/dev/null; }

cmd_setup() {
    if [[ ! -f "$ST_DIR/server.js" ]]; then
        log "cloning SillyTavern (release) into $ST_DIR"
        git clone --depth 1 --branch release https://github.com/SillyTavern/SillyTavern "$ST_DIR"
    fi
    if [[ ! -d "$ST_DIR/node_modules" ]]; then
        log "installing SillyTavern dependencies"
        (cd "$ST_DIR" && npm ci --no-audit --no-fund >/dev/null)
    fi
    if [[ ! -d "$SSE_TEST_DIR/node_modules/playwright-core" ]]; then
        log "installing playwright-core into $SSE_TEST_DIR"
        (cd "$SSE_TEST_DIR" && { [[ -f package.json ]] || npm init -y >/dev/null; } && npm i playwright-core --no-audit --no-fund >/dev/null)
    fi
    [[ -d "$REPO/node_modules" ]] || (cd "$REPO" && npm install --no-audit --no-fund >/dev/null)
    log "SillyTavern: $ST_DIR ($(node -p "require('$ST_DIR/package.json').version"))"
}

cmd_install() {
    log "building the extension"
    (cd "$REPO" && npm run build --silent >/dev/null)
    mkdir -p "$EXT_DIR"
    cp "$REPO/manifest.json" "$EXT_DIR/"
    rm -rf "$EXT_DIR/dist" && cp -r "$REPO/dist" "$EXT_DIR/dist"
    log "installed into $EXT_DIR (reload the page to pick it up)"
}

# `setsid -f` always forks into a new session and returns at once, so the
# servers outlive this script and the shell call that ran it. (Plain setsid
# only forks when it happens to be a process-group leader, which made the
# harness sometimes wait on the server forever.)
start_st() {
    (cd "$ST_DIR" && setsid -f node server.js --port "$ST_PORT" --listen false >"$ST_LOG" 2>&1 </dev/null)
}

start_llm() {
    setsid -f node "$HERE/fake-llm.mjs" >"$LLM_LOG" 2>&1 </dev/null
}

cmd_start() {
    is_running fake-llm || start_llm
    is_running st || start_st
    wait_for_url "http://127.0.0.1:$FAKE_LLM_PORT/v1/models" 30 || { log "stand-in model didn't start; see $LLM_LOG"; exit 1; }
    wait_for_url "http://127.0.0.1:$ST_PORT/" 180 || { log "SillyTavern didn't start; see $ST_LOG"; tail -20 "$ST_LOG"; exit 1; }
    log "SillyTavern http://127.0.0.1:$ST_PORT  stand-in model http://127.0.0.1:$FAKE_LLM_PORT/v1"
}

cmd_stop() {
    for name in st fake-llm; do
        pkill -f "$(pattern "$name")" 2>/dev/null || true
        for _ in $(seq 1 20); do is_running "$name" || break; sleep 0.5; done
    done
    log "stopped"
}

cmd_init_user() { # ST creates data/default-user on its first start
    [[ -f "$ST_DIR/data/default-user/settings.json" ]] && return 0
    log "first start: letting SillyTavern create its default user"
    is_running st || start_st
    wait_for_url "http://127.0.0.1:$ST_PORT/" 180 || { log "SillyTavern didn't start; see $ST_LOG"; exit 1; }
    for _ in $(seq 1 30); do [[ -f "$ST_DIR/data/default-user/settings.json" ]] && break; sleep 1; done
    cmd_stop
}

cmd_seed() {
    cmd_stop
    cmd_init_user
    node "$HERE/seed.mjs" "$@"
}

cmd_up() {
    cmd_setup
    cmd_install
    cmd_seed "$@"
    : >"$SSE_TEST_DIR/fake-llm-requests.jsonl"
    cmd_start
}

cmd_serve() {
    node "$HERE/fake-llm.mjs" >"$LLM_LOG" 2>&1 &
    trap 'kill %1 2>/dev/null' EXIT
    cd "$ST_DIR" && node server.js --port "$ST_PORT" --listen false 2>&1 | tee "$ST_LOG"
}

cmd_reset() {
    cmd_stop
    rm -rf "$ST_DIR/data/default-user"
    log "wiped $ST_DIR/data/default-user"
}

cmd_run() {
    [[ -n "${1:-}" ]] || { log "usage: harness.sh run SCRIPT.mjs"; exit 1; }
    is_running st && is_running fake-llm || cmd_start
    node "$@"
}

cmd_status() {
    echo "SSE_TEST_DIR=$SSE_TEST_DIR"
    echo "ST_DIR=$ST_DIR  (extension: $EXT_DIR)"
    echo "SillyTavern: $(is_running st && echo "running, http://127.0.0.1:$ST_PORT" || echo stopped)  log: $ST_LOG"
    echo "stand-in model: $(is_running fake-llm && echo "running, http://127.0.0.1:$FAKE_LLM_PORT/v1" || echo stopped)  log: $LLM_LOG"
    echo "request log: $SSE_TEST_DIR/fake-llm-requests.jsonl"
}

case "${1:-}" in
    up) shift; cmd_up "$@" ;;
    setup) cmd_setup ;;
    install) cmd_install ;;
    seed) shift; cmd_seed "$@" ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    serve) cmd_serve ;;
    reset) cmd_reset ;;
    status) cmd_status ;;
    run) shift; cmd_run "$@" ;;
    *) sed -n '2,24p' "$0"; exit 1 ;;
esac
