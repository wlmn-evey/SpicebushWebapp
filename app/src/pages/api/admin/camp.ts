import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const asString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const asInt = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const buildRedirect = (
  redirectTo: string | null,
  key: 'saved' | 'error',
  value: string
): Response | null => {
  if (!redirectTo) return null;
  const glue = redirectTo.includes('?') ? '&' : '?';
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${redirectTo}${glue}${key}=${encodeURIComponent(value)}`
    }
  });
};

const parseBody = async (request: Request): Promise<Record<string, unknown> | null> => {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
      return json as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    return payload;
  } catch {
    return null;
  }
};

export const GET: APIRoute = async ({ locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const data = await db.camp.getCampAdminData();
  return jsonResponse(data);
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin, user } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const body = await parseBody(request);
  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const action = asString(body.action);
  const redirectTo = parseRedirectPath(body.redirectTo);

  if (!action) {
    const redirect = buildRedirect(redirectTo, 'error', 'camp_action_missing');
    if (redirect) return redirect;
    return jsonResponse({ error: 'Missing action' }, 400);
  }

  if (action === 'create-season') {
    const seasonId = await db.camp.createCampSeason({
      slug: asString(body.slug),
      name: asString(body.name),
      year: asInt(body.year),
      isActive: asBoolean(body.isActive),
      registrationOpenAt: asString(body.registrationOpenAt) || null,
      registrationCloseAt: asString(body.registrationCloseAt) || null
    });

    if (!seasonId) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_season_create_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to create season' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_season_created');
    if (redirect) return redirect;
    return jsonResponse({ success: true, seasonId });
  }

  if (action === 'save-season') {
    const seasonId = asString(body.seasonId);
    const updated = await db.camp.updateCampSeason(seasonId, {
      slug: asString(body.slug),
      name: asString(body.name),
      year: asInt(body.year),
      isActive: asBoolean(body.isActive),
      registrationOpenAt: asString(body.registrationOpenAt) || null,
      registrationCloseAt: asString(body.registrationCloseAt) || null
    });

    if (!updated) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_season_update_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to update season' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_season_updated');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'create-week') {
    const weekId = await db.camp.createCampWeek({
      seasonId: asString(body.seasonId),
      slug: asString(body.slug),
      themeTitle: asString(body.themeTitle),
      summary: asString(body.summary),
      description: asString(body.description),
      startDate: asString(body.startDate),
      endDate: asString(body.endDate),
      ageRangeLabel: asString(body.ageRangeLabel),
      hoursLabel: asString(body.hoursLabel),
      priceLabel: asString(body.priceLabel),
      capacityTotal: asInt(body.capacityTotal),
      seatsConfirmed: asInt(body.seatsConfirmed),
      seatsHeld: asInt(body.seatsHeld),
      waitlistEnabled: asBoolean(body.waitlistEnabled, true),
      limitedThreshold: asInt(body.limitedThreshold, 4),
      enrollmentUrl: asString(body.enrollmentUrl),
      waitlistUrl: asString(body.waitlistUrl) || null,
      isPublished: asBoolean(body.isPublished),
      displayOrder: asInt(body.displayOrder, 0),
      registrationOpenAt: asString(body.registrationOpenAt) || null,
      registrationCloseAt: asString(body.registrationCloseAt) || null
    });

    if (!weekId) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_week_create_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to create week' }, 400);
    }

    await db.camp.replaceCampWeekVariantsFromLines(weekId, body.variantLines);

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_week_created');
    if (redirect) return redirect;
    return jsonResponse({ success: true, weekId });
  }

  if (action === 'save-week') {
    const weekId = asString(body.weekId);
    const updated = await db.camp.updateCampWeek(weekId, {
      seasonId: asString(body.seasonId),
      slug: asString(body.slug),
      themeTitle: asString(body.themeTitle),
      summary: asString(body.summary),
      description: asString(body.description),
      startDate: asString(body.startDate),
      endDate: asString(body.endDate),
      ageRangeLabel: asString(body.ageRangeLabel),
      hoursLabel: asString(body.hoursLabel),
      priceLabel: asString(body.priceLabel),
      capacityTotal: asInt(body.capacityTotal),
      seatsConfirmed: asInt(body.seatsConfirmed),
      seatsHeld: asInt(body.seatsHeld),
      waitlistEnabled: asBoolean(body.waitlistEnabled, true),
      limitedThreshold: asInt(body.limitedThreshold, 4),
      enrollmentUrl: asString(body.enrollmentUrl),
      waitlistUrl: asString(body.waitlistUrl) || null,
      isPublished: asBoolean(body.isPublished),
      displayOrder: asInt(body.displayOrder, 0),
      registrationOpenAt: asString(body.registrationOpenAt) || null,
      registrationCloseAt: asString(body.registrationCloseAt) || null
    });

    if (!updated) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_week_update_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to update week' }, 400);
    }

    await db.camp.replaceCampWeekVariantsFromLines(weekId, body.variantLines);

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_week_updated');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'delete-week') {
    const weekId = asString(body.weekId);
    const deleted = await db.camp.deleteCampWeek(weekId);

    if (!deleted) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_week_delete_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to delete week' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_week_deleted');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'adjust-seats') {
    const weekId = asString(body.weekId);
    const adjusted = await db.camp.adjustCampWeekSeats({
      weekId,
      deltaConfirmed: asInt(body.deltaConfirmed, 0),
      deltaHeld: asInt(body.deltaHeld, 0),
      deltaCapacity: asInt(body.deltaCapacity, 0),
      note: asString(body.note),
      actorEmail: user?.email ?? null
    });

    if (!adjusted) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_adjust_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to adjust seats' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_seats_adjusted');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'save-variants') {
    const weekId = asString(body.weekId);
    const updated = await db.camp.replaceCampWeekVariantsFromLines(weekId, body.variantLines);

    if (!updated) {
      const redirect = buildRedirect(redirectTo, 'error', 'camp_variants_update_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to update variants' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'camp_variants_updated');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  const redirect = buildRedirect(redirectTo, 'error', 'camp_action_invalid');
  if (redirect) return redirect;
  return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
};
