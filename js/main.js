
/* ==================================== */
/* Templates
/* ==================================== */

var templates = {
    result: '<div class="results__item" data-id="{id}"><header><div class="item__trip"> {description} </div><div class="mdl-layout-spacer"></div><time>{time} min</time><button class="mdl-button mdl-js-button mdl-button--icon mdl-button--colored" data-upgraded=",MaterialButton"><i class="material-icons">expand_more</i></button></header><div class="item__details"><ul> <span>Cargando detalles...</span> </ul><div class="item__action"><a class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored btn-block btn-with-icon" href="#" data-upgraded=",MaterialButton"><i class="mdl-icon-toggle__label material-icons">place</i> Ver recorrido en el mapa </a></div></div></div>'
}

/* ==================================== */
/* UI functions
/* ==================================== */

var ui = {
    trip: {
        gpsLoding: function(input){
            $('#trip-'+ input).parent().addClass('loading');
        },
        stopLoding: function(input){
            $('#trip-'+ input).parent().removeClass('loading');
        },
        set: function(input, value){
            $('#trip-'+ input).val(value);
        }
    },
    autocompleter: {
        toggleResults: function(input){
            var suggestResults = $('.autocomplete-'+ input +' .usig_acv');
            suggestResults.removeClass('hidden');

            if( suggestResults.is(':visible') ){
                suggestResults.next().addClass('hidden');
            }else{
                suggestResults.addClass('hidden').next().removeClass('hidden');   
            }
        },
        select: function(option, input){
            $('#trip-'+ input).val( renderName(option.toString()) );
            ui.autocompleter.close();
        },
        close: function(){
            $('body').removeClass('show-autocomplete-to show-autocomplete-from');
        }
    }
}


/* ==================================== */
/* Autocompleter
/* ==================================== */

var renderName = function(str){
    return str.replace(/\w\S*/g, function(txt){ 
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); 
    });
}

var autocompleter = {
    setup : function(input){
        return new usig.AutoCompleter('autocomplete-'+ input, {
            skin: 'custom',
            idOptionsDiv: 'autocomplete-'+ input +'__container',
            hideOnBlur: false,
            afterSuggest: function(){
                ui.autocompleter.toggleResults(input);
            },
            onInputChange: function(){
                ui.autocompleter.toggleResults(input);
            },
            afterSelection: function(suggest) {
                if (suggest instanceof usig.Direccion || suggest instanceof usig.inventario.Objeto) {
                    trip[input] = suggest;
                    ui.autocompleter.select(suggest, input);
                }else{
                    console.log('Something went wrong with the selected place');
                }
            },
            afterGeoCoding: function(geoPoint) {
                if (geoPoint instanceof usig.Punto && trip[input] instanceof usig.Direccion) {
                    trip[input].setCoordenadas(geoPoint);
                    trip.calculate();
                }
            }
        })  
    }
};

autocompleter.from = autocompleter.setup('from');
autocompleter.to = autocompleter.setup('to');


/* ==================================== */
/* Geolocation
/* ==================================== */

var geolocation = {
    _setup: function(){
        if ("geolocation" in navigator) {
            geolocation.works = true;
        } else {
            geolocation.works = false;
            console.log('no geolocation for u my friend :(');
        }
    },
    set: function(input){
        if(geolocation.works){
            ui.trip.gpsLoding(input);
            var GeoCoder = new usig.GeoCoder;

            navigator.geolocation.getCurrentPosition(function(position) {

                GeoCoder.reverseGeoCoding(
                    position.coords.longitude, 
                    position.coords.latitude, 
                    function(result){
                        trip[input] = new usig.Punto( result.puerta_x, result.puerta_y );
                        ui.trip.set(input, renderName(result.calle_alturas));
                        ui.trip.stopLoding(input);
                        $('#autocomplete-'+ input).val(result.calle_alturas);
                        trip.calculate();
                    },
                    function(result){
                        ui.trip.stopLoding(input);
                        console.log(result);
                    }
                );
            }, function(){
                ui.trip.stopLoding(input);        
            });
        }
    }
}

geolocation._setup();
geolocation.set('from');


/* ==================================== */
/* Trip calculation
/* ==================================== */

var trip = {
    calculate : function(){
        if (trip.from && trip.to) {
            $('.results').removeClass('blank').addClass('loading');

            var options = {
                opciones_medios_colectivo: $('#config-bus').is(':checked'),
                opciones_medios_subte: $('#config-subway').is(':checked'),
                opciones_medios_tren: $('#config-train').is(':checked'),
                opciones_caminata: $('#config-walk').val() 
            }

            usig.Recorridos.buscarRecorridos(
                trip.from, 
                trip.to, 
                trip._renderResults, 
                trip._renderError,
                options
            );
        } else {
            console.log('Ingrese origen y destino del recorrido.');
        }
    },
    _renderError : function(){
        console.log('Se produjo un error el buscar el recorrido.');
    },
    _renderResults : function (results) {

        trip.results = results;
        $('.results .results__item').remove();

        for ( var i = 0; i < results.length; i++ ) {

            var htmlElement = templates.result;

            htmlElement = htmlElement
                .replace(/\{id\}/gi, i )
                .replace(/\{description\}/gi, results[i].toHtmlString() )
                .replace(/\{time\}/gi, results[i].getTime() );

            $('.results .results-items').append(htmlElement);
        }

        $('.results').removeClass('loading');
    }
};

$('.results').on('tap', '.results__item:not([data-loaded]) header', function(){
    var id = $(this).parent().data('id');
    var htmlDetails = '';

    trip.results[id].getDetalle(
        function(detalle) {
            for( var d = 0; d < detalle.length; d++ ) {
                htmlDetails += '<li><i class="mdl-icon-toggle__label material-icons '+ detalle[d].type +'"></i><div>'+ detalle[d].text +'</div></li>';
            }
            $('[data-id='+ id +'] ul').html(htmlDetails);
            $('[data-id='+ id +']').attr('data-loaded', true);

        }, function() { 
            $('[data-id='+ id +'] ul').html('No se pudieron cargar los detalles.');
        }
    );    
});

/* ==================================== */
/* Loading
/* ==================================== */

$(window).load( function(){
    $('#cl-loading').addClass('hidden');
});

/* ==================================== */
/* Onboard
/* ==================================== */

$('#cl-onboard a').on('tap', function(event){
    $('#cl-onboard').addClass('hidden');
    $('#cl-form').removeClass('hidden');
    event.preventDefault();
});

/* ==================================== */
/* Form and Results
/* ==================================== */

// Open / close options
$('.trip-form').on('tap', '.js-trip_options:not([disabled])', function(event){
    $(this).toggleClass('open');
    $('.trip-settings').toggleClass('open');
    event.preventDefault();
});
$('.button-toggle input').on('change', function(){ 
    if( $(this).val() === 'bus' ){
        $('.js-trip_options').removeAttr('disabled');
    }else{
        $('.js-trip_options').attr('disabled', true);
        $('.trip-settings, .js-trip_options').removeClass('open');
    }
});
// Update walk distance text on slider change
$('.trip-settings input.mdl-slider').on('touchmove change', function(){ 
    $('.walkMax').text($(this).val());
});

// Results show / hide toggle
$('.results').on('tap', 'header', function(event){
    $(this).parent().toggleClass('open');
    event.preventDefault();
});

/* ==================================== */
/* Form Autocomplete
/* ==================================== */

// Open from autocomplete
$('.trip-form__row .pale-textfield #trip-from').on('focus', function(event){
    $(this).blur();
    $('body').addClass('show-autocomplete-from');
    $('#autocomplete-from').focus().select();
    $('.autocomplete-from .usig_acv').addClass('hidden').next().removeClass('hidden');
    event.preventDefault();
});
// Open to autocomlpete
$('.trip-form__row .pale-textfield #trip-to').on('focus', function(event){
    $(this).blur();
    $('body').addClass('show-autocomplete-to');
    $('#autocomplete-to').focus().select();
    $('.autocomplete-to .usig_acv').addClass('hidden').next().removeClass('hidden');
    event.preventDefault();
});
// close both autocomplete
$('.js-autocomplete_close').on('tap', function(event){
    $('body').removeClass('show-autocomplete-to show-autocomplete-from');
    event.preventDefault();
});
// Clear autocomplete input
$('.js-autocomplete_clear').on('tap', function(event){
    $(this).prev().find('input').val('').focus();
    event.preventDefault();
});
// Hide keyboard when Enter key is pressed
$('#cl-autocomplete input').on('keyup', function(event){
    if(event.keyCode === 13){
        $(this).blur();
    }
});

// Select gps location
$('.autocomplete-from__gps').on('tap', function(event){
    geolocation.set('from');
    ui.autocompleter.close()
    event.preventDefault();
});

$('.autocomplete-to__gps').on('tap', function(event){
    geolocation.set('to');
    ui.autocompleter.close()
    event.preventDefault();
});

// Select a location from favourites list (just prevent)
$('.autocomplete-from .location-autocomplete li a, .autocomplete-to .location-autocomplete li a').on('click', function(event){
    event.preventDefault();
});

/* ==================================== */
/* Favourites
/* ==================================== */

// Open favourites page
$('.js-favourites_trigger').on('tap', function(event){
    $('body').addClass('show-favourites');
    event.preventDefault();
});
// Close favourites page
$('.js-favourites_close, .js-fav-from, .js-fav-to').on('tap', function(event){
    $('body').removeClass('show-favourites');
    event.preventDefault();
});
// Clear favourites filter
$('.js-favourites__clear').on('tap', function(event){
    $(this).prev().val('').focus();
    event.preventDefault();
});
// Show place on map
$('.js-fav-map, #cl-map .search-scroll .options li a').on('tap', function(event){
    $('.map-marker').removeClass('hidden');
    $('body').addClass('show-map');
    $('#cl-map').removeClass('show-search');
    event.preventDefault();
});
// Rename favourite
$('.js-fav-rename').on('tap', function(event){
    $(this).parent().parent().prev().addClass('rename').find('input').focus();
    event.preventDefault();
});
// Cancel Rename favourite
$('.js-fav-rename__cancel').on('tap', function(event){
    $(this).parent().parent().parent().removeClass('rename');
    event.preventDefault();
});
// Submit Rename favourite
$('.fav-rename').on('submit', function(event){
    $(this).parent().removeClass('rename');
    $(this).prev().find('small').text( 'CABA - ' + $(this).find('input').val() );
    $(this).find('input').blur(); // Closes iOs keyboard
    event.preventDefault();
});
$('.fav-rename input').on('keyup', function(event){
    if(event.keyCode === 13){
        $('.fav-rename').submit();
    }
});
// Wipe favourites
$('.js-fav-clear').on('tap', function(event){
    $('.fav-list > ul').empty();
    $('#delete-favourites').attr('disabled', true);
    event.preventDefault();
});

// Paint hover background when menu is open  + history
$('.fav-list li a, .history-list li a').on('tap', function(event){
    $(this).focus();
    event.preventDefault();
});

/* ==================================== */
/* History
/* ==================================== */

// Open history page
$('.js-history_trigger').on('tap', function(event){
    $('body').addClass('show-history');
    event.preventDefault();
});
// Close history page
$('.js-history_close').on('tap', function(event){
    $('body').removeClass('show-history');
    event.preventDefault();
});
// Repeat history
$('.js-history-repeat').on('tap', function(event){
    $('body').removeClass('show-history');
    event.preventDefault();
});
// Wipe history
$('.js-history-clear').on('tap', function(event){
    $('.history-list > ul').empty();
    $('#delete-history').attr('disabled', true);
    event.preventDefault();
});

/* ==================================== */
/* Info page
/* ==================================== */

// Open
$('.js-info_trigger').on('tap', function(event){
    $('body').addClass('show-info');
    event.preventDefault();
});
// Close
$('.js-info_close').on('tap', function(event){
    $('body').removeClass('show-info');
    event.preventDefault();
});

/* ==================================== */
/* Map
/* ==================================== */

// Open map page
$('body').on('tap', '.js-map_trigger, .item__action a', function(event){
    $('body').addClass('show-map');
    event.preventDefault();
});
// Close map page
$('.js-map_close').on('tap', function(event){
    $('body').removeClass('show-map');
    $('.map-marker').addClass('hidden');
    event.preventDefault();
});
// Show / hide user position on map
$('.map-container .location-button').on('tap', function(event){
    $(this).toggleClass('active');
    $('.map-container .locator').toggleClass('show');
    event.preventDefault();
});
// Close marker infowindow
$('.map-marker .leaflet-popup-close-button').on('tap', function(event){
    $('.map-marker').addClass('hidden');
    event.preventDefault();
});
// Go to Comollego
$('.js-map-from, .js-map-to').on('tap', function(event){
    $('body').removeClass('show-map show-favourites');
    $('.map-marker').addClass('hidden');
    event.preventDefault();
});

// Open Map Search
$('.js-mapsearch_trigger').on('tap', function(event){
    $('#cl-map').addClass('show-search');
    setTimeout(function(){
        $('#cl-map .map-search input').focus();
    }, 100);
    event.preventDefault();
});
// Close Map Search
$('.js-mapsearch_close').on('tap', function(event){
    $('#cl-map').removeClass('show-search');
    event.preventDefault();
});
// Clear Map Search
$('.js-mapsearch_clear').on('tap', function(event){
    $('#cl-map .map-search input').val('').focus();
    event.preventDefault();
});
// Hide keyboard when Enter key is pressed
$('#cl-map .map-search input').on('keyup', function(event){
    if(event.keyCode === 13){
        $(this).blur();
    }
});








