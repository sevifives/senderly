$(document).ready(function () {
  var chart = $('#chartit');

  if (chart.length) {
    var toChart = [];

    for (var domain in scoredata.domains) {
      var scores = scoredata.domains[domain];
      for (var i=0,l=scores.length;i<l;i++) {
        scores[i][0] = Date.parse(scores[i][0]);
      }
      toChart.push({
        name: domain,
        data: scores
      });
    }

    console.log(toChart);

    var chiggityChart = new Highcharts.Chart({
      chart: {
        renderTo: 'chartit',
        type: 'line',
        zoom: 'x,y',
        spacingRight: 20
      },
      title: {
        text: 'Average Scores per day',
        x: -20
      },
      tooltip: {
        formatter: function () {
          return '<b>' + Highcharts.dateFormat('%e %b, %Y', this.x) + '</b><br/>'+this.series.name+': '+Math.round(this.y);
        }
      },
      subtitle: {
        text: "All Companies and Dates",
        x: -20
      },
      xAxis: {
        type: 'datetime',
        dateTimeLabelFormats: {
          day: '%b %e',
          month: '%e. %b',
          hour: '%b %e',
          year: '%b'
        },
        tickInterval: 24 * 3600 * 50000
      },
      yAxis: {
        min: 0,
        max: 100,
        title: {
          text: 'Scores 0 - 100'
        },
        plotLines: [{
          value: 0,
          width: 1,
          color: '#808080'
        }]
      },
      series: toChart
    });
  }
});