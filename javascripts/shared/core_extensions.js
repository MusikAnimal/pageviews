String.prototype.descore = function() {
  return this.replace(/_/g, ' ');
};
String.prototype.score = function() {
  return this.replace(/ /g, '_');
};
String.prototype.i18nArg = function(args) {
  let newStr = this;
  Array.of(args).forEach(arg => {
    newStr = newStr.replace('i18n-arg', arg);
  });
  return newStr;
};
