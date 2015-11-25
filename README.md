# tagmkv

**Tag MKV movies with metadata from The Movie Database via a CLI.**

Requires: `node`, `npm`, `mkvtoolnix`

## Installation

### Mac OSX
- Install [Homebrew](http://brew.sh/).
- `brew install node`
- `brew install mkvtoolnix`
- `npm install tagmkv -g`
- Add your API key from [The Movie Database](https://www.themoviedb.org/documentation/api) to `api-key.txt` in the `tagmkv` folder.

### Windows and Linux

I haven't had a chance to test these platforms, but it should work if you have the required tool dependencies installed.

## Usage

```
tagmkv mkv-file

Options:

  -h, --help     output usage information
  -V, --version  output the version number
  -r, --rename   rename target file with canonical title and release year
```

## Tags

Generated tags are a subset of the [Matroska tagging spec](http://www.matroska.org/technical/specs/tagging/index.html) that apply specifically to movies.

The following tags will be attempted to auto-populate via metadata pulled from [The Movie Database](https://www.themoviedb.org/).

- `TITLE`
- `DIRECTOR`
- `DATE_RELEASED`
- `SUMMARY`
- `DESCRIPTION`
