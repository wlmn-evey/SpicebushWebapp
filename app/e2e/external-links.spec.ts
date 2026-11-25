import { expect, test } from '@playwright/test';

test('external links keep their author-selected attributes inside an editable post body', async ({
  page
}) => {
  await page.goto('/blog');
  // Editor hydration inserts the editable subtree after the shared link handler starts.
  await page.locator('main').evaluate(main => {
    const section = document.createElement('section');
    section.innerHTML = `
      <div contenteditable="true">
        <p><a href="https://example.org/source" target="_self" rel="nofollow">Editor source</a></p>
      </div>
      <p><a href="https://example.org/source">Published source</a></p>
    `;
    main.append(section);
  });

  const published = page.getByRole('link', { name: 'Published source' });
  await expect(published).toHaveAttribute('target', '_blank');
  await expect(published).toHaveAttribute('rel', /\bnoopener\b/);
  await expect(published).toHaveAttribute('rel', /\bnoreferrer\b/);

  const editable = page.getByRole('link', { name: 'Editor source' });
  await expect(editable).toHaveAttribute('target', '_self');
  await expect(editable).toHaveAttribute('rel', 'nofollow');
  await expect(editable).not.toHaveAttribute('data-external-link-processed', 'true');
});
