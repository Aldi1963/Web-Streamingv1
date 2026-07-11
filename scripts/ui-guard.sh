#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CSS_FILES="$(find "$ROOT/src/app" "$ROOT/src/styles" -type f -name '*.css' 2>/dev/null | sort)"
ACCOUNT="$ROOT/src/components/account-center.tsx"
NAV="$ROOT/src/components/app-navigation.tsx"
PLAYER="$ROOT/src/components/watch-player.tsx"
SHELL="$ROOT/src/components/app-shell.tsx"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

has() {
  file="$1"
  pattern="$2"
  grep -Fq "$pattern" "$file"
}

has_css() {
  pattern="$1"
  for file in $CSS_FILES; do
    grep -Fq "$pattern" "$file" && return 0
  done
  return 1
}

has_css ".mobile-drawer .search-form,.mobile-drawer-search{display:none!important}" || fail "mobile drawer search must stay hidden"
has_css ".dashboard-library-grid{grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:14px}" || fail "dashboard history needs its dedicated grid"
has_css ".dashboard-library-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}" || fail "dashboard history mobile grid must stay 3 columns"
has "$ACCOUNT" "dashboard-library-grid" || fail "dashboard history must render with the dashboard library grid"
has "$ACCOUNT" "dashboard-library-card" || fail "dashboard history cards must use dedicated card class"
has "$PLAYER" "aria-label=\"Daftar episode\"" || fail "watch player must keep one top-right episode trigger"

if grep -Fq "<SearchForm" "$NAV"; then
  fail "mobile drawer navigation must not render SearchForm directly"
fi

if grep -Fq "mobile-drawer-search" "$NAV"; then
  fail "mobile drawer must not render its old search form"
fi

if grep -Fq "SearchForm compact" "$SHELL"; then
  fail "sidebar must not render the compact search form"
fi

if grep -Fq "BottomNavigation" "$SHELL"; then
  fail "app shell must not render the removed bottom navigation"
fi

if grep -Fq 'href={`/drama/${content.slug}`}' "$ROOT/src/app/(user)/watch/[id]/page.tsx"; then
  fail "watch page back button must not link to /drama because that redirects back to /watch"
fi

if grep -Fq "player-episode-menu-btn" "$PLAYER"; then
  fail "watch player must not render the old episode pill trigger"
fi

if grep -Fq "<ListVideo size={17} /> Episode" "$PLAYER"; then
  fail "watch player bottom controls must not render an extra episode button"
fi

echo "OK: UI guard passed"
