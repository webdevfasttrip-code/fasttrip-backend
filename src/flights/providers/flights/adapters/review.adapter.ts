/**
 * Adapter for MakeVoyage Review (Price Confirmation)
 */

export function mapToMakeVoyageReviewRequest(data: any) {
  const offer = data.offer || data;
  
  const rawTicketId = offer.meta?.ticketId ?? offer.ticketId ?? offer.meta?.supplierTicketId ?? offer.supplierTicketId;
  let parsedTicketId = rawTicketId;
  let extractedFareId: number | undefined;
  if (typeof rawTicketId === 'string' && rawTicketId.includes('~')) {
      const parts = rawTicketId.split('~');
      parsedTicketId = parseInt(parts[0], 10); // First part is ticketId
      if (parts.length > 1) {
          extractedFareId = parseInt(parts[1], 10); // Second part is fareId
      }
  } else if (rawTicketId !== undefined && rawTicketId !== null) {
      parsedTicketId = parseInt(rawTicketId.toString(), 10);
  }

  const rawFlightId = offer.meta?.flightId ?? offer.flightId ?? offer.meta?.supplierFlightId ?? offer.supplierFlightId;
  const parsedFlightId = rawFlightId ? parseInt(rawFlightId.toString().split('~')[0], 10) : undefined;

  const payload: any = {
    referenceId: offer.meta?.referenceId ?? offer.referenceId,
    ticketId: parsedTicketId,
    flightId: parsedFlightId,
  };

  const fareId = offer.meta?.fareId ?? offer.fareId ?? offer.meta?.supplierFareId ?? offer.supplierFareId;
  if (fareId !== undefined && fareId !== null && fareId !== '') {
    payload.fareId = typeof fareId === 'string' ? parseInt(fareId, 10) : fareId;
  } else if (extractedFareId !== undefined) {
    payload.fareId = extractedFareId;
  }
  let adultCount = 1;
  let childCount = 0;
  let infantCount = 0;

  if (data.passengers && Array.isArray(data.passengers) && data.passengers.length > 0) {
    adultCount = data.passengers.filter((p: any) => (p.type || p.passengerType || 'ADULT').toUpperCase().startsWith('A')).length || 1;
    childCount = data.passengers.filter((p: any) => (p.type || p.passengerType || '').toUpperCase().startsWith('C')).length || 0;
    infantCount = data.passengers.filter((p: any) => (p.type || p.passengerType || '').toUpperCase().startsWith('I')).length || 0;
  } else if (data.passengerCount) {
    adultCount = data.passengerCount.adult || 1;
    childCount = data.passengerCount.child || 0;
    infantCount = data.passengerCount.infant || 0;
  }

  payload.passenger = {
    adult: adultCount,
    child: childCount,
    infant: infantCount
  };

  payload.userReference = offer.userReference || data.userReference || {};

  return payload;
}

function cleanBaggage(val: string): string {
  if (!val) return "0";
  // Handle strings like "7KG Kg" or "15KG Kg"
  const part = val.split(' ')[0];
  const numeric = part.replace(/[^0-9]/g, '');
  return numeric || "0";
}

export function mapMakeVoyageReviewResponse(apiRes: any) {
  const data = apiRes.data || {};
  
  // Try multiple paths for fare details and passenger data
  const fareData = data.fareData || data.priceDetails?.[0] || data;
  const fareDetails = fareData.fareDetails || data.fareDetails || {};
  const pax = fareData.singlePaxDetails || data.singlePaxDetails || {};

  // Extract counts from the response if available, or use a reasonable fallback
  const adultCount = data.passengerCount?.adult || data.passengers?.filter((p: any) => p.type === 'ADULT').length || 1;
  const childCount = data.passengerCount?.child || data.passengers?.filter((p: any) => p.type === 'CHILD').length || 0;
  const infantCount = data.passengerCount?.infant || data.passengers?.filter((p: any) => p.type === 'INFANT').length || 0;

  const passengerBreakdown: any = {
    ADULT: {
      count: adultCount,
      base: Number(pax.adult?.baseFare || pax.adult?.baseAmount || 0),
      tax: Number(pax.adult?.otherTax || 0),
      totalBase: Number(pax.adult?.baseFare || pax.adult?.baseAmount || 0) * adultCount,
      totalTax: Number(pax.adult?.otherTax || 0) * adultCount
    }
  };

  if (childCount > 0 || pax.child) {
    passengerBreakdown.CHILD = {
      count: childCount,
      base: Number(pax.child?.baseFare || pax.child?.baseAmount || 0),
      tax: Number(pax.child?.otherTax || 0),
      totalBase: Number(pax.child?.baseFare || pax.child?.baseAmount || 0) * childCount,
      totalTax: Number(pax.child?.otherTax || 0) * childCount
    };
  }

  if (infantCount > 0 || pax.infant) {
    passengerBreakdown.INFANT = {
      count: infantCount,
      base: Number(pax.infant?.baseFare || pax.infant?.baseAmount || 0),
      tax: Number(pax.infant?.otherTax || 0),
      totalBase: Number(pax.infant?.baseFare || pax.infant?.baseAmount || 0) * infantCount,
      totalTax: Number(pax.infant?.otherTax || 0) * infantCount
    };
  }

  // Calculate base fare as sum of all passenger totalBase
  const calculatedBase: number = (Object.values(passengerBreakdown) as any[]).reduce((sum: number, b: any) => sum + (b.totalBase || 0), 0);
  const totalAmount = Number(fareDetails.totalAmount || fareDetails.total || fareDetails.netFare || 0);

  return {
    bookingId: data.bookingId,

    fare: {
      base: calculatedBase,
      tax: totalAmount - calculatedBase,
      total: totalAmount,
      discount: Number(fareDetails.discount || 0),
      currency: "INR"
    },

    passengerBreakdown,

    baggage: {
      // Structure preferred by FlightDetailsCard.jsx
      checkin: { 
        weight: cleanBaggage(pax.adult?.checkinBaggage || pax.adult?.checkInBaggage || fareDetails.checkingBaggage || fareDetails.checkinBaggage || fareDetails.checkInBaggage)
      },
      cabin: { 
        weight: cleanBaggage(pax.adult?.handBaggage || pax.adult?.handbaggage || fareDetails.handBaggage || fareDetails.handbaggage)
      },
      // Per-pax structure used in other parts of the system
      adult: {
        hand: cleanBaggage(pax.adult?.handBaggage || pax.adult?.handbaggage || fareDetails.handBaggage || fareDetails.handbaggage),
        checkin: cleanBaggage(pax.adult?.checkinBaggage || pax.adult?.checkInBaggage || fareDetails.checkingBaggage || fareDetails.checkinBaggage || fareDetails.checkInBaggage)
      },
      child: {
        hand: cleanBaggage(pax.child?.handBaggage || pax.child?.handbaggage || fareDetails.handBaggage || fareDetails.handbaggage),
        checkin: cleanBaggage(pax.child?.checkinBaggage || pax.child?.checkInBaggage || fareDetails.checkingBaggage || fareDetails.checkinBaggage || fareDetails.checkInBaggage)
      },
      infant: {
        hand: cleanBaggage(pax.infant?.handBaggage || pax.infant?.handbaggage || fareDetails.handBaggage || fareDetails.handbaggage),
        checkin: cleanBaggage(pax.infant?.checkinBaggage || pax.infant?.checkInBaggage || fareDetails.checkingBaggage || fareDetails.checkinBaggage || fareDetails.checkInBaggage)
      }
    },

    refundable: fareDetails.refundableType === "Refundable",
    refundableType: fareDetails.refundableType || "Non-Refundable",
    supplier: "makevoyage"
  };
}
