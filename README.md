<p align="center">
  <img src="assets/logo.svg" alt="claude-mods" width="480">
</p>

<p align="center">
  <b>A curated collection of mods for <a href="https://claude.com/claude-code">Claude Code</a>.</b><br>
  Small, focused extensions that reshape the interface and behavior of your terminal sessions.
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-D97757">
  <img alt="Claude Code" src="https://img.shields.io/badge/for-Claude%20Code-B8532F">
  <img alt="TypeScript" src="https://img.shields.io/badge/built%20with-TypeScript-3178c6">
</p>

---

## Mods

| Mod | Description |
| --- | --- |
| [`status-bar`](mods/status-bar) | Footer bar with model, effort, cache countdown and context left, plus 5h and 7d quota and session tokens and cost. |

More mods are on the way.

## Installation

Add the marketplace once, then install any mod from it:

```
/plugin marketplace add <owner>/claude-mods
/plugin install status-bar@claude-mods
```

Run `/reload-plugins` after updating.

## Repository layout

```
.claude-plugin/
  marketplace.json    # catalog of everything installable from this repo
mods/
  <mod-name>/
    .claude-plugin/plugin.json
    hooks/            # hooks module (register.tsx) and hooks.json
    types/            # state contract, when the mod keeps state
assets/               # logo and shared images
```

## Adding a new mod

1. Create `mods/<mod-name>/` with a `.claude-plugin/plugin.json` and a `hooks/` module.
2. Register it in `.claude-plugin/marketplace.json` with `"source": "./mods/<mod-name>"`.
3. Add a row to the table above and a `README.md` inside the mod folder.

Hooks, slash commands and other plugin types can live alongside `mods/` in sibling folders (for example `plugins/`) and be listed in the same marketplace.

## License

[MIT](LICENSE) © Antonio Arias
