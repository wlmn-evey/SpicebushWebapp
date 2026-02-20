export const TOUR_CTA_DESTINATION = '/admissions';

export async function getTourLink(): Promise<string> {
  return TOUR_CTA_DESTINATION;
}

export async function getTourSettings(): Promise<{ tourLink: string; tourSchedulingEnabled: boolean }> {
  return {
    tourLink: TOUR_CTA_DESTINATION,
    tourSchedulingEnabled: true
  };
}
