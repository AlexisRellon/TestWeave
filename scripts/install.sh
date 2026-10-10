#!/bin/sh
set -eu

method=npm
workspace=$PWD
setup=true
formula=
usage() {
  cat <<'EOF'
Usage: install.sh [--method npm|brew] [--cwd DIRECTORY] [--no-setup] [--formula TAPPED_FORMULA]
Installs TestWeave and runs testweave setup --yes in the selected project.
npm requires Node.js 20+. brew uses the supplied formula or the repository's HEAD formula.
EOF
}
fail() { printf '%s\n' "TestWeave: $*" >&2; exit 1; }
while [ "$#" -gt 0 ]; do
  case "$1" in
    --method|--cwd|--formula)
      [ "$#" -ge 2 ] || fail "Missing value for $1"
      case "$1" in
        --method) method=$2 ;;
        --cwd) workspace=$2 ;;
        --formula) formula=$2 ;;
      esac
      shift 2 ;;
    --no-setup) setup=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done
case "$method" in npm|brew) ;; *) fail "Unsupported method: $method" ;; esac
[ -d "$workspace" ] || fail "Workspace does not exist: $workspace"
workspace=$(cd "$workspace" && pwd -P)

case "$method" in
  npm)
    command -v node >/dev/null 2>&1 || fail "Install Node.js 20+ first"
    node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)' || fail "Node.js 20+ is required"
    command -v npm >/dev/null 2>&1 || fail "npm is required"
    npm install --global testweave
    prefix=$(npm prefix --global)
    cli="$prefix/bin/testweave"
    # Windows npm prefixes put command shims directly in the prefix.
    [ -f "$cli" ] || cli="$prefix/testweave"
    [ -f "$cli" ] || fail "Installed CLI was not found in $prefix"
    ;;
  brew)
    command -v brew >/dev/null 2>&1 || fail "Install Homebrew first"
    if [ -z "$formula" ]; then
      brew tap alexisrellon/testweave https://github.com/AlexisRellon/TestWeave
      formula=alexisrellon/testweave/testweave
    fi
    brew install --HEAD "$formula"
    prefix=$(brew --prefix "$formula")
    cli="$prefix/bin/testweave"
    [ -f "$cli" ] || fail "Installed CLI was not found in $prefix"
    ;;
esac

if [ "$setup" = true ]; then
  "$cli" --cwd "$workspace" setup --yes
else
  printf '%s\n' "TestWeave installed. Run testweave setup in your project to configure MCP."
fi
