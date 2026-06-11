import fetch from "node-fetch"; // If using Node 18+, remove this line

const BASE_URL = "http://localhost:5000"; // change if needed

async function testJobs() {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/jobs`);
    console.log("Status:", res.status);

    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length === 0) {
      console.log("⚠️ No jobs returned — backend is empty or filtering removed all jobs.");
    } else {
      console.log("✅ Jobs found!");
    }
  } catch (err) {
    console.error("❌ Error calling backend:", err);
  }
}

testJobs();
