/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2FwY2Fuc2giLCJhIjoiY21rNDRqY3NyMDN6OTNlb2p0MGNoMmt3NyJ9.dJfye3FVRxijxl2_diGcPQ';; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/mapbox/standard',  // ****ADD MAP STYLE HERE *****
    config: {basemap: {
            lightPreset: "morning",
            theme: "faded",
            showRoadLabels: false, showPlaceLabels: false},
        show3dObjects: false},
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 11 // starting zoom level
});

// Initialize hexgrid
let hexgrid = ''


/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

// Set up data for classification scheme and legend
let color_scheme = ['#B8B8B8', '#F1959B', '#F07470', '#DC1C13']
let collision_legend_data_all = [
    {'label': '0', 'colour': color_scheme[0]},
    {'label': '1-3', 'colour': color_scheme[1]},
    {'label': '4-11', 'colour': color_scheme[2]},
    {'label': '11+', 'colour': color_scheme[3]}]
let collision_legend_data_alcohol = [
    {'label': '0', 'colour': color_scheme[0]},
    {'label': '1', 'colour': color_scheme[1]},
    {'label': '2-3', 'colour': color_scheme[2]},
    {'label': '4+', 'colour': color_scheme[3]}]
let collision_legend_data_fatal = [
    {'label': '0', 'colour': color_scheme[0]},
    {'label': '1', 'colour': color_scheme[1]},
    {'label': '2-3', 'colour': color_scheme[2]},
    {'label': '4+', 'colour': color_scheme[3]}]

// quantile classification schemes: values calculated with the use of Python
let quantiles_all = [1, 4, 11]
let quantiles_alcohol = [1, 2, 4]
let quantiles_fatal = [1, 2, 4]

// Initialize initial step color hierachy
const default_classification_scheme =  [
    'step', // STEP expression produces stepped results based on value pairs
    ['get', 'count'], // GET expression retrieves property value from 'capacity' data field
    color_scheme[0], // Colour assigned to any values < first step
    quantiles_all[0], color_scheme[1], // Colours assigned to values >= each step
    quantiles_all[1], color_scheme[2],
    quantiles_all[2], color_scheme[3]
]

// Initialize collision points variable and fetch the collision data
let collision_points = []
const file_url = 'data/pedcyc_collision_06-21.geojson'

fetch(file_url).then(response => {
    return response.json();
}).then(data => {collision_points = data})

map.on('load', () => {
    // Let's display these collision features on the map.
    map.addSource('tor-collision-data', {type: 'geojson', data: file_url});
    map.addLayer({'id': 'tor-collision-point',
        'type': 'circle',
        'source': 'tor-collision-data',
    'paint': {'circle-radius': 5, 'circle-color': '#000000'}})

    // Create the bounding box
    let env_result = turf.envelope(collision_points);
    let bounding_box = turf.transformScale(env_result, 1.1);
    let bounding_coords =
        [bounding_box.geometry.coordinates[0][0][0],
            bounding_box.geometry.coordinates[0][0][1],
            bounding_box.geometry.coordinates[0][2][0],
            bounding_box.geometry.coordinates[0][2][1]]

    // Use the bounding box to create hex grid
    let hexSide = 1000;
    let options = {units: 'metres'}
    hexgrid = turf.hexGrid(bounding_coords, hexSide, options);

    // "aggregate" all collisions within each hexagon
    let collisions_in_hex = turf.collect(hexgrid, collision_points, "_id", "values");
    console.log(collisions_in_hex);

    // store the max amount of collisions
    let maxCollisions = 0;

    // array of counts
    let counts_arr = []

    // iterate through the collisions in each hexagon
    collisions_in_hex.features.forEach(collision => {
        // counts number of collisions in each hexagon
        delete collision.properties.count;
        collision.properties.count = collision.properties.values.length;
        counts_arr.push(collision.properties.count)
        // updates the max if number of collisions in the current hexagon > current value
        // of max collisions
        if (collision.properties.count > maxCollisions) {
            maxCollisions = collision.properties.count;
        }
    })

    counts_arr.sort(function (a, b) {return a - b})

    map.addSource('collision-hex-grid', {type: 'geojson', data: hexgrid});
    map.addLayer({
        'id': 'collision-hex-polygon',
        'type': 'fill',
        'source': 'collision-hex-grid',
        'paint': {
            'fill-color': default_classification_scheme,
            'fill-opacity': 1,
            'fill-outline-color': 'black'
        }
    });

    // Create pop ups for collision hexagons
    map.addInteraction('hex-grid-interaction', {
        type: 'click',
        target: {'layerId': 'collision-hex-polygon'},
        handler: (e) => {
            console.log(e);
            const count = e.feature.properties.count;

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML("Collisions: " + count)
                .addTo(map); // Show popup on map
        }
    })

    // Create pop ups for collision points
    map.addInteraction('tor-collision-interaction', {
        type: 'click',
        target: {'layerId': 'tor-collision-point'},
        handler: (e) => {
            console.log(e);

            let properties = e.feature.properties

            const injury = properties["INJURY"];
            const type = properties["INVTYPE"];
            let alcohol_inv = properties["ALCOHOL"];

            // change None for alcohol involved to no (so alcohol involved is either yes or no)
            if (properties["ALCOHOL"] === "None") {
                alcohol_inv = "No";
            }

            new mapboxgl.Popup()
                // Set the pop up to display at the coordinates of mouse click
                .setLngLat(e.lngLat)
                .setHTML("Injury Level: " + injury + "<br> Injury Type: " + type + "<br> Alcohol Involved? " + alcohol_inv)
                .addTo(map); // Show popup on map
        }
    })
})

//

// Generate a legend for our chloropleth map
initLegend(collision_legend_data_all);
function initLegend(legend_data) {
    // For each array item create a row to put the label and colour in
    legend_data.forEach(({ label, colour }) => {
        const row = document.createElement('div');
        const colrect = document.createElement('span');

        colrect.className = 'legend-colrect';
        colrect.style.setProperty('--legendcolor', colour);

        const text = document.createElement('span');
        text.className = 'legend-text';
        text.textContent = label;

        row.append(colrect, text);
        legend.appendChild(row);
    });
}

// Toggle layers based on user selection
// React to checkbox being enabled/disabled on map
function toggleLayer(layer_id)
{
    const visibility = map.getLayoutProperty(layer_id, 'visibility');

    // Toggle the visibility of the layer
    if (visibility === 'none')
    {
        map.setLayoutProperty(layer_id, 'visibility', 'visible');
    }
    else
    {
        map.setLayoutProperty(layer_id, 'visibility', 'none');
    }
}

// updates the map based on current filter
function updateMap(filter) {
    console.log(filter);
    // Initialize filtered data array
    let filtered_data = []

    if (filter === 'Alcohol Involved') {
        // Only keep the collisions where alcohol was involved
        filtered_data = filter_points('ALCOHOL', 'Yes',  ['==', ['get', 'ALCOHOL'], 'Yes']);
        let alcohol_classification_scheme = [
            'step', // STEP expression produces stepped results based on value pairs
            ['get', 'count'], // GET expression retrieves property value from 'capacity' data field
            color_scheme[0], // Colour assigned to any values < first step
            quantiles_alcohol[0], color_scheme[1], // Colours assigned to values >= each step
            quantiles_alcohol[1], color_scheme[2],
            quantiles_alcohol[2], color_scheme[3]
        ]
        update_hex_grid(filtered_data, alcohol_classification_scheme);
        legend_update(collision_legend_data_alcohol, 'Alcohol-Induced Road Collisions');
    }
    else if (filter === 'Fatal') {
        // Only keep the collisions that were fatal
        filtered_data = filter_points('ACCLASS', 'Fatal', ['==', ['get', 'ACCLASS'], 'Fatal']);
        let fatal_classification_scheme = [
            'step', // STEP expression produces stepped results based on value pairs
            ['get', 'count'], // GET expression retrieves property value from 'capacity' data field
            color_scheme[0], // Colour assigned to any values < first step
            quantiles_fatal[0], color_scheme[1], // Colours assigned to values >= each step
            quantiles_fatal[1], color_scheme[2],
            quantiles_fatal[2], color_scheme[3]
        ]
        update_hex_grid(filtered_data, fatal_classification_scheme);
        legend_update(collision_legend_data_fatal, 'Fatal Road Collisions');
    }
    // This is the default case (show all collisions)
    else {
        map.setFilter('tor-collision-point', undefined);
        update_hex_grid(collision_points, default_classification_scheme)
        legend_update(collision_legend_data_all, 'Road Collisions');
    }

    let filtered_data_for_map = {type: 'FeatureCollection', features: filtered_data};
    console.log(filtered_data_for_map);
}
// Filter collision points on the map based on user selection and returns the filtered data
function filter_points(filter_field, filter_value, map_filter_expr) {

    // Returns filtered collision points data
    let filtered_data = collision_points.features.filter(collision =>
    {return collision.properties[filter_field] === filter_value});

    // Updates the map with the filter
    map.setFilter('tor-collision-point', map_filter_expr);

    // Return filtered data as GEOJSON obkect
    return {type: 'FeatureCollection', features: filtered_data};
}

// Update the hex grid
function update_hex_grid(filtered_data, classification_scheme) {
    // "aggregate" all collisions within each hexagon
    // console.log('Filtered data for hex grid: ', filtered_data);
    let updated_collisions_in_hex = turf.collect(hexgrid, filtered_data, "_id", "values");

    // store the max amount of collisions
    let maxCollisions = 0;

    // iterate through the collisions in each hexagon
    updated_collisions_in_hex.features.forEach(collision => {
        // counts number of collisions in each hexagon
        collision.properties.count = collision.properties.values.length;
        // updates the max if number of collisions in the current hexagon > current value
        // of max collisions
        if (collision.properties.count > maxCollisions) {
            maxCollisions = collision.properties.count;
        }
})
    map.setPaintProperty('collision-hex-polygon', 'fill-color', classification_scheme);
    map.getSource('collision-hex-grid').setData(updated_collisions_in_hex);
}
// This dynamically updates legend based on current classification scheme
function legend_update(legend_items, title) {
    // Update the legend title
    legend_title = document.getElementById("legend-title");
    legend_title.textContent = title;

    // Retrieve current legend data
    const legend_rows = document.querySelectorAll('.legend-colrect');
    const text_rows = document.querySelectorAll('.legend-text')
    console.log(legend_rows);
    console.log(text_rows);

    let index = 0;

    legend_items.forEach(({label, color}) => {
        // Update text elements only, color scheme is universal
        let text_row = text_rows[index]

        text_row.textContent = label;

        index++;
    })
}


/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function
//      **Option: You may want to consider how to increase the size of your bbox to enable greater geog coverage of your hexgrid
//                Consider return types from different turf functions and required argument types carefully here



/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty



// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


