const axios = require("axios");

const CHECKR_API = process.env.CHECKR_BASE_URL;
const CHECKR_KEY = process.env.CHECKR_API_KEY;

module.exports = {
  async createCandidate(traveler) {
    const res = await axios.post(
      `${CHECKR_API}/candidates`,
      {
        first_name: traveler.firstName,
        last_name: traveler.lastName,
        email: traveler.email,
        phone: traveler.phone,
        dob: traveler.dob,
        zipcode: traveler.zipcode,
        ssn: traveler.ssn
      },
      {
        auth: { username: CHECKR_KEY, password: "" }
      }
    );

    return res.data.id;
  },

  async createReport(candidateId) {
    const res = await axios.post(
      `${CHECKR_API}/reports`,
      {
        candidate_id: candidateId,
        package: "flexago" // your package name
      },
      {
        auth: { username: CHECKR_KEY, password: "" }
      }
    );

    return res.data.id;
  }
};
