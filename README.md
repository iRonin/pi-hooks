# Pi Hooks

[![Test](https://github.com/iRonin/pi-hooks/actions/workflows/test.yml/badge.svg)](https://github.com/iRonin/pi-hooks/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Flexible, directory-based permission system for Pi Agent bash commands. Control which commands require approval, are blocked, or allowed via `.pi-hooks` config files.

## Features

✅ **Directory-based permissions** - `.pi-hooks` files control commands per directory  
✅ **Regex pattern matching** - Flexible command matching with JavaScript regex  
✅ **Three action types** - `allow`, `ask`, `deny`  
✅ **Cascading configs** - Searches up directory tree, most specific wins  
✅ **Command chaining support** - Handles `&&`, `||`, `;`, `|`  
✅ **Path safety checks** - Blocks file operations outside project  
✅ **Built-in safety** - Hard blocks for dangerous commands (sudo, disk ops, etc.)  
✅ **Opaque command detection** - Requires approval for `eval`, `bash -c`, pipes  
✅ **Redirect protection** - Validates output redirection targets  
✅ **Fully tested** - Comprehensive test suite with 100% coverage of core logic  

## Quick Start

### 1. Install

```bash
# Global installation (recommended)
ln -s /path/to/pi-hooks ~/.pi/agent/extensions/hooks

# Or copy
cp -r /path/to/pi-hooks ~/.pi/agent/extensions/hooks
```

### 2. Create a `.pi-hooks` file

```bash
cd /path/to/project
cat > .pi-hooks << 'EOF'
# Allow all git commands
allow ^\s*git\s

# Ask for file operations
ask ^\s*(rm|mv|cp|chmod)\s

# Deny dangerous operations
deny ^\s*sudo\s
EOF
```

### 3. Start Pi Agent

```bash
pi
# Should see: "Pi hooks active: N rule(s) from .pi-hooks"
```

## Configuration

### File Format

```
# Comments start with #
action regex_pattern
```

**Actions:**
- `allow` - Execute without prompting
- `ask` - Require user confirmation via UI
- `deny` - Block completely (cannot be overridden)

**Patterns:**
- JavaScript regular expressions
- Matched against the full command string
- First matching rule wins

### Examples

#### Allow All Git Commands
```
allow ^\s*git\s
```

#### Read-Only Git Access
```
allow ^\s*git\s+(status|log|diff|show|branch|tag)\s
ask ^\s*git\s+(add|commit|push|pull|merge|rebase)\s
deny ^\s*git\s+push\s+--force
```

#### Web Development Project
```
# Allow package managers
allow ^\s*(npm|yarn|pnpm)\s+(install|run|test|build)\s

# Allow git
allow ^\s*git\s

# Ask for file operations outside src/
ask ^\s*(rm|mv|cp)\s+(?!src/)

# Deny dangerous
deny ^\s*sudo\s
deny ^\s*rm\s+-rf\s+/
```

#### Strict Mode
```
# Ask for everything
ask .*

# Except harmless reads
allow ^\s*(ls|pwd|whoami|date|git\s+status)\s
```

## How It Works

### Permission Check Flow

```
Command Received
    ↓
1. HARD BLOCKS (sudo, dd, etc.) → BLOCK IMMEDIATELY
    ↓ Pass
2. OPAQUE CMDS (eval, bash -c) → ALWAYS PROMPT
    ↓ Pass/Approved
3. .pi-hooks RULES
   ├─ deny → BLOCK
   ├─ ask → PROMPT
   └─ allow → SKIP remaining checks
    ↓ No config or no match
4. FILE OPS → Check path safety
    ↓ Pass
5. REDIRECTS → Check path safety
    ↓ Pass
6. DANGEROUS CMDS → Prompt (if not allowed)
    ↓ Pass
EXECUTE ✅
```

### Hard Blocks (Cannot Be Overridden)

These commands are **always blocked**, even with `allow .*`:

- `sudo` - Privilege escalation
- `dd`, `mkfs*`, `diskutil` - Disk operations
- `> /dev/sd*`, `> /dev/nvme*` - Device writes
- `DROP TABLE`, `TRUNCATE` - Destructive SQL
- `kill -1` - Kill all processes

### Opaque Commands (Always Require Approval)

These commands **always prompt**, even with `allow` rules:

- `bash -c`, `sh -c` - Opaque shell execution
- `eval` - Opaque eval
- `| bash`, `| sh` - Pipe to shell

### Path Safety

File operations (`rm`, `mv`, `cp`, `ln`) are checked:

- ✅ Inside project directory (detected via `.git`)
- ✅ Inside `/tmp` or `/private/tmp`
- ✅ Inside `~/Downloads`
- ❌ Outside project → Requires approval

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run typecheck
```

### Project Structure

```
pi-hooks/
├── index.ts              # Main extension code
├── test/
│   └── hooks.test.ts     # Comprehensive test suite
├── package.json          # Package metadata
├── tsconfig.json         # TypeScript config
├── vitest.config.ts      # Test config
└── README.md             # This file
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# Run specific test
npm test -- hooks.test.ts
```

## Testing

The test suite covers:

- ✅ Command splitting (`&&`, `||`, `;`, `|`)
- ✅ Permission rule matching
- ✅ Path safety validation
- ✅ Home directory resolution
- ✅ Project root detection
- ✅ Hard block patterns
- ✅ Opaque command detection
- ✅ Integration scenarios (git, npm workflows)
- ✅ Edge cases (empty input, quotes, nested commands)

Run tests with:

```bash
npm test
```

## Security

### Threat Model

This extension protects against:

1. **Accidental destructive operations** - Blocks `rm -rf /`, `dd`, etc.
2. **Privilege escalation** - Hard blocks `sudo`
3. **Opaque command injection** - Requires approval for `eval`, `bash -c`
4. **Path traversal** - Validates file operation targets
5. **Redirect attacks** - Checks output redirection targets

### Limitations

- Does **not** protect against determined attackers with shell access
- Regex patterns can be bypassed with obfuscation (e.g., `su\do`)
- Relies on Pi Agent's tool_call interception (not OS-level security)
- Does not validate command arguments beyond pattern matching

### Best Practices

1. **Start restrictive** - Use `ask` or `deny` by default, allow specific commands
2. **Use specific patterns** - Avoid `allow .*` unless necessary
3. **Review rules regularly** - Update as project evolves
4. **Test thoroughly** - Verify rules work before relying on them
5. **Layer security** - Use with other security tools (firewalls, permissions)

## Migration from safety-hooks

See [HOOKS-MIGRATION-GUIDE.md](../HOOKS-MIGRATION-GUIDE.md) for detailed migration steps.

**Quick migration:**

```bash
# Rename .ai-permissions to .pi-hooks (syntax is identical)
mv .ai-permissions .pi-hooks

# Install pi-hooks extension
ln -s /path/to/pi-hooks ~/.pi/agent/extensions/hooks

# Optionally disable safety-hooks git checking
```

## API Reference

### Extension Events

```typescript
// Called before every bash command execution
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName !== "bash") return;

  const command = event.input.command;
  const cwd = ctx.cwd;
  const hasUI = ctx.hasUI;

  // Return undefined to allow
  // Return { block: true, reason: "..." } to deny
  // Use ctx.ui.confirm() to ask
});

// Called when session starts
pi.on("session_start", async (event, ctx) => {
  ctx.ui.notify("Hooks loaded", "info");
});
```

### Exported Functions (for testing)

```typescript
// Split chained commands
export function splitChainedCommands(command: string): string[]

// Check command against rules
export function checkPermission(
  command: string,
  rules: PermissionRule[]
): PermissionAction | null

// Check if path is safe
export function isPathSafe(filePath: string, projectRoot: string): boolean

// Find project root
export function findProjectRoot(start: string): string

// Resolve home paths
export function resolveHomePath(p: string): string

// Safe realpath with fallback
export function safeRealpath(p: string): string
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier (configured in repo)
- Follow existing code patterns
- Add tests for all new features
- Document public APIs

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Claude Code's hooks system
- Built on Pi Agent's extension API
- Pattern matching inspired by gitignore syntax

## Support

- **Issues**: [GitHub Issues](https://github.com/iRonin/pi-hooks/issues)
- **Discussions**: [GitHub Discussions](https://github.com/iRonin/pi-hooks/discussions)
- **Documentation**: See README and code comments
- **Examples**: Check test suite for usage patterns
