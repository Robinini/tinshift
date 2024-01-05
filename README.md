# tinshift
Tinshift module to transform coordinates using TIN mesh.

Minimal 2D Triangulated Irregular Network based transformation implementation based on input structure of https://proj.org/en/9.3/operations/transformations/tinshift.html

## Installation

This package is [hosted on npm](https://www.npmjs.com/package/tinshift) so you can install it with npm

```
npm i tinshift
```

## Use

Import module class and function 

```javascript
import {TinShift, sliceIntoChunks} from 'tinshift';
```

Create configuration object based on the [Proj Tinshift](https://proj.org/en/9.3/operations/transformations/tinshift.html). the example below uses triangles created in the [Delaunator](https://github.com/mapbox/delaunator) package:

```javascript
const tinshift_config = {name: "tinshift", 
                        fallback_strategy: "nearest_side",
                        transformed_components: [ "horizontal" ],
                        vertices_columns: [ "source_x", "source_y", "target_x", "target_y" ],
                        triangles_columns: [ "idx_vertex1", "idx_vertex2", "idx_vertex3"],
                        vertices: vertices,
                        triangles: sliceIntoChunks(delaunay.triangles)} ;  
```

Create the tinshift transformer

```javascript
this.transformer = new TinShift(tinshift_config);
```

Use the transformer to convert coordinates (`[x, y]`) from source system to target system

```javascript
transformer.forward([2, 49]);
// [2.1, 49.1]
```

## How it works
The `TinShift` class creates two OpenLayers Vector Sources (using source and target vertices) and uses the R-Tree spatial index to find the relevant triangle for a given coordinate. The barymetric coordinates are then calculated for this point and used together with the target triangle vertices to interpolate the target coodinate. The transformer also offers an inverse version which uses the target coordinate to find the equivalent coordinate in the source sytem. 


## Development status (as of Jan 2024)
This is the first working version of my first NPM/JS package, created for use with the OpenLayers extension [Tinmap](https://github.com/Robinini/tinmap).

It will be continually tested and improved. Open to [hints and tips](https://github.com/Robinini/tinshift/issues) form the community.