# Content-addressed result cache for agents-comparison benchmarks. Sourced by
# run/judge scripts. Model: cache key = SHA-256 over ALL pinned inputs (task
# spec, workflow snapshot, target commit, agent prompt -- launcher mechanics
# deliberately excluded) + the cell name; a hit restores the cell's durable
# artifacts without spending LLM tokens. Keyed entries live in
# <benchmark>/cache/<cell>-<key>/ and are committed alongside results.

# ck_key <file...> -- extra strings via $CK_EXTRA; prints 16-hex key.
ck_key() {
  { cat "$@" 2>/dev/null; printf '%s' "${CK_EXTRA:-}"; } | shasum -a 256 | cut -c1-16
}

# ck_meta <entry-dir> <exit-code> -- write meta.json (key fields for humans).
ck_meta() {
  local entry="$1" rc="$2"
  printf '{"exit":%s,"model":"%s","effort":"%s","commit":"%s","cachedAt":"%s"}\n' \
    "$rc" "${model:-?}" "${effort:-?}" "${COMMIT:-?}" "$(date -u +%FT%TZ)" > "$entry/meta.json"
}
