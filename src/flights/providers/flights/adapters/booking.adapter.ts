/**
 * Adapter for MakeVoyage Booking Initiation
 */

export function mapToMakeVoyageBookingRequest(data: any) {
  return {
    bookingId: data.bookingId,

    passenger: data.passengers.map((p: any) => {
      const type = (p.type || "ADT").toUpperCase();
      const gender = (p.gender || 'MALE').toUpperCase();
      const isFemale = gender === 'FEMALE' || gender === 'F';

      // 🧠 Determine title based on type and gender
      let title = p.title;
      if (type === 'ADT') {
        if (!title) title = isFemale ? 'Ms' : 'Mr';
      } else {
        // For CHD and INF, only Master/Miss are allowed
        title = isFemale ? 'Miss' : 'Master';
      }

      // Format DOB if available
      let dobStr = p.dob || '';
      if (!dobStr && p.dateOfBirth) {
         try {
             const d = new Date(p.dateOfBirth);
             dobStr = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
         } catch(e) {}
      }

      // 🧠 For Infants, travelWith must match Adult title + firstName exactly
      let travelWith = "";
      if (type === 'INF' || type === 'INFANT') {
          const firstAdult = data.passengers.find((pass: any) => (pass.type || 'ADT').toUpperCase() === 'ADT');
          if (firstAdult) {
              const adultIsFemale = (firstAdult.gender || 'MALE').toUpperCase().startsWith('F');
              const adultTitle = firstAdult.title || (adultIsFemale ? 'Ms' : 'Mr');
              travelWith = `${adultTitle} ${firstAdult.firstName}`;
          }
      }

      return {
        title,
        firstName: p.firstName,
        lastName: p.lastName,
        dob: dobStr,
        travelWith,
        nationality: p.nationality || "IN",
        issuedCountry: p.passport?.issuedCountry || p.issuedCountry || "",
        passportNo: p.passport?.number || p.passportNo || "",
        issueDate: p.passport?.issueDate || p.issueDate || "",
        expiryDate: p.passport?.expiryDate || p.expiryDate || "",
        paxType: type === 'INFANT' ? 'INF' : type
      };
    }),

    countryCode: data.contact?.countryCode || "+91",
    mobileNo: data.contact?.phone || "",
    emailId: data.contact?.email || "",

    gst: data.gst || {
      registerNo: "",
      registerCompanyName: "",
      registerEmail: "",
      registerAddress: "",
      registerMobile: ""
    },

    userReference: data.userReference || {}
  };
}

export function mapMakeVoyageBookingResponse(apiRes: any) {
  // According to supplier response format provided: data is res.data?.[0]
  const data = apiRes.data?.[0] || apiRes.data || {};

  return {
    bookingRef: data.bookingReferenceId,
    status: data.bookingStatus?.toLowerCase() || "pending",

    pnr: (data.pnrInfo || []).map((p: any) => {
      const key = Object.keys(p)[0];
      return {
        sector: key,
        pnr: p[key]
      };
    }),

    supplier: "makevoyage"
  };
}
