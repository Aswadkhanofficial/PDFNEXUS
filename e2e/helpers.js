import { PDFDocument } from 'pdf-lib';

export async function makePdf(text, width = 300, height = 300) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  page.drawText(text, { x: 50, y: height / 2, size: 18 });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export const SUPABASE_REF = 'temohfwmgbzneehibgfv';

export function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `fake-access-${now}`,
    refresh_token: 'fake-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 86400,
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@pdfnexus.test',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'E2E Tester' },
      created_at: new Date().toISOString(),
    },
  };
}

export function seedSession(page, session = fakeSession()) {
  return page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: `sb-${SUPABASE_REF}-auth-token`, value: session },
  );
}

export const DOC_FIXTURES = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    file_name: 'Q3-Report.pdf',
    file_url: '11111111-1111-1111-1111-111111111111/1730000000000_Q3-Report.pdf',
    file_size: 245760,
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    file_name: 'Signed-Contract.pdf',
    file_url: '11111111-1111-1111-1111-111111111111/1730000000001_Signed-Contract.pdf',
    file_size: 5120,
    created_at: '2026-07-02T12:30:00Z',
  },
];

export function mockRest(page, { docs = DOC_FIXTURES } = {}) {
  return page.route('**/rest/v1/user_documents*', (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(docs),
    });
  });
}

export function mockStorage(page) {
  return page.route('**/storage/v1/**', (route) => {
    if (['POST', 'DELETE'].includes(route.request().method())) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4 mock'),
    });
  });
}