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

// quantiles
// values for quantiles_all calculated with the use of Python
// since data is 0-heavy for alcohol and fatal, I just used reasonable breaks here
let quantiles_all = [1, 4, 11]
let quantiles_alcohol = [1, 2, 4]
let quantiles_fatal = [1, 2, 4]

// all classification schemes (default, alcohol, and fatal)
const default_classification_scheme =  [
    'step',
    ['get', 'count'],
    color_scheme[0],
    quantiles_all[0], color_scheme[1],
    quantiles_all[1], color_scheme[2],
    quantiles_all[2], color_scheme[3]
]
const alcohol_classification_scheme =  [
    'step',
    ['get', 'count'],
    color_scheme[0],
    quantiles_alcohol[0], color_scheme[1],
    quantiles_alcohol[1], color_scheme[2],
    quantiles_alcohol[2], color_scheme[3]
]
const fatal_classification_scheme =  [
    'step',
    ['get', 'count'],
    color_scheme[0],
    quantiles_fatal[0], color_scheme[1],
    quantiles_fatal[1], color_scheme[2],
    quantiles_fatal[2], color_scheme[3]
]

// Initialize collision points variable and fetch the collision data
let collision_points = []
const file_url = 'data/pedcyc_collision_06-21.geojson'

fetch(file_url).then(response => {
    return response.json();
}).then(data => {collision_points = data})

map.on('load', () =>
{
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

    // iterate through the collisions in each hexagon
    collisions_in_hex.features.forEach(collision => {
        // counts number of collisions in each hexagon
        collision.properties.count = collision.properties.values.length;
    })

    // Add the hex grid to the map
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

    // Create pop-ups for collision hexagons
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

    // Create pop-ups for collision points
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

// Generate a legend for our choropleth map
// This is different from update legend since we are creating our legend elements from scratch in this function.
initLegend(collision_legend_data_all);
function initLegend(legend_data)
{
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
    // Retrieve the layer's current visibility
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

// Updates the map based on current filter
// This function is called whenever the user decides to change the filtered data
function updateMap(filter) {

    // Initialize filtered data array
    let filtered_data = []

    if (filter === 'Alcohol Involved') {
        // Only keep the collisions where alcohol was involved
        filtered_data = filter_points('ALCOHOL', 'Yes',  ['==', ['get', 'ALCOHOL'], 'Yes']);
        update_hex_grid(filtered_data, alcohol_classification_scheme);
        legend_update(collision_legend_data_alcohol, 'Alcohol-Induced Road Collisions');
    }
    else if (filter === 'Fatal') {
        // Only keep the collisions that were fatal
        filtered_data = filter_points('ACCLASS', 'Fatal', ['==', ['get', 'ACCLASS'], 'Fatal']);
        update_hex_grid(filtered_data, fatal_classification_scheme);
        legend_update(collision_legend_data_fatal, 'Fatal Road Collisions');
    }
    // This is the default case (show all collisions)
    else {
        map.setFilter('tor-collision-point', undefined);
        update_hex_grid(collision_points, default_classification_scheme)
        legend_update(collision_legend_data_all, 'Road Collisions');
    }
}
// Filter collision points on the map based on user selection and returns the filtered data
function filter_points(filter_field, filter_value, map_filter_expr) {

    // Returns filtered collision points data
    let filtered_data = collision_points.features.filter(collision =>
    {return collision.properties[filter_field] === filter_value});

    // Updates the map with the filter
    map.setFilter('tor-collision-point', map_filter_expr);

    // Return filtered data as GEOJSON object (used in the update_hex_grid function)
    return {type: 'FeatureCollection', features: filtered_data};
}

// Update the hex grid based on the filtered data
function update_hex_grid(filtered_data, classification_scheme) {

    // "aggregate" all collisions within each hexagon
    let updated_collisions_in_hex = turf.collect(hexgrid, filtered_data, "_id", "values");

    // iterate through the collisions in each hexagon
    updated_collisions_in_hex.features.forEach(collision => {
        // counts number of collisions in each hexagon
        collision.properties.count = collision.properties.values.length;
})
    // update the colors of the hex grid based on the new classification scheme
    map.setPaintProperty('collision-hex-polygon', 'fill-color', classification_scheme);
    map.getSource('collision-hex-grid').setData(updated_collisions_in_hex);
}
// This dynamically updates legend based on current classification scheme
// Since the color scheme is universal, we only need to change the text labels for the legend elements this time.
function legend_update(legend_items, title) {
    // Update the legend title
    legend_title = document.getElementById("legend-title");
    legend_title.textContent = title;

    // Retrieve current legend data
    const text_rows = document.querySelectorAll('.legend-text')
    console.log(text_rows);

    let index = 0;

    legend_items.forEach(({label}) => {
        // Update text elements only, color scheme is universal
        let text_row = text_rows[index]

        text_row.textContent = label;

        index++;
    })
}