import { expect, type Page } from '@playwright/test';

/** Read each actual on-screen prompt; never assume a shuffled word or set game state. */
export async function chargeDisplayedWord(page: Page): Promise<string> {
  let word = '';
  for (let index = 0; index < 4; index++) {
    const letter = (await page.locator('#power-letter').textContent())?.trim() ?? '';
    expect(letter).toMatch(/^[A-Z]$/);
    word += letter;
    await page.keyboard.press(letter.toLowerCase());
  }
  await expect(page.locator('body')).toHaveAttribute('data-power-phase', 'ready');
  return word;
}
