/* global document, window, requestAnimationFrame */
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'

let browser
before(async () => {
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
})

async function interactions() {
  try {
    return await import('../qa/interactions.mjs')
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
    assert.fail('The state-aware browser interaction helpers are missing.')
  }
}

test('focus verification waits for delayed restoration in the owning iframe', async () => {
  const { waitForFocus } = await interactions()
  const page = await browser.newPage()
  try {
    await page.setContent(
      '<iframe srcdoc="<button>Return target</button>"></iframe>'
    )
    const target = page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Return target' })
    await target.evaluate((element) => {
      setTimeout(() => element.focus(), 100)
    })
    await waitForFocus(target, { timeout: 2000 })
    assert.equal(
      await target.evaluate((element) => element === document.activeElement),
      true
    )
  } finally {
    await page.close()
  }
})

test('focus verification fails when focus never returns and does not force focus', async () => {
  const { waitForFocus } = await interactions()
  const page = await browser.newPage()
  try {
    await page.setContent(
      '<button>Other</button><button>Return target</button>'
    )
    const other = page.getByRole('button', { name: 'Other', exact: true })
    await other.focus()
    await assert.rejects(
      waitForFocus(page.getByRole('button', { name: 'Return target' }), {
        timeout: 100
      }),
      { name: 'TimeoutError' }
    )
    assert.equal(
      await other.evaluate((element) => element === document.activeElement),
      true
    )
  } finally {
    await page.close()
  }
})

test('tooltip preparation scrolls before focusing so scrolling cannot dismiss the tooltip', async () => {
  const { focusForTooltip } = await interactions()
  const page = await browser.newPage({ viewport: { width: 375, height: 400 } })
  try {
    await page.setContent(
      '<div style="height:1600px"></div><button>Month</button>'
    )
    const target = page.getByRole('button', { name: 'Month' })
    await target.evaluate((element) => {
      element.addEventListener('focus', () => {
        element.dataset.tooltip = 'open'
      })
      window.addEventListener('scroll', () => {
        element.dataset.tooltip = 'closed'
      })
    })
    await focusForTooltip(target)
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve))
    )
    assert.equal(await target.getAttribute('data-tooltip'), 'open')
    assert.equal(
      await target.evaluate((element) => element === document.activeElement),
      true
    )
  } finally {
    await page.close()
  }
})

async function projectFixture(page, expanded, inventory) {
  await page.setContent(
    `<button id="all">All ${inventory}</button><button id="projects">Projects</button><div id="tree"></div>`
  )
  await page.evaluate(
    ({ expanded }) => {
      let rootOpen = true
      let folderOpen = expanded
      let loaded = false
      const tree = document.querySelector('#tree')
      function render() {
        tree.replaceChildren()
        const root = document.createElement('button')
        root.setAttribute(
          'aria-label',
          `${rootOpen ? 'Collapse' : 'Expand'} project list`
        )
        root.setAttribute('aria-expanded', String(rootOpen))
        root.onclick = () => {
          rootOpen = !rootOpen
          render()
        }
        tree.append(root)
        if (!loaded || !rootOpen) return
        const folder = document.createElement('button')
        folder.setAttribute(
          'aria-label',
          `${folderOpen ? 'Collapse' : 'Expand'} Dev repositories`
        )
        folder.setAttribute('aria-expanded', String(folderOpen))
        folder.onclick = () => {
          folderOpen = !folderOpen
          render()
        }
        tree.append(folder)
        if (folderOpen) {
          const project = document.createElement('button')
          project.textContent = 'web-app 4'
          project.onclick = () => {
            document.body.dataset.selectedProject = 'web-app'
          }
          tree.append(project)
        }
      }
      document.querySelector('#all').onclick = () => {
        document.body.dataset.selection = 'all'
      }
      document.querySelector('#projects').onclick = () => {
        rootOpen =
          document.body.dataset.selection === 'projects' ? !rootOpen : true
        document.body.dataset.selection = 'projects'
        render()
      }
      render()
      setTimeout(() => {
        loaded = true
        render()
      }, 150)
    },
    { expanded }
  )
}

for (const inventory of ['Skills', 'Plugins']) {
  for (const expanded of [false, true]) {
    test(`project selection waits for delayed ${inventory} folders and preserves expanded=${expanded}`, async () => {
      const { selectWebProject } = await import('../qa/inventory.mjs')
      assert.equal(typeof selectWebProject, 'function')
      const page = await browser.newPage()
      page.setDefaultTimeout(1000)
      try {
        await projectFixture(page, expanded, inventory)
        await selectWebProject(page)
        assert.equal(
          await page.locator('body').getAttribute('data-selected-project'),
          'web-app'
        )
        assert.equal(
          await page
            .getByRole('button', { name: 'Collapse Dev repositories' })
            .getAttribute('aria-expanded'),
          'true'
        )
      } finally {
        await page.close()
      }
    })
  }
}
