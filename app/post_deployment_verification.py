#!/usr/bin/env python3
"""
Post-deployment verification script to check if changes are now live
"""

from playwright.sync_api import sync_playwright
import time
from datetime import datetime
import os

def post_deployment_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})
        
        try:
            print("🔍 POST-DEPLOYMENT VERIFICATION")
            print("=============================")
            print("Checking https://spicebush-testing.netlify.app...")
            
            # Clear cache and reload
            page.goto("https://spicebush-testing.netlify.app", wait_until="networkidle")
            
            # Force reload to bypass cache
            page.reload(wait_until="networkidle")
            time.sleep(3)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshots_dir = f"/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/screenshots/{timestamp}_post_deploy"
            os.makedirs(screenshots_dir, exist_ok=True)
            
            print("\n🔍 CHECKING FOR LOGIN LINKS:")
            
            # Search for login in footer specifically
            footer_login_selectors = [
                "footer >> text=Login",
                "footer >> text=Log in", 
                "footer >> text=Sign in",
                "footer a[href*='login']",
                "footer a[href*='auth']"
            ]
            
            login_found_in_footer = False
            for selector in footer_login_selectors:
                elements = page.locator(selector).all()
                if elements:
                    for element in elements:
                        try:
                            if element.is_visible():
                                text = element.text_content() or "No text"
                                href = element.get_attribute("href") or "No href"
                                print(f"   ✅ Login found in FOOTER: '{text}', Href: '{href}'")
                                login_found_in_footer = True
                        except Exception as e:
                            print(f"   Error checking footer login: {e}")
            
            if not login_found_in_footer:
                print("   ❌ No login link found in footer")
            
            print("\n🔍 CHECKING FOR HOURS WIDGET IN FOOTER:")
            
            # Check footer for hours content
            footer = page.locator("footer").first
            hours_found_in_footer = False
            
            if footer.count() > 0:
                footer_text = footer.text_content()
                
                # Look for hours-related content
                hours_indicators = [
                    "hours", "Hours", "HOURS",
                    "8:30", "3:30", 
                    "Monday", "Friday",
                    "Extended care", "5:30"
                ]
                
                for indicator in hours_indicators:
                    if indicator in footer_text:
                        print(f"   ✅ Hours indicator found in footer: '{indicator}'")
                        hours_found_in_footer = True
                        break
                
                if not hours_found_in_footer:
                    print("   ❌ No hours information found in footer")
                    print(f"   Footer text: {footer_text[:500]}...")
            else:
                print("   ❌ Footer not found")
            
            # Take screenshots
            page.screenshot(path=f"{screenshots_dir}/full_page.png", full_page=True)
            if footer.count() > 0:
                footer.screenshot(path=f"{screenshots_dir}/footer.png")
            
            # Summary
            print("\n📋 POST-DEPLOYMENT VERIFICATION SUMMARY:")
            print(f"   🔗 Login link in footer: {'✅ YES' if login_found_in_footer else '❌ NO'}")
            print(f"   🕐 Hours widget in footer: {'✅ YES' if hours_found_in_footer else '❌ NO'}")
            
            deployment_successful = login_found_in_footer and hours_found_in_footer
            print(f"\n🎯 DEPLOYMENT STATUS: {'✅ SUCCESS' if deployment_successful else '❌ STILL ISSUES'}")
            
            if not deployment_successful:
                print("\n🔧 TROUBLESHOOTING NEXT STEPS:")
                if not login_found_in_footer:
                    print("   - Login link not moved to footer - check AuthNav component integration")
                if not hours_found_in_footer:
                    print("   - Hours widget not in footer - check footer component implementation")
                print("   - Check Netlify build logs for deployment errors")
                print("   - Verify all recent commits were included in the build")
            
            return {
                "login_in_footer": login_found_in_footer,
                "hours_in_footer": hours_found_in_footer,
                "deployment_successful": deployment_successful,
                "screenshots_dir": screenshots_dir
            }
            
        except Exception as e:
            print(f"❌ Error during post-deployment verification: {e}")
            return {"error": str(e)}
        
        finally:
            browser.close()

if __name__ == "__main__":
    result = post_deployment_verification()
    print(f"\nPost-deployment verification completed: {result}")