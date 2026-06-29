/* V9 Status Panel - read-only Obsidian plugin */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => V9WorkbenchPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_fs = require("fs");
var import_os = require("os");
var import_path = require("path");
var DASHBOARD_VIEW_TYPE = "v9-dashboard-view";
var CALENDAR_VIEW_TYPE = "v9-calendar-view";
var STATUS_FILE = "status-latest.json";
var PROJECT_PREFIX = "10-\u9879\u76EE/";
var AGENT_PREFIX = "50-\u7ECF\u9A8C/Agent";
var BASELINE_PREFIX = "10-\u9879\u76EE/\u57FA\u7EBF/";
var LLM_WIKI_MOC_PATH = "00-MOC/LLM-Wiki-MOC.md";
var LLM_WIKI_MODULE_EXPECTED = 29;
var LLM_WIKI_MIN_SUMMARY_LINES = 80;
var LLM_WIKI_DEPTH_KEYWORDS = ["\u6D41\u7A0B", "\u5B57\u6BB5", "\u72B6\u6001"];
var LLM_WIKI_MATURITY_LEVELS = {
  "\u9AA8\u67B6\u5360\u4F4D": 0,
  "\u4E1A\u52A1\u7406\u89E3\u5DF2\u5B8C\u6210": 1,
  "\u4E1A\u52A1\u7406\u89E3+\u6D41\u7A0B\u5DF2\u5B8C\u6210": 2,
  "\u5DF2\u8BBE\u8BA1\u65B9\u6848": 3,
  "\u5DF2\u53D1\u5E03PRD": 4
};
var PLUGIN_VERSION = "0.6.0";
var STATUS_LABELS = {
  green: "\u6B63\u5E38",
  yellow: "\u5173\u6CE8",
  red: "\u5F02\u5E38"
};
var BADGE_LABELS = {
  health: "\u53CD\u5C04\u5668",
  harness_eval: "\u56DE\u5F52\u6D4B\u8BD5",
  iteration_ops: "\u8FED\u4EE3\u6CBB\u7406"
};
var DEFAULT_SETTINGS = {
  projectPrefix: "",
  agentPrefix: AGENT_PREFIX,
  inspectDir: "",
  llmWikiMocPath: LLM_WIKI_MOC_PATH,
  llmWikiModuleExpected: LLM_WIKI_MODULE_EXPECTED,
  llmWikiMinSummaryLines: LLM_WIKI_MIN_SUMMARY_LINES,
  releaseDateFallback: "2026-07-25",
  enableGbrain: true,
  gbrainCliPath: "",
  gbrainDbPath: "",
  gbrainWikiPath: "",
  gbrainHealthLog: "",
  gbrainSyncFailuresPath: ""
};
var V9WorkbenchPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "statusBarEl", null);
    __publicField(this, "cachedReport", null);
    __publicField(this, "settings", { ...DEFAULT_SETTINGS });
  }
  async onload() {
    await this.loadSettings();
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new V9DashboardView(leaf, this));
    this.registerView(CALENDAR_VIEW_TYPE, (leaf) => new V9CalendarView(leaf, this));
    this.addSettingTab(new XirangWorkbenchSettingTab(this.app, this));
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("v9-status-panel__statusbar");
    this.statusBarEl.setText("Xirang: \u8BFB\u53D6\u4E2D");
    this.statusBarEl.onClickEvent(() => this.openDashboard());
    this.addRibbonIcon("monitor", "\u6253\u5F00\u606F\u58E4\u4E3B\u63A7\u53F0", () => this.openDashboard());
    this.addRibbonIcon("calendar-days", "\u6253\u5F00\u606F\u58E4\u65E5\u5386", () => this.openCalendar());
    this.addCommand({
      id: "open-v9-dashboard",
      name: "\u6253\u5F00\u606F\u58E4\u4E3B\u63A7\u53F0",
      callback: () => this.openDashboard()
    });
    this.addCommand({
      id: "open-v9-calendar",
      name: "\u6253\u5F00\u606F\u58E4\u65E5\u5386",
      callback: () => this.openCalendar()
    });
    this.addCommand({
      id: "refresh-v9-dashboard",
      name: "\u5237\u65B0\u606F\u58E4\u4E3B\u63A7\u53F0",
      callback: async () => {
        await this.refreshOpenViews();
        new import_obsidian.Notice("\u606F\u58E4\u4E3B\u63A7\u53F0\u5DF2\u5237\u65B0");
      }
    });
    await this.refreshStatus();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings(refresh = true) {
    await this.saveData(this.settings);
    if (refresh) {
      await this.refreshOpenViews();
    }
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(DASHBOARD_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(CALENDAR_VIEW_TYPE);
    this.statusBarEl = null;
    this.cachedReport = null;
  }
  async openDashboard() {
    let leaf = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  async openCalendar() {
    var _a;
    let leaf = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = (_a = this.app.workspace.getLeftLeaf(false)) != null ? _a : this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: CALENDAR_VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  getInspectDir() {
    const configuredInspectDir = String(this.settings.inspectDir || "").trim();
    if (configuredInspectDir) {
      return expandHome(configuredInspectDir);
    }
    const explicitInspectDir = process.env.XIRANG_V9_INSPECT_DIR;
    if (explicitInspectDir) {
      return explicitInspectDir;
    }
    const runtimeDir = process.env.XIRANG_V9_RUNTIME_DIR;
    if (runtimeDir) {
      return (0, import_path.join)(runtimeDir, "\u5DE1\u68C0");
    }
    return (0, import_path.join)((0, import_os.homedir)(), "Desktop", "\u6C99\u7BB1", "v9-runtime", "\u5DE1\u68C0");
  }
  getStatusPath() {
    return (0, import_path.join)(this.getInspectDir(), STATUS_FILE);
  }
  async readStatusReport() {
    const raw = await import_fs.promises.readFile(this.getStatusPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.schema_version !== "v1") {
      throw new Error(`\u4E0D\u652F\u6301\u7684 schema_version\uFF1A${parsed.schema_version || "\u7F3A\u5931"}`);
    }
    if (!parsed.paths || !parsed.ui || !Array.isArray(parsed.ui.badges) || !Array.isArray(parsed.ui.actions)) {
      throw new Error("status-latest.json v1 \u5951\u7EA6\u65E0\u6548");
    }
    return parsed;
  }
  async refreshStatus() {
    try {
      const report = await this.readStatusReport();
      this.cachedReport = report;
      this.renderStatusBar(report);
      return report;
    } catch (error) {
      this.cachedReport = null;
      this.renderStatusBar(null);
      if ((error == null ? void 0 : error.code) !== "ENOENT") {
        console.error("[Xirang Workbench]", error);
      }
      return null;
    }
  }
  async collectWorkbenchData() {
    const report = await this.refreshStatus();
    const files = this.app.vault.getMarkdownFiles();
    const vaultFiles = this.app.vault.getFiles();
    const configuredProjectPrefix = normalizeVaultPrefix(this.settings.projectPrefix);
    const projectPrefix = configuredProjectPrefix || detectProjectPrefix(files) || PROJECT_PREFIX;
    const agentPrefix = normalizeVaultPrefix(this.settings.agentPrefix) || AGENT_PREFIX;
    const projectFiles = files.filter((file) => file.path.startsWith(projectPrefix));
    const scanned = files.filter((file) => file.path.startsWith(projectPrefix) || file.path.startsWith(agentPrefix));
    const projectContents = await Promise.all(
      projectFiles.map(async (file) => ({
        file,
        text: await this.app.vault.cachedRead(file)
      }))
    );
    const currentIteration = detectCurrentIteration(projectFiles, projectContents, report) || "\u672A\u77E5";
    const iterationPrefix = `${projectPrefix}\u8FED\u4EE3/${currentIteration}\u8FED\u4EE3/`;
    const iterationFiles = projectFiles.filter((file) => file.path.startsWith(iterationPrefix));
    const iterationWorkbench = projectContents.find((item) => item.file.path === `${iterationPrefix}\u8FED\u4EE3\u7BA1\u7406/README.md`);
    const iterationMeta = parseFrontmatter((iterationWorkbench == null ? void 0 : iterationWorkbench.text) || "") || {};
    const iterationModuleNames = /* @__PURE__ */ new Set();
    for (const file of iterationFiles) {
      const relativePath = file.path.slice(iterationPrefix.length);
      const topLevel = relativePath.split("/")[0];
      if (topLevel && !topLevel.endsWith(".md") && topLevel !== "\u8FED\u4EE3\u7BA1\u7406") {
        iterationModuleNames.add(topLevel);
      }
    }
    const allTasks = collectTasks(projectContents);
    const focusTasks = currentIteration === "\u672A\u77E5" ? allTasks : allTasks.filter((task) => task.file.startsWith(iterationPrefix));
    const calendar = collectDates(projectContents);
    const noteIssues = collectNoteIssues(projectContents, currentIteration, projectPrefix);
    const agents = collectAgents(projectContents, currentIteration);
    const heatmap = collectHeatmap(projectFiles);
    const knowledgeHealth = await collectKnowledgeHealth(vaultFiles, projectContents, projectPrefix, this.settings);
    const aiSuggestions = buildSuggestions(report, focusTasks, calendar, noteIssues);
    return {
      report,
      projectPrefix,
      currentIteration,
      vaultMarkdownFiles: files.length,
      tasks: focusTasks,
      allTasks,
      historicalOpenTasks: allTasks.filter((task) => !task.done && !task.file.startsWith(iterationPrefix)).length,
      calendar,
      noteIssues,
      agents,
      heatmap,
      scannedFiles: scanned.length,
      projectFiles: projectFiles.length,
      iterationFiles: iterationFiles.length,
      iterationModuleCount: iterationModuleNames.size,
      iterationReleaseDate: iterationMeta.release_date || this.settings.releaseDateFallback || "2026-07-25",
      iterationScopeStatus: iterationMeta.scope_status || "\u672A\u58F0\u660E",
      iterationScopeNote: iterationMeta.scope_note || iterationMeta.scope_status || "\u672A\u58F0\u660E",
      iterationTasks: focusTasks.length,
      iterationOpenTasks: focusTasks.filter((task) => !task.done).length,
      knowledgeHealth,
      aiSuggestions
    };
  }
  async refreshOpenViews() {
    await this.refreshStatus();
    for (const leaf of this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)) {
      const view = leaf.view;
      if (view instanceof V9DashboardView) {
        await view.refresh();
      }
    }
    for (const leaf of this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE)) {
      const view = leaf.view;
      if (view instanceof V9CalendarView) {
        await view.refresh();
      }
    }
  }
  renderStatusBar(report) {
    if (!this.statusBarEl) {
      return;
    }
    if (!report) {
      this.statusBarEl.setText("Xirang: \u672C\u5730\u626B\u63CF");
      return;
    }
    this.statusBarEl.setText(`\u606F\u58E4\uFF1A${statusLabel(report.status)} \xB7 ${report.current_iteration || "-"}`);
  }
  async openTarget(targetKey) {
    var _a, _b;
    const report = (_a = this.cachedReport) != null ? _a : await this.refreshStatus();
    const targetPath = (_b = report == null ? void 0 : report.paths) == null ? void 0 : _b[targetKey];
    if (!targetPath) {
      new import_obsidian.Notice(`\u7F3A\u5C11\u76EE\u6807\u8DEF\u5F84\uFF1A${targetKey}`);
      return;
    }
    await this.openPath(String(targetPath), report);
  }
  async openVaultFile(vaultPath) {
    await this.app.workspace.openLinkText(vaultPath, "", false);
  }
  async openVaultFileInRight(vaultPath) {
    const file = this.app.vault.getAbstractFileByPath(vaultPath);
    if (file instanceof import_obsidian.TFile) {
      try {
        const leaf = this.app.workspace.getLeaf("split", "vertical");
        await leaf.openFile(file);
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
        return;
      } catch (error) {
        console.error("[\u606F\u58E4 Workbench]", error);
      }
    }
    await this.openVaultFile(vaultPath);
  }
  async openPath(path, report) {
    const vaultPath = this.toVaultPath(path, report);
    if (vaultPath) {
      await this.openVaultFile(vaultPath);
      return;
    }
    await openSystemPath(path);
  }
  toVaultPath(targetPath, report) {
    var _a;
    const repoRoot = (_a = report == null ? void 0 : report.paths) == null ? void 0 : _a.repo_root;
    if (!repoRoot) {
      return this.app.vault.getAbstractFileByPath(targetPath) instanceof import_obsidian.TFile ? targetPath : null;
    }
    const relativePath = (0, import_path.relative)(String(repoRoot), targetPath);
    if (relativePath.startsWith("..") || relativePath.startsWith("/") || relativePath === "") {
      return null;
    }
    return relativePath;
  }
};
var XirangWorkbenchSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Xirang Workbench" });
    containerEl.createEl("p", {
      text: "\u914D\u7F6E\u9879\u76EE\u6839\u76EE\u5F55\u3001\u5F53\u524D\u8FED\u4EE3\u8BC6\u522B\u548C\u672C\u5730\u5065\u5EB7\u76D1\u63A7\u3002\u7559\u7A7A\u65F6\u63D2\u4EF6\u4F1A\u81EA\u52A8\u626B\u63CF Vault \u7ED3\u6784\u3002"
    });
    this.textSetting(containerEl, "\u9879\u76EE\u6839\u76EE\u5F55", "\u4F8B\u5982 10-\u9879\u76EE/ \u3002\u7559\u7A7A\u65F6\u81EA\u52A8\u8BC6\u522B\u542B\u6709\u8FED\u4EE3\u76EE\u5F55\u7684\u9879\u76EE\u6839\u3002", "projectPrefix", "10-\u9879\u76EE/");
    this.textSetting(containerEl, "Agent \u76EE\u5F55", "\u7528\u4E8E\u7EDF\u8BA1\u626B\u63CF\u8303\u56F4\u548C\u804C\u8D23\u4E0A\u4E0B\u6587\u3002", "agentPrefix", AGENT_PREFIX);
    this.textSetting(containerEl, "\u5DE1\u68C0\u76EE\u5F55", "\u6307\u5411\u5305\u542B status-latest.json \u7684\u76EE\u5F55\u3002\u7559\u7A7A\u65F6\u4F18\u5148\u8BFB\u73AF\u5883\u53D8\u91CF\uFF0C\u518D\u7528\u9ED8\u8BA4\u672C\u5730\u8DEF\u5F84\u3002", "inspectDir", "~/Desktop/\u6C99\u7BB1/v9-runtime/\u5DE1\u68C0");
    this.textSetting(containerEl, "LLM Wiki MOC", "LLM Wiki \u5165\u53E3\u6587\u4EF6\u3002", "llmWikiMocPath", LLM_WIKI_MOC_PATH);
    this.numberSetting(containerEl, "LLM Wiki \u9884\u671F\u6A21\u5757\u6570", "\u7528\u4E8E LLM Wiki \u6A21\u5757\u5065\u5EB7\u68C0\u67E5\u3002", "llmWikiModuleExpected", LLM_WIKI_MODULE_EXPECTED);
    this.numberSetting(containerEl, "\u8D44\u6599\u6458\u8981\u6700\u5C11\u884C\u6570", "\u6210\u719F\u5EA6\u8FBE\u5230\u6D41\u7A0B\u5C42\u540E\u7684\u6458\u8981\u6DF1\u5EA6\u9608\u503C\u3002", "llmWikiMinSummaryLines", LLM_WIKI_MIN_SUMMARY_LINES);
    this.textSetting(containerEl, "\u9ED8\u8BA4\u53D1\u7248\u65E5\u671F", "\u5F53\u8FED\u4EE3\u7BA1\u7406 README \u6CA1\u6709 release_date \u65F6\u4F7F\u7528\u3002", "releaseDateFallback", "2026-07-25");
    new import_obsidian.Setting(containerEl).setName("GBrain \u5065\u5EB7\u76D1\u63A7").setDesc("\u672C\u5730\u53EF\u9009\u80FD\u529B\u3002\u5173\u95ED\u540E\u4E0D\u4F1A\u56E0\u540C\u4E8B\u672A\u5B89\u88C5 GBrain \u800C\u663E\u793A\u5F02\u5E38\u3002").addToggle((toggle) => {
      toggle.setValue(Boolean(this.plugin.settings.enableGbrain)).onChange(async (value) => {
        this.plugin.settings.enableGbrain = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    this.textSetting(containerEl, "GBrain CLI \u8DEF\u5F84", "\u7559\u7A7A\u65F6\u4F7F\u7528 ~/.npm-global/bin/gbrain\u3002", "gbrainCliPath", "~/.npm-global/bin/gbrain");
    this.textSetting(containerEl, "GBrain DB \u8DEF\u5F84", "\u7559\u7A7A\u65F6\u4F7F\u7528 ~/.gbrain/brain.pglite\u3002", "gbrainDbPath", "~/.gbrain/brain.pglite");
    this.textSetting(containerEl, "GBrain Wiki \u76EE\u5F55", "\u7559\u7A7A\u65F6\u4F7F\u7528 ~/wiki\u3002", "gbrainWikiPath", "~/wiki");
    this.textSetting(containerEl, "GBrain health.log", "\u7528\u4E8E\u8BFB\u53D6 pages/chunks/embedding \u7EDF\u8BA1\u3002", "gbrainHealthLog", "~/.gbrain/health.log");
    this.textSetting(containerEl, "GBrain sync failures", "\u7528\u4E8E\u68C0\u67E5\u672A\u786E\u8BA4\u540C\u6B65\u5931\u8D25\u3002", "gbrainSyncFailuresPath", "~/.gbrain/sync-failures.jsonl");
    new import_obsidian.Setting(containerEl).setName("\u5237\u65B0\u9762\u677F").setDesc("\u4FDD\u5B58\u8DEF\u5F84\u8BBE\u7F6E\u540E\u624B\u52A8\u5237\u65B0\u5DF2\u6253\u5F00\u7684\u4E3B\u63A7\u53F0\u548C\u65E5\u5386\u89C6\u56FE\u3002").addButton((button) => {
      button.setButtonText("\u5237\u65B0").setCta().onClick(async () => {
        await this.plugin.refreshOpenViews();
        new import_obsidian.Notice("Xirang Workbench \u5DF2\u5237\u65B0");
      });
    });
  }
  textSetting(parent, name, desc, key, placeholder) {
    new import_obsidian.Setting(parent).setName(name).setDesc(desc).addText((text) => {
      text.setPlaceholder(placeholder).setValue(String(this.plugin.settings[key] || "")).onChange(async (value) => {
        this.plugin.settings[key] = value.trim();
        await this.plugin.saveSettings(false);
      });
    });
  }
  numberSetting(parent, name, desc, key, placeholder) {
    new import_obsidian.Setting(parent).setName(name).setDesc(desc).addText((text) => {
      text.setPlaceholder(String(placeholder)).setValue(String(this.plugin.settings[key] || "")).onChange(async (value) => {
        const parsed = Number(value);
        this.plugin.settings[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS[key];
        await this.plugin.saveSettings(false);
      });
    });
  }
};
var V9CalendarView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    __publicField(this, "data", null);
    __publicField(this, "monthOffset", 0);
    __publicField(this, "selectedDate", toDateKey(/* @__PURE__ */ new Date()));
  }
  getViewType() {
    return CALENDAR_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u606F\u58E4\u65E5\u5386";
  }
  getIcon() {
    return "calendar-days";
  }
  async onOpen() {
    await this.refresh();
  }
  async onClose() {
    this.contentEl.empty();
  }
  async refresh() {
    this.contentEl.empty();
    this.contentEl.addClass("v9-calendar");
    this.contentEl.createDiv({ cls: "v9-calendar__loading", text: "\u6B63\u5728\u8BFB\u53D6\u606F\u58E4\u65E5\u5386..." });
    this.data = await this.plugin.collectWorkbenchData();
    this.render();
  }
  render() {
    const data = this.data;
    this.contentEl.empty();
    this.contentEl.addClass("v9-calendar");
    if (!data) {
      this.contentEl.createDiv({ cls: "v9-calendar__error", text: "\u65E0\u6CD5\u8BFB\u53D6\u65E5\u5386\u6570\u636E" });
      return;
    }
    const header = this.contentEl.createDiv({ cls: "v9-calendar__header" });
    header.createDiv({ cls: "v9-calendar__title", text: "\u606F\u58E4\u65E5\u5386" });
    header.createDiv({ cls: "v9-calendar__subtitle", text: `\u8FED\u4EE3 ${data.currentIteration} \xB7 ${data.calendar.length} \u6761\u63D0\u9192` });
    renderMonthGrid(this.contentEl, data, this.plugin, "v9-calendar", this.monthOffset, {
      selectedDate: this.selectedDate,
      refresh: () => this.refresh(),
      prev: () => {
        this.monthOffset -= 1;
        this.render();
      },
      current: () => {
        this.monthOffset = 0;
        this.selectedDate = toDateKey(/* @__PURE__ */ new Date());
        this.render();
      },
      next: () => {
        this.monthOffset += 1;
        this.render();
      },
      onDateClick: (date) => {
        this.selectedDate = date;
        this.render();
      }
    });
    const recentEvents = [...data.calendar].sort((a, b) => b.date.localeCompare(a.date) || cleanEventText(b.text).localeCompare(cleanEventText(a.text)));
    const selectedEvents = this.selectedDate ? recentEvents.filter((item) => item.date === this.selectedDate) : recentEvents;
    const sectionHead = this.contentEl.createDiv({ cls: "v9-calendar__section-head" });
    sectionHead.createDiv({
      cls: "v9-calendar__section-title",
      text: this.selectedDate ? `${formatCalendarDate(this.selectedDate)}\u4E8B\u52A1` : "\u8FD1\u671F\u4E8B\u52A1"
    });
    const sectionMeta = sectionHead.createDiv({ cls: "v9-calendar__section-actions" });
    sectionMeta.createSpan({ cls: "v9-calendar__section-count", text: `${selectedEvents.length} \u6761` });
    const scopeTabs = sectionMeta.createDiv({ cls: "v9-calendar__scope-tabs" });
    const todayKey = toDateKey(/* @__PURE__ */ new Date());
    const todayButton = scopeTabs.createEl("button", {
      cls: this.selectedDate === todayKey ? "v9-calendar__scope-button is-active" : "v9-calendar__scope-button",
      text: "\u4ECA\u65E5"
    });
    todayButton.onClickEvent(() => {
      this.selectedDate = todayKey;
      this.monthOffset = 0;
      this.render();
    });
    const allButton = scopeTabs.createEl("button", {
      cls: this.selectedDate ? "v9-calendar__scope-button" : "v9-calendar__scope-button is-active",
      text: "\u5168\u90E8"
    });
    allButton.onClickEvent(() => {
      this.selectedDate = null;
      this.render();
    });
    renderEventCards(this.contentEl, selectedEvents, this.plugin, "v9-calendar", this.selectedDate ? 24 : 12);
  }
};
var V9DashboardView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    __publicField(this, "data", null);
    __publicField(this, "activeTab", "overview");
    __publicField(this, "taskFilter", "open");
    __publicField(this, "taskQuery", "");
    __publicField(this, "aiMode", "brief");
    __publicField(this, "monthOffset", 0);
  }
  getViewType() {
    return DASHBOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u606F\u58E4\u4E3B\u63A7\u53F0";
  }
  getIcon() {
    return "monitor";
  }
  async onOpen() {
    await this.refresh();
  }
  async onClose() {
    this.contentEl.empty();
  }
  async refresh() {
    this.contentEl.empty();
    this.contentEl.addClass("v9-dashboard");
    this.contentEl.createDiv({ cls: "v9-dashboard__loading", text: "\u6B63\u5728\u8BFB\u53D6\u606F\u58E4\u4E3B\u63A7\u53F0..." });
    this.data = await this.plugin.collectWorkbenchData();
    this.render();
  }
  render() {
    const data = this.data;
    this.contentEl.empty();
    this.contentEl.addClass("v9-dashboard");
    if (!data) {
      this.contentEl.createDiv({ cls: "v9-dashboard__error", text: "\u65E0\u6CD5\u8BFB\u53D6\u4E3B\u63A7\u53F0\u6570\u636E" });
      return;
    }
    const report = data.report;
    const shell = this.contentEl.createDiv({ cls: "v9-dashboard__shell" });
    const top = shell.createDiv({ cls: "v9-dashboard__top" });
    const brand = top.createDiv({ cls: "v9-dashboard__intro" });
    brand.createDiv({ cls: "v9-dashboard__eyebrow", text: "\u667A\u80FD\u4F53\u5DE5\u4F5C\u53F0" });
    brand.createDiv({ cls: "v9-dashboard__title", text: "\u606F\u58E4\u4E3B\u63A7\u53F0" });
    brand.createDiv({ cls: "v9-dashboard__intro-text", text: "\u53EA\u8BFB\u8FDE\u63A5\u8D44\u6599\u5E93\u3001\u5F53\u524D\u8FED\u4EE3\u548C\u5DE1\u68C0\u7ED3\u679C\uFF0C\u7528\u6765\u67E5\u770B\u9879\u76EE\u72B6\u6001\u548C\u6253\u5F00\u6E90\u6587\u4EF6\u3002" });
    const controls = top.createDiv({ cls: "v9-dashboard__controls" });
    controls.createSpan({ cls: "v9-dashboard__sync", text: `\u7248\u672C\uFF1A${PLUGIN_VERSION}` });
    controls.createSpan({ cls: `v9-dashboard__live is-${(report == null ? void 0 : report.status) || "yellow"}`, text: `\u5DE1\u68C0\u72B6\u6001\uFF1A${statusLabel((report == null ? void 0 : report.status) || "yellow")}` });
    const tabs = shell.createDiv({ cls: "v9-dashboard__tabs" });
    const tabItems = [
      { id: "overview", label: "\u603B\u89C8" },
      { id: "today", label: "\u4ECA\u65E5" },
      { id: "vault", label: "\u8D44\u6599" },
      { id: "pulse", label: "\u8D8B\u52BF" }
    ];
    for (const tab of tabItems) {
      const button = tabs.createEl("button", { cls: tab.id === this.activeTab ? "is-active" : "", text: tab.label });
      button.onClickEvent(() => {
        this.activeTab = tab.id;
        this.render();
      });
    }
    if (this.activeTab === "overview") {
      this.renderOverview(shell, data);
    } else if (this.activeTab === "today") {
      this.renderToday(shell, data);
    } else if (this.activeTab === "vault") {
      this.renderVault(shell, data);
    } else {
      this.renderPulse(shell, data);
    }
  }
  renderOverview(shell, data) {
    var _a, _b;
    const report = data.report;
    const reportParts = (report == null ? void 0 : report.parts) || {};
    const evalPart = reportParts.harness_eval || {};
    const evalSummary = evalPart.summary || {};
    const iterationPart = reportParts.iteration_ops || {};
    const iterationSummary = iterationPart.summary || {};
    const openTasks = data.tasks.filter((task) => !task.done);
    const overdueTasks = openTasks.filter((task) => task.overdue);
    const findings = ((_b = (_a = report == null ? void 0 : report.parts) == null ? void 0 : _a.iteration_ops) == null ? void 0 : _b.findings) || [];
    const noteErrors = data.noteIssues.filter((item) => item.level === "\u5F02\u5E38");
    this.sectionLabel(shell, "\u8FD0\u884C\u5FEB\u7167", "\u5F53\u524D\u8FED\u4EE3\u3001\u5DE1\u68C0\u3001\u5F85\u529E\u548C\u7B14\u8BB0\u72B6\u6001");
    const statusMetrics = shell.createDiv({ cls: "v9-dashboard__status-metrics" });
    this.statusMetric(statusMetrics, "\u603B\u72B6\u6001", statusLabel((report == null ? void 0 : report.status) || "yellow"), (report == null ? void 0 : report.status) || "yellow", `\u8FED\u4EE3 ${data.currentIteration}`, "\u7EFC\u5408\u5DE1\u68C0\u3001\u8FED\u4EE3\u6CBB\u7406\u548C\u672C\u5730\u7B14\u8BB0\u626B\u63CF\u7684\u5F53\u524D\u7ED3\u8BBA\u3002");
    this.statusMetric(statusMetrics, "\u56DE\u5F52\u6D4B\u8BD5", `${num(evalSummary.passed)}/${num(evalSummary.total)}`, evalPart.status || "yellow", statusLabel(evalPart.status || "yellow"), "\u5DE1\u68C0\u62A5\u544A\u91CC\u7684\u56DE\u5F52\u7528\u4F8B\u901A\u8FC7\u60C5\u51B5\u3002");
    this.statusMetric(statusMetrics, "\u8FED\u4EE3\u6CBB\u7406", `P1 ${num(iterationSummary.p1)} \xB7 \u63D0\u793A ${num(iterationSummary.advisory)}`, iterationPart.status || "yellow", statusLabel(iterationPart.status || "yellow"), "\u8FED\u4EE3\u6587\u6863\u3001\u804C\u8D23\u6620\u5C04\u3001\u590D\u76D8\u5951\u7EA6\u7B49\u6CBB\u7406\u89C4\u5219\u7684\u5DE1\u68C0\u7ED3\u679C\u3002");
    this.statusMetric(statusMetrics, "\u5F85\u529E", `${openTasks.length} \u4E2A\u672A\u5B8C\u6210`, overdueTasks.length ? "red" : "green", `${overdueTasks.length} \u4E2A\u903E\u671F`, "\u4EC5\u7EDF\u8BA1\u5F53\u524D\u8FED\u4EE3\u6587\u4EF6\u4E2D\u7684\u5F85\u529E\uFF0C\u5386\u53F2\u57FA\u7EBF\u6E05\u5355\u4E0D\u518D\u6DF7\u5165\u4E3B\u770B\u677F\u3002");
    this.statusMetric(statusMetrics, "\u7B14\u8BB0\u76D1\u63A7", `${data.noteIssues.length} \u4E2A\u95EE\u9898`, noteErrors.length ? "red" : data.noteIssues.length ? "yellow" : "green", `${noteErrors.length} \u4E2A\u5F02\u5E38`, "\u626B\u63CF\u5F53\u524D\u8FED\u4EE3\u7B14\u8BB0\u5143\u6570\u636E\u3001\u53CC\u65F6\u95F4\u548C\u72B6\u6001\u673A\u5B57\u6BB5\u3002");
    const heatSection = shell.createDiv({ cls: "v9-dashboard__panel" });
    this.infoIcon(heatSection, "\u8FD1 70 \u5929\u9879\u76EE\u6587\u4EF6\u4FEE\u6539\u6B21\u6570\u7684\u65E5\u5EA6\u5206\u5E03\u3002");
    heatSection.createDiv({ cls: "v9-dashboard__panel-title", text: "\u9879\u76EE\u6587\u4EF6\u6D3B\u8DC3\u5EA6" });
    heatSection.createDiv({ cls: "v9-dashboard__panel-subtitle", text: `\u8FD1 70 \u5929\u9879\u76EE\u6587\u4EF6\u4FEE\u6539 \xB7 ${data.projectFiles} \u4E2A\u9879\u76EE\u6587\u4EF6` });
    const heat = heatSection.createDiv({ cls: "v9-dashboard__heatmap", attr: { style: "--v9-dashboard-heat-columns:35" } });
    const max = Math.max(1, ...data.heatmap.map((item) => item.count));
    for (const day of data.heatmap) {
      const level = Math.ceil(day.count / max * 4);
      heat.createDiv({
        cls: `v9-dashboard__heat is-${level}`,
        attr: { title: `${day.date}: ${day.count} \u6B21\u4FEE\u6539` }
      });
    }
    fillHeatmapPlaceholders(heat, data.heatmap.length, 35, 4);
    this.sectionLabel(shell, "\u98CE\u9669\u4E0E\u6D41\u8F6C", "\u7EA2\u9EC4\u706F\u3001\u5F85\u529E\u538B\u529B\u548C\u77E5\u8BC6\u5E93\u5065\u5EB7");
    const burn = shell.createDiv({ cls: "v9-dashboard__burn" });
    this.infoIcon(burn, "\u628A\u5DE1\u68C0\u53D1\u73B0\u3001\u5F53\u524D\u8FED\u4EE3\u5F85\u529E\u548C\u7B14\u8BB0\u95EE\u9898\u653E\u5728\u540C\u4E00\u5F20\u98CE\u9669\u6761\u91CC\u3002");
    const burnText = burn.createDiv();
    burnText.createDiv({ cls: "v9-dashboard__label", text: "\u8FED\u4EE3\u98CE\u9669\u71C3\u70E7" });
    burnText.createDiv({ cls: "v9-dashboard__burn-value", text: `${findings.length ? 16 : 0}%` });
    const bars = burn.createDiv({ cls: "v9-dashboard__bars" });
    this.bar(bars, "\u7EA2\u9EC4\u706F", findings.length, 8);
    this.bar(bars, "\u672A\u5B8C\u6210\u4EFB\u52A1", openTasks.length, Math.max(1, data.tasks.length));
    this.bar(bars, "\u7B14\u8BB0\u95EE\u9898", data.noteIssues.length, Math.max(1, data.projectFiles));
    const cards = shell.createDiv({ cls: "v9-dashboard__cards" });
    this.card(cards, "\u77E5\u8BC6\u5E93\u5065\u5EB7\u5206", `${Math.max(0, 100 - data.noteIssues.length * 5)}`, `${data.noteIssues.length} \u4E2A\u76D1\u63A7\u95EE\u9898`, "green", "\u6309\u5F53\u524D\u8FED\u4EE3\u7B14\u8BB0\u95EE\u9898\u6263\u5206\uFF0C\u7528\u6765\u5FEB\u901F\u5224\u65AD\u8D44\u6599\u6CBB\u7406\u538B\u529B\u3002");
    this.card(cards, "\u7EA2\u9EC4\u706F\u79EF\u538B", `${findings.length}`, findings[0] ? ruleLabel(findings[0].rule_id) : "\u65E0\u963B\u585E", findings.length ? "yellow" : "green", "\u5DE1\u68C0\u4E2D\u672A\u5173\u95ED\u7684\u6CBB\u7406\u53D1\u73B0\u6570\u91CF\u3002");
    this.card(cards, "\u4EFB\u52A1\u6D41\u8F6C\u7387", `${data.tasks.length ? Math.round((data.tasks.length - openTasks.length) / data.tasks.length * 100) : 100}%`, `${openTasks.length} \u672A\u5B8C\u6210\uFF0C${overdueTasks.length} \u903E\u671F`, overdueTasks.length ? "red" : "green", "\u4EC5\u6839\u636E\u5F53\u524D\u8FED\u4EE3\u4EFB\u52A1\u8BA1\u7B97\u6D41\u8F6C\uFF0C\u4E0D\u88AB\u57FA\u7EBF\u5386\u53F2\u6E05\u5355\u62D6\u504F\u3002");
    this.sectionLabel(shell, "\u5F53\u524D\u8FED\u4EE3", "\u8303\u56F4\u3001\u6A21\u5757\u3001\u53D1\u7248\u65E5\u671F\u548C\u9AD8\u9891\u64CD\u4F5C");
    const iterationStrip = shell.createDiv({ cls: "v9-dashboard__iteration-strip" });
    this.iterationStat(iterationStrip, "\u5F53\u524D\u8FED\u4EE3", data.currentIteration, scopeStatusLabel(data.iterationScopeStatus), "\u4ECE\u5DE1\u68C0\u62A5\u544A\u3001\u9879\u76EE\u7D22\u5F15\u6216\u8FED\u4EE3\u6587\u4EF6\u7ED3\u6784\u81EA\u52A8\u8BC6\u522B\u3002");
    this.iterationStat(iterationStrip, "\u529F\u80FD\u6A21\u5757", `${data.iterationModuleCount}`, `${data.iterationFiles} \u4E2A\u8FED\u4EE3\u6587\u4EF6`, "\u6309\u5F53\u524D\u8FED\u4EE3\u76EE\u5F55\u4E0B\u7684\u4E00\u7EA7\u6A21\u5757\u76EE\u5F55\u8BA1\u6570\u3002");
    this.iterationStat(iterationStrip, "\u53D1\u7248\u65E5\u671F", formatReleaseDate(data.iterationReleaseDate), data.iterationReleaseDate, "\u6765\u81EA\u5F53\u524D\u8FED\u4EE3\u7BA1\u7406 README\uFF0C\u7F3A\u5931\u65F6\u9ED8\u8BA4\u4F7F\u7528 2026-07-25\u3002");
    this.iterationStat(iterationStrip, "\u5F53\u524D\u63D0\u793A", compact(data.iterationScopeNote, 32), "\u8303\u56F4\u72B6\u6001", "\u5C55\u793A\u5F53\u524D\u8FED\u4EE3\u8303\u56F4\u5907\u6CE8\u6216\u72B6\u6001\u6458\u8981\u3002");
    const actionPanel = shell.createDiv({ cls: "v9-dashboard__panel is-key-actions" });
    actionPanel.createDiv({ cls: "v9-dashboard__panel-title", text: "\u5173\u952E\u5165\u53E3" });
    actionPanel.createDiv({ cls: "v9-dashboard__panel-subtitle", text: "\u603B\u89C8\u9875\u53EA\u653E\u9AD8\u9891\u5165\u53E3\uFF1A\u770B\u7EA2\u706F\u3001\u770B\u8FED\u4EE3\u3001\u5F00\u65E5\u5386\u3001\u590D\u5236\u63A5\u624B\u4E0A\u4E0B\u6587\u3002" });
    const actions = actionPanel.createDiv({ cls: "v9-dashboard__actions" });
    const badgeTargets = (report == null ? void 0 : report.ui.badges) || [];
    for (const badge of badgeTargets) {
      const button = actions.createEl("button", {
        cls: `v9-dashboard__button is-${badge.status}`,
        text: `${badgeLabel(badge)}\uFF1A${statusLabel(badge.status)}`
      });
      button.onClickEvent(() => this.plugin.openTarget(badge.target));
    }
    const calendar = actions.createEl("button", { cls: "v9-dashboard__button", text: "\u6253\u5F00\u606F\u58E4\u65E5\u5386" });
    calendar.onClickEvent(() => this.plugin.openCalendar());
    const copy = actions.createEl("button", { cls: "v9-dashboard__button", text: "\u590D\u5236\u63A5\u624B\u4E0A\u4E0B\u6587" });
    copy.onClickEvent(async () => {
      await navigator.clipboard.writeText(buildAiDraft("handoff", "\u8BF7\u63A5\u624B\u5F53\u524D\u606F\u58E4\u8FED\u4EE3\u6CBB\u7406\u3002", data));
      new import_obsidian.Notice("\u5DF2\u590D\u5236\u606F\u58E4\u63A5\u624B\u4E0A\u4E0B\u6587");
    });
    this.sectionLabel(shell, "\u8D44\u6599\u4E0E\u77E5\u8BC6", "\u5E93\u5185\u89C4\u6A21\u3001\u5F53\u524D\u8FED\u4EE3\u3001LLM Wiki\u3001GBrain \u548C\u65AD\u94FE");
    const overviewPanel = shell.createDiv({ cls: "v9-dashboard__panel" });
    this.infoIcon(overviewPanel, "\u628A Vault\u3001\u9879\u76EE\u6839\u76EE\u5F55\u548C\u5F53\u524D\u8FED\u4EE3\u653E\u5728\u540C\u4E00\u5C42\u770B\uFF0C\u4FBF\u4E8E\u5224\u65AD\u626B\u63CF\u8303\u56F4\u662F\u5426\u6B63\u786E\u3002");
    overviewPanel.createDiv({ cls: "v9-dashboard__panel-title", text: "\u8D44\u6599\u603B\u89C8" });
    overviewPanel.createDiv({ cls: "v9-dashboard__panel-subtitle", text: "\u628A\u8D44\u6599\u5E93\u3001\u5955\u5883\u9879\u76EE\u3001\u5F53\u524D\u8FED\u4EE3\u653E\u5230\u540C\u4E00\u5C4F\uFF0C\u5148\u770B\u89C4\u6A21\u548C\u5F85\u5904\u7406\u91CF\u3002" });
    const overviewStats = overviewPanel.createDiv({ cls: "v9-dashboard__overview-grid" });
    this.overviewStat(overviewStats, "\u8D44\u6599\u5E93\u7B14\u8BB0", `${data.vaultMarkdownFiles}`, `\u6CBB\u7406\u626B\u63CF ${data.scannedFiles} \xB7 \u95EE\u9898 ${data.noteIssues.length}`, "\u5F53\u524D Vault \u91CC\u7684 Markdown \u603B\u91CF\uFF0C\u4EE5\u53CA\u63D2\u4EF6\u7EB3\u5165\u6CBB\u7406\u626B\u63CF\u7684\u6587\u4EF6\u6570\u3002");
    this.overviewStat(overviewStats, "\u5955\u5883\u9879\u76EE", `${data.projectFiles}`, `\u5386\u53F2\u4EFB\u52A1 ${data.allTasks.length} \xB7 \u63D0\u9192 ${data.calendar.length}`, "\u9879\u76EE\u6839\u76EE\u5F55\u4E0B\u7684\u6587\u4EF6\u6570\uFF0C\u8FD9\u91CC\u4FDD\u7559\u5168\u9879\u76EE\u5386\u53F2\u4EFB\u52A1\u4F5C\u4E3A\u80CC\u666F\u3002");
    this.overviewStat(overviewStats, "\u5F53\u524D\u8FED\u4EE3", `${data.iterationFiles}`, `\u4EFB\u52A1 ${data.iterationTasks} \xB7 \u672A\u5B8C\u6210 ${data.iterationOpenTasks}`, "\u53EA\u7EDF\u8BA1\u81EA\u52A8\u8BC6\u522B\u51FA\u7684\u5F53\u524D\u8FED\u4EE3\u8DEF\u5F84\u3002");
    const knowledgePanel = shell.createDiv({ cls: "v9-dashboard__panel" });
    this.infoIcon(knowledgePanel, "\u540C\u65F6\u68C0\u67E5 LLM Wiki \u5165\u53E3\u3001GBrain \u7D22\u5F15\u65E5\u5FD7\u548C\u9879\u76EE\u5185 Wiki \u65AD\u94FE\u3002");
    knowledgePanel.createDiv({ cls: "v9-dashboard__panel-title", text: "LLM Wiki + GBrain \u5065\u5EB7\u76D1\u63A7" });
    knowledgePanel.createDiv({ cls: "v9-dashboard__panel-subtitle", text: "\u68C0\u67E5\u77E5\u8BC6\u5E93\u5165\u53E3\u3001\u6A21\u5757\u6210\u719F\u5EA6\u3001\u672C\u5730 Wiki \u548C GBrain \u7D22\u5F15\u72B6\u6001\u3002" });
    const knowledgeGrid = knowledgePanel.createDiv({ cls: "v9-dashboard__knowledge-grid" });
    this.healthCard(knowledgeGrid, data.knowledgeHealth.llmWiki, () => this.plugin.openVaultFile(data.knowledgeHealth.llmWiki.targetPath));
    this.healthCard(knowledgeGrid, data.knowledgeHealth.gbrain, () => {
      if (data.knowledgeHealth.gbrain.targetPath) {
        openSystemPath(data.knowledgeHealth.gbrain.targetPath);
      } else {
        new import_obsidian.Notice("GBrain \u672A\u914D\u7F6E\u672C\u5730\u5065\u5EB7\u65E5\u5FD7");
      }
    });
    this.healthCard(knowledgeGrid, data.knowledgeHealth.brokenLinks, () => {
      const issue = data.knowledgeHealth.brokenLinks.issues[0] || "";
      const target = issue.includes(" -> ") ? issue.split(" -> ")[0] : `${data.projectPrefix}README.md`;
      this.plugin.openVaultFile(target);
    });
    this.sectionLabel(shell, "\u5FEB\u6377\u5165\u53E3", "\u56DE\u5230\u5E93\u5185\u6E90\u6587\u4EF6");
    const lower = shell.createDiv({ cls: "v9-dashboard__lower" });
    const vaultPanel = lower.createDiv({ cls: "v9-dashboard__panel" });
    this.infoIcon(vaultPanel, "\u8FD9\u4E9B\u6309\u94AE\u76F4\u63A5\u6253\u5F00 Vault \u5185\u7684\u6E90\u6587\u4EF6\uFF0C\u4E0D\u5728\u63D2\u4EF6\u91CC\u4FEE\u6539\u5185\u5BB9\u3002");
    vaultPanel.createDiv({ cls: "v9-dashboard__panel-title", text: "\u8D44\u6599\u5E93\u5FEB\u6377\u5165\u53E3" });
    vaultPanel.createDiv({ cls: "v9-dashboard__panel-subtitle", text: "\u5DE5\u4F5C\u53F0\u53EA\u505A\u5BFC\u822A\u548C\u76D1\u63A7\uFF0C\u771F\u5B9E\u6210\u679C\u4ECD\u56DE\u5230\u5E93\u5185\u6587\u4EF6\u3002" });
    const vaultLinks = vaultPanel.createDiv({ cls: "v9-dashboard__shortcut-grid" });
    this.shortcut(vaultLinks, "\u9879\u76EE\u603B\u89C8", `${data.projectPrefix}README.md`);
    this.shortcut(vaultLinks, "\u5F53\u524D\u8FED\u4EE3", `${data.projectPrefix}\u8FED\u4EE3/${data.currentIteration}\u8FED\u4EE3/\u8FED\u4EE3\u7BA1\u7406/README.md`);
    this.shortcut(vaultLinks, "\u5955\u5883\u7D22\u5F15", "00-MOC/\u5955\u5883DMS-MOC.md");
    this.shortcut(vaultLinks, "\u5DE5\u4F5C\u53F0\u7B14\u8BB0", "00-MOC/\u5DE5\u4F5C\u53F0.md");
  }
  renderToday(shell, data) {
    const openTasks = data.tasks.filter((task) => !task.done);
    const overdueTasks = openTasks.filter((task) => task.overdue);
    const filteredTasks = this.filterTasks(data.tasks);
    const filteredOpen = filteredTasks.filter((task) => !task.done);
    const filteredDone = filteredTasks.filter((task) => task.done);
    const taskPanel = shell.createDiv({ cls: "v9-dashboard__panel" });
    taskPanel.createDiv({ cls: "v9-dashboard__panel-title", text: "\u4EFB\u52A1\u770B\u677F" });
    taskPanel.createDiv({
      cls: "v9-dashboard__panel-subtitle",
      text: `\u5F53\u524D\u5339\u914D ${filteredTasks.length} \u4E2A\u4EFB\u52A1\uFF0C\u70B9\u51FB\u4EFB\u52A1\u53EF\u6253\u5F00\u6E90\u6587\u4EF6\u3002`
    });
    const taskTools = taskPanel.createDiv({ cls: "v9-dashboard__toolbar" });
    const filters = [
      { id: "open", label: "\u672A\u5B8C\u6210" },
      { id: "overdue", label: "\u903E\u671F" },
      { id: "done", label: "\u5DF2\u5B8C\u6210" },
      { id: "all", label: "\u5168\u90E8" }
    ];
    for (const filter of filters) {
      const button = taskTools.createEl("button", {
        cls: filter.id === this.taskFilter ? "v9-dashboard__button is-active" : "v9-dashboard__button",
        text: filter.label
      });
      button.onClickEvent(() => {
        this.taskFilter = filter.id;
        this.render();
      });
    }
    const search = taskTools.createEl("input", {
      cls: "v9-dashboard__input",
      attr: { type: "search", placeholder: "\u641C\u7D22\u4EFB\u52A1\u6216\u6587\u4EF6", value: this.taskQuery }
    });
    search.addEventListener("change", () => {
      this.taskQuery = search.value.trim();
      this.render();
    });
    const clear = taskTools.createEl("button", { cls: "v9-dashboard__button", text: "\u6E05\u7A7A" });
    clear.onClickEvent(() => {
      this.taskQuery = "";
      this.render();
    });
    const lanes = taskPanel.createDiv({ cls: "v9-dashboard__lanes" });
    this.taskLane(lanes, "\u903E\u671F", filteredOpen.filter((task) => task.overdue).slice(0, 8), "red");
    this.taskLane(lanes, "\u5F85\u5904\u7406", filteredOpen.filter((task) => !task.overdue).slice(0, 10), "yellow");
    this.taskLane(lanes, "\u5DF2\u5B8C\u6210", filteredDone.slice(0, 8), "green");
  }
  renderVault(shell, data) {
    var _a, _b, _c, _d;
    const report = data.report;
    const iterationSummary = ((_b = (_a = report == null ? void 0 : report.parts) == null ? void 0 : _a.iteration_ops) == null ? void 0 : _b.summary) || {};
    const findings = ((_d = (_c = report == null ? void 0 : report.parts) == null ? void 0 : _c.iteration_ops) == null ? void 0 : _d.findings) || [];
    const cards = shell.createDiv({ cls: "v9-dashboard__cards" });
    this.card(cards, "\u63A7\u5236\u9762\u6587\u4EF6", `${num(iterationSummary.managed_docs_found)}/${num(iterationSummary.managed_docs_expected)}`, "\u8FED\u4EE3\u7BA1\u7406\u6587\u6863", findings.length ? "yellow" : "green");
    this.card(cards, "\u7B14\u8BB0\u76D1\u63A7", `${data.noteIssues.length}`, "\u5143\u6570\u636E / \u72B6\u6001\u673A / \u53CC\u65F6\u95F4", data.noteIssues.some((item) => item.level === "\u5F02\u5E38") ? "red" : "yellow");
    this.card(cards, "\u9879\u76EE\u6587\u4EF6", `${data.projectFiles}`, `\u626B\u63CF ${data.scannedFiles} \u4E2A\u76F8\u5173\u6587\u4EF6`, "green");
    const grid = shell.createDiv({ cls: "v9-dashboard__split" });
    const projectPanel = grid.createDiv({ cls: "v9-dashboard__panel" });
    projectPanel.createDiv({ cls: "v9-dashboard__panel-title", text: "\u5F53\u524D\u8FED\u4EE3\u6CBB\u7406" });
    projectPanel.createDiv({
      cls: "v9-dashboard__panel-subtitle",
      text: "\u8FD9\u91CC\u4E0D\u662F\u9879\u76EE\u5217\u8868\uFF0C\u800C\u662F\u5F53\u524D\u8FED\u4EE3\u7684\u6CBB\u7406\u68C0\u67E5\uFF1A\u63A7\u5236\u9762\u6587\u4EF6\u3001\u89C6\u89C9\u9884\u89C8\u3001\u590D\u76D8\u5951\u7EA6\u3001\u804C\u8D23\u6620\u5C04\u3002"
    });
    const badges = projectPanel.createDiv({ cls: "v9-dashboard__badges" });
    for (const badge of (report == null ? void 0 : report.ui.badges) || []) {
      const button = badges.createEl("button", {
        cls: `v9-dashboard__button is-${badge.status}`,
        text: `${badgeLabel(badge)}\uFF1A${statusLabel(badge.status)}`
      });
      button.onClickEvent(() => this.plugin.openTarget(badge.target));
    }
    const progress = projectPanel.createDiv({ cls: "v9-dashboard__progress-grid" });
    this.progress(progress, "\u63A7\u5236\u9762\u6587\u4EF6", num(iterationSummary.managed_docs_found), num(iterationSummary.managed_docs_expected));
    this.progress(progress, "\u89C6\u89C9\u9884\u89C8", num(iterationSummary.visual_artifacts_checked), 3);
    this.progress(progress, "\u590D\u76D8\u5951\u7EA6", num(iterationSummary.review_contracts_checked), 1);
    this.progress(progress, "\u804C\u8D23\u6620\u5C04", num(iterationSummary.agent_assignments_checked), 1);
    const monitorPanel = grid.createDiv({ cls: "v9-dashboard__panel" });
    monitorPanel.createDiv({ cls: "v9-dashboard__panel-title", text: "\u7B14\u8BB0\u72B6\u6001\u76D1\u63A7" });
    monitorPanel.createDiv({ cls: "v9-dashboard__panel-subtitle", text: "\u6309\u5E93\u5185\u6587\u4EF6\u5217\u51FA\u5143\u6570\u636E\u3001\u72B6\u6001\u673A\u548C\u53CC\u65F6\u95F4\u5B57\u6BB5\u95EE\u9898\uFF1B\u70B9\u51FB\u53EF\u6253\u5F00\u6E90\u6587\u4EF6\u3002" });
    const issueList = monitorPanel.createDiv({ cls: "v9-dashboard__events" });
    for (const issue of data.noteIssues.slice(0, 16)) {
      renderDashboardEventCard(issueList, {
        cls: issue.level === "\u5F02\u5E38" ? "is-risk" : "",
        date: issue.level,
        module: moduleLabel(issue.file),
        title: issue.message,
        text: displayPath(issue.file),
        onClick: () => this.plugin.openVaultFile(issue.file)
      });
    }
  }
  renderPulse(shell, data) {
    var _a, _b;
    const report = data.report;
    const findings = ((_b = (_a = report == null ? void 0 : report.parts) == null ? void 0 : _a.iteration_ops) == null ? void 0 : _b.findings) || [];
    const openTasks = data.tasks.filter((task) => !task.done);
    const cards = shell.createDiv({ cls: "v9-dashboard__cards" });
    this.card(cards, "\u98CE\u9669\u8D8B\u52BF", `${findings.length}`, "\u5F53\u524D\u7EA2\u9EC4\u706F", findings.length ? "yellow" : "green");
    this.card(cards, "\u4EFB\u52A1\u6D41", `${data.tasks.length ? Math.round((data.tasks.length - openTasks.length) / data.tasks.length * 100) : 100}%`, `${openTasks.length} \u672A\u5B8C\u6210`, "green");
    this.card(cards, "\u667A\u80FD\u4F53\u8FD0\u884C", `${data.agents.length}`, "\u5F53\u524D\u804C\u8D23\u6620\u5C04", "green");
    const explainer = shell.createDiv({ cls: "v9-dashboard__panel" });
    explainer.createDiv({ cls: "v9-dashboard__panel-title", text: "\u8D8B\u52BF\u9875\u770B\u4EC0\u4E48" });
    explainer.createDiv({
      cls: "v9-dashboard__panel-subtitle",
      text: "\u8FD9\u91CC\u4E0D\u662F\u804A\u5929\u9875\uFF0C\u800C\u662F\u770B\u606F\u58E4\u662F\u5426\u5728\u53D8\u597D\uFF1A\u98CE\u9669\u6709\u6CA1\u6709\u4E0B\u964D\uFF0C\u4EFB\u52A1\u6709\u6CA1\u6709\u6D41\u52A8\uFF0C\u6587\u4EF6\u6709\u6CA1\u6709\u6301\u7EED\u66F4\u65B0\uFF0C\u804C\u8D23\u6709\u6CA1\u6709\u4EBA\u63A5\u3002"
    });
    const heatSection = shell.createDiv({ cls: "v9-dashboard__panel" });
    heatSection.createDiv({ cls: "v9-dashboard__panel-title", text: "\u53EF\u89C6\u5316\u56FE\u8868" });
    heatSection.createDiv({ cls: "v9-dashboard__panel-subtitle", text: "\u8FD1 70 \u5929\u9879\u76EE\u6587\u4EF6\u4FEE\u6539\u70ED\u529B\u56FE" });
    const heat = heatSection.createDiv({ cls: "v9-dashboard__heatmap", attr: { style: "--v9-dashboard-heat-columns:35" } });
    const max = Math.max(1, ...data.heatmap.map((item) => item.count));
    for (const day of data.heatmap) {
      const level = Math.ceil(day.count / max * 4);
      heat.createDiv({
        cls: `v9-dashboard__heat is-${level}`,
        attr: { title: `${day.date}: ${day.count} \u6B21\u4FEE\u6539` }
      });
    }
    fillHeatmapPlaceholders(heat, data.heatmap.length, 35, 4);
    const lower = shell.createDiv({ cls: "v9-dashboard__lower" });
    const risks = lower.createDiv({ cls: "v9-dashboard__panel" });
    risks.createDiv({ cls: "v9-dashboard__panel-title", text: "\u98CE\u9669\u8D8B\u52BF\u5165\u53E3" });
    const riskList = risks.createEl("ul", { cls: "v9-dashboard__list" });
    for (const finding of findings.slice(0, 8)) {
      riskList.createEl("li", { text: `${severityLabel(finding.severity)} \xB7 ${ruleLabel(finding.rule_id)}` });
    }
    const agents = lower.createDiv({ cls: "v9-dashboard__panel" });
    agents.createDiv({ cls: "v9-dashboard__panel-title", text: "\u667A\u80FD\u4F53\u8FD0\u884C" });
    const agentList = agents.createEl("ul", { cls: "v9-dashboard__list" });
    for (const agent of data.agents.slice(0, 8)) {
      agentList.createEl("li", { text: `${agent.owner} \xB7 ${agent.role} \xB7 ${agent.status}` });
    }
  }
  sectionLabel(parent, title, detail) {
    const label = parent.createDiv({ cls: "v9-dashboard__section-label" });
    label.createSpan({ cls: "v9-dashboard__section-title", text: title });
    if (detail) {
      label.createSpan({ cls: "v9-dashboard__section-detail", text: detail });
    }
  }
  infoIcon(parent, text) {
    const icon = parent.createSpan({
      cls: "v9-dashboard__info",
      attr: {
        "aria-label": text,
        "aria-label-position": "right"
      }
    });
    try {
      (0, import_obsidian.setIcon)(icon, "circle-alert");
    } catch (error) {
      icon.setText("!");
    }
  }
  taskLane(parent, title, tasks, status) {
    const lane = parent.createDiv({ cls: `v9-dashboard__lane is-${status}` });
    const header = lane.createDiv({ cls: "v9-dashboard__lane-header" });
    header.createDiv({ cls: "v9-dashboard__panel-title", text: title });
    header.createDiv({ cls: "v9-dashboard__count", text: `${tasks.length}` });
    const list = lane.createDiv({ cls: "v9-dashboard__task-cards" });
    for (const task of tasks) {
      const card = list.createEl("button", { cls: `v9-dashboard__task-card is-${taskStatus(task)}` });
      card.onClickEvent(() => this.plugin.openVaultFile(task.file));
      const top = card.createDiv({ cls: "v9-dashboard__task-top" });
      top.createSpan({ cls: "v9-dashboard__tag", text: moduleLabel(task.file) });
      top.createSpan({ cls: "v9-dashboard__tag", text: task.date || "\u65E0\u65E5\u671F" });
      card.createDiv({ cls: "v9-dashboard__task-title", text: trimTask(task.text) });
      card.createDiv({ cls: "v9-dashboard__task-meta", text: `${taskStatusLabel(task)} \xB7 ${compact(displayPath(task.file), 44)}` });
    }
    if (!tasks.length) {
      list.createDiv({ cls: "v9-dashboard__empty", text: "\u6682\u65E0" });
    }
  }
  filterTasks(tasks) {
    const query = this.taskQuery.toLowerCase();
    return tasks.filter((task) => {
      if (this.taskFilter === "open" && task.done) {
        return false;
      }
      if (this.taskFilter === "overdue" && (!task.overdue || task.done)) {
        return false;
      }
      if (this.taskFilter === "done" && !task.done) {
        return false;
      }
      if (!query) {
        return true;
      }
      return `${task.text} ${task.file}`.toLowerCase().includes(query);
    });
  }
  progress(parent, label, value, total) {
    const item = parent.createDiv({ cls: "v9-dashboard__progress" });
    item.createDiv({ cls: "v9-dashboard__progress-label", text: `${label} ${value}/${total || 0}` });
    const track = item.createDiv({ cls: "v9-dashboard__progress-track" });
    const width = total ? Math.min(100, Math.round(value / total * 100)) : 0;
    track.createDiv({ cls: "v9-dashboard__progress-bar", attr: { style: `width:${width}%` } });
  }
  bar(parent, label, value, total) {
    const row = parent.createDiv({ cls: "v9-dashboard__bar-row" });
    row.createDiv({ cls: "v9-dashboard__bar-label", text: label });
    const track = row.createDiv({ cls: "v9-dashboard__bar-track" });
    const width = Math.min(100, Math.round(value / total * 100));
    track.createDiv({ cls: "v9-dashboard__bar-fill", attr: { style: `width:${width}%` } });
    row.createDiv({ cls: "v9-dashboard__bar-value", text: `${value}` });
  }
  card(parent, title, value, detail, status, explanation) {
    const card = parent.createDiv({ cls: `v9-dashboard__card is-${status}` });
    this.infoIcon(card, explanation || detail);
    card.createDiv({ cls: "v9-dashboard__label", text: title });
    card.createDiv({ cls: "v9-dashboard__card-value", text: value });
    card.createDiv({ cls: "v9-dashboard__card-detail", text: detail });
  }
  statusMetric(parent, label, value, status, detail, explanation) {
    const item = parent.createDiv({ cls: `v9-dashboard__status-metric is-${status}` });
    this.infoIcon(item, explanation || detail);
    item.createDiv({ cls: "v9-dashboard__status-label", text: label });
    item.createDiv({ cls: "v9-dashboard__status-value", text: value });
    item.createDiv({ cls: "v9-dashboard__status-detail", text: detail });
  }
  shortcut(parent, label, path) {
    const button = parent.createEl("button", { cls: "v9-dashboard__shortcut", text: label });
    button.onClickEvent(() => this.plugin.openVaultFile(path));
  }
  overviewStat(parent, label, value, detail, explanation) {
    const item = parent.createDiv({ cls: "v9-dashboard__overview-stat" });
    this.infoIcon(item, explanation || detail);
    item.createDiv({ cls: "v9-dashboard__overview-label", text: label });
    item.createDiv({ cls: "v9-dashboard__overview-value", text: value });
    item.createDiv({ cls: "v9-dashboard__overview-detail", text: detail });
  }
  iterationStat(parent, label, value, detail, explanation) {
    const item = parent.createDiv({ cls: "v9-dashboard__iteration-stat" });
    this.infoIcon(item, explanation || detail);
    item.createDiv({ cls: "v9-dashboard__iteration-label", text: label });
    item.createDiv({ cls: "v9-dashboard__iteration-value", text: value });
    item.createDiv({ cls: "v9-dashboard__iteration-detail", text: detail });
  }
  healthCard(parent, item, onClick) {
    const card = parent.createEl("button", { cls: `v9-dashboard__knowledge-card is-${item.status}` });
    card.onClickEvent(onClick);
    this.infoIcon(card, item.tooltip || item.detail);
    const top = card.createDiv({ cls: "v9-dashboard__knowledge-top" });
    top.createSpan({ cls: "v9-dashboard__knowledge-title", text: item.title });
    top.createSpan({ cls: "v9-dashboard__knowledge-status", text: statusLabel(item.status) });
    card.createDiv({ cls: "v9-dashboard__knowledge-value", text: item.value });
    card.createDiv({ cls: "v9-dashboard__knowledge-detail", text: item.detail });
    const issues = item.issues.slice(0, 2);
    if (issues.length) {
      const list = card.createEl("ul", { cls: "v9-dashboard__knowledge-issues" });
      for (const issue of issues) {
        list.createEl("li", { text: compact(issue, 42) });
      }
    }
  }
};
function fillHeatmapPlaceholders(parent, visibleCount, columns, minRows) {
  const target = Math.max(visibleCount, columns * minRows);
  for (let index = visibleCount; index < target; index += 1) {
    parent.createDiv({
      cls: "v9-dashboard__heat is-empty",
      attr: { title: "\u5360\u4F4D\u683C\uFF1A\u4FDD\u6301\u70ED\u529B\u56FE\u6700\u4F4E\u56DB\u884C" }
    });
  }
}
async function collectKnowledgeHealth(files, contents, projectPrefix = PROJECT_PREFIX, settings = DEFAULT_SETTINGS) {
  const llmWiki = collectLlmWikiHealth(files, contents, projectPrefix, settings);
  const gbrain = await collectGbrainHealth(settings);
  const brokenLinks = collectBrokenLinkHealth(files, contents);
  return { llmWiki, gbrain, brokenLinks };
}
function collectLlmWikiHealth(files, contents, projectPrefix = PROJECT_PREFIX, settings = DEFAULT_SETTINGS) {
  const fileSet = new Set(files.map((file) => file.path));
  const contentByPath = new Map(contents.map((item) => [item.file.path, item.text]));
  const mocPath = settings.llmWikiMocPath || LLM_WIKI_MOC_PATH;
  const expectedModules = Number(settings.llmWikiModuleExpected) || LLM_WIKI_MODULE_EXPECTED;
  const minSummaryLines = Number(settings.llmWikiMinSummaryLines) || LLM_WIKI_MIN_SUMMARY_LINES;
  const escapedPrefix = escapeRegExp(projectPrefix);
  const moduleReadmes = files.filter((file) => new RegExp(`^${escapedPrefix}\u57FA\u7EBF/\\d{2}-.+/README\\.md$`).test(file.path));
  const errors = [];
  const warnings = [];
  if (mocPath && !fileSet.has(mocPath)) {
    errors.push("LLM Wiki MOC \u7F3A\u5931");
  }
  if (moduleReadmes.length < expectedModules) {
    errors.push(`\u6A21\u5757\u5165\u53E3 ${moduleReadmes.length}/${expectedModules}`);
  }
  for (const readme of moduleReadmes) {
    const moduleName = readme.path.split("/")[2] || readme.basename;
    const moduleDir = `${projectPrefix}\u57FA\u7EBF/${moduleName}`;
    const text = contentByPath.get(readme.path) || "";
    const fm = parseFrontmatter(text) || {};
    const maturity = fm.maturity;
    const level = LLM_WIKI_MATURITY_LEVELS[maturity];
    if (!maturity) {
      errors.push(`${moduleName}: \u7F3A maturity`);
      continue;
    }
    if (level === void 0) {
      errors.push(`${moduleName}: maturity \u65E0\u6548`);
      continue;
    }
    if (level === 0) {
      continue;
    }
    const summaryPath = `${moduleDir}/\u8D44\u6599\u6458\u8981.md`;
    const summaryText = contentByPath.get(summaryPath) || "";
    const summaryLines = summaryText ? summaryText.split("\n").length : 0;
    if (!summaryText) {
      warnings.push(`${moduleName}: \u8D44\u6599\u6458\u8981\u7F3A\u5931`);
    }
    if (level >= 2) {
      if (summaryLines < minSummaryLines) {
        errors.push(`${moduleName}: \u8D44\u6599\u6458\u8981 ${summaryLines}/${minSummaryLines} \u884C`);
      }
      const hits = LLM_WIKI_DEPTH_KEYWORDS.filter((keyword) => summaryText.includes(keyword));
      if (hits.length < 2) {
        errors.push(`${moduleName}: \u7F3A\u6D41\u7A0B/\u5B57\u6BB5/\u72B6\u6001\u6DF1\u5EA6`);
      }
    }
    if (level >= 3) {
      const hasPrd = fileSet.has(`${moduleDir}/PRD.md`);
      const hasDesign = files.some((file) => file.path.startsWith(`${moduleDir}/`) && /\/\u8BBE\u8BA1\u65B9\u6848.*\.md$/.test(file.path));
      if (!hasPrd && !hasDesign) {
        errors.push(`${moduleName}: \u7F3A PRD/\u8BBE\u8BA1\u65B9\u6848`);
      }
    }
    if (level >= 4 && !fileSet.has(`${moduleDir}/PRD.md`)) {
      errors.push(`${moduleName}: PRD.md \u7F3A\u5931`);
    }
  }
  const status = errors.length ? "red" : warnings.length ? "yellow" : "green";
  const issueCount = errors.length + warnings.length;
  return {
    title: "LLM Wiki",
    status,
    value: `${moduleReadmes.length}/${expectedModules} \u6A21\u5757`,
    detail: issueCount ? `\u4E25\u683C\u68C0\u67E5 ${issueCount} \u4E2A\u95EE\u9898` : "\u5165\u53E3\u4E0E\u6210\u719F\u5EA6\u6B63\u5E38",
    issues: [...errors, ...warnings],
    targetPath: mocPath
  };
}
async function collectGbrainHealth(settings = DEFAULT_SETTINGS) {
  if (!settings.enableGbrain) {
    return {
      title: "GBrain",
      status: "yellow",
      value: "\u672A\u542F\u7528",
      detail: "\u53EF\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u5F00\u542F\u672C\u5730 GBrain \u5065\u5EB7\u76D1\u63A7",
      issues: ["GBrain \u76D1\u63A7\u662F\u53EF\u9009\u80FD\u529B"],
      targetPath: null
    };
  }
  const home = (0, import_os.homedir)();
  const cliPath = expandHome(settings.gbrainCliPath || (0, import_path.join)(home, ".npm-global", "bin", "gbrain"));
  const dbPath = expandHome(settings.gbrainDbPath || (0, import_path.join)(home, ".gbrain", "brain.pglite"));
  const wikiPath = expandHome(settings.gbrainWikiPath || (0, import_path.join)(home, "wiki"));
  const healthLog = expandHome(settings.gbrainHealthLog || (0, import_path.join)(home, ".gbrain", "health.log"));
  const syncFailures = expandHome(settings.gbrainSyncFailuresPath || (0, import_path.join)(home, ".gbrain", "sync-failures.jsonl"));
  const [cliStat, dbStat, wikiStat, healthStat] = await Promise.all([
    safeStat(cliPath),
    safeStat(dbPath),
    safeStat(wikiPath),
    safeStat(healthLog)
  ]);
  const [healthText, failureText, wikiCount] = await Promise.all([
    safeReadText(healthLog),
    safeReadText(syncFailures),
    wikiStat ? countMarkdownFiles(wikiPath) : Promise.resolve(0)
  ]);
  const errors = [];
  const warnings = [];
  if (!cliStat) {
    warnings.push("GBrain CLI \u672A\u68C0\u6D4B\u5230");
  }
  if (!dbStat) {
    warnings.push("GBrain DB \u672A\u68C0\u6D4B\u5230");
  }
  if (!wikiStat) {
    warnings.push("~/wiki \u7F3A\u5931");
  }
  if (!healthStat) {
    warnings.push("health.log \u7F3A\u5931");
  } else {
    const ageHours = (Date.now() - healthStat.mtimeMs) / 36e5;
    if (ageHours > 36) {
      warnings.push(`health.log ${Math.round(ageHours)}h \u672A\u5237\u65B0`);
    }
  }
  const stats = parseGbrainStats(healthText);
  if (stats && stats.chunks > 0) {
    const coverage = stats.embedded / stats.chunks;
    if (coverage < 0.75) {
      warnings.push(`embedding \u8986\u76D6\u7387 ${Math.round(coverage * 100)}%`);
    }
  }
  const unacknowledged = countUnacknowledgedFailures(failureText);
  if (unacknowledged > 0) {
    warnings.push(`sync failures ${unacknowledged} \u6761\u672A\u786E\u8BA4`);
  }
  const status = errors.length ? "red" : warnings.length ? "yellow" : "green";
  const issueCount = errors.length + warnings.length;
  const coverageText = stats && stats.chunks > 0 ? `${Math.round(stats.embedded / stats.chunks * 100)}%` : "-";
  return {
    title: "GBrain",
    status,
    value: stats ? `${stats.pages} pages` : cliStat && dbStat ? "CLI / DB" : "\u5F85\u68C0\u67E5",
    detail: `Wiki ${wikiCount} \u9875 \xB7 embedding ${coverageText}`,
    issues: issueCount ? [...errors, ...warnings] : ["CLI\u3001DB\u3001Wiki \u8DEF\u5F84\u53EF\u7528"],
    targetPath: healthStat ? healthLog : dbPath
  };
}
function collectBrokenLinkHealth(files, contents) {
  const fileSet = new Set(files.map((file) => normalizeVaultPath(file.path)));
  const basenameSet = new Set(files.map((file) => file.basename));
  let linkCount = 0;
  const broken = [];
  const linkRe = /!?\[\[([^\]\n]+)\]\]/g;
  for (const item of contents) {
    for (const match of item.text.matchAll(linkRe)) {
      const target = String(match[1]).split("|")[0].split("#")[0].trim();
      if (!target || /^(https?:|mailto:)/i.test(target)) {
        continue;
      }
      linkCount += 1;
      if (!hasVaultLinkTarget(item.file.path, target, fileSet, basenameSet)) {
        broken.push(`${displayPath(item.file.path)} -> ${target}`);
      }
    }
  }
  const status = broken.length > 20 ? "red" : broken.length ? "yellow" : "green";
  return {
    title: "\u65AD\u94FE\u6570\u636E",
    status,
    value: `${broken.length} \u6761`,
    detail: `\u626B\u63CF ${linkCount} \u4E2A Wiki \u94FE\u63A5`,
    issues: broken.length ? broken : ["Wiki \u94FE\u63A5\u53EF\u89E3\u6790"],
    targetFile: broken[0] ? broken[0].split(" -> ")[0] : null
  };
}
function hasVaultLinkTarget(sourcePath, target, fileSet, basenameSet) {
  const normalized = normalizeVaultPath(target.replace(/\.md$/i, ""));
  const sourceDir = sourcePath.split("/").slice(0, -1).join("/");
  const hasPathHint = normalized.includes("/") || normalized.startsWith(".") || /\.[A-Za-z0-9]+$/.test(normalized);
  const candidates = [];
  const addCandidate = (candidate) => {
    const clean = normalizeVaultPath(candidate);
    candidates.push(clean);
    if (!/\.md$/i.test(clean)) {
      candidates.push(`${clean}.md`);
    }
  };
  addCandidate(normalized);
  if (hasPathHint) {
    addCandidate(`${sourceDir}/${normalized}`);
  } else if (basenameSet.has(normalized)) {
    return true;
  }
  return candidates.some((candidate) => fileSet.has(candidate));
}
function normalizeVaultPath(path) {
  const parts = [];
  for (const part of String(path || "").replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}
function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function safeStat(path) {
  try {
    return await import_fs.promises.stat(path);
  } catch (error) {
    return null;
  }
}
async function safeReadText(path) {
  try {
    return await import_fs.promises.readFile(path, "utf8");
  } catch (error) {
    return "";
  }
}
async function countMarkdownFiles(dir) {
  let count = 0;
  let entries = [];
  try {
    entries = await import_fs.promises.readdir(dir, { withFileTypes: true });
  } catch (error) {
    return 0;
  }
  await Promise.all(entries.map(async (entry) => {
    const child = (0, import_path.join)(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countMarkdownFiles(child);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      count += 1;
    }
  }));
  return count;
}
function parseGbrainStats(text) {
  let latest = null;
  const re = /Pages:\s*(\d+)\s*\nChunks:\s*(\d+)\s*\nEmbedded:\s*(\d+)\s*\nLinks:\s*(\d+)/g;
  for (const match of text.matchAll(re)) {
    latest = {
      pages: Number(match[1]),
      chunks: Number(match[2]),
      embedded: Number(match[3]),
      links: Number(match[4])
    };
  }
  return latest;
}
function countUnacknowledgedFailures(text) {
  let count = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    try {
      const item = JSON.parse(line);
      if (!item.acknowledged) {
        count += 1;
      }
    } catch (error) {
      count += 1;
    }
  }
  return count;
}
function collectTasks(contents) {
  const tasks = [];
  const taskRe = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/;
  for (const item of contents) {
    const lines = item.text.split("\n");
    lines.forEach((line, index) => {
      const match = line.match(taskRe);
      if (!match) {
        return;
      }
      const text = match[2].trim();
      const date = extractDate(text);
      tasks.push({
        file: item.file.path,
        line: index + 1,
        text,
        done: match[1].toLowerCase() === "x",
        date,
        overdue: Boolean(date && !isTodayOrFuture(date) && match[1].toLowerCase() !== "x")
      });
    });
  }
  return tasks.sort((a, b) => Number(a.done) - Number(b.done) || (a.date || "9999").localeCompare(b.date || "9999"));
}
function collectDates(contents) {
  const dates = [];
  const dateRe = /\b(20\d{2}-\d{2}-\d{2})\b/g;
  for (const item of contents) {
    const lines = item.text.split("\n");
    lines.forEach((line, index) => {
      const text = line.trim();
      if (isNoiseDateLine(text)) {
        return;
      }
      const matches = [...line.matchAll(dateRe)].map((match) => match[1]);
      for (const date of matches) {
        if (!isWithinWindow(date, -14, 60)) {
          continue;
        }
        dates.push({
          date,
          file: item.file.path,
          line: index + 1,
          text,
          overdue: !isTodayOrFuture(date)
        });
      }
    });
  }
  return dates.sort((a, b) => a.date.localeCompare(b.date));
}
function isNoiseDateLine(text) {
  return /^(created|updated|checked_at|collected_at|observed_at|recorded_at|valid_from|valid_until|last_reviewed|last_synced):/i.test(
    text
  ) || /^(source|source_url|source_type|source_sheet|source_range|source_sheet_id):/i.test(text) || /\*\*版本\*\*/.test(text) || /编写人[：:]/.test(text) || /采集日期/.test(text) || /^[A-Za-z0-9_-]*date[A-Za-z0-9_-]*\s*:/i.test(text) || /^>?\s*\|?\s*20\d{2}-\d{2}-\d{2}\s*[|·]\s*v\d/i.test(text) || /^>?\s*v\d+\.\d+/.test(text) || /\bv\d+\.\d+\s*[·|]/.test(text) || /飞书文档/.test(text);
}
function renderEventCards(parent, items, plugin, prefix, limit) {
  const wrap = parent.createDiv({ cls: `${prefix}__events` });
  for (const item of items.slice(0, limit)) {
    const card = wrap.createDiv({ cls: `${prefix}__event-card ${item.overdue ? "is-overdue" : ""}` });
    const meta = card.createDiv({ cls: `${prefix}__event-meta-box` });
    meta.createDiv({ cls: `${prefix}__event-date-day`, text: item.date.slice(5) });
    meta.createDiv({ cls: `${prefix}__event-date-module`, text: moduleLabel(item.file) });
    const body = card.createDiv({ cls: `${prefix}__event-body` });
    body.createDiv({ cls: `${prefix}__event-title`, text: eventTitle(item) });
    body.createDiv({ cls: `${prefix}__event-text`, text: eventSummary(item) });
    const fileRow = body.createDiv({ cls: `${prefix}__event-files` });
    for (const fileRef of eventFileRefs(item, plugin).slice(0, 4)) {
      const fileButton = fileRow.createEl("button", { cls: `${prefix}__event-file`, text: fileRef.name });
      fileButton.onClickEvent((event) => {
        event.stopPropagation();
        plugin.openVaultFileInRight(fileRef.path);
      });
    }
  }
  if (!items.length) {
    wrap.createDiv({ cls: `${prefix}__empty`, text: "\u8FD1\u671F\u6CA1\u6709\u53EF\u8BC6\u522B\u63D0\u9192\u3002" });
  }
}
function renderDashboardEventCard(parent, options) {
  const card = parent.createEl("button", { cls: `v9-dashboard__event-card ${options.cls || ""}` });
  card.onClickEvent(options.onClick);
  const date = card.createSpan({ cls: "v9-dashboard__event-date" });
  date.createSpan({ cls: "v9-dashboard__event-date-day", text: options.date });
  date.createSpan({ cls: "v9-dashboard__event-date-module", text: options.module });
  const body = card.createSpan({ cls: "v9-dashboard__event-body" });
  body.createSpan({ cls: "v9-dashboard__event-title", text: compact(options.title, 54) });
  body.createSpan({ cls: "v9-dashboard__event-text", text: compact(options.text, 92) });
}
function cleanEventText(text) {
  return text.replace(/^>\s*/, "").replace(/^\s*[-*]\s+/, "").replace(/^\s*#+\s*/, "").replace(/\*\*/g, "").replace(/\s*\|\s*/g, " \xB7 ").replace(/\s+/g, " ").trim();
}
function eventTitle(item) {
  const text = cleanEventText(item.text).replace(item.date, "").replace(/^[·\s-]+/, "");
  return compact(text.split(/[。；;|]/)[0] || `${moduleLabel(item.file)}\u63D0\u9192`, 44);
}
function eventSummary(item) {
  const text = cleanEventText(item.text).replace(item.date, "").replace(/^[·\s-]+/, "");
  if (!text) {
    return `${moduleLabel(item.file)}\u5728 ${item.date} \u6709\u4E8B\u52A1\u8BB0\u5F55\u3002`;
  }
  return compact(text, 96);
}
function eventFileRefs(item, plugin) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  const pushFile = (file) => {
    if (!file || seen.has(file.path)) {
      return;
    }
    seen.add(file.path);
    refs.push({ name: file.name || file.basename || displayFileName(file.path), path: file.path });
  };
  for (const match of item.text.matchAll(/!?\[\[([^\]\n]+)\]\]/g)) {
    const rawTarget = String(match[1]).split("|")[0].split("#")[0].trim();
    if (!rawTarget) {
      continue;
    }
    const linked = plugin.app.metadataCache.getFirstLinkpathDest(rawTarget, item.file);
    pushFile(linked);
  }
  const source = plugin.app.vault.getAbstractFileByPath(item.file);
  pushFile(source);
  return refs.length ? refs : [{ name: displayFileName(item.file), path: item.file }];
}
function displayFileName(path) {
  return String(path || "").split("/").pop() || String(path || "");
}
function collectNoteIssues(contents, iteration, projectPrefix = PROJECT_PREFIX) {
  const issues = [];
  const iterationPrefix = `${projectPrefix}\u8FED\u4EE3/${iteration}\u8FED\u4EE3/`;
  for (const item of contents) {
    if (!item.file.path.startsWith(iterationPrefix)) {
      continue;
    }
    const fm = parseFrontmatter(item.text);
    if (!fm) {
      issues.push({ file: item.file.path, level: "\u5173\u6CE8", message: "\u7F3A\u5143\u6570\u636E" });
      continue;
    }
    if (!fm.iteration) {
      issues.push({ file: item.file.path, level: "\u5173\u6CE8", message: "\u7F3A iteration \u5B57\u6BB5" });
    }
    if (item.file.path.includes("/\u8FED\u4EE3\u7BA1\u7406/") && (!fm.observed_at || !fm.recorded_at)) {
      issues.push({ file: item.file.path, level: "\u5173\u6CE8", message: "\u8FED\u4EE3\u7BA1\u7406\u6587\u4EF6\u7F3A\u53CC\u65F6\u95F4\u5B57\u6BB5" });
    }
    if (fm.scope_status && !["planning", "scoped", "frozen", "released", "reviewed", "aborted"].includes(fm.scope_status)) {
      issues.push({ file: item.file.path, level: "\u5F02\u5E38", message: `scope_status \u975E\u72B6\u6001\u673A\u679A\u4E3E\uFF1A${fm.scope_status}` });
    }
  }
  return issues;
}
function collectAgents(contents, iteration) {
  const workbench = contents.find((item) => item.file.path.endsWith(`${iteration}\u8FED\u4EE3/\u8FED\u4EE3\u7BA1\u7406/README.md`));
  if (!workbench) {
    return [];
  }
  const lines = workbench.text.split("\n");
  const start = lines.findIndex((line) => line.includes("## Agent \u804C\u8D23\u6620\u5C04"));
  if (start < 0) {
    return [];
  }
  const agents = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    if (!line.startsWith("|") || line.includes("---") || line.includes("\u804C\u8D23 |")) {
      continue;
    }
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length >= 4) {
      agents.push({ role: cells[0], owner: cells[1], status: cells[2], boundary: cells[3] });
    }
  }
  return agents;
}
function collectHeatmap(files) {
  const today = startOfDay(/* @__PURE__ */ new Date());
  const days = [];
  for (let offset = 69; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toDateKey(date);
    days.push({
      date: key,
      count: files.filter((file) => toDateKey(new Date(file.stat.mtime)) === key).length
    });
  }
  return days;
}
function renderMonthGrid(parent, data, plugin, prefix, monthOffset, controls) {
  const today = /* @__PURE__ */ new Date();
  const shown = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const byDate = /* @__PURE__ */ new Map();
  for (const item of data.calendar) {
    if (!item.date.startsWith(monthKey)) {
      continue;
    }
    const bucket = byDate.get(item.date) || [];
    bucket.push(item);
    byDate.set(item.date, bucket);
  }
  const toolbar = parent.createDiv({ cls: `${prefix}__month-toolbar` });
  const monthTitle = toolbar.createDiv({ cls: `${prefix}__month-title` });
  monthTitle.createSpan({ cls: `${prefix}__month-year`, text: String(year) });
  monthTitle.createSpan({ text: ` \u5E74 ${month + 1} \u6708` });
  const nav = toolbar.createDiv({ cls: `${prefix}__month-nav` });
  if (controls.refresh) {
    const refresh = nav.createEl("button", {
      cls: `${prefix}__nav-button ${prefix}__refresh-button`,
      text: "\u21BB",
      attr: { "aria-label": "\u5237\u65B0" }
    });
    refresh.onClickEvent(controls.refresh);
  }
  const prev = nav.createEl("button", { cls: `${prefix}__nav-button`, text: "\u2039" });
  prev.onClickEvent(controls.prev);
  const current = nav.createEl("button", { cls: `${prefix}__nav-button is-current`, text: "\u672C\u6708" });
  current.onClickEvent(controls.current);
  const next = nav.createEl("button", { cls: `${prefix}__nav-button`, text: "\u203A" });
  next.onClickEvent(controls.next);
  const monthGrid = parent.createDiv({ cls: `${prefix}__month` });
  for (const weekday of ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"]) {
    monthGrid.createDiv({ cls: `${prefix}__weekday`, text: weekday });
  }
  const first = new Date(year, month, 1);
  const firstOffset = (first.getDay() + 6) % 7;
  for (let index = 0; index < firstOffset; index += 1) {
    monthGrid.createDiv({ cls: `${prefix}__day is-empty` });
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${monthKey}-${String(day).padStart(2, "0")}`;
    const items = byDate.get(key) || [];
    const cls = [
      `${prefix}__day`,
      key === toDateKey(today) ? "is-today" : "",
      key === controls.selectedDate ? "is-selected" : "",
      controls.onDateClick ? "is-selectable" : "",
      items.length ? "has-items" : "",
      items.some((item) => item.overdue) ? "is-overdue" : ""
    ].filter(Boolean).join(" ");
    const cell = monthGrid.createEl("button", {
      cls,
      attr: {
        title: items.length ? items.map((item) => compact(cleanEventText(item.text), 80)).join("\n") : `${key}: \u6682\u65E0\u4E8B\u52A1`
      }
    });
    cell.createSpan({ cls: `${prefix}__day-number`, text: String(day) });
    if (items.length) {
      const dots = cell.createSpan({ cls: `${prefix}__day-dots` });
      for (let dot = 0; dot < Math.min(4, items.length); dot += 1) {
        dots.createSpan({ cls: `${prefix}__day-dot` });
      }
    }
    if (controls.onDateClick) {
      cell.onClickEvent(() => controls.onDateClick(key, items));
    } else if (items[0]) {
      cell.onClickEvent(() => plugin.openVaultFile(items[0].file));
    }
  }
}
function buildSuggestions(report, tasks, calendar, noteIssues) {
  var _a, _b;
  const lines = ["\u672C\u5730\u5206\u6790\u5EFA\u8BAE\uFF1A"];
  const findings = ((_b = (_a = report == null ? void 0 : report.parts) == null ? void 0 : _a.iteration_ops) == null ? void 0 : _b.findings) || [];
  if (findings.length) {
    lines.push(`1. \u5148\u5904\u7406\u8FED\u4EE3\u6CBB\u7406\u7EA2\u9EC4\u706F\uFF1A${findings[0].message || findings[0].rule_id || "\u5B58\u5728\u672A\u5173\u95ED\u89C4\u5219"}`);
  }
  const overdue = tasks.filter((task) => task.overdue && !task.done);
  if (overdue.length) {
    lines.push(`2. \u6709 ${overdue.length} \u4E2A\u903E\u671F\u5F85\u529E\uFF0C\u5EFA\u8BAE\u5148\u6E05\u7406\u6700\u65E9\u65E5\u671F\u4EFB\u52A1\u3002`);
  }
  const badNotes = noteIssues.filter((issue) => issue.level === "\u5F02\u5E38");
  if (badNotes.length) {
    lines.push(`3. \u6709 ${badNotes.length} \u4E2A\u7B14\u8BB0\u72B6\u6001\u5F02\u5E38\uFF0C\u4F18\u5148\u4FEE\u6B63\u72B6\u6001\u673A\u5B57\u6BB5\u3002`);
  }
  const upcoming = calendar.filter((item) => !item.overdue).slice(0, 1)[0];
  if (upcoming) {
    lines.push(`4. \u6700\u8FD1\u63D0\u9192\uFF1A${upcoming.date} \xB7 ${compact(upcoming.text, 56)}`);
  }
  if (lines.length === 1) {
    lines.push("1. \u5F53\u524D\u6CA1\u6709\u660E\u663E\u963B\u585E\uFF0C\u53EF\u4EE5\u63A8\u8FDB\u63D2\u4EF6\u7A33\u5B9A\u5316\u6216\u684C\u9762\u7AEF\u65B9\u6848\u3002");
  }
  return lines;
}
function buildLocalAnswer(question, data) {
  var _a, _b, _c, _d;
  const findings = ((_c = (_b = (_a = data.report) == null ? void 0 : _a.parts) == null ? void 0 : _b.iteration_ops) == null ? void 0 : _c.findings) || [];
  const openTasks = data.tasks.filter((task) => !task.done);
  return [
    `\u95EE\u9898\uFF1A${question || "\u672A\u586B\u5199"}`,
    "",
    `\u5F53\u524D\u606F\u58E4\u72B6\u6001\uFF1A${statusLabel(((_d = data.report) == null ? void 0 : _d.status) || "yellow")}\uFF0C\u8FED\u4EE3\uFF1A${data.currentIteration}`,
    `\u9879\u76EE\u5F85\u529E\uFF1A${openTasks.length} \u4E2A\u672A\u5B8C\u6210\uFF0C${openTasks.filter((task) => task.overdue).length} \u4E2A\u903E\u671F`,
    `\u7B14\u8BB0\u76D1\u63A7\uFF1A${data.noteIssues.length} \u4E2A\u95EE\u9898`,
    "",
    "\u5EFA\u8BAE\u4E0B\u4E00\u6B65\uFF1A",
    ...findings.length ? findings.slice(0, 3).map((finding, index) => `${index + 1}. ${finding.message || finding.rule_id}`) : data.aiSuggestions.map((line) => line.replace(/^\d+\.\s*/, ""))
  ].join("\n");
}
function buildAiDraft(mode, question, data) {
  var _a, _b, _c, _d, _e, _f;
  const findings = ((_c = (_b = (_a = data.report) == null ? void 0 : _a.parts) == null ? void 0 : _b.iteration_ops) == null ? void 0 : _c.findings) || [];
  const openTasks = data.tasks.filter((task) => !task.done);
  const upcoming = data.calendar.filter((item) => !item.overdue).slice(0, 5);
  const noteErrors = data.noteIssues.filter((issue) => issue.level === "\u5F02\u5E38");
  const header = [
    "\u606F\u58E4\u5DE5\u4F5C\u53F0\u4E0A\u4E0B\u6587",
    `\u5F53\u524D\u8FED\u4EE3\uFF1A${data.currentIteration}`,
    `\u603B\u72B6\u6001\uFF1A${statusLabel(((_d = data.report) == null ? void 0 : _d.status) || "yellow")}`,
    `\u7528\u6237\u95EE\u9898\uFF1A${question || "\u672A\u586B\u5199"}`
  ];
  if (mode === "handoff") {
    return [
      ...header,
      "",
      "\u8BF7\u63A5\u624B\u4EE5\u4E0B\u5DE5\u4F5C\uFF0C\u5E76\u9ED8\u8BA4\u7528\u4E2D\u6587\u56DE\u590D\uFF1A",
      `1. \u5148\u770B\u7EA2\u9EC4\u706F\uFF1A${((_e = findings[0]) == null ? void 0 : _e.message) || ((_f = findings[0]) == null ? void 0 : _f.rule_id) || "\u5F53\u524D\u6CA1\u6709\u7EA2\u9EC4\u706F"}`,
      `2. \u518D\u770B\u4EFB\u52A1\uFF1A${openTasks.length} \u4E2A\u672A\u5B8C\u6210\uFF0C\u4F18\u5148\u5904\u7406\u4E0E\u5F53\u524D\u8FED\u4EE3\u76F4\u63A5\u76F8\u5173\u7684\u4EFB\u52A1\u3002`,
      `3. \u518D\u770B\u63D0\u9192\uFF1A${upcoming[0] ? `${upcoming[0].date} \xB7 ${compact(upcoming[0].text, 72)}` : "\u6682\u65E0\u8FD1\u671F\u63D0\u9192"}`,
      "4. \u4E0D\u8981\u81EA\u52A8\u4FEE\u6539\u8D44\u6599\u5E93\uFF1B\u9700\u8981\u5199\u5165\u65F6\u5148\u8BF4\u660E\u76EE\u6807\u6587\u4EF6\u3001\u5B57\u6BB5\u548C\u7406\u7531\u3002",
      "",
      "\u5F85\u529E\u6837\u672C\uFF1A",
      ...openTasks.slice(0, 8).map((task) => `- ${trimTask(task.text)} (${task.file}:${task.line})`)
    ].join("\n");
  }
  if (mode === "fix") {
    return [
      ...header,
      "",
      "\u8BF7\u7ED9\u51FA\u53EA\u8BFB\u8BCA\u65AD\u548C\u4FEE\u590D\u5EFA\u8BAE\uFF0C\u6309\u98CE\u9669\u4F18\u5148\u7EA7\u6392\u5E8F\uFF1A",
      ...findings.length ? findings.slice(0, 5).map((finding, index) => `${index + 1}. ${finding.severity || "advisory"} \xB7 ${finding.rule_id || "\u89C4\u5219"} \xB7 ${finding.message || ""}`) : ["1. \u5F53\u524D\u6CA1\u6709\u5DE1\u68C0\u7EA2\u9EC4\u706F\u3002"],
      "",
      "\u7B14\u8BB0\u5F02\u5E38\uFF1A",
      ...noteErrors.length ? noteErrors.slice(0, 6).map((issue) => `- ${issue.message} (${issue.file})`) : ["- \u5F53\u524D\u6CA1\u6709\u5F02\u5E38\u7EA7\u7B14\u8BB0\u95EE\u9898\u3002"],
      "",
      "\u8F93\u51FA\u8981\u6C42\uFF1A\u5148\u8BF4\u5224\u65AD\uFF0C\u518D\u8BF4\u4E0B\u4E00\u6B65\uFF0C\u4E0D\u8981\u76F4\u63A5\u6539\u6587\u4EF6\u3002"
    ].join("\n");
  }
  return [
    buildLocalAnswer(question, data),
    "",
    "\u8FD1\u671F\u63D0\u9192\uFF1A",
    ...upcoming.length ? upcoming.map((item) => `- ${item.date} \xB7 ${compact(cleanEventText(item.text), 72)}`) : ["- \u6682\u65E0\u8FD1\u671F\u63D0\u9192"]
  ].join("\n");
}
function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) {
    return null;
  }
  const end = text.indexOf("\n---", 4);
  if (end < 0) {
    return null;
  }
  const fm = {};
  for (const line of text.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      fm[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return fm;
}
function extractDate(text) {
  var _a;
  return (_a = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)) == null ? void 0 : _a[1];
}
function isTodayOrFuture(date) {
  return date >= toDateKey(/* @__PURE__ */ new Date());
}
function isWithinWindow(date, startOffset, endOffset) {
  const today = startOfDay(/* @__PURE__ */ new Date());
  const start = new Date(today);
  start.setDate(today.getDate() + startOffset);
  const end = new Date(today);
  end.setDate(today.getDate() + endOffset);
  const target = /* @__PURE__ */ new Date(`${date}T00:00:00`);
  return target >= start && target <= end;
}
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
function normalizeVaultPrefix(value) {
  const text = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!text) {
    return "";
  }
  return text.endsWith("/") ? text : `${text}/`;
}
function expandHome(path) {
  const text = String(path || "").trim();
  if (!text) {
    return "";
  }
  if (text === "~") {
    return (0, import_os.homedir)();
  }
  if (text.startsWith("~/")) {
    return (0, import_path.join)((0, import_os.homedir)(), text.slice(2));
  }
  return text;
}
function detectProjectPrefix(files) {
  if (files.some((file) => file.path.startsWith(PROJECT_PREFIX))) {
    return PROJECT_PREFIX;
  }
  const prefixes = /* @__PURE__ */ new Map();
  for (const file of files) {
    const match = file.path.match(/^(.*?)(?:\u8FED\u4EE3\/\d{6}\u8FED\u4EE3(?:\/|$))/);
    if (!match) {
      continue;
    }
    prefixes.set(match[1], (prefixes.get(match[1]) || 0) + 1);
  }
  return [...prefixes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}
function detectCurrentIteration(projectFiles, contents, report) {
  const reported = (report == null ? void 0 : report.current_iteration) || inferIteration(report);
  if (isIterationKey(reported)) {
    return reported;
  }
  for (const item of contents) {
    const fm = parseFrontmatter(item.text);
    if (isIterationKey(fm == null ? void 0 : fm.current_iteration)) {
      return fm.current_iteration;
    }
  }
  const candidates = /* @__PURE__ */ new Map();
  for (const file of projectFiles) {
    const iteration = extractIterationFromPath(file.path);
    if (!iteration) {
      continue;
    }
    candidates.set(iteration, (candidates.get(iteration) || 0) + 1);
  }
  for (const item of contents) {
    const fm = parseFrontmatter(item.text);
    if (!isIterationKey(fm == null ? void 0 : fm.iteration)) {
      continue;
    }
    const statusBoost = /当前|active|planning|scoped/i.test(String(fm.status || "")) ? 100 : 0;
    candidates.set(fm.iteration, (candidates.get(fm.iteration) || 0) + 10 + statusBoost);
  }
  return [...candidates.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] || null;
}
function extractIterationFromPath(path) {
  return path.match(/(?:^|\/)\u8FED\u4EE3\/(\d{6})\u8FED\u4EE3(?:\/|$)/)?.[1] || null;
}
function isIterationKey(value) {
  return /^\d{6}$/.test(String(value || ""));
}
function inferIteration(report) {
  var _a, _b;
  const path = ((_a = report == null ? void 0 : report.paths) == null ? void 0 : _a.iteration_root) || "";
  return ((_b = String(path).match(/(\d{6})迭代/)) == null ? void 0 : _b[1]) || null;
}
function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}
function scopeStatusLabel(status) {
  const labels = {
    planning: "\u8303\u56F4\u89C4\u5212\u4E2D",
    scoped: "\u8303\u56F4\u5DF2\u5212\u5B9A",
    frozen: "\u8303\u56F4\u5DF2\u51BB\u7ED3",
    released: "\u5DF2\u53D1\u7248",
    reviewed: "\u5DF2\u590D\u76D8",
    aborted: "\u5DF2\u4E2D\u6B62"
  };
  return labels[status] || status || "\u672A\u58F0\u660E";
}
function formatReleaseDate(date) {
  const match = String(date || "").match(/^20\d{2}-(\d{2})-(\d{2})$/);
  if (!match) {
    return date || "\u672A\u58F0\u660E";
  }
  return `${Number(match[1])}\u6708${Number(match[2])}\u65E5`;
}
function formatCalendarDate(date) {
  const match = String(date || "").match(/^20\d{2}-(\d{2})-(\d{2})$/);
  if (!match) {
    return date || "";
  }
  return `${Number(match[1])}\u6708${Number(match[2])}\u65E5`;
}
function badgeLabel(badge) {
  return BADGE_LABELS[badge.id] || badge.label;
}
function severityLabel(severity) {
  if (!severity) {
    return "\u63D0\u793A";
  }
  if (["p0", "p1", "red", "ng", "error"].includes(severity.toLowerCase())) {
    return "\u5F02\u5E38";
  }
  if (["p2", "yellow", "warning", "advisory"].includes(severity.toLowerCase())) {
    return "\u5173\u6CE8";
  }
  return "\u63D0\u793A";
}
function ruleLabel(ruleId) {
  const labels = {
    ITERATION_MANAGEMENT_DOC_MISSING: "\u7F3A\u8FED\u4EE3\u7BA1\u7406\u6587\u4EF6",
    SCOPE_STATUS_UNKNOWN: "\u8303\u56F4\u72B6\u6001\u672A\u58F0\u660E",
    AGENT_ASSIGNMENTS_MISSING: "\u7F3A\u804C\u8D23\u6620\u5C04",
    REVIEW_CONTRACT_MISSING: "\u7F3A\u590D\u76D8\u5951\u7EA6",
    VISUAL_PREVIEW_MISSING: "\u7F3A\u89C6\u89C9\u9884\u89C8",
    WRITE_SCOPE_VIOLATION: "\u5199\u5165\u8FB9\u754C\u98CE\u9669"
  };
  if (!ruleId) {
    return "\u8FED\u4EE3\u89C4\u5219";
  }
  return labels[ruleId] || ruleId.replace(/_/g, " ").toLowerCase();
}
function num(value) {
  return typeof value === "number" ? value : Number(value || 0);
}
function compact(text, length) {
  return text.length <= length ? text : `${text.slice(0, length - 1)}...`;
}
function displayPath(path) {
  const normalized = String(path || "").replace(/\\/g, "/").replace(/^\.\//, "");
  const home = (0, import_os.homedir)().replace(/\\/g, "/");
  if (normalized.startsWith(`${home}/`)) {
    return `~/${normalized.slice(home.length + 1)}`;
  }
  return normalized;
}
function trimTask(text) {
  return compact(text.replace(/\[\[(.*?)\]\]/g, "$1").replace(/#\S+/g, "").trim(), 92);
}
function moduleLabel(file) {
  const parts = file.split("/");
  const iterationIndex = parts.findIndex((part) => /^\d{6}迭代$/.test(part));
  if (iterationIndex >= 0 && parts[iterationIndex + 1]) {
    return parts[iterationIndex + 1].replace(/^\d+-/, "");
  }
  const projectIndex = parts.findIndex((part) => part === "10-\u9879\u76EE");
  if (projectIndex >= 0 && parts[projectIndex + 1]) {
    return parts[projectIndex + 1].replace(/^\d+-/, "");
  }
  return "\u9879\u76EE";
}
function taskStatus(task) {
  if (task.overdue && !task.done) {
    return "red";
  }
  return task.done ? "green" : "yellow";
}
function taskStatusLabel(task) {
  if (task.done) {
    return "\u5DF2\u5B8C\u6210";
  }
  if (task.overdue) {
    return "\u903E\u671F";
  }
  return "\u5F85\u5904\u7406";
}
async function openSystemPath(path) {
  var _a;
  const electron = getElectron();
  if ((_a = electron == null ? void 0 : electron.shell) == null ? void 0 : _a.openPath) {
    const error = await electron.shell.openPath(path);
    if (error) {
      new import_obsidian.Notice(error);
    }
    return;
  }
  window.open(`file://${path}`);
}
function getElectron() {
  const maybeRequire = window.require;
  if (!maybeRequire) {
    return null;
  }
  try {
    return maybeRequire("electron");
  } catch (e) {
    return null;
  }
}
