const fs = require('fs');
const [sourceFile, year] = process.argv.slice(2);

fs.readFile(sourceFile, 'utf8', function(err, contents) {
  const lines = contents.split('\n');
  lines.splice(-1);

  const json = lines.map(line => {
    return JSON.parse(line);
  });

  // Group by project.
  const jsonByProject = {};
  let lastProject = '';
  let index;
  json.forEach(row => {
    if (row.project !== lastProject) {
      jsonByProject[row.project] = [];
      lastProject = row.project;
      index = 0;
    }
    index++;
    jsonByProject[row.project].push({
      article: row.page,
      views: parseInt(row.views, 10),
      mobile_percentage: parseFloat(row.mobile_percentage),
      rank: index,
    });
  });

  // Write files.
  for (let project in jsonByProject) {
    const data = jsonByProject[project];
    const dir = `./public_html/topviews/yearly_datasets/${project}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(
      `./public_html/topviews/yearly_datasets/${project}/${year}.json`,
      JSON.stringify(data),
      {},
      err => console.error(err)
    );
  }
});
