// utils/imageUpload.js
// ------------------------------------------------------
// Stores images in Cloudinary. Render's disk is wiped on
// every deploy, so photos must not live there long-term.
// ------------------------------------------------------

const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,/;
const TRANSFORM = [{ width: 1280, crop: "limit", quality: "auto" }];

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Accepts a base64 image from the app and returns its permanent URL.
async function uploadImage(dataUrl, folder) {
  if (typeof dataUrl !== "string" || !DATA_URL.test(dataUrl)) {
    throw new Error("Only JPG, PNG or WebP images are allowed.");
  }

  configure();

  const uploaded = await cloudinary.uploader.upload(dataUrl, {
    folder,
    transformation: TRANSFORM
  });

  return uploaded.secure_url;
}

// Moves a multer disk file to Cloudinary. Falls back to the local
// URL when Cloudinary isn't configured, such as in development.
async function storeUploadedFile(file, folder, backendBaseUrl) {
  if (!isConfigured()) {
    return `${backendBaseUrl}/uploads/${file.filename}`;
  }

  configure();

  const uploaded = await cloudinary.uploader.upload(file.path, {
    folder,
    transformation: TRANSFORM
  });

  fs.promises.unlink(file.path).catch(() => {});

  return uploaded.secure_url;
}

module.exports = { uploadImage, storeUploadedFile };
