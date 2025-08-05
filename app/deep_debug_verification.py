#!/usr/bin/env python3
"""
Deep debug verification to understand exactly what's being rendered
"""

from playwright.sync_api import sync_playwright
import time
from datetime import datetime
import os

def deep_debug_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})
        
        try:
            print("🔍 DEEP DEBUG VERIFICATION")
            print("=========================")
            
            page.goto("https://spicebush-testing.netlify.app", wait_until="networkidle")
            page.reload(wait_until="networkidle")
            time.sleep(5)
            
            # Look for the AuthNav component specifically
            print("\n🔍 SEARCHING FOR AUTH NAV COMPONENT:")
            auth_nav_elements = page.locator("#auth-nav").all()
            print(f"   Found {len(auth_nav_elements)} #auth-nav elements")
            
            for i, element in enumerate(auth_nav_elements):
                try:
                    if element.is_visible():
                        print(f"   AuthNav {i+1} is visible")
                        inner_html = element.inner_html()
                        print(f"   AuthNav {i+1} HTML: {inner_html}")
                    else:
                        print(f"   AuthNav {i+1} is hidden")
                except Exception as e:
                    print(f"   Error checking AuthNav {i+1}: {e}")
            
            # Check for any element containing "Login" or "Sign"
            print("\n🔍 SEARCHING FOR ANY LOGIN/SIGN TEXT:")
            login_text_elements = page.locator("text=/[Ll]ogin|[Ss]ign/").all()
            print(f"   Found {len(login_text_elements)} elements with login/sign text")
            
            for i, element in enumerate(login_text_elements):
                try:
                    text = element.text_content()
                    is_visible = element.is_visible()
                    parent_classes = element.locator("xpath=..").get_attribute("class")
                    print(f"   Element {i+1}: '{text}' (visible: {is_visible}, parent classes: {parent_classes})")
                except Exception as e:
                    print(f"   Error checking login text element {i+1}: {e}")
            
            # Check the footer HTML structure specifically
            print("\n🔍 FOOTER STRUCTURE ANALYSIS:")
            footer = page.locator("footer").first
            if footer.count() > 0:
                footer_html = footer.inner_html()
                
                # Save footer HTML to file for analysis
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                debug_dir = f"/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/debug/{timestamp}"
                os.makedirs(debug_dir, exist_ok=True)
                
                with open(f"{debug_dir}/footer_html.html", "w", encoding="utf-8") as f:
                    f.write(footer_html)
                
                print(f"   Footer HTML saved to: {debug_dir}/footer_html.html")
                
                # Check for AuthNav within footer
                if "auth-nav" in footer_html:
                    print("   ✅ AuthNav component found in footer HTML")
                else:
                    print("   ❌ AuthNav component NOT found in footer HTML")
                
                # Check for HoursWidget
                if "sbms-hours-widget" in footer_html:
                    print("   ✅ HoursWidget component found in footer HTML")
                else:
                    print("   ❌ HoursWidget component NOT found in footer HTML")
                
                # Check for Quick Links section
                if "Quick Links" in footer_html:
                    print("   ✅ Quick Links section found in footer")
                    # Extract Quick Links content
                    quick_links_start = footer_html.find("Quick Links")
                    if quick_links_start != -1:
                        # Find the section containing Quick Links
                        section_end = footer_html.find("</div>", quick_links_start + 500)
                        quick_links_section = footer_html[quick_links_start:section_end + 6]
                        print(f"   Quick Links section content preview: {quick_links_section[:300]}...")
                        
                        with open(f"{debug_dir}/quick_links_section.html", "w", encoding="utf-8") as f:
                            f.write(quick_links_section)
                else:
                    print("   ❌ Quick Links section NOT found in footer")
            
            # Check for JavaScript errors
            print("\n🔍 JAVASCRIPT CONSOLE ERRORS:")
            
            def handle_console(msg):
                if msg.type in ['error', 'warning']:
                    print(f"   {msg.type.upper()}: {msg.text}")
            
            page.on("console", handle_console)
            
            # Reload to catch any console errors
            page.reload(wait_until="networkidle")
            time.sleep(3)
            
            print("\n🔍 BUILD/DEPLOYMENT INDICATORS:")
            page_source = page.content()
            
            # Look for build timestamps or version info
            if "astro" in page_source.lower():
                print("   ✅ Astro framework detected")
            
            # Look for specific commit hashes or build info
            for line in page_source.split('\n'):
                if any(keyword in line.lower() for keyword in ['build', 'version', 'commit', 'deploy']):
                    if len(line.strip()) < 200:  # Only show reasonably short lines
                        print(f"   Build info: {line.strip()}")
            
            return {
                "auth_nav_found": len(auth_nav_elements) > 0,
                "login_text_found": len(login_text_elements) > 0,
                "debug_dir": debug_dir if 'debug_dir' in locals() else None
            }
            
        except Exception as e:
            print(f"❌ Error during deep debug verification: {e}")
            return {"error": str(e)}
        
        finally:
            browser.close()

if __name__ == "__main__":
    result = deep_debug_verification()
    print(f"\nDeep debug verification completed: {result}")