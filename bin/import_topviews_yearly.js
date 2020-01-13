const fs = require('fs');
const [sourceFile, year] = process.argv.slice(2);

const source = fs.readFile(sourceFile, 'utf8', function (err, tsv) {
  const lines = tsv.split('\n');
  const headers = lines.slice(0, 1)[0].split('\t');

  const json = lines.slice(1, lines.length).map(line => {
    const data = line.split('\t');
    return headers.reduce((obj, nextKey, index) => {
      obj[nextKey] = data[index];
      return obj;
    }, {});
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
      views: parseInt(row.views),
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
