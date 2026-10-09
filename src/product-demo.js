import {
  createIcons,
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Blocks,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  CircleCheck,
  CircleDollarSign,
  Copy,
  CornerDownLeft,
  Cpu,
  FileText,
  FolderCheck,
  FolderGit2,
  GitFork,
  Globe,
  HardDrive,
  Info,
  KeyRound,
  Laptop,
  Layers3,
  List,
  ListChecks,
  LockKeyhole,
  Menu,
  MousePointer2,
  Plus,
  ScanSearch,
  Search,
  Terminal,
  TriangleAlert,
  UserRound,
  X
} from 'lucide'
import {
  PREVIEW_SECTIONS,
  SKILL_SOURCES,
  SAMPLE_SKILLS,
  SAMPLE_PLUGINS,
  USAGE_PANELS,
  USAGE_WINDOWS,
  SAMPLE_WINDOWS,
  SAMPLE_MODELS,
  SAMPLE_CONTEXT
} from './demo-data.js'

const ICONS = {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Blocks,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  CircleCheck,
  CircleDollarSign,
  Copy,
  CornerDownLeft,
  Cpu,
  FileText,
  FolderCheck,
  FolderGit2,
  GitFork,
  Globe,
  HardDrive,
  Info,
  KeyRound,
  Laptop,
  Layers3,
  List,
  ListChecks,
  LockKeyhole,
  Menu,
  MousePointer2,
  Plus,
  ScanSearch,
  Search,
  Terminal,
  TriangleAlert,
  UserRound,
  X
}
const CONTEXT_LIMIT = 2666
const numberFormatter = new Intl.NumberFormat('en-US')
const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})
const sourceNames = { global: 'Global', project: 'Project', plugin: 'Plugin' }

export function refreshIcons(root = document) {
  createIcons({
    icons: ICONS,
    root,
    attrs: { 'stroke-width': 1.7, 'aria-hidden': 'true' }
  })
}

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]
  )
}
function navigationButton(action, item, selected, extra = '') {
  return `<button type="button" class="demo-nav-item ${selected ? 'is-selected' : ''}" data-action="${action}" data-value="${item.id}" aria-pressed="${selected}" ${extra}>${icon(item.icon)}<span>${item.label}</span></button>`
}
function stat(label, value) {
  return `<div class="demo-stat"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`
}
function block(title, content, extra = '') {
  return `<section class="demo-block ${extra}"><h4>${title}</h4>${content}</section>`
}
function rankedRows(rows, unit = '') {
  const maximum = Math.max(...rows.map((row) => row.value), 1)
  return `<div class="ranked-rows">${rows.map((row) => `<div class="ranked-row"><span class="ranked-fill" style="width:${(row.value / maximum) * 100}%"></span><span>${escapeHtml(row.name)}</span><strong>${escapeHtml(row.value)}${unit}</strong></div>`).join('')}</div>`
}
function trendChart(values, windowKey, noun = 'prompts', scale = 1) {
  const maximum = Math.max(...values, 1)
  const interval = windowKey === '24h' ? 'Hour' : 'Day'
  return `<div class="demo-chart" role="group" aria-label="Sample ${noun} by ${interval.toLowerCase()}"><div class="chart-grid" aria-hidden="true"><span></span><span></span><span></span></div><div class="chart-bars">${values
    .map((value, index) => {
      const label = `${interval} ${index + 1}: ${noun === 'estimated cost' ? dollarFormatter.format(value * scale) : Math.round(value * scale)} ${noun}`
      return `<button type="button" class="chart-bar-button" aria-pressed="false" aria-label="${label}"><span class="chart-bar" style="height:${Math.max((value / maximum) * 100, 1)}%"></span><span class="chart-tooltip">${label}</span></button>`
    })
    .join(
      ''
    )}</div></div><div class="chart-axis" aria-hidden="true"><span>${windowKey === '24h' ? '24 hours' : windowKey === '7d' ? '7 days' : '30 days'} ago</span><span>Today</span></div>`
}
function punchcard() {
  return `<div class="demo-punchcard" aria-label="Illustrative weekday by hour activity pattern">${[
    'M',
    'T',
    'W',
    'T',
    'F',
    'S',
    'S'
  ]
    .map(
      (day, dayIndex) =>
        `<span class="punch-day">${day}</span>${Array.from(
          { length: 24 },
          (_, hour) => {
            const value =
              hour > 7 && hour < 19 && dayIndex < 5
                ? (((hour * 7 + dayIndex * 3) % 6) + 2) / 8
                : 0.08
            return `<span class="punch-dot" style="opacity:${value}" aria-hidden="true"></span>`
          }
        ).join('')}`
    )
    .join(
      ''
    )}</div><div class="punch-axis" aria-hidden="true"><span>12am</span><span>12pm</span><span>11pm</span></div>`
}
function skillTable(skills) {
  if (skills.length === 0)
    return '<p class="demo-empty">No sample skills match your search.</p>'
  return `<div class="skill-table" role="table" aria-label="Sample skill inventory"><div class="skill-table-row table-heading" role="row"><span role="columnheader">Name</span><span role="columnheader">Status</span><span role="columnheader" class="demo-source-column">Source</span><span role="columnheader" class="demo-description-column">Description</span><span role="columnheader" class="demo-tokens-column align-right">Tokens</span><span role="columnheader" class="demo-uses-column align-right">Uses</span></div>${skills.map((skill) => `<div class="skill-table-row" role="row"><span role="cell"><button type="button" class="skill-name" data-action="skill" data-value="${skill.id}" aria-label="Inspect ${skill.name}">${skill.name}</button></span><span role="cell"><span class="demo-status ${skill.status === 'clean' ? 'is-clean' : 'is-warning'}">${icon(skill.status === 'clean' ? 'circle-check' : 'triangle-alert')}${skill.status === 'clean' ? 'Valid' : 'Warning'}</span></span><span role="cell" class="demo-source-column"><span class="source-label">${sourceNames[skill.source]}</span></span><span role="cell" class="demo-description-column truncated" title="${escapeHtml(skill.description)}">${escapeHtml(skill.description)}</span><span role="cell" class="demo-tokens-column align-right mono">${skill.tokens}</span><span role="cell" class="demo-uses-column align-right mono">${skill.uses || 'Never'}</span></div>`).join('')}</div>`
}
function skillDetail(skill) {
  const definition = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\nFollow the project conventions.\nCheck the relevant references before starting.`
  return `<div class="demo-detail"><button type="button" class="demo-back" data-action="back">${icon('arrow-left')}Back to inventory</button><div class="detail-title"><span class="detail-icon">${icon('brain-circuit')}</span><div><h3>${skill.name}</h3><span>${sourceNames[skill.source]} skill · Sample definition</span></div></div><p class="detail-description">${escapeHtml(skill.description)}</p><div class="detail-stat-grid">${stat('Listing tokens (est.)', skill.tokens)}${stat('Recorded uses', skill.uses)}</div>${skill.finding ? `<div class="detail-finding">${icon('triangle-alert')}<div><strong>${escapeHtml(skill.finding)}</strong><span>${skill.rule} · SKILL.md:${skill.line}</span></div></div>` : `<div class="detail-clean">${icon('circle-check')}No lint findings in this sample.</div>`}<div class="definition-preview"><span>SKILL.md <span>READ-ONLY PREVIEW</span></span><pre><code>${escapeHtml(definition)}</code></pre></div></div>`
}
function activityView(sample, windowKey) {
  return `<div class="demo-stats">${stat('Prompts', numberFormatter.format(sample.prompts))}${stat('Sessions', sample.sessions)}${stat('Active days', sample.activeDays)}</div>${block('Prompts over time', trendChart(sample.trend, windowKey))}<div class="demo-secondary-grid">${block(
    'By project',
    rankedRows([
      { name: 'web-app', value: Math.round(sample.prompts * 0.52) },
      { name: 'design-system', value: Math.round(sample.prompts * 0.31) },
      { name: 'api', value: Math.round(sample.prompts * 0.17) }
    ])
  )}${block('When you work', punchcard())}</div>`
}
function costView(sample, windowKey) {
  const total = sample.trend.reduce((sum, value) => sum + value, 0)
  return `<div class="demo-cost-summary"><div class="demo-stat"><strong>${dollarFormatter.format(sample.cost)}</strong><span>Estimated API-equivalent cost</span></div><div class="model-cost-list">${SAMPLE_MODELS.map((model) => `<span><i class="model-dot" style="background:${model.color}"></i>${model.name}<strong>${dollarFormatter.format((sample.cost * model.share) / 100)}</strong></span>`).join('')}</div></div><div class="model-spend-bar" aria-label="Illustrative cost split by model">${SAMPLE_MODELS.map((model) => `<span style="flex:${model.share};background:${model.color}"></span>`).join('')}</div><p class="demo-coverage-note">An estimate at API rates, not your subscription bill. Time breakdowns are approximate.</p>${block(`Estimated cost by ${windowKey === '24h' ? 'hour' : 'day'}`, trendChart(sample.trend, windowKey, 'estimated cost', sample.cost / total))}${block(
    'By project',
    rankedRows(
      [
        { name: 'web-app', value: Math.round(sample.cost * 0.52) },
        { name: 'design-system', value: Math.round(sample.cost * 0.31) },
        { name: 'api', value: Math.round(sample.cost * 0.17) }
      ],
      ' USD'
    )
  )}`
}
function modelsView(sample) {
  return `<div class="demo-stats">${stat('Model turns', numberFormatter.format(sample.turns))}${stat('Models', 3)}${stat('Output tokens', sample.output)}</div>${block('Models used', `<div class="model-ranking">${SAMPLE_MODELS.map((model) => `<div><span><i class="model-dot" style="background:${model.color}"></i>${model.name}</span><span class="model-track"><span style="width:${model.share}%;background:${model.color}"></span></span><strong>${model.share}%</strong></div>`).join('')}</div>`)}${block('Model × effort', `<div class="effort-table"><div class="effort-header"><span>Model</span><span>Recorded reasoning effort</span><span>Turns</span></div>${SAMPLE_MODELS.map((model) => `<div class="effort-row"><span><i class="model-dot" style="background:${model.color}"></i>${model.name}</span><span class="effort-bar">${model.effort.map((value, index) => `<span style="flex:${value};opacity:${[1, 0.72, 0.45, 0.22][index]}" title="${['Xhigh', 'High', 'Medium', 'Low'][index]}: ${Math.round((sample.turns * value) / 100)} sample turns"></span>`).join('')}</span><strong>${numberFormatter.format(Math.round((sample.turns * model.share) / 100))}</strong></div>`).join('')}</div><div class="effort-legend"><span>Xhigh</span><span>High</span><span>Medium</span><span>Low</span></div>`)}<p class="demo-coverage-note">Model turns include subagents. Effort is shown when recorded by Claude Code.</p>`
}
function skillsUsageView(sample, windowKey) {
  const skills = SAMPLE_SKILLS.map((skill) => ({
    ...skill,
    windowUses: sample.skillUses[skill.id] ?? 0
  }))
    .filter((skill) => skill.windowUses > 0)
    .sort((left, right) => right.windowUses - left.windowUses)
    .slice(0, 4)
  return `<div class="demo-stats">${stat('Invocations', sample.invocations)}${stat('Skills used', sample.skillsUsed)}${stat('Sessions', sample.sessions)}</div>${block('Invocations over time', trendChart(sample.invocationTrend, windowKey, 'invocations'))}${block('Top skills', `<div class="top-skill-list">${skills.map((skill) => `<button type="button" data-action="skill" data-value="${skill.id}" class="top-skill-row"><span>${skill.name}</span><strong>${skill.windowUses}</strong>${icon('arrow-up-right')}</button>`).join('')}</div>`)}${block(
    'How they were invoked',
    rankedRows([
      { name: 'User-invoked', value: Math.round(sample.invocations * 0.35) },
      { name: 'Autonomous', value: Math.round(sample.invocations * 0.51) },
      {
        name: 'Subagent',
        value:
          sample.invocations -
          Math.round(sample.invocations * 0.35) -
          Math.round(sample.invocations * 0.51)
      }
    ])
  )}`
}
function residentView() {
  return `<div class="demo-stats">${stat('Measured first-turn tokens', '18,200')}${stat('Sample', 'Cold session')}</div><p class="demo-coverage-note">A qualifying session’s first-turn cache write. Categories below are estimated from injected text.</p>${block('Context composition', `<div class="resident-bar">${SAMPLE_CONTEXT.map((item, index) => `<span style="flex:${item.share};opacity:${1 - index * 0.12}" title="${item.label}: ${numberFormatter.format(item.tokens)} sample tokens"></span>`).join('')}</div><div class="resident-rows">${SAMPLE_CONTEXT.map((item) => `<div><span>${item.label}</span><strong>${numberFormatter.format(item.tokens)}</strong><span>${item.label === 'Remainder' ? 'Remaining' : 'Estimated'}</span></div>`).join('')}</div>`)}<p class="demo-coverage-note">The actual panel requires a suitable local cold-session sample. This is illustrative data.</p>`
}
function pluginView(enabledById) {
  return `<div class="plugin-demo-intro"><h3>Installed plugins</h3><p>Every install, with its scope and state.</p></div><div class="plugin-demo-table"><div class="plugin-demo-heading"><span>Plugin</span><span>Scope</span><span>Skills</span><span>State</span></div>${SAMPLE_PLUGINS.map((plugin) => `<div class="plugin-demo-row"><div class="plugin-demo-name"><span class="plugin-demo-icon">${icon('blocks')}</span><span><strong>${plugin.name}</strong><span>${plugin.marketplace} · ${plugin.version}</span></span></div><span class="plugin-demo-scope">${plugin.scope}</span><span class="mono plugin-demo-count">${plugin.skills}</span><button type="button" role="switch" aria-checked="${enabledById[plugin.id]}" aria-label="${plugin.name} sample plugin" class="plugin-switch ${enabledById[plugin.id] ? 'is-enabled' : ''}" data-action="plugin-toggle" data-value="${plugin.id}"><span></span></button></div>`).join('')}</div><p class="plugin-demo-note">${icon('info')}Try a toggle. Only the sample state changes; the desktop app uses Claude’s CLI for real plugin actions.</p>`
}

export function mountProductDemo(root) {
  if (!(root instanceof HTMLElement))
    throw new TypeError('The product preview needs a root element.')
  let state = {
    section: 'skills',
    source: 'all',
    query: '',
    selectedSkill: null,
    backSection: 'skills',
    panel: 'activity',
    window: '30d',
    announcement: '',
    enabledPlugins: Object.fromEntries(
      SAMPLE_PLUGINS.map((plugin) => [plugin.id, plugin.enabled])
    )
  }

  function skillMatches() {
    const query = state.query.trim().toLocaleLowerCase()
    return SAMPLE_SKILLS.filter(
      (skill) =>
        (state.source === 'all' || skill.source === state.source) &&
        `${skill.name} ${skill.description} ${skill.source}`
          .toLocaleLowerCase()
          .includes(query)
    )
  }
  function sidebar() {
    if (state.section === 'skills') {
      const tokens = SAMPLE_SKILLS.filter(
        (skill) => skill.source !== 'project'
      ).reduce((total, skill) => total + skill.tokens, 0)
      return `<div class="demo-sidebar-title">Megatron<span>Claude Code</span></div><div class="demo-sidebar-nav">${SKILL_SOURCES.map((source) => navigationButton('source', source, source.id === state.source)).join('')}</div><div class="demo-budget"><span class="budget-dot"></span><strong>${numberFormatter.format(tokens)}</strong> / ${numberFormatter.format(CONTEXT_LIMIT)}<span>EST. LISTING TOKENS</span><div class="budget-track"><span style="width:${(tokens / CONTEXT_LIMIT) * 100}%"></span></div></div>`
    }
    if (state.section === 'plugins')
      return `<div class="demo-sidebar-title">Plugins<span>Installed locally</span></div><div class="demo-nav-item is-selected">${icon('blocks')}All installs</div><p class="demo-sidebar-note">User, project, and local scopes.</p>`
    return `<div class="demo-sidebar-title">Usage<span>Your local sessions</span></div><div class="demo-sidebar-nav">${USAGE_PANELS.map((panel) => navigationButton('panel', panel, panel.id === state.panel)).join('')}</div><span class="demo-sidebar-footer">ON-DEVICE ANALYSIS</span>`
  }
  function content() {
    if (state.selectedSkill)
      return skillDetail(
        SAMPLE_SKILLS.find((skill) => skill.id === state.selectedSkill)
      )
    if (state.section === 'skills') {
      const skills = skillMatches()
      return `<div class="demo-content-header"><h3>${SKILL_SOURCES.find((source) => source.id === state.source).label}<span>${skills.length}</span></h3><label class="demo-search">${icon('search')}<span class="sr-only">Search sample skills</span><input type="search" aria-label="Search sample skills" placeholder="Search skills" value="${escapeHtml(state.query)}" data-skill-search /></label></div>${skillTable(skills)}`
    }
    if (state.section === 'plugins') return pluginView(state.enabledPlugins)
    const sample = SAMPLE_WINDOWS[state.window]
    const views = {
      activity: () => activityView(sample, state.window),
      cost: () => costView(sample, state.window),
      models: () => modelsView(sample),
      skills: () => skillsUsageView(sample, state.window),
      resident: residentView
    }
    return `<div class="demo-content-header"><h3>${icon(USAGE_PANELS.find((panel) => panel.id === state.panel).icon)}${USAGE_PANELS.find((panel) => panel.id === state.panel).label}</h3>${state.panel === 'resident' ? '<span class="sample-tag">ILLUSTRATIVE SAMPLE</span>' : `<div class="demo-window-picker" role="tablist" aria-label="Sample time window">${USAGE_WINDOWS.map((window) => `<button type="button" id="window-${window.id}" role="tab" aria-selected="${window.id === state.window}" aria-controls="usage-content" tabindex="${window.id === state.window ? 0 : -1}" data-action="window" data-value="${window.id}">${window.label}</button>`).join('')}</div>`}</div><div id="usage-content" class="demo-usage-content" ${state.panel === 'resident' ? '' : `role="tabpanel" aria-labelledby="window-${state.window}"`}>${views[state.panel]()}</div>`
  }
  function render(focusSelector) {
    root.innerHTML = `<div class="preview-switcher" role="tablist" aria-label="Product preview sections">${PREVIEW_SECTIONS.map((section) => `<button type="button" id="preview-${section.id}" role="tab" aria-selected="${section.id === state.section}" aria-controls="preview-screen" tabindex="${section.id === state.section ? 0 : -1}" class="preview-tab" data-action="section" data-value="${section.id}">${icon(section.icon)}${section.label}</button>`).join('')}<span class="preview-sample-label">INTERACTIVE / SAMPLE DATA</span></div><div class="demo-window"><div class="demo-window-bar"><span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Megatron</span><span class="demo-local-label">${icon('hard-drive')}Local</span></div><div class="demo-app" id="preview-screen" role="tabpanel" aria-labelledby="preview-${state.section}"><div class="demo-rail" aria-label="Preview app sections">${PREVIEW_SECTIONS.map((section) => `<button type="button" data-action="section" data-value="${section.id}" aria-label="Show ${section.label.toLowerCase()} preview" aria-pressed="${section.id === state.section}" class="${section.id === state.section ? 'is-active' : ''}">${icon(section.icon)}</button>`).join('')}<span class="demo-rail-bottom">${icon('lock-keyhole')}</span></div><aside class="demo-sidebar">${sidebar()}</aside><div class="demo-main">${content()}</div></div></div><div class="preview-mobile-controls">${state.section === 'usage' ? `<label>Usage view<select data-usage-select aria-label="Select usage preview">${USAGE_PANELS.map((panel) => `<option value="${panel.id}" ${panel.id === state.panel ? 'selected' : ''}>${panel.label}</option>`).join('')}</select></label>` : state.section === 'skills' && !state.selectedSkill ? `<label>Skill source<select data-source-select aria-label="Select sample skill source">${SKILL_SOURCES.map((source) => `<option value="${source.id}" ${source.id === state.source ? 'selected' : ''}>${source.label}</option>`).join('')}</select></label>` : ''}</div><span class="preview-announcement sr-only" role="status" aria-live="polite">${escapeHtml(state.announcement)}</span>`
    refreshIcons(root)
    if (focusSelector)
      root.querySelector(focusSelector)?.focus({ preventScroll: true })
  }
  function setSection(value) {
    if (!PREVIEW_SECTIONS.some((section) => section.id === value))
      throw new RangeError('Unknown preview section.')
    state = {
      ...state,
      section: value,
      selectedSkill: null,
      announcement: `${value} sample preview`
    }
  }
  function setPanel(value) {
    if (!USAGE_PANELS.some((panel) => panel.id === value))
      throw new RangeError('Unknown usage panel.')
    state = {
      ...state,
      panel: value,
      selectedSkill: null,
      announcement: `${USAGE_PANELS.find((panel) => panel.id === value).label} sample view`
    }
  }
  function handleAction(button) {
    const { action, value } = button.dataset
    let focusSelector = `[data-action="${action}"][data-value="${value}"]`
    switch (action) {
      case 'section':
        setSection(value)
        focusSelector = `#preview-${value}`
        break
      case 'source':
        if (!SKILL_SOURCES.some((source) => source.id === value))
          throw new RangeError('Unknown skill source.')
        state = { ...state, source: value, selectedSkill: null }
        break
      case 'panel':
        setPanel(value)
        break
      case 'window':
        if (!USAGE_WINDOWS.some((window) => window.id === value))
          throw new RangeError('Unknown time window.')
        state = { ...state, window: value }
        break
      case 'skill':
        if (!SAMPLE_SKILLS.some((skill) => skill.id === value))
          throw new RangeError('Unknown sample skill.')
        state = {
          ...state,
          backSection: state.section,
          section: 'skills',
          selectedSkill: value,
          announcement: `Inspecting ${SAMPLE_SKILLS.find((skill) => skill.id === value).name}`
        }
        focusSelector = '[data-action="back"]'
        break
      case 'back': {
        const skillId = state.selectedSkill
        state = { ...state, selectedSkill: null, section: state.backSection }
        focusSelector = `[data-action="skill"][data-value="${skillId}"]`
        break
      }
      case 'plugin-toggle':
        if (!SAMPLE_PLUGINS.some((plugin) => plugin.id === value))
          throw new RangeError('Unknown sample plugin.')
        state = {
          ...state,
          enabledPlugins: {
            ...state.enabledPlugins,
            [value]: !state.enabledPlugins[value]
          },
          announcement: `${value} sample plugin ${state.enabledPlugins[value] ? 'disabled' : 'enabled'}. Only the demo state changed.`
        }
        break
      default:
        throw new RangeError('Unknown preview action.')
    }
    render(focusSelector)
  }
  function clearChartSelection() {
    root
      .querySelectorAll('.chart-bar-button[aria-pressed="true"]')
      .forEach((button) => button.setAttribute('aria-pressed', 'false'))
  }

  function toggleChartPoint(button) {
    const wasSelected = button.getAttribute('aria-pressed') === 'true'
    clearChartSelection()
    button.setAttribute('aria-pressed', String(!wasSelected))
    root.querySelector('.preview-announcement').textContent = wasSelected
      ? 'Sample point unpinned.'
      : `Pinned sample value: ${button.getAttribute('aria-label')}`
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]')
    if (button && root.contains(button)) {
      handleAction(button)
      return
    }
    const chartPoint = event.target.closest('.chart-bar-button')
    if (chartPoint && root.contains(chartPoint)) toggleChartPoint(chartPoint)
  })
  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-skill-search]')) return
    const query = event.target.value.slice(0, 200)
    const selectionStart = event.target.selectionStart
    state = { ...state, query }
    render('[data-skill-search]')
    const input = root.querySelector('[data-skill-search]')
    if (input)
      input.setSelectionRange(
        selectionStart ?? query.length,
        selectionStart ?? query.length
      )
  })
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-usage-select]')) {
      setPanel(event.target.value)
      render('[data-usage-select]')
    }
    if (event.target.matches('[data-source-select]')) {
      const value = event.target.value
      if (!SKILL_SOURCES.some((source) => source.id === value))
        throw new RangeError('Unknown skill source.')
      state = { ...state, source: value }
      render('[data-source-select]')
    }
  })
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clearChartSelection()
    const tab = event.target.closest('[role="tab"]')
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
      return
    event.preventDefault()
    const tabs = [
      ...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')
    ]
    const index = tabs.indexOf(tab)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
            tabs.length
    handleAction(tabs[next])
  })
  render()
  return Object.freeze({
    showCost() {
      setSection('usage')
      setPanel('cost')
      render('#preview-usage')
    }
  })
}
