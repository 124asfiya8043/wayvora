const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const geocodingClient = mbxGeocoding({ accessToken: process.env.MAP_TOKEN });

const dbUrl = process.env.ATLASDB_URL;
const OWNER_ID = "6ac8c8a51a5153519b95bf37";

const initDB = async () => {
  await Listing.deleteMany({});

  const updatedData = [];
  for (const obj of initData.data) {
    const response = await geocodingClient
      .forwardGeocode({
        query: `${obj.location}, ${obj.country}`,
        limit: 1,
      })
      .send();

    const feature = response.body.features[0];
    if (!feature) {
      console.log("Location nahi mili, skip:", obj.title);
      continue;
    }

    updatedData.push({
      ...obj,
      owner: OWNER_ID,
      geometry: feature.geometry,
    });
  }

  await Listing.insertMany(updatedData);
  console.log(`${updatedData.length} listings initialized successfully!`);
};

async function main() {
  await mongoose.connect(dbUrl);
  console.log("connected to DB");
  await initDB();
  await mongoose.connection.close();
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});