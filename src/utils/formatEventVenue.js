// Formats an in-person event's venue as "Venue name, Address, Postcode City"
// (matches the backend's eventVenue.js) — skips any missing piece gracefully.
export function formatEventVenue({ event_venue_name, event_address, event_postcode, event_city } = {}) {
  const line1 = [event_venue_name, event_address].filter(Boolean).join(', ');
  const line2 = [event_postcode, event_city].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}
