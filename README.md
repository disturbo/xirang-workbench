# Xirang Workbench

Xirang Workbench is a read-only Obsidian dashboard for structured project vaults. It scans notes, tasks, dates, wiki links, and optional local inspection outputs, then presents a project console, calendar, note health monitor, activity heatmap, and knowledge index status.

The current UI is optimized for Chinese project vaults, but the scan roots and local paths are configurable from the plugin settings.

## Features

- Project overview with current iteration detection.
- Calendar view linked to dated affairs instead of raw file modification dates.
- Mainland China 2026 holiday and adjusted workday labels in the calendar view.
- Current-iteration task board.
- Note metadata health checks for iteration notes.
- Project file activity heatmap.
- LLM Wiki module health checks.
- Wiki broken-link scan.
- Optional local GBrain health monitor.
- Optional local inspection status integration through `status-latest.json`.

The 2026 Mainland China holiday data follows the official State Council Gazette notice: <https://www.gov.cn/gongbao/2025/issue_12406/202511/content_7048922.html>.

## Read-Only Behavior

The plugin is designed as a read-only monitor. It reads Vault notes and optional local files configured by the user, but it does not modify project notes automatically.

## Settings

Open Obsidian settings, then `Community plugins -> Xirang Workbench`.

Key settings:

- `Project root prefix`: Vault path for the project root, for example `10-项目/`. Leave empty to auto-detect a project that contains `迭代/{YYMMDD}迭代/`.
- `Agent directory`: Vault path for agent or role notes.
- `Inspection directory`: Local folder that contains `status-latest.json`.
- `LLM Wiki MOC`: Vault path for the LLM Wiki entry note.
- `LLM Wiki expected modules`: Expected module count for module maturity checks.
- `GBrain health monitor`: Optional local monitor for GBrain CLI, DB, wiki folder, and health logs.

## Privacy

Xirang Workbench does not send data to remote services.

It reads:

- Markdown files in the configured project root.
- Markdown files in the configured agent directory.
- All Vault file paths for broken-link resolution.
- Optional local inspection files such as `status-latest.json`.
- Optional local GBrain files if the GBrain monitor is enabled.

## Manual Installation

Copy these files into:

```text
<vault>/.obsidian/plugins/xirang-workbench/
```

Required files:

```text
main.js
manifest.json
styles.css
```

Then enable `Xirang Workbench` in Obsidian community plugin settings.

## Release Checklist

For an Obsidian community plugin release, create a GitHub release whose tag matches `manifest.json` version, and attach:

```text
main.js
manifest.json
styles.css
```

Keep `versions.json` in the repository root.

## License

MIT
