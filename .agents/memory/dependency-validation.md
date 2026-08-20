---
name: Dependency validation
description: Environment-specific constraint encountered when installing npm dependencies for validation.
---

The Replit package firewall can block a transitive npm package even when the application dependencies are unchanged. When this happens, preserve the existing lockfile and project stack; report the blocked validation command rather than introducing unrelated dependency or configuration changes just to make checks run.

**Why:** An attempted validation install was blocked by the firewall on a transitive `shell-quote` tarball, and the package tool also briefly added an unrelated environment module that had to be reverted.

**How to apply:** Try the package-management flow first. If it remains blocked, use available static checks and clearly separate code verification from the environment limitation.