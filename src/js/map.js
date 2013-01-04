
  var zoom = 16,
      buffer = 800,
      tileSize = 256,
      gm = new GlobalMercator(),
      map = L.map('map'),
      layerUrl = 'http://{s}.tiles.mapbox.com/v3/atogle.map-vo4oycva/{z}/{x}/{y}.png',
      attribution = 'Map data &copy; OpenStreetMap contributors, CC-BY-SA <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
      layer = new L.TileLayer(layerUrl, {maxZoom: 17, attribution: attribution, subdomains: 'abcd'}),
      canvasLayer;

  map
    .setView([39.9524, -75.1636], 16)
    .addLayer(layer);

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
        size = imageData.width,
        data = imageData.data,
        costRaster = [],
        cdData = [],
        sourceRaster = to2D([], size),
        maxCost = 4000,
        row, col, i, n,
        red, green, blue, alpha, pixel,
        costDistance, cdImageData;

    canvas.width = size;
    canvas.height = size;

    sourceRaster[sourcePixel.y][sourcePixel.x] = 1;

    row = -1;
    for(i = 0, n = data.length; i < n; i += 4) {
      red = data[i],
      green = data[i + 1],
      blue = data[i + 2],
      alpha = data[i + 3],
      pixel = (i / 4);

      if (pixel % size === 0) {
        row++;
        costRaster[row] = [];
      }

      costRaster[row][pixel - (row * 256)] = blue;
    }

    costDistance = CostDistance.calculate(costRaster, sourceRaster, maxCost);

    n=0;
    for(row=0; row<size; row++){
      for(col=0; col<size; col++){
        data[4*n] = 255;
        data[4*n + 1] = ((costDistance[row][col] || maxCost) / maxCost) * 255;
        data[4*n + 2] = 255;
        data[4*n + 3] = 255;
        n++;
      }
    }

    imageData.data = data;

    ctx.putImageData(imageData, 0, 0);
  }

  function mergeImageData(imageDataArray, url, x, y, maxX, maxY, callback) {
    var imageObj = new Image();
    imageObj.onload = function() {
      var imageData = getImageData(this);
      imageDataArray.push(imageData);

      console.log('trying to call callback');
      callback(imageDataArray);
      // draw(this, canvasLayer.canvas, {x: 128, y: 128}); //pixel);
    };
    imageObj.src = url;



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

        xTileCnt = neTile[0] - swTile[0],
        yTileCnt = neTile[1] - swTile[1],
        totalTileCnt = xTileCnt * yTileCnt,
        tileImageDataSize = tileSize * tileSize * 4,
        mergedImageDataArraySize = tileImageDataSize * totalTileCnt,

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
        mergedSizeX = (neTile[0] - swTile[0]) * tileSize,
        mergedSizeY = (neTile[1] - swTile[1]) * tileSize;

    pixel.x = Math.round(mergedSizeX * (originMeters[0] - swTileBoundsMeters[0]) / xMetersDiff);
    pixel.y = mergedSizeX - Math.round(mergedSizeX * (originMeters[1] - swTileBoundsMeters[1]) / yMetersDiff);

    // TODO: add setBounds() to canvas layer?
    if (canvasLayer) {
      map.removeLayer(canvasLayer);
    }
    canvasLayer = L.imageOverlay.canvas(L.latLngBounds([swTileBoundsLatLng[0], swTileBoundsLatLng[1]],[neTileBoundsLatLng[0], neTileBoundsLatLng[1]]));
    canvasLayer.addTo(map);

    var callback = _.after(totalTileCnt, function(data) {
      console.log('should be called after all tiles are back', data);
    });

    for (tx=swTile[0]; tx<neTile[0]; tx++) {
      for (ty=swTile[1]; ty<neTile[1]; ty++) {
        url = 'tiles/'+zoom+'/'+tx+'/'+ty+'.png';

        console.log(url);
        mergeImageData(costImageData, url, neTile[0]-tx, neTile[1]-ty, xTileCnt, yTileCnt, callback);
      }
    }
  });
