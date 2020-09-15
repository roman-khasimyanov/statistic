#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const del = require('del');
const through = require('through2');
/*UTILS*/
const { yellow, green, red } = require('chalk');
const d = require('dayjs');
const imageExts = require('./images');
/* GULP */
const gulp = require('gulp');
const tsCompiler = require('gulp-typescript');
const postcss = require('gulp-postcss');
const gulpLess = require('gulp-less');
const gulpEslint = require('gulp-eslint');
const gulpBabel = require('gulp-babel');
const gulpReplace = require('gulp-replace');
/*POSTCSS*/
const postcssScss = require('postcss-scss');
const postcssLess = require('postcss-less');
const autoprefixer = require('autoprefixer');
const tailwindcss = require('tailwindcss');

const { src, dest, series, parallel, watch } = gulp;
const packageDir = fs.realpathSync(process.cwd());

const dFormat = "HH:mm:ss";

const getStyleParser = (extname) => {
  switch (extname) {
    case '.less':
      return postcssLess;
    default:
      return undefined;
  }
};

gulp.on('start', (data) => {
  if (!(data.name.startsWith('<'))) {
    console.log(
      `[${yellow(d(data.time).format(dFormat))}]`,
      `Task ${yellow(data.name)} started`,
    );
  }
});

gulp.on('stop', (data) => {
  if (!(data.name.startsWith('<'))) {
    console.log(
      `[${yellow(d(data.time).format(dFormat))}]`,
      `Task ${yellow(data.name)} ${green('finished')}`,
    );
  }
});

gulp.on('error', (data) => {
  console.log(
    `[${yellow(d(data.time).format(dFormat))}]`,
    `Task ${yellow(data.name)} ${red('finished')} with`,
    `${red(data.error)}`
  );
  if (!process.argv.includes('--watch')) {
    process.exit(1);
  }
});

const clear = (cb) => {
  del.sync([`${packageDir}/dist`]);
  cb();
};

const eslint = () => {
  configFile = `${packageDir}/.eslintrc.json`;
  console.log(configFile);
  return src([
    `${packageDir}/src/**/*.js`,
    `${packageDir}/src/**/*.jsx`,
    `${packageDir}/src/**/*.ts`,
    `${packageDir}/src/**/*.tsx`
  ])
    .pipe(gulpEslint({
      configFile,
    }))
    .pipe(gulpEslint.format())
    .pipe(gulpEslint.failAfterError())
}

const typescript = () => {
  const tsconfig = require(`${packageDir}/tsconfig.json`);
  return src(`${packageDir}/src/**/*.ts{,x}`)
    .pipe(tsCompiler(tsconfig.compilerOptions))
    .pipe(dest(`${packageDir}/dist`));
};

const styles = () => {
  return src([
    `${packageDir}/src/**/*.css`,
    `${packageDir}/src/**/*.less`,
    `${packageDir}/src/**/*.scss`
  ])
    .pipe(postcss((file) => ({
      plugins: [tailwindcss(), autoprefixer()],
      parser: getStyleParser(file.extname),
    })))
    .pipe(dest(`${packageDir}/dist`));
};

const images = () => {
  return src(imageExts.map((ext) => `${packageDir}/src/**/*.${ext}`))
    .pipe(dest(`${packageDir}/dist`));
}

const buildFunc = () => {
  return series(
    eslint,
    parallel(
      images,
      typescript,
      styles,
    )
  );
};

const watchTask = () => {
  const wt = watch(`${packageDir}/src`, { events: 'all' }, buildFunc());
  wt.on('all', (event, path) => {
    console.log(event, path);
  });
  return wt;
}

const relay = () => {
  return src(`${packageDir}/dist/**/*.js{,x}`)
    .pipe(gulpReplace('.graphql.ts', '.graphql'))
    .pipe(gulpBabel({
      plugins: ["relay"],
    }))
    .pipe(dest(`${packageDir}/dist`));
}

if (process.argv.includes('--watch')) {

  series(watchTask)();
} else {
  if (process.argv.includes('--relay')) {
    series(relay)();
  } else {
    const build = buildFunc();
    build();
  }
}