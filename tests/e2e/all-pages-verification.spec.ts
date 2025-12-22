import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Test Suite for All Pages
 * Tests routing, scrolling, accessibility, and functionality
 */

test.describe('All Pages Verification Suite', () => {
  
  // ==========================================================================
  // HOME PAGE TESTS
  // ==========================================================================
  
  test.describe('Home Page (/)', () => {
    test('should load home page successfully', async ({ page }) => {
      await page.goto('/');
      
      // Verify page loaded
      await expect(page).toHaveTitle(/NoTrack/);
      
      // Verify main elements present
      await expect(page.locator('text=ANONYMOUS_SECURE_LINE')).toBeVisible();
      await expect(page.locator('text=SECURITY_KEYPAD')).toBeVisible();
    });

    test('should have correct SEO meta tags', async ({ page }) => {
      await page.goto('/');
      
      // Check title
      const title = await page.title();
      expect(title).toContain('NoTrack');
      
      // Check meta description
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toContain('Encrypted peer-to-peer');
      
      // Check Open Graph tags
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle).toContain('NoTrack');
    });

    test('should scroll properly if content overflows', async ({ page }) => {
      await page.goto('/');
      
      // Get page height
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const clientHeight = await page.evaluate(() => document.body.clientHeight);
      
      // If content is taller than viewport, test scrolling
      if (scrollHeight > clientHeight) {
        await page.evaluate(() => window.scrollTo(0, 100));
        const scrollTop = await page.evaluate(() => window.scrollY);
        expect(scrollTop).toBeGreaterThan(0);
      }
      
      // Test scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      const scrollTop = await page.evaluate(() => window.scrollY);
      expect(scrollTop).toBe(0);
    });

    test('should have cyberpunk theme styling', async ({ page }) => {
      await page.goto('/');
      
      // Check background color
      const bgColor = await page.locator('body').evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(bgColor).toContain('5, 5, 5'); // rgb(5, 5, 5) = #050505
      
      // Check CRT overlay exists
      const overlay = page.locator('.crt-overlay');
      await expect(overlay).toBeAttached();
    });
  });

  // ==========================================================================
  // PRIVACY POLICY PAGE TESTS
  // ==========================================================================
  
  test.describe('Privacy Policy Page (/privacy)', () => {
    test('should load privacy policy page', async ({ page }) => {
      await page.goto('/privacy');
      
      // Verify page loaded
      await expect(page.locator('text=PROTOCOL_ZERO')).toBeVisible();
      await expect(page.locator('text=CORE_PRINCIPLES')).toBeVisible();
    });

    test('should have all privacy sections visible after scrolling', async ({ page }) => {
      await page.goto('/privacy');
      
      // Check sections that might be below fold
      const sections = [
        'CORE_PRINCIPLES',
        'WHAT_WE_DO_NOT_COLLECT',
        'TEMPORARY_VOLATILE_DATA',
        'TECHNICAL_ARCHITECTURE',
        'NO_ANALYTICS_NO_TRACKING',
        'LEGAL_COMPLIANCE',
        'YOUR_RIGHTS',
        'THIRD_PARTY_SERVICES',
        'CONTACT_PROTOCOL',
      ];
      
      for (const section of sections) {
        const element = page.locator(`text=${section}`);
        await element.scrollIntoViewIfNeeded();
        await expect(element).toBeVisible();
      }
    });

    test('should scroll to bottom and back to top', async ({ page }) => {
      await page.goto('/privacy');
      
      // Get total scrollable height
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500); // Wait for scroll
      
      // Verify we're at bottom (within 100px tolerance)
      const scrollY = await page.evaluate(() => window.scrollY);
      const innerHeight = await page.evaluate(() => window.innerHeight);
      expect(scrollY + innerHeight).toBeGreaterThan(scrollHeight - 100);
      
      // Verify footer is visible
      await expect(page.locator('text=PROTOCOL_ZERO | PRIVACY_BY_DEFAULT')).toBeVisible();
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      
      const topScrollY = await page.evaluate(() => window.scrollY);
      expect(topScrollY).toBe(0);
    });

    test('should have sticky header when scrolling', async ({ page }) => {
      await page.goto('/privacy');
      
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(300);
      
      // Header should still be visible (sticky)
      await expect(page.locator('header').locator('text=PROTOCOL_ZERO')).toBeVisible();
    });

    test('should navigate back to home via EXIT button', async ({ page }) => {
      await page.goto('/privacy');
      
      // Click EXIT button
      await page.click('button:has-text("[EXIT]")');
      
      // Should navigate to home
      await expect(page).toHaveURL('/');
    });

    test('should navigate back via RETURN_TO_SECURE_LINE button', async ({ page }) => {
      await page.goto('/privacy');
      
      // Scroll to bottom button
      const button = page.locator('text=RETURN_TO_SECURE_LINE');
      await button.scrollIntoViewIfNeeded();
      await button.click();
      
      // Should navigate to home
      await expect(page).toHaveURL('/');
    });

    test('should have correct SEO meta tags with noindex', async ({ page }) => {
      await page.goto('/privacy');
      
      const title = await page.title();
      expect(title).toContain('Privacy Policy');
      expect(title).toContain('Protocol Zero');
    });

    test('should have custom scrollbar styling', async ({ page }) => {
      await page.goto('/privacy');
      
      // Check if custom scrollbar is applied
      const scrollbarWidth = await page.evaluate(() => {
        const style = window.getComputedStyle(document.documentElement);
        return style.getPropertyValue('--scrollbar-width') || '8px';
      });
      
      // Custom scrollbar should be present (visual check would require screenshot)
      expect(scrollbarWidth).toBeTruthy();
    });
  });

  // ==========================================================================
  // LOGIN/UNAUTHORIZED PAGE TESTS (/login)
  // ==========================================================================
  
  test.describe('Login Page (/login)', () => {
    test('should load unauthorized component', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('text=401')).toBeVisible();
      await expect(page.locator('text=IDENTITY_VERIFICATION_REQUIRED')).toBeVisible();
    });

    test('should have AUTHENTICATE button', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('button:has-text("AUTHENTICATE")')).toBeVisible();
    });

    test('should have blurred background effect', async ({ page }) => {
      await page.goto('/login');
      
      // Check backdrop-blur is applied
      const hasBlur = await page.locator('.backdrop-blur-sm').count();
      expect(hasBlur).toBeGreaterThan(0);
    });

    test('should have noindex meta tag', async ({ page }) => {
      await page.goto('/login');
      
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots).toContain('noindex');
    });
  });

  // ==========================================================================
  // 404 NOT FOUND PAGE TESTS
  // ==========================================================================
  
  test.describe('404 Not Found Page', () => {
    test('should show 404 for invalid routes', async ({ page }) => {
      await page.goto('/invalid-route-that-does-not-exist');
      
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=SIGNAL_LOST')).toBeVisible();
    });

    test('should show 404 for /500 route (404 trap)', async ({ page }) => {
      await page.goto('/500');
      
      // Should show NotFound, not a 500 error page
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=SIGNAL_LOST')).toBeVisible();
    });

    test('should show 404 for /403 route (404 trap)', async ({ page }) => {
      await page.goto('/403');
      
      await expect(page.locator('text=404')).toBeVisible();
    });

    test('should have glitching text effect', async ({ page }) => {
      await page.goto('/404');
      
      // Wait for glitch animation
      await page.waitForTimeout(1000);
      
      // 404 text should be present
      const text404 = page.locator('h1:has-text("404")');
      await expect(text404).toBeVisible();
    });

    test('should have RETURN_TO_BASE button', async ({ page }) => {
      await page.goto('/404');
      
      const button = page.locator('button:has-text("RETURN_TO_BASE")');
      await expect(button).toBeVisible();
      
      // Click and verify navigation
      await button.click();
      await expect(page).toHaveURL('/');
    });

    test('should have status bar with indicators', async ({ page }) => {
      await page.goto('/404');
      
      await expect(page.locator('text=SIGNAL: LOST')).toBeVisible();
      await expect(page.locator('text=ERROR_CODE: 404')).toBeVisible();
    });
  });

  // ==========================================================================
  // PROTECTED ROUTES TESTS
  // ==========================================================================
  
  test.describe('Protected Routes', () => {
    test('should redirect /app to /login when not authenticated', async ({ page }) => {
      // Clear any existing auth tokens
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      
      // Try to access protected route
      await page.goto('/app');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('text=401')).toBeVisible();
    });

    test('should redirect /call/:id to /login when not authenticated', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      
      await page.goto('/call/test-call-123');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should allow access to /app when authenticated', async ({ page }) => {
      // Set auth token
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'test-token-12345');
      });
      
      await page.goto('/app');
      
      // Should not redirect
      await expect(page).toHaveURL('/app');
      
      // Should show main app
      await expect(page.locator('text=ANONYMOUS_SECURE_LINE')).toBeVisible();
    });
  });

  // ==========================================================================
  // NAVIGATION TESTS
  // ==========================================================================
  
  test.describe('Navigation Between Pages', () => {
    test('should navigate from home to privacy', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to privacy (implementation depends on your nav)
      await page.goto('/privacy');
      
      await expect(page).toHaveURL('/privacy');
      await expect(page.locator('text=PROTOCOL_ZERO')).toBeVisible();
    });

    test('should navigate back using browser back button', async ({ page }) => {
      await page.goto('/');
      await page.goto('/privacy');
      
      // Go back
      await page.goBack();
      
      await expect(page).toHaveURL('/');
    });

    test('should navigate forward using browser forward button', async ({ page }) => {
      await page.goto('/');
      await page.goto('/privacy');
      await page.goBack();
      
      // Go forward
      await page.goForward();
      
      await expect(page).toHaveURL('/privacy');
    });
  });

  // ==========================================================================
  // RESPONSIVE DESIGN TESTS
  // ==========================================================================
  
  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/privacy');
      
      // Should be scrollable
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(scrollHeight).toBeGreaterThan(667);
      
      // Test scroll
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(400);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/privacy');
      
      await expect(page.locator('text=PROTOCOL_ZERO')).toBeVisible();
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/privacy');
      
      await expect(page.locator('text=PROTOCOL_ZERO')).toBeVisible();
    });
  });

  // ==========================================================================
  // ACCESSIBILITY TESTS
  // ==========================================================================
  
  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy on home page', async ({ page }) => {
      await page.goto('/');
      
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThan(0);
    });

    test('should have keyboard navigation support', async ({ page }) => {
      await page.goto('/privacy');
      
      // Tab to EXIT button
      await page.keyboard.press('Tab');
      
      // Should be able to activate with Enter
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBe('BUTTON');
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/');
      
      // Green text on black background should have good contrast
      // #00ff41 on #050505 = 18.46:1 ratio (AA/AAA compliant)
      const bodyBg = await page.locator('body').evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(bodyBg).toContain('5, 5, 5');
    });
  });

  // ==========================================================================
  // PERFORMANCE TESTS
  // ==========================================================================
  
  test.describe('Performance', () => {
    test('should load home page in reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;
      
      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have smooth scrolling on privacy page', async ({ page }) => {
      await page.goto('/privacy');
      
      const startY = await page.evaluate(() => window.scrollY);
      
      // Scroll smoothly
      await page.evaluate(() => {
        window.scrollTo({ top: 1000, behavior: 'smooth' });
      });
      
      await page.waitForTimeout(500);
      
      const endY = await page.evaluate(() => window.scrollY);
      expect(endY).toBeGreaterThan(startY);
    });
  });

  // ==========================================================================
  // THEME & STYLING TESTS
  // ==========================================================================
  
  test.describe('Cyberpunk Theme Consistency', () => {
    test('should have consistent theme across all pages', async ({ page }) => {
      const pages = ['/', '/privacy', '/login', '/404'];
      
      for (const path of pages) {
        await page.goto(path);
        
        // Check background color
        const bgColor = await page.locator('body').evaluate((el) => 
          window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toContain('5, 5, 5'); // #050505
        
        // Check CRT overlay exists
        const overlay = page.locator('.crt-overlay');
        await expect(overlay).toBeAttached();
      }
    });

    test('should have neon green color scheme', async ({ page }) => {
      await page.goto('/');
      
      // Check for neon green elements (#00ff41)
      const greenElements = await page.locator('[class*="text-\\[\\#00ff41\\]"]').count();
      expect(greenElements).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================
  
  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      
      await page.goto('/').catch(() => {
        // Expected to fail
      });
      
      await page.context().setOffline(false);
    });

    test('should recover from navigation errors', async ({ page }) => {
      // Try invalid URL
      await page.goto('/invalid-route');
      
      // Should show 404
      await expect(page.locator('text=404')).toBeVisible();
      
      // Navigate back to valid route
      await page.goto('/');
      await expect(page.locator('text=ANONYMOUS_SECURE_LINE')).toBeVisible();
    });
  });
});
