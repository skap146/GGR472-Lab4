# Introduction

Welcome to **Analyzing Road Collisions in Toronto**! This map showcases where road collisions occurred
in Toronto that involved pedestrians or cyclists between 2006 and 2021.

---
# Libraries

This project has utilized the following libraries:

- Turf (GIS Analysis)
- Mapbox API (Map Rendering)
- Pandas (Calculating Class Bins)
---

# Datasets

```pedcyc_collision_06-21.geojson``` - All roadside collisions involving pedestrians or cyclists that occurred 
between 2006 and 2021.

---

# Files

Here are important files and their main purposes:

```determine_classification_values.py``` - Determines the bins for each class in the choropleth hex grid map.

```index.html``` - Handles webpage structure

```script.js``` - Handles the logic for the road collision map

---

# How to Use

On the map, Toronto is divided into 500m hexagons. Clicking on a hexagon displays a pop up explaining 
how many collisions occurred within that hexagon. Use the legend to determine which collision class the hexagon falls 
under to get a general sense of which regions oversaw more or less collisions relative to other regions. 

Click on an individual collision point to learn more about that particular collision. 

If the information on the map becomes overwhelming, you can always toggle layers on or off through the "Display Layers" 
user interface.


---
# Credits

Created By Shawn Kapcan