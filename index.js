'use strict';

var util = require('util');
var Orchestrator = require('orchestrator');
var vfs = require('vinyl-fs');

function Ec2di() {
  Orchestrator.call(this);
}
util.inherits(Ec2di, Orchestrator);

Ec2di.prototype.task = Ec2di.prototype.add;

Ec2di.prototype.src = vfs.src;
Ec2di.prototype.dest = vfs.dest;
Ec2di.prototype.watch = function (glob, opt, fn) {
  if (typeof opt === 'function' || Array.isArray(opt)) {
    fn = opt;
    opt = null;
  }

  // array of tasks given
  if (Array.isArray(fn)) {
    return vfs.watch(glob, opt, function () {
      this.start.apply(this, fn);
    }.bind(this));
  }

  return vfs.watch(glob, opt, fn);
};

// let people use this class from our instance
Ec2di.prototype.Ec2di = Ec2di;

var inst = new Ec2di();
module.exports = inst;
