/** Supply forecasting derived from confirmed upcoming events.
 *  Constants are starting estimates — tune to Amy's actual consumption. */
const PER_GUEST = {
  drinks: 1.15,       // most guests order once, some twice
  cups: 1.25,         // includes water cups + re-pours
};
const PER_DRINK = {
  beansLb: 0.04,      // ~18 g double shot
  milkGal: 0.055,     // ~7 oz steamed/cold milk avg (some drinks skip milk)
  iceLb: 0.35,        // ~60% of Florida orders are iced
};

export type SupplyForecast = ReturnType<typeof forecastSupplies>;

export function forecastSupplies(events: { event_date: string; guest_count: number | null }[], days = 7) {
  const horizon = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const inWindow = events.filter((e) => e.event_date >= today && e.event_date <= horizon);
  const guests = inWindow.reduce((s, e) => s + (e.guest_count || 0), 0);
  const drinks = Math.ceil(guests * PER_GUEST.drinks);
  return {
    days,
    eventCount: inWindow.length,
    guests,
    drinks,
    beansLb: Math.ceil(drinks * PER_DRINK.beansLb),
    milkGal: Math.ceil(drinks * PER_DRINK.milkGal),
    iceLb: Math.ceil(drinks * PER_DRINK.iceLb),
    cups: Math.ceil(guests * PER_GUEST.cups),
  };
}
