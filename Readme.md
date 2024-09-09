# Stream collection

A small tool to visualize the Pokémon collection of a given file.

![Demo image](https://i.imgur.com/HzTNOGC.png)

## Live version

A live version is currently hosted on this repository's <a href="https://isackender.github.io/poke-collection/" target="_blank">GitHub pages</a>. Since all requests are handled on the client side, the server load is minimal.

## Usage

Upload a `.txt` file with the format:
```
#001 bulbasaur #002 ivysaur #005 charmeleon(s) #007 squirtle
```

The expected file format consists of one line with the Pokédex number of each Pokémon and its name. If a Pokémon is shiny, append `(s)` to its name.

## Filters 

![Filter images](https://i.imgur.com/p72G5lI.png)

You can filter Pokémon by type.

The filters are non-overlapping, meaning if you select both Fire and Ground types, it will display all Pokémon that have either Fire **or** Ground as their type.

The first time a filter is used, it may take a bit longer to load as it filters the entire set of Pokémon. Once filtered, the selection is cached in memory to improve performance for future requests.

## Species

**Currently Work In Progress** - There are also some filters to select the species of the whole collection (shiny, legendary, or mythical).

## Exceptions

Since some Pokémon have gender (like Nidoran), you can specify it with `m` or `f` after their name (for male or female respectively). Ex: `Nidoranf` or `Nidoranm(s)`
