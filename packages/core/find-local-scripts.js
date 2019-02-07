const path = require("path");
const fs = require("fs");
const glob = require("./glob");
const resolveSystemPath = require("./resolve-system-path");
const dirExists = require("./dir-exists");
const findParentDirs = require("./find-parent-dirs");
const minimatch = require("minimatch");
/**
 * Search for shortcut file
 */

module.exports = async function resolveLocalScripts(options = {}) {
  const {
    groupByLocation,
    ditailed,
    match
  } = options;

  const result = groupByLocation ? {} : [];

  const paths = await findParentDirs(".scripts", {
    cwd: options.cwd
  });

  const builtInScripts = path.dirname(require.resolve("@invoke-script/scripts"));
  const customScriptsPath = await resolveSystemPath("scripts");
  const shortcutsPath = await resolveSystemPath("shortcuts");

  paths.unshift(shortcutsPath);
  paths.unshift(customScriptsPath);
  paths.unshift(builtInScripts);

  for (let i = 0; i < paths.length; i++) {
    const scriptsPath = paths[i];
    let hereResult = result;

    if (groupByLocation) {
      result[scriptsPath] = {
        path: scriptsPath,
        description: "",
        scripts: []
      };
      hereResult = result[scriptsPath].scripts;
    }

    /* Check scripts path containes package.json */
    const packageJsonPath = path.join(
      scriptsPath,
      "package.json"
    );
    let packageJson = false;
    let isBinProvided = false;

    if (fs.existsSync(packageJsonPath)) {
      try {
        packageJson = require(packageJsonPath);
        result[scriptsPath].description = packageJson.description;
      } catch (e) {
        // Invalid package.json
      }

      if (packageJson && typeof packageJson.bin === "object") {
        isBinProvided = true;
        const scripts = Object.keys(packageJson.bin)
          /* Match if it's required by options.match */
          .filter(name => (match
            ? minimatch(name, match)
            : true))
          /* Transform to ditailed output if it's required by options.group */
          .map(name => {
            const scriptPath = path.resolve(scriptsPath, packageJson.bin[name]);

            return ditailed
              ? {
                name,
                path: scriptPath,
                directory: scriptsPath,
                description: packageJson["bin-descriptions"]
                  ? packageJson["bin-descriptions"][name] || ""
                  : ""
              }
              : name;
          });

        hereResult.push(...scripts);
      }
    }

    if (!isBinProvided) {
      const files = await glob(options.match || "!(*.*)", {
        cwd: scriptsPath
      });

      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        const filepath = path.join(scriptsPath, file);
        let description = "";
        let directory = false;
        // Validate script

        if (dirExists(filepath)) {
          directory = filepath;
          /*
           * If script is a file
           * Check for its package.json
           */
          try {
            const packageJson = require(path.join(
              filepath,
              "package.json"
            ));

            description = packageJson.description || "";
          } catch (e) {
            // Package.json have not founded
            continue; // eslint-disable-line
          }
        }
        const info = ditailed
          ? {
            name: file,
            path: filepath,
            directory,
            description
          }
          : file;

        hereResult.push(info);
      }
    }
  }

  return result;
};