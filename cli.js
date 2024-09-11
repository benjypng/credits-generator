#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const util = require("util");

const readdir = util.promisify(fs.readdir);
const { execSync } = require("child_process");
const licensesRaw = require("./LICENSES.json");

const generateTimestamp = () => {
  const hour = new Date().getHours();
  const min = new Date().getMinutes();
  const sec = new Date().getSeconds();
  return `[${hour}:${min}:${sec}]`;
};

const mapLicense = (arr) => {
  if (arr && arr.length > 0) {
    const newArr = arr.map((i) => i.license);
    if (newArr[0]) {
      return newArr.map((j) => j.id);
    } else {
      return newArr;
    }
  }
};

const runCommandOnFile = (filePath) => {
  const command = `npx @cyclonedx/cyclonedx-npm --ignore-npm-errors ${filePath}`;
  console.log(`${generateTimestamp()} Running command: ${command}`);
  try {
    // Capture the output to a Buffer and convert to a string
    const output = execSync(command, { maxBuffer: 1024 * 10000 }).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command on ${filePath}:`, error);
    return `Error: ${error.message}`;
  }
};

let allDeps = [];
const getDeps = async (dir) => {
  // Ignore the node_modules directory
  if (path.basename(dir) === "node_modules" || path.basename(dir) === "bruno") {
    console.log(`${generateTimestamp()} Skipping node_modules at: ${dir}`);
    return;
  }

  try {
    const files = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          await getDeps(filePath); // Wait for recursive search to complete
        } else if (file.name === "package.json") {
          console.log(
            `${generateTimestamp()} Found package.json at: ${filePath}`,
          );
          try {
            const output = runCommandOnFile(filePath); // This needs to be synchronous or properly handled if async
            const obj = JSON.parse(output);
            const componentGrp = obj.components.map((p) => ({
              name: p.name,
              group: p.group,
              version: p.version,
              bomref: p["bom-ref"],
              author: p.author,
              licenses: mapLicense(p.licenses),
            }));
            allDeps.push(...componentGrp); // Directly push to global allDeps
          } catch (e) {
            console.error(`Error processing ${filePath}:`, e);
          }
        }
      }),
    );
  } catch (err) {
    console.error("Error reading directory:", err);
  }
};

const generateList = (listName, depArr) => {
  console.log(
    `${generateTimestamp()} Collected all dependencies. Generating list...`,
  );
  let list = `${listName}
======================================================
`;
  depArr.forEach((dep) => {
    const template = `Name: ${dep.name}
Group: ${dep.group}
Version: ${dep.version}
BOM-Ref: ${dep.bomref}
Author: ${dep.author}
Licenses: ${dep.licenses ? dep.licenses.join(",") : "No licenses found"}`;
    list += `${template}
======================================================
`;
  });
  return list;
};

// Option 1: This is for a HTML page, but may not be in a format that legal appreciates
//const generateUniqueLicenses = (uniqueLicenses) => {
//  let str = `<ul>`;
//
//  // Create map from JSON
//  const licenseMap = {};
//  licensesRaw.forEach((item) => {
//    licenseMap[item.name] = item.license;
//  });
//
//  uniqueLicenses.forEach((license) => {
//    str += `<li><a href="#${license}">${license}</a></li>`;
//  });
//
//  str += `</ul><hr />`;
//
//  uniqueLicenses.forEach((l) => {
//    if (licenseMap[l]) {
//      str += `<div id="${l}" style="white-space:pre-wrap"><h1>${l}</h1>
//<div style="white-space: pre-wrap">${licenseMap[l]}</div></div>
//<hr />`;
//    } else {
//      console.log(`License for ${l} not found`);
//    }
//  });
//
//  return str;
//};

// Option 2: This is a simple text file that can be opened in MS Word
const generateUniqueLicenses = (uniqueLicenses) => {
  let str = ``;

  // Create map from JSON
  const licenseMap = {};
  licensesRaw.forEach((item) => {
    licenseMap[item.name] = item.license;
  });

  uniqueLicenses.forEach((license) => {
    str += `- ${license}
`;
  });

  str += `================================================

`;

  uniqueLicenses.forEach((l) => {
    if (licenseMap[l]) {
      str += `${l}

${licenseMap[l]}

================================================

`;
    } else {
      console.log(`License for ${l} not found`);
    }
  });

  return str;
};

// ===============================================
// ACTION BEGINS
// ===============================================
const targetDirectory = process.argv[2] || ".";
const main = async () => {
  await getDeps(targetDirectory);
  console.log(`${generateTimestamp()} No issues generating dependencies`);

  const ossList = generateList("OSS LIST", allDeps);
  fs.writeFileSync("sbom.txt", ossList);

  console.log(
    `${generateTimestamp()} Generated OSS list. Generating list of unique licenses...`,
  );

  // Generate list of unique licenses for easy reference
  let uniqueLicenses = allDeps
    .flatMap((dep) => dep.licenses || [])
    .filter((license) => license !== undefined);
  uniqueLicenses = [...new Set(uniqueLicenses)];
  const uniqueLicensesList = generateUniqueLicenses(uniqueLicenses);
  fs.writeFileSync("unique-licenses.txt", uniqueLicensesList, "utf8");

  console.log(
    `${generateTimestamp()} Generated list of unique licenses. Generating packages with undefined licenses...`,
  );

  // For packages with undefined licenses
  const undefinedLicenses = allDeps.filter(
    (dep) => dep.licenses == [undefined] || !dep.licenses,
  );
  if (undefinedLicenses.length > 0) {
    const undefinedList = generateList(
      "UNDEF PACKAGES LIST",
      undefinedLicenses,
    );
    fs.writeFileSync("undef-license.txt", undefinedList);
  }
  console.log(
    `${generateTimestamp()} Generated packages with undefined licenses`,
  );

  console.log(
    `${generateTimestamp()} <<<<<<<<<<<<<<<<<< COMPLETED >>>>>>>>>>>>>>>>>>`,
  );
};

main();
