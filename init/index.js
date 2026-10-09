const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const MONGO_URL ="mongodb://127.0.0.1:27017/wanderlust";

main()
.then(() => {
    console.log("connected to DB");
}).catch(err => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}


const initDB = async () => {
  await Listing.deleteMany({});
  
  // SHORT WAY: Mapbox API ko har ek purani location ke text se real coordinates nikalne ke liye bolna
  const updatedData = await Promise.all(
    initData.data.map(async (obj) => {
      let response = await geocodingClient.forwardGeocode({
        query: obj.location, // Jaise "Goa", "Jaipur", "Mumbai"
        limit: 1,
      }).send();

      return {
        ...obj,
        owner: '6a22ea52cf7d81d50d23e83f', // Aapki user ID
        // Agar Mapbox ko coordinate mil gaya toh wahi save hoga, bina kisi default Delhi ke!
        geometry: response.body.features[0].geometry 
      };
    })
  );

  await Listing.insertMany(updatedData);
  console.log("Data initialized with real location coordinates successfully!");
};
initDB();