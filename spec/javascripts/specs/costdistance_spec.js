describe('costdistance.js', function() {

  var costRaster = [
        [1, 3, 4, 4, 3, 2],
        [4, 6, 2, 3, 7, 6],
        [5, 8, 7, 5, 5, 6],
        [1, 4, 5, CostDistance.NODATA, 5, 1],
        [4, 7, 5, CostDistance.NODATA, 2, 6],
        [1, 2, 2, 1, 3, 4]
      ],

      sourceRaster = [
        [0, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0]
      ],

      expected = [
        [ 2, 0, 0, 4, 6.742642, 9.242642 ],
        [ 4.5, 4, 0, 2.5, 7.5, 13.106605 ],
        [ 8, 7.071070000000001, 4.5, 4.949749000000001, 8.156856000000001, 12.742642 ],
        [ 5, 7.5, 10.5, NaN, 10.621321, 9.242642 ],
        [ 2.5, 5.656856, 6.449749000000001, NaN, 7.121321, 11.121321 ],
        [ 0, 1.5, 3.5, 5, 7, 10.5 ]
      ];

  describe('calculate', function() {
    var cd = CostDistance.calculate(costRaster, sourceRaster);

    it('should make the expected cost distance raster', function() {
      var r, c;

      for(r=0; r<expected.length; r++) {
        for(c=0; c<expected[r].length; c++) {
          if (isNaN(expected[r][c])) {
            expect(isNaN(cd[r][c])).toBe(true);
          } else {
            expect(cd[r][c]).toBe(expected[r][c]);
          }

        }
      }
    });
  });

});