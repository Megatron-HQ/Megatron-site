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
import { createDemoApi } from './api.ts'
import { parsePreviewCommand } from './protocol.ts'
import { sendPreviewMessage } from './navigation.ts'

const parameters = new URLSearchParams(window.location.search)
const initial = parsePreviewCommand({
  type: 'megatron-preview:navigate',
  section: parameters.get('section') ?? 'skills',
  ...(parameters.has('panel') ? { panel: parameters.get('panel') } : {})
})
const requestedClock = parameters.get('clock')
const clock = requestedClock ? new Date(requestedClock) : new Date()
if (!Number.isFinite(clock.getTime()))
  throw new RangeError('Invalid sample clock.')
const demo = createDemoApi({
  now: clock,
  initialSection:
    initial?.type === 'megatron-preview:navigate' ? initial.section : 'skills',
  platform: parameters.get('platform') === 'darwin' ? 'darwin' : 'win32',
  scenario: parameters.get('scenario') ?? undefined,
  onSectionChange: (section) =>
    sendPreviewMessage({ type: 'megatron-preview:section', section }),
  onNotice: (message) =>
    sendPreviewMessage({ type: 'megatron-preview:notice', message })
})
window.api = demo.api
const queryClient = new QueryClient()

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
      <p role="alert" className="p-6 text-sm">
        The sample preview could not load. Use Reset sample to try again.
      </p>
    ) : (
      this.props.children
    )
  }
}

function Preview() {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const reset = () => {
      demo.reset()
      queryClient.clear()
      document.documentElement.classList.remove('dark')
      setRevision((value) => value + 1)
    }
    window.addEventListener('megatron-preview:reset', reset)
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
      document.removeEventListener('focusin', revealFocus)
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <PreviewErrorBoundary key={revision}>
        <App />
      </PreviewErrorBoundary>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>
)
