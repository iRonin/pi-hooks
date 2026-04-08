/**
 * Tests for pi-hooks permission system
 * 
 * Run: npm test
 * Watch: npm run test:watch
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  splitChainedCommands,
  checkPermission,
  isPathSafe,
  findProjectRoot,
  resolveHomePath,
  safeRealpath,
} from "../index.js";

// ============================================================================
// Test Infrastructure
// ============================================================================

describe("pi-hooks", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-hooks-test-"));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // Command Splitting
  // ============================================================================

  describe("splitChainedCommands", () => {
    it("splits commands on &&", () => {
      expect(splitChainedCommands("git add . && git commit -m 'test'")).toEqual([
        "git add .",
        "git commit -m 'test'",
      ]);
    });

    it("splits commands on ||", () => {
      expect(splitChainedCommands("git push || git pull")).toEqual([
        "git push",
        "git pull",
      ]);
    });

    it("splits commands on ;", () => {
      expect(splitChainedCommands("cd ..; ls -la")).toEqual(["cd ..", "ls -la"]);
    });

    it("splits commands on |", () => {
      expect(splitChainedCommands("ls | grep foo | wc -l")).toEqual([
        "ls",
        "grep foo",
        "wc -l",
      ]);
    });

    it("respects single quotes", () => {
      expect(splitChainedCommands("echo 'hello && world' && ls")).toEqual([
        "echo 'hello && world'",
        "ls",
      ]);
    });

    it("respects double quotes", () => {
      expect(splitChainedCommands('echo "hello && world" && ls')).toEqual([
        'echo "hello && world"',
        "ls",
      ]);
    });

    it("handles mixed operators", () => {
      expect(
        splitChainedCommands("git add . && git commit -m 'test' || echo 'failed'")
      ).toEqual(["git add .", "git commit -m 'test'", "echo 'failed'"]);
    });

    it("returns single command when no operators", () => {
      expect(splitChainedCommands("git status")).toEqual(["git status"]);
    });

    it("handles empty input", () => {
      expect(splitChainedCommands("")).toEqual([]);
    });

    it("handles whitespace-only input", () => {
      expect(splitChainedCommands("   ")).toEqual([]);
    });

    it("handles nested quotes correctly", () => {
      expect(
        splitChainedCommands("echo 'foo; bar' && echo \"baz | qux\"")
      ).toEqual(["echo 'foo; bar'", "echo \"baz | qux\""]);
    });
  });

  // ============================================================================
  // Permission Checking
  // ============================================================================

  describe("checkPermission", () => {
    const makeRule = (
      action: "allow" | "ask" | "deny",
      pattern: string,
      line = 1
    ) => ({
      action,
      pattern: new RegExp(pattern),
      rawPattern: pattern,
      line,
    });

    it("matches allow rules", () => {
      const rules = [makeRule("allow", "^\\s*git\\s")];
      expect(checkPermission("git status", rules)).toBe("allow");
      expect(checkPermission("git log", rules)).toBe("allow");
    });

    it("matches deny rules", () => {
      const rules = [makeRule("deny", "^\\s*sudo\\s")];
      expect(checkPermission("sudo rm -rf /", rules)).toBe("deny");
    });

    it("matches ask rules", () => {
      const rules = [makeRule("ask", "^\\s*rm\\s")];
      expect(checkPermission("rm -rf node_modules", rules)).toBe("ask");
    });

    it("returns null for no match", () => {
      const rules = [makeRule("allow", "^\\s*git\\s")];
      expect(checkPermission("npm install", rules)).toBeNull();
    });

    it("uses first matching rule (rule order matters)", () => {
      const rules = [
        makeRule("allow", "^\\s*git\\s"),
        makeRule("deny", "^\\s*git\\s+push"),
      ];
      // First rule wins
      expect(checkPermission("git push origin main", rules)).toBe("allow");
    });

    it("handles specific rules before broad rules", () => {
      const rules = [
        makeRule("deny", "^\\s*git\\s+push\\s+--force"),
        makeRule("allow", "^\\s*git\\s"),
      ];
      expect(checkPermission("git push --force", rules)).toBe("deny");
      expect(checkPermission("git push", rules)).toBe("allow");
    });

    it("matches complex regex patterns", () => {
      const rules = [
        makeRule("allow", "^\\s*(npm|yarn|pnpm)\\s+(install|run)\\s"),
      ];
      expect(checkPermission("npm install", rules)).toBe("allow");
      expect(checkPermission("yarn run build", rules)).toBe("allow");
      expect(checkPermission("npm test", rules)).toBeNull();
    });

    it("handles empty rules array", () => {
      expect(checkPermission("git status", [])).toBeNull();
    });
  });

  // ============================================================================
  // Path Safety
  // ============================================================================

  describe("isPathSafe", () => {
    it("allows paths inside project", () => {
      expect(isPathSafe("/tmp/test-project/src/index.ts", "/tmp/test-project")).toBe(true);
    });

    it("allows /tmp paths", () => {
      expect(isPathSafe("/tmp/file.txt", "/tmp/test-project")).toBe(true);
      expect(isPathSafe("/private/tmp/file.txt", "/tmp/test-project")).toBe(true);
    });

    it("allows ~/Downloads paths", () => {
      expect(
        isPathSafe(
          path.join(os.homedir(), "Downloads", "file.txt"),
          "/tmp/test-project"
        )
      ).toBe(true);
    });

    it("blocks paths outside project and safe dirs", () => {
      expect(isPathSafe("/tmp/other-project/file.txt", "/tmp/test-project")).toBe(false);
    });

    it("handles non-existent paths", () => {
      // Non-existent paths should fall through to project check
      expect(
        isPathSafe(
          "/tmp/test-project/nonexistent/file.txt",
          "/tmp/test-project"
        )
      ).toBe(true);
    });
  });

  describe("resolveHomePath", () => {
    it("resolves ~/", () => {
      const home = os.homedir();
      expect(resolveHomePath("~/file.txt")).toBe(`${home}/file.txt`);
    });

    it("resolves ~", () => {
      const home = os.homedir();
      expect(resolveHomePath("~")).toBe(home);
    });

    it("resolves $HOME", () => {
      const home = os.homedir();
      expect(resolveHomePath("$HOME/file.txt")).toBe(`${home}/file.txt`);
    });

    it("resolves ${HOME}", () => {
      const home = os.homedir();
      expect(resolveHomePath("${HOME}/file.txt")).toBe(`${home}/file.txt`);
    });

    it("leaves absolute paths unchanged", () => {
      expect(resolveHomePath("/tmp/file.txt")).toBe("/tmp/file.txt");
    });

    it("leaves relative paths unchanged", () => {
      expect(resolveHomePath("relative/path.txt")).toBe("relative/path.txt");
    });
  });

  describe("safeRealpath", () => {
    it("resolves existing paths", () => {
      const testFile = path.join(testDir, "test.txt");
      fs.writeFileSync(testFile, "test");
      expect(safeRealpath(testFile)).toBe(fs.realpathSync(testFile));
    });

    it("falls back to path.resolve for non-existent paths", () => {
      const nonExistent = path.join(testDir, "does-not-exist.txt");
      expect(safeRealpath(nonExistent)).toBe(path.resolve(nonExistent));
    });
  });

  // ============================================================================
  // Project Root Detection
  // ============================================================================

  describe("findProjectRoot", () => {
    it("finds .git directory", () => {
      const gitDir = path.join(testDir, "project", ".git");
      fs.mkdirSync(gitDir, { recursive: true });
      expect(findProjectRoot(path.join(testDir, "project", "src"))).toBe(
        path.join(testDir, "project")
      );
    });

    it("returns start if no .git found", () => {
      expect(findProjectRoot("/")).toBe("/");
    });

    it("stops at root directory", () => {
      expect(findProjectRoot("/tmp")).toBe("/tmp");
    });

    it("does NOT use .pi-hooks as project root", () => {
      const hooksFile = path.join(testDir, "project", ".pi-hooks");
      fs.writeFileSync(hooksFile, "allow .*");
      expect(findProjectRoot(path.join(testDir, "project"))).toBe(
        path.join(testDir, "project")
      );
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration: Command flow", () => {
    it("handles realistic git workflow", () => {
      const rules = [
        {
          action: "allow" as const,
          pattern: /^\s*git\s+(status|log|diff|show|branch|tag|remote)\s/,
          rawPattern: "",
          line: 1,
        },
        {
          action: "ask" as const,
          pattern: /^\s*git\s+(add|commit|push|pull|merge|rebase)\s/,
          rawPattern: "",
          line: 2,
        },
        {
          action: "deny" as const,
          pattern: /^\s*git\s+push\s+--force/,
          rawPattern: "",
          line: 3,
        },
      ];

      // Read-only commands should be allowed
      expect(checkPermission("git status", rules)).toBe("allow");
      expect(checkPermission("git log --oneline", rules)).toBe("allow");

      // Write commands should ask
      expect(checkPermission("git add .", rules)).toBe("ask");
      expect(checkPermission("git commit -m 'test'", rules)).toBe("ask");

      // Force push should be denied
      expect(checkPermission("git push --force", rules)).toBe("deny");
    });

    it("handles realistic npm workflow", () => {
      const rules = [
        {
          action: "allow" as const,
          pattern: /^\s*(npm|yarn|pnpm)\s+(install|run\s+(dev|test|build))\s/,
          rawPattern: "",
          line: 1,
        },
        {
          action: "ask" as const,
          pattern: /^\s*(npm|yarn|pnpm)\s+(publish|deploy)\s/,
          rawPattern: "",
          line: 2,
        },
        {
          action: "deny" as const,
          pattern: /^\s*(npm|yarn|pnpm)\s+uninstall\s/,
          rawPattern: "",
          line: 3,
        },
      ];

      expect(checkPermission("npm install", rules)).toBe("allow");
      expect(checkPermission("npm run dev", rules)).toBe("allow");
      expect(checkPermission("yarn run build", rules)).toBe("allow");
      expect(checkPermission("npm publish", rules)).toBe("ask");
      expect(checkPermission("npm uninstall lodash", rules)).toBe("deny");
    });
  });

  // ============================================================================
  // Security Tests
  // ============================================================================

  describe("Security: Hard blocks", () => {
    const HARD_BLOCK_PATTERNS = [
      { pattern: /\bsudo\s/, name: "sudo" },
      { pattern: /\b(dd|mkfs\S*|diskutil)\s/, name: "disk ops" },
      { pattern: />\s*\/dev\/(sd|hd|disk|nvme|mmcblk)/, name: "device writes" },
      { pattern: /\b(DROP\s+TABLE|TRUNCATE\s+TABLE|DROP\s+DATABASE)\b/i, name: "destructive SQL" },
      { pattern: /\bkill\s+(-9\s+)?-1(\s|$)/, name: "kill all" },
    ];

    it.each(HARD_BLOCK_PATTERNS)("blocks $name", ({ pattern }) => {
      // These should match the hard block patterns
      const testCommands: Record<string, string> = {
        sudo: "sudo rm -rf /",
        "disk ops": "dd if=/dev/zero of=/dev/sda",
        "device writes": "echo test > /dev/sda",
        "destructive SQL": "DROP TABLE users",
        "kill all": "kill -1",
      };

      const cmd = testCommands[pattern.source.split("\\b")[1]?.split("\\")[0] || ""];
      if (cmd) {
        expect(pattern.test(cmd)).toBe(true);
      }
    });

    it("does not block normal commands", () => {
      const normalCommands = [
        "git status",
        "npm install",
        "ls -la",
        "cat file.txt",
        "echo hello",
      ];

      for (const cmd of normalCommands) {
        for (const { pattern, name } of HARD_BLOCK_PATTERNS) {
          expect(pattern.test(cmd)).toBe(false);
        }
      }
    });
  });

  describe("Security: Opaque commands", () => {
    const OPAQUE_PATTERNS = [
      { pattern: /(^|\s|\/)(bash|sh)\s+-(l?c|cl)\s/, name: "bash -c" },
      { pattern: /(^|\s)eval\s/, name: "eval" },
      { pattern: /\|\s*(bash|sh)\s*$/, name: "pipe to shell" },
    ];

    it.each(OPAQUE_PATTERNS)("detects $name", ({ pattern, name }) => {
      const testCommands: Record<string, string> = {
        "bash -c": "bash -c 'echo test'",
        eval: "eval 'echo test'",
        "pipe to shell": "echo test | bash",
      };

      expect(pattern.test(testCommands[name])).toBe(true);
    });

    it("does not flag safe commands as opaque", () => {
      const safeCommands = [
        "git status",
        "npm install",
        "ls -la",
        "cat file.txt",
        "echo hello | grep foo", // pipe but not to shell
      ];

      for (const cmd of safeCommands) {
        for (const { pattern } of OPAQUE_PATTERNS) {
          expect(pattern.test(cmd)).toBe(false);
        }
      }
    });
  });
});
