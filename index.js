#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var program = require('commander');
var inquirer = require('inquirer');
var Handlebars = require('handlebars');
var shell = require('shelljs');
var chalk = require('chalk');

var MovieDB = require('moviedb')(
  fs.readFileSync(
    path.resolve(__dirname, 'api-key.txt'),
    {encoding: `utf8`}
  ).trim()
);

var template = Handlebars.compile(
  fs.readFileSync(
    path.resolve(__dirname, 'movie-tags.hbs'),
    {encoding: `utf8`}
  )
);

program
  .version('1.0.0')
  .usage('mkv-file')
  .option('-r, --rename', 'rename target file with canonical title and release year')
  .parse(process.argv);

if (!program.args.length) {
  program.help();
}

const MKV = program.args[0];

var titleFragment = /([^\n\//]+)\.(?:mkv|MKV)$/;
var query = MKV.match(titleFragment);

if (!query) {
  console.error(chalk.red(`File extension must be ".mkv" or ".MKV".`));
  process.exit(1);
} else {
  query = query[1];
}

query = query.replace(/\./g, ` `); // Replace dots with spaces
query = query.replace(/\d\d\d\d.*/, ``); // Remove year and everything after it

/**
 * Extract the year from a date string
 * @param  {string} releaseDate Date string eg: 2014-12-01
 * @return {number}             Year
 */
function extractYear(releaseDate) {
  if (typeof releaseDate === 'string') {
    return releaseDate.split('-')[0] ? releaseDate.split('-')[0] : undefined;
  } else {
    return undefined;
  }
}

/**
 * Perform a search for specified movie
 * @param  {string} movie
 * @return {object}       Promise that returns a list of movies on completion
 */
function searchMovie(movie) {
  return new Promise(function (resolve, reject) {
    MovieDB.searchMovie({query: movie}, (err, res) => {
      if (err) {
        reject(err);
      }

      // TODO : Deal with multiple pages of results
      // TODO : Deal with 1 result

      if (!res.results.length) {
        reject(`No results found for "${movie}".`);
      }

      resolve(res.results.map((result) => {
        return {
          id: result.id,
          title: result.title,
          releaseDate: result.release_date,
          releaseYear: extractYear(result.release_date)
        };
      }));
    });
  });
}

/**
 * Prompt user to select a movie from a list
 * @param  {array} movies
 * @return {object}        Promise that returns chosen movie data
 */
function askForMovie(movies) {
  return new Promise(function (resolve, reject) {
    // Prompt for the specific movie if there are many results and grab its unique ID
    var question = [
      {
        type: `list`,
        name: `movieID`,
        message: `Which movie did you want?`,
        choices: movies.map((movie) => {
          return {
            name: `${chalk.bold(movie.title)} – ${movie.releaseYear ? movie.releaseYear : '?'}`,
            value: movie.id
          };
        })
      }
    ];

    var title = inquirer.prompt(question, function (answer) {
      resolve(answer);
    });
  });
}

/**
 * Get basic movie details
 * @param  {object} movie
 * @return {object}       Promise with movie details on resolution
 */
function getMovieDetails(movie) {
  return new Promise(function (resolve, reject) {
    MovieDB.movieInfo({id: movie.movieID}, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

/**
 * Get addtional metadata for a movie
 * @param  {string} movie Unique ID for movie
 * @return {object}       Promise with extended metadata
 */
function getMovieCredits(movie) {
  return new Promise(function (resolve, reject) {
    MovieDB.movieCredits({id: movie}, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

var movieData = {};

searchMovie(query).then(function (response) {
  // If there's only 1 match, assume it's correct. Otherwise, ask.
  if (response.length === 1) {
    console.log(`Assuming: ${response[0].title} (${response[0].releaseYear})`);
    return Promise.resolve({movieID: response[0].id});
  } else {
    return askForMovie(response);
  }
}).then(function (response) {
  return getMovieDetails(response);
}).then(function (response) {
  Object.assign(movieData, response);
  return getMovieCredits(response.id);
}).catch(function (error) {
  console.error(chalk.red(error));
  process.exit(1);
}).then(function (response) {
  Object.assign(movieData, response);

  movieData.keyedCrew = {};

  // Make it easy to access crew by using roles as keys
  movieData.crew.forEach((member) => {
    var job = member.job.replace(/ /g, '');
    if (!movieData.keyedCrew[job]) {
      movieData.keyedCrew[job] = member.name;
    } else {
      movieData.keyedCrew[job] = `${movieData.keyedCrew[job]}, ${member.name}`;
    }
  });

  fs.writeFileSync(`tags.xml`, template(movieData));

  // Add main title to file and merge tags into file
  shell.exec(`mkvpropedit "${MKV}" --tags all:tags.xml --set title="${movieData.title}"`);

  // Remove tags XML
  shell.rm(`tags.xml`);

  if (program.rename) {
    // Using iterim file due to shell.js `mv` lacking case sensitivity
    // eg: `snow crash.mkv` won't rename to `Snow Crash.mkv`
    var temp = `${MKV.replace(titleFragment, "TEMPORARY_TITLE")}.mkv`;

    shell.mv(MKV, temp);
    shell.mv(temp, temp.replace("TEMPORARY_TITLE", `${movieData.title} (${extractYear(movieData.release_date)})`));
  }

  console.log(chalk.green(`✓ File successfully tagged!`));

  process.exit();
});
