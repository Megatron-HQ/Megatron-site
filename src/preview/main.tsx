// Must stay ahead of every app renderer import: it installs `window.api`.
import { clock, demo, samplePanel } from './runtime.ts'
import '../../vendor/megatron/src/renderer/src/assets/main.css'
import './styles.css'
import {
  Component,
  StrictMode,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../../vendor/megatron/src/renderer/src/App'
import { createProjectLabelResolver } from '../../vendor/megatron/src/renderer/src/lib/project-tree'
import { ProjectLabelContext } from '../../vendor/megatron/src/renderer/src/lib/use-project-label'
import { parsePreviewThemeMessage, type InventoryChange } from './protocol.ts'
import { sendPreviewMessage } from './navigation.ts'
import { UsageSample } from './usage-sample.tsx'

const queryClient = new QueryClient()
const resolveSampleProjectLabel = createProjectLabelResolver(new Map())

class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    sendPreviewMessage({
      type: 'megatron-preview:error',
      message: error.message
    })
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="preview-error">
        <p>The sample preview could not load.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload sample
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}

function Preview() {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const root = document.documentElement
    if (samplePanel) {
      const receive = (event: MessageEvent) => {
        if (
          event.source !== window.parent ||
          event.origin !== window.location.origin
        )
          return
        const theme = parsePreviewThemeMessage(event.data)
        if (theme) root.classList.toggle('dark', theme.dark)
      }
      window.addEventListener('message', receive)
      sendPreviewMessage({ type: 'megatron-preview:sample-ready' })
      return () => window.removeEventListener('message', receive)
    }
    const publish = () =>
      sendPreviewMessage({
        type: 'megatron-preview:theme',
        dark: root.classList.contains('dark')
      })
    const observer = new MutationObserver(publish)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    publish()
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    async function changeInventory(event: Event) {
      try {
        await demo.simulateInventoryChange(
          (event as CustomEvent<InventoryChange>).detail
        )
      } catch (error) {
        sendPreviewMessage({
          type: 'megatron-preview:notice',
          message:
            error instanceof Error
              ? error.message
              : 'The sample change could not be completed.'
        })
      } finally {
        sendPreviewMessage({ type: 'megatron-preview:inventory-finished' })
      }
    }
    const reset = () => {
      demo.reset()
      queryClient.clear()
      document.documentElement.classList.remove('dark')
      setRevision((value) => value + 1)
    }
    window.addEventListener('megatron-preview:reset', reset)
    window.addEventListener(
      'megatron-preview:inventory-change',
      changeInventory
    )
    function revealFocus(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const bounds = target.getBoundingClientRect()
      sendPreviewMessage({
        type: 'megatron-preview:focus',
        left: bounds.left,
        right: bounds.right
      })
    }
    document.addEventListener('focusin', revealFocus)
    return () => {
      window.removeEventListener('megatron-preview:reset', reset)
      window.removeEventListener(
        'megatron-preview:inventory-change',
        changeInventory
      )
      document.removeEventListener('focusin', revealFocus)
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <PreviewErrorBoundary key={revision}>
        {samplePanel ? (
          <ProjectLabelContext.Provider value={resolveSampleProjectLabel}>
            <UsageSample
              initialPanel={samplePanel}
              calendarYear={clock.getFullYear()}
            />
          </ProjectLabelContext.Provider>
        ) : (
          <App />
        )}
      </PreviewErrorBoundary>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>
)
