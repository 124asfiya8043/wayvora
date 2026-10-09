const Listing = require("../models/listing.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req,res) => {
  let allListings = await Listing.find({});
  res.render("listings/index.ejs", {allListings});
};

module.exports.search =  async (req, res) => {
    let { q } = req.query;
    if (!q || q.trim() === "") {
        req.flash("error", "Please enter a keyword to search!");
        return res.redirect("/listings");
    }

    const safeQuery = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    let searchQuery = [
        { title: { $regex: safeQuery, $options: "i" } },
        { location: { $regex: safeQuery, $options: "i" } },
        { country: { $regex: safeQuery, $options: "i" } },
        { description: { $regex: safeQuery, $options: "i" } }
    ];

    const parsedPrice = Number(q);
    if (!isNaN(parsedPrice)) {
        searchQuery.push({ price: parsedPrice });
    }

    let allListings = await Listing.find({ $or: searchQuery });

    if (allListings.length === 0) {
        req.flash("error", `No listings found matching "${q}". Try another keyword!`);
        return res.redirect("/listings");
    }
    res.render("listings/index.ejs", { allListings });
};



module.exports.renderNewForm = (req,res) => {
    res.render("listings/new.ejs");             //1
};


module.exports.showListing = async (req,res) => {
let {id} = req.params;
const listing = await Listing.findById(id)
.populate({path: "reviews",
   populate: {path: "author"}
}).populate("owner");
if(!listing){
   req.flash("error",  "Listing you requested for does not exist!");
   res.redirect("/listings");
}
res.render("listings/show.ejs", {listing});
};


module.exports.createListing = async (req,res,next) => {

  let response = await geocodingClient.forwardGeocode({
  query: req.body.listing.location,
  limit: 1,
})
  .send();

  let url = req.file.path;
  let filename = req.file.filename;
  const newListing = new Listing(req.body.listing);     //1
  newListing.owner = req.user._id;
  newListing.image = {url, filename};
  newListing.geometry = response.body.features[0].geometry;
console.log(response.body.features);
 let savedListing = await newListing.save(); 

  req.flash("success",  "New Listing Created!");
  res.redirect("/listings");
};


module.exports.renderEditForm = async (req,res) => {
   let {id} = req.params;
const listing = await Listing.findById(id);         //2
if(!listing){
   req.flash("error",  "Listing you requested for does not exist!");
   res.redirect("/listings");
}

let originalImageUrl = listing.image.url;
originalImageUrl.replace("/upload", "/upload/w_250");

res.render("listings/edit.ejs", {listing, originalImageUrl});
};


module.exports.updateListing = async (req,res) => {
       let {id} = req.params;
       // 1. Mapbox se nayi location ke coordinates nikalna
    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
    }).send();

    // 2. Listing ko update karna aur sath me nayi geometry save karna
    let listing = await Listing.findByIdAndUpdate(id, { 
        ...req.body.listing,
        geometry: response.body.features[0].geometry 
    });
      // let listing = await Listing.findByIdAndUpdate(id,{...req.body.listing});      //2
       
        if(typeof req.file !=="undefined"){
           let url = req.file.path;
          let filename = req.file.filename;
          listing.image = {url, filename};
          await listing.save();
        }
        req.flash("success",  "Listing Updated!");
      res.redirect(`/listings/${id}`);
};


module.exports.destroyListing = async (req,res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
      req.flash("success",  "Listing Deleted!");
    res.redirect("/listings");
};

