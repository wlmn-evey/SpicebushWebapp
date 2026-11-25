# Google API access (Search Console, Analytics, Business Profile, PageSpeed, Places)

How to give site tooling (and Claude sessions) read access to Spicebush's Google data, with one dedicated Google account, one sign-in, and every credential in 1Password. The tool is `app/scripts/google-access.mjs`.

## What this gives you

| Service                                | Access                                 | Used for                                                                        |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Search Console                         | read-only                              | real search terms, impressions and positions; which pages Google has indexed    |
| Google Analytics (GA4, `G-5CTELDESVX`) | read-only                              | which channels produce tour clicks                                              |
| Business Profile                       | manage (Google has no read-only scope) | hours, categories, photos, review replies, monthly calls and direction requests |
| PageSpeed Insights                     | API key                                | mobile and desktop Lighthouse scores                                            |
| Places                                 | API key                                | tracking the school's and competitors' review counts                            |
| Google Ads                             | optional                               | keyword volumes and the paid test, only after a developer token is approved     |

The Business Profile scope can change the live listing. Treat every change there (category, hours, replies) as needing the school's go-ahead first.

## Who does what

1. **The school's Google admin** creates the dedicated account and grants it access (Part A). About 20 minutes.
2. **Evey**, signed in as that account, sets up the Cloud project and OAuth client (Part B). About 30 minutes.
3. **Evey (or a Claude session on her Mac)** stores the credentials and signs in once with the script (Part C).
4. **Business Profile API access** needs Google's approval (Part D). It can take days to weeks, so send the application on day one. Everything else works before it's approved.

## Part A — School's Google admin

1. **Create the account.** In the Google Workspace admin console, add a user such as `web-agent@spicebushmontessori.org`. A Workspace account lets the Cloud app be **Internal**, so its sign-in never expires; with a free Gmail account, Google expires test-mode sign-ins after 7 days. Send the username and temporary password to Evey separately (for example a 1Password share link). She changes the password on first sign-in, turns on 2-Step Verification, and saves the login to 1Password.
2. **Search Console.** At search.google.com/search-console, pick the `spicebushmontessori.org` property, then go to **Settings → Users and permissions → Add user**. Enter the account and choose **Restricted**.
3. **Google Analytics.** At analytics.google.com, go to **Admin → Property access management → + → Add users**. Enter the account, choose the **Viewer** role, and click **Add**.
4. **Business Profile.** Search Google for "Spicebush Montessori School" while signed in as an owner. Open the profile menu (⋮), then go to **Business Profile settings → People and access → Add**. Enter the account and choose **Manager**, not Owner. The account then accepts the emailed invitation.
5. **Google Ads** is optional. Only if the school approves a paid test: **Admin → Access and security → +**, with Standard access.

To remove all access later, delete the account or remove it from each service.

## Part B — Cloud project (Evey, signed in as the dedicated account)

Use console.cloud.google.com in a browser profile signed in as the dedicated account only.

1. **Create a project**, e.g. "Spicebush tooling". Note its **project number**; Part D needs it.
2. **Enable these APIs** (APIs & Services → Library):
   - Google Search Console API
   - Google Analytics Admin API
   - Google Analytics Data API
   - My Business Account Management API
   - My Business Business Information API
   - Business Profile Performance API
   - PageSpeed Insights API
   - Places API (New), which requires a billing account on the project. The volume used here stays within Google's free monthly credit.
3. **Set up OAuth** (Google Auth Platform):
   - **Branding:** set the app name to "Spicebush tooling" and the support email to the dedicated account.
   - **Audience:** choose **Internal**. This is only offered for Workspace accounts. With Gmail it must be External, then _Publish app_; otherwise sign-ins expire after 7 days.
   - **Clients → Create client:** choose application type **Desktop app**, then **download the JSON**.
4. **Create the API key.** Go to APIs & Services → Credentials → **Create credentials → API key**. Then open the key, choose **Restrict key**, and set API restrictions to **PageSpeed Insights API** and **Places API (New)**. Keep the key on screen for Part C step 2; don't paste it anywhere else.

## Part C — Store the credentials and sign in

Run from `app/`. Everything is saved to one 1Password item, **"Spicebush Google API access"** (tag `spicebush-google-api`), in the personal **Development Work** vault, through `opdev personal`. Values are passed on stdin, never as arguments, and nothing secret is printed.

```bash
node scripts/google-access.mjs store-client ~/Downloads/client_secret_*.json
rm ~/Downloads/client_secret_*.json
node scripts/google-access.mjs store-api-key
node scripts/google-access.mjs sign-in --account web-agent@spicebushmontessori.org
node scripts/google-access.mjs check
```

- `store-client` saves the OAuth client ID and secret from the downloaded JSON. Delete the JSON afterwards.
- `store-api-key` asks for the key with hidden input. You can also pipe the key in.
- `sign-in` opens Google's consent page in the browser and listens on a random `127.0.0.1` port for the reply, using PKCE. It saves the refresh token, the account email and the granted scopes.
  - If the browser was signed in as a different account, the script revokes that sign-in and saves nothing.
  - Add `--with-ads` once Google Ads access is wanted. Add `--no-browser` to print the link instead of opening it.
- `check` reports what each credential can reach: the Search Console properties, the GA4 properties, the Business Profile accounts, a live PageSpeed score, and the school's Places review count.

Each save writes a fresh item and archives the previous one. That's because `op item edit` only takes values as command-line arguments, which other processes can see. Archived copies stay in 1Password's archive.

## Part D — Business Profile API approval (and Ads, optional)

- **Business Profile:** follow the prerequisites and access-request form at <https://developers.google.com/my-business/content/prereqs>. Use the project number from Part B and the dedicated account's email; the account must be a manager of the profile. Until Google approves, `check` shows Business Profile as "quota exhausted or not granted yet", and that's expected.
- **Google Ads:** a developer token comes from a Google Ads manager account's API Center. Apply only if the paid test goes ahead.

## Troubleshooting

| `check` / sign-in says                                                       | Meaning and fix                                                                                                                                                 |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Access blocked … can only be used within its organization"                  | The browser signed in with an account outside the school's Workspace. Sign in as the dedicated account.                                                         |
| `invalid_grant`                                                              | The sign-in expired or was revoked. External apps in Testing expire after 7 days; switch the Audience to Internal or publish the app, then run `sign-in` again. |
| "API not enabled in the Cloud project"                                       | Enable that API (Part B step 2), wait a minute, run `check` again.                                                                                              |
| Search Console / GA4 / Business Profile: "no … shared with this account yet" | Part A isn't finished for that service, or the Business Profile invitation hasn't been accepted.                                                                |
| Business Profile: "quota exhausted or not granted yet"                       | Waiting on Google's API approval (Part D).                                                                                                                      |
| Places: billing error                                                        | Attach a billing account to the project.                                                                                                                        |
| "Google returned no refresh token"                                           | Remove "Spicebush tooling" at <https://myaccount.google.com/permissions> and run `sign-in` again.                                                               |

## Revoking

Any one of these stops access:

- remove the account from each service, or suspend the account;
- delete the OAuth client in the Cloud project;
- remove the app at <https://myaccount.google.com/permissions>.

Then archive the 1Password item.
