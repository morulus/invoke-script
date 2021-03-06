#!/usr/bin/env node
if (!process.env.INVOKE_SCRIPT_CORE) {
  console.warn("This script should be executed with invoke-script command");
  process.exit(1);
}
const path = require("path");
const echo = require(path.join(
  process.env.INVOKE_SCRIPT_CORE,
  "echo"
));
const target = (process.argv[2] || "").replace(/[./]/g, "");

if (target === "--help") {
  echo(`List all aviable scripts

${echo.strong("invoke ls")} <pattern> [...options]
`);
  process.exit(0);
} else if (!target) {
  // Exit, if target is not specified
  echo("Name required");
  process.exit(1);
}

const args = require("minimist")(process.argv.slice(2));

const cwd = process.cwd();

const findLocalScript = require(path.join(
  process.env.INVOKE_SCRIPT_CORE,
  "find-local-script"
));

findLocalScript(target, {
  cwd,
  detailed: true
})
  .then(info => {
    if (info) {
      if (args.j || args.json) {
        console.log(JSON.stringify(info, null, 1)); // eslint-disable-line
      } else {
        echo(Object.keys(info).map(key => `${key}\t${info[key]}`)
          .join("\n"));
      }
    } else {
      echo(`Script ${target} is not exists`);
      process.exit(1);
    }
  })
  .catch(e => {
    throw e;
  });
