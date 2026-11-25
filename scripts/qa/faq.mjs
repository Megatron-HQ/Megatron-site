import assert from 'node:assert/strict'
import { join } from 'node:path'

export async function verifyFaq(page, screenshotDirectory) {
  const questions = page.locator('.faq-list details')
  const summaries = page.locator('.faq-list summary')
  const toggle = page.getByRole('button', {
    name: 'More questions',
    exact: true
  })
  assert.equal(
    await summaries.filter({ visible: true }).count(),
    5,
    'Only the five installation questions should appear initially.'
  )
  assert.deepEqual(
    await summaries
      .filter({ visible: true })
      .allTextContents()
      .then((labels) => labels.map((label) => label.trim())),
    [
      'Is this a replacement for Claude Code?',
      'Will it change my skill files?',
      'Which platforms and tools are supported?',
      'Is Megatron free?',
      'How do updates work?'
    ]
  )
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
  const additionalId = await toggle.getAttribute('aria-controls')
  assert.ok(additionalId, 'The reveal button must identify its content.')
  const additional = page.locator(`#${additionalId}`)
  assert.equal(await additional.isVisible(), false)

  await summaries.first().focus()
  await page.keyboard.press('Space')
  assert.equal(await questions.first().getAttribute('open'), '')
  await toggle.focus()
  if (screenshotDirectory)
    await page.locator('.faq-section').screenshot({
      path: join(
        screenshotDirectory,
        `faq-collapsed-${page.viewportSize().width}.png`
      )
    })
  await page.keyboard.press('Enter')
  assert.equal(await questions.first().getAttribute('open'), '')
  assert.equal(
    await summaries.filter({ visible: true }).count(),
    await questions.count()
  )
  for (const [question, answer] of [
    [
      'Will my activity history stay available?',
      /archives skill invocations and MCP tool calls/
    ],
    ['How is resident context measured?', /choose Run \/context/]
  ]) {
    const text = await questions
      .filter({ has: page.getByText(question, { exact: true }) })
      .locator('p')
      .textContent()
    assert.match(text.trim().replace(/\s+/g, ' '), answer)
  }
  const fewer = page.getByRole('button', {
    name: 'Fewer questions',
    exact: true
  })
  assert.equal(await fewer.getAttribute('aria-expanded'), 'true')
  assert.equal(
    await summaries
      .nth(5)
      .evaluate((element) => element === document.activeElement),
    true
  )
  await page.keyboard.press('Space')
  assert.equal(await questions.nth(5).getAttribute('open'), '')
  if (screenshotDirectory)
    await page.locator('.faq-section').screenshot({
      path: join(
        screenshotDirectory,
        `faq-expanded-${page.viewportSize().width}.png`
      )
    })
  await fewer.click()
  assert.equal(await summaries.filter({ visible: true }).count(), 5)
  assert.equal(
    await toggle.evaluate((element) => element === document.activeElement),
    true
  )
  await toggle.click()
  assert.equal(
    await questions.nth(5).getAttribute('open'),
    '',
    'Revealing again must retain opened answers.'
  )
  await fewer.click()
  await summaries.first().click()
}

export async function verifyFaqWithoutJavaScript(page) {
  assert.equal(
    await page.locator('.faq-list summary:visible').count(),
    await page.locator('.faq-list summary').count()
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'More questions', includeHidden: true })
      .isVisible(),
    false
  )
}

export async function verifyFaqQuestionCounts(browser, baseUrl) {
  for (const count of [0, 4, 5, 6, 12]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.route(baseUrl, async (route) => {
        const response = await route.fetch()
        const html = await response.text()
        const questions = html.match(/<details>[\s\S]*?<\/details>/g)
        assert.ok(questions?.length >= 6)
        const replacement = Array.from(
          { length: count },
          (_, index) => questions[index % questions.length]
        ).join('\n')
        await route.fulfill({
          response,
          body: html.replace(
            /<details>[\s\S]*?<\/details>[\s\S]*<\/details>/,
            replacement
          )
        })
      })
      await page.goto(baseUrl)
      const summaries = page.locator('.faq-list summary')
      const more = page.getByRole('button', {
        name: 'More questions',
        includeHidden: true,
        exact: true
      })
      assert.equal(
        await summaries.filter({ visible: true }).count(),
        Math.min(count, 5)
      )
      assert.equal(await more.isVisible(), count > 5)
      if (count > 5) {
        await more.click()
        assert.equal(
          await summaries.filter({ visible: true }).count(),
          count,
          'Reveal must include future questions without a fixed total.'
        )
      }
    } finally {
      await context.close()
    }
  }
}
