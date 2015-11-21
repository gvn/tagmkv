#!/usr/bin/env node

var fs = require('fs');
var program = require('commander');
var inquirer = require('inquirer');
var Handlebars = require('handlebars');

var MovieDB = require('moviedb')(fs.readFileSync('./api-key.txt', {encoding: `utf8`}).trim());
var template = Handlebars.compile(fs.readFileSync('./movie-tags.hbs', {encoding: `utf8`}));

program
  .version('1.0.0')
  .usage('movie')
  .parse(process.argv);

if (!program.args.length) {
  program.help();
}

const MOVIE = program.args[0];

MovieDB.searchMovie({query: MOVIE}, (err, res) => {
  if (err) {
    console.error(err);
    return;
  }

  // TODO : Deal with multiple pages of results
  // TODO : Deal with 0 results
  // TODO : Deal with 1 result
  var movieChoices = res.results.map((result) => {
    return {
      id: result.id,
      title: result.title,
      releaseDate: result.release_date
    };
  })

  // Prompt for the specific movie and grab its unique ID
  var question = [
    {
      type: `list`,
      name: `movieID`,
      message: `Which movie did you want?`,
      choices: movieChoices.map((movie) => {
        return {
          name: movie.title,
          value: movie.id
        }
      })
    }
  ];

  inquirer.prompt(question, (answer) => {
    MovieDB.movieInfo({id: answer.movieID}, (err, res) => {
      if (err) {
        console.error(err);
        return;
      }

      fs.writeFileSync(`tags.xml`, template(res));
    })
  });
});
