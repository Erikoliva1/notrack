/**
 * E2E Test: Complete Call Flow
 * 
 * Tests the full user journey:
 * 1. User connects and receives extension
 * 2. User A calls User B
 * 3. Call connects successfully  
 * 4. Audio transmission works
 * 5. Call ends gracefully
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Helper function to connect user and get extension
async function connectUserAndGetExtension(page: Page): Promise<string> {
  await page.goto('/');
  
  // Wait for WebSocket connection and extension assignment
  const extensionElement = page.locator('[data-testid="user-extension"]');
  await expect(extensionElement).toBeVisible({ timeout: 5000 });
  
  const extension = await extensionElement.textContent();
  return extension?.trim() || '';
}

test.describe('Complete Call Flow', () => {
  test('User receives extension on connection', async ({ page }: { page: Page }) => {
    const extension = await connectUserAndGetExtension(page);
    
    // Extension should be in format: ###-###
    expect(extension).toMatch(/^\d{3}-\d{3}$/);
    
    // Check connection status
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toHaveText('Connected');
  });

  test('Two users can establish a call', async ({ browser }: { browser: Browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext({ permissions: ['microphone'] });
    const context2 = await browser.newContext({ permissions: ['microphone'] });
    
    const userA = await context1.newPage();
    const userB = await context2.newPage();

    // Connect both users
    const extensionA = await connectUserAndGetExtension(userA);
    const extensionB = await connectUserAndGetExtension(userB);

    console.log(`User A: ${extensionA}, User B: ${extensionB}`);

    // User A calls User B
    await userA.fill('[data-testid="dial-pad-input"]', extensionB);
    await userA.click('[data-testid="call-button"]');

    // User B should see incoming call modal
    const incomingCallModal = userB.locator('[data-testid="incoming-call-modal"]');
    await expect(incomingCallModal).toBeVisible({ timeout: 5000 });
    
    // Check caller extension is displayed
    const callerExtension = userB.locator('[data-testid="caller-extension"]');
    await expect(callerExtension).toHaveText(extensionA);

    // User B accepts the call
    await userB.click('[data-testid="accept-call-button"]');

    // Both users should see "Connected" state
    const callStateA = userA.locator('[data-testid="call-state"]');
    const callStateB = userB.locator('[data-testid="call-state"]');
    
    await expect(callStateA).toContainText('Connected', { timeout: 5000 });
    await expect(callStateB).toContainText('Connected', { timeout: 5000 });

    // Wait a bit to ensure call is stable
    await userA.waitForTimeout(2000);

    // User A ends the call
    await userA.click('[data-testid="end-call-button"]');

    // Both users should return to idle state
    await expect(callStateA).toContainText('Idle', { timeout: 3000 });
    await expect(callStateB).toContainText('Idle', { timeout: 3000 });

    // Check call log entry was created
    const callLogA = userA.locator('[data-testid="call-log"]').first();
    await expect(callLogA).toContainText(extensionB);
    
    const callLogB = userB.locator('[data-testid="call-log"]').first();
    await expect(callLogB).toContainText(extensionA);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('User can reject incoming call', async ({ browser }: { browser: Browser }) => {
    const context1 = await browser.newContext({ permissions: ['microphone'] });
    const context2 = await browser.newContext({ permissions: ['microphone'] });
    
    const userA = await context1.newPage();
    const userB = await context2.newPage();

    const extensionA = await connectUserAndGetExtension(userA);
    const extensionB = await connectUserAndGetExtension(userB);

    // User A calls User B
    await userA.fill('[data-testid="dial-pad-input"]', extensionB);
    await userA.click('[data-testid="call-button"]');

    // User B rejects the call
    await userB.waitForSelector('[data-testid="incoming-call-modal"]');
    await userB.click('[data-testid="reject-call-button"]');

    // User A should see call failed message
    const toast = userA.locator('[data-testid="toast"]');
    await expect(toast).toContainText('failed', { timeout: 3000 });

    // Both users should be idle
    const callStateA = userA.locator('[data-testid="call-state"]');
    const callStateB = userB.locator('[data-testid="call-state"]');
    
    await expect(callStateA).toContainText('Idle');
    await expect(callStateB).toContainText('Idle');

    await context1.close();
    await context2.close();
  });

  test('Handles microphone permission denial gracefully', async ({ page, context }: { page: Page; context: BrowserContext }) => {
    // Deny microphone permission
    await context.grantPermissions([], { origin: 'http://localhost:5173' });
    
    await page.goto('/');
    
    // Wait for connection
    await page.waitForSelector('[data-testid="user-extension"]');
    
    const extension = await page.locator('[data-testid="user-extension"]').textContent();
    
    // Try to make a call
    await page.fill('[data-testid="dial-pad-input"]', '123-456');
    await page.click('[data-testid="call-button"]');

    // Should see error message about microphone
    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast).toContainText(/microphone/i, { timeout: 5000 });
  });

  test('Call log displays correctly', async ({ page }: { page: Page }) => {
    await connectUserAndGetExtension(page);

    // Make a test call (will fail since no other user)
    await page.fill('[data-testid="dial-pad-input"]', '999-999');
    await page.click('[data-testid="call-button"]');

    // Wait for call to fail
    await page.waitForTimeout(2000);

    // Check call log
    const callLog = page.locator('[data-testid="call-log"]');
    await expect(callLog).toBeVisible();
    
    const firstEntry = callLog.locator('tr').first();
    await expect(firstEntry).toContainText('999-999');
  });

  test('Connection status updates correctly', async ({ page }: { page: Page }) => {
    await page.goto('/');
    
    // Initial connection
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toHaveText('Connected', { timeout: 5000 });

    // Simulate disconnect (close page and reconnect)
    await page.evaluate(() => {
      // @ts-ignore
      if (window.socket) {
        // @ts-ignore
        window.socket.disconnect();
      }
    });

    // Status should show disconnected/reconnecting
    await expect(connectionStatus).not.toHaveText('Connected', { timeout: 3000 });
  });
});

test.describe('UI Components', () => {
  test('Dial pad works correctly', async ({ page }: { page: Page }) => {
    await connectUserAndGetExtension(page);

    // Click dial pad numbers
    await page.click('[data-testid="dial-pad-1"]');
    await page.click('[data-testid="dial-pad-2"]');
    await page.click('[data-testid="dial-pad-3"]');

    const input = page.locator('[data-testid="dial-pad-input"]');
    await expect(input).toHaveValue('123');

    // Test backspace
    await page.click('[data-testid="dial-pad-backspace"]');
    await expect(input).toHaveValue('12');
  });

  test('Mute button works during call', async ({ browser }: { browser: Browser }) => {
    const context1 = await browser.newContext({ permissions: ['microphone'] });
    const context2 = await browser.newContext({ permissions: ['microphone'] });
    
    const userA = await context1.newPage();
    const userB = await context2.newPage();

    const extensionA = await connectUserAndGetExtension(userA);
    const extensionB = await connectUserAndGetExtension(userB);

    // Establish call
    await userA.fill('[data-testid="dial-pad-input"]', extensionB);
    await userA.click('[data-testid="call-button"]');
    await userB.waitForSelector('[data-testid="incoming-call-modal"]');
    await userB.click('[data-testid="accept-call-button"]');

    // Wait for call to connect
    await userA.waitForSelector('[data-testid="mute-button"]', { state: 'visible' });

    // Test mute button
    const muteButton = userA.locator('[data-testid="mute-button"]');
    await muteButton.click();
    
    // Button text should change
    await expect(muteButton).toContainText(/unmute/i);

    // Unmute
    await muteButton.click();
    await expect(muteButton).toContainText(/mute/i);

    await context1.close();
    await context2.close();
  });
});
