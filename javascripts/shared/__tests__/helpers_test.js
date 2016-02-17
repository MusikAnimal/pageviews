jest.dontMock('../helpers');
const pv = require('../helpers');
const _ = require('underscore');
const $ = require('jquery');

describe('getPageURL', ()=> {
  it('returns the URL of the wiki page given the name', ()=> {
    pv.getProject = jest.genMockFn().mockReturnValue('en.wikipedia');
    expect(pv.getPageURL('Star Wars')).toBe('//en.wikipedia.org/wiki/Star_Wars');
  });
});

describe('rgba', ()=> {
  it('changes an rgba value to have given alpha level', ()=> {
    expect(pv.rgba('rgba(123, 123, 123, 1)', 0.3)).toBe('rgba(123, 123, 123, 0.3)');
  });
});

describe('underscorePageNames', ()=> {
  it('converts space to underscores of given strings', ()=> {
    expect(_.isEqual(
      pv.underscorePageNames(['Star Wars', 'Empire Strikes Back']),
      ['Star_Wars', 'Empire_Strikes_Back']
    )).toBe(true);
  });
});

describe('normalizePageNames', ()=> {
  let pages = ['Benutzerin:MusikAnimal', 'Hasil_Adkins'];

  beforeEach(()=> {
    pv.getProject = jest.genMockFunction().mockReturnValue('de.wikipedia');
    $.ajax = jest.genMockFn().mockReturnValue($.Deferred());
  });

  it('calls the API with given page names', ()=> {
    pv.normalizePageNames(pages);
    jest.runAllTimers();
    expect($.ajax).toBeCalledWith({
      url: 'https://de.wikipedia.org/w/api.php?action=query&prop=info&format=json&titles=Benutzerin:MusikAnimal|Hasil_Adkins',
      dataType: 'jsonp'
    });
  });

  it('normalizes page names based on API response', ()=> {
    const normalizedPages = [{
      "from": "Benutzerin:MusikAnimal",
      "to": "Benutzer:MusikAnimal"
    }, {
      "from": "Hasil_Adkins",
      "to": "Hasil Adkins"
    }];
    pages = pv.mapNormalizedPageNames(pages, normalizedPages);
    expect(_.isEqual(pages, ['Benutzer:MusikAnimal', 'Hasil Adkins'])).toBe(true);
  });
});
