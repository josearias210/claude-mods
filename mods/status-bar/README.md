# status-bar

A footer bar for Claude Code that keeps the essentials in view:

- **Model** in use
- **Effort** level
- **Cache countdown** until the prompt cache expires
- **Context left** in the current window
- **Quota** used in the 5-hour and 7-day windows, with time to reset; hidden when the account reports no limits
- **Session spend**: tokens used this session (subagents included) and the estimated cost in USD, as `/cost` totals it; an estimate, not the bill

## Install

```
/plugin install status-bar --marketplace <owner>/claude-mods
```
