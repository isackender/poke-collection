# Stream collection

A small tool to visualize the pokemon collection of a given file.

## Usage

Upload a `.txt` file with the format:
```
#bulbasaur #002 ivysaur #005 charmeleon(s) #007 squirtle
```

Text must be lowercase and the expected file format is one line with all the pokemon you have. 

If a pokemon is shiny, concatenate `(s)` its name.

## Filters 

![Filter images](https://i.imgur.com/p72G5lI.png)

The selection of the filters is not overlapped. This means that if you select Fire and Groud types, it will display all the pokemon that have Fire **OR** Ground as their types.

## Species

**Currently Work In Progress** - There are also some filters to select the species of the whole collection. 

## Live version

Currently, a live version is hosted on GitHub pages: https://isackender.github.io/poke-collection/