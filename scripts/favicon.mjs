import pngToIco from "png-to-ico";
import { writeFile } from "fs/promises";

const buf = await pngToIco([
  "public/favicon-32x32.png",
  "public/favicon-48x48.png",
]);

await writeFile("public/favicon.ico", buf);

console.log("Generated multi-size favicon.ico");
