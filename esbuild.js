const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const glob = require('glob');

const functionsDir = `src/handlers`;
const outDir = `dist`;

const generateEntryPoints = () => {
  let entryPoints = [];

  for (const fileName of fs.readdirSync(path.join(__dirname, functionsDir))) {
    if (fileName.endsWith('.ts')) {
      console.log(`Adding build path for ${fileName}`);
      entryPoints.push(fileName);
    }
  }
  return entryPoints;
};

const externals = [];
const deps = JSON.parse(fs.readFileSync('layer_nodejs_base/nodejs/package.json')).dependencies;
for (const [moduleName] of Object.entries(deps)) {
  const externalDepName = moduleName.includes('/') ? moduleName.split('/')[0] : moduleName;
  if (!externals.includes(externalDepName)) {
    externals.push(externalDepName);
  }
}
console.log('External dependencies: '+externals);

generateEntryPoints().forEach((x) => {
  const targetDir = path.parse(x).name;
  console.log(`Building dist for ${x}, target dir is ${targetDir}`);
  esbuild.build({
    entryPoints: [functionsDir+'/'+x],
    external: externals,
    bundle: true,
    //outdir: path.join(__dirname, outDir, targetDir),
    outfile: path.join(__dirname, outDir, targetDir)+'/index.js',
    //outbase: functionsDir,
    platform: 'node',
    sourcemap: 'inline'
  });
});
