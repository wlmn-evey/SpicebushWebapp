#!/usr/bin/env python3
"""
Check if the test page is accessible and what it shows
"""

from playwright.sync_api import sync_playwright
import time

def check_test_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            print("🔍 Checking deployment test page...")
            
            # Try to access the test page
            response = page.goto("https://spicebush-testing.netlify.app/deployment-test/", wait_until="networkidle")
            print(f"   Response status: {response.status}")
            
            if response.status == 404:
                print("   ❌ Test page not found (404) - deployment might not be working")
                return False
            elif response.status == 200:
                print("   ✅ Test page accessible")
                content = page.content()
                if "Deployment Test Page" in content:
                    print("   ✅ Test page content loaded correctly")
                    
                    # Extract timestamp if present
                    if "Build timestamp:" in content:
                        lines = content.split('\n')
                        for line in lines:
                            if "Build timestamp:" in line:
                                print(f"   Build timestamp found: {line.strip()}")
                                break
                    
                    return True
                else:
                    print("   ❌ Test page content not as expected")
                    return False
            else:
                print(f"   ⚠️  Unexpected response status: {response.status}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error accessing test page: {e}")
            return False
        
        finally:
            browser.close()

if __name__ == "__main__":
    success = check_test_page()
    if success:
        print("\n✅ Deployment pipeline appears to be working")
    else:
        print("\n❌ Deployment pipeline may have issues")
