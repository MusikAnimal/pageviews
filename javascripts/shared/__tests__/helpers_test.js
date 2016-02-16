jest.dontMock('../helpers');
const pv = require('../helpers');
const _ = require('underscore');

describe('getPageURL', ()=> {
  it('returns the URL of the wiki page given the name', ()=> {
    pv.getProject = jest.genMockFunction().mockReturnValue('en.wikipedia');
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
  it('normalizes page names based on API response', ()=> {
    pv.normalizePageNames(['Benutzerin:MusikAnimal', 'Hasil_Adkins']).then((data) => {
      expect(_.isEqual(data, ['Benutzer:MusikAnimal', 'Hasil Adkins']));
    });
  });
});
