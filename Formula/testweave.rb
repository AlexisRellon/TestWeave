class Testweave < Formula
  desc "Keep manual QA contracts aligned with source changes through CLI and MCP"
  homepage "https://github.com/AlexisRellon/TestWeave"
  license "MIT"
  head "https://github.com/AlexisRellon/TestWeave.git", branch: "main"

  depends_on "node"

  def install
    system "npm", "ci", "--include=dev", "--ignore-scripts", "--no-audit", "--no-fund"
    system "npm", "run", "build"
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  def caveats
    <<~EOS
      In each project, run:
        testweave setup --yes
      Setup automatically configures MCP for selected Cursor, Claude Code and VS Code integrations.
    EOS
  end

  test do
    system bin/"testweave", "--cwd", testpath, "setup", "--yes", "--no-hook"
    assert_path_exists testpath/".cursor/mcp.json"
    assert_path_exists testpath/".mcp.json"
    assert_match "testweave", (testpath/".mcp.json").read
    system bin/"testweave", "--cwd", testpath, "doctor"
  end
end
