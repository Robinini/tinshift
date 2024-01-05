/**
 * @module tinshift/tinshift
 */

import VectorSource from 'ol/source/Vector';
import Polygon from 'ol/geom/Polygon';
import Feature from 'ol/Feature';

/**
 * Minimal 2D [transformed_components=horizontal] Implementation based on input structure of https://proj.org/en/9.3/operations/transformations/tinshift.html
 * 
 * ToDO: Handle NULL coordinates everywhere
 * 
 * ToDo: Future - formward and backward matrix which includes translation scale rotation and squew matrix(scaleX(), skewY(), skewX(), scaleY(), translateX(), translateY())
 *  import Math from 'math/math.js'
 * 
 * ToDo: Make vector feature selecteed (and deselected) if used, so tha user can see if adding cector sorce to map for debugging
 */


// Helper function to arrange data for use in TinShift 'vertices' configuration. Input array based on output from Delaunator.triangles output (array of vertice)
function sliceIntoChunks(arr, chunkSize=3) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      res.push(chunk);
  }
  return res;
}


class TinShift {
  constructor(options) {

    options = options ? options : {};

    this.name = 
      options.name !== undefined ? options.name : 'tinshift';

    this.vertices_columns_ = 
      options.vertices_columns !== undefined ? options.vertices_columns : ["source_x", "source_y", "target_x", "target_y"];
    // Column keys for "source_x", "source_y", "target_x", "target_y" which might be in a different order
    this.vertex_indexes = [this.vertices_columns_.indexOf("source_x"), this.vertices_columns_.indexOf("source_y"), this.vertices_columns_.indexOf("target_x"), this.vertices_columns_.indexOf("target_y")];

    this.triangles_columns_ = 
      options.triangles_columns !== undefined ? options.triangles_columns : ["idx_vertex1", "idx_vertex2", "idx_vertex3"];
    // Vertex keys for "idx_vertex1", "idx_vertex2", "idx_vertex3" which might be in a different order
    this.triangles_indexes = [this.triangles_columns_.indexOf("idx_vertex1"), this.triangles_columns_.indexOf("idx_vertex2"), this.triangles_columns_.indexOf("idx_vertex3")];

    this.vertices_ = 
      options.vertices !== undefined ? options.vertices : [];

    this.triangles_ = 
      options.triangles !== undefined ? options.triangles : [];

    // Define fallaback strategy when interreting input coordnates
    this.fallback_strategy = 
      options.fallback_strategy !== undefined ? options.fallback_strategy : 'nearest_side';  // null, nearest_side, nearest_centroid


    // Build ol triangle source
    [this.delauney_source, this.delauney_target] = this.create_delauney_vectors();

  }
  get_coords(vertex_index, source=true){
    const vertex = this.vertices_[vertex_index];
    if (source){
      return [vertex[this.vertex_indexes[0]], vertex[this.vertex_indexes[1]]];
    } else {
      return [vertex[this.vertex_indexes[2]], vertex[this.vertex_indexes[3]]];
    }
  }
  create_delauney_vectors(){
    // Create delauney triangle source
    const delauney_source = new VectorSource();
    const delauney_target = new VectorSource();

    for (let i = 0; i < this.triangles_.length; i++) {
      const triangle = this.triangles_[i];  // [indx_1, indx_2, indx_3]

      // Vertex index
      const i_v1 = triangle[this.triangles_indexes[0]];
      const i_v2 = triangle[this.triangles_indexes[1]];
      const i_v3 = triangle[this.triangles_indexes[2]];
      
      /////////////////////////////////////////
      // Source
      let feat = new Feature({
        i_v1: i_v1,
        i_v2: i_v2,
        i_v3: i_v3,
        geometry: new Polygon([[this.get_coords(i_v1, true), this.get_coords(i_v2, true), this.get_coords(i_v3, true)]])
      });

      // Add to delauney layer
      delauney_source.addFeature(feat);

      /////////////////////////////////////////
      // Target
      feat = new Feature({
        i_v1: i_v1,
        i_v2: i_v2,
        i_v3: i_v3,
        geometry: new Polygon([[this.get_coords(i_v1, false), this.get_coords(i_v2, false), this.get_coords(i_v3, false)]])
      });
      // Add to delauney layer
      delauney_target.addFeature(feat);
  
    }
    console.debug('Tinshift delanuey vectors created with the following length: source:' + delauney_source.getFeatures().length + ', target:' + delauney_target.getFeatures().length);
    return [delauney_source, delauney_target];
  }
  get_barycentric_coords(coordinate, forwards=true){
    // Returns object {vetex_index_1: barycentric_scalar_1, ...}
    
    // Determine which VectorSource to use
    const triangles = forwards ? this.delauney_source : this.delauney_target;

    // Find relevant feature
    let feature = null;

    const features = triangles.getFeaturesAtCoordinate(coordinate);
    if (features.length > 0){
      feature = features[0];
      console.debug('Feature found at coordinate');
    } else if (this.fallback_strategy === 'nearest_side'){
      console.debug('Attempring to find nearest_side Feature');
      feature = triangles.getClosestFeatureToCoordinate(coordinate);
    } else if (this.fallback_strategy === 'nearest_centroid') {
      console.debug('Attempring to find nearest_centroid Feature');
      feature = null; // ToDo: Future - implement nearest_centroid
    }
  
    if (feature === null) {
      console.debug('No Feature found');
      return null;
    };
    
    // If feature found, use coordinate data to tranform the coordinates
    const props = feature.getProperties();
  
    const i_v1 = props['i_v1'];
    const i_v2 = props['i_v2'];
    const i_v3 = props['i_v3'];
  
    let barycentric_coords = coords2bary(coordinate, this.get_coords(i_v1, forwards),  this.get_coords(i_v2, forwards), this.get_coords(i_v3, forwards));
    
    return [[i_v1, barycentric_coords[0]], [i_v2, barycentric_coords[1]], [i_v3, barycentric_coords[2]]];
    }

  forward_matrix(coordinate){
    console.debug('Calcualting transformation marix forwards: ' + coordinate);
    const error = new Error("Not Supported")
    error.code = "-1"
    throw error;
  }
  inverse_matrix(coordinate){
    console.debug('Calcualting transformation marix inverse: ' + coordinate);
    const error = new Error("Not Supported")
    error.code = "-1"
    throw error;
    //return // ToDO: Math.inv(this.matrix(coordinate));
  }
  forward(coordinate){
    console.debug('Transforming coordinate forwards: ' + coordinate);
    const bary = this.get_barycentric_coords(coordinate, true);

    if(bary === null) {
      console.log('Barymetric coordinates are null');
      return null;
    }
    else {
      const b = [bary[0][1], bary[1][1], bary[2][1]];
      const v1 = this.get_coords(bary[0][0], false);
      const v2 = this.get_coords(bary[1][0], false);
      const v3 = this.get_coords(bary[2][0], false);
      return bary2coords(b, v1, v2, v3);
    }
  }
  inverse(coordinate){
    console.debug('Transforming coordinate backwards: ' + coordinate);
    const bary = this.get_barycentric_coords(coordinate, false);

    console.log('Bary Info:' + bary);

    if(bary === null) {
      console.log('Barymetric coordinates are null');
      return null;
    }
    else {
      const b = [bary[0][1], bary[1][1], bary[2][1]];
      const v1 = this.get_coords(bary[0][0], true);
      const v2 = this.get_coords(bary[1][0], true);
      const v3 = this.get_coords(bary[2][0], true);
      return bary2coords(b, v1, v2, v3);
    }
  }
}


//////////////////////////////////////////////////////////////
// Barycentric functions
function coords2bary(coordinate, v1, v2, v3){

  let denominator = (v1[1] - v3[1])*(v2[0] - v3[0]) + (v2[1] - v3[1])*(v3[0] - v1[0]);

  let b1_numerator =(coordinate[1] - v3[1])*(v2[0] - v3[0]) + (v2[1] - v3[1])*(v3[0] - coordinate[0]);
  let b2_numerator =(coordinate[1] - v1[1])*(v3[0] - v1[0]) + (v3[1] - v1[1])*(v1[0] - coordinate[0]);
  let b3_numerator =(coordinate[1] - v2[1])*(v1[0] - v2[0]) + (v1[1] - v2[1])*(v2[0] - coordinate[0]);
  
  return [b1_numerator/denominator, 
    b2_numerator/denominator, 
    b3_numerator/denominator]

}

function bary2coords(b, v1, v2, v3){
  return [b[0] * v1[0] + b[1] * v2[0] + b[2] * v3[0], 
    b[0] * v1[1] + b[1] * v2[1] + b[2] * v3[1]];
}


export {TinShift, sliceIntoChunks};