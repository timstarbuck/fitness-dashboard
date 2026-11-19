import sharp from "sharp";
import { mkdir } from "fs/promises";

console.log("generating icons");

await mkdir("./public", { recursive: true });

const svg = "./src/app/icon.svg";

const sizes = [
  { size: 32, filename: "favicon-32x32.png" },
  { size: 48, filename: "favicon-48x48.png" },
  { size: 180, filename: "apple-touch-icon.png" },
  { size: 192, filename: "icon-192.png" },
  { size: 512, filename: "icon-512.png" },
];

for (const { size, filename } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(`./public/${filename}`);

  console.log(`Generated ${filename}`);
}

await sharp(svg).resize(32, 32).toFile("./public/favicon.ico");

console.log("Generated favicon.ico");
