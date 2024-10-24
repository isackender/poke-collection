let currentPage = 0;  // Keeps track of the current page
const pageSize = 100;  // Number of Pokémon to load per batch
let allPokemonsLoaded = false;  // Indicates if all Pokémon have been loaded
let isLoading = false;
let isFilteringText = false;
let isFilteringType = false;
let isFilteringSpecies = false;


let typesDataArray = [];
let pokemonDataArray = [];

$(document).ready(async function () {
    loadSpeciesFilters();
    await loadTypeFilters();
    await loadTypesData();

    // Hide the loader
    $('#loader').fadeOut();

    $('#paste-button').on('click', async function () {
        try {
            const text = await navigator.clipboard.readText();

            if (text) {
                $('#loader').fadeIn(function () {
                    $('#pokemon-container').empty();
                });

                // Resets initial variables
                currentPage = 0;
                allPokemonsLoaded = false;
                isLoading = false;
                isFilteringText = false;
                isFilteringType = false;
                isFilteringSpecies = false;

                typesDataArray = [];
                pokemonDataArray = [];

                iniPokemonCollection(text);
            } else {
                alert('No text available in the clipboard.');
            }
        } catch (err) {
            alert('Error reading text from clipboard.');
            console.error('Error:', err);
        }
    });

    $('#file-input').on('change', function (event) {
        const file = event.target.files[0];

        if (file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const validExtensions = ['txt']; // List of allowed file extensions

            if (!validExtensions.includes(fileExtension)) {
                alert('Invalid file format. Please upload a .txt file.');
                return;
            }

            if (file.type !== 'text/plain') {
                alert('Invalid file type. Please upload a text file.');
                return;
            }

            const reader = new FileReader();

            reader.onload = function (e) {
                // Show the loader
                $('#loader').fadeIn(function () {
                    $('#pokemon-container').empty();
                });

                const fileContent = e.target.result;
                // Resets initial variables
                currentPage = 0;

                allPokemonsLoaded = false;
                isLoading = false;
                isFilteringText = false;
                isFilteringType = false;
                isFilteringSpecies = false;

                typesDataArray = [];
                pokemonDataArray = [];

                iniPokemonCollection(fileContent);
            };

            reader.readAsText(file);
        }
    });
});

async function iniPokemonCollection(collectionFileContent) {
    await loadFile(collectionFileContent);
    await sortPokemonArray();
    await loadNextSetOfPokemon();
}

// Fetch all Pokémon types from PokeAPI
async function loadTypeFilters() {
    return new Promise((resolve) => {
        P.getTypesList().then((typesData) => {
            typesData.results.forEach(type => {
                if (type.name === 'stellar' || type.name === 'shadow' || type.name === 'unknown') {
                    return;
                }
                const typeCheckbox = $(`
                    <label class="filter-label">
                        <input type="checkbox" class="type-filter" value="${type.name}" hidden>
                    </label>
                `);
                $('#type-filters').append(typeCheckbox);
                typesDataArray.push({
                    name: type.name,
                    spriteUrl: "#"
                });
            });
            resolve();
        })
            .catch(() => {
                console.log(`Types request failed`);
                resolve(); // To avoid blocking next requests
            });
    });
}

// Fetch all types data from PokeAPI
async function loadTypesData() {
    let promises = typesDataArray.map(type => {
        return new Promise((resolve) => {
            // P.resource(["/api/v2/type/"+type.name]).then((typeData) => {
            P.getTypeByName(type.name).then((typeData) => {
                type.spriteUrl = typeData["sprites"]["generation-viii"]["legends-arceus"]["name_icon"];
                const checkbox = document.querySelectorAll(`input[type='checkbox'][value='${type.name}']`);
                const imgCheckbox = $(`<img  class="type-sprite" src="${type.spriteUrl}"></img>`);
                $(checkbox).parent().append(imgCheckbox);

                resolve();
            })
                .catch((error) => {
                    console.error(`Unable to load type data for: ${type.name}`);
                    console.error(error);
                    resolve(); // To avoid blocking next requests
                });
        });
    });

    // console.log(typesDataArray);

    return Promise.all(promises);
}

function loadSpeciesFilters() {
    let speciesArray = ['shiny', 'legendary', 'mythical']

    speciesArray.forEach(species => {
        const typeCheckbox = $(`
            <label>
                <input type="checkbox" class="species-filter" value="${species}">
                ${species.charAt(0).toUpperCase() + species.slice(1)}
            </label>
        `);
        $('#species-filters').append(typeCheckbox);
    });
}

// Fetch pokemon data from the text file
async function loadFile(fileContent) {
    return new Promise((resolve, reject) => {
        const pokemonArray = fileContent.split('#');
        pokemonArray.shift(); // Remove the first empty element

        pokemonArray.forEach(pokemon => {
            const parts = pokemon.trim().split(' ');
            let number = parts[0];
            let name = capitalizeFirstLetter(parts.slice(1).join(' ').toLowerCase());
            let apiName = parts.slice(1).join('-').replace("'", "").replace(".", "").toLowerCase();
            let imgSrc = "#";
            let artworkSrc = "#";
            let isShiny = false;
            let isLegendary = false;
            let isMythical = false;
            let isError = false;
            let types = [];

            // Check if the pokemon is shiny
            if (name.endsWith('(s)')) {
                isShiny = true;
                name = name.replace('(s)', '').trim();
                apiName = apiName.replace('(s)', '').trim();
            }

            if (name.toLowerCase().includes('nidoran')) { // Nidoran gender
                name = name.replace('f', '♀').trim();
                apiName = apiName.replace('f', '-f').trim();
                name = name.replace('m', '♂').trim();
                apiName = apiName.replace('m', '-m').trim();
            }

            pokemonDataArray.push({
                number: number,
                name: name,
                apiName: apiName,
                imgSrc: imgSrc,
                artworkSrc: artworkSrc,
                isShiny: isShiny,
                isLegendary: isLegendary,
                isMythical: isMythical,
                isError: isError,
                types: types
            });
        });
        resolve();
    });
}

// Sort the pokemon array
async function sortPokemonArray() {
    pokemonDataArray.sort(function (a, b) {
        return a.number - b.number;
    });
}

async function loadNextSetOfPokemon() {
    if (allPokemonsLoaded) return;  // Stop loading if all Pokémon are loaded

    // Determine the Pokémon subset to load based on the current page
    const pokemonSubset = pokemonDataArray.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    currentPage++;  // Move to the next page. Increment early to prevent multiple loading

    // If fewer Pokémon are loaded than the pageSize, mark as all loaded
    if (pokemonSubset.length < pageSize) {
        allPokemonsLoaded = true;
    }

    // console.log(pokemonSubset);

    await loadPokemonBaseData(pokemonSubset);  // Fetch base data
    await loadPokemonData(pokemonSubset);  // Fetch aditional data
    await renderPokemonItems(pokemonSubset);  // Render the current batch of Pokémon
}

// Fetch data from PokeAPI
async function loadPokemonBaseData(pokemonSet) {
    let promises = pokemonSet.map(pokemon => {
        let preApiName = pokemon.apiName;
        return new Promise((resolve) => {
            P.getPokemonSpeciesByName(preApiName).then((pokemonData) => {
                pokemon.isLegendary = pokemonData.is_legendary;
                pokemon.isMythical = pokemonData.is_mythical;
                pokemon.apiName = pokemonData.varieties[0].pokemon.name;
                pokemon.number = pokemonData.id;
                resolve();
            })
                .catch(() => {
                    console.error(`Unable to load species data for Pokémon: ${preApiName}`);
                    resolve(); // To avoid blocking next requests
                });
        });
    });

    return Promise.all(promises);
}

// Fetch data from PokeAPI
async function loadPokemonData(pokemonSet) {
    let promises = pokemonSet.map(pokemon => {
        return new Promise((resolve) => {
            P.getPokemonByName(pokemon.apiName).then((pokemonData) => {
                const imgSrc = pokemon.isShiny ? pokemonData.sprites.front_shiny : pokemonData.sprites.front_default;
                pokemon.imgSrc = imgSrc;
                pokemon.artworkSrc = pokemonData.sprites['other']['official-artwork']['front_default'];
                pokemon.types = pokemonData.types.map(type => type.type.name);
                resolve();
            })
                .catch(() => {
                    console.error(`Unable to load data for Pokémon: ${pokemon.apiName}`);
                    pokemon.isError = true;
                    resolve(); // To avoid blocking next requests
                });
        });
    });

    return Promise.all(promises);
}

// Render pokemon items
async function renderPokemonItems(pokemonSet) {
    let itemcount = 0;
    let promises = pokemonSet.map(pokemon => {
        return new Promise((resolve) => {
            const pokemonDiv = $(`
                <div class="perspective-container" style="opacity: 0">
                <div class="pokemon ${pokemon.isShiny ? 'shiny' : ''} ${pokemon.isLegendary ? 'legendary' : ''} ${pokemon.isMythical ? 'mythical' : ''} ${pokemon.isError ? 'error' : ''} card" data-name="${pokemon.apiName}" data-types="${pokemon.types.join(' ')}">
                    <h2>#${pokemon.number.toString().padStart(3, '0')}${pokemon.isShiny ? '<span>⭐</span>' : ''}</h2>
                    <img src="${pokemon.imgSrc}" alt="${pokemon.name}">
                    <p>${pokemon.name}</p>
                    <div class="glow-specular"></div>
                    <div class="glow"></div>
                    <div class="glow-border"></div>
                    <div class="shadow"></div>
                </div>
                </div>
            `);

            // Append to the container
            $('#pokemon-container').append(pokemonDiv);

            itemcount++;

            // Add a delay before applying the animation
            setTimeout(() => {
                $(pokemonDiv).css({
                    'opacity': '1',  // Make the item visible
                    'animation': 'fadeInUp 0.5s ease'  // Apply the animation
                });
            }, itemcount * 20);  // Increase delay for each item (100ms for example)

            resolve();
        });
    });

    cardifyItems();

    // Hide the loader and show the content
    $('#loader').fadeOut(300, function () {
        $('#pokemon-container').css('opacity', 1); // Show content
    });

    return Promise.all(promises);
}

$(window).on('scroll', async function () {
    if (isFilteringText || isFilteringType || isFilteringSpecies || isLoading || allPokemonsLoaded) return;

    if ($(window).scrollTop() + $(window).height() >= $(document).height() - 2 * ($(window).height())) {
        isLoading = true;  // Prevent further scroll events while loading
        $('#page-loader').css({ 'display': 'flex' });  // Show the loader while loading more Pokémon
        await loadNextSetOfPokemon();  // Load the next set of Pokémon
        $('#page-loader').css({ 'display': 'none' });  // Hide the loader after loading
        isLoading = false;  // Allow further scroll events
    }
});


// Capitalize functionality
let capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Search functionality
let timeout = null;
$('#search-input').on('keyup', async function () {
    // Debounce event 
    clearTimeout(timeout);

    // Make a new timeout set to go off in 1000ms (1 second)
    timeout = setTimeout(async function () {
        await filterPokemons();
    }, 800);
});

// Type filter functionality
$(document).on('change', '.type-filter', async function () {
    await filterPokemons();
});

// Species filter functionality
$(document).on('change', '.species-filter', async function () {
    await filterPokemons();
});

async function filterPokemons() {
    /* Text filtering */

    const query = $('#search-input').val().toLowerCase();

    if (query.length > 0) {
        isFilteringText = true;  // Disable scroll-based loading during search
        $('#pokemon-container').empty();
        $('#page-loader').css({ 'display': 'flex' });
    } else {
        isFilteringText = false;  // Re-enable scroll-based loading when search is cleared
    }

    /* Type filtering */

    const selectedTypes = $('.type-filter:checked').map(function () {
        return this.value;
    }).get();

    $('.type-filter').each(function () {
        if ($(this).is(':checked')) {
            $(this).next().css({ 'box-shadow': '0 0 10px 0 #7792bb' });
        } else {
            $(this).next().css({ 'box-shadow': 'none' });
        }
    });

    if (selectedTypes.length > 0) {
        isFilteringType = true;  // Disable scroll-based loading during search
        $('#pokemon-container').empty();
        $('#page-loader').css({ 'display': 'flex' });
    } else {
        isFilteringType = false;  // Re-enable scroll-based loading when search is cleared
    }

    /* Species selector filtering */

    const selectedSpecies = $('.species-filter:checked').map(function () {
        return this.value;
    }).get();

    if (selectedSpecies.length > 0) {
        isFilteringSpecies = true;  // Disable scroll-based loading during search
        $('#pokemon-container').empty();
        $('#page-loader').css({ 'display': 'flex' });
    } else {
        isFilteringSpecies = false;  // Re-enable scroll-based loading when search is cleared
    }

    /* Apply filters */

    if (!allPokemonsLoaded) {
        allPokemonsLoaded = true;
        await loadPokemonBaseData(pokemonDataArray);  // Fetch base data
        await loadPokemonData(pokemonDataArray);  // Fetch aditional data
    }

    let filteredPokemons = pokemonDataArray;

    if (isFilteringText) {
        // Filter the complete Pokémon array

        filteredPokemons = filteredPokemons.filter(pokemon =>
            pokemon.name.toLowerCase().includes(query)
        );
    }

    if (isFilteringType) {
        filteredPokemons = filteredPokemons.filter(pokemon =>
            selectedTypes.some(type => pokemon.types.includes(type))
        );
    }

    if (isFilteringSpecies) {
        filteredPokemons = filteredPokemons.filter((pokemon) => {
            let selected = false;
            if (selectedSpecies.length > 1) { // Overlap
                let pokemonSpecies = [];
                if (pokemon.isShiny) pokemonSpecies.push('shiny');
                if (pokemon.isLegendary) pokemonSpecies.push('legendary');
                if (pokemon.isMythical) pokemonSpecies.push('mythical');

                let sortedOriginalSpecies = pokemonSpecies.sort(function (a, b) {
                    if (a < b) { return -1; }
                    if (a > b) { return 1; }
                    return 0;
                });

                let sortedFilteredSpecies = selectedSpecies.sort(function (a, b) {
                    if (a < b) { return -1; }
                    if (a > b) { return 1; }
                    return 0;
                });

                if (sortedOriginalSpecies.toString() === sortedFilteredSpecies.toString()) selected = true;
            } else {
                selectedSpecies.forEach((species) => {
                    if (species == 'shiny' && pokemon.isShiny) {
                        selected = true;
                    }
                    if (species == 'legendary' && pokemon.isLegendary) {
                        selected = true;
                    }
                    if (species == 'mythical' && pokemon.isMythical) {
                        selected = true;
                    }
                });
            }
            return selected;
        });
    }

    if (!isFilteringText && !isFilteringType && !isFilteringSpecies) {
        // Clear the current displayed Pokémon
        $('#pokemon-container').empty();
        // Load all the pokemon data
        await renderPokemonItems(pokemonDataArray);
        $('#page-loader').css({ 'display': 'none' });
    }

    if (isFilteringText || isFilteringType || isFilteringSpecies) {
        // Clear the current displayed Pokémon
        $('#pokemon-container').empty();
        await renderPokemonItems(filteredPokemons);
        $('#page-loader').css({ 'display': 'none' });
    }
}



// Click event for Pokémon containers
$(document).on('click', '.pokemon', function () {
    const pokemonName = $(this).data('name').toLowerCase();

    // Fetch detailed data for the clicked Pokémon
    P.getPokemonByName(pokemonName).then((pokemonData) => {
        let modalName = pokemonData.species.name.charAt(0).toUpperCase() + pokemonData.species.name.slice(1);
        if (modalName.includes('Nidoran')) { // Nidoran gender
            modalName = modalName.replace('-f', ' ♀').trim();
            modalName = modalName.replace('-m', ' ♂').trim();
        }
        const modalImage = pokemonData.sprites['front_default'];
        const modalImageBg = pokemonData.sprites['other']['official-artwork']['front_default'];
        const modalInfo = `
            Height: ${pokemonData.height / 10} m<br>
            Weight: ${pokemonData.weight / 10} kg<br>
            Types: ${pokemonData.types.map(type => type.type.name).join(', ')}
        `;

        // Update and show the modal
        $('#modal-bg').attr('src', modalImageBg);
        $('#modal-name').text(modalName);
        $('#modal-image').attr('src', modalImage);
        $('#modal-info').html(modalInfo);

        $('#modal-bg').off('load');

        $('#modal-bg').on('load', () => {
            $('#modal').fadeIn().css("display", "flex"); // Show modal
        });
    })
        .catch(() => {
            console.error(`Unable to fetch data for Pokémon: ${pokemonName}`);
        });
});

// Click event to close the modal
$('#modal-close').on('click', function () {
    $('#modal').fadeOut(); // Hide modal
});

// Hide the modal if clicked outside of the content
$('#modal').on('click', function (e) {
    if ($(e.target).is('#modal')) {
        $('#modal').fadeOut(); // Hide modal
    }
});

function cardifyItems() {
    const cards = $('.card:not(.cardified)');

    function rotateToMouse(e, card) {
        const bounds = card[0].getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const leftX = mouseX - bounds.x; // 0 - 160
        const topY = mouseY - bounds.y; // 0 - 240
        const center = {
            x: leftX - bounds.width / 2,
            y: topY - bounds.height / 2
        };
        const distance = Math.sqrt(center.x ** 2 + center.y ** 2);

        card.css('transform', `
            scale3d(1.2, 1.2, 1.2)
            rotate3d(
            ${center.y / 20},
            ${-center.x / 20},
            0,
            ${Math.log(distance) * 4}deg
            )
        `);

        card.find('.glow').css('background-image', `
            radial-gradient(
            circle at
            ${leftX}px
            ${topY}px,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(0, 0, 0, 0) 70%
            )
        `);

        const imgSrc = $(card).find('img').attr('src');

        card.find('.glow-border').css('mask', `
            url(./images/card-bg-alpha.png),
            url(${imgSrc})
        `);

        card.find('.glow-border').css('background-image', `
            linear-gradient(135deg,
                rgba(0,0,0,0) ${getYPercentage(topY) - 15}%,
                rgba(255,222,222,0.45) ${getYPercentage(topY) - 1}%,
                rgba(255,222,255,0.8) ${getYPercentage(topY)}%,
                rgba(255,255,255,0.45) ${getYPercentage(topY) + 1}%,
                rgba(0,0,0,0) ${getYPercentage(topY) + 15}%
            )
        `);

        card.find('.glow-border').css({
            'mask-mode': 'luminance',
            'mask-composite': 'revert-layer',
            'mask-repeat': 'round',
            'mask-position': 'center'
        });

        card.find('.shadow').css('background-image', `
            linear-gradient(0deg,
                rgba(0,0,0,${-(getYTopShadowOpacity(topY) / 100) + 0.4}) 0%,
                rgba(0,0,0,0) 50%,
                rgba(0,0,0,0) 100%
            )
        `);
    }

    function getYPercentage(value, inverted = false) {
        if (inverted) {
            return Math.sqrt((Math.ceil((100 * value) / 240) - 100) ** 2);
        }

        return Math.ceil((100 * value) / 240);
    }

    function getYTopShadowOpacity(value) {
        if (value <= 120) {
            return Math.ceil((100 * value) / 120);
        }
    }

    cards.each(function () {
        const card = $(this);

        card.addClass('cardified');

        card.on('mouseenter', function () {
            $(document).on('mousemove.rotate', function (e) {
                card.find('.glow').fadeIn(150);
                card.find('.glow-border').fadeIn(150);
                card.find('.shadow').fadeIn(150);
                rotateToMouse(e, card);
            });
        });

        card.on('mouseleave', function () {
            $(document).off('mousemove.rotate');

            card.css('transform', '');
            card.css('background', 'linear-gradient(135deg, #7792bb, #362f5a)');
            card.css('background-image', "url('./images/card-bg.png')");
            card.css('background-image', "url('./images/card-bg.png'), linear-gradient(135deg, #7792bb, #362f5a)");
            card.css('background-size', 'cover');

            if ($(card).hasClass("shiny")) {
                card.css('background', 'linear-gradient(135deg, #3669b6, #21165a)');
                card.css('background-image', "url('./images/card-bg.png')");
                card.css('background-image', "url('./images/card-bg.png'), linear-gradient(135deg, #3669b6, #21165a)");
            }

            if ($(card).hasClass("legendary")) {
                card.css('background', 'linear-gradient(135deg, #d0b854, #e85d00)');
                card.css('background-image', "url('./images/card-bg.png')");
                card.css('background-image', "url('./images/card-bg.png'), linear-gradient(135deg, #d0b854, #e85d00)");
            }

            if ($(card).hasClass("mythical")) {
                card.css('background', 'linear-gradient(135deg, rgba(119,146,187,1) 0%, rgb(62, 168, 136) 50%, rgba(54,47,90,1) 100%)');
                card.css('background-image', "url('./images/card-bg.png')");
                card.css('background-image', "url('./images/card-bg.png'), linear-gradient(135deg, rgba(119,146,187,1) 0%, rgb(62, 168, 136) 50%, rgba(54,47,90,1) 100%)");
            }

            card.find('.glow').fadeOut(150);
            card.find('.glow-border').fadeOut(150);
            card.find('.shadow').fadeOut(150);
        });
    });
}
