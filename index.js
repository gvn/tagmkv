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
  .parse(process.argv);

if (!program.args.length) {
  program.help();
}

const MKV = program.args[0];

var query = MKV.match(/(.*)\.(?:mkv|MKV)/);

if (!query) {
  console.error(chalk.red(`File extension must be ".mkv" or ".MKV".`));
  process.exit(1);
} else {
  query = query[1];
}

MovieDB.searchMovie({query: query}, (err, res) => {
  if (err) {
    console.error(chalk.red(err));
    process.exit(1);
  }

  // TODO : Deal with multiple pages of results
  // TODO : Deal with 1 result

  if (!res.results.length) {
    console.error(chalk.red('No results for specified movie.'));
     process.exit(1);
  }

  console.log(res.results);

  var movieChoices = res.results.map((result) => {
    return {
      id: result.id,
      title: result.title,
      releaseDate: result.release_date,
      releaseYear: result.release_date.split('-')[0] ? result.release_date.split('-')[0] : undefined
    };
  });

  // Prompt for the specific movie if there are many results and grab its unique ID
  var question = [
    {
      type: `list`,
      name: `movieID`,
      message: `Which movie did you want?`,
      choices: movieChoices.map((movie) => {
        return {
          name: `${chalk.bold(movie.title)} – ${movie.releaseYear ? movie.releaseYear : '?'}`,
          value: movie.id
        }
      })
    }
  ];

  inquirer.prompt(question, (answer) => {
    MovieDB.movieInfo({id: answer.movieID}, (err, res) => {
      if (err) {
        console.error(chalk.red(err));
        process.exit(1);
      }

      fs.writeFileSync(`tags.xml`, template(res));

      // Merge tags into file
      shell.exec(`mkvpropedit '${MKV}' --tags all:tags.xml`);
      shell.rm(`tags.xml`);

      console.log(chalk.green(`File successfully tagged!`));
      process.exit();
    })
  });
});
