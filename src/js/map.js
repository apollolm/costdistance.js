
  var zoom = 16,
      buffer = 400,
      tileSize = 256,
      gm = new GlobalMercator(),
      tileStitcher = tileStitcher('tiles/{z}/{x}/{y}.png', {scheme: 'tms'}),
      map = L.map('map'),
      layerUrl = 'http://{s}.tiles.mapbox.com/v3/atogle.map-vo4oycva/{z}/{x}/{y}.png',
      attribution = 'Map data &copy; OpenStreetMap contributors, CC-BY-SA <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
      layer = new L.TileLayer(layerUrl, {maxZoom: 17, attribution: attribution, subdomains: 'abcd'}),
      canvasLayer;

  map
    .setView([39.9524, -75.1636], 16)
    .addLayer(layer);

  function to2D(array1D, width) {
    var array2D = [],
        i;

    for(i=0; i<width; i++) {
      array2D[i] = Array.prototype.slice.call(array1D, i*width, i*width+width);
    }

    return array2D;
  }

  function draw(frictionCanvas, mapCanvas, sourcePixel) {
    console.log(frictionCanvas, mapCanvas);

    var mapCtx = mapCanvas.getContext('2d'),
        frictionCtx = frictionCanvas.getContext('2d'),
        w = frictionCanvas.width,
        h = frictionCanvas.height,
        frictionImageData = frictionCtx.getImageData(0, 0, w, h),
        data = frictionImageData.data,
        frictionRaster = [],
        cdData = [],
        sourceRaster = to2D([], w),
        maxCost = 2000,
        row, col, i, n,
        red, green, blue, alpha, pixel,
        costDistance, cdImageData;

    mapCanvas.width = w;
    mapCanvas.height = h;

    // Init the source raster
    sourceRaster[sourcePixel.y][sourcePixel.x] = 1;

    // Init the friction raster
    row = -1;
    for(i = 0, n = data.length; i < n; i += 4) {
      red = data[i],
      green = data[i + 1],
      blue = data[i + 2],
      alpha = data[i + 3],
      pixel = (i / 4);

      if (pixel % w === 0) {
        row++;
        frictionRaster[row] = [];
      }

      frictionRaster[row][pixel - (row * w)] = blue;
    }

    // Calculate the costdistance raster
    costDistance = CostDistance.calculate(frictionRaster, sourceRaster, maxCost);

    // Turn cost into pixels to display
    n=0;
    for(row=0; row<w; row++){
      for(col=0; col<h; col++){
        data[4*n] = 255;
        data[4*n + 1] = ((costDistance[row][col] || maxCost) / maxCost) * 255;
        data[4*n + 2] = 255;
        data[4*n + 3] = 255;
        n++;
      }
    }
    frictionImageData.data = data;

    // Draw it on the map layer
    mapCtx.putImageData(frictionImageData, 0, 0);
  }

  map.on('click', function(evt) {
    var originMeters = gm.LatLonToMeters(evt.latlng.lat, evt.latlng.lng),
        // Southwest, MinX/MinY Tile
        swTile = gm.MetersToTile(originMeters[0]-buffer, originMeters[1]-buffer, zoom),
        swTileBoundsMeters = gm.TileBounds(swTile[0], swTile[1], zoom),
        swTileBoundsLatLng = gm.TileLatLonBounds(swTile[0], swTile[1], zoom),
        // Northeast, MaxX/MaxY Tile
        neTile = gm.MetersToTile(originMeters[0]+buffer, originMeters[1]+buffer, zoom),
        neTileBoundsMeters = gm.TileBounds(neTile[0], neTile[1], zoom),
        neTileBoundsLatLng = gm.TileLatLonBounds(neTile[0], neTile[1], zoom),

        // tms = gm.MetersToTile(originMeters[0], originMeters[1], zoom),
        // tileBounds = gm.TileBounds(tms[0], tms[1], 16),
        // bounds = gm.TileLatLonBounds(tms[0], tms[1], 16),
        // mercTile = [tms[0], (Math.pow(2, zoom) - 1) - tms[1]],
        // url = 'tiles/'+zoom+'/'+tms[0]+'/'+tms[1]+'.png',
        costImageData = [],
        pixel = {},
        tx, ty, url;

    var xMetersDiff = neTileBoundsMeters[2] - swTileBoundsMeters[0],
        yMetersDiff = neTileBoundsMeters[3] - swTileBoundsMeters[1],
        mergedSizeX = (neTile[0] - swTile[0] + 1) * tileSize,
        mergedSizeY = (neTile[1] - swTile[1] + 1) * tileSize;

    pixel.x = Math.round(mergedSizeX * (originMeters[0] - swTileBoundsMeters[0]) / xMetersDiff);
    pixel.y = mergedSizeX - Math.round(mergedSizeX * (originMeters[1] - swTileBoundsMeters[1]) / yMetersDiff);

    // TODO: add setBounds() to canvas layer?
    if (canvasLayer) {
      map.removeLayer(canvasLayer);
    }
    canvasLayer = L.imageOverlay.canvas(L.latLngBounds([swTileBoundsLatLng[0], swTileBoundsLatLng[1]],[neTileBoundsLatLng[2], neTileBoundsLatLng[3]]));
    canvasLayer.addTo(map);

    tileStitcher.stitch(swTile[0], swTile[1], neTile[0], neTile[1], zoom, function(stitchedCanvas){
      draw(stitchedCanvas, canvasLayer.canvas, pixel);
      // canvasLayer.canvas.width = stitchedCanvas.width;
      // canvasLayer.canvas.height = stitchedCanvas.height;
      // canvasLayer.canvas.getContext('2d').drawImage(stitchedCanvas, 0, 0);
    });
  });
