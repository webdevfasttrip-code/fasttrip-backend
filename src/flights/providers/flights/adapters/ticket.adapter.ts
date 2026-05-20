/**
 * Adapter for MakeVoyage Get Booking Details (Ticket Confirmation)
 */

export function mapToMakeVoyageGetDetailsRequest(data: any) {
  return {
    bookingReferenceId: data.bookingRef,
    userReference: data.userReference || {}
  };
}

function cleanBaggage(val: string): string {
  if (!val) return "0";
  // Handle strings like "7KG Kg" or "15KG Kg"
  const part = val.split(' ')[0];
  const numeric = part.replace(/[^0-9]/g, '');
  return numeric || "0";
}

export function mapMakeVoyageGetDetailsResponse(apiRes: any) {
  const data = apiRes.data || {};

  const fare = data.priceDetails?.[0]?.fareDetails || {};
  const pax = data.priceDetails?.[0]?.singlePaxDetails || {};

  return {
    bookingRef: data.bookingReferenceId,
    pnr: data.pnr || "",
    status: "confirmed",

    flights: (data.flightInfo || []).map((f: any) => ({
      airline: f.airlineName,
      airlineCode: f.airlineCode,
      flightNumber: f.flightNumber,

      from: f.origin,
      to: f.destination,

      departureDateTime: `${f.departureDate}T${f.departureTime}`,
      arrivalDateTime: `${f.arrivalDate}T${f.arrivalTime}`,

      duration: f.duration,
      stops: f.stopsCount,
      cabin: f.cabin,

      terminals: {
        from: f.originTerminal,
        to: f.destinationTerminal
      },

      airports: {
        from: f.originAirport,
        to: f.destinationAirport
      }
    })),

    layovers: (data.layoverStopsData || []).map((l: any) => ({
      airline: l.airlineName,
      from: l.origin,
      to: l.destination,
      departure: `${l.departureDate}T${l.departureTime}`,
      arrival: `${l.arrivalDate}T${l.arrivalTime}`,
      duration: l.duration
    })),

    passengers: (data.passengerDetails || []).map((p: any) => ({
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      type: p.paxType,
      gender: p.gender,
      dob: p.dob
    })),

    price: {
      base: Number(fare.baseFare || 0),
      tax: Number(fare.taxAndFees || 0),
      total: Number(fare.totalAmount || 0),
      currency: "INR"
    },

    baggage: {
      adult: {
        hand: cleanBaggage(pax.adult?.handBaggage),
        checkin: cleanBaggage(pax.adult?.checkInBaggage || pax.adult?.checkinBaggage)
      },
      child: {
        hand: cleanBaggage(pax.child?.handBaggage),
        checkin: cleanBaggage(pax.child?.checkInBaggage || pax.child?.checkinBaggage)
      },
      infant: {
        hand: cleanBaggage(pax.infant?.handBaggage),
        checkin: cleanBaggage(pax.infant?.checkInBaggage || pax.infant?.checkinBaggage)
      }
    },

    supplier: "makevoyage"
  };
}
