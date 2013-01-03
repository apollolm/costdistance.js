/*
 * L.ImageOverlay is used to overlay images over the map (to specific geographical bounds).
 */

L.ImageOverlay.Canvas = L.ImageOverlay.extend({
  includes: L.Mixin.Events,

  options: {
    opacity: 1
  },

  initialize: function (bounds, options) { // (LatLngBounds, Object)
    this._bounds = L.latLngBounds(bounds);

    L.Util.setOptions(this, options);
  },

  _initImage: function () {
    var topLeft = this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
        size = this._map.latLngToLayerPoint(this._bounds.getSouthEast())._subtract(topLeft);

    this._image = this.canvas = L.DomUtil.create('canvas', 'leaflet-image-layer');
    this._image.width  = size.x;
    this._image.height = size.y;

    if (this._map.options.zoomAnimation && L.Browser.any3d) {
      L.DomUtil.addClass(this._image, 'leaflet-zoom-animated');
    } else {
      L.DomUtil.addClass(this._image, 'leaflet-zoom-hide');
    }

    this._updateOpacity();

    //TODO createImage util method to remove duplication
    L.Util.extend(this._image, {
      galleryimg: 'no',
      onselectstart: L.Util.falseFn,
      onmousemove: L.Util.falseFn,
      onload: L.Util.bind(this._onImageLoad, this)
    });
  },

  _reset: function () {
    var image   = this._image,
        topLeft = this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
        size = this._map.latLngToLayerPoint(this._bounds.getSouthEast())._subtract(topLeft);

    L.DomUtil.setPosition(image, topLeft);

    image.style.width  = size.x + 'px';
    image.style.height = size.y + 'px';
  },

  _onImageLoad: function () {
    this.fire('load');
  }
});

L.imageOverlay.canvas = function (bounds, options) {
  return new L.ImageOverlay.Canvas(bounds, options);
};






var gm = new GlobalMercator(),
    map = L.map('map'),
    layerUrl = 'http://{s}.tiles.mapbox.com/v3/atogle.map-vo4oycva/{z}/{x}/{y}.png',
    attribution = 'Map data &copy; OpenStreetMap contributors, CC-BY-SA <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
    layer = new L.TileLayer(layerUrl, {maxZoom: 17, attribution: attribution, subdomains: 'abcd'});

function getImageData(img) {
  // Create an empty canvas element
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  // Copy the image contents to the canvas
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  return ctx.getImageData(0, 0, img.width, img.height);
}

function to2D(array1D, size) {
  var array2D = [],
      i;

  for(i=0; i<size; i++) {
    array2D[i] = Array.prototype.slice.call(array1D, i*size, i*size+size);
  }

  return array2D;
}

function draw(img, canvas, sourcePixel) {
  console.log(img, canvas);

  var ctx = canvas.getContext('2d'),
      imageData = getImageData(img),
      size = imageData.width;

  canvas.width = size;
  canvas.height = size;

  var data = imageData.data;

  var costRaster = [],
      sourceRaster = to2D([], size);

  sourceRaster[sourcePixel.y][sourcePixel.x] = 1;


  // quickly iterate over all pixels
  var row = -1;
  for(var i = 0, n = data.length; i < n; i += 4) {
    var red = data[i],
        green = data[i + 1],
        blue = data[i + 2],
        alpha = data[i + 3],
        pixel = (i / 4);


    if (pixel % size === 0) {
      row++;
      costRaster[row] = [];
    }

    costRaster[row][pixel - (row * 255)] = blue;

  }

  var cd = CostDistance.calculate(costRaster, sourceRaster, 5000);
  console.log(cd);


  ctx.putImageData(imageData, 0, 0);
}

map
  .setView([39.952467541125955, -75.16360759735107], 16)
  .addLayer(layer);

map.on('click', function(evt) {
  var zoom = 16,
      meters = gm.LatLonToMeters(evt.latlng.lat, evt.latlng.lng),
      tms = gm.MetersToTile(meters[0], meters[1], zoom),
      tileBounds = gm.TileBounds(tms[0], tms[1], 16),
      bounds = gm.TileLatLonBounds(tms[0], tms[1], 16),
      // mercTile = [tms[0], (Math.pow(2, zoom) - 1) - tms[1]],
      url = 'tiles/'+zoom+'/'+tms[0]+'/'+tms[1]+'.png',
      pixel = {};

  var xDiff = tileBounds[2] - tileBounds[0],
      yDiff = tileBounds[3] - tileBounds[1];

  pixel.x = Math.round(256 * (meters[0] - tileBounds[0]) / xDiff);
  pixel.y = Math.round(256 * (meters[1] - tileBounds[1]) / xDiff);

  var imageLayer = L.imageOverlay.canvas(L.latLngBounds([bounds[0], bounds[1]],[bounds[2], bounds[3]]));

  imageLayer.addTo(map);

  var imageObj = new Image();
  imageObj.onload = function() {
    draw(this, imageLayer.canvas, pixel);
  };
  imageObj.src = url;

  // console.log(mercTile);
  // console.log(bounds);
  // console.log('http://a.tiles.mapbox.com/v3/atogle.philly_ped_friction/'+zoom+'/'+mercTile[0]+'/'+mercTile[1]+'.png');
});
