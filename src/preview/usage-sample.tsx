import { useEffect, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { UsageView, type ActivityWindowKey } from '@/views/UsageView'
import {
  SkillInvocationDialog,
  type SkillInvocationSelection
} from '@/components/usage/SkillInvocationDialog'
import type {
  CostWindowKey,
  SkillStatsWindowKey
} from '../../vendor/megatron/src/shared/ipc'
import { parsePreviewCommand, type PreviewPanel } from './protocol.ts'
import { forwardUnhandledEscape, sendPreviewMessage } from './navigation.ts'

// Matches the app's own Usage defaults so a fresh sample opens on the same window.
const DEFAULT_WINDOW = '30d'
const SKILL_DETAIL_NOTICE =
  'Skill details live in the full Megatron preview at the top of the page.'

function UsagePanelSample({
  panel,
  calendarYear: initialYear
}: {
  panel: PreviewPanel
  calendarYear: number
}): React.JSX.Element {
  const [activityWindow, setActivityWindow] =
    useState<ActivityWindowKey>(DEFAULT_WINDOW)
  const [tokenWindow, setTokenWindow] =
    useState<SkillStatsWindowKey>(DEFAULT_WINDOW)
  const [costWindow, setCostWindow] = useState<CostWindowKey>(DEFAULT_WINDOW)
  const [modelWindow, setModelWindow] =
    useState<SkillStatsWindowKey>(DEFAULT_WINDOW)
  const [skillWindow, setSkillWindow] =
    useState<SkillStatsWindowKey>(DEFAULT_WINDOW)
  const [calendarYear, setCalendarYear] = useState(initialYear)
  const [invocations, setInvocations] =
    useState<SkillInvocationSelection | null>(null)
  const [invocationsOpen, setInvocationsOpen] = useState(false)
  function changeSkillWindow(windowKey: SkillStatsWindowKey): void {
    setInvocationsOpen(false)
    setInvocations(null)
    setSkillWindow(windowKey)
  }
  function showSkillDetailNotice(): void {
    setInvocationsOpen(false)
    sendPreviewMessage({
      type: 'megatron-preview:notice',
      message: SKILL_DETAIL_NOTICE
    })
  }
  return (
    <>
      <UsageView
        panel={panel}
        activityWindow={activityWindow}
        onActivityWindowChange={setActivityWindow}
        tokenWindow={tokenWindow}
        onTokenWindowChange={setTokenWindow}
        calendarYear={calendarYear}
        onCalendarYearChange={setCalendarYear}
        costWindow={costWindow}
        onCostWindowChange={setCostWindow}
        modelWindow={modelWindow}
        onModelWindowChange={setModelWindow}
        skillWindow={skillWindow}
        onSkillWindowChange={changeSkillWindow}
        onShowInvocations={(selection) => {
          setInvocations(selection)
          setInvocationsOpen(true)
        }}
      />
      {invocations && (
        <SkillInvocationDialog
          key={`${invocations.startAt}:${invocations.endAt}:${invocations.skillName ?? ''}`}
          open={invocationsOpen}
          onOpenChange={setInvocationsOpen}
          selection={invocations}
          onSelectSkill={showSkillDetailNotice}
        />
      )}
    </>
  )
}

/**
 * One Usage view without the app's sidebar, for the landing page's analytics
 * cards. The host switches views with navigate commands; each switch remounts
 * the view so it opens on the default window, matching its card.
 */
export function UsageSample({
  initialPanel,
  calendarYear
}: {
  initialPanel: PreviewPanel
  calendarYear: number
}): React.JSX.Element {
  const [opened, setOpened] = useState({ panel: initialPanel, revision: 0 })
  useEffect(() => {
    function receive(event: MessageEvent): void {
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin
      )
        return
      const command = parsePreviewCommand(event.data)
      if (command?.type !== 'megatron-preview:navigate' || !command.panel)
        return
      const panel = command.panel
      setOpened((current) => ({ panel, revision: current.revision + 1 }))
    }
    window.addEventListener('message', receive)
    const stopForwardingEscape = forwardUnhandledEscape()
    return () => {
      window.removeEventListener('message', receive)
      stopForwardingEscape()
    }
  }, [])
  useEffect(() => {
    sendPreviewMessage({
      type: 'megatron-preview:sample-view',
      panel: opened.panel
    })
  }, [opened])
  return (
    <TooltipProvider>
      <main className="usage-sample">
        <UsagePanelSample
          key={opened.revision}
          panel={opened.panel}
          calendarYear={calendarYear}
        />
      </main>
    </TooltipProvider>
  )
}
